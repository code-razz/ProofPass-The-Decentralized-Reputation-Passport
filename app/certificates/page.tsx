'use client'

import React, { useEffect, useState } from 'react'
import {
  Box,
  Container,
  VStack,
  Heading,
  Text,
  SimpleGrid,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Button,
  useToast,
  Badge,
} from '@chakra-ui/react'
import { useWeb3Modal } from '../context/Web3ModalContext'
import { ethers } from 'ethers'

interface Certificate {
  id: number
  name: string
  description: string
  issuer: string
  issueDate: string
  ipfsHash: string
}

export default function Certificates() {
  const { address, isConnected, provider } = useWeb3Modal()
  const toast = useToast()
  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (isConnected && provider) {
      fetchCertificates()
    }
  }, [isConnected, provider])

  const fetchCertificates = async () => {
    if (!provider || !address) return

    setIsLoading(true)
    try {
      // TODO: Implement contract calls to fetch certificates
      // This is a placeholder for demonstration
      const mockCertificates: Certificate[] = [
        {
          id: 1,
          name: 'Web3 Development Certificate',
          description: 'Completed advanced Web3 development course',
          issuer: '0x1234...5678',
          issueDate: '2024-03-15',
          ipfsHash: 'Qm...',
        },
      ]
      setCertificates(mockCertificates)
    } catch (error) {
      console.error('Error fetching certificates:', error)
      toast({
        title: 'Error',
        description: 'Failed to fetch certificates',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleShare = async (certificate: Certificate) => {
    // TODO: Implement sharing functionality
    // This could generate a shareable link or QR code
    toast({
      title: 'Share Certificate',
      description: 'Sharing functionality coming soon',
      status: 'info',
      duration: 3000,
      isClosable: true,
    })
  }

  const handleDownload = async (certificate: Certificate) => {
    // TODO: Implement certificate download
    // This could generate a PDF or JSON file
    toast({
      title: 'Download Certificate',
      description: 'Download functionality coming soon',
      status: 'info',
      duration: 3000,
      isClosable: true,
    })
  }

  if (!isConnected) {
    return (
      <Container maxW="container.xl" py={10}>
        <VStack spacing={4}>
          <Heading>My Certificates</Heading>
          <Text>Please connect your wallet to view your certificates.</Text>
        </VStack>
      </Container>
    )
  }

  return (
    <Container maxW="container.xl" py={10}>
      <VStack spacing={8} align="stretch">
        <Box>
          <Heading mb={4}>My Certificates</Heading>
          <Text color="gray.600">
            Connected as: {address?.slice(0, 6)}...{address?.slice(-4)}
          </Text>
        </Box>

        {isLoading ? (
          <Text>Loading certificates...</Text>
        ) : certificates.length === 0 ? (
          <Text>No certificates found.</Text>
        ) : (
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
            {certificates.map((certificate) => (
              <Card key={certificate.id} variant="outline">
                <CardHeader>
                  <Heading size="md">{certificate.name}</Heading>
                  <Badge colorScheme="green" mt={2}>
                    Issued on {certificate.issueDate}
                  </Badge>
                </CardHeader>
                <CardBody>
                  <Text>{certificate.description}</Text>
                  <Text fontSize="sm" color="gray.500" mt={2}>
                    Issuer: {certificate.issuer}
                  </Text>
                </CardBody>
                <CardFooter>
                  <Button
                    colorScheme="blue"
                    size="sm"
                    mr={2}
                    onClick={() => handleShare(certificate)}
                  >
                    Share
                  </Button>
                  <Button
                    colorScheme="purple"
                    size="sm"
                    onClick={() => handleDownload(certificate)}
                  >
                    Download
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </SimpleGrid>
        )}
      </VStack>
    </Container>
  )
} 