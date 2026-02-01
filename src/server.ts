// Polyfill fetch and FormData for Node.js < 18 (required by OpenAI SDK)
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fetch = require('node-fetch');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const FormData = require('form-data');

if (!globalThis.fetch) {
  globalThis.fetch = fetch;
  globalThis.Headers = fetch.Headers;
  globalThis.Request = fetch.Request;
  globalThis.Response = fetch.Response;
}
if (!globalThis.FormData) {
  globalThis.FormData = FormData;
}

import { createApp } from './app';
import { config } from '@/config';
import { connectDatabase, setupConnectionHandlers } from '@/core/database';
import { uncaughtExceptionHandler, unhandledRejectionHandler } from '@/core/middleware';

// Handle uncaught exceptions
process.on('uncaughtException', uncaughtExceptionHandler);

// Handle unhandled promise rejections
process.on('unhandledRejection', unhandledRejectionHandler);

/**
 * Start the server
 */
const startServer = async (): Promise<void> => {
  try {
    // Setup database connection handlers
    setupConnectionHandlers();

    // Connect to database
    await connectDatabase();

    // Create Express app
    const app = createApp();

    // Start listening
    const server = app.listen(config.port, () => {
      console.log('');
      console.log('╔═══════════════════════════════════════════════════════════╗');
      console.log('║                                                           ║');
      console.log('║   🚀 ScaleUp Horizon Backend v3.0                         ║');
      console.log('║                                                           ║');
      console.log(`║   Environment: ${config.env.padEnd(42)}║`);
      console.log(`║   Port: ${config.port.toString().padEnd(48)}║`);
      console.log(`║   API Version: ${config.apiVersion.padEnd(42)}║`);
      console.log('║                                                           ║');
      console.log(`║   API: http://localhost:${config.port}/api/${config.apiVersion}`.padEnd(60) + '║');
      console.log(`║   Docs: http://localhost:${config.port}/api/${config.apiVersion}/docs`.padEnd(60) + '║');
      console.log(`║   Health: http://localhost:${config.port}/health`.padEnd(60) + '║');
      console.log('║                                                           ║');
      console.log('╚═══════════════════════════════════════════════════════════╝');
      console.log('');
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      console.log(`\n${signal} received. Starting graceful shutdown...`);

      server.close(async () => {
        console.log('HTTP server closed');
        process.exit(0);
      });

      // Force close after 10 seconds
      setTimeout(() => {
        console.error('Forcing shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();
