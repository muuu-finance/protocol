// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "../Interfaces.sol";

// refs
// - https://kagla.readthedocs.io/dao-gauges.html?highlight=reward_tokens#liquiditygaugev2
// - https://kagla.readthedocs.io/dao-gauges.html?highlight=reward_tokens#liquiditygaugereward
contract MockKaglaGauge {
  function deposit(uint256 _amount) external {}

  function balanceOf(address _address) external view returns (uint256) {
    return 0;
  }

  function withdraw(uint256 _amount) external {}

  function claim_rewards() external {}

  function reward_tokens(uint256 _amount) external view returns (address) {
    //v2
    return 0x0000000000000000000000000000000000000000;
  }

  function rewarded_token() external view returns (address) {
    //v1
    return 0x0000000000000000000000000000000000000000;
  }

  function lp_token() external view returns (address) {
    return 0x0000000000000000000000000000000000000000;
  }
}
