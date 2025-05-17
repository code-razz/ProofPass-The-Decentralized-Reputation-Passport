# Soulbound Certificate System

A decentralized certificate system using Soulbound Tokens (SBTs) for issuing and managing credentials on the blockchain.

## Features

- Issue non-transferable certificates as Soulbound Tokens
- Store certificate metadata on IPFS (via Pinata)
- View and manage certificates
- Share certificate proofs
- Role-based access control for issuers

## Tech Stack

- **Smart Contracts**: Solidity (ERC721 + Soulbound logic)
- **Frontend**: Next.js + React + TypeScript
- **Styling**: Chakra UI + Tailwind CSS
- **Blockchain**: Ethereum (Sepolia testnet)
- **Storage**: Pinata IPFS for metadata
- **Wallet Integration**: MetaMask

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- MetaMask wallet
- Pinata account (for IPFS storage)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd soulbound-certificates
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file:
```bash
cp .env.example .env
```
Fill in your environment variables in the `.env` file:
```
SEPOLIA_RPC_URL=your-sepolia-rpc-url
PRIVATE_KEY=your-private-key
NEXT_PUBLIC_PINATA_API_KEY=your-pinata-api-key
NEXT_PUBLIC_PINATA_API_SECRET=your-pinata-api-secret
```

4. Compile smart contracts:
```bash
npm run compile
```

5. Deploy smart contracts:
```bash
npm run deploy
```

6. Start the development server:
```bash
npm run dev
```

## Smart Contract

The `SoulboundCertificate` contract implements:
- Non-transferable NFTs (Soulbound Tokens)
- Role-based access control for issuers
- IPFS metadata storage
- Certificate issuance and management

## Frontend

The frontend application provides:
- Issuer dashboard for creating certificates
- Recipient view for managing certificates
- Certificate sharing and verification
- Wallet connection and transaction management

## Getting API Keys

### MetaMask Developer (Sepolia RPC)
1. Go to [MetaMask Developer Portal](https://portfolio.metamask.io/)
2. Create a new project
3. Select Sepolia network
4. Copy the RPC URL

### Pinata (IPFS)
1. Go to [Pinata](https://app.pinata.cloud/register)
2. Create an account
3. Go to API Keys section
4. Create a new API key
5. Copy the API Key and Secret Key

## License

MIT

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request 