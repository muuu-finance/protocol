// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "../Interfaces.sol";

// Mock for GaugeController
// refs
// - https://github.com/curvefi/curve-dao-contracts/blob/master/contracts/GaugeController.vy
// - contracts/contracts/interfaces/IGaugeController.sol

contract MockGaugeController {
  //vote
  function vote_for_gauge_weights(address _gauge, uint256 _weight) external {}

  function get_gauge_weight(address _gauge) external pure returns (uint256) {
    return 1;
  }

  function add_gauge(
    address,
    int128,
    uint256
  ) external {}

  function vote_user_slopes(address _voteproxy, address _gauge)
    external
    pure
    returns (
      uint256,
      uint256,
      uint256
    )
  {
    return (1, 0, 0);
  }
}
