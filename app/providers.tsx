'use client'

import { CacheProvider } from '@chakra-ui/next-js'
import { ChakraProvider } from '@chakra-ui/react'
import { Web3ModalProvider } from './context/Web3ModalContext'
import { WagmiProvider } from 'wagmi'
import { config } from './config/wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient()

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <CacheProvider>
      <ChakraProvider>
        <WagmiProvider config={config}>
          <QueryClientProvider client={queryClient}>
            <Web3ModalProvider>
              {children}
            </Web3ModalProvider>
          </QueryClientProvider>
        </WagmiProvider>
      </ChakraProvider>
    </CacheProvider>
  )
} 