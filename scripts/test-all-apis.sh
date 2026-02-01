#!/bin/bash

# =============================================================
# ScaleUp Horizon V3 - Complete API Test Script
# Tests: Analysis, Fundraising, and Reporting Modules
# =============================================================

set -e

BASE_URL="http://localhost:5001/api/v1"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Variables to store IDs
ACCESS_TOKEN=""
REFRESH_TOKEN=""
ORG_ID=""
USER_ID=""

# Fundraising IDs
ROUND_ID=""
INVESTOR_ID=""
INVESTOR2_ID=""
INVESTOR3_ID=""
TRANCHE_ID=""
SHARE_CLASS_ID=""
CAP_TABLE_ENTRY_ID=""
ESOP_POOL_ID=""
ESOP_GRANT_ID=""

# Reporting IDs
DASHBOARD_ID=""
WIDGET_ID=""
REPORT_ID=""
TEMPLATE_ID=""
SECTION_ID=""

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_section() {
    echo ""
    echo -e "${YELLOW}============================================================${NC}"
    echo -e "${YELLOW}  $1${NC}"
    echo -e "${YELLOW}============================================================${NC}"
    echo ""
}

# Make API request with org context
api_get() {
    local endpoint=$1
    local description=$2

    log_info "Testing: $description"

    response=$(curl -s -X GET "${BASE_URL}${endpoint}" \
        -H "Authorization: Bearer ${ACCESS_TOKEN}" \
        -H "X-Organization-Id: ${ORG_ID}" \
        -H "Content-Type: application/json")

    success=$(echo $response | jq -r '.success // false')

    if [ "$success" == "true" ]; then
        log_success "$description"
    else
        log_error "$description failed"
    fi

    echo "$response" | jq '.' 2>/dev/null || echo "$response"
    echo ""
}

api_post() {
    local endpoint=$1
    local data=$2
    local description=$3

    log_info "Testing: $description"

    response=$(curl -s -X POST "${BASE_URL}${endpoint}" \
        -H "Authorization: Bearer ${ACCESS_TOKEN}" \
        -H "X-Organization-Id: ${ORG_ID}" \
        -H "Content-Type: application/json" \
        -d "$data")

    success=$(echo $response | jq -r '.success // false')

    if [ "$success" == "true" ]; then
        log_success "$description"
    else
        log_error "$description failed"
    fi

    echo "$response" | jq '.' 2>/dev/null || echo "$response"
    echo ""
    echo "$response"
}

api_put() {
    local endpoint=$1
    local data=$2
    local description=$3

    log_info "Testing: $description"

    response=$(curl -s -X PUT "${BASE_URL}${endpoint}" \
        -H "Authorization: Bearer ${ACCESS_TOKEN}" \
        -H "X-Organization-Id: ${ORG_ID}" \
        -H "Content-Type: application/json" \
        -d "$data")

    success=$(echo $response | jq -r '.success // false')

    if [ "$success" == "true" ]; then
        log_success "$description"
    else
        log_error "$description failed"
    fi

    echo "$response" | jq '.' 2>/dev/null || echo "$response"
    echo ""
}

api_delete() {
    local endpoint=$1
    local description=$2

    log_info "Testing: $description"

    response=$(curl -s -X DELETE "${BASE_URL}${endpoint}" \
        -H "Authorization: Bearer ${ACCESS_TOKEN}" \
        -H "X-Organization-Id: ${ORG_ID}" \
        -H "Content-Type: application/json")

    success=$(echo $response | jq -r '.success // false')

    if [ "$success" == "true" ]; then
        log_success "$description"
    else
        log_error "$description failed"
    fi

    echo "$response" | jq '.' 2>/dev/null || echo "$response"
    echo ""
}

# =============================================================
# STEP 1: Authentication
# =============================================================
log_section "STEP 1: Authentication Setup"

# Register a new user
log_info "Registering test user..."
REGISTER_RESPONSE=$(curl -s -X POST "${BASE_URL}/auth/register" \
    -H "Content-Type: application/json" \
    -d '{
        "email": "test-api-'$(date +%s)'@scaleup.com",
        "password": "TestPassword123!",
        "firstName": "API",
        "lastName": "Tester"
    }')

echo "$REGISTER_RESPONSE" | jq '.'

ACCESS_TOKEN=$(echo $REGISTER_RESPONSE | jq -r '.data.tokens.accessToken // empty')
REFRESH_TOKEN=$(echo $REGISTER_RESPONSE | jq -r '.data.tokens.refreshToken // empty')
USER_ID=$(echo $REGISTER_RESPONSE | jq -r '.data.user.id // .data.user._id // empty')

if [ -z "$ACCESS_TOKEN" ]; then
    log_error "Failed to register user. Trying to login with existing user..."

    LOGIN_RESPONSE=$(curl -s -X POST "${BASE_URL}/auth/login" \
        -H "Content-Type: application/json" \
        -d '{
            "email": "test@scaleup.com",
            "password": "TestPassword123!"
        }')

    ACCESS_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.tokens.accessToken // empty')
    REFRESH_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.tokens.refreshToken // empty')
    USER_ID=$(echo $LOGIN_RESPONSE | jq -r '.data.user.id // .data.user._id // empty')
fi

if [ -z "$ACCESS_TOKEN" ]; then
    log_error "Authentication failed. Please ensure the server is running and MongoDB is connected."
    exit 1
fi

log_success "Authentication successful! User ID: $USER_ID"

# =============================================================
# STEP 2: Create/Get Organization
# =============================================================
log_section "STEP 2: Organization Setup"

log_info "Creating test organization..."
ORG_RESPONSE=$(curl -s -X POST "${BASE_URL}/organizations" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{
        "name": "Test Startup Inc",
        "displayName": "Test Startup",
        "industry": "technology",
        "stage": "seed",
        "foundedDate": "2024-01-01",
        "description": "A test startup for API testing",
        "settings": {
            "fiscalYearStart": 1,
            "currency": "USD",
            "timezone": "America/New_York"
        }
    }')

echo "$ORG_RESPONSE" | jq '.'
ORG_ID=$(echo $ORG_RESPONSE | jq -r '.data._id // .data.id // empty')

if [ -z "$ORG_ID" ]; then
    log_info "Organization may already exist, fetching organizations..."
    ORG_LIST=$(curl -s -X GET "${BASE_URL}/organizations" \
        -H "Authorization: Bearer ${ACCESS_TOKEN}")
    ORG_ID=$(echo $ORG_LIST | jq -r '.data[0]._id // .data[0].id // empty')
fi

if [ -z "$ORG_ID" ]; then
    log_error "Failed to create/get organization"
    exit 1
fi

log_success "Organization ID: $ORG_ID"

# =============================================================
# STEP 3: Seed Chart of Accounts (Required for Analysis)
# =============================================================
log_section "STEP 3: Seed Chart of Accounts"

log_info "Seeding chart of accounts..."
SEED_RESPONSE=$(curl -s -X POST "${BASE_URL}/chart-of-accounts/seed" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "X-Organization-Id: ${ORG_ID}" \
    -H "Content-Type: application/json")
echo "$SEED_RESPONSE" | jq '.'
log_success "Chart of accounts seeded"

# =============================================================
# STEP 4: Create Test Transactions (For Analysis to Work)
# =============================================================
log_section "STEP 4: Create Test Transactions for Analysis"

# Get expense account
log_info "Getting expense accounts..."
ACCOUNTS=$(curl -s -X GET "${BASE_URL}/chart-of-accounts?type=expense" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "X-Organization-Id: ${ORG_ID}")
EXPENSE_ACCOUNT_ID=$(echo $ACCOUNTS | jq -r '.data[0]._id // empty')
echo "Expense Account ID: $EXPENSE_ACCOUNT_ID"

# Get revenue account
REVENUE_ACCOUNTS=$(curl -s -X GET "${BASE_URL}/chart-of-accounts?type=revenue" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "X-Organization-Id: ${ORG_ID}")
REVENUE_ACCOUNT_ID=$(echo $REVENUE_ACCOUNTS | jq -r '.data[0]._id // empty')
echo "Revenue Account ID: $REVENUE_ACCOUNT_ID"

if [ -n "$EXPENSE_ACCOUNT_ID" ] && [ "$EXPENSE_ACCOUNT_ID" != "null" ]; then
    log_info "Creating test expense transactions..."
    for i in 1 2 3 4 5; do
        AMOUNT=$((1000 + RANDOM % 5000))
        curl -s -X POST "${BASE_URL}/tracking/transactions" \
            -H "Authorization: Bearer ${ACCESS_TOKEN}" \
            -H "X-Organization-Id: ${ORG_ID}" \
            -H "Content-Type: application/json" \
            -d "{
                \"account\": \"${EXPENSE_ACCOUNT_ID}\",
                \"type\": \"expense\",
                \"amount\": ${AMOUNT},
                \"date\": \"2024-0${i}-15\",
                \"description\": \"Test expense transaction ${i}\",
                \"paymentMethod\": \"bank_transfer\",
                \"status\": \"cleared\"
            }" | jq '.success'
    done
fi

if [ -n "$REVENUE_ACCOUNT_ID" ] && [ "$REVENUE_ACCOUNT_ID" != "null" ]; then
    log_info "Creating test revenue transactions..."
    for i in 1 2 3 4 5; do
        AMOUNT=$((5000 + RANDOM % 10000))
        curl -s -X POST "${BASE_URL}/tracking/transactions" \
            -H "Authorization: Bearer ${ACCESS_TOKEN}" \
            -H "X-Organization-Id: ${ORG_ID}" \
            -H "Content-Type: application/json" \
            -d "{
                \"account\": \"${REVENUE_ACCOUNT_ID}\",
                \"type\": \"income\",
                \"amount\": ${AMOUNT},
                \"date\": \"2024-0${i}-15\",
                \"description\": \"Test revenue transaction ${i}\",
                \"paymentMethod\": \"bank_transfer\",
                \"status\": \"cleared\"
            }" | jq '.success'
    done
fi

# Create a budget for variance analysis
log_info "Creating test budget..."
BUDGET_RESPONSE=$(curl -s -X POST "${BASE_URL}/planning/budgets" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "X-Organization-Id: ${ORG_ID}" \
    -H "Content-Type: application/json" \
    -d '{
        "name": "2024 Annual Budget",
        "fiscalYear": 2024,
        "type": "annual",
        "currency": "USD"
    }')
echo "$BUDGET_RESPONSE" | jq '.'
BUDGET_ID=$(echo $BUDGET_RESPONSE | jq -r '.data._id // empty')

# =============================================================
# STEP 5: ANALYSIS MODULE TESTS
# =============================================================
log_section "STEP 5: ANALYSIS MODULE TESTS"

# 5.1 Variance Analysis
log_section "5.1 Variance Analysis"

api_get "/analysis/variance/budget?fiscalYear=2024" "Get budget vs actual variance"
api_get "/analysis/variance/revenue?fiscalYear=2024" "Get revenue plan vs actual variance"
api_get "/analysis/variance/headcount?fiscalYear=2024" "Get headcount plan vs actual variance"
api_get "/analysis/variance/by-category?fiscalYear=2024&type=expense" "Get variance by category"
api_get "/analysis/variance/by-month?fiscalYear=2024" "Get monthly variance breakdown"

# 5.2 Health Score Analysis
log_section "5.2 Health Score Analysis"

api_get "/analysis/health-score" "Get overall health score"
api_get "/analysis/health-score/history" "Get health score history"
api_get "/analysis/health-score/breakdown" "Get health score breakdown"

# 5.3 Trends Analysis
log_section "5.3 Trends Analysis"

api_get "/analysis/trends/expenses" "Get expense trends"
api_get "/analysis/trends/revenue" "Get revenue trends"
api_get "/analysis/trends/burn-rate" "Get burn rate trends"

# 5.4 Unit Economics
log_section "5.4 Unit Economics"

api_get "/analysis/unit-economics" "Get all unit economics"
api_get "/analysis/unit-economics/cac" "Get CAC"
api_get "/analysis/unit-economics/ltv" "Get LTV"
api_get "/analysis/unit-economics/payback" "Get payback period"

# =============================================================
# STEP 6: FUNDRAISING MODULE TESTS
# =============================================================
log_section "STEP 6: FUNDRAISING MODULE TESTS"

# 6.1 Funding Rounds
log_section "6.1 Funding Rounds"

log_info "Creating funding round..."
ROUND_RESPONSE=$(curl -s -X POST "${BASE_URL}/fundraising/rounds" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "X-Organization-Id: ${ORG_ID}" \
    -H "Content-Type: application/json" \
    -d '{
        "name": "Seed Round",
        "type": "seed",
        "targetAmount": 2000000,
        "targetCloseDate": "2024-12-31",
        "pricePerShare": 1.50,
        "preMoneyValuation": 8000000,
        "shareClass": "preferred",
        "minimumInvestment": 25000,
        "terms": "Standard SAFE terms",
        "notes": "First institutional round"
    }')
echo "$ROUND_RESPONSE" | jq '.'
ROUND_ID=$(echo $ROUND_RESPONSE | jq -r '.data._id // empty')
log_success "Created round ID: $ROUND_ID"

api_get "/fundraising/rounds" "List all rounds"
api_get "/fundraising/rounds/${ROUND_ID}" "Get round by ID"

log_info "Opening the round..."
curl -s -X POST "${BASE_URL}/fundraising/rounds/${ROUND_ID}/open" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "X-Organization-Id: ${ORG_ID}" \
    -H "Content-Type: application/json" \
    -d '{"openDate": "2024-01-15"}' | jq '.'

log_info "Adding document to round..."
curl -s -X POST "${BASE_URL}/fundraising/rounds/${ROUND_ID}/documents" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "X-Organization-Id: ${ORG_ID}" \
    -H "Content-Type: application/json" \
    -d '{
        "name": "Term Sheet",
        "type": "term_sheet",
        "url": "https://example.com/termsheet.pdf"
    }' | jq '.'

api_get "/fundraising/rounds/${ROUND_ID}/summary" "Get round summary"

# 6.2 Investors
log_section "6.2 Investors"

log_info "Creating investor 1 - Sequoia..."
INVESTOR_RESPONSE=$(curl -s -X POST "${BASE_URL}/fundraising/investors" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "X-Organization-Id: ${ORG_ID}" \
    -H "Content-Type: application/json" \
    -d "{
        \"name\": \"Sequoia Capital\",
        \"type\": \"vc\",
        \"status\": \"active\",
        \"email\": \"deals@sequoia.com\",
        \"company\": \"Sequoia Capital\",
        \"website\": \"https://sequoia.com\",
        \"contactPerson\": {
            \"name\": \"John Partner\",
            \"email\": \"john@sequoia.com\",
            \"phone\": \"+1-555-0100\"
        },
        \"linkedRound\": \"${ROUND_ID}\",
        \"notes\": \"Lead investor for seed round\",
        \"tags\": [\"tier1\", \"lead\"]
    }")
echo "$INVESTOR_RESPONSE" | jq '.'
INVESTOR_ID=$(echo $INVESTOR_RESPONSE | jq -r '.data._id // empty')
log_success "Created investor ID: $INVESTOR_ID"

log_info "Creating investor 2 - YC..."
INVESTOR2_RESPONSE=$(curl -s -X POST "${BASE_URL}/fundraising/investors" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "X-Organization-Id: ${ORG_ID}" \
    -H "Content-Type: application/json" \
    -d "{
        \"name\": \"Y Combinator\",
        \"type\": \"accelerator\",
        \"status\": \"active\",
        \"email\": \"deals@ycombinator.com\",
        \"company\": \"Y Combinator\",
        \"linkedRound\": \"${ROUND_ID}\",
        \"notes\": \"YC S24 batch\"
    }")
echo "$INVESTOR2_RESPONSE" | jq '.'
INVESTOR2_ID=$(echo $INVESTOR2_RESPONSE | jq -r '.data._id // empty')

log_info "Creating investor 3 - Angel..."
INVESTOR3_RESPONSE=$(curl -s -X POST "${BASE_URL}/fundraising/investors" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "X-Organization-Id: ${ORG_ID}" \
    -H "Content-Type: application/json" \
    -d '{
        "name": "Naval Ravikant",
        "type": "angel",
        "status": "active",
        "email": "naval@angel.co",
        "notes": "AngelList founder"
    }')
echo "$INVESTOR3_RESPONSE" | jq '.'
INVESTOR3_ID=$(echo $INVESTOR3_RESPONSE | jq -r '.data._id // empty')

api_get "/fundraising/investors" "List all investors"
api_get "/fundraising/investors/${INVESTOR_ID}" "Get investor by ID"
api_get "/fundraising/investors/top" "Get top investors"

# 6.3 Investment Tranches
log_section "6.3 Investment Tranches"

log_info "Adding investment tranche to Sequoia..."
TRANCHE_RESPONSE=$(curl -s -X POST "${BASE_URL}/fundraising/investors/${INVESTOR_ID}/tranches" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "X-Organization-Id: ${ORG_ID}" \
    -H "Content-Type: application/json" \
    -d "{
        \"amount\": 500000,
        \"scheduledDate\": \"2024-02-01\",
        \"round\": \"${ROUND_ID}\",
        \"shareClass\": \"preferred\",
        \"pricePerShare\": 1.50,
        \"notes\": \"First tranche\"
    }")
echo "$TRANCHE_RESPONSE" | jq '.'
TRANCHE_ID=$(echo $TRANCHE_RESPONSE | jq -r '.data.tranches[-1]._id // empty')
log_success "Created tranche ID: $TRANCHE_ID"

log_info "Adding tranche to YC..."
curl -s -X POST "${BASE_URL}/fundraising/investors/${INVESTOR2_ID}/tranches" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "X-Organization-Id: ${ORG_ID}" \
    -H "Content-Type: application/json" \
    -d "{
        \"amount\": 125000,
        \"scheduledDate\": \"2024-03-01\",
        \"round\": \"${ROUND_ID}\",
        \"notes\": \"YC standard investment\"
    }" | jq '.'

log_info "Adding tranche to angel..."
curl -s -X POST "${BASE_URL}/fundraising/investors/${INVESTOR3_ID}/tranches" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "X-Organization-Id: ${ORG_ID}" \
    -H "Content-Type: application/json" \
    -d "{
        \"amount\": 50000,
        \"scheduledDate\": \"2024-02-15\",
        \"notes\": \"Angel check\"
    }" | jq '.'

log_info "Receiving investment tranche..."
curl -s -X POST "${BASE_URL}/fundraising/investors/${INVESTOR_ID}/tranches/${TRANCHE_ID}/receive" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "X-Organization-Id: ${ORG_ID}" \
    -H "Content-Type: application/json" \
    -d '{
        "receivedDate": "2024-02-05",
        "sharesIssued": 333333,
        "pricePerShare": 1.50
    }' | jq '.'

# 6.4 Share Classes
log_section "6.4 Share Classes"

log_info "Creating preferred share class..."
SHARE_CLASS_RESPONSE=$(curl -s -X POST "${BASE_URL}/fundraising/cap-table/share-classes" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "X-Organization-Id: ${ORG_ID}" \
    -H "Content-Type: application/json" \
    -d '{
        "name": "Series Seed Preferred",
        "class": "preferred",
        "authorizedShares": 10000000,
        "parValue": 0.0001,
        "votingRights": 1,
        "liquidationPreference": 1,
        "participatingPreferred": false,
        "seniority": 1
    }')
echo "$SHARE_CLASS_RESPONSE" | jq '.'
SHARE_CLASS_ID=$(echo $SHARE_CLASS_RESPONSE | jq -r '.data._id // empty')
log_success "Created share class ID: $SHARE_CLASS_ID"

log_info "Creating common share class..."
curl -s -X POST "${BASE_URL}/fundraising/cap-table/share-classes" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "X-Organization-Id: ${ORG_ID}" \
    -H "Content-Type: application/json" \
    -d '{
        "name": "Common Stock",
        "class": "common",
        "authorizedShares": 50000000,
        "parValue": 0.0001,
        "votingRights": 1,
        "seniority": 0
    }' | jq '.'

api_get "/fundraising/cap-table/share-classes" "List share classes"

# 6.5 Cap Table Entries
log_section "6.5 Cap Table Entries"

log_info "Creating cap table entry for founder..."
ENTRY_RESPONSE=$(curl -s -X POST "${BASE_URL}/fundraising/cap-table/entries" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "X-Organization-Id: ${ORG_ID}" \
    -H "Content-Type: application/json" \
    -d "{
        \"shareholder\": \"${USER_ID}\",
        \"shareholderType\": \"founder\",
        \"shareholderName\": \"John Founder\",
        \"shareClass\": \"common\",
        \"entryType\": \"issuance\",
        \"shares\": 5000000,
        \"effectiveDate\": \"2024-01-01\",
        \"pricePerShare\": 0.0001,
        \"notes\": \"Founder shares\"
    }")
echo "$ENTRY_RESPONSE" | jq '.'
CAP_TABLE_ENTRY_ID=$(echo $ENTRY_RESPONSE | jq -r '.data._id // empty')

log_info "Creating cap table entry for investor..."
curl -s -X POST "${BASE_URL}/fundraising/cap-table/entries" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "X-Organization-Id: ${ORG_ID}" \
    -H "Content-Type: application/json" \
    -d "{
        \"shareholder\": \"${INVESTOR_ID}\",
        \"shareholderType\": \"investor\",
        \"shareholderName\": \"Sequoia Capital\",
        \"shareClass\": \"preferred\",
        \"entryType\": \"issuance\",
        \"shares\": 333333,
        \"effectiveDate\": \"2024-02-05\",
        \"pricePerShare\": 1.50,
        \"round\": \"${ROUND_ID}\",
        \"notes\": \"Series Seed investment\"
    }" | jq '.'

api_get "/fundraising/cap-table" "Get cap table summary"
api_get "/fundraising/cap-table/entries" "List cap table entries"

log_info "Simulate future funding round..."
curl -s -X POST "${BASE_URL}/fundraising/cap-table/simulate" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "X-Organization-Id: ${ORG_ID}" \
    -H "Content-Type: application/json" \
    -d '{
        "roundName": "Series A",
        "investmentAmount": 10000000,
        "preMoneyValuation": 40000000,
        "shareClass": "preferred",
        "optionPoolIncrease": 10
    }' | jq '.'

log_info "Calculate waterfall distribution..."
curl -s -X POST "${BASE_URL}/fundraising/cap-table/waterfall" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "X-Organization-Id: ${ORG_ID}" \
    -H "Content-Type: application/json" \
    -d '{
        "exitValuation": 100000000
    }' | jq '.'

# 6.6 ESOP
log_section "6.6 ESOP Pool and Grants"

log_info "Creating ESOP pool..."
ESOP_POOL_RESPONSE=$(curl -s -X POST "${BASE_URL}/fundraising/esop/pool" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "X-Organization-Id: ${ORG_ID}" \
    -H "Content-Type: application/json" \
    -d '{
        "name": "2024 ESOP Pool",
        "totalShares": 2000000,
        "shareClass": "options",
        "percentOfCompany": 10
    }')
echo "$ESOP_POOL_RESPONSE" | jq '.'
ESOP_POOL_ID=$(echo $ESOP_POOL_RESPONSE | jq -r '.data._id // empty')
log_success "Created ESOP pool ID: $ESOP_POOL_ID"

api_get "/fundraising/esop/pool" "Get ESOP pool"

log_info "Creating ESOP grant..."
ESOP_GRANT_RESPONSE=$(curl -s -X POST "${BASE_URL}/fundraising/esop/grants" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "X-Organization-Id: ${ORG_ID}" \
    -H "Content-Type: application/json" \
    -d "{
        \"pool\": \"${ESOP_POOL_ID}\",
        \"grantee\": \"${USER_ID}\",
        \"granteeName\": \"Jane Engineer\",
        \"granteeEmail\": \"jane@startup.com\",
        \"grantType\": \"iso\",
        \"totalShares\": 50000,
        \"exercisePrice\": 0.50,
        \"grantDate\": \"2024-01-15\",
        \"vestingStartDate\": \"2024-01-15\",
        \"vestingSchedule\": \"standard_4y_1y_cliff\",
        \"vestingMonths\": 48,
        \"cliffMonths\": 12,
        \"department\": \"Engineering\",
        \"notes\": \"Senior Engineer grant\"
    }")
echo "$ESOP_GRANT_RESPONSE" | jq '.'
ESOP_GRANT_ID=$(echo $ESOP_GRANT_RESPONSE | jq -r '.data._id // empty')
log_success "Created ESOP grant ID: $ESOP_GRANT_ID"

api_get "/fundraising/esop/grants" "List all grants"
api_get "/fundraising/esop/grants/${ESOP_GRANT_ID}" "Get grant by ID"

log_info "Approving grant..."
curl -s -X POST "${BASE_URL}/fundraising/esop/grants/${ESOP_GRANT_ID}/approve" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "X-Organization-Id: ${ORG_ID}" \
    -H "Content-Type: application/json" \
    -d '{"boardApprovalDate": "2024-01-20"}' | jq '.'

log_info "Activating grant..."
curl -s -X POST "${BASE_URL}/fundraising/esop/grants/${ESOP_GRANT_ID}/activate" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "X-Organization-Id: ${ORG_ID}" \
    -H "Content-Type: application/json" | jq '.'

api_get "/fundraising/esop/grants/${ESOP_GRANT_ID}/vesting" "Get vesting schedule"
api_get "/fundraising/esop/summary" "Get ESOP summary"

# Close round
log_section "6.7 Close Funding Round"

log_info "Closing the funding round..."
curl -s -X POST "${BASE_URL}/fundraising/rounds/${ROUND_ID}/close" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "X-Organization-Id: ${ORG_ID}" \
    -H "Content-Type: application/json" \
    -d '{
        "closeDate": "2024-03-15",
        "finalRaisedAmount": 675000
    }' | jq '.'

api_get "/fundraising/rounds/${ROUND_ID}" "Get closed round details"

# =============================================================
# STEP 7: REPORTING MODULE TESTS
# =============================================================
log_section "STEP 7: REPORTING MODULE TESTS"

# 7.1 Dashboards
log_section "7.1 Dashboards"

log_info "Creating custom dashboard..."
DASHBOARD_RESPONSE=$(curl -s -X POST "${BASE_URL}/reporting/dashboards" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "X-Organization-Id: ${ORG_ID}" \
    -H "Content-Type: application/json" \
    -d '{
        "name": "CEO Dashboard",
        "type": "executive",
        "description": "Executive overview dashboard",
        "isDefault": true,
        "isPublic": false,
        "refreshInterval": "hourly",
        "layout": {
            "columns": 12,
            "rowHeight": 100
        }
    }')
echo "$DASHBOARD_RESPONSE" | jq '.'
DASHBOARD_ID=$(echo $DASHBOARD_RESPONSE | jq -r '.data._id // empty')
log_success "Created dashboard ID: $DASHBOARD_ID"

api_get "/reporting/dashboards" "List all dashboards"
api_get "/reporting/dashboards/${DASHBOARD_ID}" "Get dashboard by ID"
api_get "/reporting/dashboards/executive" "Get executive dashboard"
api_get "/reporting/dashboards/finance" "Get finance dashboard"

# 7.2 Widgets
log_section "7.2 Dashboard Widgets"

log_info "Adding KPI widget..."
WIDGET_RESPONSE=$(curl -s -X POST "${BASE_URL}/reporting/dashboards/${DASHBOARD_ID}/widgets" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "X-Organization-Id: ${ORG_ID}" \
    -H "Content-Type: application/json" \
    -d '{
        "name": "Monthly Revenue",
        "type": "kpi",
        "dataSource": "revenue",
        "position": {
            "row": 0,
            "column": 0,
            "width": 3,
            "height": 1
        },
        "config": {
            "title": "Monthly Revenue",
            "timeRange": "month",
            "comparison": "previous_period"
        }
    }')
echo "$WIDGET_RESPONSE" | jq '.'
WIDGET_ID=$(echo $WIDGET_RESPONSE | jq -r '.data.widgets[-1]._id // empty')
log_success "Created widget ID: $WIDGET_ID"

log_info "Adding chart widget..."
curl -s -X POST "${BASE_URL}/reporting/dashboards/${DASHBOARD_ID}/widgets" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "X-Organization-Id: ${ORG_ID}" \
    -H "Content-Type: application/json" \
    -d '{
        "name": "Revenue Trend",
        "type": "line_chart",
        "dataSource": "revenue",
        "position": {
            "row": 1,
            "column": 0,
            "width": 6,
            "height": 2
        },
        "config": {
            "title": "Revenue Over Time"
        }
    }' | jq '.'

log_info "Adding expense breakdown widget..."
curl -s -X POST "${BASE_URL}/reporting/dashboards/${DASHBOARD_ID}/widgets" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "X-Organization-Id: ${ORG_ID}" \
    -H "Content-Type: application/json" \
    -d '{
        "name": "Expense Breakdown",
        "type": "pie_chart",
        "dataSource": "expenses",
        "position": {
            "row": 1,
            "column": 6,
            "width": 6,
            "height": 2
        },
        "config": {
            "title": "Expenses by Category"
        }
    }' | jq '.'

api_get "/reporting/dashboards/${DASHBOARD_ID}" "Get dashboard with widgets"

log_info "Cloning dashboard..."
curl -s -X POST "${BASE_URL}/reporting/dashboards/${DASHBOARD_ID}/clone" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "X-Organization-Id: ${ORG_ID}" \
    -H "Content-Type: application/json" \
    -d '{"name": "CEO Dashboard Copy"}' | jq '.'

# 7.3 Report Templates
log_section "7.3 Report Templates"

log_info "Creating report template..."
TEMPLATE_RESPONSE=$(curl -s -X POST "${BASE_URL}/reporting/investor-reports/templates" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "X-Organization-Id: ${ORG_ID}" \
    -H "Content-Type: application/json" \
    -d '{
        "name": "Monthly Investor Update",
        "type": "monthly_update",
        "description": "Standard monthly update template for investors",
        "isDefault": true,
        "sections": [
            {
                "type": "executive_summary",
                "title": "Executive Summary",
                "order": 1,
                "isRequired": true,
                "defaultContent": "Summary of key achievements this month..."
            },
            {
                "type": "key_metrics",
                "title": "Key Metrics",
                "order": 2,
                "isRequired": true
            },
            {
                "type": "financial_overview",
                "title": "Financial Overview",
                "order": 3,
                "isRequired": true
            }
        ]
    }')
echo "$TEMPLATE_RESPONSE" | jq '.'
TEMPLATE_ID=$(echo $TEMPLATE_RESPONSE | jq -r '.data._id // empty')
log_success "Created template ID: $TEMPLATE_ID"

api_get "/reporting/investor-reports/templates" "List all templates"

# 7.4 Investor Reports
log_section "7.4 Investor Reports"

log_info "Creating investor report..."
REPORT_RESPONSE=$(curl -s -X POST "${BASE_URL}/reporting/investor-reports" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "X-Organization-Id: ${ORG_ID}" \
    -H "Content-Type: application/json" \
    -d '{
        "title": "January 2024 Investor Update",
        "type": "monthly_update",
        "reportingPeriod": {
            "type": "monthly",
            "year": 2024,
            "month": 1
        },
        "recipients": [
            {
                "email": "investor1@sequoia.com",
                "name": "John Partner"
            },
            {
                "email": "investor2@yc.com",
                "name": "YC Partner"
            }
        ],
        "metrics": {
            "mrr": 25000,
            "arr": 300000,
            "runway": 18,
            "burnRate": 50000,
            "cashBalance": 900000,
            "revenue": 30000,
            "expenses": 50000,
            "netIncome": -20000,
            "headcount": 8,
            "customers": 45,
            "churnRate": 2.5
        },
        "notes": "Strong month with new enterprise customer acquisition"
    }')
echo "$REPORT_RESPONSE" | jq '.'
REPORT_ID=$(echo $REPORT_RESPONSE | jq -r '.data._id // empty')
log_success "Created report ID: $REPORT_ID"

api_get "/reporting/investor-reports" "List all reports"
api_get "/reporting/investor-reports/${REPORT_ID}" "Get report by ID"

# 7.5 Report Sections
log_section "7.5 Report Sections"

log_info "Adding executive summary section..."
SECTION_RESPONSE=$(curl -s -X POST "${BASE_URL}/reporting/investor-reports/${REPORT_ID}/sections" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "X-Organization-Id: ${ORG_ID}" \
    -H "Content-Type: application/json" \
    -d '{
        "type": "executive_summary",
        "title": "Executive Summary",
        "order": 1,
        "content": "January was a strong month for us. We closed our seed round with $675K raised from Sequoia, YC, and angel investors. Our MRR grew 15% to $25K, and we added 5 new enterprise customers.",
        "isVisible": true
    }')
echo "$SECTION_RESPONSE" | jq '.'
SECTION_ID=$(echo $SECTION_RESPONSE | jq -r '.data.sections[-1]._id // empty')

log_info "Adding key metrics section..."
curl -s -X POST "${BASE_URL}/reporting/investor-reports/${REPORT_ID}/sections" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "X-Organization-Id: ${ORG_ID}" \
    -H "Content-Type: application/json" \
    -d '{
        "type": "key_metrics",
        "title": "Key Metrics",
        "order": 2,
        "metrics": [
            {"name": "MRR", "value": 25000, "previousValue": 21739, "change": 15, "changeType": "percentage", "format": "currency"},
            {"name": "Customers", "value": 45, "previousValue": 40, "change": 5, "changeType": "absolute", "format": "number"},
            {"name": "Churn Rate", "value": 2.5, "previousValue": 3.2, "change": -0.7, "changeType": "absolute", "format": "percentage"}
        ],
        "isVisible": true
    }' | jq '.'

log_info "Adding financial overview section..."
curl -s -X POST "${BASE_URL}/reporting/investor-reports/${REPORT_ID}/sections" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "X-Organization-Id: ${ORG_ID}" \
    -H "Content-Type: application/json" \
    -d '{
        "type": "financial_overview",
        "title": "Financial Overview",
        "order": 3,
        "content": "Revenue increased by 15% MoM. Operating expenses remained stable at $50K/month. With the recent funding, our runway extended to 18 months.",
        "isVisible": true
    }' | jq '.'

api_get "/reporting/investor-reports/${REPORT_ID}" "Get report with sections"

# 7.6 Report Workflow
log_section "7.6 Report Workflow"

log_info "Submitting report for review..."
curl -s -X POST "${BASE_URL}/reporting/investor-reports/${REPORT_ID}/submit" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "X-Organization-Id: ${ORG_ID}" \
    -H "Content-Type: application/json" | jq '.'

log_info "Approving report..."
curl -s -X POST "${BASE_URL}/reporting/investor-reports/${REPORT_ID}/approve" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "X-Organization-Id: ${ORG_ID}" \
    -H "Content-Type: application/json" | jq '.'

log_info "Sending report to investors..."
curl -s -X POST "${BASE_URL}/reporting/investor-reports/${REPORT_ID}/send" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "X-Organization-Id: ${ORG_ID}" \
    -H "Content-Type: application/json" | jq '.'

api_get "/reporting/investor-reports/${REPORT_ID}" "Get sent report"

# 7.7 Financial Statements
log_section "7.7 Financial Statements"

api_get "/reporting/statements/pnl?periodType=monthly&year=2024&month=1" "Get P&L Statement"
api_get "/reporting/statements/balance?asOfDate=2024-01-31" "Get Balance Sheet"
api_get "/reporting/statements/cashflow?periodType=monthly&year=2024&month=1" "Get Cash Flow Statement"
api_get "/reporting/statements/compare?type=pnl" "Compare statements"
api_get "/reporting/statements/export?type=pnl&format=json&year=2024&month=1" "Export statement"

# =============================================================
# SUMMARY
# =============================================================
log_section "TEST SUMMARY"

echo -e "${GREEN}All API tests completed!${NC}"
echo ""
echo "Created Resources:"
echo "  - User ID: $USER_ID"
echo "  - Organization ID: $ORG_ID"
echo "  - Funding Round ID: $ROUND_ID"
echo "  - Investor IDs: $INVESTOR_ID, $INVESTOR2_ID, $INVESTOR3_ID"
echo "  - Share Class ID: $SHARE_CLASS_ID"
echo "  - Cap Table Entry ID: $CAP_TABLE_ENTRY_ID"
echo "  - ESOP Pool ID: $ESOP_POOL_ID"
echo "  - ESOP Grant ID: $ESOP_GRANT_ID"
echo "  - Dashboard ID: $DASHBOARD_ID"
echo "  - Report Template ID: $TEMPLATE_ID"
echo "  - Investor Report ID: $REPORT_ID"
echo ""
echo "MongoDB Collections to check:"
echo "  - users"
echo "  - organizations"
echo "  - memberships"
echo "  - accounts (Chart of Accounts)"
echo "  - transactions"
echo "  - budgets"
echo "  - rounds"
echo "  - investors"
echo "  - shareclasses"
echo "  - captableentries"
echo "  - esoppools"
echo "  - esopgrants"
echo "  - dashboards"
echo "  - reporttemplates"
echo "  - investorreports"
