// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "../Interfaces.sol";

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";

// refs
// - https://kagla.readthedocs.io/dao-gauges.html?highlight=reward_tokens#liquiditygaugev2
// - https://kagla.readthedocs.io/dao-gauges.html?highlight=reward_tokens#liquiditygaugereward
contract MockKaglaGauge {
  using SafeERC20 for IERC20;

  IERC20 public lpToken;

  constructor(address _lpToken) public {
    lpToken = IERC20(_lpToken);
  }

  function deposit(uint256 _amount) external {
    IERC20(lpToken).safeTransferFrom(msg.sender, address(this), _amount);
  }

  function balanceOf(address _address) external view returns (uint256) {
    return IERC20(lpToken).balanceOf(address(this));
  }

  function withdraw(uint256 _amount) external {
    IERC20(lpToken).safeTransfer(msg.sender, _amount);
  }

  function claim_rewards() external {}

  function rewards_receiver(address _address) external pure returns (address) {
    //v3
    return _address;
  }

  function reward_tokens(uint256 _amount) external view returns (address) {
    //v2
    return 0x0000000000000000000000000000000000000000;
  }

  function rewarded_token() external view returns (address) {
    //v1
    return 0x0000000000000000000000000000000000000000;
  }

  function lp_token() external view returns (address) {
    return address(lpToken);
  }
}
