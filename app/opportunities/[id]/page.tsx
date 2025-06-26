'use client'

import {
  Box,
  Container,
  Heading,
  Text,
  Button,
  VStack,
  HStack,
  Badge,
  useToast,
  Spinner,
  Alert,
  AlertIcon,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Input,
  useDisclosure,
  Divider,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  CheckboxGroup,
  Checkbox,
  Stack,
  FormHelperText,
} from '@chakra-ui/react'
import { useOpportunity } from '../../context/OpportunityContext'
import { useWeb3Modal } from '../../context/Web3ModalContext'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ethers } from 'ethers'
import SoulboundCertificate from '../../../artifacts/contracts/SoulboundCertificate.sol/SoulboundCertificate.json'

// Add contract address constant
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_SOULBOUND_CERTIFICATE_ADDRESS

interface Certificate {
  id: number
  name: string
  description: string
  issuer: string
  issueDate: string
  ipfsHash: string
  pdfHash: string
}

export default function OpportunityDetailsPage() {
  const { id } = useParams()
  const router = useRouter()
  const { opportunities, submitApplication, isLoading, error, refreshOpportunities } = useOpportunity()
  const { isConnected, connect, address, provider } = useWeb3Modal()
  const toast = useToast()
  const { isOpen, onOpen, onClose } = useDisclosure()

  const [opportunity, setOpportunity] = useState<any>(null)
  const [selectedCertificates, setSelectedCertificates] = useState<string[]>([])
  const [githubUsername, setGithubUsername] = useState('')
  const [isLoadingGithub, setIsLoadingGithub] = useState(false)
  const [userCertificates, setUserCertificates] = useState<Certificate[]>([])
  const [email, setEmail] = useState('')

  useEffect(() => {
    refreshOpportunities()
  }, [refreshOpportunities])

  useEffect(() => {
    if (opportunities.length > 0) {
      const found = opportunities.find(opp => opp.id === Number(id))
      if (found) {
        setOpportunity(found)
      } else {
        router.push('/opportunities')
      }
    }
  }, [opportunities, id, router])

  // Add function to fetch GitHub username
  const fetchGithubUsername = async () => {
    if (!provider || !address || !CONTRACT_ADDRESS) return

    try {
      setIsLoadingGithub(true)
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        SoulboundCertificate.abi,
        provider
      )

      // Assuming there's a function to get GitHub username in the contract
      // You'll need to add this function to your smart contract if it doesn't exist
      const username = await contract.getGithubUsername(address)
      if (username) {
        setGithubUsername(username)
      }
    } catch (error) {
      console.error('Error fetching GitHub username:', error)
      // Don't show error toast as this is optional
    } finally {
      setIsLoadingGithub(false)
    }
  }

  // Update the certificate fetching useEffect to also fetch GitHub username
  useEffect(() => {
    const fetchData = async () => {
      if (!provider || !address || !CONTRACT_ADDRESS) return

      try {
        const contract = new ethers.Contract(
          CONTRACT_ADDRESS,
          SoulboundCertificate.abi,
          provider
        )

        // Fetch certificates and GitHub username in parallel
        const [balance, username] = await Promise.all([
          contract.balanceOf(address),
          contract.getGithubUsername(address).catch(() => '') // Handle case where function doesn't exist
        ])

        // Set GitHub username if available
        if (username) {
          setGithubUsername(username)
        }

        const certificates: Certificate[] = []

        // If user has no certificates, return empty array
        if (balance === 0n) {
          setUserCertificates([])
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

        setUserCertificates(certificates)
      } catch (error) {
        console.error('Error fetching data:', error)
        toast({
          title: 'Error',
          description: 'Failed to fetch data',
          status: 'error',
          duration: 3000,
          isClosable: true,
        })
      }
    }

    if (isConnected && provider) {
      fetchData()
    }
  }, [isConnected, provider, address, toast])

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

  const handleApply = async () => {
    if (!isConnected) {
      try {
        await connect()
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to connect wallet',
          status: 'error',
          duration: 3000,
          isClosable: true,
        })
        return
      }
    }

    if (!email) {
      toast({
        title: 'Error',
        description: 'Please enter your email address',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
      return
    }

    try {
      await submitApplication(Number(id), selectedCertificates, githubUsername, email)
      toast({
        title: 'Success',
        description: 'Application submitted successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      })
      onClose()
      router.push('/applications')
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to submit application',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
    }
  }

  if (isLoading) {
    return (
      <Container maxW="container.xl" py={10}>
        <VStack spacing={4}>
          <Spinner size="xl" />
          <Text>Loading opportunity details...</Text>
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

  if (!opportunity) {
    return null
  }

  return (
    <Container maxW="container.xl" py={10}>
      <VStack spacing={8} align="stretch">
        <Box>
          <VStack align="start" spacing={4}>
            <Heading as="h1" size="2xl">
              {opportunity.title}
            </Heading>
            <HStack>
              <Badge colorScheme={opportunity.isActive ? 'green' : 'red'}>
                {opportunity.isActive ? 'Active' : 'Closed'}
              </Badge>
              <Text color="gray.500">
                Posted by {opportunity.provider.slice(0, 6)}...{opportunity.provider.slice(-4)}
              </Text>
              <Text color="gray.500">
                Posted {new Date(opportunity.createdAt * 1000).toLocaleDateString()}
              </Text>
            </HStack>
          </VStack>
        </Box>

        <Card>
          <CardHeader>
            <Heading size="md">Description</Heading>
          </CardHeader>
          <CardBody>
            <Text whiteSpace="pre-wrap">{opportunity.description}</Text>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <Heading size="md">Requirements</Heading>
          </CardHeader>
          <CardBody>
            <Text whiteSpace="pre-wrap">{opportunity.requirements}</Text>
          </CardBody>
        </Card>

        <Box>
          {!isConnected ? (
            <Button colorScheme="blue" onClick={handleConnect}>
              Connect Wallet to Apply
            </Button>
          ) : opportunity.provider.toLowerCase() === address?.toLowerCase() ? (
            <Alert status="info">
              <AlertIcon />
              You cannot apply to your own opportunity
            </Alert>
          ) : (
            <Button
              colorScheme="green"
              onClick={onOpen}
              isDisabled={!opportunity.isActive}
            >
              Apply Now
            </Button>
          )}
        </Box>

        <Modal isOpen={isOpen} onClose={onClose} size="xl">
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Apply for Opportunity</ModalHeader>
            <ModalCloseButton />
            <ModalBody pb={6}>
              <VStack spacing={4}>
                <FormControl isRequired>
                  <FormLabel>Select Certificates</FormLabel>
                  <VStack align="stretch" spacing={2}>
                    {userCertificates.map((certificate) => (
                      <Checkbox
                        key={certificate.id}
                        isChecked={selectedCertificates.includes(certificate.id.toString())}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedCertificates([...selectedCertificates, certificate.id.toString()])
                          } else {
                            setSelectedCertificates(selectedCertificates.filter(id => id !== certificate.id.toString()))
                          }
                        }}
                      >
                        {certificate.name}
                      </Checkbox>
                    ))}
                  </VStack>
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>GitHub Username</FormLabel>
                  <Input
                    value={githubUsername}
                    onChange={(e) => setGithubUsername(e.target.value)}
                    placeholder="Enter your GitHub username"
                    isReadOnly={!!githubUsername}
                    isDisabled={isLoadingGithub}
                  />
                  {isLoadingGithub && (
                    <Text fontSize="sm" color="gray.500" mt={1}>
                      Fetching GitHub username...
                    </Text>
                  )}
                  {!githubUsername && !isLoadingGithub && (
                    <Text fontSize="sm" color="gray.500" mt={1}>
                      If your GitHub username is not automatically fetched, please enter it manually.
                    </Text>
                  )}
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>Email Address</FormLabel>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                  />
                  <FormHelperText>
                    This will be shared with the opportunity provider
                  </FormHelperText>
                </FormControl>

                <Button
                  colorScheme="blue"
                  width="full"
                  onClick={handleApply}
                  isLoading={isLoading}
                  loadingText="Submitting..."
                  isDisabled={selectedCertificates.length === 0 || !githubUsername || !email}
                >
                  Submit Application
                </Button>
              </VStack>
            </ModalBody>
          </ModalContent>
        </Modal>
      </VStack>
    </Container>
  )
} 