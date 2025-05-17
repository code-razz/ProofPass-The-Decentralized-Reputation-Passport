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
  Textarea,
  Button,
  useToast,
  Text,
  Alert,
  AlertIcon,
} from '@chakra-ui/react'
import { useWeb3Modal } from '../context/Web3ModalContext'
import axios from 'axios'

// Pinata API configuration
const PINATA_API_KEY = process.env.NEXT_PUBLIC_PINATA_API_KEY
const PINATA_API_SECRET = process.env.NEXT_PUBLIC_PINATA_API_SECRET

// Debug logging
console.log('Environment check:', {
  hasApiKey: !!PINATA_API_KEY,
  hasApiSecret: !!PINATA_API_SECRET,
  apiKeyLength: PINATA_API_KEY?.length,
  apiSecretLength: PINATA_API_SECRET?.length,
})

export default function IssuerDashboard() {
  const { address, isConnected, provider } = useWeb3Modal()
  const toast = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [pinataConfigured, setPinataConfigured] = useState(false)
  const [formData, setFormData] = useState({
    recipientAddress: '',
    certificateName: '',
    description: '',
  })

  useEffect(() => {
    // Check if Pinata credentials are configured
    if (!PINATA_API_KEY || !PINATA_API_SECRET) {
      console.error('Pinata credentials not configured')
      setPinataConfigured(false)
    } else {
      setPinataConfigured(true)
    }
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const uploadToPinata = async (metadata: any) => {
    if (!PINATA_API_KEY || !PINATA_API_SECRET) {
      throw new Error('Pinata credentials not configured')
    }

    try {
      const data = JSON.stringify(metadata)
      
      const response = await axios.post(
        'https://api.pinata.cloud/pinning/pinJSONToIPFS',
        data,
        {
          headers: {
            'Content-Type': 'application/json',
            'pinata_api_key': PINATA_API_KEY,
            'pinata_secret_api_key': PINATA_API_SECRET,
          },
          timeout: 10000, // 10 second timeout
        }
      )

      if (!response.data || !response.data.IpfsHash) {
        throw new Error('Invalid response from Pinata')
      }

      return response.data.IpfsHash
    } catch (error: any) {
      console.error('Error uploading to Pinata:', error)
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Pinata API Error:', {
          status: error.response.status,
          data: error.response.data,
        })
        throw new Error(`Pinata API Error: ${error.response.data?.error || error.response.statusText}`)
      } else if (error.request) {
        // The request was made but no response was received
        throw new Error('No response from Pinata API')
      } else {
        // Something happened in setting up the request
        throw new Error(`Error setting up request: ${error.message}`)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isConnected || !provider) {
      toast({
        title: 'Error',
        description: 'Please connect your wallet first',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
      return
    }

    if (!pinataConfigured) {
      toast({
        title: 'Configuration Error',
        description: 'Pinata credentials not configured. Please check your environment variables.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
      return
    }

    setIsLoading(true)
    try {
      // Upload metadata to IPFS via Pinata
      const metadata = {
        name: formData.certificateName,
        description: formData.description,
        issuer: address,
        issueDate: new Date().toISOString(),
        attributes: [
          {
            trait_type: "Certificate Type",
            value: "Soulbound Token"
          }
        ]
      }

      const ipfsHash = await uploadToPinata(metadata)

      // TODO: Call smart contract to issue certificate
      // This will be implemented after contract deployment
      console.log('IPFS Hash:', ipfsHash)
      console.log('Recipient:', formData.recipientAddress)

      toast({
        title: 'Success',
        description: 'Certificate metadata uploaded to IPFS',
        status: 'success',
        duration: 3000,
        isClosable: true,
      })

      // Reset form
      setFormData({
        recipientAddress: '',
        certificateName: '',
        description: '',
      })
    } catch (error: any) {
      console.error('Error:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to issue certificate',
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
          <Heading>Issuer Dashboard</Heading>
          <Text>Please connect your wallet to access the issuer dashboard.</Text>
        </VStack>
      </Container>
    )
  }

  return (
    <Container maxW="container.xl" py={10}>
      <VStack spacing={8} align="stretch">
        <Box>
          <Heading mb={4}>Issue New Certificate</Heading>
          <Text color="gray.600">
            Connected as issuer: {address?.slice(0, 6)}...{address?.slice(-4)}
          </Text>
          {!pinataConfigured && (
            <Alert status="error" mt={4}>
              <AlertIcon />
              Pinata credentials not configured. Please check your environment variables.
            </Alert>
          )}
        </Box>

        <Box as="form" onSubmit={handleSubmit}>
          <VStack spacing={4} align="stretch">
            <FormControl isRequired>
              <FormLabel>Recipient Address</FormLabel>
              <Input
                name="recipientAddress"
                value={formData.recipientAddress}
                onChange={handleInputChange}
                placeholder="0x..."
                isDisabled={!pinataConfigured}
              />
            </FormControl>

            <FormControl isRequired>
              <FormLabel>Certificate Name</FormLabel>
              <Input
                name="certificateName"
                value={formData.certificateName}
                onChange={handleInputChange}
                placeholder="e.g., Web3 Development Certificate"
                isDisabled={!pinataConfigured}
              />
            </FormControl>

            <FormControl isRequired>
              <FormLabel>Description</FormLabel>
              <Textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Describe the certificate and its requirements..."
                rows={4}
                isDisabled={!pinataConfigured}
              />
            </FormControl>

            <Button
              type="submit"
              colorScheme="blue"
              size="lg"
              isLoading={isLoading}
              loadingText="Issuing Certificate..."
              isDisabled={!pinataConfigured}
            >
              Issue Certificate
            </Button>
          </VStack>
        </Box>
      </VStack>
    </Container>
  )
} 