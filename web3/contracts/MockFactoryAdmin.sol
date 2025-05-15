// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IBlumeSwapFactory {
    function getPair(address tokenA, address tokenB) external view returns (address pair);
    function createPair(address tokenA, address tokenB) external returns (address pair);
}

/**
 * @title MockFactoryAdmin
 * @dev Helper contract for testing that can configure BlumeSwapPair settings
 */
contract MockFactoryAdmin {
    address public factory;
    
    constructor(address _factory) {
        factory = _factory;
    }
    
    /**
     * @dev Calls setMaxPriceDeviation on a pair
     * This allows us to circumvent the onlyFactory modifier in tests
     */
    function setMaxPriceDeviation(address pair, uint256 maxDeviation) external {
        // We can't actually call this function due to the onlyFactory modifier
        // This mock is just to illustrate what we need to implement in the test
        // The actual solution uses a different approach
    }
}