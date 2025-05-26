'use client'

import {
  Box,
  Container,
  Heading,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  Button,
  VStack,
  useToast,
  Alert,
  AlertIcon,
  Text,
} from '@chakra-ui/react'
import { useOpportunity } from '../../context/OpportunityContext'
import { useWeb3Modal } from '../../context/Web3ModalContext'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function CreateOpportunityPage() {
  const { createOpportunity, isLoading, error } = useOpportunity()
  const { isConnected, connect } = useWeb3Modal()
  const toast = useToast()
  const router = useRouter()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [requirements, setRequirements] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

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

    try {
      await createOpportunity(title, description, requirements)
      toast({
        title: 'Success',
        description: 'Opportunity created successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      })
      router.push('/opportunities')
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create opportunity',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
    }
  }

  if (!isConnected) {
    return (
      <Container maxW="container.xl" py={10}>
        <VStack spacing={4}>
          <Alert status="info">
            <AlertIcon />
            Please connect your wallet to create an opportunity
          </Alert>
          <Button colorScheme="blue" onClick={connect}>
            Connect Wallet
          </Button>
        </VStack>
      </Container>
    )
  }

  return (
    <Container maxW="container.xl" py={10}>
      <VStack spacing={8} align="stretch">
        <Box>
          <Heading as="h1" size="2xl" mb={4}>
            Create New Opportunity
          </Heading>
          <Text fontSize="xl" color="gray.600">
            Post a new opportunity for potential applicants
          </Text>
        </Box>

        {error && (
          <Alert status="error">
            <AlertIcon />
            {error}
          </Alert>
        )}

        <Box as="form" onSubmit={handleSubmit}>
          <VStack spacing={6}>
            <FormControl isRequired>
              <FormLabel>Title</FormLabel>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter opportunity title"
              />
            </FormControl>

            <FormControl isRequired>
              <FormLabel>Description</FormLabel>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter detailed description of the opportunity"
                rows={6}
              />
            </FormControl>

            <FormControl isRequired>
              <FormLabel>Requirements</FormLabel>
              <Textarea
                value={requirements}
                onChange={(e) => setRequirements(e.target.value)}
                placeholder="Enter requirements and qualifications"
                rows={4}
              />
            </FormControl>

            <Button
              type="submit"
              colorScheme="blue"
              size="lg"
              width="full"
              isLoading={isLoading}
              loadingText="Creating..."
            >
              Create Opportunity
            </Button>
          </VStack>
        </Box>
      </VStack>
    </Container>
  )
} 