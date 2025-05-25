'use client';

import { useWeb3Modal } from '../context/Web3ModalContext';
import { Box, Button, Container, Flex, Text } from '@chakra-ui/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navigation() {
  const { address, isConnected, disconnect, connect } = useWeb3Modal();
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  const NavLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
    <Link
      href={href}
      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
        isActive(href)
          ? 'text-blue-600 font-bold'
          : 'text-gray-600 hover:text-blue-500'
      }`}
    >
      {children}
    </Link>
  );

  return (
    <Box bg="white" boxShadow="sm" py={4}>
      <Container maxW="container.xl">
        <Flex justify="space-between" align="center">
          <Flex gap={4}>
            <NavLink href="/">Home</NavLink>
            <NavLink href="/certificates">Certificates</NavLink>
            <NavLink href="/passport">Passport</NavLink>
            <NavLink href="/verify">Verify</NavLink>
            <NavLink href="/employer">Employer</NavLink>
            <NavLink href="/issuer">Issuer</NavLink>
            <NavLink href="/admin">Admin</NavLink>
          </Flex>

          <Flex align="center" gap={4}>
            {!isConnected ? (
              <Button colorScheme="blue" size="sm" onClick={connect}>
                Connect Wallet
              </Button>
            ) : (
              <>
                <Text fontSize="sm" color="gray.600">
                  {address?.slice(0, 6)}...{address?.slice(-4)}
                </Text>
                <Button
                  colorScheme="red"
                  variant="outline"
                  size="sm"
                  onClick={disconnect}
                >
                  Disconnect
                </Button>
              </>
            )}
          </Flex>
        </Flex>
      </Container>
    </Box>
  );
} 