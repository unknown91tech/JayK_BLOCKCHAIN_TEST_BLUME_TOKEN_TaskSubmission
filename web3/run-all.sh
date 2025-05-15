#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to print colored output
print_color() {
    echo -e "${2}${1}${NC}"
}

# Function to print section headers
print_header() {
    echo
    echo "=============================================="
    print_color "$1" "$BLUE"
    echo "=============================================="
    echo
}

# Function to run a script and check its exit code
run_script() {
    local script_name=$1
    local description=$2
    
    print_color "Running: $description" "$YELLOW"
    echo "Script: $script_name"
    echo
    
    # Run the script and capture exit code
    if node "$script_name"; then
        print_color "✅ $description - PASSED" "$GREEN"
        return 0
    else
        print_color "❌ $description - FAILED" "$RED"
        return 1
    fi
}

# Function to run a script with optional continuation on failure
run_script_optional() {
    local script_name=$1
    local description=$2
    
    run_script "$script_name" "$description"
    local exit_code=$?
    
    if [ $exit_code -ne 0 ]; then
        print_color "⚠️  Script failed but continuing with remaining tests..." "$YELLOW"
    fi
    
    echo
    return $exit_code
}

# Initialize counters
total_tests=0
passed_tests=0
failed_tests=0

# Main execution
print_header "BLUME ECOSYSTEM - COMPREHENSIVE TEST SUITE"
print_color "Starting automated test execution..." "$CYAN"

# Store start time
start_time=$(date +%s)

# Test 1: Role Management
print_header "TEST 1: ROLE MANAGEMENT AND ACCESS CONTROL"
run_script_optional "test-role-management.js" "Role Management Tests"
total_tests=$((total_tests + 1))
if [ $? -eq 0 ]; then passed_tests=$((passed_tests + 1)); else failed_tests=$((failed_tests + 1)); fi

# Test 2: Basic Token Functionality
print_header "TEST 2: BASIC TOKEN FUNCTIONALITY"
run_script_optional "test-blume-token.js" "Basic Token Tests"
total_tests=$((total_tests + 1))
if [ $? -eq 0 ]; then passed_tests=$((passed_tests + 1)); else failed_tests=$((failed_tests + 1)); fi

# Test 3: Anti-Whale and Anti-Bot Protection
print_header "TEST 3: ANTI-WHALE AND ANTI-BOT PROTECTION"
run_script_optional "test-antiwhale-antibot.js" "Anti-Whale/Anti-Bot Tests"
total_tests=$((total_tests + 1))
if [ $? -eq 0 ]; then passed_tests=$((passed_tests + 1)); else failed_tests=$((failed_tests + 1)); fi

# Test 4: Security Analysis
print_header "TEST 4: SECURITY ANALYSIS"
run_script_optional "attacks.js" "Security Analysis and Attack Vectors"
total_tests=$((total_tests + 1))
if [ $? -eq 0 ]; then passed_tests=$((passed_tests + 1)); else failed_tests=$((failed_tests + 1)); fi

# Test 5: Price Oracle and Core Functionality
print_header "TEST 5: PRICE ORACLE AND CORE FUNCTIONALITY"
run_script_optional "price-oracle.js" "Price Oracle and Core Tests"
total_tests=$((total_tests + 1))
if [ $? -eq 0 ]; then passed_tests=$((passed_tests + 1)); else failed_tests=$((failed_tests + 1)); fi

# Test 6: Liquidity Pools
print_header "TEST 6: LIQUIDITY POOLS AND DEX"
run_script_optional "test-liquidity-pools.js" "Liquidity Pool Creation Tests"
total_tests=$((total_tests + 1))
if [ $? -eq 0 ]; then passed_tests=$((passed_tests + 1)); else failed_tests=$((failed_tests + 1)); fi

# Test 7: LP Fees and Distribution
print_header "TEST 7: LP FEES AND DISTRIBUTION"
run_script_optional "test-lp-fees.js" "LP Token and Fee Distribution Tests"
total_tests=$((total_tests + 1))
if [ $? -eq 0 ]; then passed_tests=$((passed_tests + 1)); else failed_tests=$((failed_tests + 1)); fi

# Test 8: Ecosystem Integration
print_header "TEST 8: ECOSYSTEM INTEGRATION"
run_script_optional "eco-system.js" "Full Ecosystem Integration Tests"
total_tests=$((total_tests + 1))
if [ $? -eq 0 ]; then passed_tests=$((passed_tests + 1)); else failed_tests=$((failed_tests + 1)); fi

# Test 9: Missing Features Comprehensive Testing
print_header "TEST 9: COMPREHENSIVE FEATURE TESTING"
run_script_optional "missing-test.js" "Additional Feature Tests"
total_tests=$((total_tests + 1))
if [ $? -eq 0 ]; then passed_tests=$((passed_tests + 1)); else failed_tests=$((failed_tests + 1)); fi

# Test 10: Yield Farming Demo
print_header "TEST 10: YIELD FARMING DEMONSTRATION"
run_script_optional "yield-famer.js" "Yield Farming Strategy Tests"
total_tests=$((total_tests + 1))
if [ $? -eq 0 ]; then passed_tests=$((passed_tests + 1)); else failed_tests=$((failed_tests + 1)); fi

# Calculate execution time
end_time=$(date +%s)
execution_time=$((end_time - start_time))

# Print final summary
print_header "FINAL TEST SUMMARY"
print_color "Total Tests Run: $total_tests" "$CYAN"
print_color "Passed: $passed_tests" "$GREEN"
print_color "Failed: $failed_tests" "$RED"

# Calculate success rate
success_rate=$(echo "scale=1; $passed_tests * 100 / $total_tests" | bc)
print_color "Success Rate: ${success_rate}%" "$CYAN"

# Print execution time
minutes=$((execution_time / 60))
seconds=$((execution_time % 60))
print_color "Total Execution Time: ${minutes}m ${seconds}s" "$CYAN"

# Print recommendations based on results
echo
if [ $failed_tests -eq 0 ]; then
    print_color "🎉 ALL TESTS PASSED! The Blume ecosystem is ready for deployment." "$GREEN"
elif [ $failed_tests -lt 3 ]; then
    print_color "⚠️  Minor issues detected. Review failed tests before deployment." "$YELLOW"
else
    print_color "❌ Multiple test failures detected. Significant issues need attention." "$RED"
fi

# Exit with appropriate code
if [ $failed_tests -eq 0 ]; then
    exit 0
else
    exit 1
fi