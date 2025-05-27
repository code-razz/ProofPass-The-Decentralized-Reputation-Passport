'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { ethers } from 'ethers'
import { useWeb3Modal } from './Web3ModalContext'
import { BaseContract, ContractTransactionResponse } from 'ethers'

// Import the contract ABI
const contractABI = [
  "function getTotalOpportunities() view returns (uint256)",
  "function createOpportunity(string memory _title, string memory _description, string memory _requirements) returns (uint256)",
  "function submitApplication(uint256 _opportunityId, string[] memory _certificateIds, string memory _githubUsername, string memory _email) returns (uint256)",
  "function updateApplicationStatus(uint256 _applicationId, string memory _status)",
  "function toggleOpportunityStatus(uint256 _opportunityId)",
  "function getOpportunity(uint256 _opportunityId) view returns (tuple(uint256 id, address provider, string title, string description, string requirements, bool isActive, uint256 createdAt))",
  "function getApplication(uint256 _applicationId) view returns (tuple(uint256 id, uint256 opportunityId, address applicant, string[] certificateIds, string githubUsername, string email, string status, uint256 createdAt))",
  "function getOpportunityApplications(uint256 _opportunityId) view returns (uint256[])",
  "function getApplicantApplications(address _applicant) view returns (uint256[])"
]

const OPPORTUNITY_MANAGER_ADDRESS = process.env.NEXT_PUBLIC_OPPORTUNITY_MANAGER_ADDRESS

interface Opportunity {
  id: number
  provider: string
  title: string
  description: string
  requirements: string
  isActive: boolean
  createdAt: number
  applications?: Application[]
}

interface Application {
  id: number
  opportunityId: number
  applicant: string
  certificateIds: string[]
  githubUsername: string
  email: string
  status: 'pending' | 'accepted' | 'rejected'
  createdAt: number
}

interface OpportunityContextType {
  opportunities: Opportunity[]
  applications: Application[]
  userApplications: Application[]
  providerOpportunities: Opportunity[]
  isLoading: boolean
  error: string | null
  createOpportunity: (title: string, description: string, requirements: string) => Promise<void>
  submitApplication: (opportunityId: number, certificateIds: string[], githubUsername: string, email: string) => Promise<void>
  updateApplicationStatus: (applicationId: number, status: 'pending' | 'accepted' | 'rejected') => Promise<void>
  toggleOpportunityStatus: (opportunityId: number) => Promise<void>
  refreshOpportunities: () => Promise<void>
  refreshApplications: () => Promise<void>
}

const OpportunityContext = createContext<OpportunityContextType | undefined>(undefined)

export function OpportunityProvider({ children }: { children: React.ReactNode }) {
  const { provider, address, isConnected } = useWeb3Modal()
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [applications, setApplications] = useState<Application[]>([])
  const [userApplications, setUserApplications] = useState<Application[]>([])
  const [providerOpportunities, setProviderOpportunities] = useState<Opportunity[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const contract = useMemo(() => 
    provider && OPPORTUNITY_MANAGER_ADDRESS
      ? new ethers.Contract(OPPORTUNITY_MANAGER_ADDRESS, contractABI, provider)
      : null,
    [provider]
  )

  const refreshOpportunities = useCallback(async () => {
    if (!contract) return

    try {
      setIsLoading(true)
      setError(null)

      // Get total number of opportunities using the new getter function
      const opportunityCount = Number(await contract.getTotalOpportunities())
      const opportunitiesList: Opportunity[] = []

      // Fetch each opportunity
      for (let i = 1; i <= opportunityCount; i++) {
        const opportunity = await contract.getOpportunity(i)
        
        // Get applications for this opportunity
        const applicationIds = await contract.getOpportunityApplications(i)
        const applicationsList: Application[] = []

        // Fetch each application
        for (const id of applicationIds) {
          const application = await contract.getApplication(Number(id))
          const status = application.status as 'pending' | 'accepted' | 'rejected'
          applicationsList.push({
            id: Number(application.id),
            opportunityId: Number(application.opportunityId),
            applicant: application.applicant,
            certificateIds: application.certificateIds,
            githubUsername: application.githubUsername,
            email: application.email,
            status,
            createdAt: Number(application.createdAt)
          })
        }

        opportunitiesList.push({
          id: Number(opportunity.id),
          provider: opportunity.provider,
          title: opportunity.title,
          description: opportunity.description,
          requirements: opportunity.requirements,
          isActive: opportunity.isActive,
          createdAt: Number(opportunity.createdAt),
          applications: applicationsList // Add applications to the opportunity
        })
      }

      setOpportunities(opportunitiesList)
      
      // Filter provider opportunities if user is connected
      if (address) {
        setProviderOpportunities(
          opportunitiesList.filter(opp => opp.provider.toLowerCase() === address.toLowerCase())
        )
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch opportunities')
      console.error('Error fetching opportunities:', err)
    } finally {
      setIsLoading(false)
    }
  }, [contract, address])

  const refreshApplications = useCallback(async () => {
    if (!contract || !address) return

    try {
      setIsLoading(true)
      setError(null)

      // Get user's applications
      const applicationIds = await contract.getApplicantApplications(address)
      const applicationsList: Application[] = []

      // Fetch each application
      for (const id of applicationIds) {
        const application = await contract.getApplication(Number(id))
        const status = application.status as 'pending' | 'accepted' | 'rejected'
        applicationsList.push({
          id: Number(application.id),
          opportunityId: Number(application.opportunityId),
          applicant: application.applicant,
          certificateIds: application.certificateIds,
          githubUsername: application.githubUsername,
          email: application.email,
          status,
          createdAt: Number(application.createdAt)
        })
      }

      setUserApplications(applicationsList)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch applications')
      console.error('Error fetching applications:', err)
    } finally {
      setIsLoading(false)
    }
  }, [contract, address])

  // Memoize other functions that depend on contract and provider
  const createOpportunity = useCallback(async (title: string, description: string, requirements: string) => {
    if (!contract || !provider) throw new Error('Contract or provider not available')

    try {
      setIsLoading(true)
      setError(null)

      const signer = await provider.getSigner()
      const contractWithSigner = contract.connect(signer) as ethers.Contract
      
      const tx = await contractWithSigner.createOpportunity(title, description, requirements)
      await tx.wait()

      await refreshOpportunities()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create opportunity')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [contract, provider, refreshOpportunities])

  const submitApplication = useCallback(async (
    opportunityId: number,
    certificateIds: string[],
    githubUsername: string,
    email: string
  ) => {
    if (!contract || !provider) throw new Error('Contract or provider not available')

    try {
      setIsLoading(true)
      setError(null)

      const signer = await provider.getSigner()
      const contractWithSigner = contract.connect(signer) as ethers.Contract
      
      const tx = await contractWithSigner.submitApplication(
        opportunityId,
        certificateIds,
        githubUsername,
        email
      )
      await tx.wait()

      await refreshApplications()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit application')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [contract, provider, refreshApplications])

  const updateApplicationStatus = useCallback(async (
    applicationId: number,
    status: 'pending' | 'accepted' | 'rejected'
  ) => {
    if (!contract || !provider) throw new Error('Contract or provider not available')

    try {
      setIsLoading(true)
      setError(null)

      const signer = await provider.getSigner()
      const contractWithSigner = contract.connect(signer) as ethers.Contract
      
      const tx = await contractWithSigner.updateApplicationStatus(applicationId, status)
      await tx.wait()

      await refreshApplications()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update application status')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [contract, provider, refreshApplications])

  const toggleOpportunityStatus = useCallback(async (opportunityId: number) => {
    if (!contract || !provider) throw new Error('Contract or provider not available')

    try {
      setIsLoading(true)
      setError(null)

      const signer = await provider.getSigner()
      const contractWithSigner = contract.connect(signer) as ethers.Contract
      
      const tx = await contractWithSigner.toggleOpportunityStatus(opportunityId)
      await tx.wait()

      await refreshOpportunities()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle opportunity status')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [contract, provider, refreshOpportunities])

  // Initial data fetch
  useEffect(() => {
    let mounted = true;

    const fetchData = async () => {
      if (isConnected && contract && mounted) {
        await Promise.all([
          refreshOpportunities(),
          refreshApplications()
        ]);
      }
    };

    fetchData();

    return () => {
      mounted = false;
    };
  }, [isConnected, contract, refreshOpportunities, refreshApplications]);

  const value = useMemo(() => ({
    opportunities,
    applications,
    userApplications,
    providerOpportunities,
    isLoading,
    error,
    createOpportunity,
    submitApplication,
    updateApplicationStatus,
    toggleOpportunityStatus,
    refreshOpportunities,
    refreshApplications
  }), [
    opportunities,
    applications,
    userApplications,
    providerOpportunities,
    isLoading,
    error,
    createOpportunity,
    submitApplication,
    updateApplicationStatus,
    toggleOpportunityStatus,
    refreshOpportunities,
    refreshApplications
  ]);

  return (
    <OpportunityContext.Provider value={value}>
      {children}
    </OpportunityContext.Provider>
  )
}

export function useOpportunity() {
  const context = useContext(OpportunityContext)
  if (context === undefined) {
    throw new Error('useOpportunity must be used within an OpportunityProvider')
  }
  return context
} 