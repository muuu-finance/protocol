// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "./interfaces/IRewardStaking.sol";
import "./interfaces/ILockedMuuu.sol";
import "./interfaces/IDelegation.sol";
import "./interfaces/IKglDepositor.sol";
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/utils/Address.sol';
import '@openzeppelin/contracts/token/ERC20/SafeERC20.sol';


//Basic functionality to integrate with locking cvx
contract BasicMuuuHolder{
    using SafeERC20 for IERC20;
    using Address for address;


    address public constant cvxKgl = address(0x62B9c7356A2Dc64a1969e19C23e4f579F9810Aa7);
    address public constant cvxkglStaking = address(0x3Fe65692bfCD0e6CF84cB1E7d24108E434A7587e);
    address public constant cvx = address(0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B);
    address public constant kgl = address(0xD533a949740bb3306d119CC777fa900bA034cd52);
    address public constant kglDeposit = address(0x8014595F2AB54cD7c604B00E9fb932176fDc86Ae);

    address public operator;
    ILockedMuuu public immutable cvxlocker;

    constructor(address _cvxlocker) public {
        cvxlocker = ILockedMuuu(_cvxlocker);
        operator = msg.sender;
    }

    function setApprovals() external {
        IERC20(cvxKgl).safeApprove(cvxkglStaking, 0);
        IERC20(cvxKgl).safeApprove(cvxkglStaking, uint256(-1));

        IERC20(cvx).safeApprove(address(cvxlocker), 0);
        IERC20(cvx).safeApprove(address(cvxlocker), uint256(-1));

        IERC20(kgl).safeApprove(kglDeposit, 0);
        IERC20(kgl).safeApprove(kglDeposit, uint256(-1));
    }

    function setOperator(address _op) external {
        require(msg.sender == operator, "!auth");
        operator = _op;
    }

    function setDelegate(address _delegateContract, address _delegate) external{
        require(msg.sender == operator, "!auth");
        // IDelegation(_delegateContract).setDelegate(keccak256("cvx.eth"), _delegate);
        IDelegation(_delegateContract).setDelegate("cvx.eth", _delegate);
    }

    function lock(uint256 _amount, uint256 _spendRatio) external{
        require(msg.sender == operator, "!auth");

        if(_amount > 0){
            IERC20(cvx).safeTransferFrom(msg.sender, address(this), _amount);
        }
        _amount = IERC20(cvx).balanceOf(address(this));

        cvxlocker.lock(address(this),_amount,_spendRatio);
    }

    function processExpiredLocks(bool _relock, uint256 _spendRatio) external{
        require(msg.sender == operator, "!auth");

        cvxlocker.processExpiredLocks(_relock, _spendRatio, address(this));
    }

    function processRewards() external{
        require(msg.sender == operator, "!auth");

        cvxlocker.getReward(address(this), true);
        IRewardStaking(cvxkglStaking).getReward(address(this), true);

        uint256 kglBal = IERC20(kgl).balanceOf(address(this));
        if (kglBal > 0) {
            IKglDepositor(kglDeposit).deposit(kglBal, true);
        }

        uint cvxkglBal = IERC20(cvxKgl).balanceOf(address(this));
        if(cvxkglBal > 0){
            IRewardStaking(cvxkglStaking).stake(cvxkglBal);
        }
    }

    function withdrawMuuuKgl(uint256 _amount, address _withdrawTo) external{
        require(msg.sender == operator, "!auth");
        require(_withdrawTo != address(0),"bad address");

        IRewardStaking(cvxkglStaking).withdraw(_amount, true);
        uint cvxkglBal = IERC20(cvxKgl).balanceOf(address(this));
        if(cvxkglBal > 0){
            IERC20(cvxKgl).safeTransfer(_withdrawTo, cvxkglBal);
        }
    }

    function withdrawTo(IERC20 _asset, uint256 _amount, address _to) external {
    	require(msg.sender == operator, "!auth");

        _asset.safeTransfer(_to, _amount);
    }

    function execute(
        address _to,
        uint256 _value,
        bytes calldata _data
    ) external returns (bool, bytes memory) {
        require(msg.sender == operator,"!auth");

        (bool success, bytes memory result) = _to.call{value:_value}(_data);

        return (success, result);
    }

}
