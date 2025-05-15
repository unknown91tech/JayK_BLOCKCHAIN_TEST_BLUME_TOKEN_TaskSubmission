// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @dev Interface for price feed contracts
 */
interface IPriceFeed {
    function latestRoundData() external view returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    );
}

/**
 * @title PriceOracle
 * @dev Oracle that gets token prices from price feeds or manual updates
 */
contract PriceOracle is AccessControl {
    bytes32 public constant ORACLE_ADMIN_ROLE = keccak256("ORACLE_ADMIN_ROLE");
    
    // Error messages
    string public constant PRICE_NEGATIVE_ERROR = "PriceOracle: NEGATIVE_PRICE";
    string public constant PRICE_ZERO_ERROR = "PriceOracle: ZERO_PRICE";
    
    // Mapping of token address to price feed address
    mapping(address => address) public priceFeeds;
    
    // Mapping for custom prices (for tokens without external feeds)
    mapping(address => uint256) public customPrices;
    mapping(address => uint256) public lastCustomPriceUpdate;
    
    // Staleness threshold for price feeds (24 hours)
    uint256 public constant PRICE_FEED_STALENESS_THRESHOLD = 24 hours;
    
    // Events
    event PriceFeedSet(address indexed token, address indexed priceFeed);
    event CustomPriceSet(address indexed token, uint256 price);
    
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ORACLE_ADMIN_ROLE, msg.sender);
    }
    
    /**
     * @dev Set a price feed for a token
     * @param token Address of the token
     * @param priceFeed Address of the price feed
     */
    function setPriceFeed(address token, address priceFeed) external onlyRole(ORACLE_ADMIN_ROLE) {
        require(token != address(0), "PriceOracle: ZERO_TOKEN_ADDRESS");
        require(priceFeed != address(0), "PriceOracle: ZERO_FEED_ADDRESS");
        
        // Validate the price feed by trying to call it
        (
            ,
            /*uint80 roundID*/
            int price,
            ,
            uint256 updatedAt,
            /*uint80 answeredInRound*/
        ) = IPriceFeed(priceFeed).latestRoundData();
        
        // Check for negative or zero price
        if (price < 0) {
            revert(PRICE_NEGATIVE_ERROR);
        }
        if (price == 0) {
            revert(PRICE_ZERO_ERROR);
        }
        require(updatedAt > 0, "PriceOracle: INVALID_TIMESTAMP");
        
        priceFeeds[token] = priceFeed;
        emit PriceFeedSet(token, priceFeed);
    }
    
    /**
     * @dev Set a custom price for a token (fallback when no feed exists)
     * @param token Address of the token
     * @param price Price of the token in USD (with 8 decimals)
     */
    function setCustomPrice(address token, uint256 price) external onlyRole(ORACLE_ADMIN_ROLE) {
        require(token != address(0), "PriceOracle: ZERO_TOKEN_ADDRESS");
        require(price > 0, PRICE_ZERO_ERROR);
        
        customPrices[token] = price;
        lastCustomPriceUpdate[token] = block.timestamp;
        
        emit CustomPriceSet(token, price);
    }
    
    /**
     * @dev Get the price of a token in USD
     * @param token Address of the token
     * @return price Price of the token in USD (with 8 decimals)
     */
    function getPrice(address token) external view returns (uint256 price) {
        require(token != address(0), "PriceOracle: ZERO_TOKEN_ADDRESS");
        
        address priceFeed = priceFeeds[token];
        
        if (priceFeed != address(0)) {
            // Get price from external feed
            (
                ,
                /*uint80 roundID*/
                int256 answer,
                ,
                uint256 updatedAt,
                /*uint80 answeredInRound*/
            ) = IPriceFeed(priceFeed).latestRoundData();
            
            // Check for stale data
            require(updatedAt > block.timestamp - PRICE_FEED_STALENESS_THRESHOLD, "PriceOracle: STALE_PRICE");
            
            // Check for negative or zero price
            if (answer < 0) {
                revert(PRICE_NEGATIVE_ERROR);
            }
            if (answer == 0) {
                revert(PRICE_ZERO_ERROR);
            }
            
            return uint256(answer);
        } else {
            // Fallback to custom price
            uint256 customPrice = customPrices[token];
            require(customPrice > 0, "PriceOracle: PRICE_NOT_AVAILABLE");
            
            // Check for stale custom price
            require(
                lastCustomPriceUpdate[token] > block.timestamp - PRICE_FEED_STALENESS_THRESHOLD,
                "PriceOracle: STALE_CUSTOM_PRICE"
            );
            
            return customPrice;
        }
    }
    
    /**
     * @dev Returns the error message for negative prices
     * Can be used in tests to verify error handling
     */
    function getNegativePriceErrorMessage() external pure returns (string memory) {
        return PRICE_NEGATIVE_ERROR;
    }
    
    /**
     * @dev Returns the error message for zero prices
     * Can be used in tests to verify error handling
     */
    function getZeroPriceErrorMessage() external pure returns (string memory) {
        return PRICE_ZERO_ERROR;
    }
}