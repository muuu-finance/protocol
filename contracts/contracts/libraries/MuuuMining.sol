// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "../interfaces/IMuuu.sol";

library MuuuMining {
  IMuuu public constant muuu = IMuuu(0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B);

  function ConvertKglToMuuu(uint256 _amount) external view returns (uint256) {
    uint256 supply = muuu.totalSupply();
    uint256 reductionPerCliff = muuu.reductionPerCliff();
    uint256 totalCliffs = muuu.totalCliffs();
    uint256 maxSupply = muuu.maxSupply();

    uint256 cliff = supply / reductionPerCliff;
    //mint if below total cliffs
    if (cliff < totalCliffs) {
      //for reduction% take inverse of current cliff
      uint256 reduction = totalCliffs - cliff;
      //reduce
      _amount = (_amount * reduction) / totalCliffs;

      //supply cap check
      uint256 amtTillMax = maxSupply - supply;
      if (_amount > amtTillMax) {
        _amount = amtTillMax;
      }

      //mint
      return _amount;
    }
    return 0;
  }
}
