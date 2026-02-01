#!/bin/bash

# ==============================================
# Operations Module API Test Script
# Tests: Tasks, Milestones, Meetings
# ==============================================

BASE_URL="http://localhost:5001/api/v1"
AUTH_TOKEN=""
ORG_ID=""
USER_ID=""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
PASSED=0
FAILED=0
TOTAL=0

# Helper functions
print_header() {
    echo ""
    echo -e "${BLUE}============================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}============================================${NC}"
}

print_test() {
    echo -e "\n${YELLOW}Testing: $1${NC}"
    ((TOTAL++))
}

check_success() {
    if echo "$1" | grep -q '"success":true'; then
        echo -e "${GREEN}✓ PASSED${NC}"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}✗ FAILED${NC}"
        echo "Response: $1"
        ((FAILED++))
        return 1
    fi
}

# API request helpers
api_get() {
    curl -s -X GET "$BASE_URL$1" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -H "X-Organization-Id: $ORG_ID"
}

api_post() {
    curl -s -X POST "$BASE_URL$1" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -H "X-Organization-Id: $ORG_ID" \
        -d "$2"
}

api_put() {
    curl -s -X PUT "$BASE_URL$1" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -H "X-Organization-Id: $ORG_ID" \
        -d "$2"
}

api_delete() {
    curl -s -X DELETE "$BASE_URL$1" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -H "X-Organization-Id: $ORG_ID"
}

# ==============================================
# SETUP: Register & Login
# ==============================================

print_header "SETUP: Authentication & Organization"

# Register a test user
print_test "Register new user"
TIMESTAMP=$(date +%s)
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register" \
    -H "Content-Type: application/json" \
    -d "{
        \"email\": \"ops-test-$TIMESTAMP@example.com\",
        \"password\": \"Password123!\",
        \"firstName\": \"Ops\",
        \"lastName\": \"Tester\"
    }")
check_success "$REGISTER_RESPONSE"

# Extract token and user ID - handle both "id" and "_id" formats
AUTH_TOKEN=$(echo "$REGISTER_RESPONSE" | sed -n 's/.*"accessToken":"\([^"]*\)".*/\1/p')
# Try "id" first (toJSON transform), then "_id"
USER_ID=$(echo "$REGISTER_RESPONSE" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p' | head -1)
if [ -z "$USER_ID" ]; then
    USER_ID=$(echo "$REGISTER_RESPONSE" | sed -n 's/.*"_id":"\([^"]*\)".*/\1/p' | head -1)
fi
echo "Token obtained: ${AUTH_TOKEN:0:20}..."
echo "User ID: $USER_ID"

# Create organization
print_test "Create organization"
ORG_RESPONSE=$(curl -s -X POST "$BASE_URL/organizations" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -d '{
        "name": "Ops Test Startup",
        "industry": "technology",
        "stage": "seed"
    }')
check_success "$ORG_RESPONSE"

# Extract org ID - handle both "id" and "_id" formats
# The API returns "id" due to toJSON transform
ORG_ID=$(echo "$ORG_RESPONSE" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p' | tail -1)
if [ -z "$ORG_ID" ]; then
    ORG_ID=$(echo "$ORG_RESPONSE" | sed -n 's/.*"_id":"\([^"]*\)".*/\1/p' | head -1)
fi
echo "Organization ID: $ORG_ID"

# Validate we got the required IDs
if [ -z "$AUTH_TOKEN" ]; then
    echo -e "${RED}Failed to extract auth token. Cannot continue.${NC}"
    echo "Register Response: $REGISTER_RESPONSE"
    exit 1
fi

if [ -z "$ORG_ID" ]; then
    echo -e "${RED}Failed to extract organization ID. Cannot continue.${NC}"
    echo "Org Response: $ORG_RESPONSE"
    exit 1
fi

echo -e "${GREEN}Setup complete. Starting Operations module tests...${NC}"

# ==============================================
# TASKS SUB-MODULE
# ==============================================

print_header "TASKS SUB-MODULE"

# Create task
print_test "Create task"
TASK_RESPONSE=$(api_post "/operations/tasks" '{
    "title": "Review Q4 financial projections",
    "description": "Analyze and validate Q4 financial projections before board meeting",
    "priority": "high",
    "category": "finance",
    "dueDate": "2026-02-15T00:00:00.000Z",
    "tags": ["quarterly", "finance", "board"],
    "estimatedHours": 4
}')
check_success "$TASK_RESPONSE"
TASK_ID=$(echo "$TASK_RESPONSE" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p' | tail -1)
[ -z "$TASK_ID" ] && TASK_ID=$(echo "$TASK_RESPONSE" | sed -n 's/.*"_id":"\([^"]*\)".*/\1/p' | head -1)
echo "Task ID: $TASK_ID"

# Get all tasks
print_test "Get all tasks"
RESULT=$(api_get "/operations/tasks")
check_success "$RESULT"

# Get task by ID
print_test "Get task by ID"
RESULT=$(api_get "/operations/tasks/$TASK_ID")
check_success "$RESULT"

# Update task
print_test "Update task"
RESULT=$(api_put "/operations/tasks/$TASK_ID" '{
    "description": "Updated: Analyze Q4 projections with new data",
    "priority": "urgent"
}')
check_success "$RESULT"

# Update task status
print_test "Update task status"
RESULT=$(api_put "/operations/tasks/$TASK_ID/status" '{
    "status": "in_progress"
}')
check_success "$RESULT"

# Add comment to task
print_test "Add comment to task"
RESULT=$(api_post "/operations/tasks/$TASK_ID/comments" '{
    "content": "Started reviewing the projections. Found some discrepancies in revenue estimates."
}')
check_success "$RESULT"
COMMENT_ID=$(echo "$RESULT" | sed -n 's/.*"comments":\[{"_id":"\([^"]*\)".*/\1/p')

# Get task comments
print_test "Get task comments"
RESULT=$(api_get "/operations/tasks/$TASK_ID/comments")
check_success "$RESULT"

# Add reminder to task
print_test "Add reminder to task"
RESULT=$(api_post "/operations/tasks/$TASK_ID/reminders" '{
    "reminderDate": "2026-02-14T09:00:00.000Z",
    "reminderType": "email"
}')
check_success "$RESULT"

# Get my tasks
print_test "Get my tasks"
RESULT=$(api_get "/operations/tasks/my")
check_success "$RESULT"

# Get task statistics
print_test "Get task statistics"
RESULT=$(api_get "/operations/tasks/stats")
check_success "$RESULT"

# Create subtask
print_test "Create subtask"
SUBTASK_RESPONSE=$(api_post "/operations/tasks" "{
    \"title\": \"Validate revenue assumptions\",
    \"description\": \"Check revenue growth assumptions for Q4\",
    \"priority\": \"medium\",
    \"category\": \"finance\",
    \"parentTask\": \"$TASK_ID\"
}")
check_success "$SUBTASK_RESPONSE"
SUBTASK_ID=$(echo "$SUBTASK_RESPONSE" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p' | tail -1)
[ -z "$SUBTASK_ID" ] && SUBTASK_ID=$(echo "$SUBTASK_RESPONSE" | sed -n 's/.*"_id":"\([^"]*\)".*/\1/p' | head -1)

# Bulk update tasks
print_test "Bulk update tasks"
RESULT=$(api_put "/operations/tasks/bulk" "{
    \"taskIds\": [\"$TASK_ID\", \"$SUBTASK_ID\"],
    \"updates\": {
        \"category\": \"fundraising\"
    }
}")
check_success "$RESULT"

# ==============================================
# MILESTONES SUB-MODULE
# ==============================================

print_header "MILESTONES SUB-MODULE"

# Create milestone
print_test "Create milestone"
MILESTONE_RESPONSE=$(api_post "/operations/milestones" '{
    "title": "Launch MVP",
    "description": "Release minimum viable product to early customers",
    "category": "product",
    "targetDate": "2026-03-31T00:00:00.000Z",
    "keyResults": [
        {
            "title": "Complete core features",
            "targetValue": 100,
            "currentValue": 60,
            "unit": "percent",
            "status": "on_track"
        },
        {
            "title": "Beta users onboarded",
            "targetValue": 50,
            "currentValue": 20,
            "unit": "users",
            "status": "on_track"
        }
    ],
    "tags": ["mvp", "launch", "q1"]
}')
check_success "$MILESTONE_RESPONSE"
MILESTONE_ID=$(echo "$MILESTONE_RESPONSE" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p' | tail -1)
[ -z "$MILESTONE_ID" ] && MILESTONE_ID=$(echo "$MILESTONE_RESPONSE" | sed -n 's/.*"_id":"\([^"]*\)".*/\1/p' | head -1)
echo "Milestone ID: $MILESTONE_ID"

# Get all milestones
print_test "Get all milestones"
RESULT=$(api_get "/operations/milestones")
check_success "$RESULT"

# Get milestone by ID
print_test "Get milestone by ID"
RESULT=$(api_get "/operations/milestones/$MILESTONE_ID")
check_success "$RESULT"

# Update milestone
print_test "Update milestone"
RESULT=$(api_put "/operations/milestones/$MILESTONE_ID" '{
    "status": "in_progress",
    "progress": 45
}')
check_success "$RESULT"

# Update milestone status (to at_risk since it's already in_progress)
print_test "Update milestone status"
RESULT=$(api_put "/operations/milestones/$MILESTONE_ID/status" '{
    "status": "at_risk",
    "notes": "Timeline concerns due to dependency delays"
}')
check_success "$RESULT"

# Update milestone progress
print_test "Update milestone progress"
RESULT=$(api_put "/operations/milestones/$MILESTONE_ID/progress" '{
    "progress": 55
}')
check_success "$RESULT"

# Add key result
print_test "Add key result to milestone"
RESULT=$(api_post "/operations/milestones/$MILESTONE_ID/key-results" '{
    "title": "Complete user documentation",
    "targetValue": 100,
    "currentValue": 0,
    "unit": "percent",
    "status": "pending"
}')
check_success "$RESULT"

# Link tasks to milestone
print_test "Link tasks to milestone"
RESULT=$(api_post "/operations/milestones/$MILESTONE_ID/tasks" "{
    \"taskIds\": [\"$TASK_ID\"]
}")
check_success "$RESULT"

# Get roadmap view
print_test "Get roadmap view"
RESULT=$(api_get "/operations/milestones/roadmap")
check_success "$RESULT"

# Get milestone statistics
print_test "Get milestone statistics"
RESULT=$(api_get "/operations/milestones/stats")
check_success "$RESULT"

# Create a second milestone for Q2
print_test "Create Q2 milestone"
MILESTONE2_RESPONSE=$(api_post "/operations/milestones" '{
    "title": "Series A Fundraise",
    "description": "Close Series A funding round",
    "category": "fundraising",
    "targetDate": "2026-06-30T00:00:00.000Z"
}')
check_success "$MILESTONE2_RESPONSE"

# ==============================================
# MEETINGS SUB-MODULE
# ==============================================

print_header "MEETINGS SUB-MODULE"

# Create meeting
print_test "Create meeting"
MEETING_RESPONSE=$(api_post "/operations/meetings" '{
    "title": "Series A Intro Call with Sequoia",
    "type": "intro_call",
    "startTime": "2026-02-10T14:00:00.000Z",
    "endTime": "2026-02-10T15:00:00.000Z",
    "timezone": "America/Los_Angeles",
    "location": "Zoom",
    "meetingLink": "https://zoom.us/j/123456789",
    "attendees": [
        {
            "name": "John Partner",
            "email": "john@sequoia.com",
            "role": "Partner",
            "isRequired": true
        }
    ],
    "agenda": "1. Company overview\n2. Market opportunity\n3. Business model\n4. Team\n5. Ask"
}')
check_success "$MEETING_RESPONSE"
MEETING_ID=$(echo "$MEETING_RESPONSE" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p' | tail -1)
[ -z "$MEETING_ID" ] && MEETING_ID=$(echo "$MEETING_RESPONSE" | sed -n 's/.*"_id":"\([^"]*\)".*/\1/p' | head -1)
echo "Meeting ID: $MEETING_ID"

# Get all meetings
print_test "Get all meetings"
RESULT=$(api_get "/operations/meetings")
check_success "$RESULT"

# Get meeting by ID
print_test "Get meeting by ID"
RESULT=$(api_get "/operations/meetings/$MEETING_ID")
check_success "$RESULT"

# Update meeting
print_test "Update meeting"
RESULT=$(api_put "/operations/meetings/$MEETING_ID" '{
    "status": "confirmed",
    "notes": "Confirmed via email. Will share deck beforehand."
}')
check_success "$RESULT"

# Add action item to meeting
print_test "Add action item to meeting"
RESULT=$(api_post "/operations/meetings/$MEETING_ID/actions" '{
    "title": "Send pitch deck",
    "description": "Email the updated pitch deck to John before the meeting",
    "dueDate": "2026-02-09T12:00:00.000Z",
    "status": "pending"
}')
check_success "$RESULT"

# Get upcoming meetings
print_test "Get upcoming meetings"
RESULT=$(api_get "/operations/meetings/upcoming")
check_success "$RESULT"

# Get meeting statistics
print_test "Get meeting statistics"
RESULT=$(api_get "/operations/meetings/stats")
check_success "$RESULT"

# Complete meeting
print_test "Complete meeting"
RESULT=$(api_post "/operations/meetings/$MEETING_ID/complete" '{
    "outcome": "positive",
    "outcomeNotes": "Great intro call. They are interested and want to see more metrics.",
    "notes": "- Discussed market size\n- Asked about competition\n- Interested in monthly growth rate",
    "followUpDate": "2026-02-17T14:00:00.000Z",
    "actionItems": [
        {
            "title": "Send monthly metrics report",
            "description": "Compile and send last 6 months of growth metrics",
            "dueDate": "2026-02-12T00:00:00.000Z"
        }
    ]
}')
check_success "$RESULT"

# Create second meeting (follow-up)
print_test "Create follow-up meeting"
MEETING2_RESPONSE=$(api_post "/operations/meetings" '{
    "title": "Sequoia Follow-up: Deep Dive",
    "type": "follow_up",
    "startTime": "2026-02-17T14:00:00.000Z",
    "endTime": "2026-02-17T15:30:00.000Z",
    "timezone": "America/Los_Angeles",
    "attendees": [
        {
            "name": "John Partner",
            "email": "john@sequoia.com",
            "role": "Partner",
            "isRequired": true
        },
        {
            "name": "Sarah Associate",
            "email": "sarah@sequoia.com",
            "role": "Associate",
            "isRequired": true
        }
    ],
    "agenda": "1. Review metrics\n2. Unit economics deep dive\n3. Competitive analysis\n4. Next steps"
}')
check_success "$MEETING2_RESPONSE"
MEETING2_ID=$(echo "$MEETING2_RESPONSE" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p' | tail -1)
[ -z "$MEETING2_ID" ] && MEETING2_ID=$(echo "$MEETING2_RESPONSE" | sed -n 's/.*"_id":"\([^"]*\)".*/\1/p' | head -1)

# Reschedule meeting
print_test "Reschedule meeting"
RESULT=$(api_post "/operations/meetings/$MEETING2_ID/reschedule" '{
    "startTime": "2026-02-18T10:00:00.000Z",
    "endTime": "2026-02-18T11:30:00.000Z",
    "notes": "Rescheduled due to scheduling conflict"
}')
check_success "$RESULT"

# ==============================================
# CLEANUP
# ==============================================

print_header "CLEANUP"

# Archive task
print_test "Archive task"
RESULT=$(api_post "/operations/tasks/$TASK_ID/archive")
check_success "$RESULT"

# Archive milestone
print_test "Archive milestone"
RESULT=$(api_post "/operations/milestones/$MILESTONE_ID/archive")
check_success "$RESULT"

# Cancel meeting
print_test "Cancel meeting"
RESULT=$(api_post "/operations/meetings/$MEETING2_ID/cancel")
check_success "$RESULT"

# ==============================================
# SUMMARY
# ==============================================

print_header "TEST SUMMARY"

echo ""
echo -e "Total Tests: $TOTAL"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed! ✓${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed. Please review the output above.${NC}"
    exit 1
fi
