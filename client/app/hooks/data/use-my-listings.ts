import { useQuery } from "@apollo/client/react";
import { useMemo } from "react";
import { MY_LISTINGS_QUERY } from "../../lib/queries";
import type { MyListingsResponse, Auction, Offer } from "../../lib/types";
import { byteArrayToString, parseStatus, parseAmount, parseHexOrDecimal, safeParseInt } from "../../lib/utils";
import { normalizeContractAddress } from "../../lib/utils/normalization";
import { DEFAULT_POLL_INTERVAL } from "../../lib/constants";

export interface FormattedOffer {
  buyer: string;
  amount: number;
  status: string;
  createdAt: string;
  expiresAt: string;
}

export interface FormattedListing {
  id: string;
  name: string;
  tokenCount: number;
  startingPrice: number;
  currentBid: number | null;
  highestBidder: string | null;
  status: string;
  endTime: string;
  seller: string;
  auctionId: string;
  feeToken: string;
  offers: FormattedOffer[];
}

interface UseMyListingsOptions {
  seller?: string | null;
}

export function useMyListings({ seller }: UseMyListingsOptions) {
  // Normalize seller address before query
  const normalizedSeller = seller
    ? normalizeContractAddress(seller)
    : undefined;

  const { data, loading, error } = useQuery<MyListingsResponse>(
    MY_LISTINGS_QUERY,
    {
      variables: { seller: normalizedSeller || "" },
      skip: !normalizedSeller,
      pollInterval: DEFAULT_POLL_INTERVAL,
      fetchPolicy: "cache-and-network",
      errorPolicy: "all",
      notifyOnNetworkStatusChange: false,
    },
  );

  // Process offers into a map by auction_id
  const offersByAuction = useMemo(() => {
    const map = new Map<string, FormattedOffer[]>();
    if (!data?.bm020OfferModels?.edges) return map;

    for (const edge of data.bm020OfferModels.edges) {
      const offer = edge.node;
      const statusNum = parseStatus(offer.status);

      // Only include pending offers (status === 1)
      if (statusNum === 1) {
        const auctionId = offer.auction_id;
        const existing = map.get(auctionId) || [];

        // Parse amount with 6 decimals (USDC standard)
        const amount = parseAmount(offer.amount, 6);

        existing.push({
          buyer: offer.buyer ? normalizeContractAddress(offer.buyer) : "",
          amount,
          status: offer.status,
          createdAt: offer.created_at,
          expiresAt: offer.expires_at,
        });
        map.set(auctionId, existing);
      }
    }

    return map;
  }, [data]);

  const listings: FormattedListing[] = useMemo(() => {
    if (!data?.bm020AuctionModels?.edges) return [];

    const auctions: Auction[] = data.bm020AuctionModels.edges.map(
      (edge: { node: Auction }) => edge.node,
    );

    return auctions.map((auction) => {
      const decodedName = byteArrayToString(auction.name);

      // Parse starting_price - handle both decimal and hex strings
      const startingPrice = parseHexOrDecimal(auction.starting_price) || 0;

      // Parse current_bid with 6 decimals (USDC standard)
      const currentBid = auction.current_bid
        ? parseAmount(auction.current_bid, 6)
        : null;

      const tokenCount = safeParseInt(auction.item_count, 0);

      // Normalize addresses from GraphQL response
      const normalizedSeller = auction.seller
        ? normalizeContractAddress(auction.seller)
        : "";
      const normalizedHighestBidder = auction.highest_bidder
        ? normalizeContractAddress(auction.highest_bidder)
        : null;
      const normalizedFeeToken = auction.fee_token
        ? normalizeContractAddress(auction.fee_token)
        : "";

      // Get offers for this auction
      const offers = offersByAuction.get(auction.auction_id) || [];

      return {
        id: `#${auction.auction_id}`,
        name: decodedName || `Auction ${auction.auction_id}`,
        tokenCount,
        startingPrice,
        currentBid,
        highestBidder: normalizedHighestBidder,
        status: auction.status || "pending",
        endTime: auction.end_time,
        seller: normalizedSeller,
        auctionId: auction.auction_id,
        feeToken: normalizedFeeToken,
        offers,
      };
    });
  }, [data, offersByAuction]);

  return {
    listings,
    loading,
    error: error
      ? new Error(error.message || "Failed to fetch listings")
      : null,
  };
}
