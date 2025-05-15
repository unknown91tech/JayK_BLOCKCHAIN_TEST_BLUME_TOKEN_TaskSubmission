// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title BLUME TOKEN (BLX)
 * @dev ERC20 Token with minting, burning, pausing, and anti-whale capabilities
 */
contract BlumeToken is ERC20, ERC20Burnable, Pausable, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    
    uint256 public maxTransactionAmount;
    uint256 public maxWalletBalance;
    
    mapping(address => bool) public isExcludedFromLimits;
    
    // Anti-bot: mapping to track last transaction timestamp
    mapping(address => uint256) public lastTransactionTimestamp;
    uint256 public cooldownTime = 60; // 60 seconds cooldown between transactions
    
    // Events
    event MaxTransactionAmountUpdated(uint256 newAmount);
    event MaxWalletBalanceUpdated(uint256 newAmount);
    event AccountExcludedFromLimits(address account, bool excluded);
    event CooldownTimeUpdated(uint256 newCooldownTime);

    /**
     * @dev Constructor that gives msg.sender all existing tokens.
     */
    constructor(uint256 initialSupply) ERC20("BLUME TOKEN", "BLX") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        
        // Set default anti-whale limits (10% of total supply)
        maxTransactionAmount = initialSupply * 10 / 100;
        maxWalletBalance = initialSupply * 10 / 100;
        
        // Exclude owner from limits
        isExcludedFromLimits[msg.sender] = true;
        
        // Mint initial supply to the contract creator
        _mint(msg.sender, initialSupply);
    }

    /**
     * @dev Creates `amount` new tokens for `to`.
     * Can only be called by accounts with the MINTER_ROLE.
     */
    function mint(address to, uint256 amount) public onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }

    /**
     * @dev Pauses all token transfers.
     * Can only be called by accounts with the PAUSER_ROLE.
     */
    function pause() public onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /**
     * @dev Unpauses all token transfers.
     * Can only be called by accounts with the PAUSER_ROLE.
     */
    function unpause() public onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    /**
     * @dev Update the maximum transaction amount.
     * Can only be called by the contract admin.
     */
    function setMaxTransactionAmount(uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        maxTransactionAmount = amount;
        emit MaxTransactionAmountUpdated(amount);
    }

    /**
     * @dev Update the maximum wallet balance.
     * Can only be called by the contract admin.
     */
    function setMaxWalletBalance(uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        maxWalletBalance = amount;
        emit MaxWalletBalanceUpdated(amount);
    }

    /**
     * @dev Set the cooldown time between transactions.
     * Can only be called by the contract admin.
     */
    function setCooldownTime(uint256 newCooldownTime) external onlyRole(DEFAULT_ADMIN_ROLE) {
        cooldownTime = newCooldownTime;
        emit CooldownTimeUpdated(newCooldownTime);
    }

    /**
     * @dev Exclude or include an account from transaction and wallet limits.
     * Can only be called by the contract admin.
     */
    function setExcludedFromLimits(address account, bool excluded) external onlyRole(DEFAULT_ADMIN_ROLE) {
        isExcludedFromLimits[account] = excluded;
        emit AccountExcludedFromLimits(account, excluded);
    }

    /**
     * @dev Hook that is called before any transfer of tokens.
     * Includes anti-whale and anti-bot mechanisms.
     */
    function _update(
        address from,
        address to,
        uint256 amount
    ) internal override whenNotPaused {
        // Skip limits for minting and burning
        if (from == address(0) || to == address(0)) {
            super._update(from, to, amount);
            return;
        }

        // Check if addresses are excluded from limits
        if (!isExcludedFromLimits[from] && !isExcludedFromLimits[to]) {
            // Anti-whale: Check transaction amount
            require(amount <= maxTransactionAmount, "Transfer amount exceeds the maximum allowed");

            // Anti-whale: Check max wallet balance
            if (to != address(0) && to != address(this)) {
                uint256 recipientBalance = balanceOf(to);
                require(
                    recipientBalance + amount <= maxWalletBalance,
                    "Recipient balance would exceed the maximum allowed"
                );
            }

            // Anti-bot: Implement cooldown period between transactions
            if (from != address(0)) {
                require(
                    block.timestamp >= lastTransactionTimestamp[from] + cooldownTime || 
                    lastTransactionTimestamp[from] == 0,
                    "Cooldown period not yet elapsed"
                );
                lastTransactionTimestamp[from] = block.timestamp;
            }
        }

        super._update(from, to, amount);
    }
}