'use client'

import React, { useState, useEffect } from 'react'
import {
  Box,
  Container,
  VStack,
  Heading,
  Text,
  Button,
  useToast,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  useDisclosure,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
} from '@chakra-ui/react'
import { useWeb3Modal } from '../context/Web3ModalContext'
import { ethers } from 'ethers'
import SoulboundCertificate from '../../artifacts/contracts/SoulboundCertificate.sol/SoulboundCertificate.json'

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS

interface Certificate {
  id: number
  name: string
  description: string
  issuer: string
  issueDate: number
  isVerified: boolean
  verificationRequests: VerificationRequest[]
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

export default function CertificatesPage() {
  const { address, isConnected, provider } = useWeb3Modal()
  const toast = useToast()
  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [selectedCertificate, setSelectedCertificate] = useState<Certificate | null>(null)
  const [verificationReason, setVerificationReason] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')

  useEffect(() => {
    if (isConnected && provider && CONTRACT_ADDRESS) {
      loadCertificates()
    }
  }, [isConnected, provider])

  const loadCertificates = async () => {
    if (!provider || !address || !CONTRACT_ADDRESS) return

    try {
      setIsLoading(true)
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        SoulboundCertificate.abi,
        provider
      )

      // Get total supply to iterate through all certificates
      const totalSupply = await contract.totalSupply()
      const userCertificates: Certificate[] = []

      for (let i = 1; i <= totalSupply; i++) {
        try {
          const owner = await contract.ownerOf(i)
          if (owner.toLowerCase() === address.toLowerCase()) {
            const tokenURI = await contract.tokenURI(i)
            const response = await fetch(`https://ipfs.io/ipfs/${tokenURI}`)
            const metadata = await response.json()

            const issuer = await contract.getIssuer(i)
            const issueDate = await contract.getIssueDate(i)
            const isVerified = await contract.getCertificateVerificationStatus(i)
            const verificationRequests = await contract.getCertificateVerificationRequests(i)

            userCertificates.push({
              id: i,
              name: metadata.name,
              description: metadata.description,
              issuer,
              issueDate,
              isVerified,
              verificationRequests,
            })
          }
        } catch (error) {
          console.error(`Error loading certificate ${i}:`, error)
        }
      }

      setCertificates(userCertificates)
    } catch (error) {
      console.error('Error loading certificates:', error)
      toast({
        title: 'Error',
        description: 'Failed to load certificates',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerificationRequest = async (certificateId: number) => {
    if (!provider || !address || !CONTRACT_ADDRESS) return

    try {
      setIsLoading(true)
      const signer = await provider.getSigner()
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        SoulboundCertificate.abi,
        signer
      )

      const tx = await contract.submitVerificationRequest(certificateId, verificationReason)
      await tx.wait()

      toast({
        title: 'Success',
        description: 'Verification request submitted successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      })

      onClose()
      loadCertificates()
    } catch (error: any) {
      console.error('Error submitting verification request:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit verification request',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
    } finally {
      setIsLoading(false)
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

      loadCertificates()
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

  const handleRejectVerification = async (certificateId: number, requester: string) => {
    if (!provider || !address || !CONTRACT_ADDRESS) return

    try {
      setIsLoading(true)
      const signer = await provider.getSigner()
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        SoulboundCertificate.abi,
        signer
      )

      const tx = await contract.rejectVerificationRequest(certificateId, requester, rejectionReason)
      await tx.wait()

      toast({
        title: 'Success',
        description: 'Verification request rejected',
        status: 'success',
        duration: 3000,
        isClosable: true,
      })

      onClose()
      loadCertificates()
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

  const openVerificationModal = (certificate: Certificate) => {
    setSelectedCertificate(certificate)
    setVerificationReason('')
    onOpen()
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString()
  }

  const getVerificationStatus = (certificate: Certificate) => {
    if (certificate.isVerified) {
      return <Badge colorScheme="green">Verified</Badge>
    }
    const pendingRequest = certificate.verificationRequests.find(req => req.isPending)
    if (pendingRequest) {
      return <Badge colorScheme="yellow">Pending Verification</Badge>
    }
    return <Badge colorScheme="gray">Not Verified</Badge>
  }

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={8} align="stretch">
        <Heading>My Certificates</Heading>

        {!isConnected ? (
          <Text>Please connect your wallet to view your certificates</Text>
        ) : isLoading ? (
          <Text>Loading certificates...</Text>
        ) : certificates.length === 0 ? (
          <Text>You don't have any certificates yet</Text>
        ) : (
          <Tabs>
            <TabList>
              <Tab>Certificates</Tab>
              <Tab>Verification Requests</Tab>
            </TabList>

            <TabPanels>
              <TabPanel>
                <Table variant="simple">
                  <Thead>
                    <Tr>
                      <Th>Name</Th>
                      <Th>Issuer</Th>
                      <Th>Issue Date</Th>
                      <Th>Status</Th>
                      <Th>Actions</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {certificates.map((cert) => (
                      <Tr key={cert.id}>
                        <Td>{cert.name}</Td>
                        <Td>{cert.issuer}</Td>
                        <Td>{formatDate(cert.issueDate)}</Td>
                        <Td>{getVerificationStatus(cert)}</Td>
                        <Td>
                          {!cert.isVerified && !cert.verificationRequests.some(req => req.isPending) && (
                            <Button
                              size="sm"
                              colorScheme="blue"
                              onClick={() => openVerificationModal(cert)}
                            >
                              Request Verification
                            </Button>
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
                      <Th>Certificate</Th>
                      <Th>Requester</Th>
                      <Th>Reason</Th>
                      <Th>Date</Th>
                      <Th>Status</Th>
                      <Th>Actions</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {certificates.flatMap((cert) =>
                      cert.verificationRequests.map((req, index) => (
                        <Tr key={`${cert.id}-${index}`}>
                          <Td>{cert.name}</Td>
                          <Td>{req.requester}</Td>
                          <Td>{req.reason}</Td>
                          <Td>{formatDate(req.timestamp)}</Td>
                          <Td>
                            {req.isPending ? (
                              <Badge colorScheme="yellow">Pending</Badge>
                            ) : req.isApproved ? (
                              <Badge colorScheme="green">Approved</Badge>
                            ) : (
                              <Badge colorScheme="red">Rejected</Badge>
                            )}
                          </Td>
                          <Td>
                            {req.isPending && cert.issuer.toLowerCase() === address.toLowerCase() && (
                              <Box>
                                <Button
                                  size="sm"
                                  colorScheme="green"
                                  mr={2}
                                  onClick={() => handleApproveVerification(cert.id, req.requester)}
                                >
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  colorScheme="red"
                                  onClick={() => {
                                    setSelectedCertificate(cert)
                                    setRejectionReason('')
                                    onOpen()
                                  }}
                                >
                                  Reject
                                </Button>
                              </Box>
                            )}
                          </Td>
                        </Tr>
                      ))
                    )}
                  </Tbody>
                </Table>
              </TabPanel>
            </TabPanels>
          </Tabs>
        )}
      </VStack>

      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {selectedCertificate?.verificationRequests.some(req => req.isPending)
              ? 'Reject Verification Request'
              : 'Request Verification'}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            {selectedCertificate?.verificationRequests.some(req => req.isPending) ? (
              <FormControl>
                <FormLabel>Rejection Reason</FormLabel>
                <Textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Enter reason for rejection"
                />
                <Button
                  mt={4}
                  colorScheme="red"
                  onClick={() => {
                    if (selectedCertificate) {
                      const pendingRequest = selectedCertificate.verificationRequests.find(req => req.isPending)
                      if (pendingRequest) {
                        handleRejectVerification(selectedCertificate.id, pendingRequest.requester)
                      }
                    }
                  }}
                  isLoading={isLoading}
                >
                  Reject Request
                </Button>
              </FormControl>
            ) : (
              <FormControl>
                <FormLabel>Verification Reason</FormLabel>
                <Textarea
                  value={verificationReason}
                  onChange={(e) => setVerificationReason(e.target.value)}
                  placeholder="Enter reason for verification request"
                />
                <Button
                  mt={4}
                  colorScheme="blue"
                  onClick={() => {
                    if (selectedCertificate) {
                      handleVerificationRequest(selectedCertificate.id)
                    }
                  }}
                  isLoading={isLoading}
                >
                  Submit Request
                </Button>
              </FormControl>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </Container>
  )
} 