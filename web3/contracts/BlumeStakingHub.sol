// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "./StakedBlumeToken.sol";

// Interface for BlumeToken to handle exclusion from limits
interface IBlumeToken is IERC20 {
    function setExcludedFromLimits(address account, bool excluded) external;
}

/**
 * @title BlumeStakingHub
 * @dev Liquid staking contract for BLX tokens
 */
contract BlumeStakingHub is ReentrancyGuard, AccessControl {
    using SafeERC20 for IERC20;
    
    // Roles
    bytes32 public constant PROTOCOL_ROLE = keccak256("PROTOCOL_ROLE");
    bytes32 public constant FEE_MANAGER_ROLE = keccak256("FEE_MANAGER_ROLE");
    
    // Tokens
    IERC20 public blxToken;
    StakedBlumeToken public stBLXToken;
    
    // Protocol parameters
    uint256 public exchangeRate;         // stBLX to BLX exchange rate (1e18 = 1:1)
    uint256 public totalStaked;          // Total BLX staked
    uint256 public rewardPool;           // Accumulated rewards
    uint256 public rewardRate;           // Annual reward rate (basis points)
    uint256 public lastRewardUpdate;     // Last time rewards were updated
    uint256 public protocolFee;          // Protocol fee (basis points)
    address public feeCollector;         // Address that collects protocol fees
    
    // Lock periods and multipliers
    struct LockTier {
        uint256 duration;            // Lock period in seconds
        uint256 rewardMultiplier;    // Reward multiplier (basis points, 10000 = 1x)
        uint256 earlyWithdrawalFee;  // Fee for early withdrawals (basis points)
    }
    
    LockTier[] public lockTiers;
    
    // User staking data
    struct StakeInfo {
        uint256 amount;              // Amount of BLX staked
        uint256 lockEnd;             // When lock period ends
        uint256 tierIndex;           // Index of the lock tier used
        uint256 lastClaimTime;       // Time of last reward claim
    }
    
    mapping(address => StakeInfo) public userStakes;
    
    // Events
    event Staked(address indexed user, uint256 blxAmount, uint256 stBLXAmount, uint256 lockPeriod);
    event Unstaked(address indexed user, uint256 stBLXAmount, uint256 blxAmount, uint256 penalty);
    event RewardAdded(uint256 amount);
    event RewardClaimed(address indexed user, uint256 amount);
    event ExchangeRateUpdated(uint256 newRate);
    event ProtocolFeeUpdated(uint256 newFee);
    event FeeCollectorUpdated(address newCollector);
    event LockTierAdded(uint256 duration, uint256 rewardMultiplier, uint256 earlyWithdrawalFee);
    
    /**
     * @dev Constructor
     * @param _blxToken BLX token address
     * @param _rewardRate Initial reward rate in basis points
     * @param _protocolFee Protocol fee in basis points
     * @param _feeCollector Address to collect protocol fees
     */
    constructor(
        address _blxToken,
        uint256 _rewardRate,
        uint256 _protocolFee,
        address _feeCollector
    ) {
        require(_blxToken != address(0), "BlumeStakingHub: Zero address");
        require(_feeCollector != address(0), "BlumeStakingHub: Zero address");
        require(_protocolFee <= 1000, "BlumeStakingHub: Fee too high"); // Max 10%
        
        blxToken = IERC20(_blxToken);
        rewardRate = _rewardRate;
        protocolFee = _protocolFee;
        feeCollector = _feeCollector;
        lastRewardUpdate = block.timestamp;
        
        // Deploy stBLX token
        stBLXToken = new StakedBlumeToken();
        // Grant minter role to this contract
        stBLXToken.grantRole(keccak256("MINTER_ROLE"), address(this));
        
        // Initialize exchange rate (1:1)
        exchangeRate = 1e18;
        
        // Initialize lock tiers
        // 30 days, 1.1x rewards, 10% early withdrawal fee
        lockTiers.push(LockTier(30 days, 11000, 1000));
        // 90 days, 1.3x rewards, 15% early withdrawal fee
        lockTiers.push(LockTier(90 days, 13000, 1500));
        // 180 days, 1.6x rewards, 20% early withdrawal fee
        lockTiers.push(LockTier(180 days, 16000, 2000));
        // 365 days, 2.0x rewards, 25% early withdrawal fee
        lockTiers.push(LockTier(365 days, 20000, 2500));
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(PROTOCOL_ROLE, msg.sender);
        _grantRole(FEE_MANAGER_ROLE, msg.sender);
        
        // Try to exclude this contract from token limits
        try IBlumeToken(address(blxToken)).setExcludedFromLimits(address(this), true) {} 
        catch {}
    }

    /**
     * @dev Public function to update exchange rate - useful for testing
     */
    function updateRewardsAndExchangeRate() external {
        _updateRewards();
    }
    
    /**
     * @dev Stake BLX tokens and receive stBLX tokens
     * @param amount Amount of BLX to stake
     * @param tierIndex Lock tier index to use
     */
    function stake(uint256 amount, uint256 tierIndex) external nonReentrant {
        require(amount > 0, "BlumeStakingHub: Zero amount");
        require(tierIndex < lockTiers.length, "BlumeStakingHub: Invalid tier");
        
        // Update rewards
        _updateRewards();
        
        // Calculate stBLX amount with overflow protection
        uint256 stBLXAmount;
        unchecked {
            stBLXAmount = (amount * 1e18) / exchangeRate;
        }
        require(stBLXAmount > 0, "Invalid stBLX amount");
        
        // Update user stake info
        StakeInfo storage userStake = userStakes[msg.sender];
        
        // If user already has a stake, claim pending rewards first
        if (userStake.amount > 0) {
            _claimRewards(msg.sender);
        }
        
        userStake.amount += amount;
        userStake.lockEnd = block.timestamp + lockTiers[tierIndex].duration;
        userStake.tierIndex = tierIndex;
        userStake.lastClaimTime = block.timestamp;
        
        // Update total staked
        totalStaked += amount;
        
        // Transfer BLX from user to this contract
        blxToken.safeTransferFrom(msg.sender, address(this), amount);
        
        // Mint stBLX to user
        stBLXToken.mint(msg.sender, stBLXAmount);
        
        emit Staked(msg.sender, amount, stBLXAmount, lockTiers[tierIndex].duration);
    }
    
    /**
     * @dev Unstake BLX by burning stBLX tokens
     * @param stBLXAmount Amount of stBLX to burn
     */
    function unstake(uint256 stBLXAmount) external nonReentrant {
        require(stBLXAmount > 0, "BlumeStakingHub: Zero amount");
        require(stBLXToken.balanceOf(msg.sender) >= stBLXAmount, "BlumeStakingHub: Insufficient balance");
        require(exchangeRate > 0, "Invalid exchange rate");
        
        // Update rewards
        _updateRewards();
        
        // Claim pending rewards first
        _claimRewards(msg.sender);
        
        // Calculate BLX amount with overflow protection
        uint256 blxAmount;
        unchecked {
            blxAmount = (stBLXAmount * exchangeRate) / 1e18;
        }
        require(blxAmount > 0, "Invalid BLX amount");
        
        StakeInfo storage userStake = userStakes[msg.sender];
        require(userStake.amount > 0, "BlumeStakingHub: No stake found");
        require(userStake.amount >= blxAmount, "BlumeStakingHub: Not enough staked");
        
        // Check if early withdrawal
        uint256 penalty = 0;
        if (block.timestamp < userStake.lockEnd) {
            uint256 penaltyRate = lockTiers[userStake.tierIndex].earlyWithdrawalFee;
            penalty = (blxAmount * penaltyRate) / 10000;
            
            // Transfer penalty to fee collector
            if (penalty > 0) {
                blxToken.safeTransfer(feeCollector, penalty);
            }
        }
        
        // Update user stake info
        uint256 blxToReturn = blxAmount - penalty;
        userStake.amount -= blxAmount;
        
        // If user unstaked everything, reset lock
        if (userStake.amount == 0) {
            userStake.lockEnd = 0;
            userStake.tierIndex = 0;
        }
        
        // Update total staked
        totalStaked -= blxAmount;
        
        // Burn stBLX tokens
        stBLXToken.burn(msg.sender, stBLXAmount);
        
        // Transfer BLX to user
        blxToken.safeTransfer(msg.sender, blxToReturn);
        
        emit Unstaked(msg.sender, stBLXAmount, blxToReturn, penalty);
    }
    
    /**
     * @dev Claim pending rewards
     */
    function claimRewards() external nonReentrant {
        _updateRewards();
        _claimRewards(msg.sender);
    }
    
    /**
     * @dev Internal function to claim rewards
     * @param user User address
     */
    function _claimRewards(address user) internal {
        StakeInfo storage userStake = userStakes[user];
        
        if (userStake.amount == 0) return;
        
        uint256 pendingReward = getPendingRewards(user);
        
        if (pendingReward > 0) {
            userStake.lastClaimTime = block.timestamp;
            
            // Calculate protocol fee
            uint256 fee = (pendingReward * protocolFee) / 10000;
            uint256 userReward = pendingReward - fee;
            
            // Transfer rewards to user
            blxToken.safeTransfer(user, userReward);
            
            // Transfer fee to fee collector
            if (fee > 0) {
                blxToken.safeTransfer(feeCollector, fee);
            }
            
            emit RewardClaimed(user, userReward);
        }
    }
    
    /**
     * @dev Get pending rewards for a user
     * @param user User address
     * @return Pending rewards
     */
    function getPendingRewards(address user) public view returns (uint256) {
        StakeInfo memory userStake = userStakes[user];
        
        if (userStake.amount == 0) return 0;
        
        uint256 timeElapsed = block.timestamp - userStake.lastClaimTime;
        uint256 multiplier = lockTiers[userStake.tierIndex].rewardMultiplier;
        
        // Calculate rewards with overflow protection
        uint256 rewards;
        unchecked {
            rewards = (userStake.amount * rewardRate * timeElapsed * multiplier) / (365 days * 10000 * 10000);
        }
        
        return rewards;
    }
    
    /**
     * @dev Add a new lock tier
     * @param duration Lock period in seconds
     * @param rewardMultiplier Reward multiplier in basis points
     * @param earlyWithdrawalFee Fee for early withdrawals in basis points
     */
    function addLockTier(
        uint256 duration,
        uint256 rewardMultiplier,
        uint256 earlyWithdrawalFee
    ) external onlyRole(PROTOCOL_ROLE) {
        require(duration > 0, "BlumeStakingHub: Zero duration");
        require(rewardMultiplier >= 10000, "BlumeStakingHub: Invalid multiplier");
        require(earlyWithdrawalFee <= 5000, "BlumeStakingHub: Fee too high"); // Max 50%
        
        lockTiers.push(LockTier(duration, rewardMultiplier, earlyWithdrawalFee));
        
        emit LockTierAdded(duration, rewardMultiplier, earlyWithdrawalFee);
    }
    
    /**
     * @dev Update protocol fee
     * @param newFee New protocol fee in basis points
     */
    function setProtocolFee(uint256 newFee) external onlyRole(FEE_MANAGER_ROLE) {
        require(newFee <= 1000, "BlumeStakingHub: Fee too high"); // Max 10%
        protocolFee = newFee;
        emit ProtocolFeeUpdated(newFee);
    }
    
    /**
     * @dev Update fee collector address
     * @param newCollector New fee collector address
     */
    function setFeeCollector(address newCollector) external onlyRole(FEE_MANAGER_ROLE) {
        require(newCollector != address(0), "BlumeStakingHub: Zero address");
        feeCollector = newCollector;
        emit FeeCollectorUpdated(newCollector);
    }
    
    /**
     * @dev Add rewards to the protocol
     * @param amount Amount of BLX to add as rewards
     */
    function addRewards(uint256 amount) external nonReentrant {
        require(amount > 0, "BlumeStakingHub: Zero amount");
        
        // Transfer BLX from caller to this contract
        blxToken.safeTransferFrom(msg.sender, address(this), amount);
        
        // Update reward pool
        rewardPool += amount;
        
        emit RewardAdded(amount);
    }
    
    /**
     * @dev Update rewards and exchange rate
     */
    function _updateRewards() internal {
        if (totalStaked == 0) {
            lastRewardUpdate = block.timestamp;
            return;
        }
        
        uint256 timeElapsed = block.timestamp - lastRewardUpdate;
        
        if (timeElapsed > 0) {
            // Calculate new rewards with overflow protection
            uint256 newRewards;
            unchecked {
                newRewards = (totalStaked * rewardRate * timeElapsed) / (365 days * 10000);
            }
            
            // Update exchange rate to reflect new rewards
            if (newRewards > 0 && stBLXToken.totalSupply() > 0) {
                uint256 newExchangeRate;
                unchecked {
                    newExchangeRate = ((totalStaked + newRewards) * 1e18) / stBLXToken.totalSupply();
                }
                require(newExchangeRate > 0, "Invalid exchange rate");
                exchangeRate = newExchangeRate;
                emit ExchangeRateUpdated(newExchangeRate);
            }
            
            // Update pool and timestamp
            rewardPool += newRewards;
            lastRewardUpdate = block.timestamp;
        }
    }
    
    /**
     * @dev Set reward rate
     * @param newRate New reward rate in basis points
     */
    function setRewardRate(uint256 newRate) external onlyRole(PROTOCOL_ROLE) {
        _updateRewards();
        rewardRate = newRate;
    }
    
    /**
     * @dev Get user staking details
     * @param user User address
     * @return amount Staked BLX amount
     * @return lockEnd Lock end timestamp
     * @return lockDuration Lock duration in seconds
     * @return multiplier Reward multiplier
     * @return rewards Pending rewards
     */
    function getUserStakingInfo(address user) external view returns (
        uint256 amount,
        uint256 lockEnd,
        uint256 lockDuration,
        uint256 multiplier,
        uint256 rewards
    ) {
        StakeInfo memory userStake = userStakes[user];
        
        amount = userStake.amount;
        lockEnd = userStake.lockEnd;
        
        if (userStake.tierIndex < lockTiers.length) {
            lockDuration = lockTiers[userStake.tierIndex].duration;
            multiplier = lockTiers[userStake.tierIndex].rewardMultiplier;
        }
        
        rewards = getPendingRewards(user);
    }
    
    /**
     * @dev Get conversion rate for BLX to stBLX
     * @param blxAmount Amount of BLX to convert
     * @return stBLXAmount Equivalent amount of stBLX tokens
     */
    function getStBLXForBLX(uint256 blxAmount) external view returns (uint256 stBLXAmount) {
        require(exchangeRate > 0, "Invalid exchange rate");
        return (blxAmount * 1e18) / exchangeRate;
    }
    
    /**
     * @dev Get conversion rate for stBLX to BLX
     * @param stBLXAmount Amount of stBLX to convert
     * @return blxAmount Equivalent amount of BLX tokens
     */
    function getBLXForStBLX(uint256 stBLXAmount) external view returns (uint256 blxAmount) {
        require(exchangeRate > 0, "Invalid exchange rate");
        return (stBLXAmount * exchangeRate) / 1e18;
    }
}