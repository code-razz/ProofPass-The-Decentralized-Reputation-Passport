'use client'

import { Box, Container, Heading, VStack, Button, Text, useToast } from '@chakra-ui/react'
import { useWeb3Modal } from './context/Web3ModalContext'
import Link from 'next/link'

export default function Home() {
  const { address, isConnected, connect, disconnect } = useWeb3Modal()
  const toast = useToast()

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

  return (
    <Container maxW="container.xl" py={10}>
      <VStack spacing={8} align="stretch">
        <Box textAlign="center">
          <Heading as="h1" size="2xl" mb={4}>
            Soulbound Certificate System
          </Heading>
          <Text fontSize="xl" color="gray.600">
            Issue and manage certificates as non-transferable tokens
          </Text>
        </Box>

        <Box textAlign="center">
          {!isConnected ? (
            <Button
              colorScheme="blue"
              size="lg"
              onClick={handleConnect}
            >
              Connect Wallet
            </Button>
          ) : (
            <VStack spacing={4}>
              <Text>
                Connected: {address?.slice(0, 6)}...{address?.slice(-4)}
              </Text>
              <Button
                colorScheme="red"
                variant="outline"
                onClick={disconnect}
              >
                Disconnect
              </Button>
              <Box>
                <Link href="/issuer" passHref>
                  <Button colorScheme="green" mr={4}>
                    Issuer Dashboard
                  </Button>
                </Link>
                <Link href="/certificates" passHref>
                  <Button colorScheme="purple">
                    My Certificates
                  </Button>
                </Link>
              </Box>
            </VStack>
          )}
        </Box>
      </VStack>
    </Container>
  )
} 