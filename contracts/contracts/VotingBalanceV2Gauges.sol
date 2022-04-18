// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "./interfaces/ILockedMuuu.sol";

contract VotingBalanceV2Gauges {
  address public immutable locker;
  uint256 public constant rewardsDuration = 86400 * 7;

  constructor(
    address _locker
  ) public {
    locker = _locker;
  }

  function balanceOf(address _account) external view returns (uint256) {
    //compute to find previous epoch
    uint256 currentEpoch = (block.timestamp / rewardsDuration) * rewardsDuration;
    uint256 epochindex = ILockedMuuu(locker).epochCount() - 1;

    //there may or may not have been a checkpoint in the new epoch
    //thus get date of latest epoch and compare to block.timestamp
    //if epoch.date >= current epoch then there was a checkpoint and need to move index back to get prev
    (, uint32 _date) = ILockedMuuu(locker).epochs(epochindex);
    if (_date >= currentEpoch) {
      //if end date is already the current epoch,  minus 1 to get the previous
      epochindex--;
    }

    //check again because new locker has an extra epoch for the following week
    // note: the epochindex-- above can not be -= 2 because there may have been 0 locks for a given week
    //       thus best to check one at a time
    // length -1 = next
    // length -2 = current
    // length -3 = previous
    (, _date) = ILockedMuuu(locker).epochs(epochindex);
    if (_date >= currentEpoch) {
      //if end date is already the current epoch,  minus 1 to get the previous
      epochindex--;
    }

    //get balances of previous epoch
    uint256 balanceAtPrev = ILockedMuuu(locker).balanceAtEpochOf(epochindex, _account);

    //get pending
    uint256 pending = ILockedMuuu(locker).pendingLockAtEpochOf(epochindex, _account);

    return balanceAtPrev + pending;
  }

  function totalSupply() external view returns (uint256) {
    return ILockedMuuu(locker).totalSupply();
  }
}
