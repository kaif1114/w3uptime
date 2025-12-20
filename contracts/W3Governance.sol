// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/**
 * @title W3Governance
 * @notice On-chain governance contract for W3Uptime platform
 * @dev Implements direct on-chain voting where users pay gas to vote via transactions
 *
 * Key features:
 * - Proposals stored permanently on-chain with content hash verification
 * - Direct voting (users call vote() function, no signatures)
 * - 2/3 majority required to pass
 * - Configurable voting period per proposal (default 7 days)
 * - Anyone can finalize proposals after voting period ends
 * - Emergency pause capability
 *
 * Security:
 * - ReentrancyGuard prevents reentrancy attacks
 * - Pausable allows emergency停用 of voting
 * - Double voting prevention via mapping
 * - Input validation with custom errors
 */
contract W3Governance is Ownable, ReentrancyGuard, Pausable {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    /*//////////////////////////////////////////////////////////////
                                STRUCTS
    //////////////////////////////////////////////////////////////*/

    struct Proposal {
        uint256 id;
        address proposer;
        bytes32 contentHash;
        uint256 createdAt;
        uint256 votingEndsAt;
        uint256 upvotes;
        uint256 downvotes;
        bool finalized;
        bool passed;
    }

    /*//////////////////////////////////////////////////////////////
                            STATE VARIABLES
    //////////////////////////////////////////////////////////////*/

    /// @notice Mapping from proposal ID to Proposal struct
    mapping(uint256 => Proposal) public proposals;

    /// @notice Nonce-based vote tracking for duplicate prevention (0 = not voted, >0 = voted)
    mapping(uint256 => mapping(address => uint256)) public voteNonces;

    /// @notice Separate vote type tracking for getVote() compatibility (0=not voted, 1=upvote, 2=downvote)
    mapping(uint256 => mapping(address => uint8)) private _voteTypes;

    /// @notice Total number of proposals created
    uint256 public proposalCount;

    /// @notice Minimum voting duration (1 day)
    uint256 public constant MIN_VOTING_DURATION = 1 days;

    /// @notice Maximum voting duration (30 days)
    uint256 public constant MAX_VOTING_DURATION = 30 days;

    /// @notice Reputation points balance for each user
    mapping(address => uint256) public reputationPoints;

    /// @notice Backend authorized signer for reputation claims
    address public platformSigner;

    /// @notice Tracks used nonces to prevent replay attacks
    mapping(uint256 => bool) public usedReputationNonces;

    /// @notice Reputation cost to create a proposal
    uint256 public constant PROPOSAL_REPUTATION_COST = 500;

    /// @notice Reputation cost to cast a vote
    uint256 public constant VOTE_REPUTATION_COST = 100;

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Emitted when a new proposal is created on-chain
     * @param proposalId Unique identifier for the proposal
     * @param proposer Address that created the proposal
     * @param contentHash keccak256 hash of proposal content for verification
     * @param votingEndsAt Timestamp when voting period ends
     * @param timestamp Block timestamp of creation
     */
    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        bytes32 contentHash,
        uint256 votingEndsAt,
        uint256 timestamp
    );

    /**
     * @notice Emitted when a vote is cast
     * @param proposalId Proposal being voted on
     * @param voter Address of the voter
     * @param support true = upvote, false = downvote
     * @param timestamp Block timestamp of vote
     */
    event VoteCast(
        uint256 indexed proposalId,
        address indexed voter,
        bool support,
        uint256 timestamp
    );

    /**
     * @notice Emitted when a proposal is finalized
     * @param proposalId Proposal being finalized
     * @param upvotes Final upvote count
     * @param downvotes Final downvote count
     * @param passed Whether proposal passed (2/3+ majority)
     * @param timestamp Block timestamp of finalization
     */
    event ProposalFinalized(
        uint256 indexed proposalId,
        uint256 upvotes,
        uint256 downvotes,
        bool passed,
        uint256 timestamp
    );

    /**
     * @notice Emitted when reputation is claimed by a user
     * @param user Address claiming reputation
     * @param amount Amount of reputation points claimed
     * @param nonce Unique nonce for this claim
     * @param timestamp Block timestamp of claim
     */
    event ReputationClaimed(
        address indexed user,
        uint256 amount,
        uint256 nonce,
        uint256 timestamp
    );

    /**
     * @notice Emitted when platform signer address is updated
     * @param oldSigner Previous platform signer address
     * @param newSigner New platform signer address
     * @param timestamp Block timestamp of update
     */
    event PlatformSignerUpdated(
        address indexed oldSigner,
        address indexed newSigner,
        uint256 timestamp
    );

    /**
     * @notice Emitted when reputation is deducted for governance action
     * @param user Address whose reputation was deducted
     * @param amount Amount of reputation deducted
     * @param action Action that triggered deduction (e.g., "createProposal", "vote")
     * @param timestamp Block timestamp of deduction
     */
    event ReputationDeducted(
        address indexed user,
        uint256 amount,
        string action,
        uint256 timestamp
    );

    /*//////////////////////////////////////////////////////////////
                            CUSTOM ERRORS
    //////////////////////////////////////////////////////////////*/

    /// @notice Thrown when proposal ID is invalid (doesn't exist)
    error InvalidProposalId();

    /// @notice Thrown when voting period has ended
    error VotingEnded();

    /// @notice Thrown when user has already voted on a proposal
    error AlreadyVoted();

    /// @notice Thrown when trying to vote on non-existent proposal
    error ProposalNotFound();

    /// @notice Thrown when voting period hasn't ended yet
    error VotingNotEnded();

    /// @notice Thrown when proposal is already finalized
    error AlreadyFinalized();

    /// @notice Thrown when voting duration is invalid
    error InvalidVotingDuration();

    /// @notice Thrown when content hash is empty
    error EmptyContentHash();

    /// @notice Thrown when reputation amount is invalid (zero or negative)
    error InvalidReputationAmount();

    /// @notice Thrown when reputation nonce has already been used
    error ReputationNonceAlreadyUsed();

    /// @notice Thrown when reputation signature is invalid
    error InvalidReputationSignature();

    /// @notice Thrown when reputation authorization has expired
    error ReputationAuthorizationExpired();

    /// @notice Thrown when address is zero/invalid
    error InvalidAddress();

    /// @notice Thrown when user has insufficient reputation for action
    /// @param required Amount of reputation required
    /// @param available Amount of reputation available
    error InsufficientReputation(uint256 required, uint256 available);

    /*//////////////////////////////////////////////////////////////
                            CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Initialize the governance contract
     * @dev Sets deployer as initial owner and platform signer
     * @param _platformSigner Backend authorized signer for reputation claims
     */
    constructor(address _platformSigner) Ownable(msg.sender) {
        if (_platformSigner == address(0)) revert InvalidAddress();
        platformSigner = _platformSigner;
    }

    /*//////////////////////////////////////////////////////////////
                        PROPOSAL CREATION
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Create a new governance proposal on-chain
     * @dev Emits ProposalCreated event with proposal details
     * @param contentHash keccak256 hash of proposal title + description
     * @param votingDuration Duration in seconds for voting period
     * @return proposalId Unique identifier for the created proposal
     *
     * Requirements:
     * - contentHash cannot be zero
     * - votingDuration must be between MIN and MAX_VOTING_DURATION
     */
    function createProposal(
        bytes32 contentHash,
        uint256 votingDuration
    ) external whenNotPaused returns (uint256) {
        // Early revert pattern for reputation validation
        uint256 userReputation = reputationPoints[msg.sender];
        if (userReputation < PROPOSAL_REPUTATION_COST) {
            revert InsufficientReputation(PROPOSAL_REPUTATION_COST, userReputation);
        }

        // Deduct reputation BEFORE processing proposal
        reputationPoints[msg.sender] -= PROPOSAL_REPUTATION_COST;

        // Validate inputs
        if (contentHash == bytes32(0)) revert EmptyContentHash();
        if (votingDuration < MIN_VOTING_DURATION || votingDuration > MAX_VOTING_DURATION) {
            revert InvalidVotingDuration();
        }

        // Increment proposal count
        proposalCount++;
        uint256 proposalId = proposalCount;

        // Calculate voting end time
        uint256 votingEndsAt = block.timestamp + votingDuration;

        // Create proposal
        proposals[proposalId] = Proposal({
            id: proposalId,
            proposer: msg.sender,
            contentHash: contentHash,
            createdAt: block.timestamp,
            votingEndsAt: votingEndsAt,
            upvotes: 0,
            downvotes: 0,
            finalized: false,
            passed: false
        });

        // Emit events
        emit ProposalCreated(
            proposalId,
            msg.sender,
            contentHash,
            votingEndsAt,
            block.timestamp
        );

        emit ReputationDeducted(
            msg.sender,
            PROPOSAL_REPUTATION_COST,
            "createProposal",
            block.timestamp
        );

        return proposalId;
    }

    /*//////////////////////////////////////////////////////////////
                            VOTING
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Cast a vote on a proposal
     * @dev Prevents double voting, validates voting period
     * @param proposalId ID of proposal to vote on
     * @param support true = upvote, false = downvote
     *
     * Requirements:
     * - Proposal must exist
     * - Voting period must not have ended
     * - Voter must not have already voted
     * - Contract must not be paused
     */
    function vote(
        uint256 proposalId,
        bool support
    ) external nonReentrant whenNotPaused {
        // Early revert pattern for reputation validation
        uint256 userReputation = reputationPoints[msg.sender];
        if (userReputation < VOTE_REPUTATION_COST) {
            revert InsufficientReputation(VOTE_REPUTATION_COST, userReputation);
        }

        // Validate proposal exists
        if (proposalId == 0 || proposalId > proposalCount) revert InvalidProposalId();

        Proposal storage proposal = proposals[proposalId];

        // Check voting period
        if (block.timestamp > proposal.votingEndsAt) revert VotingEnded();

        // Nonce-based duplicate check (O(1) gas cost)
        if (voteNonces[proposalId][msg.sender] > 0) revert AlreadyVoted();

        // Deduct reputation BEFORE processing vote
        reputationPoints[msg.sender] -= VOTE_REPUTATION_COST;

        // Record vote type for getVote() compatibility
        _voteTypes[proposalId][msg.sender] = support ? 1 : 2;

        // Increment nonce to mark as voted
        voteNonces[proposalId][msg.sender] = 1;

        // Update vote counts
        if (support) {
            proposal.upvotes++;
        } else {
            proposal.downvotes++;
        }

        // Emit events
        emit VoteCast(proposalId, msg.sender, support, block.timestamp);

        emit ReputationDeducted(
            msg.sender,
            VOTE_REPUTATION_COST,
            "vote",
            block.timestamp
        );
    }

    /*//////////////////////////////////////////////////////////////
                        PROPOSAL FINALIZATION
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Finalize a proposal after voting period ends
     * @dev Anyone can call this function to finalize
     * @param proposalId ID of proposal to finalize
     *
     * Requirements:
     * - Proposal must exist
     * - Voting period must have ended
     * - Proposal must not already be finalized
     *
     * Pass criteria:
     * - upvotes >= (upvotes + downvotes) * 2/3
     *
     * Gas Optimization Notes:
     * - O(1) complexity: No loops or array processing
     * - Vote tallies maintained in storage during vote() calls
     * - No duplicate checks needed (handled by voteNonces mapping in vote())
     * - No voter array processing (direct on-chain voting architecture)
     * - Efficient integer math for 2/3 calculation (no division)
     * - Custom errors save ~50 gas per revert vs require()
     * - Estimated gas: ~50,000 regardless of voter count
     */
    function finalizeProposal(uint256 proposalId) external nonReentrant {
        // Validate proposal exists
        if (proposalId == 0 || proposalId > proposalCount) revert InvalidProposalId();

        Proposal storage proposal = proposals[proposalId];

        // Check voting period has ended
        if (block.timestamp <= proposal.votingEndsAt) revert VotingNotEnded();

        // Check not already finalized
        if (proposal.finalized) revert AlreadyFinalized();

        // Mark as finalized
        proposal.finalized = true;

        // Calculate pass/fail (2/3 majority required)
        uint256 totalVotes = proposal.upvotes + proposal.downvotes;
        bool passed = false;

        if (totalVotes > 0) {
            // Proposal passes if upvotes >= 2/3 of total votes
            // Using integer math: upvotes * 3 >= totalVotes * 2
            passed = proposal.upvotes * 3 >= totalVotes * 2;
        }

        proposal.passed = passed;

        // Emit event
        emit ProposalFinalized(
            proposalId,
            proposal.upvotes,
            proposal.downvotes,
            passed,
            block.timestamp
        );
    }

    /*//////////////////////////////////////////////////////////////
                        VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Get full proposal details
     * @param proposalId ID of proposal to retrieve
     * @return Proposal struct with all fields
     */
    function getProposal(uint256 proposalId) external view returns (Proposal memory) {
        if (proposalId == 0 || proposalId > proposalCount) revert InvalidProposalId();
        return proposals[proposalId];
    }

    /**
     * @notice Check if a specific address voted on a proposal and how they voted
     * @param proposalId ID of proposal
     * @param voter Address of voter to check
     * @return voted Whether the address has voted
     * @return support If voted, true = upvote, false = downvote
     */
    function getVote(
        uint256 proposalId,
        address voter
    ) external view returns (bool voted, bool support) {
        if (proposalId == 0 || proposalId > proposalCount) revert InvalidProposalId();

        uint8 voteValue = _voteTypes[proposalId][voter];
        voted = voteValue != 0;
        support = voteValue == 1; // 1 = upvote, 2 = downvote

        return (voted, support);
    }

    /**
     * @notice Check if an address has voted on a proposal
     * @param proposalId ID of proposal
     * @param voter Address of voter to check
     * @return bool true if the voter has voted
     */
    function hasVoted(uint256 proposalId, address voter) external view returns (bool) {
        if (proposalId == 0 || proposalId > proposalCount) revert InvalidProposalId();
        return voteNonces[proposalId][voter] > 0;
    }

    /**
     * @notice Check if voting is currently active for a proposal
     * @param proposalId ID of proposal
     * @return bool true if voting is active
     */
    function isVotingActive(uint256 proposalId) external view returns (bool) {
        if (proposalId == 0 || proposalId > proposalCount) revert InvalidProposalId();

        Proposal storage proposal = proposals[proposalId];
        return block.timestamp <= proposal.votingEndsAt && !proposal.finalized;
    }

    /**
     * @notice Get vote counts for a proposal
     * @param proposalId ID of proposal
     * @return upvotes Total upvotes
     * @return downvotes Total downvotes
     * @return totalVotes Sum of upvotes and downvotes
     */
    function getVoteCounts(uint256 proposalId) external view returns (
        uint256 upvotes,
        uint256 downvotes,
        uint256 totalVotes
    ) {
        if (proposalId == 0 || proposalId > proposalCount) revert InvalidProposalId();

        Proposal storage proposal = proposals[proposalId];
        upvotes = proposal.upvotes;
        downvotes = proposal.downvotes;
        totalVotes = upvotes + downvotes;

        return (upvotes, downvotes, totalVotes);
    }

    /*//////////////////////////////////////////////////////////////
                        ADMIN FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Pause the contract (emergency use only)
     * @dev Only owner can call, prevents new proposals and voting
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause the contract
     * @dev Only owner can call, resumes normal operation
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /*//////////////////////////////////////////////////////////////
                    REPUTATION CLAIMING FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Claim reputation points with backend authorization
     * @dev Validates signature from platform signer, prevents replay attacks with nonce
     * @param amount Amount of reputation points to claim
     * @param nonce Unique identifier for this claim (prevents replay)
     * @param expiry Timestamp when authorization expires
     * @param signature ECDSA signature from platform signer
     *
     * Requirements:
     * - amount must be greater than 0
     * - expiry must be in the future
     * - nonce must not have been used before
     * - signature must be valid and from platform signer
     */
    function claimReputation(
        uint256 amount,
        uint256 nonce,
        uint256 expiry,
        bytes memory signature
    ) external nonReentrant whenNotPaused {
        // Validation checks
        if (amount == 0) revert InvalidReputationAmount();
        if (block.timestamp > expiry) revert ReputationAuthorizationExpired();
        if (usedReputationNonces[nonce]) revert ReputationNonceAlreadyUsed();

        // Verify signature from platform signer
        bytes32 messageHash = getReputationMessageHash(msg.sender, amount, nonce, expiry);
        bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();

        address recoveredSigner = ethSignedMessageHash.recover(signature);
        if (recoveredSigner != platformSigner) revert InvalidReputationSignature();

        // Mark nonce as used
        usedReputationNonces[nonce] = true;

        // Update on-chain reputation balance
        reputationPoints[msg.sender] += amount;

        emit ReputationClaimed(msg.sender, amount, nonce, block.timestamp);
    }

    /**
     * @notice Generate message hash for reputation claim verification
     * @param user Address claiming reputation
     * @param amount Amount of reputation points
     * @param nonce Unique nonce for this claim
     * @param expiry Expiration timestamp
     * @return bytes32 Hash of the message
     */
    function getReputationMessageHash(
        address user,
        uint256 amount,
        uint256 nonce,
        uint256 expiry
    ) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(user, amount, nonce, expiry));
    }

    /**
     * @notice Verify reputation claim signature
     * @param user Address claiming reputation
     * @param amount Amount of reputation points
     * @param nonce Unique nonce for this claim
     * @param expiry Expiration timestamp
     * @param signature ECDSA signature to verify
     * @return bool true if signature is valid
     */
    function verifyReputationSignature(
        address user,
        uint256 amount,
        uint256 nonce,
        uint256 expiry,
        bytes memory signature
    ) public view returns (bool) {
        bytes32 messageHash = getReputationMessageHash(user, amount, nonce, expiry);
        bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();
        address recoveredSigner = ethSignedMessageHash.recover(signature);
        return recoveredSigner == platformSigner;
    }

    /**
     * @notice Update platform signer address (owner only)
     * @param newSigner New platform signer address
     */
    function setPlatformSigner(address newSigner) external onlyOwner {
        if (newSigner == address(0)) revert InvalidAddress();
        address oldSigner = platformSigner;
        platformSigner = newSigner;
        emit PlatformSignerUpdated(oldSigner, newSigner, block.timestamp);
    }

    /**
     * @notice Check if a reputation nonce has been used
     * @param nonce Nonce to check
     * @return bool true if nonce has been used
     */
    function isReputationNonceUsed(uint256 nonce) external view returns (bool) {
        return usedReputationNonces[nonce];
    }

    /**
     * @notice Get reputation balance for a user
     * @param user Address to check
     * @return uint256 Reputation points balance
     */
    function getReputationBalance(address user) external view returns (uint256) {
        return reputationPoints[user];
    }
}
