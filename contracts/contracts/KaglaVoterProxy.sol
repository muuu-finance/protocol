// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "./Interfaces.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract KaglaVoterProxy is Ownable {
  using SafeERC20 for IERC20;
  using Address for address;
  using SafeMath for uint256;

  address public kgl; // IERC20 / KGL Token
  address public votingEscrow; // for Specialize DEX
  address public gaugeController; // IVoting / GaugeController
  address public tokenMinter; // IMinter / Minter

  address public operator;
  address public depositor;

  mapping(address => bool) private stashPool;
  mapping(address => bool) private protectedTokens;

  constructor(
    address _kgl,
    address _votingEscrow,
    address _gaugeController,
    address _tokenMinter
  ) public {
    kgl = _kgl;
    votingEscrow = _votingEscrow;
    gaugeController = _gaugeController;
    tokenMinter = _tokenMinter;
  }

  function getName() external pure returns (string memory) {
    return "KaglaVoterProxy";
  }

  function setKgl(address _kgl) external onlyOwner {
    kgl = _kgl;
  }

  function setVotingEscrow(address _votingEscrow) external onlyOwner {
    votingEscrow = _votingEscrow;
  }

  function setGaugeController(address _gaugeController) external onlyOwner {
    gaugeController = _gaugeController;
  }

  function setTokenMinter(address _tokenMinter) external onlyOwner {
    tokenMinter = _tokenMinter;
  }

  function setOperator(address _operator) external {
    require(msg.sender == owner(), "!auth");
    require(operator == address(0) || IDeposit(operator).isShutdown() == true, "needs shutdown");

    operator = _operator;
  }

  function setDepositor(address _depositor) external {
    require(msg.sender == owner(), "!auth");

    depositor = _depositor;
  }

  function setStashAccess(address _stash, bool _status) external returns (bool) {
    require(msg.sender == operator, "!auth");
    if (_stash != address(0)) {
      stashPool[_stash] = _status;
    }
    return true;
  }

  function deposit(address _token, address _gauge) external returns (bool) {
    require(msg.sender == operator, "!auth");
    if (protectedTokens[_token] == false) {
      protectedTokens[_token] = true;
    }
    if (protectedTokens[_gauge] == false) {
      protectedTokens[_gauge] = true;
    }
    uint256 balance = IERC20(_token).balanceOf(address(this));
    if (balance > 0) {
      IERC20(_token).safeApprove(_gauge, 0);
      IERC20(_token).safeApprove(_gauge, balance);
      IKaglaGauge(_gauge).deposit(balance);
    }
    return true;
  }

  //stash only function for pulling extra incentive reward tokens out
  function withdraw(IERC20 _asset) external returns (uint256 balance) {
    require(stashPool[msg.sender] == true, "!auth");

    //check protection
    if (protectedTokens[address(_asset)] == true) {
      return 0;
    }

    balance = _asset.balanceOf(address(this));
    _asset.safeTransfer(msg.sender, balance);
    return balance;
  }

  // Withdraw partial funds
  function withdraw(
    address _token,
    address _gauge,
    uint256 _amount
  ) public returns (bool) {
    require(msg.sender == operator, "!auth");
    uint256 _balance = IERC20(_token).balanceOf(address(this));
    if (_balance < _amount) {
      _amount = _withdrawSome(_gauge, _amount.sub(_balance));
      _amount = _amount.add(_balance);
    }
    IERC20(_token).safeTransfer(msg.sender, _amount);
    return true;
  }

  function withdrawAll(address _token, address _gauge) external returns (bool) {
    require(msg.sender == operator, "!auth");
    uint256 amount = balanceOfPool(_gauge).add(IERC20(_token).balanceOf(address(this)));
    withdraw(_token, _gauge, amount);
    return true;
  }

  function _withdrawSome(address _gauge, uint256 _amount) internal returns (uint256) {
    IKaglaGauge(_gauge).withdraw(_amount);
    return _amount;
  }

  function createLock(uint256 _value, uint256 _unlockTime) external returns (bool) {
    require(msg.sender == depositor, "!auth");
    IERC20(kgl).safeApprove(votingEscrow, 0);
    IERC20(kgl).safeApprove(votingEscrow, _value);
    IKaglaVoteEscrow(votingEscrow).create_lock(_value, _unlockTime);
    return true;
  }

  function increaseAmount(uint256 _value) external returns (bool) {
    require(msg.sender == depositor, "!auth");
    IERC20(kgl).safeApprove(votingEscrow, 0);
    IERC20(kgl).safeApprove(votingEscrow, _value);
    IKaglaVoteEscrow(votingEscrow).increase_amount(_value);
    return true;
  }

  function increaseTime(uint256 _value) external returns (bool) {
    require(msg.sender == depositor, "!auth");
    IKaglaVoteEscrow(votingEscrow).increase_unlock_time(_value);
    return true;
  }

  function release() external returns (bool) {
    require(msg.sender == depositor, "!auth");
    IKaglaVoteEscrow(votingEscrow).withdraw();
    return true;
  }

  function vote(
    uint256 _voteId,
    address _votingAddress,
    bool _support
  ) external returns (bool) {
    require(msg.sender == operator, "!auth");
    IVoting(_votingAddress).vote(_voteId, _support, false);
    return true;
  }

  function voteGaugeWeight(address _gauge, uint256 _weight) external returns (bool) {
    require(msg.sender == operator, "!auth");

    //vote
    IVoting(gaugeController).vote_for_gauge_weights(_gauge, _weight);
    return true;
  }

  function claimKgl(address _gauge) external returns (uint256) {
    require(msg.sender == operator, "!auth");

    uint256 _balance = 0;
    try IMinter(tokenMinter).mint(_gauge) {
      _balance = IERC20(kgl).balanceOf(address(this));
      IERC20(kgl).safeTransfer(operator, _balance);
    } catch {}

    return _balance;
  }

  function claimRewards(address _gauge) external returns (bool) {
    require(msg.sender == operator, "!auth");
    IKaglaGauge(_gauge).claim_rewards();
    return true;
  }

  function claimFees(address _distroContract, address _token) external returns (uint256) {
    require(msg.sender == operator, "!auth");
    IFeeDistro(_distroContract).claim();
    uint256 _balance = IERC20(_token).balanceOf(address(this));
    IERC20(_token).safeTransfer(operator, _balance);
    return _balance;
  }

  function balanceOfPool(address _gauge) public view returns (uint256) {
    return IKaglaGauge(_gauge).balanceOf(address(this));
  }

  function execute(
    address _to,
    uint256 _value,
    bytes calldata _data
  ) external payable returns (bool, bytes memory) {
    require(msg.sender == operator, "!auth");

    (bool success, bytes memory result) = _to.call{ value: _value }(_data);

    return (success, result);
  }
}
