'use client';

import { useState, useEffect } from 'react';
import { useContractWrite, useContractRead, useAccount } from 'wagmi';
import { 
  soulboundCertificateABI, 
  CONTRACT_ADDRESS, 
  type ContractWriteParameters, 
  type ContractWriteReturn,
  type ContractReadParameters,
  encodeFunctionData,
  decodeFunctionResult
} from '../config';

interface Opportunity {
  id: number;
  title: string;
  description: string;
  requirements: string;
  postedAt: number;
  isActive: boolean;
}

export default function OpportunityManagement() {
  const { address } = useAccount();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [requirements, setRequirements] = useState('');
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);

  // Check if user is a provider
  const { data: providerDetails } = useContractRead({
    address: CONTRACT_ADDRESS,
    abi: soulboundCertificateABI,
    functionName: 'getProviderDetails',
    args: [address],
  } as ContractReadParameters);

  // Get provider's opportunities
  const { data: opportunityIds } = useContractRead({
    address: CONTRACT_ADDRESS,
    abi: soulboundCertificateABI,
    functionName: 'getProviderOpportunities',
    args: [address],
    watch: true,
  } as ContractReadParameters);

  // Post new opportunity
  const { writeContract: postOpportunity, isPending: isPosting } = useContractWrite({
    address: CONTRACT_ADDRESS,
    abi: soulboundCertificateABI,
    functionName: 'postOpportunity',
  } as ContractWriteParameters);

  // Close opportunity
  const { writeContract: closeOpportunity } = useContractWrite({
    address: CONTRACT_ADDRESS,
    abi: soulboundCertificateABI,
    functionName: 'closeOpportunity',
  } as ContractWriteParameters);

  // Fetch opportunity details
  useEffect(() => {
    const fetchOpportunities = async () => {
      if (!opportunityIds) return;

      const opps = await Promise.all(
        (opportunityIds as number[]).map(async (id: number) => {
          const details = await fetchOpportunityDetails(id);
          return {
            id,
            ...details,
          };
        })
      );

      setOpportunities(opps);
    };

    fetchOpportunities();
  }, [opportunityIds]);

  const fetchOpportunityDetails = async (id: number) => {
    const details = await window.ethereum.request({
      method: 'eth_call',
      params: [
        {
          to: CONTRACT_ADDRESS,
          data: encodeFunctionData(soulboundCertificateABI, 'getOpportunityDetails', [id]),
        },
        'latest',
      ],
    });

    const decoded = decodeFunctionResult(soulboundCertificateABI, 'getOpportunityDetails', details as `0x${string}`);
    return {
      title: decoded[1],
      description: decoded[2],
      requirements: decoded[3],
      postedAt: Number(decoded[4]),
      isActive: decoded[5],
    };
  };

  const handlePostOpportunity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || !requirements) return;

    try {
      await postOpportunity?.({
        address: CONTRACT_ADDRESS,
        abi: soulboundCertificateABI,
        functionName: 'postOpportunity',
        args: [title, description, requirements],
      });
      setTitle('');
      setDescription('');
      setRequirements('');
    } catch (error) {
      console.error('Error posting opportunity:', error);
    }
  };

  const handleCloseOpportunity = async (opportunityId: number) => {
    try {
      await closeOpportunity?.({
        address: CONTRACT_ADDRESS,
        abi: soulboundCertificateABI,
        functionName: 'closeOpportunity',
        args: [opportunityId],
      });
    } catch (error) {
      console.error('Error closing opportunity:', error);
    }
  };

  if (!providerDetails) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
        <p className="text-center text-gray-600">
          You need to register as a provider to post opportunities.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <h2 className="text-2xl font-bold mb-6">Post New Opportunity</h2>
        
        <form onSubmit={handlePostOpportunity} className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">
              Job Title
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Job Description
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
            <label htmlFor="requirements" className="block text-sm font-medium text-gray-700">
              Requirements
            </label>
            <textarea
              id="requirements"
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              rows={4}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isPosting}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {isPosting ? 'Posting...' : 'Post Opportunity'}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-6">Your Opportunities</h2>
        
        <div className="space-y-6">
          {opportunities.map((opp) => (
            <div
              key={opp.id}
              className="border rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-semibold">{opp.title}</h3>
                  <p className="text-sm text-gray-500">
                    Posted on {new Date(opp.postedAt * 1000).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  {opp.isActive ? (
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                      Active
                    </span>
                  ) : (
                    <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">
                      Closed
                    </span>
                  )}
                  {opp.isActive && (
                    <button
                      onClick={() => handleCloseOpportunity(opp.id)}
                      className="px-3 py-1 text-sm text-red-600 hover:text-red-800"
                    >
                      Close
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-4">
                <h4 className="font-medium text-gray-700">Description</h4>
                <p className="mt-2 text-gray-600">{opp.description}</p>
              </div>

              <div className="mt-4">
                <h4 className="font-medium text-gray-700">Requirements</h4>
                <p className="mt-2 text-gray-600">{opp.requirements}</p>
              </div>
            </div>
          ))}

          {opportunities.length === 0 && (
            <p className="text-center text-gray-600">
              No opportunities posted yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
} 