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

    // Struct definitions
    struct IssuerRequest {
        address requester;
        string reason;
        uint256 timestamp;
        bool isPending;
    }

    struct ActivityLog {
        address actor;
        address target;
        string action;
        string details;
        uint256 timestamp;
    }

    struct OpportunityProvider {
        string name;
        string description;
        string website;
        string providerType;
        uint256 registeredAt;
    }

    struct Opportunity {
        uint256 id;
        address employer;
        string title;
        string description;
        string requirements;
        uint256 postedAt;
        bool isActive;
    }

    struct VerificationRequest {
        address employer;
        address user;
        uint256[] certificateIds;
        string purpose;
        uint256 requestedAt;
        bool isApproved;
        bool isRejected;
    }

    struct Endorsement {
        address endorser;
        string skill;
        string comment;
        uint256 timestamp;
    }

    // State variables
    mapping(uint256 => string) private _tokenURIs;
    mapping(uint256 => address) private _issuers;
    mapping(uint256 => uint256) private _issueDates;
    mapping(address => string) private _githubUsernames;
    mapping(address => bool) public authorizedIssuers;
    mapping(address => IssuerRequest) public issuerRequests;
    mapping(address => OpportunityProvider) public opportunityProviders;
    mapping(address => bool) public isOpportunityProvider;
    mapping(uint256 => Opportunity) public opportunities;
    mapping(address => uint256[]) public providerOpportunities;
    mapping(address => VerificationRequest[]) public verificationRequests;
    mapping(address => Endorsement[]) public endorsements;
    mapping(address => mapping(address => bool)) public sharedCertificates;

    address[] public pendingRequesters;
    ActivityLog[] private activityLogs;
    Counters.Counter private _opportunityIds;
    Counters.Counter private _verificationRequestIds;

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

    // Events
    event ProviderRegistered(address indexed provider, string name, string providerType);
    event OpportunityPosted(uint256 indexed opportunityId, address indexed provider);
    event OpportunityClosed(uint256 indexed opportunityId, address indexed provider);
    event VerificationRequested(
        address indexed employer,
        address indexed user,
        uint256[] certificateIds
    );
    event VerificationApproved(
        address indexed employer,
        address indexed user,
        uint256[] certificateIds
    );
    event VerificationRejected(
        address indexed employer,
        address indexed user,
        uint256[] certificateIds
    );
    event CertificateShared(
        address indexed owner,
        address indexed recipient,
        uint256[] certificateIds
    );
    event EndorsementAdded(
        address indexed user,
        address indexed endorser,
        string skill
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

    // Function to set the GitHub username for the connected address
    function setGithubUsername(string memory _username) public {
        _githubUsernames[msg.sender] = _username;
    }

    // Function to get the GitHub username for a given address
    function getGithubUsername(address _user) public view returns (string memory) {
        return _githubUsernames[_user];
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

    function registerAsProvider(
        string memory name,
        string memory description,
        string memory website,
        string memory providerType
    ) external {
        require(!isOpportunityProvider[msg.sender], "Already registered as provider");
        require(bytes(name).length > 0, "Name cannot be empty");
        require(bytes(providerType).length > 0, "Provider type cannot be empty");

        opportunityProviders[msg.sender] = OpportunityProvider({
            name: name,
            description: description,
            website: website,
            providerType: providerType,
            registeredAt: block.timestamp
        });
        isOpportunityProvider[msg.sender] = true;

        emit ProviderRegistered(msg.sender, name, providerType);
    }

    function isProvider(address provider) public view returns (bool) {
        return isOpportunityProvider[provider];
    }

    function getProviderDetails(address provider) public view returns (
        string memory name,
        string memory description,
        string memory website,
        string memory providerType,
        uint256 registeredAt
    ) {
        require(isOpportunityProvider[provider], "Not a registered provider");
        OpportunityProvider memory providerDetails = opportunityProviders[provider];
        return (
            providerDetails.name,
            providerDetails.description,
            providerDetails.website,
            providerDetails.providerType,
            providerDetails.registeredAt
        );
    }

    modifier onlyProvider() {
        require(isOpportunityProvider[msg.sender], "Not a registered provider");
        _;
    }

    // Post opportunity
    function postOpportunity(
        string memory title,
        string memory description,
        string memory requirements
    ) external onlyProvider {
        _opportunityIds.increment();
        uint256 opportunityId = _opportunityIds.current();

        opportunities[opportunityId] = Opportunity({
            id: opportunityId,
            employer: msg.sender,
            title: title,
            description: description,
            requirements: requirements,
            postedAt: block.timestamp,
            isActive: true
        });

        providerOpportunities[msg.sender].push(opportunityId);
        emit OpportunityPosted(opportunityId, msg.sender);
    }

    // Close opportunity
    function closeOpportunity(uint256 opportunityId) external {
        require(opportunities[opportunityId].employer == msg.sender, "Not the opportunity owner");
        require(opportunities[opportunityId].isActive, "Opportunity already closed");

        opportunities[opportunityId].isActive = false;
        emit OpportunityClosed(opportunityId, msg.sender);
    }

    // Request certificate verification
    function requestVerification(
        address employer,
        uint256[] memory certificateIds,
        string memory purpose
    ) external {
        require(isOpportunityProvider[employer], "Not a registered provider");

        // Verify ownership of certificates
        for (uint i = 0; i < certificateIds.length; i++) {
            require(ownerOf(certificateIds[i]) == msg.sender, "Not the certificate owner");
        }

        VerificationRequest memory request = VerificationRequest({
            employer: employer,
            user: msg.sender,
            certificateIds: certificateIds,
            purpose: purpose,
            requestedAt: block.timestamp,
            isApproved: false,
            isRejected: false
        });

        verificationRequests[employer].push(request);
        emit VerificationRequested(employer, msg.sender, certificateIds);
    }

    // Approve verification request
    function approveVerification(
        address user,
        uint256 requestIndex
    ) external {
        require(isOpportunityProvider[msg.sender], "Not a registered provider");
        require(verificationRequests[msg.sender][requestIndex].user == user, "Invalid request");
        require(!verificationRequests[msg.sender][requestIndex].isApproved, "Already approved");
        require(!verificationRequests[msg.sender][requestIndex].isRejected, "Already rejected");

        VerificationRequest storage request = verificationRequests[msg.sender][requestIndex];
        request.isApproved = true;

        // Share certificates with employer
        for (uint i = 0; i < request.certificateIds.length; i++) {
            sharedCertificates[user][msg.sender] = true;
        }

        emit VerificationApproved(msg.sender, user, request.certificateIds);
    }

    // Reject verification request
    function rejectVerification(
        address user,
        uint256 requestIndex
    ) external {
        require(isOpportunityProvider[msg.sender], "Not a registered provider");
        require(verificationRequests[msg.sender][requestIndex].user == user, "Invalid request");
        require(!verificationRequests[msg.sender][requestIndex].isApproved, "Already approved");
        require(!verificationRequests[msg.sender][requestIndex].isRejected, "Already rejected");

        VerificationRequest storage request = verificationRequests[msg.sender][requestIndex];
        request.isRejected = true;

        emit VerificationRejected(msg.sender, user, request.certificateIds);
    }

    // Add endorsement
    function addEndorsement(
        address user,
        string memory skill,
        string memory comment
    ) external {
        require(isOpportunityProvider[msg.sender], "Not a registered provider");
        require(sharedCertificates[user][msg.sender], "No shared certificates");

        endorsements[user].push(Endorsement({
            endorser: msg.sender,
            skill: skill,
            comment: comment,
            timestamp: block.timestamp
        }));

        emit EndorsementAdded(user, msg.sender, skill);
    }

    // Get provider opportunities
    function getProviderOpportunities(address provider) external view returns (uint256[] memory) {
        return providerOpportunities[provider];
    }

    // Get opportunity details
    function getOpportunityDetails(uint256 opportunityId) external view returns (
        address employer,
        string memory title,
        string memory description,
        string memory requirements,
        uint256 postedAt,
        bool isActive
    ) {
        Opportunity storage opp = opportunities[opportunityId];
        return (
            opp.employer,
            opp.title,
            opp.description,
            opp.requirements,
            opp.postedAt,
            opp.isActive
        );
    }

    // Get user endorsements
    function getUserEndorsements(address user) external view returns (
        address[] memory endorsers,
        string[] memory skills,
        string[] memory comments,
        uint256[] memory timestamps
    ) {
        Endorsement[] storage userEndorsements = endorsements[user];
        uint256 length = userEndorsements.length;
        
        endorsers = new address[](length);
        skills = new string[](length);
        comments = new string[](length);
        timestamps = new uint256[](length);

        for (uint i = 0; i < length; i++) {
            endorsers[i] = userEndorsements[i].endorser;
            skills[i] = userEndorsements[i].skill;
            comments[i] = userEndorsements[i].comment;
            timestamps[i] = userEndorsements[i].timestamp;
        }

        return (endorsers, skills, comments, timestamps);
    }
} 