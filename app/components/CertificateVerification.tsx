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

interface VerificationRequest {
  employer: string;
  user: string;
  certificateIds: number[];
  purpose: string;
  requestedAt: number;
  isApproved: boolean;
  isRejected: boolean;
}

interface Certificate {
  id: number;
  name: string;
  description: string;
  issuer: string;
  issueDate: string;
  ipfsHash: string;
  pdfHash: string;
}

export default function CertificateVerification() {
  const { address } = useAccount();
  const [selectedCertificates, setSelectedCertificates] = useState<number[]>([]);
  const [purpose, setPurpose] = useState('');
  const [verificationRequests, setVerificationRequests] = useState<VerificationRequest[]>([]);
  const [userCertificates, setUserCertificates] = useState<Certificate[]>([]);
  const [isEmployer, setIsEmployer] = useState(false);

  // Check if user is an employer
  const { data: employerStatus } = useContractRead({
    address: CONTRACT_ADDRESS,
    abi: soulboundCertificateABI,
    functionName: 'isProvider',
    args: [address],
  } as ContractReadParameters);

  // Get user's certificates
  const { data: balance } = useContractRead({
    address: CONTRACT_ADDRESS,
    abi: soulboundCertificateABI,
    functionName: 'balanceOf',
    args: [address],
  } as ContractReadParameters);

  // Request verification
  const { writeAsync: requestVerification, isLoading: isRequesting } = useContractWrite({
    address: CONTRACT_ADDRESS,
    abi: soulboundCertificateABI,
    functionName: 'requestVerification',
  } as ContractWriteParameters) as unknown as ContractWriteReturn;

  // Approve verification
  const { writeAsync: approveVerification } = useContractWrite({
    address: CONTRACT_ADDRESS,
    abi: soulboundCertificateABI,
    functionName: 'approveVerification',
  } as ContractWriteParameters) as unknown as ContractWriteReturn;

  // Reject verification
  const { writeAsync: rejectVerification } = useContractWrite({
    address: CONTRACT_ADDRESS,
    abi: soulboundCertificateABI,
    functionName: 'rejectVerification',
  } as ContractWriteParameters) as unknown as ContractWriteReturn;

  useEffect(() => {
    setIsEmployer(!!employerStatus);
    fetchUserCertificates();
    if (employerStatus) {
      fetchVerificationRequests();
    }
  }, [employerStatus, balance]);

  const fetchUserCertificates = async () => {
    if (!balance) return;

    const certs = await Promise.all(
      Array.from({ length: Number(balance) }, async (_, i) => {
        const tokenId = await window.ethereum.request({
          method: 'eth_call',
          params: [
            {
              to: CONTRACT_ADDRESS,
              data: encodeFunctionData(soulboundCertificateABI, 'tokenOfOwnerByIndex', [address, i]),
            },
            'latest',
          ],
        });

        const id = Number(tokenId);
        const ipfsHash = await fetchCertificateURI(id);
        const issuer = await fetchCertificateIssuer(id);
        const issueDate = await fetchCertificateIssueDate(id);

        // Fetch metadata from IPFS
        const response = await fetch(`https://ipfs.io/ipfs/${ipfsHash}`);
        const metadata = await response.json();

        return {
          id,
          name: metadata.name,
          description: metadata.description,
          issuer,
          issueDate: new Date(Number(issueDate) * 1000).toLocaleDateString(),
          ipfsHash,
          pdfHash: metadata.pdfHash,
        };
      })
    );

    setUserCertificates(certs);
  };

  const fetchCertificateURI = async (tokenId: number) => {
    const uri = await window.ethereum.request({
      method: 'eth_call',
      params: [
        {
          to: CONTRACT_ADDRESS,
          data: encodeFunctionData(soulboundCertificateABI, 'tokenURI', [tokenId]),
        },
        'latest',
      ],
    });
    return decodeFunctionResult(soulboundCertificateABI, 'tokenURI', uri as `0x${string}`)[0];
  };

  const fetchCertificateIssuer = async (tokenId: number) => {
    const issuer = await window.ethereum.request({
      method: 'eth_call',
      params: [
        {
          to: CONTRACT_ADDRESS,
          data: encodeFunctionData(soulboundCertificateABI, 'getIssuer', [tokenId]),
        },
        'latest',
      ],
    });
    return decodeFunctionResult(soulboundCertificateABI, 'getIssuer', issuer as `0x${string}`)[0];
  };

  const fetchCertificateIssueDate = async (tokenId: number) => {
    const date = await window.ethereum.request({
      method: 'eth_call',
      params: [
        {
          to: CONTRACT_ADDRESS,
          data: encodeFunctionData(soulboundCertificateABI, 'getIssueDate', [tokenId]),
        },
        'latest',
      ],
    });
    return decodeFunctionResult(soulboundCertificateABI, 'getIssueDate', date as `0x${string}`)[0];
  };

  const fetchVerificationRequests = async () => {
    // Implementation depends on how verification requests are stored in the contract
    // This is a placeholder for the actual implementation
    const requests = await window.ethereum.request({
      method: 'eth_call',
      params: [
        {
          to: CONTRACT_ADDRESS,
          data: encodeFunctionData(soulboundCertificateABI, 'verificationRequests', [address]),
        },
        'latest',
      ],
    });

    // Process and set verification requests
    // This is a simplified version - actual implementation would need to handle the data structure
    setVerificationRequests([]);
  };

  const handleRequestVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCertificates.length || !purpose) return;

    try {
      await requestVerification({
        args: [address, selectedCertificates, purpose],
      });
      setSelectedCertificates([]);
      setPurpose('');
    } catch (error) {
      console.error('Error requesting verification:', error);
    }
  };

  const handleApproveVerification = async (user: string, requestIndex: number) => {
    try {
      await approveVerification({
        args: [user, requestIndex],
      });
    } catch (error) {
      console.error('Error approving verification:', error);
    }
  };

  const handleRejectVerification = async (user: string, requestIndex: number) => {
    try {
      await rejectVerification({
        args: [user, requestIndex],
      });
    } catch (error) {
      console.error('Error rejecting verification:', error);
    }
  };

  const toggleCertificateSelection = (certificateId: number) => {
    setSelectedCertificates((prev) =>
      prev.includes(certificateId)
        ? prev.filter((id) => id !== certificateId)
        : [...prev, certificateId]
    );
  };

  if (isEmployer) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <h2 className="text-2xl font-bold mb-6">Verification Requests</h2>
        
        <div className="space-y-6">
          {verificationRequests.map((request, index) => (
            <div
              key={index}
              className="bg-white rounded-lg shadow-lg p-6"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold">
                    Request from {request.user}
                  </h3>
                  <p className="text-sm text-gray-500">
                    Requested on {new Date(request.requestedAt * 1000).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  {request.isApproved ? (
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                      Approved
                    </span>
                  ) : request.isRejected ? (
                    <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">
                      Rejected
                    </span>
                  ) : (
                    <>
                      <button
                        onClick={() => handleApproveVerification(request.user, index)}
                        className="px-3 py-1 text-sm text-green-600 hover:text-green-800"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleRejectVerification(request.user, index)}
                        className="px-3 py-1 text-sm text-red-600 hover:text-red-800"
                      >
                        Reject
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="mt-4">
                <h4 className="font-medium text-gray-700">Purpose</h4>
                <p className="mt-2 text-gray-600">{request.purpose}</p>
              </div>

              <div className="mt-4">
                <h4 className="font-medium text-gray-700">Certificates</h4>
                <div className="mt-2 space-y-2">
                  {request.certificateIds.map((id) => (
                    <div key={id} className="text-sm text-gray-600">
                      Certificate #{id}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}

          {verificationRequests.length === 0 && (
            <p className="text-center text-gray-600">
              No pending verification requests.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-6">Request Certificate Verification</h2>
        
        <form onSubmit={handleRequestVerification} className="space-y-6">
          <div>
            <h3 className="text-lg font-medium text-gray-700 mb-4">Select Certificates</h3>
            <div className="space-y-4">
              {userCertificates.map((cert) => (
                <div
                  key={cert.id}
                  className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => toggleCertificateSelection(cert.id)}
                >
                  <input
                    type="checkbox"
                    checked={selectedCertificates.includes(cert.id)}
                    onChange={() => {}}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <div>
                    <p className="font-medium">{cert.name}</p>
                    <p className="text-sm text-gray-500">
                      Issued by {cert.issuer} on {cert.issueDate}
                    </p>
                    <p className="mt-1 text-sm text-gray-600">{cert.description}</p>
                  </div>
                </div>
              ))}

              {userCertificates.length === 0 && (
                <p className="text-center text-gray-600">
                  You don't have any certificates to verify.
                </p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="purpose" className="block text-sm font-medium text-gray-700">
              Purpose of Verification
            </label>
            <textarea
              id="purpose"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              rows={4}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              required
              placeholder="Explain why you need these certificates verified..."
            />
          </div>

          <button
            type="submit"
            disabled={isRequesting || !selectedCertificates.length}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {isRequesting ? 'Requesting...' : 'Request Verification'}
          </button>
        </form>
      </div>
    </div>
  );
} 