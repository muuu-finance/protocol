// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "./interfaces/ILockedMuuu.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IBasicRewards {
  function getReward(address _account, bool _claimExtras) external;

  function stakeFor(address, uint256) external;
}

interface IMuuuRewards {
  function getReward(
    address _account,
    bool _claimExtras,
    bool _stake
  ) external;
}

interface IKglDeposit {
  function deposit(uint256, bool) external;
}

interface IBooster {
  function poolInfo(uint256)
    external
    view
    returns (
      address, // lptoken
      address, // token
      address, // gauge
      address, // kglRewards
      address, // stash
      bool // isShutdown
    );
}

contract ClaimZap is Ownable {
  using SafeERC20 for IERC20;
  using SafeMath for uint256;

  address public booster;
  address public kgl;
  address public muuu;
  address public muKgl;
  address public kglDeposit;
  address public muKglRewards;
  address public muuuRewards;
  address public locker; //MuuuLockerV2

  constructor(
    address _booster,
    address _kgl,
    address _muuu,
    address _muKgl,
    address _kglDeposit,
    address _muKglRewards,
    address _muuuRewards,
    address _locker
  ) public {
    booster = _booster;
    kgl = _kgl;
    muuu = _muuu;
    muKgl = _muKgl;
    kglDeposit = _kglDeposit;
    muKglRewards = _muKglRewards;
    muuuRewards = _muuuRewards;
    locker = _locker;
  }

  function getName() external pure returns (string memory) {
    return "ClaimZap";
  }

  function setApprovals() external onlyOwner {
    IERC20(kgl).safeApprove(kglDeposit, 0);
    IERC20(kgl).safeApprove(kglDeposit, uint256(-1));

    IERC20(muKgl).safeApprove(muKglRewards, uint256(-1));

    IERC20(muuu).safeApprove(muuuRewards, uint256(-1));
    IERC20(muuu).safeApprove(locker, uint256(-1));
  }

  function claimRewards(
    uint256[] calldata poolIds,
    bool _claimFromMuKglRewards,
    bool _claimFromMuuuRewards,
    bool _claimFromLocker,
    bool _lock
  ) external {
    uint256 initialKglBalance = IERC20(kgl).balanceOf(msg.sender);
    uint256 initialMuuuBalance = IERC20(muuu).balanceOf(msg.sender);

    // Claim from BaseReward of Kagla's pools
    for (uint256 i = 0; i < poolIds.length; i++) {
      (, , , address kglRewards, , bool isShutdown) = IBooster(booster).poolInfo(poolIds[i]);
      if (isShutdown) continue;
      IBasicRewards(kglRewards).getReward(msg.sender, true);
    }

    // Claim from muKgl rewards
    if (_claimFromMuKglRewards) {
      IBasicRewards(muKglRewards).getReward(msg.sender, true);
    }

    // Claim from muuu rewards and stake muKGL
    if (_claimFromMuuuRewards) {
      IMuuuRewards(muuuRewards).getReward(msg.sender, true, true);
    }

    // Claim from locker rewards and stake muKGL
    if (_claimFromLocker) {
      ILockedMuuu(locker).getReward(msg.sender, true);
    }

    // convert and stake claimed KGL
    uint256 kglBalance = IERC20(kgl).balanceOf(msg.sender).sub(initialKglBalance);
    if (kglBalance > 0) {
      IERC20(kgl).safeTransferFrom(msg.sender, address(this), kglBalance);
      // lock KGL to voterProxy and only convert KGL to muKGL
      IKglDeposit(kglDeposit).deposit(kglBalance, true);
      uint256 muKglBalance = IERC20(muKgl).balanceOf(address(this));
      //stake for msg.sender
      IBasicRewards(muKglRewards).stakeFor(msg.sender, muKglBalance);
    }

    // Stake or Lock MUUU
    uint256 muuuBalance = IERC20(muuu).balanceOf(msg.sender).sub(initialMuuuBalance);
    if (muuuBalance > 0) {
      IERC20(muuu).safeTransferFrom(msg.sender, address(this), muuuBalance);
      if (_lock) {
        ILockedMuuu(locker).lock(msg.sender, muuuBalance, 0);
      } else {
        //stake for msg.sender
        IBasicRewards(muuuRewards).stakeFor(msg.sender, muuuBalance);
      }
    }
  }
}
