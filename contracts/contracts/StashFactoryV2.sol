// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "./Interfaces.sol";
import "./interfaces/IProxyFactory.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";

contract StashFactoryV2 {
  using Address for address;

  bytes4 private constant rewards_receiver = 0x01ddabf1; //rewards_receiver(address)

  address public immutable operator;
  address public immutable rewardFactory;
  address public immutable proxyFactory;

  address public v3Implementation;

  constructor(
    address _operator,
    address _rewardFactory,
    address _proxyFactory
  ) public {
    operator = _operator;
    rewardFactory = _rewardFactory;
    proxyFactory = _proxyFactory;
  }

  function setImplementation(address _v3) external {
    require(msg.sender == IDeposit(operator).owner(), "!auth");
    v3Implementation = _v3;
  }

  //Create a stash contract for the given gauge.
  //function calls are different depending on the version of kagla gauges so determine which stash type is needed
  function CreateStash(
    uint256 _pid,
    address _gauge,
    address _staker,
    uint256 _stashVersion
  ) external returns (address) {
    require(msg.sender == operator, "!authorized");
    if (_stashVersion == 3) {
      require(v3Implementation != address(0), "0 impl");
      require(!IsV3(_gauge), "stash version mismatch");

      address stash = IProxyFactory(proxyFactory).clone(v3Implementation);
      IStash(stash).initialize(_pid, operator, _staker, _gauge, rewardFactory);
      return stash;
    } else {
      return address(0);
    }
  }

  function IsV3(address _gauge) private returns (bool) {
    bytes memory data = abi.encodeWithSelector(rewards_receiver, address(0));
    (bool success, ) = _gauge.call(data);
    return success;
  }
}
