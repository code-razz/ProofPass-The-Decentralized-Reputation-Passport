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

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS

interface Issuer {
  address: string
  isAuthorized: boolean
}

export default function AdminDashboard() {
  const { address, isConnected, provider } = useWeb3Modal()
  const toast = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [isOwner, setIsOwner] = useState(false)
  const [issuerAddress, setIssuerAddress] = useState('')
  const [issuers, setIssuers] = useState<Issuer[]>([])

  useEffect(() => {
    if (isConnected && provider && CONTRACT_ADDRESS) {
      checkOwnership()
      fetchIssuers()
    }
  }, [isConnected, provider])

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

      // Get all events for issuer authorization
      const filter = contract.filters.IssuerAuthorized()
      const events = await contract.queryFilter(filter)
      
      // Get all events for issuer revocation
      const revokeFilter = contract.filters.IssuerRevoked()
      const revokeEvents = await contract.queryFilter(revokeFilter)

      // Create a map of issuer status
      const issuerMap = new Map<string, boolean>()
      
      // Process authorization events
      events.forEach(event => {
        const issuerAddress = event.args?.issuer.toLowerCase()
        if (issuerAddress) {
          issuerMap.set(issuerAddress, true)
        }
      })

      // Process revocation events
      revokeEvents.forEach(event => {
        const issuerAddress = event.args?.issuer.toLowerCase()
        if (issuerAddress) {
          issuerMap.set(issuerAddress, false)
        }
      })

      // Convert map to array
      const issuersList: Issuer[] = Array.from(issuerMap.entries()).map(([address, isAuthorized]) => ({
        address,
        isAuthorized
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
      </VStack>
    </Container>
  )
} 