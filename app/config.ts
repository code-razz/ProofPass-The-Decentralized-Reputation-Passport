import { type Abi } from 'viem';
import { type Config, type UseWriteContractReturnType, type UseWriteContractParameters, type UseReadContractParameters } from 'wagmi';
import SoulboundCertificateArtifact from '../artifacts/contracts/SoulboundCertificate.sol/SoulboundCertificate.json';

export const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`;

export const soulboundCertificateABI = SoulboundCertificateArtifact.abi as Abi;

// Define the contract interface for type safety
export interface SoulboundCertificateContract {
  // ERC721 functions
  balanceOf: (owner: string) => Promise<bigint>;
  ownerOf: (tokenId: number) => Promise<string>;
  tokenURI: (tokenId: number) => Promise<string>;
  tokenOfOwnerByIndex: (owner: string, index: number) => Promise<number>;

  // Provider functions
  isProvider: (address: string) => Promise<boolean>;
  getProviderDetails: (address: string) => Promise<[string, string, string, string, number]>;
  registerAsProvider: (name: string, description: string, website: string, providerType: string) => Promise<void>;
  postOpportunity: (title: string, description: string, requirements: string) => Promise<void>;
  closeOpportunity: (opportunityId: number) => Promise<void>;
  getProviderOpportunities: (provider: string) => Promise<number[]>;
  getOpportunityDetails: (id: number) => Promise<[string, string, string, string, number, boolean]>;

  // Certificate functions
  getIssuer: (tokenId: number) => Promise<string>;
  getIssueDate: (tokenId: number) => Promise<number>;

  // Verification functions
  requestVerification: (user: string, certificateIds: number[], purpose: string) => Promise<void>;
  approveVerification: (user: string, requestIndex: number) => Promise<void>;
  rejectVerification: (user: string, requestIndex: number) => Promise<void>;

  // Endorsement functions
  addEndorsement: (user: string, skill: string, comment: string) => Promise<void>;
  getUserEndorsements: (user: string) => Promise<[string[], string[], string[], number[]]>;
}

// Define the contract write parameters type
export type ContractWriteParameters = Omit<UseWriteContractParameters<Config, SoulboundCertificateContract>, 'abi'> & {
  abi: typeof soulboundCertificateABI;
};

// Define the contract write return type
export type ContractWriteReturn = Omit<UseWriteContractReturnType<Config, SoulboundCertificateContract>, 'write'> & {
  writeAsync: (args: { args?: any[] }) => Promise<`0x${string}`>;
  isLoading: boolean;
};

// Define the contract read parameters type
export type ContractReadParameters = {
  address: `0x${string}`;
  abi: typeof soulboundCertificateABI;
  functionName: keyof SoulboundCertificateContract;
  args?: any[];
  enabled?: boolean;
  watch?: boolean;
};

// Add helper functions for ABI encoding/decoding
export const encodeFunctionData = (abi: Abi, functionName: string, args: any[]): `0x${string}` => {
  const functionAbi = (abi as any[]).find((item) => item.name === functionName);
  if (!functionAbi) throw new Error(`Function ${functionName} not found in ABI`);
  
  const { encodeFunctionData } = require('viem');
  return encodeFunctionData({
    abi: [functionAbi],
    functionName,
    args,
  });
};

export const decodeFunctionResult = (abi: Abi, functionName: string, data: `0x${string}`): any[] => {
  const functionAbi = (abi as any[]).find((item) => item.name === functionName);
  if (!functionAbi) throw new Error(`Function ${functionName} not found in ABI`);
  
  const { decodeFunctionResult } = require('viem');
  return decodeFunctionResult({
    abi: [functionAbi],
    functionName,
    data,
  });
}; 