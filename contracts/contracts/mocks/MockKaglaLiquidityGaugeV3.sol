// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

// Mock for Kagla LiquidityGaugeV3
// refs
// - https://curve.readthedocs.io/dao-gauges.html#liquiditygaugev3
contract MockKaglaLiquidityGaugeV3 {
  function rewards_receiver(address _address) external pure returns (address) {
    return _address;
  }
}
