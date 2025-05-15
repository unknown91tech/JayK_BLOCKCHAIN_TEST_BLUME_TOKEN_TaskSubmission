// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MockPriceFeed
 * @dev Mock contract that simulates a price feed for testing
 */
contract MockPriceFeed {
    uint80 private _roundId;
    int256 private _answer;
    uint256 private _startedAt;
    uint256 private _updatedAt;
    uint80 private _answeredInRound;
    
    /**
     * @dev Sets the latest round data to be returned
     * @param roundId The round ID
     * @param answer The price answer (typically with 8 decimals)
     * @param startedAt The timestamp when the round started
     * @param updatedAt The timestamp when the round was updated
     * @param answeredInRound The round in which this was answered
     */
    function setLatestRoundData(
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    ) external {
        _roundId = roundId;
        _answer = answer;
        _startedAt = startedAt;
        _updatedAt = updatedAt;
        _answeredInRound = answeredInRound;
    }
    
    /**
     * @dev Returns the latest round data
     * @return roundId The round ID
     * @return answer The price answer
     * @return startedAt The timestamp when the round started
     * @return updatedAt The timestamp when the round was updated
     * @return answeredInRound The round in which this was answered
     */
    function latestRoundData() external view returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    ) {
        return (_roundId, _answer, _startedAt, _updatedAt, _answeredInRound);
    }
    
    /**
     * @dev Returns the negative price error message for testing
     * @return The error message for negative prices
     */
    function getNegativePriceErrorMessage() external pure returns (string memory) {
        return "PriceOracle: NEGATIVE_PRICE";
    }
}