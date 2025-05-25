'use client';

import { useState, useEffect } from 'react';
import { useContractRead, useContractWrite, useAccount } from 'wagmi';
import { 
  soulboundCertificateABI, 
  CONTRACT_ADDRESS, 
  type ContractWriteParameters, 
  type ContractWriteReturn,
  type ContractReadParameters,
  encodeFunctionData,
  decodeFunctionResult
} from '../config';

interface Certificate {
  id: number;
  name: string;
  description: string;
  issuer: string;
  issueDate: string;
  ipfsHash: string;
  pdfHash: string;
}

interface Endorsement {
  endorser: string;
  skill: string;
  comment: string;
  timestamp: number;
}

interface Employer {
  name: string;
  description: string;
  website: string;
  isVerified: boolean;
}

export default function ReputationPassport() {
  const { address } = useAccount();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [endorsements, setEndorsements] = useState<Endorsement[]>([]);
  const [employers, setEmployers] = useState<Record<string, Employer>>({});
  const [selectedCertificates, setSelectedCertificates] = useState<number[]>([]);
  const [isEmployer, setIsEmployer] = useState(false);
  const [skill, setSkill] = useState('');
  const [comment, setComment] = useState('');
  const [selectedUser, setSelectedUser] = useState<string>('');

  // Check if user is an employer
  const { data: employerStatus } = useContractRead({
    address: CONTRACT_ADDRESS,
    abi: soulboundCertificateABI,
    functionName: 'isEmployer',
    args: [address],
  });

  // Get user's certificates
  const { data: balance } = useContractRead({
    address: CONTRACT_ADDRESS,
    abi: soulboundCertificateABI,
    functionName: 'balanceOf',
    args: [address],
  });

  // Add endorsement
  const { writeAsync: addEndorsement, isLoading: isAddingEndorsement } = useContractWrite({
    address: CONTRACT_ADDRESS,
    abi: soulboundCertificateABI,
    functionName: 'addEndorsement',
  } as ContractWriteParameters) as unknown as ContractWriteReturn;

  useEffect(() => {
    setIsEmployer(!!employerStatus);
    if (balance) {
      fetchUserCertificates();
    }
    if (employerStatus) {
      fetchEndorsements();
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

    setCertificates(certs);
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

  const fetchEndorsements = async () => {
    const result = await window.ethereum.request({
      method: 'eth_call',
      params: [
        {
          to: CONTRACT_ADDRESS,
          data: encodeFunctionData(soulboundCertificateABI, 'getUserEndorsements', [address]),
        },
        'latest',
      ],
    });

    const decoded = decodeFunctionResult(soulboundCertificateABI, 'getUserEndorsements', result as `0x${string}`);
    
    const endorsementsList = decoded[0].map((endorser: string, index: number) => ({
      endorser,
      skill: decoded[1][index],
      comment: decoded[2][index],
      timestamp: Number(decoded[3][index]),
    }));

    setEndorsements(endorsementsList);

    // Fetch employer details for each endorser
    const employerDetails = await Promise.all(
      decoded[0].map(async (endorser: string) => {
        const details = await window.ethereum.request({
          method: 'eth_call',
          params: [
            {
              to: CONTRACT_ADDRESS,
              data: encodeFunctionData(soulboundCertificateABI, 'getEmployerDetails', [endorser]),
            },
            'latest',
          ],
        });

        const decoded = decodeFunctionResult(soulboundCertificateABI, 'getEmployerDetails', details as `0x${string}`);
        return {
          [endorser]: {
            name: decoded[0],
            description: decoded[1],
            website: decoded[2],
            isVerified: decoded[3],
          },
        };
      })
    );

    setEmployers(Object.assign({}, ...employerDetails));
  };

  const handleAddEndorsement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !skill || !comment) return;

    try {
      await addEndorsement({
        args: [selectedUser, skill, comment],
      });
      setSkill('');
      setComment('');
      setSelectedUser('');
    } catch (error) {
      console.error('Error adding endorsement:', error);
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
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-6">Add Endorsement</h2>
          
          <form onSubmit={handleAddEndorsement} className="space-y-4">
            <div>
              <label htmlFor="user" className="block text-sm font-medium text-gray-700">
                User Address
              </label>
              <input
                type="text"
                id="user"
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                required
                placeholder="0x..."
              />
            </div>

            <div>
              <label htmlFor="skill" className="block text-sm font-medium text-gray-700">
                Skill
              </label>
              <input
                type="text"
                id="skill"
                value={skill}
                onChange={(e) => setSkill(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                required
              />
            </div>

            <div>
              <label htmlFor="comment" className="block text-sm font-medium text-gray-700">
                Comment
              </label>
              <textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isAddingEndorsement}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {isAddingEndorsement ? 'Adding...' : 'Add Endorsement'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <h2 className="text-2xl font-bold mb-6">Your Reputation Passport</h2>
        
        <div className="space-y-8">
          <div>
            <h3 className="text-xl font-semibold mb-4">Certificates</h3>
            <div className="space-y-4">
              {certificates.map((cert) => (
                <div
                  key={cert.id}
                  className="p-4 border rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium">{cert.name}</h4>
                      <p className="text-sm text-gray-500">
                        Issued by {cert.issuer} on {cert.issueDate}
                      </p>
                      <p className="mt-2 text-gray-600">{cert.description}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={selectedCertificates.includes(cert.id)}
                        onChange={() => toggleCertificateSelection(cert.id)}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                    </div>
                  </div>
                </div>
              ))}

              {certificates.length === 0 && (
                <p className="text-center text-gray-600">
                  No certificates found.
                </p>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-4">Endorsements</h3>
            <div className="space-y-4">
              {endorsements.map((endorsement, index) => (
                <div
                  key={index}
                  className="p-4 border rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium">{endorsement.skill}</h4>
                      <p className="text-sm text-gray-500">
                        Endorsed by {employers[endorsement.endorser]?.name || endorsement.endorser}
                      </p>
                      <p className="mt-2 text-gray-600">{endorsement.comment}</p>
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(endorsement.timestamp * 1000).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}

              {endorsements.length === 0 && (
                <p className="text-center text-gray-600">
                  No endorsements yet.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {selectedCertificates.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Share Selected Certificates</h3>
          <p className="text-gray-600 mb-4">
            You have selected {selectedCertificates.length} certificate(s) to share.
            Use the verification request feature to share these with employers.
          </p>
          <button
            onClick={() => window.location.href = '/verify'}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Request Verification
          </button>
        </div>
      )}
    </div>
  );
} 