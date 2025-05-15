# Create comprehensive testing script
#!/bin/bash

echo "=== Running Hardhat Tests ==="
npx hardhat test

echo "=== Running Test Coverage ==="
npx hardhat coverage

if command -v slither &> /dev/null; then
  echo "=== Running Slither Static Analysis ==="
  ./slither.sh
else
  echo "Slither not installed. Skipping static analysis."
fi

if command -v myth &> /dev/null; then
  echo "=== Running Mythril Security Analysis ==="
  ./run-mythril.sh
else
  echo "Mythril not installed. Skipping security analysis."
fi

echo "=== Running Gas Reporter ==="
REPORT_GAS=true npx hardhat test

echo "=== All tests completed! ==="
EOL

# Make script executable
chmod +x test-all.sh