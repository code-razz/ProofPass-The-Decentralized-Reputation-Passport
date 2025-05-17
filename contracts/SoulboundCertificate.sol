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

    event CertificateIssued(
        uint256 indexed tokenId,
        address indexed recipient,
        address indexed issuer,
        string ipfsHash
    );

    event IssuerAuthorized(address indexed issuer);
    event IssuerRevoked(address indexed issuer);

    constructor() ERC721("Soulbound Certificate", "SBC") Ownable() {}

    modifier onlyAuthorizedIssuer() {
        require(authorizedIssuers[msg.sender], "Not an authorized issuer");
        _;
    }

    function authorizeIssuer(address issuer) external onlyOwner {
        authorizedIssuers[issuer] = true;
        emit IssuerAuthorized(issuer);
    }

    function revokeIssuer(address issuer) external onlyOwner {
        authorizedIssuers[issuer] = false;
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

        emit CertificateIssued(newTokenId, recipient, msg.sender, ipfsHash);
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
} 