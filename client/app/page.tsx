"use client";

import { useMemo, useRef, useCallback } from "react";
import BidAuctionMyListings from "./components/bid-auction-my-listings";
import { Footer, CuratedShelf, ActivityFeed } from "./components/layout";
import { AuctionCard } from "./components/cards";
import BeastUrlHandler from "./components/beast-url-handler";
import { useAccount } from "@starknet-react/core";
import { useMyNFTs, useAuctions, useMyListings } from "./hooks";
import { useSearchParams, useRouter } from "next/navigation";

export default function Home() {
  const { address } = useAccount();
  const router = useRouter();
  const { nfts, loading, error } = useMyNFTs({ address });
  const {
    auctions,
    allAuctions,
    loading: auctionsLoading,
    error: auctionsError,
    currentPage,
    totalPages,
    setCurrentPage,
    getAuctionItems
  } = useAuctions();
  const {
    listings,
    loading: listingsLoading,
    error: listingsError
  } = useMyListings({ seller: address || undefined });
  const searchParams = useSearchParams();
  const token = searchParams.get('auction');
  const bidsRef = useRef<HTMLDivElement>(null);

  // Handle selecting an auction
  const handleSelectAuction = useCallback((auctionId: string) => {
    router.push(`/?auction=${auctionId}`, { scroll: false });
    setTimeout(() => {
      bidsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }, [router]);

  // Calculate platform stats for social proof
  const platformStats = useMemo(() => {
    const activeAuctions = allAuctions?.filter(a => {
      const status = parseInt(a.status);
      return status === 2; // Active status
    }).length || 0;

    const totalVolume = allAuctions?.reduce((sum, auction) => {
      const status = parseInt(auction.status);
      if (status === 4) { // Settled
        const bidStr = auction.current_bid || "0";
        const bid = bidStr.startsWith("0x") || bidStr.startsWith("0X")
          ? parseInt(bidStr, 16)
          : parseFloat(bidStr);
        return sum + (bid / 1e6);
      }
      return sum;
    }, 0) || 0;

    const totalBids = allAuctions?.filter(a => {
      const bidStr = a.current_bid || "0";
      const bid = bidStr.startsWith("0x") || bidStr.startsWith("0X")
        ? parseInt(bidStr, 16)
        : parseFloat(bidStr);
      return bid > 0;
    }).length || 0;

    return { activeAuctions, totalVolume: Math.round(totalVolume), totalBids };
  }, [allAuctions]);

  // Curated auction lists
  const curatedAuctions = useMemo(() => {
    if (!allAuctions) return { endingSoon: [], highestBids: [], rare: [], recent: [] };

    const now = Date.now();
    const activeAuctions = allAuctions.filter(a => parseInt(a.status) === 2);

    // Ending Soon: Active auctions ending within 6 hours, sorted by end time
    const endingSoon = activeAuctions
      .filter(a => {
        if (!a.end_time) return false;
        const endTime = parseInt(a.end_time) * 1000;
        const hoursLeft = (endTime - now) / (1000 * 60 * 60);
        return hoursLeft > 0 && hoursLeft <= 6;
      })
      .sort((a, b) => parseInt(a.end_time || "0") - parseInt(b.end_time || "0"))
      .slice(0, 10);

    // Highest Bids: Active auctions sorted by current bid (descending)
    const highestBids = [...activeAuctions]
      .sort((a, b) => {
        const bidA = a.current_bid?.startsWith("0x")
          ? parseInt(a.current_bid, 16)
          : parseFloat(a.current_bid || "0");
        const bidB = b.current_bid?.startsWith("0x")
          ? parseInt(b.current_bid, 16)
          : parseFloat(b.current_bid || "0");
        return bidB - bidA;
      })
      .filter(a => {
        const bid = a.current_bid?.startsWith("0x")
          ? parseInt(a.current_bid, 16)
          : parseFloat(a.current_bid || "0");
        return bid > 0;
      })
      .slice(0, 10);

    // Recently Listed: Active auctions sorted by auction_id (descending - higher ID = more recent)
    const recent = [...activeAuctions]
      .sort((a, b) => parseInt(b.auction_id || "0") - parseInt(a.auction_id || "0"))
      .slice(0, 10);

    // Rare & Legendary: Would need item data to filter by tier
    // For now, just return empty - will be populated when items are loaded
    const rare: typeof activeAuctions = [];

    return { endingSoon, highestBids, rare, recent };
  }, [allAuctions]);

  return (
    <div
      className="flex min-h-screen flex-col font-body"
      style={{ backgroundColor: "var(--color-bg)" }}
    >
      {/* Handle ?beast=tokenId URL parameter */}
      <BeastUrlHandler />

      {/* Platform Stats Bar */}
      <div
        className="w-full py-3 px-4 md:px-6 flex items-center justify-center gap-6 md:gap-12 text-sm border-b"
        style={{
          backgroundColor: "var(--color-surface)",
          borderColor: "var(--color-border)",
        }}
      >
        <div className="flex items-center gap-2">
          <span style={{ color: "var(--color-text-muted)" }}>Active Auctions</span>
          <span className="font-semibold" style={{ color: "var(--color-gold)" }}>
            {platformStats.activeAuctions}
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <span style={{ color: "var(--color-text-muted)" }}>Total Volume</span>
          <span className="font-semibold" style={{ color: "var(--color-gold)" }}>
            ${platformStats.totalVolume.toLocaleString()}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span style={{ color: "var(--color-text-muted)" }}>Total Bids</span>
          <span className="font-semibold" style={{ color: "var(--color-gold)" }}>
            {platformStats.totalBids}
          </span>
        </div>
      </div>

      {/* Curated Shelves with Activity Feed */}
      <div className="py-6 md:py-8">
        <div className="flex gap-6">
          {/* Main Content - Shelves */}
          <div className="flex-1 min-w-0 space-y-8 md:space-y-10">
            {/* Ending Soon */}
            {curatedAuctions.endingSoon.length > 0 && (
              <CuratedShelf
                title="Ending Soon"
                icon="🔥"
                isLoading={auctionsLoading}
                emptyMessage="No auctions ending soon"
              >
                {curatedAuctions.endingSoon.map((auction) => (
                  <AuctionCard
                    key={auction.auction_id}
                    auction={auction}
                    items={auction.nfts}
                    onClick={() => handleSelectAuction(auction.auction_id)}
                  />
                ))}
              </CuratedShelf>
            )}

            {/* Highest Bids */}
            <CuratedShelf
              title="Highest Bids"
              icon="💰"
              isLoading={auctionsLoading}
              emptyMessage="No active bids"
            >
              {curatedAuctions.highestBids.map((auction) => (
                <AuctionCard
                  key={auction.auction_id}
                  auction={auction}
                  items={auction.nfts}
                  onClick={() => handleSelectAuction(auction.auction_id)}
                />
              ))}
            </CuratedShelf>

            {/* Recently Listed */}
            <CuratedShelf
              title="Recently Listed"
              icon="🆕"
              isLoading={auctionsLoading}
              emptyMessage="No recent listings"
            >
              {curatedAuctions.recent.map((auction) => (
                <AuctionCard
                  key={auction.auction_id}
                  auction={auction}
                  items={auction.nfts}
                  onClick={() => handleSelectAuction(auction.auction_id)}
                />
              ))}
            </CuratedShelf>
          </div>

          {/* Activity Feed Sidebar - Desktop Only */}
          <div className="hidden lg:block w-[280px] flex-shrink-0 pr-6">
            <div className="sticky top-20">
              <ActivityFeed auctions={allAuctions} />
            </div>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div
        className="w-full h-px"
        style={{ backgroundColor: "var(--color-border)" }}
      />

      {/* Main Content Area (Tabs) */}
      <div ref={bidsRef} className="flex-1">
        <BidAuctionMyListings
          nfts={nfts}
          loading={loading}
          error={error}
          auctions={auctions}
          allAuctions={allAuctions}
          auctionsLoading={auctionsLoading}
          auctionsError={auctionsError || null}
          currentPage={currentPage}
          totalPages={totalPages}
          setCurrentPage={setCurrentPage}
          getAuctionItems={getAuctionItems}
          listings={listings}
          listingsLoading={listingsLoading}
          listingsError={listingsError}
          token={token}
        />
      </div>

      <Footer />
    </div>
  );
}
