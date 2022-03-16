// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

// Mock for Curve FeeDistributor
// refs
// - https://curve.readthedocs.io/dao-fees.html#dao-fees-distributor
// - https://github.com/curvefi/curve-dao-contracts/blob/master/contracts/FeeDistributor.vy
contract MockFeeDistributor {
  address public token;

  constructor (address _token) public {
    token = _token;
  }

  function claim() external {}
}