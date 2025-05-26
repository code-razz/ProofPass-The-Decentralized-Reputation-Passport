'use client'

import { ChakraProvider } from '@chakra-ui/react'
import { Web3ModalProvider } from './context/Web3ModalContext'
import { OpportunityProvider } from './context/OpportunityContext'
import Navbar from './components/Navbar'
import './globals.css'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <ChakraProvider>
          <Web3ModalProvider>
            <OpportunityProvider>
              <Navbar />
              {children}
            </OpportunityProvider>
          </Web3ModalProvider>
        </ChakraProvider>
      </body>
    </html>
  )
} 