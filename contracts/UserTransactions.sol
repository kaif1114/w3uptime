pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

contract UserWithdrawal is Ownable, ReentrancyGuard, Pausable {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    address public authorizedSigner;
    mapping(uint256 => bool) public usedNonces;
    
    uint256 public minWithdrawalAmount;
    uint256 public maxWithdrawalAmount;

    event Withdrawal(
        address indexed user,
        uint256 amount,
        uint256 nonce,
        uint256 timestamp
    );
    
    event FundsDeposited(
        address indexed from,
        uint256 amount,
        uint256 timestamp
    );
    
    event AuthorizedSignerChanged(
        address indexed oldSigner,
        address indexed newSigner,
        uint256 timestamp
    );
    
    event WithdrawalLimitsUpdated(
        uint256 minAmount,
        uint256 maxAmount,
        uint256 timestamp
    );
    
    event EmergencyWithdrawal(
        address indexed recipient,
        uint256 amount,
        uint256 timestamp
    );


    error InvalidAmount();
    error InsufficientContractBalance();
    error AuthorizationExpired();
    error NonceAlreadyUsed();
    error InvalidSignature();
    error TransferFailed();
    error InvalidAddress();
    error AmountBelowMinimum();
    error AmountAboveMaximum();

    constructor(
        address _authorizedSigner,
        uint256 _minWithdrawalAmount,
        uint256 _maxWithdrawalAmount
    ) Ownable(msg.sender) {
        if (_authorizedSigner == address(0)) revert InvalidAddress();
        if (_minWithdrawalAmount == 0) revert InvalidAmount();
        if (_minWithdrawalAmount >= _maxWithdrawalAmount) revert InvalidAmount();
        
        authorizedSigner = _authorizedSigner;
        minWithdrawalAmount = _minWithdrawalAmount;
        maxWithdrawalAmount = _maxWithdrawalAmount;
    }


    receive() external payable {
        emit FundsDeposited(msg.sender, msg.value, block.timestamp);
    }



    function depositFunds() external payable onlyOwner {
        if (msg.value == 0) revert InvalidAmount();
        emit FundsDeposited(msg.sender, msg.value, block.timestamp);
    }

    function withdraw(
        uint256 amount,
        uint256 nonce,
        uint256 expiry,
        bytes memory signature
    ) external nonReentrant whenNotPaused {
        // Validation checks
        if (amount == 0) revert InvalidAmount();
        if (amount < minWithdrawalAmount) revert AmountBelowMinimum();
        if (amount > maxWithdrawalAmount) revert AmountAboveMaximum();
        if (address(this).balance < amount) revert InsufficientContractBalance();
        if (block.timestamp > expiry) revert AuthorizationExpired();
        if (usedNonces[nonce]) revert NonceAlreadyUsed();


        bytes32 messageHash = getMessageHash(msg.sender, amount, nonce, expiry);
        bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();
        
        address recoveredSigner = ethSignedMessageHash.recover(signature);
        if (recoveredSigner != authorizedSigner) revert InvalidSignature();
        usedNonces[nonce] = true;
        (bool success, ) = msg.sender.call{value: amount}("");
        if (!success) revert TransferFailed();
        emit Withdrawal(msg.sender, amount, nonce, block.timestamp);
    }

    function getMessageHash(
        address user,
        uint256 amount,
        uint256 nonce,
        uint256 expiry
    ) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(user, amount, nonce, expiry));
    }

    function verifySignature(
        address user,
        uint256 amount,
        uint256 nonce,
        uint256 expiry,
        bytes memory signature
    ) public view returns (bool) {
        bytes32 messageHash = getMessageHash(user, amount, nonce, expiry);
        bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();
        address recoveredSigner = ethSignedMessageHash.recover(signature);
        return recoveredSigner == authorizedSigner;
    }

    function setAuthorizedSigner(address newSigner) external onlyOwner {
        if (newSigner == address(0)) revert InvalidAddress();
        address oldSigner = authorizedSigner;
        authorizedSigner = newSigner;
        emit AuthorizedSignerChanged(oldSigner, newSigner, block.timestamp);
    }

    function setWithdrawalLimits(
        uint256 _minAmount,
        uint256 _maxAmount
    ) external onlyOwner {
        if (_minAmount >= _maxAmount) revert InvalidAmount();
        minWithdrawalAmount = _minAmount;
        maxWithdrawalAmount = _maxAmount;
        emit WithdrawalLimitsUpdated(_minAmount, _maxAmount, block.timestamp);
    }
    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function emergencyWithdraw(address payable recipient) external onlyOwner {
        if (recipient == address(0)) revert InvalidAddress();
        uint256 balance = address(this).balance;
        (bool success, ) = recipient.call{value: balance}("");
        if (!success) revert TransferFailed();
        emit EmergencyWithdrawal(recipient, balance, block.timestamp);
    }

    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
    function isNonceUsed(uint256 nonce) external view returns (bool) {
        return usedNonces[nonce];
    }
}