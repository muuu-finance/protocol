// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "../Interfaces.sol";

// ref: https://curve.readthedocs.io/dao-vecrv.html?highlight=CRV#curve-dao-vote-escrowed-crv
contract MockCurveVoteEscrow {
  function create_lock(uint256 _value, uint256 _unlock_time) external {}

  function increase_amount(uint256 _amount) external {}

  function increase_unlock_time(uint256 _unlock_time) external {}

  function withdraw() external {}

  function smart_wallet_checker() external view returns (address) {
    return 0x0000000000000000000000000000000000000000;
  }

  function balanceOf(address addr) external view returns (uint256) {
    return 0;
  }
}
