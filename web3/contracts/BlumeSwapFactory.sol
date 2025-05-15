// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Create2.sol";
import "./BlumeSwapPair.sol";

/**
 * @title BlumeSwapFactory
 * @dev Factory contract for creating BlumeSwap trading pairs
 */
contract BlumeSwapFactory is AccessControl {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    
    mapping(address => mapping(address => address)) public getPair;
    address[] public allPairs;
    
    uint256 public protocolFeeBPS = 30; // 0.3% protocol fee (30 basis points)
    address public feeReceiver;
    
    event PairCreated(address indexed token0, address indexed token1, address pair, uint256 pairIndex);
    event ProtocolFeeUpdated(uint256 newFeeBPS);
    event FeeReceiverUpdated(address newFeeReceiver);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        feeReceiver = msg.sender;
    }
    
    /**
     * @dev Returns the number of pairs created through the factory
     */
    function allPairsLength() external view returns (uint256) {
        return allPairs.length;
    }

    /**
     * @dev Creates a new pair for the given tokens
     * Uses Create2 to deploy the pair at a deterministic address
     */
    function createPair(address tokenA, address tokenB) external returns (address pair) {
        require(tokenA != tokenB, "BlumeSwap: IDENTICAL_ADDRESSES");
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        require(token0 != address(0), "BlumeSwap: ZERO_ADDRESS");
        require(getPair[token0][token1] == address(0), "BlumeSwap: PAIR_EXISTS");
        
        // Compute the CREATE2 salt
        bytes32 salt = keccak256(abi.encodePacked(token0, token1));
        
        // Deploy new pair contract
        BlumeSwapPair newPair = new BlumeSwapPair{salt: salt}();
        
        // Initialize the pair
        newPair.initialize(token0, token1);
        
        // Store the pair address
        pair = address(newPair);
        getPair[token0][token1] = pair;
        getPair[token1][token0] = pair; // Also populate mapping in reverse direction
        allPairs.push(pair);
        
        emit PairCreated(token0, token1, pair, allPairs.length - 1);
    }
    
    /**
     * @dev Updates the protocol fee (can only be called by ADMIN)
     * @param newFeeBPS New fee in basis points (1 BPS = 0.01%)
     */
    function setProtocolFeeBPS(uint256 newFeeBPS) external onlyRole(ADMIN_ROLE) {
        require(newFeeBPS <= 100, "BlumeSwap: FEE_TOO_HIGH"); // Max 1% fee
        protocolFeeBPS = newFeeBPS;
        emit ProtocolFeeUpdated(newFeeBPS);
    }
    
    /**
     * @dev Updates the fee receiver address (can only be called by ADMIN)
     * @param newFeeReceiver Address that will receive protocol fees
     */
    function setFeeReceiver(address newFeeReceiver) external onlyRole(ADMIN_ROLE) {
        require(newFeeReceiver != address(0), "BlumeSwap: ZERO_ADDRESS");
        feeReceiver = newFeeReceiver;
        emit FeeReceiverUpdated(newFeeReceiver);
    }
}