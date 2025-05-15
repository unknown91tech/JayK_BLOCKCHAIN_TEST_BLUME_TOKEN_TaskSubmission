// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

interface IBlumeVault {
    function deposit(uint256 amount, uint256 lockPeriod) external;
    function withdraw(uint256 amount) external;
    function compoundRewards() external;
    function calculatePendingRewards(address user) external view returns (uint256);
    function getEffectiveAPY(address user) external view returns (uint256);
    function getRemainingLockTime(address user) external view returns (uint256);
}

interface IBlumeToken {
    function mint(address to, uint256 amount) external;
    function balanceOf(address account) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
}

/**
 * @title BlumeVaultController
 * @dev Controller for Blume Vaults with auto-compounding and yield generation
 */
contract BlumeVaultController is ReentrancyGuard, AccessControl {
    using SafeERC20 for IERC20;

    // Roles
    bytes32 public constant VAULT_MANAGER_ROLE = keccak256("VAULT_MANAGER_ROLE");
    bytes32 public constant YIELD_GENERATOR_ROLE = keccak256("YIELD_GENERATOR_ROLE");
    bytes32 public constant KEEPER_ROLE = keccak256("KEEPER_ROLE");

    // Blume token
    IBlumeToken public blxToken;
    
    // Vaults
    struct VaultInfo {
        address vaultAddress;
        string name;
        string description;
        bool isActive;
        uint256 rewardRate;  // Annual reward rate in basis points
    }
    
    VaultInfo[] public vaults;
    mapping(address => uint256) public vaultIndex;  // Vault address to index mapping
    
    // Auto-compound tracking
    uint256 public autoCompoundFrequency; // Time between auto-compounds (in seconds)
    uint256 public lastGlobalCompoundTime; // Last time all vaults were auto-compounded
    
    // Yield tracking
    uint256 public totalYieldGenerated;
    
    // Events
    event VaultAdded(address indexed vault, string name);
    event VaultStatusUpdated(address indexed vault, bool isActive);
    event RewardsCompounded(address indexed vault, uint256 rewardAmount);
    event YieldGenerated(uint256 amount);
    event AutoCompoundExecuted(uint256 timestamp);
    
    /**
     * @dev Constructor
     * @param _blxToken Blume token address
     * @param _autoCompoundFrequency Initial auto-compound frequency
     */
    constructor(
        address _blxToken,
        uint256 _autoCompoundFrequency
    ) {
        require(_blxToken != address(0), "BlumeVaultController: Zero address");
        require(_autoCompoundFrequency > 0, "BlumeVaultController: Invalid frequency");
        
        blxToken = IBlumeToken(_blxToken);
        autoCompoundFrequency = _autoCompoundFrequency;
        lastGlobalCompoundTime = block.timestamp;
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(VAULT_MANAGER_ROLE, msg.sender);
        _grantRole(YIELD_GENERATOR_ROLE, msg.sender);
        _grantRole(KEEPER_ROLE, msg.sender);
    }
    
    /**
     * @dev Add a new vault
     * @param vaultAddress Vault contract address
     * @param name Vault name
     * @param description Vault description
     * @param rewardRate Annual reward rate in basis points
     */
    function addVault(
        address vaultAddress,
        string memory name,
        string memory description,
        uint256 rewardRate
    ) external onlyRole(VAULT_MANAGER_ROLE) {
        require(vaultAddress != address(0), "BlumeVaultController: Zero address");
        require(rewardRate > 0, "BlumeVaultController: Invalid reward rate");
        
        // Make sure vault isn't already added
        require(vaultIndex[vaultAddress] == 0, "BlumeVaultController: Vault already exists");
        
        // Add the vault
        vaults.push(VaultInfo({
            vaultAddress: vaultAddress,
            name: name,
            description: description,
            isActive: true,
            rewardRate: rewardRate
        }));
        
        // Map the vault address to its index (+1 to avoid zero value for first vault)
        vaultIndex[vaultAddress] = vaults.length;
        
        emit VaultAdded(vaultAddress, name);
    }
    
    /**
     * @dev Update a vault's status
     * @param vaultAddress Vault contract address
     * @param isActive New active status
     */
    function updateVaultStatus(
        address vaultAddress,
        bool isActive
    ) external onlyRole(VAULT_MANAGER_ROLE) {
        uint256 index = vaultIndex[vaultAddress];
        require(index > 0, "BlumeVaultController: Vault does not exist");
        
        // Update vault status
        vaults[index - 1].isActive = isActive;
        
        emit VaultStatusUpdated(vaultAddress, isActive);
    }
    
    /**
     * @dev Update a vault's reward rate
     * @param vaultAddress Vault contract address
     * @param newRewardRate New annual reward rate in basis points
     */
    function updateVaultRewardRate(
        address vaultAddress,
        uint256 newRewardRate
    ) external onlyRole(VAULT_MANAGER_ROLE) {
        require(newRewardRate > 0, "BlumeVaultController: Invalid reward rate");
        
        uint256 index = vaultIndex[vaultAddress];
        require(index > 0, "BlumeVaultController: Vault does not exist");
        
        // Update vault reward rate
        vaults[index - 1].rewardRate = newRewardRate;
    }
    
    /**
     * @dev Execute auto-compound for all active vaults
     * Can be called by anyone with KEEPER_ROLE
     */
    function executeAutoCompound() external onlyRole(KEEPER_ROLE) nonReentrant {
        require(
            block.timestamp >= lastGlobalCompoundTime + autoCompoundFrequency,
            "BlumeVaultController: Too early to compound"
        );
        
        // Iterate through all active vaults
        for (uint256 i = 0; i < vaults.length; i++) {
            VaultInfo memory vaultInfo = vaults[i];
            
            if (vaultInfo.isActive) {
                // Compound rewards for the vault
                IBlumeVault vault = IBlumeVault(vaultInfo.vaultAddress);
                vault.compoundRewards();
                
                // Generate additional yield based on vault's reward rate
                _generateYield(vaultInfo.vaultAddress, vaultInfo.rewardRate);
            }
        }
        
        // Update last global compound time
        lastGlobalCompoundTime = block.timestamp;
        
        emit AutoCompoundExecuted(block.timestamp);
    }
    
    /**
     * @dev Generate yield for a specific vault
     * @param vaultAddress Vault address
     */
    function generateYield(address vaultAddress) external onlyRole(YIELD_GENERATOR_ROLE) nonReentrant {
        uint256 index = vaultIndex[vaultAddress];
        require(index > 0, "BlumeVaultController: Vault does not exist");
        require(vaults[index - 1].isActive, "BlumeVaultController: Vault is not active");
        
        // Generate yield based on vault's reward rate
        _generateYield(vaultAddress, vaults[index - 1].rewardRate);
    }
    
    /**
     * @dev Internal function to generate yield
     * @param vaultAddress Vault address
     * @param rewardRate Annual reward rate in basis points
     */
    function _generateYield(address vaultAddress, uint256 rewardRate) internal {
        // Get the BLX balance in the vault
        uint256 vaultBalance = blxToken.balanceOf(vaultAddress);
        
        if (vaultBalance > 0) {
            // Calculate yield: (balance * rate * timeSinceLastCompound) / (365 days * 10000)
            uint256 timeElapsed = block.timestamp - lastGlobalCompoundTime;
            uint256 yieldAmount = (vaultBalance * rewardRate * timeElapsed) / (365 days * 10000);
            
            if (yieldAmount > 0) {
                // Mint yield to the vault
                blxToken.mint(vaultAddress, yieldAmount);
                
                // Update total yield generated
                totalYieldGenerated += yieldAmount;
                
                emit YieldGenerated(yieldAmount);
            }
        }
    }
    
    /**
     * @dev Update the auto-compound frequency
     * @param newFrequency New frequency in seconds
     */
    function updateAutoCompoundFrequency(uint256 newFrequency) external onlyRole(VAULT_MANAGER_ROLE) {
        require(newFrequency > 0, "BlumeVaultController: Invalid frequency");
        autoCompoundFrequency = newFrequency;
    }
    
    /**
     * @dev Get all vaults
     * @return Array of vault info
     */
    function getAllVaults() external view returns (VaultInfo[] memory) {
        return vaults;
    }
    
    /**
     * @dev Get only active vaults
     * @return Array of active vault info
     */
    function getActiveVaults() external view returns (VaultInfo[] memory) {
        // Count active vaults
        uint256 activeCount = 0;
        for (uint256 i = 0; i < vaults.length; i++) {
            if (vaults[i].isActive) {
                activeCount++;
            }
        }
        
        // Create result array
        VaultInfo[] memory activeVaults = new VaultInfo[](activeCount);
        
        // Fill result array
        uint256 index = 0;
        for (uint256 i = 0; i < vaults.length; i++) {
            if (vaults[i].isActive) {
                activeVaults[index] = vaults[i];
                index++;
            }
        }
        
        return activeVaults;
    }
    
    /**
     * @dev Get time remaining until next auto-compound
     * @return Time in seconds until next auto-compound
     */
    function timeUntilNextAutoCompound() external view returns (uint256) {
        uint256 nextCompoundTime = lastGlobalCompoundTime + autoCompoundFrequency;
        
        if (block.timestamp >= nextCompoundTime) {
            return 0;
        }
        
        return nextCompoundTime - block.timestamp;
    }
    
    /**
     * @dev Get vault details
     * @param vaultAddress Vault address
     * @return name Vault name
     * @return description Vault description
     * @return isActive Vault active status
     * @return rewardRate Vault reward rate
     * @return tvl Total value locked in the vault
     */
    function getVaultDetails(address vaultAddress) external view returns (
        string memory name,
        string memory description,
        bool isActive,
        uint256 rewardRate,
        uint256 tvl
    ) {
        uint256 index = vaultIndex[vaultAddress];
        require(index > 0, "BlumeVaultController: Vault does not exist");
        
        VaultInfo memory vaultInfo = vaults[index - 1];
        
        name = vaultInfo.name;
        description = vaultInfo.description;
        isActive = vaultInfo.isActive;
        rewardRate = vaultInfo.rewardRate;
        tvl = blxToken.balanceOf(vaultAddress);
    }
}