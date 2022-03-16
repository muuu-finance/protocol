// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "./Interfaces.sol";
import '@openzeppelin/contracts/math/SafeMath.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/utils/Address.sol';
import '@openzeppelin/contracts/token/ERC20/SafeERC20.sol';
import '@openzeppelin/contracts/access/Ownable.sol';


contract KglDepositor is Ownable {
    using SafeERC20 for IERC20;
    using Address for address;
    using SafeMath for uint256;

    address public kgl;
    address public votingEscrow;

    uint256 private constant MAXTIME = 4 * 364 * 86400;
    uint256 private constant WEEK = 7 * 86400;

    uint256 public lockIncentive = 10; //incentive to users who spend gas to lock kgl
    uint256 public constant FEE_DENOMINATOR = 10000;

    address public feeManager;
    address public immutable staker;
    address public immutable minter;
    uint256 public incentiveKgl = 0;
    uint256 public unlockTime;

    constructor(address _staker, address _minter, address _kgl, address _votingEscrow) public {
        staker = _staker;
        minter = _minter;
        feeManager = msg.sender;
        kgl = _kgl;
        votingEscrow = _votingEscrow;
    }

    function setKgl(address _kgl) external onlyOwner {
        kgl = _kgl;
    }

    function setVotingEscrow(address _votingEscrow) external onlyOwner {
        votingEscrow = _votingEscrow;
    }

    function setFeeManager(address _feeManager) external {
        require(msg.sender == feeManager, "!auth");
        feeManager = _feeManager;
    }

    function setFees(uint256 _lockIncentive) external{
        require(msg.sender==feeManager, "!auth");

        if(_lockIncentive >= 0 && _lockIncentive <= 30){
            lockIncentive = _lockIncentive;
       }
    }

    function initialLock() external{
        require(msg.sender==feeManager, "!auth");

        uint256 vekgl = IERC20(votingEscrow).balanceOf(staker);
        if(vekgl == 0){
            uint256 unlockAt = block.timestamp + MAXTIME;
            uint256 unlockInWeeks = (unlockAt/WEEK)*WEEK;

            //release old lock if exists
            IStaker(staker).release();
            //create new lock
            uint256 kglBalanceStaker = IERC20(kgl).balanceOf(staker);
            IStaker(staker).createLock(kglBalanceStaker, unlockAt);
            unlockTime = unlockInWeeks;
        }
    }

    //lock kagla
    function _lockKagla() internal {
        uint256 kglBalance = IERC20(kgl).balanceOf(address(this));
        if(kglBalance > 0){
            IERC20(kgl).safeTransfer(staker, kglBalance);
        }

        //increase ammount
        uint256 kglBalanceStaker = IERC20(kgl).balanceOf(staker);
        if(kglBalanceStaker == 0){
            return;
        }

        //increase amount
        IStaker(staker).increaseAmount(kglBalanceStaker);


        uint256 unlockAt = block.timestamp + MAXTIME;
        uint256 unlockInWeeks = (unlockAt/WEEK)*WEEK;

        //increase time too if over 2 week buffer
        if(unlockInWeeks.sub(unlockTime) > 2){
            IStaker(staker).increaseTime(unlockAt);
            unlockTime = unlockInWeeks;
        }
    }

    function lockKagla() external {
        _lockKagla();

        //mint incentives
        if(incentiveKgl > 0){
            ITokenMinter(minter).mint(msg.sender,incentiveKgl);
            incentiveKgl = 0;
        }
    }

    //deposit kgl for muuuKgl
    //can locking immediately or defer locking to someone else by paying a fee.
    //while users can choose to lock or defer, this is mostly in place so that
    //the muuu reward contract isnt costly to claim rewards
    function deposit(uint256 _amount, bool _lock, address _stakeAddress) public {
        require(_amount > 0,"!>0");

        if(_lock){
            //lock immediately, transfer directly to staker to skip an erc20 transfer
            IERC20(kgl).safeTransferFrom(msg.sender, staker, _amount);
            _lockKagla();
            if(incentiveKgl > 0){
                //add the incentive tokens here so they can be staked together
                _amount = _amount.add(incentiveKgl);
                incentiveKgl = 0;
            }
        }else{
            //move tokens here
            IERC20(kgl).safeTransferFrom(msg.sender, address(this), _amount);
            //defer lock cost to another user
            uint256 callIncentive = _amount.mul(lockIncentive).div(FEE_DENOMINATOR);
            _amount = _amount.sub(callIncentive);

            //add to a pool for lock caller
            incentiveKgl = incentiveKgl.add(callIncentive);
        }

        bool depositOnly = _stakeAddress == address(0);
        if(depositOnly){
            //mint for msg.sender
            ITokenMinter(minter).mint(msg.sender,_amount);
        }else{
            //mint here
            ITokenMinter(minter).mint(address(this),_amount);
            //stake for msg.sender
            IERC20(minter).safeApprove(_stakeAddress,0);
            IERC20(minter).safeApprove(_stakeAddress,_amount);
            IRewards(_stakeAddress).stakeFor(msg.sender,_amount);
        }
    }

    function deposit(uint256 _amount, bool _lock) external {
        deposit(_amount,_lock,address(0));
    }

    function depositAll(bool _lock, address _stakeAddress) external{
        uint256 kglBal = IERC20(kgl).balanceOf(msg.sender);
        deposit(kglBal,_lock,_stakeAddress);
    }
}
