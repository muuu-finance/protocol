// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "./interfaces/MathUtil.sol";
import "./interfaces/ILockedMuuu.sol";
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC20/SafeERC20.sol';
import '@openzeppelin/contracts/math/SafeMath.sol';
import '@openzeppelin/contracts/access/Ownable.sol';


interface IBasicRewards{
    function getReward(address _account, bool _claimExtras) external;
    function getReward(address _account) external;
    function getReward(address _account, address _token) external;
    function stakeFor(address, uint256) external;
}

interface IMuuuRewards{
    function getReward(address _account, bool _claimExtras, bool _stake) external;
}

interface IChefRewards{
    function claim(uint256 _pid, address _account) external;
}

interface IMuuuCrvDeposit{
    function deposit(uint256, bool) external;
}

interface ISwapExchange {

    function exchange(
        int128,
        int128,
        uint256,
        uint256
    ) external returns (uint256);
}

//Claim zap to bundle various reward claims
//v2:
// - change exchange to use kagla pool
// - add getReward(address,token) type
// - add option to lock cvx
// - add option use all funds in wallet
contract ClaimZap is Ownable {
    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    address public crv;
    address public cvx;
    address public cvxCrv;
    address public crvDeposit;
    address public cvxCrvRewards;
    address public cvxRewards;
    address public exchange; //Factory cvxKGL in kagla
    address public locker;  //MuuuLockerV2

    enum Options{
        ClaimMuuu, //1
        ClaimMuuuAndStake, //2
        ClaimMuuuCrv, //4
        ClaimLockedMuuu, //8
        ClaimLockedMuuuStake, //16
        LockCrvDeposit, //32
        UseAllWalletFunds, //64
        LockMuuu //128
    }

    constructor(address _crv, address _cvx, address _cvxCrv, address _crvDeposit, address _cvxCrvRewards, address _cvxRewards, address _exchange, address _locker ) public {
        crv = _crv;
        cvx = _cvx;
        cvxCrv = _cvxCrv;
        crvDeposit = _crvDeposit;
        cvxCrvRewards = _cvxCrvRewards;
        cvxRewards = _cvxRewards;
        exchange = _exchange;
        locker = _locker;
    }

    function getName() external pure returns (string memory) {
        return "ClaimZap V2.0";
    }

    function setApprovals() external onlyOwner {
        IERC20(crv).safeApprove(crvDeposit, 0);
        IERC20(crv).safeApprove(crvDeposit, uint256(-1));
        IERC20(crv).safeApprove(exchange, 0);
        IERC20(crv).safeApprove(exchange, uint256(-1));

        IERC20(cvx).safeApprove(cvxRewards, 0);
        IERC20(cvx).safeApprove(cvxRewards, uint256(-1));

        IERC20(cvxCrv).safeApprove(cvxCrvRewards, 0);
        IERC20(cvxCrv).safeApprove(cvxCrvRewards, uint256(-1));

        IERC20(cvx).safeApprove(locker, 0);
        IERC20(cvx).safeApprove(locker, uint256(-1));
    }

    function CheckOption(uint256 _mask, uint256 _flag) internal pure returns(bool){
        return (_mask & (1<<_flag)) != 0;
    }

    function claimRewards(
        address[] calldata rewardContracts,
        address[] calldata extraRewardContracts,
        address[] calldata tokenRewardContracts,
        address[] calldata tokenRewardTokens,
        uint256 depositCrvMaxAmount,
        uint256 minAmountOut,
        uint256 depositMuuuMaxAmount,
        uint256 spendMuuuAmount,
        uint256 options
        ) external{

        uint256 crvBalance = IERC20(crv).balanceOf(msg.sender);
        uint256 cvxBalance = IERC20(cvx).balanceOf(msg.sender);

        //claim from main kagla LP pools
        for(uint256 i = 0; i < rewardContracts.length; i++){
            IBasicRewards(rewardContracts[i]).getReward(msg.sender,true);
        }
        //claim from extra rewards
        for(uint256 i = 0; i < extraRewardContracts.length; i++){
            IBasicRewards(extraRewardContracts[i]).getReward(msg.sender);
        }
        //claim from multi reward token contract
        for(uint256 i = 0; i < tokenRewardContracts.length; i++){
            IBasicRewards(tokenRewardContracts[i]).getReward(msg.sender,tokenRewardTokens[i]);
        }

        //claim others/deposit/lock/stake
        _claimExtras(depositCrvMaxAmount,minAmountOut,depositMuuuMaxAmount,spendMuuuAmount,crvBalance,cvxBalance,options);
    }

    function _claimExtras(
        uint256 depositCrvMaxAmount,
        uint256 minAmountOut,
        uint256 depositMuuuMaxAmount,
        uint256 spendMuuuAmount,
        uint256 removeCrvBalance,
        uint256 removeMuuuBalance,
        uint256 options
        ) internal{

        //claim (and stake) from cvx rewards
        if(CheckOption(options,uint256(Options.ClaimMuuuAndStake))){
            IMuuuRewards(cvxRewards).getReward(msg.sender,true,true);
        }else if(CheckOption(options,uint256(Options.ClaimMuuu))){
            IMuuuRewards(cvxRewards).getReward(msg.sender,true,false);
        }

        //claim from cvxCrv rewards
        if(CheckOption(options,uint256(Options.ClaimMuuuCrv))){
            IBasicRewards(cvxCrvRewards).getReward(msg.sender,true);
        }

        //claim from locker
        if(CheckOption(options,uint256(Options.ClaimLockedMuuu))){
            ILockedMuuu(locker).getReward(msg.sender,CheckOption(options,uint256(Options.ClaimLockedMuuuStake)));
        }

        //reset remove balances if we want to also stake/lock funds already in our wallet
        if(CheckOption(options,uint256(Options.UseAllWalletFunds))){
            removeCrvBalance = 0;
            removeMuuuBalance = 0;
        }

        //lock upto given amount of crv and stake
        if(depositCrvMaxAmount > 0){
            uint256 crvBalance = IERC20(crv).balanceOf(msg.sender).sub(removeCrvBalance);
            crvBalance = MathUtil.min(crvBalance, depositCrvMaxAmount);
            if(crvBalance > 0){
                //pull crv
                IERC20(crv).safeTransferFrom(msg.sender, address(this), crvBalance);
                if(minAmountOut > 0){
                    //swap
                    ISwapExchange(exchange).exchange(0,1,crvBalance,minAmountOut);
                }else{
                    //deposit
                    IMuuuCrvDeposit(crvDeposit).deposit(crvBalance,CheckOption(options,uint256(Options.LockCrvDeposit)));
                }
                //get cvxcrv amount
                uint256 cvxCrvBalance = IERC20(cvxCrv).balanceOf(address(this));
                //stake for msg.sender
                IBasicRewards(cvxCrvRewards).stakeFor(msg.sender, cvxCrvBalance);
            }
        }

        //stake up to given amount of cvx
        if(depositMuuuMaxAmount > 0){
            uint256 cvxBalance = IERC20(cvx).balanceOf(msg.sender).sub(removeMuuuBalance);
            cvxBalance = MathUtil.min(cvxBalance, depositMuuuMaxAmount);
            if(cvxBalance > 0){
                //pull cvx
                IERC20(cvx).safeTransferFrom(msg.sender, address(this), cvxBalance);
                if(CheckOption(options,uint256(Options.LockMuuu))){
                    ILockedMuuu(locker).lock(msg.sender, cvxBalance, spendMuuuAmount);
                }else{
                    //stake for msg.sender
                    IBasicRewards(cvxRewards).stakeFor(msg.sender, cvxBalance);
                }
            }
        }
    }

}
