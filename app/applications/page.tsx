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
} from '@chakra-ui/react'
import { useOpportunity } from '../context/OpportunityContext'
import { useWeb3Modal } from '../context/Web3ModalContext'
import { useEffect, useCallback, useState, useRef } from 'react'
import Link from 'next/link'
import { ethers } from 'ethers'
import SoulboundCertificate from '../../artifacts/contracts/SoulboundCertificate.sol/SoulboundCertificate.json'

// Add contract address constant
const CERTIFICATE_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS

interface Certificate {
  id: number
  name: string
  description: string
  issuer: string
  issueDate: string
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
                          <Box key={application.id} p={4} borderWidth={1} borderRadius="md">
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
                              {application.status === 'pending' && (
                                <HStack>
                                  <Button
                                    colorScheme="green"
                                    size="sm"
                                    onClick={() => handleStatusUpdate(application.id, 'accepted')}
                                  >
                                    Accept
                                  </Button>
                                  <Button
                                    colorScheme="red"
                                    size="sm"
                                    onClick={() => handleStatusUpdate(application.id, 'rejected')}
                                  >
                                    Reject
                                  </Button>
                                </HStack>
                              )}
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
    </Container>
  )
} 