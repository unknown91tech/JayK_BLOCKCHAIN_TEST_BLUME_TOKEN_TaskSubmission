// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title MockBlumeSwapPair
 * @dev Simplified mock of BlumeSwapPair for testing
 */
contract MockBlumeSwapPair is ERC20, ReentrancyGuard {
    address public factory;
    address public token0;
    address public token1;
    address public priceOracle;
    
    uint256 public maxPriceDeviation = 500; // Default 5% maximum deviation
    
    constructor() ERC20("MockBlumeLP", "MLPT") {
        factory = msg.sender;
    }
    
    /**
     * @dev Initialize the mock pair
     */
    function initialize(address _token0, address _token1) external {
        token0 = _token0;
        token1 = _token1;
    }
    
    /**
     * @dev Sets the price oracle address - not restricted for testing
     */
    function setPriceOracle(address _priceOracle) external {
        priceOracle = _priceOracle;
    }
    
    /**
     * @dev Sets max price deviation - not restricted for testing
     */
    function setMaxPriceDeviation(uint256 _maxDeviation) external {
        maxPriceDeviation = _maxDeviation;
    }
    
    /**
     * @dev Mock function to simulate setting factory - for testing only
     */
    function setFactory(address _factory) external {
        factory = _factory;
    }
}