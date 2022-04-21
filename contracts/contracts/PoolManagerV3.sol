// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "./Interfaces.sol";
import "./interfaces/IGaugeController.sol";

/*
Pool Manager v3

Changes:
- pass through pool manager proxy
*/

contract PoolManagerV3 {
  address public gaugeController;
  address public immutable pools;

  address public operator;

  constructor(address _pools, address _gaugeController) public {
    operator = msg.sender;
    pools = _pools;
    gaugeController = _gaugeController;
  }

  function setOperator(address _operator) external {
    require(msg.sender == operator, "!auth");
    operator = _operator;
  }

  function setGaugeController(address _gaugeController) external {
    require(msg.sender == operator, "!auth");
    gaugeController = _gaugeController;
  }

  //add a new kagla pool to the system. (default stash to v3)
  function addPool(address _gauge) external returns (bool) {
    _addPool(_gauge, 3);
    return true;
  }

  //add a new kagla pool to the system.
  function addPool(address _gauge, uint256 _stashVersion) external returns (bool) {
    _addPool(_gauge, _stashVersion);
    return true;
  }

  function _addPool(address _gauge, uint256 _stashVersion) internal {
    //get lp token from gauge
    address lptoken = IKaglaGauge(_gauge).lp_token();

    //gauge/lptoken address checks will happen in the next call
    IPools(pools).addPool(lptoken, _gauge, _stashVersion);
  }

  function forceAddPool(
    address _lptoken,
    address _gauge,
    uint256 _stashVersion
  ) external returns (bool) {
    require(msg.sender == operator, "!auth");

    //force add pool without weight checks (can only be used on new token and gauge addresses)
    return IPools(pools).forceAddPool(_lptoken, _gauge, _stashVersion);
  }

  function shutdownPool(uint256 _pid) external returns (bool) {
    require(msg.sender == operator, "!auth");

    IPools(pools).shutdownPool(_pid);
    return true;
  }
}
