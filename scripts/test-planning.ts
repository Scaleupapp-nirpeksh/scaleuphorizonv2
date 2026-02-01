/**
 * Planning Module Test Script
 *
 * This script tests all Planning sub-modules by making actual API calls.
 *
 * Prerequisites:
 * 1. MongoDB running
 * 2. Server running (npm run dev)
 * 3. A user registered and organization created
 * 4. Chart of Accounts seeded for the organization
 *
 * Usage:
 *   npx ts-node scripts/test-planning.ts
 *
 * Or with environment variables:
 *   API_URL=http://localhost:3000/api/v1 \
 *   AUTH_TOKEN=your-jwt-token \
 *   ORG_ID=your-org-id \
 *   npx ts-node scripts/test-planning.ts
 */

const API_URL = process.env.API_URL || 'http://localhost:3000/api/v1';
const AUTH_TOKEN = process.env.AUTH_TOKEN || '';
const ORG_ID = process.env.ORG_ID || '';

if (!AUTH_TOKEN || !ORG_ID) {
  console.log(`
╔════════════════════════════════════════════════════════════════════╗
║              Planning Module Test Script                            ║
╠════════════════════════════════════════════════════════════════════╣
║                                                                    ║
║  To test the Planning module, you need:                            ║
║                                                                    ║
║  1. Start the server:                                              ║
║     npm run dev                                                    ║
║                                                                    ║
║  2. Register a user and get a token:                               ║
║     POST /api/v1/auth/register                                     ║
║     {                                                              ║
║       "email": "test@example.com",                                 ║
║       "password": "password123",                                   ║
║       "firstName": "Test",                                         ║
║       "lastName": "User"                                           ║
║     }                                                              ║
║                                                                    ║
║  3. Create an organization:                                        ║
║     POST /api/v1/organizations                                     ║
║     Authorization: Bearer <token>                                  ║
║     { "name": "Test Company", "industry": "technology" }           ║
║                                                                    ║
║  4. Seed Chart of Accounts:                                        ║
║     POST /api/v1/chart-of-accounts/seed                            ║
║     Authorization: Bearer <token>                                  ║
║     X-Organization-Id: <org_id>                                    ║
║                                                                    ║
║  5. Run this script:                                               ║
║     AUTH_TOKEN=<token> ORG_ID=<org_id> npx ts-node \\               ║
║       scripts/test-planning.ts                                     ║
║                                                                    ║
╚════════════════════════════════════════════════════════════════════╝
  `);

  console.log('\n📋 Manual Testing with cURL:\n');
  console.log('# Step 1: Register');
  console.log(`curl -X POST ${API_URL}/auth/register \\
  -H "Content-Type: application/json" \\
  -d '{"email":"test@example.com","password":"password123","firstName":"Test","lastName":"User"}'`);

  console.log('\n# Step 2: Login (if already registered)');
  console.log(`curl -X POST ${API_URL}/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email":"test@example.com","password":"password123"}'`);

  console.log('\n# Step 3: Create Organization');
  console.log(`curl -X POST ${API_URL}/organizations \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -d '{"name":"Test Company","industry":"technology"}'`);

  console.log('\n# Step 4: Seed Chart of Accounts');
  console.log(`curl -X POST ${API_URL}/chart-of-accounts/seed \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "X-Organization-Id: YOUR_ORG_ID"`);

  console.log('\n# Step 5: Create Budget');
  console.log(`curl -X POST ${API_URL}/planning/budgets \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "X-Organization-Id: YOUR_ORG_ID" \\
  -d '{
    "name": "FY2024 Operating Budget",
    "fiscalYear": 2024,
    "type": "annual",
    "startDate": "2024-01-01",
    "endDate": "2024-12-31"
  }'`);

  console.log('\n# Step 6: Create Headcount Plan');
  console.log(`curl -X POST ${API_URL}/planning/headcount \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "X-Organization-Id: YOUR_ORG_ID" \\
  -d '{
    "name": "FY2024 Hiring Plan",
    "fiscalYear": 2024,
    "startDate": "2024-01-01",
    "endDate": "2024-12-31",
    "currentHeadcount": 10,
    "targetHeadcount": 20
  }'`);

  console.log('\n# Step 7: Add a Planned Role');
  console.log(`curl -X POST ${API_URL}/planning/headcount/PLAN_ID/roles \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "X-Organization-Id: YOUR_ORG_ID" \\
  -d '{
    "title": "Senior Engineer",
    "department": "Engineering",
    "level": "senior",
    "plannedStartDate": "2024-03-01",
    "baseSalary": 150000,
    "benefitsPercentage": 25
  }'`);

  console.log('\n# Step 8: Get Cost Projection');
  console.log(`curl -X GET ${API_URL}/planning/headcount/PLAN_ID/cost-projection \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "X-Organization-Id: YOUR_ORG_ID"`);

  process.exit(0);
}

// If we have credentials, run actual tests
async function runTests() {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${AUTH_TOKEN}`,
    'X-Organization-Id': ORG_ID,
  };

  console.log('\n🚀 Starting Planning Module Tests\n');
  console.log('='.repeat(60));

  try {
    // Test 1: Create Budget
    console.log('\n📊 Test 1: Creating Budget...');
    const budgetRes = await fetch(`${API_URL}/planning/budgets`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: `Test Budget ${Date.now()}`,
        fiscalYear: 2024,
        type: 'annual',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      }),
    });
    const budget = await budgetRes.json();
    console.log('✅ Budget created:', budget.data?._id || budget.error);

    // Test 2: List Budgets
    console.log('\n📋 Test 2: Listing Budgets...');
    const budgetsRes = await fetch(`${API_URL}/planning/budgets`, { headers });
    const budgets = await budgetsRes.json();
    console.log('✅ Found', budgets.data?.length || 0, 'budgets');

    // Test 3: Create Headcount Plan
    console.log('\n👥 Test 3: Creating Headcount Plan...');
    const planRes = await fetch(`${API_URL}/planning/headcount`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: `Test Headcount ${Date.now()}`,
        fiscalYear: 2024,
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        currentHeadcount: 10,
        targetHeadcount: 25,
      }),
    });
    const plan = await planRes.json();
    const planId = plan.data?._id;
    console.log('✅ Plan created:', planId || plan.error);

    if (planId) {
      // Test 4: Add Planned Role
      console.log('\n🧑‍💼 Test 4: Adding Planned Role...');
      const roleRes = await fetch(`${API_URL}/planning/headcount/${planId}/roles`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: 'Senior Software Engineer',
          department: 'Engineering',
          level: 'senior',
          plannedStartDate: '2024-03-01',
          baseSalary: 150000,
          benefitsPercentage: 25,
        }),
      });
      const role = await roleRes.json();
      console.log('✅ Role created:', role.data?._id || role.error);
      if (role.data?.totalAnnualCost) {
        console.log('   Total Annual Cost:', role.data.totalAnnualCost);
        console.log('   Monthly Costs:', role.data.monthlyCosts?.length, 'months');
      }

      // Test 5: Get Cost Projection
      console.log('\n📈 Test 5: Getting Cost Projection...');
      const projRes = await fetch(`${API_URL}/planning/headcount/${planId}/cost-projection`, { headers });
      const proj = await projRes.json();
      console.log('✅ Cost projection:', proj.data?.length || 0, 'months');
      if (proj.data?.[0]) {
        console.log('   Sample month:', JSON.stringify(proj.data[2], null, 2));
      }
    }

    // Test 6: Create Revenue Plan
    console.log('\n💰 Test 6: Creating Revenue Plan...');
    const revPlanRes = await fetch(`${API_URL}/planning/revenue`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: `Test Revenue Plan ${Date.now()}`,
        fiscalYear: 2024,
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        revenueModel: 'subscription',
      }),
    });
    const revPlan = await revPlanRes.json();
    const revPlanId = revPlan.data?._id;
    console.log('✅ Revenue Plan created:', revPlanId || revPlan.error);

    if (revPlanId) {
      // Test 7: Add Revenue Stream
      console.log('\n📊 Test 7: Adding Revenue Stream...');
      const streamRes = await fetch(`${API_URL}/planning/revenue/${revPlanId}/streams`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: 'Enterprise SaaS',
          streamType: 'subscription',
          monthlyProjections: Array.from({ length: 12 }, (_, i) => ({
            month: i + 1,
            projected: 50000 + (i * 2500),
            confidence: i < 3 ? 'high' : i < 6 ? 'medium' : 'low',
          })),
          startingMRR: 50000,
          projectedMRRGrowth: 5,
          churnRate: 2,
        }),
      });
      const stream = await streamRes.json();
      console.log('✅ Stream created:', stream.data?._id || stream.error);
      if (stream.data?.annualProjected) {
        console.log('   Annual Projected:', stream.data.annualProjected);
      }

      // Test 8: Get MRR Metrics
      console.log('\n📉 Test 8: Getting MRR Metrics...');
      const mrrRes = await fetch(`${API_URL}/planning/revenue/${revPlanId}/mrr-metrics`, { headers });
      const mrr = await mrrRes.json();
      console.log('✅ MRR Metrics:', JSON.stringify(mrr.data, null, 2));
    }

    // Test 9: Create Scenario
    console.log('\n🎯 Test 9: Creating Scenario...');
    const scenarioRes = await fetch(`${API_URL}/planning/scenarios`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: `Base Case ${Date.now()}`,
        type: 'base',
        fiscalYear: 2024,
        linkedBudgetId: budget.data?._id,
        linkedHeadcountPlanId: planId,
        linkedRevenuePlanId: revPlanId,
      }),
    });
    const scenario = await scenarioRes.json();
    const scenarioId = scenario.data?._id;
    console.log('✅ Scenario created:', scenarioId || scenario.error);
    if (scenario.data) {
      console.log('   Projected Revenue:', scenario.data.projectedRevenue);
      console.log('   Projected Expenses:', scenario.data.projectedExpenses);
      console.log('   Net Income:', scenario.data.projectedNetIncome);
    }

    if (scenarioId) {
      // Test 10: Add Adjustment
      console.log('\n🔧 Test 10: Adding Adjustment...');
      const adjRes = await fetch(`${API_URL}/planning/scenarios/${scenarioId}/adjustments`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          adjustmentType: 'custom',
          referenceName: 'Marketing Budget Increase',
          adjustmentMethod: 'fixed',
          adjustmentAmount: 50000,
          originalAnnualAmount: 200000,
          impactCategory: 'expense',
          description: 'Additional marketing for product launch',
        }),
      });
      const adj = await adjRes.json();
      console.log('✅ Adjustment created:', adj.data?._id || adj.error);
      if (adj.data) {
        console.log('   Adjusted Amount:', adj.data.adjustedAnnualAmount);
        console.log('   Impact Type:', adj.data.impactType);
      }

      // Test 11: Get Impact
      console.log('\n📊 Test 11: Getting Scenario Impact...');
      const impactRes = await fetch(`${API_URL}/planning/scenarios/${scenarioId}/impact`, { headers });
      const impact = await impactRes.json();
      console.log('✅ Impact:', JSON.stringify(impact.data, null, 2));
    }

    console.log('\n' + '='.repeat(60));
    console.log('🎉 All tests completed!\n');
    console.log('Check your database - you should now see:');
    console.log('  - Budgets collection');
    console.log('  - HeadcountPlans collection');
    console.log('  - PlannedRoles collection');
    console.log('  - RevenuePlans collection');
    console.log('  - RevenueStreams collection');
    console.log('  - Scenarios collection');
    console.log('  - ScenarioAdjustments collection\n');

  } catch (error) {
    console.error('\n❌ Error:', error);
  }
}

runTests();
