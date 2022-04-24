// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "./Interfaces.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

import "@openzeppelin/contracts/access/Ownable.sol";

contract MuuuToken is ERC20, Ownable {
  using SafeERC20 for IERC20;
  using Address for address;
  using SafeMath for uint256;

  uint256 public maxSupply = 100 * 1000000 * 1e18; //100mil
  uint256 public totalCliffs = 1000;
  uint256 public reductionPerCliff;

  mapping(address => bool) public minterList;

  constructor() public ERC20("TEST Muuu Token", "TESTMUUU") {
    minterList[msg.sender] = true;
    reductionPerCliff = maxSupply.div(totalCliffs);
  }

  function addMinter(address _voterProxy) external onlyOwner {
    // The address is supposed to be VoterProxy and have booster address as a owner.
    address booster = IStaker(_voterProxy).operator();
    require(booster != address(0), "Zero address cannot be set.");
    minterList[booster] = true;
  }

  function removeMinter(address _minter) external onlyOwner {
    minterList[_minter] = false;
  }

  function mint(address _to, uint256 _amount) external {
    if (!minterList[msg.sender]) {
      //dont error just return. if a shutdown happens, rewards on old system
      //can still be claimed, just wont mint muuu
      return;
    }

    uint256 supply = totalSupply();
    if (supply == 0) {
      //premine, one time only
      _mint(_to, _amount);
      minterList[msg.sender] = false;
      return;
    }

    //use current supply to gauge cliff
    //this will cause a bit of overflow into the next cliff range
    //but should be within reasonable levels.
    //requires a max supply check though
    uint256 cliff = supply.div(reductionPerCliff);
    //mint if below total cliffs
    if (cliff < totalCliffs) {
      //for reduction% take inverse of current cliff
      uint256 reduction = totalCliffs.sub(cliff);
      //reduce
      _amount = _amount.mul(reduction).div(totalCliffs);

      //supply cap check
      uint256 amtTillMax = maxSupply.sub(supply);
      if (_amount > amtTillMax) {
        _amount = amtTillMax;
      }

      //mint
      _mint(_to, _amount);
    }
  }

  function mintToSender(uint256 value) public returns (bool) {
    _mint(_msgSender(), value);
    return true;
  }
}
