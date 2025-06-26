'use client'

import React, { useState, useEffect } from 'react'
import {
  Box,
  Container,
  VStack,
  Heading,
  FormControl,
  FormLabel,
  Input,
  Button,
  useToast,
  Text,
  Alert,
  AlertIcon,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
} from '@chakra-ui/react'
import { useWeb3Modal } from '../context/Web3ModalContext'
import { ethers } from 'ethers'
import SoulboundCertificate from '../../artifacts/contracts/SoulboundCertificate.sol/SoulboundCertificate.json'

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_SOULBOUND_CERTIFICATE_ADDRESS

interface Issuer {
  address: string
  isAuthorized: boolean
}

interface IssuerRequest {
  requester: string
  reason: string
  timestamp: number
  isPending: boolean
}

interface ActivityLog {
  actor: string;
  target: string;
  action: string;
  details: string;
  timestamp: number;
}

export default function AdminDashboard() {
  const { address, isConnected, provider } = useWeb3Modal()
  const toast = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [isOwner, setIsOwner] = useState(false)
  const [issuerAddress, setIssuerAddress] = useState('')
  const [issuers, setIssuers] = useState<Issuer[]>([])
  const [pendingRequests, setPendingRequests] = useState<IssuerRequest[]>([])
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([])
  const [isLoadingLogs, setIsLoadingLogs] = useState(false)
  const [currentPage, setCurrentPage] = useState(0)
  const logsPerPage = 10

  useEffect(() => {
    if (isConnected && provider && CONTRACT_ADDRESS) {
      checkOwnership()
      fetchIssuers()
      fetchPendingRequests()
      fetchActivityLogs()
    }
  }, [isConnected, provider, currentPage])

  const checkOwnership = async () => {
    if (!provider || !address || !CONTRACT_ADDRESS) return

    try {
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        SoulboundCertificate.abi,
        provider
      )
      const owner = await contract.owner()
      setIsOwner(owner.toLowerCase() === address.toLowerCase())
    } catch (error) {
      console.error('Error checking ownership:', error)
      setIsOwner(false)
    }
  }

  const fetchIssuers = async () => {
    if (!provider || !CONTRACT_ADDRESS) return

    try {
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        SoulboundCertificate.abi,
        provider
      )

      // Get all events for issuer authorization and revocation
      const authFilter = contract.filters.IssuerAuthorized()
      const revokeFilter = contract.filters.IssuerRevoked()
      
      const [authEvents, revokeEvents] = await Promise.all([
        contract.queryFilter(authFilter),
        contract.queryFilter(revokeFilter)
      ])

      // Create a map to store the latest event timestamp for each address
      const latestEventMap = new Map<string, { isAuthorized: boolean, timestamp: number }>()
      
      // Process all events and keep only the latest state for each address
      const processEvent = (event: any, isAuthorized: boolean) => {
        if ('args' in event && event.args) {
          const issuerAddress = event.args.issuer.toLowerCase()
          const timestamp = event.blockNumber

          if (issuerAddress) {
            const currentState = latestEventMap.get(issuerAddress)
            if (!currentState || timestamp > currentState.timestamp) {
              latestEventMap.set(issuerAddress, { isAuthorized, timestamp })
            }
          }
        }
      }

      // Process all events
      authEvents.forEach(event => processEvent(event, true))
      revokeEvents.forEach(event => processEvent(event, false))

      // Convert map to array, only keeping the latest state
      const issuersList: Issuer[] = Array.from(latestEventMap.entries()).map(([address, state]) => ({
        address,
        isAuthorized: state.isAuthorized
      }))

      setIssuers(issuersList)
    } catch (error) {
      console.error('Error fetching issuers:', error)
      toast({
        title: 'Error',
        description: 'Failed to fetch issuers',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
    }
  }

  const fetchPendingRequests = async () => {
    if (!provider || !CONTRACT_ADDRESS) return

    try {
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        SoulboundCertificate.abi,
        provider
      )

      const requesters = await contract.getPendingRequesters()
      const requests: IssuerRequest[] = []

      for (const requester of requesters) {
        const request = await contract.getIssuerRequest(requester)
        // console.log("Raw timestamp value:", request.timestamp, typeof request.timestamp);

        requests.push({
          requester: request.requesterAddr,
          reason: request.reason,
          timestamp: Number(request.timestamp),
          isPending: request.isPending
        })
      }

      setPendingRequests(requests)
    } catch (error) {
      console.error('Error fetching pending requests:', error)
      toast({
        title: 'Error',
        description: 'Failed to fetch pending requests',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
    }
  }

  const fetchActivityLogs = async () => {
    if (!provider || !CONTRACT_ADDRESS) return;

    setIsLoadingLogs(true);
    try {
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        SoulboundCertificate.abi,
        provider
      );

      const [actors, targets, actions, details, timestamps] = await contract.getActivityLogs(
        currentPage * logsPerPage,
        logsPerPage
      );

      const logs: ActivityLog[] = actors.map((actor: string, index: number) => ({
        actor,
        target: targets[index],
        action: actions[index],
        details: details[index],
        timestamp: Number(timestamps[index])
      }));

      setActivityLogs(logs);
    } catch (error) {
      console.error('Error fetching activity logs:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch activity logs',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'AUTHORIZE':
        return 'green';
      case 'REVOKE':
        return 'red';
      case 'REQUEST':
        return 'blue';
      case 'APPROVE':
        return 'green';
      case 'REJECT':
        return 'red';
      default:
        return 'gray';
    }
  };

  const handleAuthorizeIssuer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isConnected || !provider || !CONTRACT_ADDRESS) {
      toast({
        title: 'Error',
        description: 'Please connect your wallet first',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
      return
    }

    if (!isOwner) {
      toast({
        title: 'Error',
        description: 'Only the contract owner can authorize issuers',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
      return
    }

    setIsLoading(true)
    try {
      const signer = await provider.getSigner()
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        SoulboundCertificate.abi,
        signer
      )

      const tx = await contract.authorizeIssuer(issuerAddress)
      await tx.wait()

      toast({
        title: 'Success',
        description: 'Issuer authorized successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      })

      setIssuerAddress('')
      fetchIssuers() // Refresh the list
    } catch (error: any) {
      console.error('Error authorizing issuer:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to authorize issuer',
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleRevokeIssuer = async (issuerAddress: string) => {
    if (!isConnected || !provider || !CONTRACT_ADDRESS) {
      toast({
        title: 'Error',
        description: 'Please connect your wallet first',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
      return
    }

    if (!isOwner) {
      toast({
        title: 'Error',
        description: 'Only the contract owner can revoke issuers',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
      return
    }

    setIsLoading(true)
    try {
      const signer = await provider.getSigner()
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        SoulboundCertificate.abi,
        signer
      )

      const tx = await contract.revokeIssuer(issuerAddress)
      await tx.wait()

      toast({
        title: 'Success',
        description: 'Issuer revoked successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      })

      fetchIssuers() // Refresh the list
    } catch (error: any) {
      console.error('Error revoking issuer:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to revoke issuer',
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleApproveRequest = async (requesterAddress: string) => {
    if (!isConnected || !provider || !CONTRACT_ADDRESS) {
      toast({
        title: 'Error',
        description: 'Please connect your wallet first',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
      return
    }

    if (!isOwner) {
      toast({
        title: 'Error',
        description: 'Only the contract owner can approve requests',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
      return
    }

    setIsLoading(true)
    try {
      const signer = await provider.getSigner()
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        SoulboundCertificate.abi,
        signer
      )

      const tx = await contract.approveIssuerRequest(requesterAddress)
      await tx.wait()

      toast({
        title: 'Success',
        description: 'Issuer request approved successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      })

      fetchIssuers()
      fetchPendingRequests()
    } catch (error: any) {
      console.error('Error approving request:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to approve request',
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleRejectRequest = async (requesterAddress: string) => {
    if (!isConnected || !provider || !CONTRACT_ADDRESS) {
      toast({
        title: 'Error',
        description: 'Please connect your wallet first',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
      return
    }

    if (!isOwner) {
      toast({
        title: 'Error',
        description: 'Only the contract owner can reject requests',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
      return
    }

    setIsLoading(true)
    try {
      const signer = await provider.getSigner()
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        SoulboundCertificate.abi,
        signer
      )

      const tx = await contract.rejectIssuerRequest(requesterAddress)
      await tx.wait()

      toast({
        title: 'Success',
        description: 'Issuer request rejected successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      })

      fetchPendingRequests()
    } catch (error: any) {
      console.error('Error rejecting request:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to reject request',
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (!isConnected) {
    return (
      <Container maxW="container.xl" py={10}>
        <VStack spacing={4}>
          <Heading>Admin Dashboard</Heading>
          <Text>Please connect your wallet to access the admin dashboard.</Text>
        </VStack>
      </Container>
    )
  }

  if (!isOwner) {
    return (
      <Container maxW="container.xl" py={10}>
        <VStack spacing={4}>
          <Heading>Admin Dashboard</Heading>
          <Alert status="error">
            <AlertIcon />
            Only the contract owner can access the admin dashboard.
          </Alert>
        </VStack>
      </Container>
    )
  }

  return (
    <Container maxW="container.xl" py={10}>
      <VStack spacing={8} align="stretch">
        <Box>
          <Heading mb={4}>Manage Issuers</Heading>
          <Text color="gray.600">
            Connected as contract owner: {address?.slice(0, 6)}...{address?.slice(-4)}
          </Text>
        </Box>

        <Box as="form" onSubmit={handleAuthorizeIssuer}>
          <VStack spacing={4} align="stretch">
            <FormControl isRequired>
              <FormLabel>Issuer Address</FormLabel>
              <Input
                value={issuerAddress}
                onChange={(e) => setIssuerAddress(e.target.value)}
                placeholder="0x..."
              />
            </FormControl>

            <Button
              type="submit"
              colorScheme="blue"
              size="lg"
              isLoading={isLoading}
              loadingText="Authorizing..."
            >
              Authorize Issuer
            </Button>
          </VStack>
        </Box>

        <Box w="full">
          <Heading size="md" mb={4}>Pending Issuer Requests</Heading>
          {pendingRequests.length === 0 ? (
            <Text>No pending requests</Text>
          ) : (
            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th>Requester</Th>
                  <Th>Reason</Th>
                  <Th>Date</Th>
                  <Th>Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {pendingRequests.map((request) => (
                  <Tr key={request.requester}>
                    <Td>{request.requester}</Td>
                    <Td>{request.reason}</Td>
                    <Td>{new Date(request.timestamp * 1000).toLocaleDateString()}</Td>
                    <Td>
                      <Button
                        size="sm"
                        colorScheme="green"
                        mr={2}
                        onClick={() => handleApproveRequest(request.requester)}
                        isLoading={isLoading}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        colorScheme="red"
                        onClick={() => handleRejectRequest(request.requester)}
                        isLoading={isLoading}
                      >
                        Reject
                      </Button>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </Box>

        <Box>
          <Heading size="md" mb={4}>Authorized Issuers</Heading>
          {issuers.length === 0 ? (
            <Text>No issuers found.</Text>
          ) : (
            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th>Address</Th>
                  <Th>Status</Th>
                  <Th>Action</Th>
                </Tr>
              </Thead>
              <Tbody>
                {issuers.map((issuer) => (
                  <Tr key={issuer.address}>
                    <Td>{issuer.address}</Td>
                    <Td>
                      <Badge colorScheme={issuer.isAuthorized ? "green" : "red"}>
                        {issuer.isAuthorized ? "Authorized" : "Revoked"}
                      </Badge>
                    </Td>
                    <Td>
                      {issuer.isAuthorized && (
                        <Button
                          size="sm"
                          colorScheme="red"
                          onClick={() => handleRevokeIssuer(issuer.address)}
                          isLoading={isLoading}
                        >
                          Revoke
                        </Button>
                      )}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </Box>

        {/* Activity Log Section */}
        <Box w="full">
          <Heading size="md" mb={4}>Activity Log</Heading>
          {isLoadingLogs ? (
            <Text>Loading activity logs...</Text>
          ) : activityLogs.length === 0 ? (
            <Text>No activity logs found.</Text>
          ) : (
            <>
              <Table variant="simple">
                <Thead>
                  <Tr>
                    <Th>Time</Th>
                    <Th>Action</Th>
                    <Th>Actor</Th>
                    <Th>Target</Th>
                    <Th>Details</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {activityLogs.map((log, index) => (
                    <Tr key={`${log.timestamp}-${index}`}>
                      <Td>{new Date(log.timestamp * 1000).toLocaleString()}</Td>
                      <Td>
                        <Badge colorScheme={getActionColor(log.action)}>
                          {log.action}
                        </Badge>
                      </Td>
                      <Td>{log.actor}</Td>
                      <Td>{log.target}</Td>
                      <Td>{log.details}</Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
              <Box mt={4} display="flex" justifyContent="center" gap={2}>
                <Button
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                  isDisabled={currentPage === 0}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  isDisabled={activityLogs.length < logsPerPage}
                >
                  Next
                </Button>
              </Box>
            </>
          )}
        </Box>
      </VStack>
    </Container>
  )
} 