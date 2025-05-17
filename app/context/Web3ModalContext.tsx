'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { ethers } from 'ethers'
import Web3Modal from 'web3modal'

interface Web3ModalContextType {
  address: string | null
  isConnected: boolean
  connect: () => Promise<void>
  disconnect: () => void
  provider: ethers.BrowserProvider | null
}

const Web3ModalContext = createContext<Web3ModalContextType>({
  address: null,
  isConnected: false,
  connect: async () => {},
  disconnect: () => {},
  provider: null,
})

export const useWeb3Modal = () => useContext(Web3ModalContext)

export const Web3ModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [address, setAddress] = useState<string | null>(null)
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null)
  const [web3Modal, setWeb3Modal] = useState<Web3Modal | null>(null)

  useEffect(() => {
    const modal = new Web3Modal({
      cacheProvider: true,
      providerOptions: {},
    })
    setWeb3Modal(modal)

    if (modal.cachedProvider) {
      connect()
    }
  }, [])

  const connect = async () => {
    if (!web3Modal) return

    try {
      const web3Provider = await web3Modal.connect()
      const provider = new ethers.BrowserProvider(web3Provider)
      const signer = await provider.getSigner()
      const address = await signer.getAddress()

      setProvider(provider)
      setAddress(address)

      web3Provider.on('accountsChanged', (accounts: string[]) => {
        setAddress(accounts[0])
      })

      web3Provider.on('chainChanged', () => {
        window.location.reload()
      })

      web3Provider.on('disconnect', () => {
        disconnect()
      })
    } catch (error) {
      console.error('Error connecting to wallet:', error)
    }
  }

  const disconnect = () => {
    if (!web3Modal) return

    web3Modal.clearCachedProvider()
    setAddress(null)
    setProvider(null)
  }

  return (
    <Web3ModalContext.Provider
      value={{
        address,
        isConnected: !!address,
        connect,
        disconnect,
        provider,
      }}
    >
      {children}
    </Web3ModalContext.Provider>
  )
} 