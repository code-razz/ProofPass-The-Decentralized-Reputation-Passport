// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/**
 * @title SoulboundCertificate
 * @dev Implementation of non-transferable NFTs (Soulbound Tokens) for certificates
 */
contract SoulboundCertificate is ERC721, ERC721Enumerable, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    // Mapping from token ID to IPFS hash of metadata
    mapping(uint256 => string) private _tokenURIs;
    
    // Mapping from token ID to issuer address
    mapping(uint256 => address) private _issuers;
    
    // Mapping from token ID to issue date
    mapping(uint256 => uint256) private _issueDates;

    // Mapping of authorized issuers
    mapping(address => bool) public authorizedIssuers;

    // Issuer request system
    struct IssuerRequest {
        address requester;
        string reason;
        uint256 timestamp;
        bool isPending;
    }

    mapping(address => IssuerRequest) public issuerRequests;
    address[] public pendingRequesters;

    // Activity log entry
    struct ActivityLog {
        address actor;
        address target;
        string action;
        string details;
        uint256 timestamp;
    }

    // Array to store activity logs
    ActivityLog[] private activityLogs;

    // Events with timestamps
    event CertificateIssued(
        uint256 indexed tokenId,
        address indexed recipient,
        address indexed issuer,
        string ipfsHash,
        uint256 timestamp
    );

    event IssuerActivity(
        address indexed actor,
        address indexed target,
        string action,
        string details,
        uint256 timestamp
    );

    event IssuerAuthorized(address indexed issuer);
    event IssuerRevoked(address indexed issuer);

    event IssuerRequestSubmitted(
        address indexed requester,
        string reason,
        uint256 timestamp
    );

    event IssuerRequestApproved(
        address indexed requester,
        address indexed approver,
        uint256 timestamp
    );

    event IssuerRequestRejected(
        address indexed requester,
        address indexed rejector,
        uint256 timestamp
    );

    constructor() ERC721("Soulbound Certificate", "SBC") Ownable() {}

    modifier onlyAuthorizedIssuer() {
        require(authorizedIssuers[msg.sender], "Not an authorized issuer");
        _;
    }

    function _addActivityLog(
        address actor,
        address target,
        string memory action,
        string memory details
    ) private {
        activityLogs.push(ActivityLog({
            actor: actor,
            target: target,
            action: action,
            details: details,
            timestamp: block.timestamp
        }));

        emit IssuerActivity(actor, target, action, details, block.timestamp);
    }

    function authorizeIssuer(address issuer) external onlyOwner {
        authorizedIssuers[issuer] = true;
        _addActivityLog(
            msg.sender,
            issuer,
            "AUTHORIZE",
            "Issuer authorized by admin"
        );
        emit IssuerAuthorized(issuer);
    }

    function revokeIssuer(address issuer) external onlyOwner {
        authorizedIssuers[issuer] = false;
        _addActivityLog(
            msg.sender,
            issuer,
            "REVOKE",
            "Issuer authorization revoked by admin"
        );
        emit IssuerRevoked(issuer);
    }

    function issueCertificate(
        address recipient,
        string memory ipfsHash
    ) external onlyAuthorizedIssuer returns (uint256) {
        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();

        _safeMint(recipient, newTokenId);
        _tokenURIs[newTokenId] = ipfsHash;
        _issuers[newTokenId] = msg.sender;
        _issueDates[newTokenId] = block.timestamp;

        emit CertificateIssued(newTokenId, recipient, msg.sender, ipfsHash, block.timestamp);
        return newTokenId;
    }

    function tokenURI(uint256 tokenId) public view override(ERC721) returns (string memory) {
        require(_exists(tokenId), "Certificate does not exist");
        return _tokenURIs[tokenId];
    }

    function getIssuer(uint256 tokenId) public view returns (address) {
        require(_exists(tokenId), "Certificate does not exist");
        return _issuers[tokenId];
    }

    function getIssueDate(uint256 tokenId) public view returns (uint256) {
        require(_exists(tokenId), "Certificate does not exist");
        return _issueDates[tokenId];
    }

    function submitIssuerRequest(string memory reason) external {
        require(!authorizedIssuers[msg.sender], "Already an authorized issuer");
        require(!issuerRequests[msg.sender].isPending, "Request already pending");

        issuerRequests[msg.sender] = IssuerRequest({
            requester: msg.sender,
            reason: reason,
            timestamp: block.timestamp,
            isPending: true
        });

        pendingRequesters.push(msg.sender);
        _addActivityLog(
            msg.sender,
            msg.sender,
            "REQUEST",
            reason
        );
        emit IssuerRequestSubmitted(msg.sender, reason, block.timestamp);
    }

    function approveIssuerRequest(address requester) external onlyOwner {
        require(issuerRequests[requester].isPending, "No pending request");
        
        // Remove from pending requesters
        for (uint i = 0; i < pendingRequesters.length; i++) {
            if (pendingRequesters[i] == requester) {
                pendingRequesters[i] = pendingRequesters[pendingRequesters.length - 1];
                pendingRequesters.pop();
                break;
            }
        }

        // Update request status and authorize issuer
        issuerRequests[requester].isPending = false;
        authorizedIssuers[requester] = true;
        
        _addActivityLog(
            msg.sender,
            requester,
            "APPROVE",
            issuerRequests[requester].reason
        );
        emit IssuerRequestApproved(requester, msg.sender, block.timestamp);
        emit IssuerAuthorized(requester);
    }

    function rejectIssuerRequest(address requester) external onlyOwner {
        require(issuerRequests[requester].isPending, "No pending request");
        
        // Remove from pending requesters
        for (uint i = 0; i < pendingRequesters.length; i++) {
            if (pendingRequesters[i] == requester) {
                pendingRequesters[i] = pendingRequesters[pendingRequesters.length - 1];
                pendingRequesters.pop();
                break;
            }
        }

        // Update request status
        issuerRequests[requester].isPending = false;
        
        _addActivityLog(
            msg.sender,
            requester,
            "REJECT",
            issuerRequests[requester].reason
        );
        emit IssuerRequestRejected(requester, msg.sender, block.timestamp);
    }

    function getPendingRequesters() external view returns (address[] memory) {
        return pendingRequesters;
    }

    function getIssuerRequest(address requester) external view returns (
        address requesterAddr,
        string memory reason,
        uint256 timestamp,
        bool isPending
    ) {
        IssuerRequest memory request = issuerRequests[requester];
        return (request.requester, request.reason, request.timestamp, request.isPending);
    }

    // Override transfer functions to make token non-transferable
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal virtual override(ERC721, ERC721Enumerable) {
        require(
            from == address(0) || to == address(0),
            "Soulbound: token transfer not allowed"
        );
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }

    function transferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public virtual override(ERC721, IERC721) {
        require(
            from == address(0) || to == address(0),
            "Soulbound: token transfer not allowed"
        );
        super.transferFrom(from, to, tokenId);
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public virtual override(ERC721, IERC721) {
        require(
            from == address(0) || to == address(0),
            "Soulbound: token transfer not allowed"
        );
        super.safeTransferFrom(from, to, tokenId);
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId,
        bytes memory data
    ) public virtual override(ERC721, IERC721) {
        require(
            from == address(0) || to == address(0),
            "Soulbound: token transfer not allowed"
        );
        super.safeTransferFrom(from, to, tokenId, data);
    }

    // The following functions are overrides required by Solidity
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    // New function to get activity logs
    function getActivityLogs(uint256 startIndex, uint256 count) external view returns (
        address[] memory actors,
        address[] memory targets,
        string[] memory actions,
        string[] memory details,
        uint256[] memory timestamps
    ) {
        uint256 totalLogs = activityLogs.length;
        if (startIndex >= totalLogs) {
            return (new address[](0), new address[](0), new string[](0), new string[](0), new uint256[](0));
        }

        uint256 endIndex = startIndex + count;
        if (endIndex > totalLogs) {
            endIndex = totalLogs;
        }

        uint256 resultLength = endIndex - startIndex;
        actors = new address[](resultLength);
        targets = new address[](resultLength);
        actions = new string[](resultLength);
        details = new string[](resultLength);
        timestamps = new uint256[](resultLength);

        for (uint256 i = 0; i < resultLength; i++) {
            ActivityLog memory log = activityLogs[totalLogs - 1 - startIndex - i]; // Reverse order
            actors[i] = log.actor;
            targets[i] = log.target;
            actions[i] = log.action;
            details[i] = log.details;
            timestamps[i] = log.timestamp;
        }

        return (actors, targets, actions, details, timestamps);
    }

    function getActivityLogsCount() external view returns (uint256) {
        return activityLogs.length;
    }
} 