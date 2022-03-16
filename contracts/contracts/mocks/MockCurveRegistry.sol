// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

// Mock for Curve Registry
// refs
// - https://curve.readthedocs.io/registry-registry.html
// - https://github.com/curvefi/curve-pool-registry/blob/master/contracts/Registry.vy
contract MockCurveRegistry {
  function get_lp_token(address) external view returns(address) {
    return address(0);
  }

  function get_gauges(address) external view returns(address[10] memory, uint128[10] memory) {
    address adr = address(0);
    address[10] memory liquidity_gauges = [adr, adr, adr, adr, adr, adr, adr, adr, adr, adr];
    uint128[10] memory gauge_types = [uint128(0), uint128(0), uint128(0), uint128(0), uint128(0), uint128(0), uint128(0), uint128(0), uint128(0), uint128(0)];
    return (liquidity_gauges, gauge_types);
  }
}