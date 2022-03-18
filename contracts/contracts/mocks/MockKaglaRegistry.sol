// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

// Mock for Kagla Registry
// refs
// - https://kagla.readthedocs.io/registry-registry.html
// - https://github.com/kaglafi/kagla-pool-registry/blob/master/contracts/Registry.vy
contract MockKaglaRegistry {
  address public lpToken; // TODO: lpTokens for each pool
  mapping(address => address[10]) public gauges;

  constructor(
    address _pool,
    address _gauge,
    address _lpToken
  ) public {
    address pool = _pool; // 3Pool
    gauges[pool] = [
      _gauge, // 3Pool Gauge
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
