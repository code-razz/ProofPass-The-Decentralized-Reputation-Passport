'use client'

import { Box, Button, Container, Heading, SimpleGrid, Text, VStack } from '@chakra-ui/react'
import { useWeb3Modal } from './context/Web3ModalContext'
import Link from 'next/link'

export default function Home() {
  const { isConnected, connect } = useWeb3Modal()

  return (
    <Container maxW="container.xl" py={12}>
      <VStack spacing={12}>
        <Box textAlign="center" maxW="3xl">
          <Heading
            as="h1"
            size="2xl"
            bgGradient="linear(to-r, blue.400, purple.500)"
            bgClip="text"
            mb={6}
          >
            ProofPass - Your Decentralized Reputation Passport
          </Heading>
          <Text fontSize="xl" color="gray.600" mb={8}>
            A secure and verifiable way to manage your professional credentials, 
            share your achievements, and connect with opportunities.
          </Text>
          {!isConnected && (
            <Button
              colorScheme="blue"
              size="lg"
              onClick={connect}
            >
              Connect Wallet to Get Started
            </Button>
          )}
        </Box>

        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={8} w="full">
          <Box
            p={6}
            bg="white"
            borderRadius="lg"
            boxShadow="md"
            _hover={{ transform: 'translateY(-4px)', transition: 'all 0.2s' }}
          >
            <VStack align="start" spacing={4}>
              <Heading size="md">Certificates</Heading>
              <Text color="gray.600">
                Receive and manage your professional certificates as soulbound tokens.
                Each certificate is permanently linked to your wallet and verifiable on-chain.
              </Text>
              <Link href="/certificates" passHref>
                <Button colorScheme="blue" variant="outline" size="sm">
                  View Certificates
                </Button>
              </Link>
            </VStack>
          </Box>

          <Box
            p={6}
            bg="white"
            borderRadius="lg"
            boxShadow="md"
            _hover={{ transform: 'translateY(-4px)', transition: 'all 0.2s' }}
          >
            <VStack align="start" spacing={4}>
              <Heading size="md">Reputation Passport</Heading>
              <Text color="gray.600">
                Create your professional reputation passport by combining certificates
                and endorsements. Share your achievements with employers securely.
              </Text>
              <Link href="/passport" passHref>
                <Button colorScheme="blue" variant="outline" size="sm">
                  View Passport
                </Button>
              </Link>
            </VStack>
          </Box>

          <Box
            p={6}
            bg="white"
            borderRadius="lg"
            boxShadow="md"
            _hover={{ transform: 'translateY(-4px)', transition: 'all 0.2s' }}
          >
            <VStack align="start" spacing={4}>
              <Heading size="md">For Employers</Heading>
              <Text color="gray.600">
                Verify candidate credentials, post opportunities, and endorse skills.
                Build trust through blockchain-verified professional achievements.
              </Text>
              <Link href="/employer" passHref>
                <Button colorScheme="blue" variant="outline" size="sm">
                  Employer Portal
                </Button>
              </Link>
            </VStack>
          </Box>
        </SimpleGrid>

        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={8} w="full">
          <Box
            p={6}
            bg="white"
            borderRadius="lg"
            boxShadow="md"
            _hover={{ transform: 'translateY(-4px)', transition: 'all 0.2s' }}
          >
            <VStack align="start" spacing={4}>
              <Heading size="md">Certificate Verification</Heading>
              <Text color="gray.600">
                Request verification of your certificates from trusted employers.
                Each verification is recorded on-chain for transparency.
              </Text>
              <Link href="/verify" passHref>
                <Button colorScheme="blue" variant="outline" size="sm">
                  Request Verification
                </Button>
              </Link>
            </VStack>
          </Box>

          <Box
            p={6}
            bg="white"
            borderRadius="lg"
            boxShadow="md"
            _hover={{ transform: 'translateY(-4px)', transition: 'all 0.2s' }}
          >
            <VStack align="start" spacing={4}>
              <Heading size="md">For Issuers</Heading>
              <Text color="gray.600">
                Issue verifiable certificates to your students or employees.
                Join our network of trusted certificate issuers.
              </Text>
              <Link href="/issuer" passHref>
                <Button colorScheme="blue" variant="outline" size="sm">
                  Become an Issuer
                </Button>
              </Link>
            </VStack>
          </Box>
        </SimpleGrid>
      </VStack>
    </Container>
  )
} 