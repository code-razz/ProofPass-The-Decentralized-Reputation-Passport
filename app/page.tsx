'use client'

import { Box, Container, Heading, VStack, Button, Text, useToast, Alert, AlertIcon } from '@chakra-ui/react'
import { useWeb3Modal } from './context/Web3ModalContext'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import SoulboundCertificate from '../artifacts/contracts/SoulboundCertificate.sol/SoulboundCertificate.json'

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS

export default function Home() {
  const { address, isConnected, connect, disconnect, provider } = useWeb3Modal()
  const toast = useToast()
  const [contractOwner, setContractOwner] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (isConnected && provider && CONTRACT_ADDRESS) {
      fetchContractOwner()
    }
  }, [isConnected, provider])

  const fetchContractOwner = async () => {
    if (!provider || !CONTRACT_ADDRESS) {
      console.log('Provider or contract address not available', {
        hasProvider: !!provider,
        contractAddress: CONTRACT_ADDRESS
      })
      return
    }

    setIsLoading(true)
    try {
      console.log('Fetching contract owner...')
      console.log('Contract Address:', CONTRACT_ADDRESS)
      console.log('Provider Network:', (await provider.getNetwork()).chainId)
      
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        SoulboundCertificate.abi,
        provider
      )
      
      // Verify contract is deployed
      const code = await provider.getCode(CONTRACT_ADDRESS)
      console.log('Contract Code Length:', code.length)
      if (code === '0x') {
        throw new Error('No contract deployed at this address')
      }

      // Try to get owner
      console.log('Attempting to call owner()...')
      const owner = await contract.owner()
      console.log('Contract Owner:', owner)
      console.log('Connected Address:', address)
      console.log('Is Connected Address Owner:', address?.toLowerCase() === owner.toLowerCase())
      
      setContractOwner(owner)
    } catch (error) {
      console.error('Error fetching contract owner:', error)
      console.error('Detailed error information:', {
        provider: !!provider,
        contractAddress: CONTRACT_ADDRESS,
        errorName: error instanceof Error ? error.name : 'Unknown',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : undefined,
        contractABI: SoulboundCertificate.abi ? 'Available' : 'Missing'
      })
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to fetch contract owner',
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleConnect = async () => {
    try {
      await connect()
      toast({
        title: 'Connected',
        description: 'Wallet connected successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to connect wallet',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
    }
  }

  return (
    <Container maxW="container.xl" py={10}>
      <VStack spacing={8} align="stretch">
        <Box textAlign="center">
          <Heading as="h1" size="2xl" mb={4}>
            Soulbound Certificate System
          </Heading>
          <Text fontSize="xl" color="gray.600">
            Issue and manage certificates as non-transferable tokens
          </Text>
        </Box>

        {isConnected && contractOwner && (
          <Alert status="info" variant="subtle">
            <AlertIcon />
            <Box>
              <Text fontWeight="bold">Contract Owner:</Text>
              <Text>{contractOwner}</Text>
              {address?.toLowerCase() === contractOwner.toLowerCase() && (
                <Text mt={2} color="green.500">
                  You are the contract owner! You can access the admin dashboard to manage issuers.
                </Text>
              )}
            </Box>
          </Alert>
        )}

        <Box textAlign="center">
          {!isConnected ? (
            <Button
              colorScheme="blue"
              size="lg"
              onClick={handleConnect}
            >
              Connect Wallet
            </Button>
          ) : (
            <VStack spacing={4}>
              <Text>
                Connected: {address?.slice(0, 6)}...{address?.slice(-4)}
              </Text>
              <Button
                colorScheme="red"
                variant="outline"
                onClick={disconnect}
              >
                Disconnect
              </Button>
              <Box>
                <Link href="/issuer" passHref>
                  <Button colorScheme="green" mr={4}>
                    Issuer Dashboard
                  </Button>
                </Link>
                <Link href="/certificates" passHref>
                  <Button colorScheme="purple" mr={4}>
                    My Certificates
                  </Button>
                </Link>
                <Link href="/admin" passHref>
                  <Button colorScheme="orange">
                    Admin Dashboard
                  </Button>
                </Link>
              </Box>
            </VStack>
          )}
        </Box>
      </VStack>
    </Container>
  )
} 