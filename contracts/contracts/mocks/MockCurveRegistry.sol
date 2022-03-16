// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

// Mock for Curve Registry
// refs
// - https://curve.readthedocs.io/registry-registry.html
// - https://github.com/curvefi/curve-pool-registry/blob/master/contracts/Registry.vy
contract MockCurveRegistry {
  address public lpToken; // TODO: lpTokens for each pool
  mapping(address => address[10]) public gauges;

  constructor(address _lpToken) public {
    address pool = address(0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7); // 3Pool
    gauges[pool] = [
      address(0xbFcF63294aD7105dEa65aA58F8AE5BE2D9d0952A), // 3Pool Gauge
      address(0),
      address(0),
      address(0),
      address(0),
      address(0),
      address(0),
      address(0),
      address(0),
      address(0)
    ];
    lpToken = _lpToken;
  }

  function get_lp_token(address _pool) external view returns (address) {
    return lpToken;
  }

  function get_gauges(address _pool)
    external
    view
    returns (address[10] memory, uint128[10] memory)
  {
    address[10] memory liquidity_gauges = gauges[_pool];
    uint128[10] memory gauge_types = [
      uint128(0),
      uint128(0),
      uint128(0),
      uint128(0),
      uint128(0),
      uint128(0),
      uint128(0),
      uint128(0),
      uint128(0),
      uint128(0)
    ];
    return (liquidity_gauges, gauge_types);
  }
}
