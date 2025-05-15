// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

contract BlumeVault is ReentrancyGuard, AccessControl {
    using SafeERC20 for IERC20;

    // Roles
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");
    bytes32 public constant YIELD_GENERATOR_ROLE = keccak256("YIELD_GENERATOR_ROLE");

    // State variables
    IERC20 public blxToken;             // The BLX token contract
    uint256 public totalDeposited;       // Total BLX tokens in the vault
    uint256 public yieldRate;            // Annual yield rate in basis points (10000 = 100%)
    uint256 public compoundFrequency;    // Number of seconds between compounding events
    uint256 public lastCompoundTimestamp; // Timestamp of the last compounding

    // User deposit information
    struct UserDeposit {
        uint256 amount;             // Amount of BLX tokens deposited
        uint256 lockEndTimestamp;   // When the lock period ends (0 if no lock)
        uint256 rewardDebt;         // Redeemed rewards tracking
        uint256 lastCompoundTime;   // Last compound time for this user
        uint256 depositTimestamp;   // When the deposit was made
    }

    mapping(address => UserDeposit) public userDeposits;

    uint256 public constant NO_LOCK = 0;
    uint256 public constant LOCK_30_DAYS = 30 days;
    uint256 public constant LOCK_90_DAYS = 90 days;
    uint256 public constant LOCK_180_DAYS = 180 days;
    uint256 public constant LOCK_365_DAYS = 365 days;
    mapping(uint256 => uint256) public lockBonusMultiplier;
    event Deposited(address indexed user, uint256 amount, uint256 lockPeriod);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardsCompounded(address indexed user, uint256 reward);
    event YieldRateUpdated(uint256 newYieldRate);
    event CompoundFrequencyUpdated(uint256 newFrequency);
    event GlobalCompoundExecuted(uint256 timestamp);
    
    constructor(
        address _blxToken, 
        uint256 _yieldRate,
        uint256 _compoundFrequency
    ) {
        require(_blxToken != address(0), "BlumeVault: Zero address");
        require(_yieldRate > 0, "BlumeVault: Invalid yield rate");
        require(_compoundFrequency > 0, "BlumeVault: Invalid compound frequency");

        blxToken = IERC20(_blxToken);
        yieldRate = _yieldRate;
        compoundFrequency = _compoundFrequency;
        lastCompoundTimestamp = block.timestamp;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MANAGER_ROLE, msg.sender);
        _grantRole(YIELD_GENERATOR_ROLE, msg.sender);

        // Initialize lock period bonus multipliers
        lockBonusMultiplier[NO_LOCK] = 10000;         // 1.0x multiplier (base rate)
        lockBonusMultiplier[LOCK_30_DAYS] = 11000;    // 1.1x multiplier (+10%)
        lockBonusMultiplier[LOCK_90_DAYS] = 12500;    // 1.25x multiplier (+25%)
        lockBonusMultiplier[LOCK_180_DAYS] = 15000;   // 1.5x multiplier (+50%)
        lockBonusMultiplier[LOCK_365_DAYS] = 20000;   // 2.0x multiplier (+100%)
    }

    function deposit(uint256 amount, uint256 lockPeriod) external nonReentrant {
        require(amount > 0, "BlumeVault: Zero amount");
        require(
            lockPeriod == NO_LOCK || 
            lockPeriod == LOCK_30_DAYS || 
            lockPeriod == LOCK_90_DAYS || 
            lockPeriod == LOCK_180_DAYS || 
            lockPeriod == LOCK_365_DAYS, 
            "BlumeVault: Invalid lock period"
        );

        UserDeposit storage userDeposit = userDeposits[msg.sender];
        
        // If user already has a deposit, compound pending rewards first
        if (userDeposit.amount > 0) {
            _compoundRewards(msg.sender);
        }

        // Update user deposit info
        userDeposit.amount += amount;
        
        // Only update lock end time if the new lock would extend beyond the current lock
        uint256 newLockEnd = block.timestamp + lockPeriod;
        if (newLockEnd > userDeposit.lockEndTimestamp) {
            userDeposit.lockEndTimestamp = newLockEnd;
        }
        
        if (userDeposit.depositTimestamp == 0) {
            userDeposit.depositTimestamp = block.timestamp;
        }
        
        userDeposit.lastCompoundTime = block.timestamp;

        // Update total deposited amount
        totalDeposited += amount;

        // Transfer BLX tokens from user to vault
        blxToken.safeTransferFrom(msg.sender, address(this), amount);

        emit Deposited(msg.sender, amount, lockPeriod);
    }

    function withdraw(uint256 amount) external nonReentrant {
        UserDeposit storage userDeposit = userDeposits[msg.sender];
        
        require(userDeposit.amount >= amount, "BlumeVault: Insufficient balance");
        require(
            block.timestamp >= userDeposit.lockEndTimestamp, 
            "BlumeVault: Funds locked"
        );

        // Compound rewards before withdrawal
        _compoundRewards(msg.sender);

        // Update user deposit info
        userDeposit.amount -= amount;
        
        // If user is withdrawing all funds, reset their lock
        if (userDeposit.amount == 0) {
            userDeposit.lockEndTimestamp = 0;
            userDeposit.depositTimestamp = 0;
        }

        // Update total deposited amount
        totalDeposited -= amount;

        // Transfer BLX tokens from vault to user
        blxToken.safeTransfer(msg.sender, amount);

        emit Withdrawn(msg.sender, amount);
    }

    function compoundRewards() external nonReentrant {
        _compoundRewards(msg.sender);
    }

    function _compoundRewards(address user) internal {
        UserDeposit storage userDeposit = userDeposits[user];
        
        if (userDeposit.amount == 0) return;

        // Calculate pending rewards
        uint256 pendingRewards = calculatePendingRewards(user);
        
        if (pendingRewards > 0) {
            // Update user deposit info
            userDeposit.amount += pendingRewards;
            userDeposit.lastCompoundTime = block.timestamp;
            
            // Update total deposited amount
            totalDeposited += pendingRewards;
            
            emit RewardsCompounded(user, pendingRewards);
        }
    }

    function calculatePendingRewards(address user) public view returns (uint256) {
        UserDeposit memory userDeposit = userDeposits[user];
        
        if (userDeposit.amount == 0) return 0;

        uint256 timeElapsed = block.timestamp - userDeposit.lastCompoundTime;
        
        // Determine which lock bonus multiplier to use
        uint256 multiplier = lockBonusMultiplier[NO_LOCK]; // Default to no lock
        
        if (userDeposit.lockEndTimestamp > 0) {
            uint256 totalLockDuration = userDeposit.lockEndTimestamp - userDeposit.depositTimestamp;
            
            if (totalLockDuration >= LOCK_365_DAYS) {
                multiplier = lockBonusMultiplier[LOCK_365_DAYS];
            } else if (totalLockDuration >= LOCK_180_DAYS) {
                multiplier = lockBonusMultiplier[LOCK_180_DAYS];
            } else if (totalLockDuration >= LOCK_90_DAYS) {
                multiplier = lockBonusMultiplier[LOCK_90_DAYS];
            } else if (totalLockDuration >= LOCK_30_DAYS) {
                multiplier = lockBonusMultiplier[LOCK_30_DAYS];
            }
        }
        
        // Calculate rewards with the adjusted yield rate (including lock bonus)
        uint256 adjustedYieldRate = (yieldRate * multiplier) / 10000;
        
        // Calculate rewards based on time elapsed and adjusted yield rate
        // yieldRate is annual (365 days), so we divide by 365 days in seconds
        uint256 reward = (userDeposit.amount * adjustedYieldRate * timeElapsed) / (365 days * 10000);
        
        return reward;
    }

    function executeGlobalCompound() external onlyRole(YIELD_GENERATOR_ROLE) nonReentrant {
        require(
            block.timestamp >= lastCompoundTimestamp + compoundFrequency,
            "BlumeVault: Too early to compound"
        );

        // Mint new BLX tokens to the vault based on the yield rate
        uint256 rewardAmount = (totalDeposited * yieldRate * compoundFrequency) / (365 days * 10000);
        
        if (rewardAmount > 0) {
            lastCompoundTimestamp = block.timestamp;
            emit GlobalCompoundExecuted(block.timestamp);
        }
    }

    function setYieldRate(uint256 newYieldRate) external onlyRole(MANAGER_ROLE) {
        require(newYieldRate > 0, "BlumeVault: Invalid yield rate");
        yieldRate = newYieldRate;
        emit YieldRateUpdated(newYieldRate);
    }
    function setCompoundFrequency(uint256 newFrequency) external onlyRole(MANAGER_ROLE) {
        require(newFrequency > 0, "BlumeVault: Invalid compound frequency");
        compoundFrequency = newFrequency;
        emit CompoundFrequencyUpdated(newFrequency);
    }

    function setLockBonusMultiplier(uint256 lockPeriod, uint256 multiplier) external onlyRole(MANAGER_ROLE) {
        require(multiplier >= 10000, "BlumeVault: Multiplier must be at least 10000");
        require(
            lockPeriod == NO_LOCK || 
            lockPeriod == LOCK_30_DAYS || 
            lockPeriod == LOCK_90_DAYS || 
            lockPeriod == LOCK_180_DAYS || 
            lockPeriod == LOCK_365_DAYS, 
            "BlumeVault: Invalid lock period"
        );
        
        lockBonusMultiplier[lockPeriod] = multiplier;
    }

    function getRemainingLockTime(address user) external view returns (uint256) {
        UserDeposit memory userDeposit = userDeposits[user];
        
        if (userDeposit.lockEndTimestamp <= block.timestamp) {
            return 0;
        }
        
        return userDeposit.lockEndTimestamp - block.timestamp;
    }

    function getEffectiveAPY(address user) external view returns (uint256) {
        UserDeposit memory userDeposit = userDeposits[user];
        
        uint256 multiplier = lockBonusMultiplier[NO_LOCK]; // Default to no lock
        
        if (userDeposit.lockEndTimestamp > block.timestamp) {
            uint256 totalLockDuration = userDeposit.lockEndTimestamp - userDeposit.depositTimestamp;
            
            if (totalLockDuration >= LOCK_365_DAYS) {
                multiplier = lockBonusMultiplier[LOCK_365_DAYS];
            } else if (totalLockDuration >= LOCK_180_DAYS) {
                multiplier = lockBonusMultiplier[LOCK_180_DAYS];
            } else if (totalLockDuration >= LOCK_90_DAYS) {
                multiplier = lockBonusMultiplier[LOCK_90_DAYS];
            } else if (totalLockDuration >= LOCK_30_DAYS) {
                multiplier = lockBonusMultiplier[LOCK_30_DAYS];
            }
        }
        
        return (yieldRate * multiplier) / 10000;
    }

    function getTotalValueLocked() external view returns (uint256) {
        return totalDeposited;
    }
}
