'use client'

import { CacheProvider } from '@chakra-ui/next-js'
import { ChakraProvider } from '@chakra-ui/react'
import { Web3ModalProvider } from './context/Web3ModalContext'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <CacheProvider>
      <ChakraProvider>
        <Web3ModalProvider>
          {children}
        </Web3ModalProvider>
      </ChakraProvider>
    </CacheProvider>
  )
} 