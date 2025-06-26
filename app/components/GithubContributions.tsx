'use client';

import React, { useState, useEffect } from 'react';
import { Box, VStack, Heading, Input, Button, Text, Spinner, useToast, Link, Card, CardHeader, CardBody, UnorderedList, ListItem, Badge, Flex, Spacer, IconButton,
  Table, Thead, Tbody, Tr, Th, Td, TableContainer
} from '@chakra-ui/react';
import { EditIcon } from '@chakra-ui/icons';
import axios from 'axios';
import { useWeb3Modal } from '../context/Web3ModalContext';
import { ethers } from 'ethers';
import SoulboundCertificate from '../../artifacts/contracts/SoulboundCertificate.sol/SoulboundCertificate.json';

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_SOULBOUND_CERTIFICATE_ADDRESS;

interface RepoStats {
  name: string;
  stars: number;
  forks: number;
}

interface PullRequest {
  repo: string;
  title: string;
  number: number;
  merged: boolean;
  created_at: string;
}

async function getUserReposWithStats(username: string): Promise<RepoStats[]> {
  const result: RepoStats[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const url = `https://api.github.com/users/${username}/repos?per_page=100&page=${page}`;
    const res = await axios.get(url);
    const repos = res.data;

    for (const repo of repos) {
      if (!repo.fork && (repo.stargazers_count > 0 || repo.forks_count > 0)) {
        result.push({
          name: repo.name,
          stars: repo.stargazers_count,
          forks: repo.forks_count,
        });
      }
    }

    hasMore = repos.length === 100;
    page++;
  }

  return result;
}

async function getUserPRsWithMergeStatus(username: string): Promise<PullRequest[]> {
  const searchUrl = `https://api.github.com/search/issues?q=type:pr+author:${username}&per_page=30`;
  const searchRes = await axios.get(searchUrl);
  const items = searchRes.data.items;

  const prs: PullRequest[] = [];

  for (const pr of items) {
    const [owner, repo] = pr.repository_url.replace("https://api.github.com/repos/", "").split("/");
    const prNumber = pr.number;

    try {
      const prUrl = `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`;
      const prDetails = await axios.get(prUrl);

      prs.push({
        repo: `${owner}/${repo}`,
        title: pr.title,
        number: prNumber,
        merged: prDetails.data.merged,
        created_at: pr.created_at,
      });
    } catch (err: any) {
      console.error(`❌ Error fetching PR #${prNumber} from ${owner}/${repo}: ${err.message}`);
    }
  }

  return prs;
}

export default function GithubContributions() {
  const { address, provider, isConnected } = useWeb3Modal();
  const toast = useToast();
  const [githubUsername, setGithubUsername] = useState('');
  const [tempUsername, setTempUsername] = useState(''); // For editing
  const [repos, setRepos] = useState<RepoStats[]>([]);
  const [prs, setPrs] = useState<PullRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingUsername, setIsSavingUsername] = useState(false);
  const [isEditingUsername, setIsEditingUsername] = useState(false); // For editing mode

  // Fetch saved username on mount
  useEffect(() => {
    if (isConnected && provider && CONTRACT_ADDRESS) {
      fetchGithubUsername();
    }
  }, [isConnected, provider, CONTRACT_ADDRESS]);

  // Fetch contributions when username changes
  useEffect(() => {
    if (githubUsername && isConnected && provider) {
      fetchContributions(githubUsername);
    }
  }, [githubUsername, isConnected, provider]); // Add dependencies

  const fetchGithubUsername = async () => {
    try {
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS!,
        SoulboundCertificate.abi,
        provider
      );
      const username = await contract.getGithubUsername(address);
      if (username) {
        setGithubUsername(username);
        setTempUsername(username); // Initialize temp username
      }
    } catch (error) {
      console.error('Error fetching GitHub username:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch saved GitHub username.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleSaveUsername = async () => {
    if (!tempUsername || !provider || !CONTRACT_ADDRESS) return;

    setIsSavingUsername(true);
    try {
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        SoulboundCertificate.abi,
        signer
      );
      const tx = await contract.setGithubUsername(tempUsername);
      await tx.wait();
      setGithubUsername(tempUsername); // Update main username state
      setIsEditingUsername(false); // Exit editing mode
      toast({
        title: 'Success',
        description: 'GitHub username saved on-chain!',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error: any) {
      console.error('Error saving GitHub username:', error);
       toast({
        title: 'Error',
        description: `Failed to save GitHub username: ${error.message}`,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSavingUsername(false);
    }
  };

  const fetchContributions = async (username: string) => {
    if (!username) return;

    setIsLoading(true);
    setRepos([]);
    setPrs([]);
    try {
      const fetchedRepos = await getUserReposWithStats(username);
      const fetchedPrs = await getUserPRsWithMergeStatus(username);
      setRepos(fetchedRepos);
      setPrs(fetchedPrs);
    } catch (error: any) {
      console.error('Error fetching GitHub contributions:', error);
      toast({
        title: 'Error',
        description: `Failed to fetch GitHub contributions: ${error.message}`,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <VStack spacing={4}>
        <Text>Please connect your wallet to view/manage GitHub contributions.</Text>
      </VStack>
    );
  }

  return (
    <Box position="relative" pt={8}> {/* Added padding top to make space for username */}
      <Flex position="absolute" top={0} right={0} align="center">
        {isEditingUsername ? (
          <VStack spacing={2} align="flex-end">
            <Input
              placeholder="Enter GitHub username"
              value={tempUsername}
              onChange={(e) => setTempUsername(e.target.value)}
              size="sm"
              width="200px"
            />
            <Button onClick={handleSaveUsername} colorScheme="green" isLoading={isSavingUsername} size="sm">
              Save
            </Button>
          </VStack>
        ) : ( githubUsername ? (
            <Flex align="center">
              <Text mr={2}>GitHub: <Link href={`https://github.com/${githubUsername}`} isExternal>{githubUsername}</Link></Text>
              <IconButton
                aria-label="Edit GitHub username"
                icon={<EditIcon />}
                size="sm"
                variant="ghost"
                onClick={() => setIsEditingUsername(true)}
              />
            </Flex>
          ) : (
             <Button size="sm" onClick={() => setIsEditingUsername(true)}>Add GitHub Username</Button>
          )
        )}
      </Flex>

      <Heading size="lg" mb={4}>GitHub Contributions</Heading>
      {/* Removed the manual fetch button */}

      {isLoading ? (
        <Spinner />
      ) : (
        <VStack spacing={6} align="stretch" mt={4}> {/* Added margin top to avoid overlapping username */}
          {repos.length > 0 && (
            <Card variant="outline">
              <CardHeader>
                <Heading size="md">Repositories with Stars or Forks</Heading>
              </CardHeader>
              <CardBody p={0}> {/* Remove padding to make table fill card */}
                <TableContainer>
                  <Table variant="simple" size="sm">
                    <Thead>
                      <Tr>
                        <Th>Repository</Th>
                        <Th isNumeric>Stars</Th>
                        <Th isNumeric>Forks</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {repos.map((repo, index) => (
                        <Tr key={index}>
                          <Td><Link href={`https://github.com/${githubUsername}/${repo.name}`} isExternal>{repo.name}</Link></Td>
                          <Td isNumeric>{repo.stars}</Td>
                          <Td isNumeric>{repo.forks}</Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </TableContainer>
              </CardBody>
            </Card>
          )}

          {prs.length > 0 && (
             <Card variant="outline">
              <CardHeader>
                <Heading size="md">Authored Pull Requests</Heading>
              </CardHeader>
              <CardBody p={0}> {/* Remove padding to make table fill card */}
                <TableContainer>
                  <Table variant="simple" size="sm">
                    <Thead>
                      <Tr>
                        <Th>Pull Request</Th>
                        <Th>Title</Th>
                        <Th>Status</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {prs.map((pr, index) => (
                        <Tr key={index}>
                          <Td><Link href={`https://github.com/${pr.repo}/pull/${pr.number}`} isExternal>{pr.repo} PR #{pr.number}</Link></Td>
                          <Td>{pr.title}</Td>
                          <Td><Badge colorScheme={pr.merged ? 'green' : 'red'}>{pr.merged ? 'Merged' : 'Not Merged'}</Badge></Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </TableContainer>
              </CardBody>
            </Card>
          )}

          {repos.length === 0 && prs.length === 0 && githubUsername && !isLoading && (
              <Text>No contributions found for {githubUsername}.</Text>
          )}
           {repos.length === 0 && prs.length === 0 && !githubUsername && !isLoading && !isEditingUsername && (
              <Text>Add your GitHub username to see contributions.</Text>
          )}
        </VStack>
      )}
    </Box>
  );
} 