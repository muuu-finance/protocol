// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "./interfaces/IKglDepositor.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

interface IMuuuRewards {
  function withdraw(uint256 _amount, bool _claim) external;

  function balanceOf(address _account) external view returns (uint256);

  function getReward(bool _stake) external;

  function stakeAll() external;
}

interface IMuuuLocker {
  function notifyRewardAmount(address _rewardsToken, uint256 reward) external;
}

// receive tokens to stake
// get current staked balance
// withdraw staked tokens
// send rewards back to owner(muuu locker)
// register token types that can be distributed

contract MuuuStakingProxyV2 {
  using SafeERC20 for IERC20;
  using Address for address;
  using SafeMath for uint256;

  // tokens' addreesses
  address public immutable kgl;
  address public immutable muuu;
  address public immutable muKgl;

  // muuu addresses
  address public immutable muuuStaking;
  address public immutable muKglStaking;
  address public immutable kglDeposit;
  uint256 public constant denominator = 10000;

  address public immutable rewards;

  address public owner;
  address public pendingOwner;
  uint256 public callIncentive = 0;

  mapping(address => bool) public distributors;
  bool public UseDistributors = true;

  event AddDistributor(address indexed _distro, bool _valid);
  event RewardsDistributed(address indexed token, uint256 amount);

  constructor(
    address _rewards,
    address _kgl,
    address _muuu,
    address _muKgl,
    address _muuuStaking,
    address _muKglStaking,
    address _kglDeposit
  ) public {
    rewards = _rewards;
    owner = msg.sender;
    distributors[msg.sender] = true;
    kgl = _kgl;
    muuu = _muuu;
    muKgl = _muKgl;
    muuuStaking = _muuuStaking;
    muKglStaking = _muKglStaking;
    kglDeposit = _kglDeposit;
  }

  function setPendingOwner(address _po) external {
    require(msg.sender == owner, "!auth");
    require(_po != address(0), "invalid owner");

    pendingOwner = _po;
  }

  function acceptOwner() external {
    require(msg.sender == pendingOwner, "!auth");

    owner = pendingOwner;
    pendingOwner = address(0);
  }

  function setCallIncentive(uint256 _incentive) external {
    require(msg.sender == owner, "!auth");
    require(_incentive <= 100, "too high");
    callIncentive = _incentive;
  }

  function setDistributor(address _distro, bool _valid) external {
    require(msg.sender == owner, "!auth");
    distributors[_distro] = _valid;
    emit AddDistributor(_distro, _valid);
  }

  function setUseDistributorList(bool _use) external {
    require(msg.sender == owner, "!auth");
    UseDistributors = _use;
  }

  function setApprovals() external {
    IERC20(muuu).safeApprove(muuuStaking, 0);
    IERC20(muuu).safeApprove(muuuStaking, uint256(-1));

    IERC20(kgl).safeApprove(kglDeposit, 0);
    IERC20(kgl).safeApprove(kglDeposit, uint256(-1));

    IERC20(muKgl).safeApprove(rewards, 0);
    IERC20(muKgl).safeApprove(rewards, uint256(-1));
  }

  function rescueToken(address _token, address _to) external {
    require(msg.sender == owner, "!auth");
    require(_token != kgl && _token != muuu && _token != muKgl, "not allowed");

    uint256 bal = IERC20(_token).balanceOf(address(this));
    IERC20(_token).safeTransfer(_to, bal);
  }

  function getBalance() external view returns (uint256) {
    return IMuuuRewards(muuuStaking).balanceOf(address(this));
  }

  function withdraw(uint256 _amount) external {
    require(msg.sender == rewards, "!auth");

    //unstake
    IMuuuRewards(muuuStaking).withdraw(_amount, false);

    //withdraw muuu
    IERC20(muuu).safeTransfer(msg.sender, _amount);
  }

  function stake() external {
    require(msg.sender == rewards, "!auth");

    IMuuuRewards(muuuStaking).stakeAll();
  }

  function distribute() external {
    if (UseDistributors) {
      require(distributors[msg.sender], "!auth");
    }

    //claim rewards
    IMuuuRewards(muuuStaking).getReward(false);

    //convert any kgl that was directly added
    uint256 kglBal = IERC20(kgl).balanceOf(address(this));
    if (kglBal > 0) {
      IKglDepositor(kglDeposit).deposit(kglBal, true);
    }

    //make sure nothing is in here
    uint256 sCheck = IMuuuRewards(muKglStaking).balanceOf(address(this));
    if (sCheck > 0) {
      IMuuuRewards(muKglStaking).withdraw(sCheck, false);
    }

    //distribute mukgl
    uint256 muKglBal = IERC20(muKgl).balanceOf(address(this));

    if (muKglBal > 0) {
      uint256 incentiveAmount = muKglBal.mul(callIncentive).div(denominator);
      muKglBal = muKglBal.sub(incentiveAmount);
      
      if (incentiveAmount > 0) {
        //send incentives
        IERC20(muKgl).safeTransfer(msg.sender, incentiveAmount);
      }

      //update rewards
      IMuuuLocker(rewards).notifyRewardAmount(muKgl, muKglBal);

      emit RewardsDistributed(muKgl, muKglBal);
    }
  }

  //in case a new reward is ever added, allow generic distribution
  function distributeOther(IERC20 _token) external {
    require(address(_token) != kgl && address(_token) != muKgl, "not allowed");

    uint256 bal = _token.balanceOf(address(this));

    if (bal > 0) {
      uint256 incentiveAmount = bal.mul(callIncentive).div(denominator);
      bal = bal.sub(incentiveAmount);

      //send incentives
      _token.safeTransfer(msg.sender, incentiveAmount);

      //approve
      _token.safeApprove(rewards, 0);
      _token.safeApprove(rewards, uint256(-1));

      //update rewards
      IMuuuLocker(rewards).notifyRewardAmount(address(_token), bal);

      emit RewardsDistributed(address(_token), bal);
    }
  }
}
