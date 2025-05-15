// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./BlumeStakingHub.sol";

/**
 * @title BlumeStakingHubFactory
 * @dev Factory for deploying and managing BlumeStakingHub contracts
 */
contract BlumeStakingHubFactory is AccessControl {
    // Roles
    bytes32 public constant DEPLOYER_ROLE = keccak256("DEPLOYER_ROLE");
    
    // Track deployed hubs
    struct HubInfo {
        address hubAddress;
        string name;
        string description;
        bool isActive;
    }
    
    HubInfo[] public stakingHubs;
    mapping(address => uint256) public hubIndex; // hub address to index mapping
    
    // Events
    event HubDeployed(address indexed hub, string name, address blxToken);
    event HubStatusUpdated(address indexed hub, bool isActive);
    
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(DEPLOYER_ROLE, msg.sender);
    }
    
    /**
     * @dev Deploy a new BlumeStakingHub
     * @param blxToken BLX token address
     * @param rewardRate Initial reward rate
     * @param protocolFee Protocol fee
     * @param feeCollector Address to collect fees
     * @param name Name of the staking hub
     * @param description Description of the staking hub
     * @return hubAddress Address of the deployed hub
     */
    function deployStakingHub(
        address blxToken,
        uint256 rewardRate,
        uint256 protocolFee,
        address feeCollector,
        string memory name,
        string memory description
    ) external onlyRole(DEPLOYER_ROLE) returns (address hubAddress) {
        // Deploy new staking hub
        BlumeStakingHub hub = new BlumeStakingHub(
            blxToken,
            rewardRate,
            protocolFee,
            feeCollector
        );
        
        // Grant roles to the factory owner
        hub.grantRole(hub.DEFAULT_ADMIN_ROLE(), msg.sender);
        hub.grantRole(hub.PROTOCOL_ROLE(), msg.sender);
        hub.grantRole(hub.FEE_MANAGER_ROLE(), msg.sender);
        
        // Register the hub
        hubAddress = address(hub);
        stakingHubs.push(HubInfo({
            hubAddress: hubAddress,
            name: name,
            description: description,
            isActive: true
        }));
        
        // Map the hub address to its index (+1 to avoid zero value for first hub)
        hubIndex[hubAddress] = stakingHubs.length;
        
        emit HubDeployed(hubAddress, name, blxToken);
    }
    
    /**
     * @dev Update a staking hub's status
     * @param hubAddress Staking hub address
     * @param isActive New active status
     */
    function updateHubStatus(
        address hubAddress,
        bool isActive
    ) external onlyRole(DEPLOYER_ROLE) {
        uint256 index = hubIndex[hubAddress];
        require(index > 0, "BlumeStakingHubFactory: Hub not found");
        
        // Update hub status
        stakingHubs[index - 1].isActive = isActive;
        
        emit HubStatusUpdated(hubAddress, isActive);
    }
    
    /**
     * @dev Get all staking hubs
     * @return Array of staking hub info
     */
    function getAllStakingHubs() external view returns (HubInfo[] memory) {
        return stakingHubs;
    }
    
    /**
     * @dev Get only active staking hubs
     * @return Array of active staking hub info
     */
    function getActiveStakingHubs() external view returns (HubInfo[] memory) {
        // Count active hubs
        uint256 activeCount = 0;
        for (uint256 i = 0; i < stakingHubs.length; i++) {
            if (stakingHubs[i].isActive) {
                activeCount++;
            }
        }
        
        // Create result array
        HubInfo[] memory activeHubs = new HubInfo[](activeCount);
        
        // Fill result array
        uint256 index = 0;
        for (uint256 i = 0; i < stakingHubs.length; i++) {
            if (stakingHubs[i].isActive) {
                activeHubs[index] = stakingHubs[i];
                index++;
            }
        }
        
        return activeHubs;
    }
}