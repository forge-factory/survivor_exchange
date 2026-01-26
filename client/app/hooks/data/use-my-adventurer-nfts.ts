import { useAccount } from '@starknet-react/core';
import { useCallback, useEffect, useState } from 'react';
import type { FormattedNFT } from '../../lib/types';
import { normalizeContractAddress } from '../../lib/utils/normalization';
import { DEFAULT_POLL_INTERVAL } from '../../lib/constants';

interface UseMyAdventurerNFTsOptions {
  address?: string;
}

export function useMyAdventurerNFTs(options?: UseMyAdventurerNFTsOptions) {
  const { address: accountAddress } = useAccount();
  const rawTargetAddress = options?.address || accountAddress;
  const targetAddress = rawTargetAddress ? normalizeContractAddress(rawTargetAddress) : undefined;

  const [nfts, setNfts] = useState<FormattedNFT[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAdventurerNFTs = useCallback(async () => {
    if (!targetAddress) {
      setNfts([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Use our API route to proxy the SQL request (avoids CORS issues)
      const response = await fetch(`/api/adventurer-nfts?address=${encodeURIComponent(targetAddress)}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to fetch: ${response.status}`);
      }

      const data = await response.json();
      setNfts(data.nfts || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching Adventurer NFTs:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(new Error(errorMessage));
      setNfts([]);
    } finally {
      setLoading(false);
    }
  }, [targetAddress]);

  // Initial fetch
  useEffect(() => {
    fetchAdventurerNFTs();
  }, [fetchAdventurerNFTs]);

  // Polling
  useEffect(() => {
    const interval = setInterval(fetchAdventurerNFTs, DEFAULT_POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchAdventurerNFTs]);

  return {
    nfts,
    loading,
    error,
    address: targetAddress,
    refetch: fetchAdventurerNFTs,
  };
}
