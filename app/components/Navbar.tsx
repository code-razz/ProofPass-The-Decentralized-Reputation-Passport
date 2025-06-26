'use client'

import {
  Box,
  Flex,
  Button,
  Text,
  HStack,
  useToast,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Icon,
  Spinner,
} from '@chakra-ui/react'
import { useWeb3Modal } from '../context/Web3ModalContext'
import { FaUser, FaWallet, FaShieldAlt, FaCertificate } from 'react-icons/fa'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ethers } from 'ethers'
import SoulboundCertificate from '../../artifacts/contracts/SoulboundCertificate.sol/SoulboundCertificate.json'

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_SOULBOUND_CERTIFICATE_ADDRESS

export default function Navbar() {
  const { isConnected, address, connect, disconnect, provider } = useWeb3Modal()
  const toast = useToast()
  const [isOwner, setIsOwner] = useState(false)
  const [isAuthorizedIssuer, setIsAuthorizedIssuer] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (isConnected && provider && CONTRACT_ADDRESS) {
      checkRoles()
    }
  }, [isConnected, provider, address])

  const checkRoles = async () => {
    if (!provider || !address || !CONTRACT_ADDRESS) return

    try {
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        SoulboundCertificate.abi,
        provider
      )
      
      // Check if user is owner
      const owner = await contract.owner()
      setIsOwner(owner.toLowerCase() === address.toLowerCase())

      // Check if user is authorized issuer
      const isAuthorized = await contract.authorizedIssuers(address)
      setIsAuthorizedIssuer(isAuthorized)
    } catch (error) {
      console.error('Error checking roles:', error)
      setIsOwner(false)
      setIsAuthorizedIssuer(false)
    }
  }

  const handleConnect = async () => {
    try {
      setIsLoading(true)
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
    } finally {
      setIsLoading(false)
    }
  }

  const handleDisconnect = async () => {
    try {
      await disconnect()
      setIsOwner(false)
      setIsAuthorizedIssuer(false)
      toast({
        title: 'Disconnected',
        description: 'Wallet disconnected successfully',
        status: 'info',
        duration: 3000,
        isClosable: true,
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to disconnect wallet',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
    }
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  return (
    <Box as="nav" bg="white" boxShadow="sm" py={4}>
      <Flex maxW="container.xl" mx="auto" px={4} justify="space-between" align="center">
        <Link href="/" passHref>
          <Text fontSize="xl" fontWeight="bold" color="blue.500" cursor="pointer">
            ProofPass
          </Text>
        </Link>

        <HStack spacing={4}>
          <Link href="/opportunities" passHref>
            <Button variant="ghost" colorScheme="blue">
              Opportunities
            </Button>
          </Link>
          {isConnected && (
            <>
              <Link href="/applications" passHref>
                <Button variant="ghost" colorScheme="blue">
                  Applications
                </Button>
              </Link>
              <Link href="/certificates" passHref>
                <Button variant="ghost" colorScheme="blue">
                  My Certificates
                </Button>
              </Link>
              {isAuthorizedIssuer && (
                <Link href="/issuer" passHref>
                  <Button
                    variant="ghost"
                    colorScheme="blue"
                    leftIcon={<Icon as={FaCertificate} />}
                  >
                    Issuer Dashboard
                  </Button>
                </Link>
              )}
              {isOwner && (
                <Link href="/admin" passHref>
                  <Button
                    variant="ghost"
                    colorScheme="blue"
                    leftIcon={<Icon as={FaShieldAlt} />}
                  >
                    Admin Dashboard
                  </Button>
                </Link>
              )}
            </>
          )}
          {isConnected ? (
            <Menu>
              <MenuButton
                as={Button}
                leftIcon={<Icon as={FaUser} />}
                variant="outline"
                colorScheme="blue"
              >
                {formatAddress(address || '')}
              </MenuButton>
              <MenuList>
                <MenuItem onClick={handleDisconnect} icon={<Icon as={FaWallet} />}>
                  Disconnect Wallet
                </MenuItem>
              </MenuList>
            </Menu>
          ) : (
            <Button
              leftIcon={<Icon as={FaWallet} />}
              colorScheme="blue"
              onClick={handleConnect}
              isLoading={isLoading}
              loadingText="Connecting..."
            >
              Connect Wallet
            </Button>
          )}
        </HStack>
      </Flex>
    </Box>
  )
} 