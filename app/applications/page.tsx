'use client'

import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  Badge,
  useToast,
  Spinner,
  Alert,
  AlertIcon,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Button,
  Divider,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Image,
  Link as ChakraLink,
  TableContainer,
  Table,
  Thead,
  Tr,
  Th,
  Tbody,
  Td,
} from '@chakra-ui/react'
import { useOpportunity } from '../context/OpportunityContext'
import { useWeb3Modal } from '../context/Web3ModalContext'
import { useEffect, useCallback, useState, useRef } from 'react'
import Link from 'next/link'
import { ethers } from 'ethers'
import SoulboundCertificate from '../../artifacts/contracts/SoulboundCertificate.sol/SoulboundCertificate.json'
import axios from 'axios'

// Add contract address constant
const CERTIFICATE_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS

interface Certificate {
  id: number
  name: string
  description: string
  issuer: string
  issueDate: string
}

interface ApplicationDetails {
  id: number
  applicant: string
  githubUsername: string
  certificateIds: string[]
  status: string
  createdAt: number
  opportunityId: number
}

// Add interfaces for GitHub data
interface RepoStats {
  name: string
  stars: number
  forks: number
}

interface PullRequest {
  repo: string
  title: string
  number: number
  merged: boolean
  created_at: string
}

// Add GitHub data fetching functions
async function getUserReposWithStats(username: string): Promise<RepoStats[]> {
  const result: RepoStats[] = []
  let page = 1
  let hasMore = true

  while (hasMore) {
    const url = `https://api.github.com/users/${username}/repos?per_page=100&page=${page}`
    const res = await axios.get(url)
    const repos = res.data

    for (const repo of repos) {
      if (!repo.fork && (repo.stargazers_count > 0 || repo.forks_count > 0)) {
        result.push({
          name: repo.name,
          stars: repo.stargazers_count,
          forks: repo.forks_count,
        })
      }
    }

    hasMore = repos.length === 100
    page++
  }

  return result
}

async function getUserPRsWithMergeStatus(username: string): Promise<PullRequest[]> {
  const searchUrl = `https://api.github.com/search/issues?q=type:pr+author:${username}&per_page=30`
  const searchRes = await axios.get(searchUrl)
  const items = searchRes.data.items

  const prs: PullRequest[] = []

  for (const pr of items) {
    const [owner, repo] = pr.repository_url.replace("https://api.github.com/repos/", "").split("/")
    const prNumber = pr.number

    try {
      const prUrl = `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`
      const prDetails = await axios.get(prUrl)

      prs.push({
        repo: `${owner}/${repo}`,
        title: pr.title,
        number: prNumber,
        merged: prDetails.data.merged,
        created_at: pr.created_at,
      })
    } catch (err: any) {
      console.error(`Error fetching PR #${prNumber} from ${owner}/${repo}: ${err.message}`)
    }
  }

  return prs
}

export default function ApplicationsPage() {
  const {
    opportunities,
    userApplications,
    providerOpportunities,
    updateApplicationStatus,
    isLoading,
    error,
    refreshOpportunities,
    refreshApplications,
    toggleOpportunityStatus,
  } = useOpportunity()
  const { isConnected, connect, provider } = useWeb3Modal()
  const toast = useToast()
  const [certificateDetails, setCertificateDetails] = useState<Record<string, Certificate>>({})
  const fetchedCertificates = useRef<Set<string>>(new Set())
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [selectedApplication, setSelectedApplication] = useState<ApplicationDetails | null>(null)
  const [githubData, setGithubData] = useState<any>(null)
  const [isLoadingGithub, setIsLoadingGithub] = useState(false)
  const [repos, setRepos] = useState<RepoStats[]>([])
  const [prs, setPrs] = useState<PullRequest[]>([])

  // Update fetchCertificateDetails to use ref instead of state
  const fetchCertificateDetails = useCallback(async (certificateIds: string[]) => {
    if (!provider || !CERTIFICATE_CONTRACT_ADDRESS) return

    try {
      const contract = new ethers.Contract(
        CERTIFICATE_CONTRACT_ADDRESS,
        SoulboundCertificate.abi,
        provider
      )

      const details: Record<string, Certificate> = {}
      const newCertificates = certificateIds.filter(id => !fetchedCertificates.current.has(id))
      
      for (const certId of newCertificates) {
        try {
          const ipfsHash = await contract.tokenURI(certId)
          const issuer = await contract.getIssuer(certId)
          const issueDate = await contract.getIssueDate(certId)

          // Fetch metadata from IPFS
          const response = await fetch(`https://ipfs.io/ipfs/${ipfsHash}`)
          const metadata = await response.json()

          details[certId] = {
            id: Number(certId),
            name: metadata.name,
            description: metadata.description,
            issuer: issuer,
            issueDate: new Date(Number(issueDate) * 1000).toLocaleDateString(),
          }
          fetchedCertificates.current.add(certId)
        } catch (error) {
          console.error(`Error fetching certificate ${certId}:`, error)
          // Add a placeholder if fetch fails
          details[certId] = {
            id: Number(certId),
            name: `Certificate #${certId}`,
            description: 'Failed to load certificate details',
            issuer: 'Unknown',
            issueDate: 'Unknown',
          }
          fetchedCertificates.current.add(certId)
        }
      }

      if (Object.keys(details).length > 0) {
        setCertificateDetails(prev => ({ ...prev, ...details }))
      }
    } catch (error) {
      console.error('Error fetching certificate details:', error)
    }
  }, [provider]) // Remove certificateDetails from dependencies

  // Update useEffect to fetch certificate details
  useEffect(() => {
    if (isConnected) {
      refreshOpportunities()
      refreshApplications()
    }
  }, [isConnected, refreshOpportunities, refreshApplications])

  // Add useEffect to fetch certificate details when applications change
  useEffect(() => {
    if (!isConnected || !provider) return

    const allCertificateIds = new Set<string>()
    
    // Collect all certificate IDs from user applications
    userApplications.forEach(app => {
      app.certificateIds.forEach(id => allCertificateIds.add(id))
    })
    
    // Collect all certificate IDs from provider opportunities
    providerOpportunities.forEach(opp => {
      opp.applications?.forEach(app => {
        app.certificateIds.forEach(id => allCertificateIds.add(id))
      })
    })

    fetchCertificateDetails(Array.from(allCertificateIds))
  }, [isConnected, provider, userApplications, providerOpportunities, fetchCertificateDetails])

  const handleStatusUpdate = async (applicationId: number, status: 'accepted' | 'rejected') => {
    try {
      await updateApplicationStatus(applicationId, status)
      toast({
        title: 'Success',
        description: `Application ${status} successfully`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update application status',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
    }
  }

  const getOpportunityTitle = (opportunityId: number) => {
    const opportunity = opportunities.find(opp => opp.id === opportunityId)
    return opportunity ? opportunity.title : 'Unknown Opportunity'
  }

  // Add handleStatusUpdate function for opportunities
  const handleOpportunityStatusToggle = async (opportunityId: number) => {
    try {
      await toggleOpportunityStatus(opportunityId)
      toast({
        title: 'Success',
        description: 'Opportunity status updated successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update opportunity status',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
    }
  }

  // Update fetchGithubData function
  const fetchGithubData = async (username: string) => {
    setIsLoadingGithub(true)
    setRepos([])
    setPrs([])
    try {
      const [fetchedRepos, fetchedPrs] = await Promise.all([
        getUserReposWithStats(username),
        getUserPRsWithMergeStatus(username)
      ])
      setRepos(fetchedRepos)
      setPrs(fetchedPrs)
    } catch (error) {
      console.error('Error fetching GitHub data:', error)
      toast({
        title: 'Error',
        description: 'Failed to fetch GitHub data',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
    } finally {
      setIsLoadingGithub(false)
    }
  }

  // Add function to handle application click
  const handleApplicationClick = (application: ApplicationDetails) => {
    setSelectedApplication(application)
    fetchGithubData(application.githubUsername)
    onOpen()
  }

  if (!isConnected) {
    return (
      <Container maxW="container.xl" py={10}>
        <Alert status="info">
          <AlertIcon />
          Please connect your wallet to view applications
        </Alert>
        <Button mt={4} colorScheme="blue" onClick={connect}>
          Connect Wallet
        </Button>
      </Container>
    )
  }

  if (isLoading) {
    return (
      <Container maxW="container.xl" py={10}>
        <VStack spacing={4}>
          <Spinner size="xl" />
          <Text>Loading applications...</Text>
        </VStack>
      </Container>
    )
  }

  if (error) {
    return (
      <Container maxW="container.xl" py={10}>
        <Alert status="error">
          <AlertIcon />
          {error}
        </Alert>
      </Container>
    )
  }

  return (
    <Container maxW="container.xl" py={10}>
      <VStack spacing={8} align="stretch">
        <Box>
          <Heading as="h1" size="2xl" mb={4}>
            Applications
          </Heading>
          <Text fontSize="xl" color="gray.600">
            Manage your applications and review submissions
          </Text>
        </Box>

        <Tabs>
          <TabList>
            <Tab>My Applications</Tab>
            <Tab>Provider Dashboard</Tab>
          </TabList>

          <TabPanels>
            <TabPanel>
              <VStack spacing={4} align="stretch">
                {userApplications.map((application) => (
                  <Card key={application.id}>
                    <CardHeader>
                      <VStack align="start" spacing={2}>
                        <Heading size="md">
                          {getOpportunityTitle(application.opportunityId)}
                        </Heading>
                        <HStack>
                          <Badge
                            colorScheme={
                              application.status === 'accepted'
                                ? 'green'
                                : application.status === 'rejected'
                                ? 'red'
                                : 'yellow'
                            }
                          >
                            {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                          </Badge>
                          <Text color="gray.500">
                            Applied {new Date(application.createdAt * 1000).toLocaleDateString()}
                          </Text>
                        </HStack>
                      </VStack>
                    </CardHeader>
                    <CardBody>
                      <VStack align="start" spacing={2}>
                        <Text>
                          <strong>GitHub Username:</strong> {application.githubUsername}
                        </Text>
                        <Text>
                          <strong>Certificates:</strong>
                        </Text>
                        <Box pl={4}>
                          {application.certificateIds.map((certId) => (
                            <Text key={certId}>
                              • {certificateDetails[certId]?.name || `Certificate #${certId}`}
                              {certificateDetails[certId]?.issuer && (
                                <Text as="span" color="gray.500" fontSize="sm" ml={2}>
                                  (Issued by: {certificateDetails[certId].issuer.slice(0, 6)}...{certificateDetails[certId].issuer.slice(-4)})
                                </Text>
                              )}
                            </Text>
                          ))}
                        </Box>
                      </VStack>
                    </CardBody>
                    <CardFooter>
                      <Link href={`/opportunities/${application.opportunityId}`} passHref>
                        <Button variant="outline" colorScheme="blue">
                          View Opportunity
                        </Button>
                      </Link>
                    </CardFooter>
                  </Card>
                ))}

                {userApplications.length === 0 && (
                  <Alert status="info">
                    <AlertIcon />
                    You haven't submitted any applications yet
                  </Alert>
                )}
              </VStack>
            </TabPanel>

            <TabPanel>
              <VStack spacing={6} align="stretch">
                {providerOpportunities.map((opportunity) => (
                  <Card key={opportunity.id}>
                    <CardHeader>
                      <VStack align="start" spacing={2}>
                        <HStack justify="space-between" width="full">
                          <Heading size="md">{opportunity.title}</Heading>
                          <Button
                            size="sm"
                            colorScheme={opportunity.isActive ? 'red' : 'green'}
                            onClick={() => handleOpportunityStatusToggle(opportunity.id)}
                            isLoading={isLoading}
                          >
                            {opportunity.isActive ? 'Close Applications' : 'Reopen Applications'}
                          </Button>
                        </HStack>
                        <HStack>
                          <Badge colorScheme={opportunity.isActive ? 'green' : 'red'}>
                            {opportunity.isActive ? 'Active' : 'Closed'}
                          </Badge>
                          <Text color="gray.500">
                            Posted {new Date(opportunity.createdAt * 1000).toLocaleDateString()}
                          </Text>
                        </HStack>
                      </VStack>
                    </CardHeader>
                    <CardBody>
                      <VStack spacing={4} align="stretch">
                        {opportunity.applications?.map((application: any) => (
                          <Box 
                            key={application.id} 
                            p={4} 
                            borderWidth={1} 
                            borderRadius="md"
                            cursor="pointer"
                            onClick={() => handleApplicationClick(application)}
                            _hover={{ bg: 'gray.50' }}
                            transition="background-color 0.2s"
                          >
                            <VStack align="start" spacing={2}>
                              <HStack justify="space-between" width="full">
                                <Text fontWeight="bold">
                                  Applicant: {application.applicant.slice(0, 6)}...
                                  {application.applicant.slice(-4)}
                                </Text>
                                <Badge
                                  colorScheme={
                                    application.status === 'accepted'
                                      ? 'green'
                                      : application.status === 'rejected'
                                      ? 'red'
                                      : 'yellow'
                                  }
                                >
                                  {application.status.charAt(0).toUpperCase() +
                                    application.status.slice(1)}
                                </Badge>
                              </HStack>
                              <Text>
                                <strong>GitHub Username:</strong> {application.githubUsername}
                              </Text>
                              <Text>
                                <strong>Certificates:</strong>
                              </Text>
                              <Box pl={4}>
                                {application.certificateIds.map((certId: string) => (
                                  <Text key={certId}>
                                    • {certificateDetails[certId]?.name || `Certificate #${certId}`}
                                    {certificateDetails[certId]?.issuer && (
                                      <Text as="span" color="gray.500" fontSize="sm" ml={2}>
                                        (Issued by: {certificateDetails[certId].issuer.slice(0, 6)}...{certificateDetails[certId].issuer.slice(-4)})
                                      </Text>
                                    )}
                                  </Text>
                                ))}
                              </Box>
                            </VStack>
                          </Box>
                        ))}
                        {(!opportunity.applications || opportunity.applications.length === 0) && (
                          <Alert status="info">
                            <AlertIcon />
                            No applications received yet
                          </Alert>
                        )}
                      </VStack>
                    </CardBody>
                  </Card>
                ))}

                {providerOpportunities.length === 0 && (
                  <Alert status="info">
                    <AlertIcon />
                    You haven't posted any opportunities yet
                  </Alert>
                )}
              </VStack>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </VStack>

      {/* Add Modal for detailed view */}
      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            Application Details
            <ModalCloseButton />
          </ModalHeader>
          <ModalBody pb={6}>
            {selectedApplication && (
              <VStack spacing={6} align="stretch">
                {/* Applicant Info */}
                <Box>
                  <Heading size="sm" mb={2}>Applicant Information</Heading>
                  <Text>Address: {selectedApplication.applicant}</Text>
                  <Text>GitHub: {selectedApplication.githubUsername}</Text>
                  <Text>Applied: {new Date(selectedApplication.createdAt * 1000).toLocaleDateString()}</Text>
                  <Badge colorScheme={
                    selectedApplication.status === 'accepted' ? 'green' :
                    selectedApplication.status === 'rejected' ? 'red' : 'yellow'
                  }>
                    {selectedApplication.status.charAt(0).toUpperCase() + selectedApplication.status.slice(1)}
                  </Badge>
                </Box>

                <Divider />

                {/* Certificates */}
                <Box>
                  <Heading size="sm" mb={2}>Certificates</Heading>
                  <VStack align="stretch" spacing={3}>
                    {selectedApplication.certificateIds.map((certId) => {
                      const cert = certificateDetails[certId]
                      return (
                        <Card key={certId} variant="outline">
                          <CardBody>
                            <VStack align="start" spacing={2}>
                              <Heading size="sm">{cert?.name || `Certificate #${certId}`}</Heading>
                              <Text fontSize="sm">{cert?.description}</Text>
                              <HStack>
                                <Text fontSize="sm" color="gray.500">Issued by:</Text>
                                <Text fontSize="sm">{cert?.issuer || 'Unknown'}</Text>
                              </HStack>
                              <Text fontSize="sm" color="gray.500">Issued on: {cert?.issueDate || 'Unknown'}</Text>
                            </VStack>
                          </CardBody>
                        </Card>
                      )
                    })}
                  </VStack>
                </Box>

                <Divider />

                {/* GitHub Contributions */}
                <Box>
                  <Heading size="sm" mb={2}>GitHub Contributions</Heading>
                  {isLoadingGithub ? (
                    <Spinner />
                  ) : (
                    <VStack spacing={6} align="stretch">
                      {repos.length > 0 && (
                        <Card variant="outline">
                          <CardHeader>
                            <Heading size="md">Repositories with Stars or Forks</Heading>
                          </CardHeader>
                          <CardBody p={0}>
                            <TableContainer>
                              <Table variant="simple" size="sm">
                                <Thead>
                                  <Tr>
                                    <Th>Repository</Th>
                                    <Th isNumeric>Stars</Th>
                                    <Th isNumeric>Forks</Th>
                                  </Tr>
                                </Thead>
                                <Tbody>
                                  {repos.map((repo, index) => (
                                    <Tr key={index}>
                                      <Td>
                                        <ChakraLink 
                                          href={`https://github.com/${selectedApplication?.githubUsername}/${repo.name}`} 
                                          isExternal
                                        >
                                          {repo.name}
                                        </ChakraLink>
                                      </Td>
                                      <Td isNumeric>{repo.stars}</Td>
                                      <Td isNumeric>{repo.forks}</Td>
                                    </Tr>
                                  ))}
                                </Tbody>
                              </Table>
                            </TableContainer>
                          </CardBody>
                        </Card>
                      )}

                      {prs.length > 0 && (
                        <Card variant="outline">
                          <CardHeader>
                            <Heading size="md">Authored Pull Requests</Heading>
                          </CardHeader>
                          <CardBody p={0}>
                            <TableContainer>
                              <Table variant="simple" size="sm">
                                <Thead>
                                  <Tr>
                                    <Th>Pull Request</Th>
                                    <Th>Title</Th>
                                    <Th>Status</Th>
                                  </Tr>
                                </Thead>
                                <Tbody>
                                  {prs.map((pr, index) => (
                                    <Tr key={index}>
                                      <Td>
                                        <ChakraLink 
                                          href={`https://github.com/${pr.repo}/pull/${pr.number}`} 
                                          isExternal
                                        >
                                          {pr.repo} PR #{pr.number}
                                        </ChakraLink>
                                      </Td>
                                      <Td>{pr.title}</Td>
                                      <Td>
                                        <Badge colorScheme={pr.merged ? 'green' : 'red'}>
                                          {pr.merged ? 'Merged' : 'Not Merged'}
                                        </Badge>
                                      </Td>
                                    </Tr>
                                  ))}
                                </Tbody>
                              </Table>
                            </TableContainer>
                          </CardBody>
                        </Card>
                      )}

                      {repos.length === 0 && prs.length === 0 && (
                        <Alert status="info">
                          <AlertIcon />
                          No GitHub contributions found
                        </Alert>
                      )}
                    </VStack>
                  )}
                </Box>

                {/* Action Buttons */}
                {selectedApplication.status === 'pending' && (
                  <HStack justify="flex-end" spacing={4}>
                    <Button
                      colorScheme="green"
                      onClick={() => {
                        handleStatusUpdate(selectedApplication.id, 'accepted')
                        onClose()
                      }}
                    >
                      Accept
                    </Button>
                    <Button
                      colorScheme="red"
                      onClick={() => {
                        handleStatusUpdate(selectedApplication.id, 'rejected')
                        onClose()
                      }}
                    >
                      Reject
                    </Button>
                  </HStack>
                )}
              </VStack>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </Container>
  )
} 