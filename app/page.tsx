'use client'

import {
  Box,
  Container,
  Heading,
  Text,
  Button,
  VStack,
  HStack,
  SimpleGrid,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  useToast,
  Icon,
  Flex,
  Badge,
  Skeleton,
} from '@chakra-ui/react'
import { useWeb3Modal } from './context/Web3ModalContext'
import { FaCertificate, FaShieldAlt, FaBriefcase, FaUserCheck } from 'react-icons/fa'
import Link from 'next/link'
import { useEffect, useState } from 'react'

const features = [
  {
    title: 'Soulbound Certificates',
    description: 'Manage non-transferable certificates that prove your achievements and skills.',
    icon: FaCertificate,
    link: '/certificates',
    badge: 'For Everyone',
  },
  {
    title: 'Opportunities',
    description: 'Discover and apply for opportunities posted by verified providers.',
    icon: FaBriefcase,
    link: '/opportunities',
    badge: 'For Everyone',
  },
  {
    title: 'Issuer Portal',
    description: 'Become an issuer to create and manage certificates for your organization.',
    icon: FaUserCheck,
    link: '/issuer',
    badge: 'For Organizations',
  },
  {
    title: 'Admin Dashboard',
    description: 'Manage issuers and oversee the platform\'s operations.',
    icon: FaShieldAlt,
    link: '/admin',
    badge: 'For Admins',
  },
]

export default function Home() {
  const { isConnected, connect } = useWeb3Modal()
  const toast = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
      setIsLoading(false)
  }, [])

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

  // Don't render anything until mounted to prevent hydration mismatch
  if (!mounted) {
    return null
  }

  return (
    <Container maxW="container.xl" py={10}>
      <VStack spacing={12} align="stretch">
        {/* Hero Section */}
        <Box textAlign="center" py={10}>
          <Heading
            as="h1"
            size="2xl"
            bgGradient="linear(to-r, blue.400, blue.600)"
            bgClip="text"
            mb={4}
          >
            ProofPass
          </Heading>
          <Text fontSize="xl" color="gray.600" mb={8}>
            The Decentralized Reputation Passport
          </Text>
          <Skeleton isLoaded={!isLoading}>
            {!isConnected && (
              <Button
                size="lg"
                colorScheme="blue"
                onClick={handleConnect}
                leftIcon={<Icon as={FaCertificate} />}
              >
                Connect Wallet to Get Started
              </Button>
            )}
          </Skeleton>
        </Box>

        {/* Features Grid */}
              <Box>
          <Heading mb={8} textAlign="center">
            Platform Features
          </Heading>
          <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={8}>
            {features.map((feature, index) => (
              <Box key={index}>
                <Link href={feature.link} passHref legacyBehavior>
                  <Card
                    as="a"
                    _hover={{
                      transform: 'translateY(-4px)',
                      shadow: 'lg',
                      transition: 'all 0.2s',
                    }}
                    cursor="pointer"
                  >
                    <CardHeader>
                      <Flex justify="space-between" align="center">
                        <Icon as={feature.icon} boxSize={8} color="blue.500" />
                        <Badge colorScheme={
                          feature.badge === 'For Everyone' ? 'green' :
                          feature.badge === 'For Organizations' ? 'blue' :
                          'purple'
                        }>
                          {feature.badge}
                        </Badge>
                      </Flex>
                    </CardHeader>
                    <CardBody>
                      <Heading size="md" mb={2}>
                        {feature.title}
                      </Heading>
                      <Text color="gray.600">{feature.description}</Text>
                    </CardBody>
                    <CardFooter>
                      <Button
                        variant="ghost"
                        colorScheme="blue"
                        size="sm"
                        width="full"
                      >
                        Learn More
                  </Button>
                    </CardFooter>
                  </Card>
                </Link>
              </Box>
            ))}
          </SimpleGrid>
        </Box>

        {/* How It Works Section */}
        <Box textAlign="center" py={10}>
          <Heading mb={8}>How It Works</Heading>
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={8}>
            <VStack spacing={4}>
              <Icon as={FaCertificate} boxSize={12} color="blue.500" />
              <Heading size="md">Get Certified</Heading>
              <Text color="gray.600">
                Receive verifiable certificates from authorized issuers for your achievements
              </Text>
            </VStack>
            <VStack spacing={4}>
              <Icon as={FaBriefcase} boxSize={12} color="blue.500" />
              <Heading size="md">Find Opportunities</Heading>
              <Text color="gray.600">
                Browse and apply for opportunities using your verified credentials
              </Text>
            </VStack>
            <VStack spacing={4}>
              <Icon as={FaUserCheck} boxSize={12} color="blue.500" />
              <Heading size="md">Build Reputation</Heading>
              <Text color="gray.600">
                Create a trusted digital identity through verified achievements
              </Text>
            </VStack>
          </SimpleGrid>
        </Box>

        {/* Call to Action */}
        <Box textAlign="center" py={10} bg="blue.50" borderRadius="lg">
          <VStack spacing={6}>
            <Heading>Ready to Get Started?</Heading>
            <Text color="gray.600" maxW="2xl">
              Join ProofPass today to start building your decentralized reputation passport.
              Connect your wallet to access all features.
            </Text>
            <Skeleton isLoaded={!isLoading}>
              {!isConnected && (
                <Button
                  size="lg"
                  colorScheme="blue"
                  onClick={handleConnect}
                  leftIcon={<Icon as={FaCertificate} />}
                >
                  Connect Wallet
                </Button>
              )}
            </Skeleton>
          </VStack>
        </Box>
      </VStack>
    </Container>
  )
} 