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
    console.log('useEffect: Initializing Web3Modal')
    const modal = new Web3Modal({
      cacheProvider: true,
      providerOptions: {},
    })
    setWeb3Modal(modal)
  }, [])

  useEffect(() => {
    if (web3Modal && web3Modal.cachedProvider) {
      console.log('useEffect: web3Modal initialized and cached provider found, attempting to connect')
      connect()
    } else if (web3Modal && !web3Modal.cachedProvider) {
      console.log('useEffect: web3Modal initialized but no cached provider found')
    }
  }, [web3Modal])

  const connect = async () => {
    if (!web3Modal) {
      console.log('connect: web3Modal not initialized yet')
      return
    }

    console.log('connect: Attempting to connect to wallet')
    try {
      const web3Provider = await web3Modal.connect()
      console.log('connect: Wallet connected successfully', web3Provider)
      const provider = new ethers.BrowserProvider(web3Provider)
      const signer = await provider.getSigner()
      const address = await signer.getAddress()

      setProvider(provider)
      setAddress(address)
      console.log('connect: Provider and address set', { address })

      web3Provider.on('accountsChanged', (accounts: string[]) => {
        console.log('accountsChanged:', accounts)
        setAddress(accounts[0])
      })

      web3Provider.on('chainChanged', (chainId: number) => {
        console.log('chainChanged:', chainId)
        window.location.reload()
      })

      web3Provider.on('disconnect', (code: number, reason: string) => {
        console.log('disconnect:', { code, reason })
        disconnect()
      })
    } catch (error) {
      console.error('connect: Error connecting to wallet:', error)
    }
  }

  const disconnect = () => {
    if (!web3Modal) return

    console.log('disconnect: Clearing cached provider and resetting state')
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