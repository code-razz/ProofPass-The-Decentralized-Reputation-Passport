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
  InputGroup,
  InputRightElement,
  Tabs,
  TabList,
  TabPanels,
  TabPanel,
  Table,
  Thead,
  Tr,
  Th,
  Tbody,
  Badge,
} from '@chakra-ui/react'
import { useWeb3Modal } from '../context/Web3ModalContext'
import axios from 'axios'
import { ethers } from 'ethers'
import SoulboundCertificate from '../../artifacts/contracts/SoulboundCertificate.sol/SoulboundCertificate.json'

// Pinata API configuration
const PINATA_API_KEY = process.env.NEXT_PUBLIC_PINATA_API_KEY
const PINATA_API_SECRET = process.env.NEXT_PUBLIC_PINATA_API_SECRET

// Add contract address constant
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS

// Debug logging
console.log('Environment check:', {
  hasApiKey: !!PINATA_API_KEY,
  hasApiSecret: !!PINATA_API_SECRET,
  apiKeyLength: PINATA_API_KEY?.length,
  apiSecretLength: PINATA_API_SECRET?.length,
})

interface ActivityLog {
  actor: string
  target: string
  action: string
  details: string
  timestamp: number
}

interface VerificationRequest {
  requester: string
  certificateId: number
  reason: string
  timestamp: number
  isPending: boolean
  isApproved: boolean
  rejectionReason: string
}

export default function IssuerDashboard() {
  const { address, isConnected, provider } = useWeb3Modal()
  const toast = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [pinataConfigured, setPinataConfigured] = useState(false)
  const [isAuthorizedIssuer, setIsAuthorizedIssuer] = useState(false)
  const [hasPendingRequest, setHasPendingRequest] = useState(false)
  const [requestReason, setRequestReason] = useState('')
  const [formData, setFormData] = useState({
    recipientAddress: '',
    certificateName: '',
    description: '',
    pdfFile: null as File | null,
  })
  const [pdfFileName, setPdfFileName] = useState('')
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([])
  const [verificationRequests, setVerificationRequests] = useState<VerificationRequest[]>([])
  const [selectedTab, setSelectedTab] = useState(0)

  useEffect(() => {
    // Check if Pinata credentials are configured
    if (!PINATA_API_KEY || !PINATA_API_SECRET) {
      console.error('Pinata credentials not configured')
      setPinataConfigured(false)
    } else {
      setPinataConfigured(true)
    }

    // Check if connected wallet is an authorized issuer and has pending request
    if (isConnected && provider && CONTRACT_ADDRESS) {
      checkIssuerAuthorization()
      checkPendingRequest()
      loadActivityLogs()
      loadVerificationRequests()
    }
  }, [isConnected, provider])

  const checkIssuerAuthorization = async () => {
    if (!provider || !address || !CONTRACT_ADDRESS) return

    try {
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        SoulboundCertificate.abi,
        provider
      )
      const isAuthorized = await contract.authorizedIssuers(address)
      setIsAuthorizedIssuer(isAuthorized)
    } catch (error) {
      console.error('Error checking issuer authorization:', error)
      setIsAuthorizedIssuer(false)
    }
  }

  const checkPendingRequest = async () => {
    if (!provider || !address || !CONTRACT_ADDRESS) return

    try {
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        SoulboundCertificate.abi,
        provider
      )
      const request = await contract.getIssuerRequest(address)
      setHasPendingRequest(request.isPending)
    } catch (error) {
      console.error('Error checking pending request:', error)
      setHasPendingRequest(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.type !== 'application/pdf') {
        toast({
          title: 'Invalid file type',
          description: 'Please upload a PDF file',
          status: 'error',
          duration: 3000,
          isClosable: true,
        })
        return
      }
      setFormData(prev => ({ ...prev, pdfFile: file }))
      setPdfFileName(file.name)
    }
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

  const uploadFileToPinata = async (file: File) => {
    if (!PINATA_API_KEY || !PINATA_API_SECRET) {
      throw new Error('Pinata credentials not configured')
    }

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await axios.post(
        'https://api.pinata.cloud/pinning/pinFileToIPFS',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'pinata_api_key': PINATA_API_KEY,
            'pinata_secret_api_key': PINATA_API_SECRET,
          },
          maxBodyLength: Infinity,
          timeout: 30000, // 30 second timeout for file upload
        }
      )

      if (!response.data || !response.data.IpfsHash) {
        throw new Error('Invalid response from Pinata')
      }

      return response.data.IpfsHash
    } catch (error: any) {
      console.error('Error uploading file to Pinata:', error)
      if (error.response) {
        throw new Error(`Pinata API Error: ${error.response.data?.error || error.response.statusText}`)
      } else if (error.request) {
        throw new Error('No response from Pinata API')
      } else {
        throw new Error(`Error setting up request: ${error.message}`)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
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

    if (!isAuthorizedIssuer) {
      toast({
        title: 'Error',
        description: 'Your wallet is not authorized to issue certificates',
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

    if (!formData.pdfFile) {
      toast({
        title: 'Error',
        description: 'Please upload a PDF certificate',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
      return
    }

    setIsLoading(true)
    try {
      // Upload PDF to IPFS
      const pdfIpfsHash = await uploadFileToPinata(formData.pdfFile)

      // Upload metadata to IPFS via Pinata
      const metadata = {
        name: formData.certificateName,
        description: formData.description,
        issuer: address,
        issueDate: new Date().toISOString(),
        pdfHash: pdfIpfsHash,
        attributes: [
          {
            trait_type: "Certificate Type",
            value: "Soulbound Token"
          }
        ]
      }

      const metadataIpfsHash = await uploadToPinata(metadata)

      // Get signer and contract instance
      const signer = await provider.getSigner()
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        SoulboundCertificate.abi,
        signer
      )

      // Issue certificate
      const tx = await contract.issueCertificate(formData.recipientAddress, metadataIpfsHash)
      await tx.wait()

      toast({
        title: 'Success',
        description: 'Certificate issued successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      })

      // Reset form
      setFormData({
        recipientAddress: '',
        certificateName: '',
        description: '',
        pdfFile: null,
      })
      setPdfFileName('')
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

  const handleSubmitRequest = async (e: React.FormEvent) => {
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

    if (!requestReason.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide a reason for your request',
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

      const tx = await contract.submitIssuerRequest(requestReason)
      await tx.wait()

      toast({
        title: 'Success',
        description: 'Your request to become an issuer has been submitted',
        status: 'success',
        duration: 5000,
        isClosable: true,
      })

      setRequestReason('')
      setHasPendingRequest(true)
    } catch (error: any) {
      console.error('Error submitting request:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit request',
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const loadActivityLogs = async () => {
    if (!provider || !address || !CONTRACT_ADDRESS) return

    try {
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        SoulboundCertificate.abi,
        provider
      )

      const totalSupply = await contract.totalSupply()
      const logs: ActivityLog[] = []

      for (let i = 1; i <= totalSupply; i++) {
        try {
          const issuer = await contract.getIssuer(i)
          if (issuer.toLowerCase() === address.toLowerCase()) {
            const requests = await contract.getCertificateVerificationRequests(i)
            for (const request of requests) {
              logs.push({
                actor: request.requester,
                target: address,
                action: request.isPending ? 'VERIFICATION_REQUEST' :
                       request.isApproved ? 'VERIFICATION_APPROVED' : 'VERIFICATION_REJECTED',
                details: request.isApproved ? 'Certificate verification approved' :
                       request.rejectionReason || request.reason,
                timestamp: request.timestamp
              })
            }
          }
        } catch (error) {
          console.error(`Error loading activity logs for certificate ${i}:`, error)
        }
      }

      // Sort logs by timestamp in descending order
      logs.sort((a, b) => b.timestamp - a.timestamp)
      setActivityLogs(logs)
    } catch (error) {
      console.error('Error loading activity logs:', error)
      toast({
        title: 'Error',
        description: 'Failed to load activity logs',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
    }
  }

  const loadVerificationRequests = async () => {
    if (!provider || !address || !CONTRACT_ADDRESS) return

    try {
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        SoulboundCertificate.abi,
        provider
      )

      const totalSupply = await contract.totalSupply()
      const requests: VerificationRequest[] = []

      for (let i = 1; i <= totalSupply; i++) {
        try {
          const issuer = await contract.getIssuer(i)
          if (issuer.toLowerCase() === address.toLowerCase()) {
            const certificateRequests = await contract.getCertificateVerificationRequests(i)
            requests.push(...certificateRequests.map((req: any) => ({
              ...req,
              certificateId: i
            })))
          }
        } catch (error) {
          console.error(`Error loading verification requests for certificate ${i}:`, error)
        }
      }

      // Sort requests by timestamp in descending order
      requests.sort((a, b) => b.timestamp - a.timestamp)
      setVerificationRequests(requests)
    } catch (error) {
      console.error('Error loading verification requests:', error)
      toast({
        title: 'Error',
        description: 'Failed to load verification requests',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
    }
  }

  const handleApproveVerification = async (certificateId: number, requester: string) => {
    if (!provider || !address || !CONTRACT_ADDRESS) return

    try {
      setIsLoading(true)
      const signer = await provider.getSigner()
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        SoulboundCertificate.abi,
        signer
      )

      const tx = await contract.approveVerificationRequest(certificateId, requester)
      await tx.wait()

      toast({
        title: 'Success',
        description: 'Verification request approved',
        status: 'success',
        duration: 3000,
        isClosable: true,
      })

      loadVerificationRequests()
      loadActivityLogs()
    } catch (error: any) {
      console.error('Error approving verification:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to approve verification',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleRejectVerification = async (certificateId: number, requester: string, reason: string) => {
    if (!provider || !address || !CONTRACT_ADDRESS) return

    try {
      setIsLoading(true)
      const signer = await provider.getSigner()
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        SoulboundCertificate.abi,
        signer
      )

      const tx = await contract.rejectVerificationRequest(certificateId, requester, reason)
      await tx.wait()

      toast({
        title: 'Success',
        description: 'Verification request rejected',
        status: 'success',
        duration: 3000,
        isClosable: true,
      })

      loadVerificationRequests()
      loadActivityLogs()
    } catch (error: any) {
      console.error('Error rejecting verification:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to reject verification',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString()
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case 'VERIFICATION_REQUEST':
        return 'yellow'
      case 'VERIFICATION_APPROVED':
        return 'green'
      case 'VERIFICATION_REJECTED':
        return 'red'
      default:
        return 'gray'
    }
  }

  if (!isConnected) {
    return (
      <Container maxW="container.xl" py={10}>
        <VStack spacing={4}>
          <Heading>Issuer Dashboard</Heading>
          <Alert status="info">
            <AlertIcon />
            Please connect your wallet to access the issuer dashboard
          </Alert>
        </VStack>
      </Container>
    )
  }

  if (!isAuthorizedIssuer) {
    return (
      <Container maxW="container.xl" py={10}>
        <VStack spacing={6}>
          <Heading>Become an Issuer</Heading>
          <Text>
            To issue certificates on the platform, you need to be authorized as an issuer.
            Submit a request below to be considered for authorization.
          </Text>
          
          {hasPendingRequest ? (
            <Alert status="info">
              <AlertIcon />
              Your request to become an issuer is pending review
            </Alert>
          ) : (
            <Box as="form" onSubmit={handleSubmitRequest} w="full" maxW="600px">
              <VStack spacing={4}>
                <FormControl isRequired>
                  <FormLabel>Reason for Request</FormLabel>
                  <Textarea
                    value={requestReason}
                    onChange={(e) => setRequestReason(e.target.value)}
                    placeholder="Please explain why you want to become an issuer..."
                    rows={4}
                  />
                </FormControl>
                <Button
                  type="submit"
                  colorScheme="blue"
                  isLoading={isLoading}
                  loadingText="Submitting..."
                  w="full"
                >
                  Submit Request
                </Button>
              </VStack>
            </Box>
          )}
        </VStack>
      </Container>
    )
  }

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={8} align="stretch">
        <Heading>Issuer Dashboard</Heading>

        <Tabs onChange={(index) => setSelectedTab(index)}>
          <TabList>
            <Tab>Issue Certificate</Tab>
            <Tab>Verification Requests</Tab>
            <Tab>Activity Log</Tab>
          </TabList>

          <TabPanels>
            <TabPanel>
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

                  <FormControl isRequired>
                    <FormLabel>Certificate PDF</FormLabel>
                    <InputGroup>
                      <Input
                        type="file"
                        accept=".pdf"
                        onChange={handleFileChange}
                        display="none"
                        id="pdf-upload"
                        isDisabled={!pinataConfigured}
                      />
                      <Input
                        value={pdfFileName}
                        placeholder="Upload PDF certificate..."
                        readOnly
                        onClick={() => document.getElementById('pdf-upload')?.click()}
                        cursor="pointer"
                        isDisabled={!pinataConfigured}
                      />
                      <InputRightElement width="4.5rem">
                        <Button
                          h="1.75rem"
                          size="sm"
                          onClick={() => document.getElementById('pdf-upload')?.click()}
                          isDisabled={!pinataConfigured}
                        >
                          Browse
                        </Button>
                      </InputRightElement>
                    </InputGroup>
                  </FormControl>

                  <Button
                    type="submit"
                    colorScheme="blue"
                    size="lg"
                    isLoading={isLoading}
                    loadingText="Issuing Certificate..."
                    isDisabled={!pinataConfigured || !formData.pdfFile}
                  >
                    Issue Certificate
                  </Button>
                </VStack>
              </Box>
            </TabPanel>

            <TabPanel>
              <Table variant="simple">
                <Thead>
                  <Tr>
                    <Th>Certificate ID</Th>
                    <Th>Requester</Th>
                    <Th>Reason</Th>
                    <Th>Date</Th>
                    <Th>Status</Th>
                    <Th>Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {verificationRequests.map((request, index) => (
                    <Tr key={`${request.certificateId}-${index}`}>
                      <Td>{request.certificateId}</Td>
                      <Td>{request.requester}</Td>
                      <Td>{request.reason}</Td>
                      <Td>{formatDate(request.timestamp)}</Td>
                      <Td>
                        {request.isPending ? (
                          <Badge colorScheme="yellow">Pending</Badge>
                        ) : request.isApproved ? (
                          <Badge colorScheme="green">Approved</Badge>
                        ) : (
                          <Badge colorScheme="red">Rejected</Badge>
                        )}
                      </Td>
                      <Td>
                        {request.isPending && (
                          <Box>
                            <Button
                              size="sm"
                              colorScheme="green"
                              mr={2}
                              onClick={() => handleApproveVerification(request.certificateId, request.requester)}
                              isLoading={isLoading}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              colorScheme="red"
                              onClick={() => {
                                const reason = prompt('Enter rejection reason:')
                                if (reason) {
                                  handleRejectVerification(request.certificateId, request.requester, reason)
                                }
                              }}
                              isLoading={isLoading}
                            >
                              Reject
                            </Button>
                          </Box>
                        )}
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </TabPanel>

            <TabPanel>
              <Table variant="simple">
                <Thead>
                  <Tr>
                    <Th>Date</Th>
                    <Th>Action</Th>
                    <Th>User</Th>
                    <Th>Details</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {activityLogs.map((log, index) => (
                    <Tr key={index}>
                      <Td>{formatDate(log.timestamp)}</Td>
                      <Td>
                        <Badge colorScheme={getActionColor(log.action)}>
                          {log.action.replace('_', ' ')}
                        </Badge>
                      </Td>
                      <Td>{log.actor}</Td>
                      <Td>{log.details}</Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </VStack>
    </Container>
  )
} 