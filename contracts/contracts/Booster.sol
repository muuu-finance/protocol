// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "./Interfaces.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Booster is Ownable {
  using SafeERC20 for IERC20;
  using Address for address;
  using SafeMath for uint256;

  address public kgl;
  uint256 public distributionAddressId;
  address public voteOwnership;
  address public voteParameter;

  uint256 public lockIncentive = 1000; //incentive to kgl stakers
  uint256 public stakerIncentive = 500; //incentive to native token stakers
  uint256 public earmarkIncentive = 0; //incentive to users who spend gas to make calls
  uint256 public nativeTokenLockIncentive = 100; //incentive to native token lockers (in addition to stakerIncentive)
  uint256 public constant MaxFees = 2000;
  uint256 public constant FEE_DENOMINATOR = 10000;
  uint256 public rewardMultiplier = 8250; // 0.0825
  uint256 public constant MULTIPLIER_DENOMINATOR = 100000;

  address public feeManager;
  address public poolManager;
  address public immutable staker;
  address public immutable minter;
  address public rewardFactory;
  address public stashFactory;
  address public tokenFactory;
  address public rewardArbitrator;
  address public voteDelegate;
  address public lockerStakingProxy; // stakingProxy for Locker
  address public stakerRewards; //muuu rewards
  address public lockRewards; //muKgl rewards(kgl)
  address public lockFees; //muKgl vekgl fees
  address public feeDistro; // FeeDisributor
  address public feeToken; // fee token from FeeDisributor
  address public registry;

  bool public isShutdown;

  struct PoolInfo {
    address lptoken;
    address token;
    address gauge;
    address kglRewards;
    address stash;
    bool shutdown;
  }

  //index(pid) -> pool
  PoolInfo[] public poolInfo;
  mapping(address => bool) public gaugeMap;

  event Deposited(address indexed user, uint256 indexed poolid, uint256 amount);
  event Withdrawn(address indexed user, uint256 indexed poolid, uint256 amount);
  event PoolAdded(address lptoken, address gauge, uint256 stashVersion);
  event PoolShutdown(uint256 pid);
  event RewardsEarmarked(uint256 pid);
  event FeesEarmarked();

  constructor(
    address _staker,
    address _minter,
    address _kgl,
    address _registry
  ) public {
    isShutdown = false;
    staker = _staker;
    voteDelegate = msg.sender;
    feeManager = msg.sender;
    poolManager = msg.sender;
    feeDistro = address(0); // set by #setFeeInfo
    feeToken = address(0); // set by #setFeeInfo
    lockerStakingProxy = address(0);
    minter = _minter;
    kgl = _kgl;
    registry = _registry;
    voteOwnership = address(0);
    voteParameter = address(0);
    distributionAddressId = 4;
  }

  /// SETTER SECTION ///
  function setKgl(address _kgl) external onlyOwner {
    kgl = _kgl;
  }

  function setFeeManager(address _feeM) external {
    require(msg.sender == feeManager, "!auth");
    feeManager = _feeM;
  }

  function setPoolManager(address _poolM) external {
    require(msg.sender == poolManager, "!auth");
    poolManager = _poolM;
  }

  function setFactories(
    address _rfactory,
    address _sfactory,
    address _tfactory
  ) external {
    require(msg.sender == owner(), "!auth");

    //reward factory only allow this to be called once even if owner
    //removes ability to inject malicious staking contracts
    //token factory can also be immutable
    if (rewardFactory == address(0)) {
      rewardFactory = _rfactory;
      tokenFactory = _tfactory;
    }

    //stash factory should be considered more safe to change
    //updating may be required to handle new types of gauges
    stashFactory = _sfactory;
  }

  function setArbitrator(address _arb) external {
    require(msg.sender == owner(), "!auth");
    rewardArbitrator = _arb;
  }

  function setVoteDelegate(address _voteDelegate) external {
    require(msg.sender == voteDelegate, "!auth");
    voteDelegate = _voteDelegate;
  }

  function setRewardContracts(address _rewards, address _stakerRewards) external {
    require(msg.sender == owner(), "!auth");

    //reward contracts are immutable or else the owner
    //has a means to redeploy and mint muuu via rewardClaimed()
    if (lockRewards == address(0)) {
      lockRewards = _rewards;
      stakerRewards = _stakerRewards;
    }
  }

  function setDistributionAddressId(uint _distributionAddressId) external {
    require(msg.sender == feeManager, "!auth");
    distributionAddressId = _distributionAddressId;
  }

  // Set reward token and claim contract, get from Kagla's registry
  function setFeeInfo() external {
    require(msg.sender == feeManager, "!auth");

    feeDistro = IAddressProvider(registry).get_address(distributionAddressId);
    address _feeToken = IFeeDistro(feeDistro).token();
    if (feeToken != _feeToken) {
      //create a new reward contract for the new token
      lockFees = IRewardFactory(rewardFactory).CreateTokenRewards(
        _feeToken,
        lockRewards,
        address(this)
      );
      feeToken = _feeToken;
    }
  }

  function setFees(
    uint256 _lockFees,
    uint256 _stakerFees,
    uint256 _callerFees,
    uint256 _nativeTokenLockFees
  ) external {
    require(msg.sender == feeManager, "!auth");

    uint256 total = _lockFees.add(_stakerFees).add(_callerFees).add(_nativeTokenLockFees);
    require(total <= MaxFees, ">MaxFees");

    //values must be within certain ranges
    if (
      _lockFees >= 1000 &&
      _lockFees <= 1500 &&
      _stakerFees >= 300 &&
      _stakerFees <= 600 &&
      _callerFees >= 0 &&
      _callerFees <= 100 &&
      _nativeTokenLockFees <= 200
    ) {
      lockIncentive = _lockFees;
      stakerIncentive = _stakerFees;
      earmarkIncentive = _callerFees;
      nativeTokenLockIncentive = _nativeTokenLockFees;
    }
  }

  function setLockerStakingProxy(address _lockerStakingProxy) external {
    require(msg.sender == feeManager, "!auth");
    lockerStakingProxy = _lockerStakingProxy;
  }

  function setRegistry(address _registry) external {
    require(msg.sender == owner(), "!auth");
    registry = _registry;
  }

  function setRewardMultiplier(uint256 _rewardMultiplier) external onlyOwner {
    require(
      _rewardMultiplier > 0 && _rewardMultiplier <= MULTIPLIER_DENOMINATOR,
      "rewardMultiplier should be 0-100000"
    );
    rewardMultiplier = _rewardMultiplier;
  }

  function setVoteOwnership(address _voteOwnership) external onlyOwner {
    require(_voteOwnership != address(0), "voteOwnership should not be zero address");
    voteOwnership = _voteOwnership;
  }

  function setVoteParameter(address _voteParameter) external onlyOwner {
    require(_voteParameter != address(0), "voteParameter should not be zero address");
    voteParameter = _voteParameter;
  }

  /// END SETTER SECTION ///

  function poolLength() external view returns (uint256) {
    return poolInfo.length;
  }

  //create a new pool
  function addPool(
    address _lptoken,
    address _gauge,
    uint256 _stashVersion
  ) external returns (bool) {
    require(msg.sender == poolManager && !isShutdown, "!add");
    require(_gauge != address(0) && _lptoken != address(0), "!param");

    //the next pool's pid
    uint256 pid = poolInfo.length;

    //create a tokenized deposit
    address token = ITokenFactory(tokenFactory).CreateDepositToken(_lptoken);
    //create a reward contract for kgl rewards
    address newRewardPool = IRewardFactory(rewardFactory).CreateKglRewards(pid, token);
    //create a stash to handle extra incentives
    address stash = address(0);
    if (_stashVersion != 0) {
      stash = IStashFactory(stashFactory).CreateStash(pid, _gauge, staker, _stashVersion);
    }

    //add the new pool
    poolInfo.push(
      PoolInfo({
        lptoken: _lptoken,
        token: token,
        gauge: _gauge,
        kglRewards: newRewardPool,
        stash: stash,
        shutdown: false
      })
    );
    gaugeMap[_gauge] = true;
    //give stashes access to rewardfactory and voteproxy
    //   voteproxy so it can grab the incentive tokens off the contract after claiming rewards
    //   reward factory so that stashes can make new extra reward contracts if a new incentive is added to the gauge
    if (stash != address(0)) {
      IStaker(staker).setStashAccess(stash, true);
      IRewardFactory(rewardFactory).setAccess(stash, true);
    }
    emit PoolAdded(_lptoken, _gauge, _stashVersion);
    return true;
  }

  //shutdown pool
  function shutdownPool(uint256 _pid) external returns (bool) {
    require(msg.sender == poolManager, "!auth");
    PoolInfo storage pool = poolInfo[_pid];

    //withdraw from gauge
    try IStaker(staker).withdrawAll(pool.lptoken, pool.gauge) {} catch {}

    pool.shutdown = true;
    gaugeMap[pool.gauge] = false;
    emit PoolShutdown(_pid);
    return true;
  }

  //shutdown this contract.
  //  unstake and pull all lp tokens to this address
  //  only allow withdrawals
  function shutdownSystem() external {
    require(msg.sender == owner(), "!auth");
    isShutdown = true;

    for (uint i = 0; i < poolInfo.length; i++) {
      PoolInfo storage pool = poolInfo[i];
      if (pool.shutdown) continue;

      address token = pool.lptoken;
      address gauge = pool.gauge;

      //withdraw from gauge
      try IStaker(staker).withdrawAll(token, gauge) {
        pool.shutdown = true;
      } catch {}
    }
  }

  //deposit lp tokens and stake
  function deposit(
    uint256 _pid,
    uint256 _amount,
    bool _stake
  ) public returns (bool) {
    require(!isShutdown, "shutdown");
    PoolInfo storage pool = poolInfo[_pid];
    require(pool.shutdown == false, "pool is closed");

    //send to proxy to stake
    address lptoken = pool.lptoken;
    IERC20(lptoken).safeTransferFrom(msg.sender, staker, _amount);

    //stake
    address gauge = pool.gauge;
    require(gauge != address(0), "!gauge setting");
    IStaker(staker).deposit(lptoken, gauge);

    //some gauges claim rewards when depositing, stash them in a seperate contract until next claim
    address stash = pool.stash;
    if (stash != address(0)) {
      IStash(stash).stashRewards();
    }

    address token = pool.token;
    if (_stake) {
      //mint here and send to rewards on user behalf
      ITokenMinter(token).mint(address(this), _amount);
      address rewardContract = pool.kglRewards;
      IERC20(token).safeApprove(rewardContract, 0);
      IERC20(token).safeApprove(rewardContract, _amount);
      IRewards(rewardContract).stakeFor(msg.sender, _amount);
    } else {
      //add user balance directly
      ITokenMinter(token).mint(msg.sender, _amount);
    }

    emit Deposited(msg.sender, _pid, _amount);
    return true;
  }

  //deposit all lp tokens and stake
  function depositAll(uint256 _pid, bool _stake) external returns (bool) {
    address lptoken = poolInfo[_pid].lptoken;
    uint256 balance = IERC20(lptoken).balanceOf(msg.sender);
    deposit(_pid, balance, _stake);
    return true;
  }

  //withdraw lp tokens
  function _withdraw(
    uint256 _pid,
    uint256 _amount,
    address _from,
    address _to
  ) internal {
    PoolInfo storage pool = poolInfo[_pid];
    address lptoken = pool.lptoken;
    address gauge = pool.gauge;

    //remove lp balance
    address token = pool.token;
    ITokenMinter(token).burn(_from, _amount);

    //pull from gauge if not shutdown
    // if shutdown tokens will be in this contract
    if (!pool.shutdown) {
      IStaker(staker).withdraw(lptoken, gauge, _amount);
    }

    //some gauges claim rewards when withdrawing, stash them in a seperate contract until next claim
    //do not call if shutdown since stashes wont have access
    address stash = pool.stash;
    if (stash != address(0) && !isShutdown && !pool.shutdown) {
      IStash(stash).stashRewards();
    }

    //return lp tokens
    IERC20(lptoken).safeTransfer(_to, _amount);

    emit Withdrawn(_to, _pid, _amount);
  }

  //withdraw lp tokens
  function withdraw(uint256 _pid, uint256 _amount) public returns (bool) {
    _withdraw(_pid, _amount, msg.sender, msg.sender);
    return true;
  }

  //withdraw all lp tokens
  function withdrawAll(uint256 _pid) public returns (bool) {
    address token = poolInfo[_pid].token;
    uint256 userBal = IERC20(token).balanceOf(msg.sender);
    withdraw(_pid, userBal);
    return true;
  }

  //allow reward contracts to send here and withdraw to user
  function withdrawTo(
    uint256 _pid,
    uint256 _amount,
    address _to
  ) external returns (bool) {
    address rewardContract = poolInfo[_pid].kglRewards;
    require(msg.sender == rewardContract, "!auth");

    _withdraw(_pid, _amount, msg.sender, _to);
    return true;
  }

  //delegate address votes on dao
  function vote(
    uint256 _voteId,
    address _votingAddress,
    bool _support
  ) external returns (bool) {
    require(msg.sender == voteDelegate, "!auth");
    require(_votingAddress == voteOwnership || _votingAddress == voteParameter, "!voteAddr");

    IStaker(staker).vote(_voteId, _votingAddress, _support);
    return true;
  }

  function voteGaugeWeight(address[] calldata _gauge, uint256[] calldata _weight)
    external
    returns (bool)
  {
    require(msg.sender == voteDelegate, "!auth");

    for (uint256 i = 0; i < _gauge.length; i++) {
      IStaker(staker).voteGaugeWeight(_gauge[i], _weight[i]);
    }
    return true;
  }

  function claimRewards(uint256 _pid, address _gauge) external returns (bool) {
    address stash = poolInfo[_pid].stash;
    require(msg.sender == stash, "!auth");

    IStaker(staker).claimRewards(_gauge);
    return true;
  }

  function setGaugeRedirect(uint256 _pid) external returns (bool) {
    address stash = poolInfo[_pid].stash;
    require(msg.sender == stash, "!auth");
    address gauge = poolInfo[_pid].gauge;
    bytes memory data = abi.encodeWithSelector(
      bytes4(keccak256("set_rewards_receiver(address)")),
      stash
    );
    IStaker(staker).execute(gauge, uint256(0), data);
    return true;
  }

  //claim kgl and extra rewards and disperse to reward contracts
  function _earmarkRewards(uint256 _pid) internal {
    PoolInfo storage pool = poolInfo[_pid];
    require(pool.shutdown == false, "pool is closed");

    address gauge = pool.gauge;

    //claim kgl
    IStaker(staker).claimKgl(gauge);

    //check if there are extra rewards
    address stash = pool.stash;
    if (stash != address(0)) {
      //claim extra rewards
      IStash(stash).claimRewards();
      //process extra rewards
      IStash(stash).processStash();
    }

    //kgl balance
    uint256 kglBal = IERC20(kgl).balanceOf(address(this));

    if (kglBal > 0) {
      uint256 _lockIncentive = kglBal.mul(lockIncentive).div(FEE_DENOMINATOR);
      uint256 _stakerIncentive = kglBal.mul(stakerIncentive).div(FEE_DENOMINATOR);
      uint256 _callIncentive = kglBal.mul(earmarkIncentive).div(FEE_DENOMINATOR);

      //send stakingProxy for locker
      if (
        lockerStakingProxy != address(0) &&
        lockerStakingProxy != address(this) &&
        nativeTokenLockIncentive > 0
      ) {
        //only subtract after address condition check
        uint256 _nativeTokenLockIncentive = kglBal.mul(nativeTokenLockIncentive).div(
          FEE_DENOMINATOR
        );
        kglBal = kglBal.sub(_nativeTokenLockIncentive);
        IERC20(kgl).safeTransfer(lockerStakingProxy, _nativeTokenLockIncentive);
      }

      //remove incentives from balance
      kglBal = kglBal.sub(_lockIncentive).sub(_callIncentive).sub(_stakerIncentive);

      //send incentives for calling
      IERC20(kgl).safeTransfer(msg.sender, _callIncentive);

      //send kgl to lp provider reward contract
      address rewardContract = pool.kglRewards;
      IERC20(kgl).safeTransfer(rewardContract, kglBal);
      IRewards(rewardContract).queueNewRewards(kglBal);

      //send lockers' share of kgl to reward contract
      IERC20(kgl).safeTransfer(lockRewards, _lockIncentive);
      IRewards(lockRewards).queueNewRewards(_lockIncentive);

      //send stakers's share of kgl to reward contract
      IERC20(kgl).safeTransfer(stakerRewards, _stakerIncentive);
      IRewards(stakerRewards).queueNewRewards(_stakerIncentive);
    }
  }

  function earmarkRewards(uint256 _pid) external returns (bool) {
    require(!isShutdown, "shutdown");
    _earmarkRewards(_pid);
    emit RewardsEarmarked(_pid);
    return true;
  }

  //claim fees from kagla distro contract, put in lockers' reward contract
  function earmarkFees() external returns (bool) {
    //claim fee rewards
    IStaker(staker).claimFees(feeDistro, feeToken);
    //send fee rewards to reward contract
    uint256 _balance = IERC20(feeToken).balanceOf(address(this));
    IERC20(feeToken).safeTransfer(lockFees, _balance);
    IRewards(lockFees).queueNewRewards(_balance);
    emit FeesEarmarked();
    return true;
  }

  //callback from reward contract when kgl is received.
  function rewardClaimed(
    uint256 _pid,
    address _address,
    uint256 _amount
  ) external returns (bool) {
    address rewardContract = poolInfo[_pid].kglRewards;
    require(msg.sender == rewardContract || msg.sender == lockRewards, "!auth");

    _amount = _amount.mul(rewardMultiplier).div(MULTIPLIER_DENOMINATOR);
    //mint reward tokens
    ITokenMinter(minter).mint(_address, _amount);

    return true;
  }
}
