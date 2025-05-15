// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IPriceOracle {
    function getPrice(address token) external view returns (uint256);
}

/**
 * @title MockPriceVerifier
 * @dev Contract that implements the BlumeSwapPair price verification logic for testing
 */
contract MockPriceVerifier {
    address public priceOracle;
    uint256 private constant BPS_DENOMINATOR = 10000;
    
    constructor(address _priceOracle) {
        priceOracle = _priceOracle;
    }
    
    /**
     * @dev Verifies that a price is within acceptable bounds compared to oracle
     * This logic is extracted from the BlumeSwapPair contract
     */
    function verifyPrice(
        address token0,
        address token1,
        uint256 amount0,
        uint256 amount1,
        uint256 maxPriceDeviation
    ) external view {
        if (priceOracle == address(0)) return; // Skip check if no oracle is set
        if (amount0 == 0 || amount1 == 0) return; // Skip check if either amount is zero
        
        // Get oracle prices
        uint256 price0 = IPriceOracle(priceOracle).getPrice(token0);
        uint256 price1 = IPriceOracle(priceOracle).getPrice(token1);
        
        if (price0 == 0 || price1 == 0) return; // Skip check if oracle prices not available
        
        // Calculate the price ratio from the provided amounts
        uint256 providedPriceRatio = (amount1 * 1e18) / amount0;
        
        // Calculate the oracle price ratio
        uint256 oraclePriceRatio = (price1 * 1e18) / price0;
        
        // Calculate percentage deviation
        uint256 deviation;
        if (providedPriceRatio > oraclePriceRatio) {
            deviation = ((providedPriceRatio - oraclePriceRatio) * BPS_DENOMINATOR) / oraclePriceRatio;
        } else {
            deviation = ((oraclePriceRatio - providedPriceRatio) * BPS_DENOMINATOR) / oraclePriceRatio;
        }
        
        // Ensure deviation is within allowed limits
        require(deviation <= maxPriceDeviation, "Price outside bounds");
    }
}