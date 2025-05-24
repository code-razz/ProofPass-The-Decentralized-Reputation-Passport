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
  Tabs,
  TabList,
  TabPanels,
  TabPanel,
  Tab
} from '@chakra-ui/react'
import { useWeb3Modal } from '../context/Web3ModalContext'
import { ethers } from 'ethers'
import SoulboundCertificate from '../../artifacts/contracts/SoulboundCertificate.sol/SoulboundCertificate.json'
import GithubContributions from '../components/GithubContributions'

// Add contract address constant
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS

interface Certificate {
  id: number
  name: string
  description: string
  issuer: string
  issueDate: string
  ipfsHash: string
  pdfHash: string
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
    if (!provider || !address || !CONTRACT_ADDRESS) return

    setIsLoading(true)
    try {
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        SoulboundCertificate.abi,
        provider
      )

      // Get balance of the connected address instead of total supply
      const balance = await contract.balanceOf(address)
      const certificates: Certificate[] = []

      // If user has no certificates, return empty array
      if (balance === 0n) {
        setCertificates([])
        return
      }

      // Get all token IDs owned by the address
      const tokenIds: bigint[] = []
      for (let i = 0; i < balance; i++) {
        try {
          const tokenId = await contract.tokenOfOwnerByIndex(address, i)
          tokenIds.push(tokenId)
        } catch (error) {
          console.error(`Error fetching token ${i}:`, error)
          continue
        }
      }

      // Fetch details for each token
      for (const tokenId of tokenIds) {
        try {
          const ipfsHash = await contract.tokenURI(tokenId)
          const issuer = await contract.getIssuer(tokenId)
          const issueDate = await contract.getIssueDate(tokenId)

          // Fetch metadata from IPFS
          const response = await fetch(`https://ipfs.io/ipfs/${ipfsHash}`)
          const metadata = await response.json()

          certificates.push({
            id: Number(tokenId),
            name: metadata.name,
            description: metadata.description,
            issuer: issuer,
            issueDate: new Date(Number(issueDate) * 1000).toLocaleDateString(),
            ipfsHash: ipfsHash,
            pdfHash: metadata.pdfHash,
          })
        } catch (error) {
          console.error(`Error fetching certificate ${tokenId}:`, error)
          continue
        }
      }

      setCertificates(certificates)
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
    try {
      // Create a temporary link element
      const link = document.createElement('a')
      link.href = `https://ipfs.io/ipfs/${certificate.pdfHash}`
      link.download = `${certificate.name.replace(/\s+/g, '_')}_certificate.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast({
        title: 'Download Started',
        description: 'Your certificate PDF is being downloaded',
        status: 'success',
        duration: 3000,
        isClosable: true,
      })
    } catch (error) {
      console.error('Error downloading certificate:', error)
      toast({
        title: 'Error',
        description: 'Failed to download certificate',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
    }
  }

  const handleViewPDF = (certificate: Certificate) => {
    window.open(`https://ipfs.io/ipfs/${certificate.pdfHash}`, '_blank')
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

        <Tabs isFitted variant="enclosed">
          <TabList mb="1em">
            <Tab>Certificates</Tab>
            <Tab>GitHub Contributions</Tab>
          </TabList>

          <TabPanels>
            <TabPanel>
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
                          mr={2}
                          onClick={() => handleViewPDF(certificate)}
                        >
                          View PDF
                        </Button>
                        <Button
                          colorScheme="green"
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
            </TabPanel>
            <TabPanel>
              <GithubContributions />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </VStack>
    </Container>
  )
} 