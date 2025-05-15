// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

interface IStakedBlumeToken is IERC20 {
    // Standard ERC20 with additional functionality
}

interface IBlumeSwapPair {
    function token0() external view returns (address);
    function token1() external view returns (address);
    function getReserves() external view returns (uint256 reserve0, uint256 reserve1, uint32 blockTimestampLast);
}

interface IBlumeSwapRouter {
    function addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) external returns (uint256 amountA, uint256 amountB, uint256 liquidity);
    
    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint256 liquidity,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) external returns (uint256 amountA, uint256 amountB);
}

/**
 * @title BlumeStakingDeFiIntegration
 * @dev Example contract demonstrating how stBLX can be used in DeFi protocols
 */
contract BlumeStakingDeFiIntegration is ReentrancyGuard, AccessControl {
    using SafeERC20 for IERC20;
    
    // Tokens
    IStakedBlumeToken public stBLXToken;
    IERC20 public pairToken;         // Another token to pair with stBLX (e.g., USDC)
    
    // DeFi protocol contracts
    IBlumeSwapRouter public router;
    address public lpToken;          // stBLX-USDC LP token address
    
    // User position information
    struct UserPosition {
        uint256 lpTokenAmount;       // Amount of LP tokens
        uint256 stBLXProvided;       // Amount of stBLX provided for liquidity
        uint256 pairTokenProvided;   // Amount of pair token provided for liquidity
    }
    
    mapping(address => UserPosition) public userPositions;
    
    // Events
    event LiquidityAdded(address indexed user, uint256 stBLXAmount, uint256 pairTokenAmount, uint256 lpAmount);
    event LiquidityRemoved(address indexed user, uint256 stBLXAmount, uint256 pairTokenAmount, uint256 lpAmount);
    
    /**
     * @dev Constructor
     * @param _stBLXToken StakedBlumeToken (stBLX) address
     * @param _pairToken Token to pair with stBLX
     * @param _router BlumeSwap router address
     * @param _lpToken LP token address for stBLX-PairToken pair
     */
    constructor(
        address _stBLXToken,
        address _pairToken,
        address _router,
        address _lpToken
    ) {
        require(_stBLXToken != address(0), "Integration: Zero address");
        require(_pairToken != address(0), "Integration: Zero address");
        require(_router != address(0), "Integration: Zero address");
        require(_lpToken != address(0), "Integration: Zero address");
        
        stBLXToken = IStakedBlumeToken(_stBLXToken);
        pairToken = IERC20(_pairToken);
        router = IBlumeSwapRouter(_router);
        lpToken = _lpToken;
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }
    
    /**
     * @dev Add liquidity with stBLX and pair token
     * @param stBLXAmount Amount of stBLX to provide
     * @param pairTokenAmount Amount of pair token to provide
     * @param stBLXMin Minimum stBLX amount (slippage protection)
     * @param pairTokenMin Minimum pair token amount (slippage protection)
     */
    function addLiquidity(
        uint256 stBLXAmount,
        uint256 pairTokenAmount,
        uint256 stBLXMin,
        uint256 pairTokenMin
    ) external nonReentrant {
        require(stBLXAmount > 0 && pairTokenAmount > 0, "Integration: Zero amount");
        
        // Transfer tokens to this contract
        stBLXToken.transferFrom(msg.sender, address(this), stBLXAmount);
        pairToken.safeTransferFrom(msg.sender, address(this), pairTokenAmount);
        
        // Approve router to spend tokens
        stBLXToken.approve(address(router), stBLXAmount);
        pairToken.approve(address(router), pairTokenAmount);
        
        // Add liquidity
        (uint256 stBLXUsed, uint256 pairTokenUsed, uint256 lpReceived) = router.addLiquidity(
            address(stBLXToken),
            address(pairToken),
            stBLXAmount,
            pairTokenAmount,
            stBLXMin,
            pairTokenMin,
            address(this),
            block.timestamp + 1800 // 30 minutes deadline
        );
        
        // Update user position
        UserPosition storage position = userPositions[msg.sender];
        position.lpTokenAmount += lpReceived;
        position.stBLXProvided += stBLXUsed;
        position.pairTokenProvided += pairTokenUsed;
        
        // Refund any unused tokens
        if (stBLXAmount > stBLXUsed) {
            stBLXToken.transfer(msg.sender, stBLXAmount - stBLXUsed);
        }
        if (pairTokenAmount > pairTokenUsed) {
            pairToken.safeTransfer(msg.sender, pairTokenAmount - pairTokenUsed);
        }
        
        emit LiquidityAdded(msg.sender, stBLXUsed, pairTokenUsed, lpReceived);
    }
    
    /**
     * @dev Remove liquidity and withdraw stBLX and pair tokens
     * @param lpAmount Amount of LP tokens to burn
     * @param stBLXMin Minimum stBLX amount (slippage protection)
     * @param pairTokenMin Minimum pair token amount (slippage protection)
     */
    function removeLiquidity(
        uint256 lpAmount,
        uint256 stBLXMin,
        uint256 pairTokenMin
    ) external nonReentrant {
        require(lpAmount > 0, "Integration: Zero amount");
        
        UserPosition storage position = userPositions[msg.sender];
        require(position.lpTokenAmount >= lpAmount, "Integration: Insufficient LP tokens");
        
        // Calculate proportion of user's position to remove
        uint256 proportion = (lpAmount * 1e18) / position.lpTokenAmount;
        
        // Transfer LP tokens from user to this contract
        IERC20(lpToken).transferFrom(msg.sender, address(this), lpAmount);
        
        // Approve router to spend LP tokens
        IERC20(lpToken).approve(address(router), lpAmount);
        
        // Remove liquidity
        (uint256 stBLXReceived, uint256 pairTokenReceived) = router.removeLiquidity(
            address(stBLXToken),
            address(pairToken),
            lpAmount,
            stBLXMin,
            pairTokenMin,
            address(this),
            block.timestamp + 1800 // 30 minutes deadline
        );
        
        // Update user position
        position.lpTokenAmount -= lpAmount;
        position.stBLXProvided = position.stBLXProvided * (1e18 - proportion) / 1e18;
        position.pairTokenProvided = position.pairTokenProvided * (1e18 - proportion) / 1e18;
        
        // Transfer tokens to user
        stBLXToken.transfer(msg.sender, stBLXReceived);
        pairToken.safeTransfer(msg.sender, pairTokenReceived);
        
        emit LiquidityRemoved(msg.sender, stBLXReceived, pairTokenReceived, lpAmount);
    }
    
    /**
     * @dev Get user liquidity position
     * @param user User address
     * @return lpAmount LP token amount
     * @return stBLXAmount stBLX amount in the position
     * @return pairTokenAmount Pair token amount in the position
     * @return positionValue Total value of the position (in pair token units)
     */
    function getUserPosition(address user) external view returns (
        uint256 lpAmount,
        uint256 stBLXAmount,
        uint256 pairTokenAmount,
        uint256 positionValue
    ) {
        UserPosition memory position = userPositions[user];
        
        lpAmount = position.lpTokenAmount;
        
        if (lpAmount > 0) {
            // Get total LP supply
            uint256 totalLPSupply = IERC20(lpToken).totalSupply();
            
            if (totalLPSupply > 0) {
                // Get reserves
                IBlumeSwapPair pair = IBlumeSwapPair(lpToken);
                (uint256 reserve0, uint256 reserve1, ) = pair.getReserves();
                
                // Calculate token amounts based on LP share
                uint256 userShare = (lpAmount * 1e18) / totalLPSupply;
                
                // Determine which token is stBLX
                if (pair.token0() == address(stBLXToken)) {
                    stBLXAmount = (reserve0 * userShare) / 1e18;
                    pairTokenAmount = (reserve1 * userShare) / 1e18;
                } else {
                    stBLXAmount = (reserve1 * userShare) / 1e18;
                    pairTokenAmount = (reserve0 * userShare) / 1e18;
                }
                
                // Calculate position value (simplified)
                positionValue = pairTokenAmount * 2; // This is a placeholder - real implementation would use price data
            }
        }
    }
    
    /**
     * @dev Emergency withdraw function (in case of issues with the router)
     */
    function emergencyWithdraw() external nonReentrant onlyRole(DEFAULT_ADMIN_ROLE) {
        // Transfer all tokens to admin
        uint256 stBLXBalance = stBLXToken.balanceOf(address(this));
        if (stBLXBalance > 0) {
            stBLXToken.transfer(msg.sender, stBLXBalance);
        }
        
        uint256 pairTokenBalance = pairToken.balanceOf(address(this));
        if (pairTokenBalance > 0) {
            pairToken.safeTransfer(msg.sender, pairTokenBalance);
        }
        
        uint256 lpBalance = IERC20(lpToken).balanceOf(address(this));
        if (lpBalance > 0) {
            IERC20(lpToken).transfer(msg.sender, lpBalance);
        }
    }
}