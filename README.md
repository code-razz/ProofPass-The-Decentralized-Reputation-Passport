# ProofPass: The Decentralized Reputation Passport

ProofPass is a decentralized reputation and certification system built on blockchain technology that enables the issuance, verification, and management of non-transferable (soulbound) certificates. The platform serves as a trustless and transparent way to establish and verify professional credentials, achievements, and reputation in the digital space.

## 🚀 Features

- **Soulbound Certificates**: Non-transferable NFT-based certificates permanently bound to recipients
- **Issuer Management**: Multi-level authorization system for certificate issuers
- **Certificate Management**: Secure issuance and immutable record-keeping
- **Opportunity Management**: Platform for posting and managing opportunities
- **GitHub Integration**: Developer verification through GitHub usernames
- **IPFS Storage**: Decentralized storage for certificate metadata

## 🛠️ Tech Stack

- **Frontend**: Next.js 13, React, Chakra UI, Tailwind CSS
- **Smart Contracts**: Solidity (v0.8.20), OpenZeppelin
- **Blockchain**: Ethereum (Sepolia Testnet)
- **Development**: Hardhat, TypeScript, Web3Modal
- **Storage**: IPFS (Pinata)

## 📋 Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- MetaMask or similar Web3 wallet
- Git

## 🚀 Getting Started

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/ProofPass-The-Decentralized-Reputation-Passport.git
   cd ProofPass-The-Decentralized-Reputation-Passport
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Set up environment variables**
   Create a `.env.local` file in the root directory with the following variables:
   ```env
   SEPOLIA_RPC_URL=your_sepolia_rpc_url
   PRIVATE_KEY=your_wallet_private_key
   NEXT_PUBLIC_PINATA_API_KEY=your_pinata_api_key
   NEXT_PUBLIC_PINATA_API_SECRET=your_pinata_api_secret
   NEXT_PUBLIC_SOULBOUND_CERTIFICATE_ADDRESS=your_deployed_contract_address
   NEXT_PUBLIC_OPPORTUNITY_MANAGER_ADDRESS=your_deployed_opportunity_manager_address
   ```

4. **Compile smart contracts**
   ```bash
   npx hardhat compile
   ```

5. **Deploy contracts locally**
   ```bash
   # Start local Hardhat node
   npx hardhat node

   # In a new terminal, deploy contracts
   npx hardhat run scripts/deploy.ts --network localhost
   ```

6. **Run the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

Visit `http://localhost:3000` to see the application.

## 📝 Smart Contract Deployment

### Local Development
1. Start a local Hardhat node:
   ```bash
   npx hardhat node
   ```

2. Deploy contracts to the local network:
   ```bash
   npx hardhat run scripts/deploy.ts --network localhost
   ```

3. Update your `.env.local` file with the deployed contract addresses.

### Sepolia Testnet Deployment
1. Ensure your `.env.local` file has the correct Sepolia RPC URL and private key.
2. Deploy to Sepolia:
   ```bash
   npx hardhat run scripts/deploy.ts --network sepolia
   ```
3. Update your `.env.local` file with the deployed contract addresses.

## 🔑 Environment Variables

| Variable | Description |
|----------|-------------|
| `SEPOLIA_RPC_URL` | RPC URL for Sepolia testnet |
| `PRIVATE_KEY` | Your wallet's private key for deployment |
| `NEXT_PUBLIC_PINATA_API_KEY` | Pinata API key for IPFS storage |
| `NEXT_PUBLIC_PINATA_API_SECRET` | Pinata API secret for IPFS storage |
| `NEXT_PUBLIC_SOULBOUND_CERTIFICATE_ADDRESS` | Deployed SoulboundCertificate contract address |
| `NEXT_PUBLIC_OPPORTUNITY_MANAGER_ADDRESS` | Deployed OpportunityManager contract address |

## 📚 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build production application
- `npm run start` - Start production server
- `npm run compile` - Compile smart contracts
- `npm run test` - Run smart contract tests
- `npm run deploy` - Deploy contracts to local network

## 🔒 Security

- Smart contracts are built using OpenZeppelin's secure implementations
- Role-based access control for issuer management
- Immutable certificate records
- Transparent activity logging

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.