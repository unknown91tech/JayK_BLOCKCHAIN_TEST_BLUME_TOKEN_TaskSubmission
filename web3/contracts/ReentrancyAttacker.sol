// test/ReentrancyAttacker.sol
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../contracts/BlumeStakingHub.sol";

contract ReentrancyAttacker {
    BlumeStakingHub public hub;
    IERC20 public token;
    bool private attacking;

    constructor(address _hub, address _token) {
        hub = BlumeStakingHub(_hub);
        token = IERC20(_token);
    }

    function stake(uint256 amount, uint256 tierIndex) external {
        token.approve(address(hub), amount);
        hub.stake(amount, tierIndex);
    }

    function attack() external {
        attacking = true;
        IERC20 stBLX = IERC20(hub.stBLXToken());
        uint256 balance = stBLX.balanceOf(address(this));
        stBLX.approve(address(hub), balance);
        hub.unstake(balance);
        attacking = false;
    }

    receive() external payable {
        if (attacking) {
            attacking = false;
            IERC20 stBLX = IERC20(hub.stBLXToken());
            uint256 currentBalance = stBLX.balanceOf(address(this));
            if (currentBalance > 0) {
                stBLX.approve(address(hub), currentBalance);
                hub.unstake(currentBalance);
            }
        }
    }
}