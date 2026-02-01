# ScaleUp Horizon Backend v3.0

A comprehensive financial management platform backend for startups, built with TypeScript, Express.js, and MongoDB.

## Architecture

This project uses a **modular architecture** where each feature is self-contained with its own models, controllers, services, routes, and validation schemas.

```
src/
├── config/           # Application configuration
├── core/             # Shared infrastructure
│   ├── middleware/   # Auth, error handling, validation
│   ├── database/     # MongoDB connection
│   ├── errors/       # Custom error classes
│   ├── types/        # Shared TypeScript types
│   ├── utils/        # Common utilities
│   └── constants/    # App-wide constants
├── modules/          # Feature modules
│   ├── auth/         # Authentication & Users
│   ├── organization/ # Multi-tenancy
│   ├── chart-of-accounts/  # Financial taxonomy
│   ├── planning/     # Budget, Headcount, Revenue Planning
│   ├── tracking/     # Transactions, Expenses, Revenue
│   ├── fundraising/  # Rounds, Investors, Cap Table
│   ├── operations/   # Tasks, Milestones, Meetings
│   ├── reporting/    # Dashboards, Reports
│   └── intelligence/ # AI/ML Features (Copilot, Categorization)
├── app.ts            # Express app setup
└── server.ts         # Entry point
```

## Tech Stack

- **Runtime:** Node.js 16+
- **Language:** TypeScript
- **Framework:** Express.js
- **Database:** MongoDB with Mongoose ODM
- **Validation:** Zod with OpenAPI integration
- **Authentication:** JWT (Access + Refresh tokens)
- **AI Integration:** OpenAI GPT-4o
- **Documentation:** OpenAPI/Swagger

## Getting Started

### Prerequisites

- Node.js 16 or higher
- MongoDB 6.0 or higher
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/Scaleupapp-nirpeksh/scaleuphorizonv2.git
cd scaleuphorizonv2

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your configuration
```

### Environment Variables

```env
# Server
NODE_ENV=development
PORT=5000
API_VERSION=v1

# Database
MONGODB_URI=mongodb://localhost:27017/scaleup_horizon

# Authentication
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-refresh-secret
JWT_REFRESH_EXPIRES_IN=7d

# OpenAI (for Intelligence module)
OPENAI_API_KEY=your-openai-api-key
```

### Running the Server

```bash
# Development mode (with hot reload)
npm run dev

# Production build
npm run build
npm start

# Run tests
npm test
```

## API Documentation

- **Swagger UI:** http://localhost:5000/api/v1/docs
- **OpenAPI JSON:** http://localhost:5000/api/v1/docs.json
- **Health Check:** http://localhost:5000/health

## Modules

### Core Modules

| Module | Description | Base Route |
|--------|-------------|------------|
| Auth | User authentication, JWT tokens | `/api/v1/auth` |
| Organization | Multi-tenancy, memberships | `/api/v1/organizations` |
| Chart of Accounts | Financial categorization | `/api/v1/chart-of-accounts` |

### Financial Modules

| Module | Description | Base Route |
|--------|-------------|------------|
| Planning | Budgets, Headcount, Revenue Plans | `/api/v1/planning` |
| Tracking | Transactions, Expenses, Revenue | `/api/v1/tracking` |
| Fundraising | Rounds, Investors, Cap Table, ESOP | `/api/v1/fundraising` |

### Operations & Intelligence

| Module | Description | Base Route |
|--------|-------------|------------|
| Operations | Tasks, Milestones, Meetings | `/api/v1/operations` |
| Reporting | Dashboards, Investor Reports | `/api/v1/reporting` |
| Intelligence | AI Copilot, Smart Categorization | `/api/v1/intelligence` |

## Documentation

Detailed API documentation for each module is available in the `docs/api/` folder:

- [01-auth.md](docs/api/01-auth.md) - Authentication
- [02-organization.md](docs/api/02-organization.md) - Organizations
- [03-chart-of-accounts.md](docs/api/03-chart-of-accounts.md) - Chart of Accounts
- [04-planning.md](docs/api/04-planning.md) - Financial Planning
- [05-tracking.md](docs/api/05-tracking.md) - Financial Tracking
- [08-fundraising.md](docs/api/08-fundraising.md) - Fundraising
- [10-operations.md](docs/api/10-operations.md) - Operations
- [11-intelligence.md](docs/api/11-intelligence.md) - AI Intelligence

## Project Structure

Each module follows this internal structure:

```
modules/<module-name>/
├── models/           # Mongoose schemas
├── controllers/      # Request handlers
├── services/         # Business logic
├── routes/           # Express routes with OpenAPI
├── schemas/          # Zod validation schemas
├── types/            # Module-specific types
├── constants/        # Module constants
└── index.ts          # Module exports
```

## Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm start            # Start production server
npm test             # Run tests
npm run lint         # Run ESLint
npm run seed         # Seed database with sample data
```

## License

Private - All rights reserved

## Support

For support, contact the development team.
