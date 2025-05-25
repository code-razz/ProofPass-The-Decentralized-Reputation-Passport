'use client';

import { http } from 'wagmi';
import { createConfig } from 'wagmi';

const localhost = {
  id: 1337,
  name: 'Hardhat Local',
  network: 'hardhat',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['http://127.0.0.1:8545'] },
    public: { http: ['http://127.0.0.1:8545'] },
  },
} as const;

const config = createConfig({
  chains: [localhost],
  transports: {
    [localhost.id]: http(),
  },
});

export { config }; 