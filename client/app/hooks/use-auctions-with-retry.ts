"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery } from "@apollo/client";
import { AUCTIONS_QUERY } from "../lib/queries/auctions";
import type { AuctionsResponse, AuctionWithNFTs } from "../lib/types";
import { useToast } from "../providers/toast-provider";
import {
  parseGraphQLError,
  executeWithRetry,
  GraphQLErrorInfo,
} from "../lib/utils/graphql-error-handler";
import { ErrorMessages } from "../lib/utils/error-handling";

interface UseAuctionsWithRetryResult {
  auctions: AuctionWithNFTs[];
  loading: boolean;
  error: GraphQLErrorInfo | null;
  isRetrying: boolean;
  retryCount: number;
  refetch: () => Promise<void>;
  lastUpdated: Date | null;
}

/**
 * Enhanced auctions hook with automatic retry and better error handling
 * Replaces the standard useAuctions hook with resilience features
 */
export function useAuctionsWithRetry(): UseAuctionsWithRetryResult {
  const toast = useToast();
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const retryAttemptRef = useRef(0);

  const {
    data,
    loading,
    error,
    refetch: apolloRefetch,
  } = useQuery<AuctionsResponse>(AUCTIONS_QUERY, {
    pollInterval: 30000, // 30 second polling
    notifyOnNetworkStatusChange: true,
    errorPolicy: "all",
  });

  // Process and combine auction data with NFTs
  const auctions = useCallback((): AuctionWithNFTs[] => {
    if (!data) return [];

    const auctionItems = data.bm021AuctionItemModels?.edges || [];
    const auctions = data.bm021AuctionModels?.edges || [];
    const bids = data.bm021BidModels?.edges || [];
    const offers = data.bm021OfferModels?.edges || [];

    // Create a map of auction items by auction_id
    const itemsByAuction: Record<string, typeof auctionItems> = {};
    auctionItems.forEach((edge) => {
      const auctionId = edge.node.auction_id;
      if (!itemsByAuction[auctionId]) {
        itemsByAuction[auctionId] = [];
      }
      itemsByAuction[auctionId].push(edge);
    });

    // Create a map of bids by auction_id
    const bidsByAuction: Record<string, typeof bids> = {};
    bids.forEach((edge) => {
      const auctionId = edge.node.auction_id;
      if (!bidsByAuction[auctionId]) {
        bidsByAuction[auctionId] = [];
      }
      bidsByAuction[auctionId].push(edge);
    });

    // Create a map of offers by auction_id
    const offersByAuction: Record<string, typeof offers> = {};
    offers.forEach((edge) => {
      const auctionId = edge.node.auction_id;
      if (!offersByAuction[auctionId]) {
        offersByAuction[auctionId] = [];
      }
      offersByAuction[auctionId].push(edge);
    });

    // Combine auctions with their items, bids, and offers
    return auctions.map((edge) => {
      const auction = edge.node;
      const auctionId = auction.auction_id;
      const items = itemsByAuction[auctionId] || [];
      const auctionBids = bidsByAuction[auctionId] || [];
      const auctionOffers = offersByAuction[auctionId] || [];

      return {
        ...auction,
        nfts: items.map((itemEdge) => ({
          tokenId: itemEdge.node.token_id,
          contractAddress: itemEdge.node.contract_address,
          metadataName: null,
          metadataDescription: null,
          imagePath: null,
          metadata: null,
          attributes: [],
          name: "",
          symbol: "",
        })),
        bids: auctionBids.map((bidEdge) => bidEdge.node),
        offers: auctionOffers.map((offerEdge) => offerEdge.node),
      };
    });
  }, [data])();

  // Handle errors with retry logic
  useEffect(() => {
    if (error) {
      const errorInfo = parseGraphQLError(error);

      if (errorInfo.isRetryable && retryAttemptRef.current < 3) {
        setIsRetrying(true);
        retryAttemptRef.current += 1;
        setRetryCount(retryAttemptRef.current);

        // Show retry toast
        toast.warning(
          "Connection Issue",
          `Retrying data fetch... (Attempt ${retryAttemptRef.current}/3)`
        );

        // Retry after delay
        const delay = Math.min(2000 * Math.pow(2, retryAttemptRef.current - 1), 30000);
        const timeout = setTimeout(() => {
          apolloRefetch().catch(() => {
            // Error handled by the effect
          });
        }, delay);

        return () => clearTimeout(timeout);
      } else {
        setIsRetrying(false);

        // Show final error toast
        if (retryAttemptRef.current >= 3) {
          toast.error(
            "Data Fetch Failed",
            "Unable to load auction data. Please refresh the page."
          );
        }
      }
    } else {
      // Reset retry count on success
      retryAttemptRef.current = 0;
      setRetryCount(0);
      setIsRetrying(false);
      setLastUpdated(new Date());
    }
  }, [error, apolloRefetch, toast]);

  // Manual refetch with reset
  const refetch = useCallback(async () => {
    retryAttemptRef.current = 0;
    setRetryCount(0);
    setIsRetrying(false);

    try {
      await executeWithRetry(
        async () => {
          const result = await apolloRefetch();
          if (result.error) {
            throw result.error;
          }
        },
        {
          maxRetries: 3,
          delayMs: 1000,
          onRetry: (attempt) => {
            setRetryCount(attempt);
            setIsRetrying(true);
            toast.info("Retrying...", `Attempt ${attempt}/3`);
          },
        }
      );

      setLastUpdated(new Date());
      toast.success("Data Updated", "Auction data refreshed successfully");
    } catch (err) {
      const errorInfo = parseGraphQLError(err);
      toast.error("Refresh Failed", errorInfo.message);
    } finally {
      setIsRetrying(false);
    }
  }, [apolloRefetch, toast]);

  return {
    auctions,
    loading,
    error: error ? parseGraphQLError(error) : null,
    isRetrying,
    retryCount,
    refetch,
    lastUpdated,
  };
}
