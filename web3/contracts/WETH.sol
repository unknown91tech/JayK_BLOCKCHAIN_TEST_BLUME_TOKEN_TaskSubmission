// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title Wrapped Ether/BNB
 * @dev ERC20 token that wraps native ETH/BNB
 */
contract WETH is ERC20 {
    event Deposit(address indexed dst, uint256 amount);
    event Withdrawal(address indexed src, uint256 amount);

    constructor() ERC20("Wrapped ETH", "WETH") {}

    /**
     * @dev Deposit ETH and get WETH
     */
    function deposit() public payable {
        _mint(msg.sender, msg.value);
        emit Deposit(msg.sender, msg.value);
    }

    /**
     * @dev Withdraw ETH by burning WETH
     */
    function withdraw(uint256 amount) public {
        require(balanceOf(msg.sender) >= amount, "WETH: insufficient balance");
        _burn(msg.sender, amount);
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "WETH: ETH transfer failed");
        emit Withdrawal(msg.sender, amount);
    }

    /**
     * @dev Fallback function to handle ETH deposits
     */
    receive() external payable {
        deposit();
    }
}