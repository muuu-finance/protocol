// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

// Mock for Kagla AddressProvider
// refs
// - https://kagla.readthedocs.io/registry-address-provider.html
// - https://github.com/kaglafi/kagla-pool-registry/blob/master/contracts/AddressProvider.vy
contract MockKaglaAddressProvider {
  address public registry;
  address public feeDistributor;

  constructor(address _registry, address _feeDistributor) public {
    registry = _registry;
    feeDistributor = _feeDistributor;
  }

  function get_registry() external view returns (address) {
    return registry;
  }

  function get_address(uint256 _id) external view returns (address) {
    require(_id == 4, "Support only id = 4");
    return feeDistributor;
  }
}
