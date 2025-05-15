// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IBlumeVault {
    function deposit(uint256 amount, uint256 lockPeriod) external;
    function withdraw(uint256 amount) external;
    function compoundRewards() external;
    function calculatePendingRewards(address user) external view returns (uint256);
    function getEffectiveAPY(address user) external view returns (uint256);
}

interface IBlumeSwapRouter {
    function addLiquidityETH(
        address token,
        uint256 amountTokenDesired,
        uint256 amountTokenMin,
        uint256 amountETHMin,
        address to,
        uint256 deadline
    ) external payable returns (uint256 amountToken, uint256 amountETH, uint256 liquidity);
    
    function removeLiquidityETH(
        address token,
        uint256 liquidity,
        uint256 amountTokenMin,
        uint256 amountETHMin,
        address to,
        uint256 deadline
    ) external returns (uint256 amountToken, uint256 amountETH);
}

interface IBlumeSwapPair {
    function token0() external view returns (address);
    function token1() external view returns (address);
    function getReserves() external view returns (uint256 reserve0, uint256 reserve1, uint32 blockTimestampLast);
    function balanceOf(address owner) external view returns (uint256);
}

/**
 * @title BlumeYieldFarmer
 * @dev Contract for automated yield farming and liquidity provisioning
 */
contract BlumeYieldFarmer is ReentrancyGuard, AccessControl {
    using SafeERC20 for IERC20;

    // Roles
    bytes32 public constant STRATEGY_MANAGER_ROLE = keccak256("STRATEGY_MANAGER_ROLE");
    bytes32 public constant HARVESTER_ROLE = keccak256("HARVESTER_ROLE");
    
    // Contracts
    IERC20 public blxToken;
    IBlumeVault public vault;
    IBlumeSwapRouter public router;
    IBlumeSwapPair public lpToken;
    address public immutable WETH;
    
    // Strategy parameters
    uint256 public vaultAllocation;   // Percentage allocated to vault (basis points)
    uint256 public lpAllocation;      // Percentage allocated to liquidity pool (basis points)
    uint256 public lockPeriod;        // Lock period for vault deposits
    uint256 public harvestInterval;   // Time between harvests
    uint256 public lastHarvestTime;   // Last harvest timestamp
    uint256 public slippageTolerance; // Slippage tolerance for swap/add liquidity (basis points)
    
    // User positions
    struct UserPosition {
        uint256 totalDeposited;       // Total BLX deposited by user
        uint256 vaultAmount;          // Amount in vault
        uint256 lpAmount;             // LP tokens amount
        uint256 lastHarvestShare;     // Share of last harvest
    }
    
    mapping(address => UserPosition) public userPositions;
    uint256 public totalDeposited;    // Total BLX tokens managed by this contract
    
    // Events
    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event Harvested(uint256 totalRewards);
    event StrategyUpdated(uint256 vaultAllocation, uint256 lpAllocation, uint256 lockPeriod);
    
    /**
     * @dev Constructor
     * @param _blxToken BLX token address
     * @param _vault Vault contract address
     * @param _router BlumeSwap router address
     * @param _lpToken BLX-ETH LP token address
     * @param _weth WETH address
     */
    constructor(
        address _blxToken,
        address _vault,
        address _router,
        address _lpToken,
        address _weth
    ) {
        require(_blxToken != address(0), "BlumeYieldFarmer: Zero address");
        require(_vault != address(0), "BlumeYieldFarmer: Zero address");
        require(_router != address(0), "BlumeYieldFarmer: Zero address");
        require(_lpToken != address(0), "BlumeYieldFarmer: Zero address");
        require(_weth != address(0), "BlumeYieldFarmer: Zero address");
        
        blxToken = IERC20(_blxToken);
        vault = IBlumeVault(_vault);
        router = IBlumeSwapRouter(_router);
        lpToken = IBlumeSwapPair(_lpToken);
        WETH = _weth;
        
        // Default strategy params
        vaultAllocation = 7000;       // 70% to vault
        lpAllocation = 3000;          // 30% to LP
        lockPeriod = 90 days;         // 90-day lock
        harvestInterval = 1 days;     // Daily harvests
        slippageTolerance = 300;      // 3% slippage tolerance
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(STRATEGY_MANAGER_ROLE, msg.sender);
        _grantRole(HARVESTER_ROLE, msg.sender);
    }
    
    /**
     * @dev Deposit BLX tokens for yield farming
     * @param amount Amount of BLX to deposit
     */
    function deposit(uint256 amount) external nonReentrant {
        require(amount > 0, "BlumeYieldFarmer: Zero deposit");
        
        UserPosition storage position = userPositions[msg.sender];
        
        // Transfer BLX from user to this contract
        blxToken.safeTransferFrom(msg.sender, address(this), amount);
        
        // Update user position
        position.totalDeposited += amount;
        totalDeposited += amount;
        
        // Allocate funds according to strategy
        _allocateFunds(amount, position);
        
        emit Deposited(msg.sender, amount);
    }
    
    /**
     * @dev Withdraw BLX tokens from yield farming
     * @param amount Amount of BLX to withdraw
     */
    function withdraw(uint256 amount) external nonReentrant {
        UserPosition storage position = userPositions[msg.sender];
        require(amount > 0, "BlumeYieldFarmer: Zero withdrawal");
        require(amount <= position.totalDeposited, "BlumeYieldFarmer: Insufficient balance");
        
        // Calculate proportional amounts to withdraw from each strategy
        uint256 vaultWithdrawAmount = (amount * position.vaultAmount) / position.totalDeposited;
        uint256 lpWithdrawAmount = amount - vaultWithdrawAmount;
        
        // Update user position
        position.totalDeposited -= amount;
        position.vaultAmount -= vaultWithdrawAmount;
        
        totalDeposited -= amount;
        
        // Withdraw from vault
        if (vaultWithdrawAmount > 0) {
            vault.withdraw(vaultWithdrawAmount);
        }
        
        // Withdraw from LP if needed
        if (lpWithdrawAmount > 0) {
            _withdrawFromLP(lpWithdrawAmount, position);
        }
        
        // Transfer BLX to user
        blxToken.safeTransfer(msg.sender, amount);
        
        emit Withdrawn(msg.sender, amount);
    }
    
    /**
     * @dev Harvest yields and rebalance
     * Can only be called by accounts with HARVESTER_ROLE
     */
    function harvest() external onlyRole(HARVESTER_ROLE) nonReentrant {
        require(
            block.timestamp >= lastHarvestTime + harvestInterval,
            "BlumeYieldFarmer: Too early to harvest"
        );
        
        uint256 initialBalance = blxToken.balanceOf(address(this));
        
        // Compound vault rewards
        vault.compoundRewards();
        
        // Claim any pending rewards from LP
        // (This would be implemented based on LP reward mechanisms)
        
        uint256 finalBalance = blxToken.balanceOf(address(this));
        uint256 harvestedRewards = finalBalance - initialBalance;
        
        lastHarvestTime = block.timestamp;
        
        emit Harvested(harvestedRewards);
        
        // Rebalance if needed
        if (harvestedRewards > 0) {
            _rebalance();
        }
    }
    
    /**
     * @dev Get user position details
     * @param user User address
     * @return totalDeposited Total deposited amount
     * @return vaultAmount Amount in vault
     * @return lpAmount LP tokens amount
     * @return pendingRewards Pending rewards
     * @return effectiveAPY Effective APY (basis points)
     */
    function getUserPosition(address user) external view returns (
        uint256 totalDeposited,
        uint256 vaultAmount,
        uint256 lpAmount,
        uint256 pendingRewards,
        uint256 effectiveAPY
    ) {
        UserPosition memory position = userPositions[user];
        
        totalDeposited = position.totalDeposited;
        vaultAmount = position.vaultAmount;
        lpAmount = position.lpAmount;
        
        // Get pending rewards from vault
        uint256 vaultRewards = vault.calculatePendingRewards(address(this));
        
        // Calculate user's share of vault rewards
        uint256 userVaultRewards = 0;
        if (totalDeposited > 0) {
            userVaultRewards = (vaultRewards * position.vaultAmount) / totalDeposited;
        }
        
        // Add LP rewards (would be implemented based on LP reward mechanism)
        uint256 lpRewards = 0; // Placeholder
        
        pendingRewards = userVaultRewards + lpRewards;
        
        // Calculate effective APY
        // Weighted average of vault APY and LP APY
        uint256 vaultAPY = vault.getEffectiveAPY(address(this));
        uint256 lpAPY = 0; // Placeholder - would need to calculate LP APY
        
        if (position.totalDeposited > 0) {
            effectiveAPY = (
                (vaultAPY * position.vaultAmount) +
                (lpAPY * (position.totalDeposited - position.vaultAmount))
            ) / position.totalDeposited;
        }
    }
    
    /**
     * @dev Update strategy parameters
     * Can only be called by accounts with STRATEGY_MANAGER_ROLE
     */
    function updateStrategy(
        uint256 _vaultAllocation,
        uint256 _lpAllocation,
        uint256 _lockPeriod,
        uint256 _harvestInterval,
        uint256 _slippageTolerance
    ) external onlyRole(STRATEGY_MANAGER_ROLE) {
        require(_vaultAllocation + _lpAllocation == 10000, "BlumeYieldFarmer: Allocations must sum to 10000");
        require(_slippageTolerance <= 1000, "BlumeYieldFarmer: Slippage too high");
        
        vaultAllocation = _vaultAllocation;
        lpAllocation = _lpAllocation;
        lockPeriod = _lockPeriod;
        harvestInterval = _harvestInterval;
        slippageTolerance = _slippageTolerance;
        
        emit StrategyUpdated(_vaultAllocation, _lpAllocation, _lockPeriod);
        
        // Rebalance portfolios based on new strategy
        _rebalance();
    }
    
    /**
     * @dev Internal function to allocate funds according to strategy
     * @param amount Amount to allocate
     * @param position User position
     */
    function _allocateFunds(uint256 amount, UserPosition storage position) internal {
        // Calculate amount for vault
        uint256 vaultAmount = (amount * vaultAllocation) / 10000;
        
        // Calculate amount for LP
        uint256 lpAmount = amount - vaultAmount;
        
        // Update user position
        position.vaultAmount += vaultAmount;
        
        // Deposit to vault
        if (vaultAmount > 0) {
            blxToken.approve(address(vault), vaultAmount);
            vault.deposit(vaultAmount, lockPeriod);
        }
        
        // Add liquidity to LP pool
        if (lpAmount > 0) {
            _addLiquidity(lpAmount, position);
        }
    }
    
    /**
     * @dev Internal function to add liquidity
     * @param amount Amount of BLX to add as liquidity
     * @param position User position
     */
    function _addLiquidity(uint256 amount, UserPosition storage position) internal {
        if (amount == 0) return;
        
        // Calculate ETH amount needed based on current LP ratio
        uint256 ethAmount = _calculateEthForLiquidity(amount);
        if (ethAmount == 0) return;
        
        // Approve router to spend BLX
        blxToken.approve(address(router), amount);
        
        // Add liquidity (assuming ETH is sent with function call)
        // Calculate minimum amounts with slippage
        uint256 minTokenAmount = amount * (10000 - slippageTolerance) / 10000;
        uint256 minEthAmount = ethAmount * (10000 - slippageTolerance) / 10000;
        
        // Add liquidity
        (, , uint256 lpReceived) = router.addLiquidityETH{value: ethAmount}(
            address(blxToken),
            amount,
            minTokenAmount,
            minEthAmount,
            address(this),
            block.timestamp + 3600 // 1 hour deadline
        );
        
        // Update LP amount in user position
        position.lpAmount += lpReceived;
    }
    
    /**
     * @dev Calculate ETH amount needed for liquidity
     * @param blxAmount Amount of BLX tokens
     * @return ETH amount needed
     */
    function _calculateEthForLiquidity(uint256 blxAmount) internal view returns (uint256) {
        (uint256 reserve0, uint256 reserve1, ) = lpToken.getReserves();
        
        // Determine which token is BLX and which is ETH
        address token0 = lpToken.token0();
        
        if (address(blxToken) == token0) {
            return (blxAmount * reserve1) / reserve0;
        } else {
            return (blxAmount * reserve0) / reserve1;
        }
    }
    
    /**
     * @dev Internal function to withdraw from LP
     * @param amount Amount of BLX to withdraw
     * @param position User position
     */
    function _withdrawFromLP(uint256 amount, UserPosition storage position) internal {
        if (amount == 0 || position.lpAmount == 0) return;
        
        // Calculate LP tokens to burn based on the BLX amount to withdraw
        uint256 lpToBurn = (position.lpAmount * amount) / (position.totalDeposited - position.vaultAmount);
        
        // Approve router to spend LP tokens
        IERC20(address(lpToken)).approve(address(router), lpToBurn);
        
        // Remove liquidity
        router.removeLiquidityETH(
            address(blxToken),
            lpToBurn,
            0, // Min BLX amount (will be handled later)
            0, // Min ETH amount
            address(this),
            block.timestamp + 3600 // 1 hour deadline
        );
        
        // Update LP amount in user position
        position.lpAmount -= lpToBurn;
    }
    
    /**
     * @dev Internal function to rebalance the portfolio
     */
    function _rebalance() internal {
        uint256 currentBalance = blxToken.balanceOf(address(this));
        if (currentBalance == 0) return;
        
        // Allocate newly harvested rewards according to strategy
        uint256 vaultAmount = (currentBalance * vaultAllocation) / 10000;
        uint256 lpAmount = currentBalance - vaultAmount;
        
        // Deposit to vault
        if (vaultAmount > 0) {
            blxToken.approve(address(vault), vaultAmount);
            vault.deposit(vaultAmount, lockPeriod);
        }
        
        // Add liquidity
        if (lpAmount > 0) {
            // This is a placeholder - in a real implementation, we would need to
            // calculate which user positions to update with the new LP tokens
            UserPosition storage dummyPosition = userPositions[address(this)];
            _addLiquidity(lpAmount, dummyPosition);
        }
    }
    
    /**
     * @dev To receive ETH when removing liquidity
     */
    receive() external payable {}
}