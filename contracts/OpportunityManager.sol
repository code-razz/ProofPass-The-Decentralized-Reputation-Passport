// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract OpportunityManager is Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _opportunityIds;
    Counters.Counter private _applicationIds;

    struct Opportunity {
        uint256 id;
        address provider;
        string title;
        string description;
        string requirements;
        bool isActive;
        uint256 createdAt;
    }

    struct Application {
        uint256 id;
        uint256 opportunityId;
        address applicant;
        string[] certificateIds;
        string githubUsername;
        string email;
        string status; // "pending", "accepted", "rejected"
        uint256 createdAt;
    }

    // Mapping from opportunity ID to Opportunity
    mapping(uint256 => Opportunity) public opportunities;
    
    // Mapping from application ID to Application
    mapping(uint256 => Application) public applications;
    
    // Mapping from opportunity ID to array of application IDs
    mapping(uint256 => uint256[]) public opportunityApplications;
    
    // Mapping from applicant address to array of application IDs
    mapping(address => uint256[]) public applicantApplications;

    // Events
    event OpportunityCreated(uint256 indexed opportunityId, address indexed provider, string title);
    event ApplicationSubmitted(uint256 indexed applicationId, uint256 indexed opportunityId, address indexed applicant);
    event ApplicationStatusUpdated(uint256 indexed applicationId, string status);

    constructor() Ownable() {}

    function createOpportunity(
        string memory _title,
        string memory _description,
        string memory _requirements
    ) external returns (uint256) {
        _opportunityIds.increment();
        uint256 newOpportunityId = _opportunityIds.current();

        opportunities[newOpportunityId] = Opportunity({
            id: newOpportunityId,
            provider: msg.sender,
            title: _title,
            description: _description,
            requirements: _requirements,
            isActive: true,
            createdAt: block.timestamp
        });

        emit OpportunityCreated(newOpportunityId, msg.sender, _title);
        return newOpportunityId;
    }

    function submitApplication(
        uint256 _opportunityId,
        string[] memory _certificateIds,
        string memory _githubUsername,
        string memory _email
    ) external returns (uint256) {
        require(opportunities[_opportunityId].isActive, "Opportunity is not active");
        require(opportunities[_opportunityId].provider != msg.sender, "Provider cannot apply to their own opportunity");

        _applicationIds.increment();
        uint256 newApplicationId = _applicationIds.current();

        applications[newApplicationId] = Application({
            id: newApplicationId,
            opportunityId: _opportunityId,
            applicant: msg.sender,
            certificateIds: _certificateIds,
            githubUsername: _githubUsername,
            email: _email,
            status: "pending",
            createdAt: block.timestamp
        });

        opportunityApplications[_opportunityId].push(newApplicationId);
        applicantApplications[msg.sender].push(newApplicationId);

        emit ApplicationSubmitted(newApplicationId, _opportunityId, msg.sender);
        return newApplicationId;
    }

    function updateApplicationStatus(
        uint256 _applicationId,
        string memory _status
    ) external {
        require(
            keccak256(bytes(_status)) == keccak256(bytes("accepted")) ||
            keccak256(bytes(_status)) == keccak256(bytes("rejected")) ||
            keccak256(bytes(_status)) == keccak256(bytes("pending")),
            "Invalid status"
        );

        Application storage application = applications[_applicationId];
        require(
            opportunities[application.opportunityId].provider == msg.sender,
            "Only opportunity provider can update status"
        );

        application.status = _status;
        emit ApplicationStatusUpdated(_applicationId, _status);
    }

    function getOpportunity(uint256 _opportunityId) external view returns (Opportunity memory) {
        return opportunities[_opportunityId];
    }

    function getApplication(uint256 _applicationId) external view returns (Application memory) {
        return applications[_applicationId];
    }

    function getOpportunityApplications(uint256 _opportunityId) external view returns (uint256[] memory) {
        return opportunityApplications[_opportunityId];
    }

    function getApplicantApplications(address _applicant) external view returns (uint256[] memory) {
        return applicantApplications[_applicant];
    }

    function toggleOpportunityStatus(uint256 _opportunityId) external {
        require(
            opportunities[_opportunityId].provider == msg.sender,
            "Only opportunity provider can toggle status"
        );
        opportunities[_opportunityId].isActive = !opportunities[_opportunityId].isActive;
    }

    // Add public getter for total opportunities
    function getTotalOpportunities() external view returns (uint256) {
        return _opportunityIds.current();
    }
} 