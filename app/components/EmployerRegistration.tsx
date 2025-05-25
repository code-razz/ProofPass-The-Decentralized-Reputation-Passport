'use client';

import { useState } from 'react';
import { useContractWrite, useContractRead, useAccount } from 'wagmi';
import { 
  soulboundCertificateABI, 
  CONTRACT_ADDRESS, 
  type ContractWriteParameters, 
  type ContractWriteReturn,
  type ContractReadParameters
} from '../config';

export default function ProviderRegistration() {
  const { address } = useAccount();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [website, setWebsite] = useState('');
  const [providerType, setProviderType] = useState('employer');
  const [isRegistered, setIsRegistered] = useState(false);

  // Check if user is already registered as provider
  const { data: providerStatus } = useContractRead({
    address: CONTRACT_ADDRESS,
    abi: soulboundCertificateABI,
    functionName: 'isProvider',
    args: [address],
  } as ContractReadParameters);

  // Get provider details if registered
  const { data: providerDetails } = useContractRead({
    address: CONTRACT_ADDRESS,
    abi: soulboundCertificateABI,
    functionName: 'getProviderDetails',
    args: [address],
    enabled: !!providerStatus,
  } as ContractReadParameters);

  // Register as provider
  const { writeContract, isPending: isRegistering, data: hash, isSuccess, isError, error } = useContractWrite();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !description || !website || !providerType) return;

    try {
      const result = await writeContract?.({
        address: CONTRACT_ADDRESS,
        abi: soulboundCertificateABI,
        functionName: 'registerAsProvider',
        args: [name, description, website, providerType],
      });
      console.log('Transaction submitted:', result);
    } catch (error) {
      console.error('Error registering as provider:', error);
    }
  };

  if (isSuccess) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-green-600 mb-4">Registration Successful!</h2>
          <p className="text-gray-600 mb-4">Your provider registration has been submitted.</p>
          <p className="text-sm text-gray-500">Transaction Hash: {hash}</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Registration Failed</h2>
          <p className="text-gray-600 mb-4">Error: {error?.message}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (providerStatus) {
    const details = providerDetails as [string, string, string, string, number] | undefined;
    const [provName, provDescription, provWebsite, provType, registeredAt] = details || [];
    return (
      <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold mb-6">Provider Profile</h2>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold">{provName}</h3>
              <p className="text-gray-600">{provWebsite}</p>
              <p className="text-sm text-gray-500">Type: {provType}</p>
            </div>
            <div className="text-sm text-gray-500">
              Registered on: {new Date(Number(registeredAt) * 1000).toLocaleDateString()}
            </div>
          </div>

          <div className="mt-4">
            <h4 className="font-medium text-gray-700">About</h4>
            <p className="mt-2 text-gray-600">{provDescription}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6">Register as Opportunity Provider</h2>
      
      <form onSubmit={handleRegister} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Organization Name
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            required
          />
        </div>

        <div>
          <label htmlFor="providerType" className="block text-sm font-medium text-gray-700">
            Provider Type
          </label>
          <select
            id="providerType"
            value={providerType}
            onChange={(e) => setProviderType(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            required
          >
            <option value="employer">Employer</option>
            <option value="college">College/University</option>
            <option value="institution">Educational Institution</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            required
          />
        </div>

        <div>
          <label htmlFor="website" className="block text-sm font-medium text-gray-700">
            Website
          </label>
          <input
            type="url"
            id="website"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            required
          />
        </div>

        <button
          type="submit"
          disabled={isRegistering}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {isRegistering ? 'Registering...' : 'Register as Provider'}
        </button>
      </form>
    </div>
  );
} 