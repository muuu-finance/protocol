// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "./interfaces/IRewardStaking.sol";
import "./interfaces/ILockedMuuu.sol";
import "./interfaces/IDelegation.sol";
import "./interfaces/IKglDepositor.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";

//Basic functionality to integrate with locking muuu
contract BasicMuuuHolder {
  using SafeERC20 for IERC20;
  using Address for address;

  address public constant muKgl = address(0x62B9c7356A2Dc64a1969e19C23e4f579F9810Aa7);
  address public constant mukglStaking = address(0x3Fe65692bfCD0e6CF84cB1E7d24108E434A7587e);
  address public constant muuu = address(0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B);
  address public constant kgl = address(0xD533a949740bb3306d119CC777fa900bA034cd52);
  address public constant kglDeposit = address(0x8014595F2AB54cD7c604B00E9fb932176fDc86Ae);

  address public operator;
  ILockedMuuu public immutable muuulocker;

  constructor(address _muuulocker) public {
    muuulocker = ILockedMuuu(_muuulocker);
    operator = msg.sender;
  }

  function setApprovals() external {
    IERC20(muKgl).safeApprove(mukglStaking, 0);
    IERC20(muKgl).safeApprove(mukglStaking, uint256(-1));

    IERC20(muuu).safeApprove(address(muuulocker), 0);
    IERC20(muuu).safeApprove(address(muuulocker), uint256(-1));

    IERC20(kgl).safeApprove(kglDeposit, 0);
    IERC20(kgl).safeApprove(kglDeposit, uint256(-1));
  }

  function setOperator(address _op) external {
    require(msg.sender == operator, "!auth");
    operator = _op;
  }

  function setDelegate(address _delegateContract, address _delegate) external {
    require(msg.sender == operator, "!auth");
    // IDelegation(_delegateContract).setDelegate(keccak256("muuu.eth"), _delegate);
    IDelegation(_delegateContract).setDelegate("muuu.eth", _delegate);
  }

  function lock(uint256 _amount, uint256 _spendRatio) external {
    require(msg.sender == operator, "!auth");

    if (_amount > 0) {
      IERC20(muuu).safeTransferFrom(msg.sender, address(this), _amount);
    }
    _amount = IERC20(muuu).balanceOf(address(this));

    muuulocker.lock(address(this), _amount, _spendRatio);
  }

  function processExpiredLocks(bool _relock, uint256 _spendRatio) external {
    require(msg.sender == operator, "!auth");

    muuulocker.processExpiredLocks(_relock, _spendRatio, address(this));
  }

  function processRewards() external {
    require(msg.sender == operator, "!auth");

    muuulocker.getReward(address(this), true);
    IRewardStaking(mukglStaking).getReward(address(this), true);

    uint256 kglBal = IERC20(kgl).balanceOf(address(this));
    if (kglBal > 0) {
      IKglDepositor(kglDeposit).deposit(kglBal, true);
    }

    uint mukglBal = IERC20(muKgl).balanceOf(address(this));
    if (mukglBal > 0) {
      IRewardStaking(mukglStaking).stake(mukglBal);
    }
  }

  function withdrawMuKgl(uint256 _amount, address _withdrawTo) external {
    require(msg.sender == operator, "!auth");
    require(_withdrawTo != address(0), "bad address");

    IRewardStaking(mukglStaking).withdraw(_amount, true);
    uint mukglBal = IERC20(muKgl).balanceOf(address(this));
    if (mukglBal > 0) {
      IERC20(muKgl).safeTransfer(_withdrawTo, mukglBal);
    }
  }

  function withdrawTo(
    IERC20 _asset,
    uint256 _amount,
    address _to
  ) external {
    require(msg.sender == operator, "!auth");

    _asset.safeTransfer(_to, _amount);
  }

  function execute(
    address _to,
    uint256 _value,
    bytes calldata _data
  ) external payable returns (bool, bytes memory) {
    require(msg.sender == operator, "!auth");

    (bool success, bytes memory result) = _to.call{ value: _value }(_data);

    return (success, result);
  }
}
