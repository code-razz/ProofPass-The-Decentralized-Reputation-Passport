'use client'

import {
  Box,
  Container,
  Heading,
  SimpleGrid,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Text,
  Button,
  VStack,
  HStack,
  Badge,
  useToast,
  Spinner,
  Alert,
  AlertIcon,
} from '@chakra-ui/react'
import { useOpportunity } from '../context/OpportunityContext'
import { useWeb3Modal } from '../context/Web3ModalContext'
import Link from 'next/link'
import { useEffect } from 'react'

export default function OpportunitiesPage() {
  const { opportunities, isLoading, error, refreshOpportunities } = useOpportunity()
  const { isConnected, connect } = useWeb3Modal()
  const toast = useToast()

  useEffect(() => {
    refreshOpportunities()
  }, [refreshOpportunities])

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

  if (isLoading) {
    return (
      <Container maxW="container.xl" py={10}>
        <VStack spacing={4}>
          <Spinner size="xl" />
          <Text>Loading opportunities...</Text>
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

  return (
    <Container maxW="container.xl" py={10}>
      <VStack spacing={8} align="stretch">
        <Box>
          <Heading as="h1" size="2xl" mb={4}>
            Opportunities
          </Heading>
          <Text fontSize="xl" color="gray.600" mb={6}>
            Browse and apply for opportunities from verified providers
          </Text>
          {!isConnected ? (
            <Button colorScheme="blue" onClick={handleConnect}>
              Connect Wallet to Apply
            </Button>
          ) : (
            <Link href="/opportunities/create" passHref>
              <Button colorScheme="green" mr={4}>
                Post New Opportunity
              </Button>
            </Link>
          )}
        </Box>

        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
          {opportunities.map((opportunity) => (
            <Card key={opportunity.id} variant="outline">
              <CardHeader>
                <VStack align="start" spacing={2}>
                  <Heading size="md">{opportunity.title}</Heading>
                  <HStack>
                    <Badge colorScheme={opportunity.isActive ? 'green' : 'red'}>
                      {opportunity.isActive ? 'Active' : 'Closed'}
                    </Badge>
                    <Text fontSize="sm" color="gray.500">
                      Posted {new Date(opportunity.createdAt * 1000).toLocaleDateString()}
                    </Text>
                  </HStack>
                </VStack>
              </CardHeader>
              <CardBody>
                <Text noOfLines={3}>{opportunity.description}</Text>
              </CardBody>
              <CardFooter>
                <Link href={`/opportunities/${opportunity.id}`} passHref>
                  <Button colorScheme="blue" width="full">
                    View Details
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </SimpleGrid>

        {opportunities.length === 0 && (
          <Box textAlign="center" py={10}>
            <Text fontSize="xl" color="gray.500">
              No opportunities available at the moment
            </Text>
          </Box>
        )}
      </VStack>
    </Container>
  )
} 