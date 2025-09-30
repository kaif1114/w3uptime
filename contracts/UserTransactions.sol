// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/**
 * @title UserWithdrawal
 * @notice Allows users to withdraw funds based on backend-authorized signatures
 * @dev Uses ECDSA signature verification to authorize withdrawals
 */
contract UserWithdrawal is Ownable, ReentrancyGuard, Pausable {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    // State variables
    address public authorizedSigner;
    mapping(uint256 => bool) public usedNonces;
    
    // Minimum and maximum withdrawal amounts
    uint256 public minWithdrawalAmount;
    uint256 public maxWithdrawalAmount;

    // Events
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

    // Custom errors (gas efficient)
    error InvalidAmount();
    error InsufficientContractBalance();
    error AuthorizationExpired();
    error NonceAlreadyUsed();
    error InvalidSignature();
    error TransferFailed();
    error InvalidAddress();
    error AmountBelowMinimum();
    error AmountAboveMaximum();

    /**
     * @notice Contract constructor
     * @param _authorizedSigner Address of the backend wallet authorized to sign withdrawals
     * @param _minWithdrawalAmount Minimum amount users can withdraw in a single transaction (in wei)
     * @param _maxWithdrawalAmount Maximum amount users can withdraw in a single transaction (in wei)
     */
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

    /**
     * @notice Allows contract to receive ETH
     * @dev Emits FundsDeposited event when ETH is received
     */
    receive() external payable {
        emit FundsDeposited(msg.sender, msg.value, block.timestamp);
    }

    /**
     * @notice Allows owner to deposit funds into the contract
     * @dev Emits FundsDeposited event
     */
    function depositFunds() external payable onlyOwner {
        if (msg.value == 0) revert InvalidAmount();
        emit FundsDeposited(msg.sender, msg.value, block.timestamp);
    }

    /**
     * @notice Main withdrawal function - users call this to withdraw their funds
     * @param amount Amount of ETH to withdraw (in wei)
     * @param nonce Unique number to prevent replay attacks
     * @param expiry Unix timestamp when this authorization expires
     * @param signature Backend's signature authorizing this withdrawal
     */
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

        // Verify signature
        bytes32 messageHash = getMessageHash(msg.sender, amount, nonce, expiry);
        bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();
        
        address recoveredSigner = ethSignedMessageHash.recover(signature);
        if (recoveredSigner != authorizedSigner) revert InvalidSignature();

        // Mark nonce as used (before transfer - checks-effects-interactions pattern)
        usedNonces[nonce] = true;

        // Transfer funds
        (bool success, ) = msg.sender.call{value: amount}("");
        if (!success) revert TransferFailed();

        // Emit event
        emit Withdrawal(msg.sender, amount, nonce, block.timestamp);
    }

    /**
     * @notice Creates the message hash that needs to be signed by the backend
     * @param user Address of the user requesting withdrawal
     * @param amount Amount to withdraw
     * @param nonce Unique nonce
     * @param expiry Expiry timestamp
     * @return bytes32 The message hash
     */
    function getMessageHash(
        address user,
        uint256 amount,
        uint256 nonce,
        uint256 expiry
    ) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(user, amount, nonce, expiry));
    }

    /**
     * @notice Verifies if a signature is valid for given parameters
     * @dev Useful for frontend to verify before submitting transaction
     * @param user User address
     * @param amount Withdrawal amount
     * @param nonce Unique nonce
     * @param expiry Expiry timestamp
     * @param signature The signature to verify
     * @return bool True if signature is valid
     */
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

    /**
     * @notice Changes the authorized signer address
     * @dev Only owner can call this
     * @param newSigner New authorized signer address
     */
    function setAuthorizedSigner(address newSigner) external onlyOwner {
        if (newSigner == address(0)) revert InvalidAddress();
        address oldSigner = authorizedSigner;
        authorizedSigner = newSigner;
        emit AuthorizedSignerChanged(oldSigner, newSigner, block.timestamp);
    }

    /**
     * @notice Updates withdrawal limits
     * @dev Only owner can call this
     * @param _minAmount New minimum withdrawal amount
     * @param _maxAmount New maximum withdrawal amount
     */
    function setWithdrawalLimits(
        uint256 _minAmount,
        uint256 _maxAmount
    ) external onlyOwner {
        if (_minAmount >= _maxAmount) revert InvalidAmount();
        minWithdrawalAmount = _minAmount;
        maxWithdrawalAmount = _maxAmount;
        emit WithdrawalLimitsUpdated(_minAmount, _maxAmount, block.timestamp);
    }

    /**
     * @notice Pauses all withdrawals
     * @dev Only owner can call this - use in emergencies
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Resumes withdrawals
     * @dev Only owner can call this
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Emergency function to withdraw all funds
     * @dev Only owner can call this - should be multi-sig in production
     * @param recipient Address to receive the funds
     */
    function emergencyWithdraw(address payable recipient) external onlyOwner {
        if (recipient == address(0)) revert InvalidAddress();
        uint256 balance = address(this).balance;
        (bool success, ) = recipient.call{value: balance}("");
        if (!success) revert TransferFailed();
        emit EmergencyWithdrawal(recipient, balance, block.timestamp);
    }

    /**
     * @notice Gets the contract's current ETH balance
     * @return uint256 Contract balance in wei
     */
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }

    /**
     * @notice Checks if a nonce has been used
     * @param nonce The nonce to check
     * @return bool True if nonce has been used
     */
    function isNonceUsed(uint256 nonce) external view returns (bool) {
        return usedNonces[nonce];
    }
}