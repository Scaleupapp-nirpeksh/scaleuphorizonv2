/**
 * MongoDB Data Verification Script
 *
 * Run with: npx ts-node -r tsconfig-paths/register scripts/verify-mongodb-data.ts
 */

import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/scaleup_horizon_v3';

async function verifyData() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected!\n');

    const db = mongoose.connection.db!;

    console.log('='.repeat(60));
    console.log('  MongoDB Data Verification');
    console.log('='.repeat(60));
    console.log('');

    // List all collections
    const allCollections = await db.listCollections().toArray();
    console.log('All Collections in Database:');
    allCollections.forEach(c => console.log(`  - ${c.name}`));
    console.log('');

    // Core collections
    const collections = [
      'users',
      'organizations',
      'memberships',
      'accounts',
      'transactions',
      'budgets',
      'budgetitems',

      // Fundraising
      'rounds',
      'investors',
      'shareclasses',
      'captableentries',
      'esoppools',
      'esopgrants',

      // Reporting
      'dashboards',
      'reporttemplates',
      'investorreports',
    ];

    console.log('Collection Counts:');
    console.log('-'.repeat(40));

    for (const collectionName of collections) {
      try {
        const collection = db.collection(collectionName);
        const count = await collection.countDocuments();
        const padding = 25 - collectionName.length;
        console.log(`  ${collectionName}${' '.repeat(padding)}: ${count}`);
      } catch (err) {
        console.log(`  ${collectionName}: (not found)`);
      }
    }

    console.log('');
    console.log('='.repeat(60));
    console.log('  Sample Data from Key Collections');
    console.log('='.repeat(60));

    // Show sample from key collections
    const sampleCollections = ['rounds', 'investors', 'dashboards', 'investorreports'];

    for (const collectionName of sampleCollections) {
      try {
        const collection = db.collection(collectionName);
        const samples = await collection.find({}).limit(2).toArray();

        if (samples.length > 0) {
          console.log(`\n${collectionName.toUpperCase()}:`);
          samples.forEach((doc, i) => {
            console.log(`  [${i + 1}] ID: ${doc._id}`);
            if (doc.name) console.log(`      Name: ${doc.name}`);
            if (doc.title) console.log(`      Title: ${doc.title}`);
            if (doc.type) console.log(`      Type: ${doc.type}`);
            if (doc.status) console.log(`      Status: ${doc.status}`);
            if (doc.totalInvested !== undefined) console.log(`      Total Invested: $${doc.totalInvested}`);
            if (doc.raisedAmount !== undefined) console.log(`      Raised Amount: $${doc.raisedAmount}`);
          });
        }
      } catch (err) {
        // Collection might not exist
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('  Verification Complete!');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

verifyData();
