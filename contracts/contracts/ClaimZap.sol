// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "./libraries/MathUtil.sol";
import "./interfaces/ILockedMuuu.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IBasicRewards {
  function getReward(address _account, bool _claimExtras) external;

  function getReward(address _account) external;

  function getReward(address _account, address _token) external;

  function stakeFor(address, uint256) external;
}

interface IMuuuRewards {
  function getReward(
    address _account,
    bool _claimExtras,
    bool _stake
  ) external;
}

interface IChefRewards {
  function claim(uint256 _pid, address _account) external;
}

interface IMuKglDeposit {
  function deposit(uint256, bool) external;
}

interface ISwapExchange {
  function exchange(
    int128,
    int128,
    uint256,
    uint256
  ) external returns (uint256);
}

//Claim zap to bundle various reward claims
//v2:
// - change exchange to use kagla pool
// - add getReward(address,token) type
// - add option to lock muuu
// - add option use all funds in wallet
contract ClaimZap is Ownable {
  using SafeERC20 for IERC20;
  using SafeMath for uint256;

  address public kgl;
  address public muuu;
  address public muKgl;
  address public kglDeposit;
  address public muKglRewards;
  address public muuuRewards;
  address public exchange; //Factory muKGL in kagla
  address public locker; //MuuuLockerV2

  enum Options {
    ClaimMuuu, //1
    ClaimMuuuAndStake, //2
    ClaimMuKgl, //4
    ClaimLockedMuuu, //8
    ClaimLockedMuuuStake, //16
    LockKglDeposit, //32
    UseAllWalletFunds, //64
    LockMuuu //128
  }

  constructor(
    address _kgl,
    address _muuu,
    address _muKgl,
    address _kglDeposit,
    address _muKglRewards,
    address _muuuRewards,
    address _exchange,
    address _locker
  ) public {
    kgl = _kgl;
    muuu = _muuu;
    muKgl = _muKgl;
    kglDeposit = _kglDeposit;
    muKglRewards = _muKglRewards;
    muuuRewards = _muuuRewards;
    exchange = _exchange;
    locker = _locker;
  }

  function getName() external pure returns (string memory) {
    return "ClaimZap V2.0";
  }

  function setApprovals() external onlyOwner {
    IERC20(kgl).safeApprove(kglDeposit, 0);
    IERC20(kgl).safeApprove(kglDeposit, uint256(-1));
    IERC20(kgl).safeApprove(exchange, 0);
    IERC20(kgl).safeApprove(exchange, uint256(-1));

    IERC20(muuu).safeApprove(muuuRewards, 0);
    IERC20(muuu).safeApprove(muuuRewards, uint256(-1));

    IERC20(muKgl).safeApprove(muKglRewards, 0);
    IERC20(muKgl).safeApprove(muKglRewards, uint256(-1));

    IERC20(muuu).safeApprove(locker, 0);
    IERC20(muuu).safeApprove(locker, uint256(-1));
  }

  function CheckOption(uint256 _mask, uint256 _flag) internal pure returns (bool) {
    return (_mask & (1 << _flag)) != 0;
  }

  function claimRewards(
    address[] calldata rewardContracts,
    address[] calldata extraRewardContracts,
    address[] calldata tokenRewardContracts,
    address[] calldata tokenRewardTokens,
    uint256 depositKglMaxAmount,
    uint256 minAmountOut,
    uint256 depositMuuuMaxAmount,
    uint256 spendMuuuAmount,
    uint256 options
  ) external {
    uint256 kglBalance = IERC20(kgl).balanceOf(msg.sender);
    uint256 muuuBalance = IERC20(muuu).balanceOf(msg.sender);

    //claim from main kagla LP pools
    for (uint256 i = 0; i < rewardContracts.length; i++) {
      IBasicRewards(rewardContracts[i]).getReward(msg.sender, true);
    }
    //claim from extra rewards
    for (uint256 i = 0; i < extraRewardContracts.length; i++) {
      IBasicRewards(extraRewardContracts[i]).getReward(msg.sender);
    }
    //claim from multi reward token contract
    for (uint256 i = 0; i < tokenRewardContracts.length; i++) {
      IBasicRewards(tokenRewardContracts[i]).getReward(msg.sender, tokenRewardTokens[i]);
    }

    //claim others/deposit/lock/stake
    _claimExtras(
      depositKglMaxAmount,
      minAmountOut,
      depositMuuuMaxAmount,
      spendMuuuAmount,
      kglBalance,
      muuuBalance,
      options
    );
  }

  function _claimExtras(
    uint256 depositKglMaxAmount,
    uint256 minAmountOut,
    uint256 depositMuuuMaxAmount,
    uint256 spendMuuuAmount,
    uint256 removeKglBalance,
    uint256 removeMuuuBalance,
    uint256 options
  ) internal {
    //claim (and stake) from muuu rewards
    if (CheckOption(options, uint256(Options.ClaimMuuuAndStake))) {
      IMuuuRewards(muuuRewards).getReward(msg.sender, true, true);
    } else if (CheckOption(options, uint256(Options.ClaimMuuu))) {
      IMuuuRewards(muuuRewards).getReward(msg.sender, true, false);
    }

    //claim from muKgl rewards
    if (CheckOption(options, uint256(Options.ClaimMuKgl))) {
      IBasicRewards(muKglRewards).getReward(msg.sender, true);
    }

    //claim from locker
    if (CheckOption(options, uint256(Options.ClaimLockedMuuu))) {
      ILockedMuuu(locker).getReward(
        msg.sender,
        CheckOption(options, uint256(Options.ClaimLockedMuuuStake))
      );
    }

    //reset remove balances if we want to also stake/lock funds already in our wallet
    if (CheckOption(options, uint256(Options.UseAllWalletFunds))) {
      removeKglBalance = 0;
      removeMuuuBalance = 0;
    }

    //lock upto given amount of kgl and stake
    if (depositKglMaxAmount > 0) {
      uint256 kglBalance = IERC20(kgl).balanceOf(msg.sender).sub(removeKglBalance);
      kglBalance = MathUtil.min(kglBalance, depositKglMaxAmount);
      if (kglBalance > 0) {
        //pull kgl
        IERC20(kgl).safeTransferFrom(msg.sender, address(this), kglBalance);
        if (minAmountOut > 0) {
          //swap
          ISwapExchange(exchange).exchange(0, 1, kglBalance, minAmountOut);
        } else {
          //deposit
          IMuKglDeposit(kglDeposit).deposit(
            kglBalance,
            CheckOption(options, uint256(Options.LockKglDeposit))
          );
        }
        //get mukgl amount
        uint256 muKglBalance = IERC20(muKgl).balanceOf(address(this));
        //stake for msg.sender
        IBasicRewards(muKglRewards).stakeFor(msg.sender, muKglBalance);
      }
    }

    //stake up to given amount of muuu
    if (depositMuuuMaxAmount > 0) {
      uint256 muuuBalance = IERC20(muuu).balanceOf(msg.sender).sub(removeMuuuBalance);
      muuuBalance = MathUtil.min(muuuBalance, depositMuuuMaxAmount);
      if (muuuBalance > 0) {
        //pull muuu
        IERC20(muuu).safeTransferFrom(msg.sender, address(this), muuuBalance);
        if (CheckOption(options, uint256(Options.LockMuuu))) {
          ILockedMuuu(locker).lock(msg.sender, muuuBalance, spendMuuuAmount);
        } else {
          //stake for msg.sender
          IBasicRewards(muuuRewards).stakeFor(msg.sender, muuuBalance);
        }
      }
    }
  }
}
