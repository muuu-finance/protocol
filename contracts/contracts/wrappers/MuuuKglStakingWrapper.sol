// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "../interfaces/IRewardStaking.sol";
import "../interfaces/IMuuuDeposits.sol";
import "../interfaces/MuuuMining.sol";
import '@openzeppelin/contracts/math/SafeMath.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC20/SafeERC20.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";


//Example of a tokenize a muuu staked position.
//if used as collateral some modifications will be needed to fit the specific platform
//other considerations: might be worth refactoring to use earned() during checkpoints instead of claiming rewards each time

//Based on Kagla.fi's gauge wrapper implementations at https://github.com/kaglafi/kagla-dao-contracts/tree/master/contracts/gauges/wrappers
contract MuuuKglStakingWrapper is ERC20, ReentrancyGuard {
    using SafeERC20
    for IERC20;
    using SafeMath
    for uint256;

    struct EarnedData {
        address token;
        uint256 amount;
    }

    struct RewardType {
        address reward_token;
        address reward_pool;
        uint128 reward_integral;
        uint128 reward_remaining;
        mapping(address => uint256) reward_integral_for;
        mapping(address => uint256) claimable_reward;
    }

    uint256 public muuu_reward_integral;
    uint256 public muuu_reward_remaining;
    mapping(address => uint256) public muuu_reward_integral_for;
    mapping(address => uint256) public muuu_claimable_reward;

    //constants/immutables
    address public constant kglDepositor = address(0x8014595F2AB54cD7c604B00E9fb932176fDc86Ae);
    address public constant muuuKglStaking = address(0x3Fe65692bfCD0e6CF84cB1E7d24108E434A7587e);
    address public constant kgl = address(0xD533a949740bb3306d119CC777fa900bA034cd52);
    address public constant muuu = address(0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B);
    address public constant muuuKgl = address(0x62B9c7356A2Dc64a1969e19C23e4f579F9810Aa7);

    //collateral vault
    address public collateralVault;

    //rewards
    RewardType[] public rewards;

    //management
    bool public isShutdown;
    bool public isInit;
    address public owner;

    string internal _tokenname;
    string internal _tokensymbol;

    event Deposited(address indexed _user, address indexed _account, uint256 _amount, bool _wrapped);
    event Withdrawn(address indexed _user, uint256 _amount, bool _unwrapped);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);


    constructor() public
        ERC20(
            "Staked MuuuKgl",
            "stkMuuuKgl"
        ){
    }

    function initialize(address _vault)
    virtual external {
        require(!isInit,"already init");
        owner = address(0xa3C5A1e09150B75ff251c1a7815A07182c3de2FB); //default to muuu multisig
        emit OwnershipTransferred(address(0), owner);

        _tokenname = "Staked MuuuKgl";
        _tokensymbol = "stkMuuuKgl";
        isShutdown = false;
        isInit = true;
        collateralVault = _vault;

        //add rewards
        addRewards();
        setApprovals();
    }

    function name() public view override returns (string memory) {
        return _tokenname;
    }

    function symbol() public view override returns (string memory) {
        return _tokensymbol;
    }

    function decimals() public view override returns (uint8) {
        return 18;
    }

     modifier onlyOwner() {
        require(owner == msg.sender, "Ownable: caller is not the owner");
        _;
    }

    function transferOwnership(address newOwner) public virtual onlyOwner {
        require(newOwner != address(0), "Ownable: new owner is the zero address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    function renounceOwnership() public virtual onlyOwner {
        emit OwnershipTransferred(owner, address(0));
        owner = address(0);
    }

    function shutdown() external onlyOwner {
        isShutdown = true;
    }

    function setApprovals() public {
        IERC20(kgl).safeApprove(kglDepositor, 0);
        IERC20(kgl).safeApprove(kglDepositor, uint256(-1));
        IERC20(muuuKgl).safeApprove(muuuKglStaking, 0);
        IERC20(muuuKgl).safeApprove(muuuKglStaking, uint256(-1));
    }

    function addRewards() public {

        if (rewards.length == 0) {
            rewards.push(
                RewardType({
                    reward_token: kgl,
                    reward_pool: muuuKglStaking,
                    reward_integral: 0,
                    reward_remaining: 0
                })
            );
        }

        uint256 extraCount = IRewardStaking(muuuKglStaking).extraRewardsLength();
        uint256 startIndex = rewards.length - 1;
        for (uint256 i = startIndex; i < extraCount; i++) {
            address extraPool = IRewardStaking(muuuKglStaking).extraRewards(i);
            rewards.push(
                RewardType({
                    reward_token: IRewardStaking(extraPool).rewardToken(),
                    reward_pool: extraPool,
                    reward_integral: 0,
                    reward_remaining: 0
                })
            );
        }
    }

    function rewardLength() external view returns(uint256) {
        return rewards.length;
    }

    function _getDepositedBalance(address _account) internal virtual view returns(uint256) {
        if (_account == address(0) || _account == collateralVault) {
            return 0;
        }

        //override and add any balance needed (deposited balance)

        return balanceOf(_account);
    }

    function _getTotalSupply() internal virtual view returns(uint256){

        //override and add any supply needed (interest based growth)

        return totalSupply();
    }

    function _calcMuuuIntegral(address[2] memory _accounts, uint256[2] memory _balances, uint256 _supply, bool _isClaim) internal {

        uint256 bal = IERC20(muuu).balanceOf(address(this));
        uint256 d_muuureward = bal.sub(muuu_reward_remaining);

        if (_supply > 0 && d_muuureward > 0) {
            muuu_reward_integral = muuu_reward_integral + d_muuureward.mul(1e20).div(_supply);
        }


        //update user integrals for muuu
        for (uint256 u = 0; u < _accounts.length; u++) {
            //do not give rewards to address 0
            if (_accounts[u] == address(0)) continue;
            if (_accounts[u] == collateralVault) continue;

            uint userI = muuu_reward_integral_for[_accounts[u]];
            if(_isClaim || userI < muuu_reward_integral){
                uint256 receiveable = muuu_claimable_reward[_accounts[u]].add(_balances[u].mul(muuu_reward_integral.sub(userI)).div(1e20));
                if(_isClaim){
                    if(receiveable > 0){
                        muuu_claimable_reward[_accounts[u]] = 0;
                        IERC20(muuu).safeTransfer(_accounts[u], receiveable);
                        bal = bal.sub(receiveable);
                    }
                }else{
                    muuu_claimable_reward[_accounts[u]] = receiveable;
                }
                muuu_reward_integral_for[_accounts[u]] = muuu_reward_integral;
           }
        }

        //update reward total
        if(bal != muuu_reward_remaining){
            muuu_reward_remaining = bal;
        }
    }

    function _calcRewardIntegral(uint256 _index, address[2] memory _accounts, uint256[2] memory _balances, uint256 _supply, bool _isClaim) internal{
         RewardType storage reward = rewards[_index];

        //get difference in balance and remaining rewards
        //getReward is unguarded so we use reward_remaining to keep track of how much was actually claimed
        uint256 bal = IERC20(reward.reward_token).balanceOf(address(this));
        // uint256 d_reward = bal.sub(reward.reward_remaining);

        if (_supply > 0 && bal.sub(reward.reward_remaining) > 0) {
            reward.reward_integral = reward.reward_integral + uint128(bal.sub(reward.reward_remaining).mul(1e20).div(_supply));
        }

        //update user integrals
        for (uint256 u = 0; u < _accounts.length; u++) {
            //do not give rewards to address 0
            if (_accounts[u] == address(0)) continue;
            if (_accounts[u] == collateralVault) continue;

            uint userI = reward.reward_integral_for[_accounts[u]];
            if(_isClaim || userI < reward.reward_integral){
                if(_isClaim){
                    uint256 receiveable = reward.claimable_reward[_accounts[u]].add(_balances[u].mul( uint256(reward.reward_integral).sub(userI)).div(1e20));
                    if(receiveable > 0){
                        reward.claimable_reward[_accounts[u]] = 0;
                        IERC20(reward.reward_token).safeTransfer(_accounts[u], receiveable);
                        bal = bal.sub(receiveable);
                    }
                }else{
                    reward.claimable_reward[_accounts[u]] = reward.claimable_reward[_accounts[u]].add(_balances[u].mul( uint256(reward.reward_integral).sub(userI)).div(1e20));
                }
                reward.reward_integral_for[_accounts[u]] = reward.reward_integral;
            }
        }

        //update remaining reward here since balance could have changed if claiming
        if(bal !=  reward.reward_remaining){
            reward.reward_remaining = uint128(bal);
        }
    }

    function _checkpoint(address[2] memory _accounts) internal {
        //if shutdown, no longer checkpoint in case there are problems
        if(isShutdown) return;

        uint256 supply = _getTotalSupply();
        uint256[2] memory depositedBalance;
        depositedBalance[0] = _getDepositedBalance(_accounts[0]);
        depositedBalance[1] = _getDepositedBalance(_accounts[1]);

        IRewardStaking(muuuKglStaking).getReward(address(this), true);

        uint256 rewardCount = rewards.length;
        for (uint256 i = 0; i < rewardCount; i++) {
           _calcRewardIntegral(i,_accounts,depositedBalance,supply,false);
        }
        _calcMuuuIntegral(_accounts,depositedBalance,supply,false);
    }

    function _checkpointAndClaim(address[2] memory _accounts) internal {

        uint256 supply = _getTotalSupply();
        uint256[2] memory depositedBalance;
        depositedBalance[0] = _getDepositedBalance(_accounts[0]); //only do first slot

        IRewardStaking(muuuKglStaking).getReward(address(this), true);

        uint256 rewardCount = rewards.length;
        for (uint256 i = 0; i < rewardCount; i++) {
           _calcRewardIntegral(i,_accounts,depositedBalance,supply,true);
        }
        _calcMuuuIntegral(_accounts,depositedBalance,supply,true);
    }

    function user_checkpoint(address[2] calldata _accounts) external returns(bool) {
        _checkpoint([_accounts[0], _accounts[1]]);
        return true;
    }

    function totalBalanceOf(address _account) external view returns(uint256){
        return _getDepositedBalance(_account);
    }

    function earned(address _account) external view returns(EarnedData[] memory claimable) {
        uint256 supply = _getTotalSupply();
        // uint256 depositedBalance = _getDepositedBalance(_account);
        uint256 rewardCount = rewards.length;
        claimable = new EarnedData[](rewardCount + 1);

        for (uint256 i = 0; i < rewardCount; i++) {
            RewardType storage reward = rewards[i];

            //change in reward is current balance - remaining reward + earned
            uint256 bal = IERC20(reward.reward_token).balanceOf(address(this));
            uint256 d_reward = bal.sub(reward.reward_remaining);
            d_reward = d_reward.add(IRewardStaking(reward.reward_pool).earned(address(this)));

            uint256 I = reward.reward_integral;
            if (supply > 0) {
                I = I + d_reward.mul(1e20).div(supply);
            }

            uint256 newlyClaimable = _getDepositedBalance(_account).mul(I.sub(reward.reward_integral_for[_account])).div(1e20);
            claimable[i].amount = reward.claimable_reward[_account].add(newlyClaimable);
            claimable[i].token = reward.reward_token;

            //calc muuu here
            if(reward.reward_token == kgl){
                claimable[rewardCount].amount = muuu_claimable_reward[_account].add(MuuuMining.ConvertKglToMuuu(newlyClaimable));
                claimable[rewardCount].token = muuu;
            }
        }
        return claimable;
    }

    function getReward(address _account) external {
        //claim directly in checkpoint logic to save a bit of gas
        _checkpointAndClaim([_account, address(0)]);
    }

    //deposit a kagla token
    function deposit(uint256 _amount, address _to) external nonReentrant {
        require(!isShutdown, "shutdown");

        //dont need to call checkpoint since _mint() will

        if (_amount > 0) {
            _mint(_to, _amount);
            IERC20(kgl).safeTransferFrom(msg.sender, address(this), _amount);
            IMuuuDeposits(kglDepositor).deposit(_amount, false, muuuKglStaking);
        }

        emit Deposited(msg.sender, _to, _amount, true);
    }

    //stake a muuu token
    function stake(uint256 _amount, address _to) external nonReentrant {
        require(!isShutdown, "shutdown");

        //dont need to call checkpoint since _mint() will

        if (_amount > 0) {
            _mint(_to, _amount);
            IERC20(muuuKgl).safeTransferFrom(msg.sender, address(this), _amount);
            IRewardStaking(muuuKglStaking).stake(_amount);
        }

        emit Deposited(msg.sender, _to, _amount, false);
    }

    //withdraw to muuu deposit token
    function withdraw(uint256 _amount) external nonReentrant {

        //dont need to call checkpoint since _burn() will

        if (_amount > 0) {
            _burn(msg.sender, _amount);
            IRewardStaking(muuuKglStaking).withdraw(_amount, false);
            IERC20(muuuKgl).safeTransfer(msg.sender, _amount);
        }

        emit Withdrawn(msg.sender, _amount, false);
    }

    function _beforeTokenTransfer(address _from, address _to, uint256 _amount) internal override {
        _checkpoint([_from, _to]);
    }
}
