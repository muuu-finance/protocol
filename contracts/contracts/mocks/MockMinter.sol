// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

// Mock for ITokenMinter
// refs
// - https://github.com/curvefi/curve-dao-contracts/blob/master/contracts/Minter.vy

interface IMintableERC20 {
  function mint(uint256 value) external returns (bool);
}

contract MockMinter {
  address public token; // basically, here is kgl

  constructor(address _token) public {
    token = _token;
  }

  /**
  @notice Mint everything which belongs to `msg.sender` and send to them
  @param _gaugeAddr `LiquidityGauge` address to get mintable amount from
 */
  function mint(address _gaugeAddr) external {
    _mint(_gaugeAddr, msg.sender);
  }

  function _mint(address _gaugeAddr, address _for) internal {
    uint256 to_mint = 10000;
    IMintableERC20(token).mint(to_mint);
  }
}
