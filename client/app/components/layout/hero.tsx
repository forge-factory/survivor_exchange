"use client";

import { useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import type { AuctionWithNFTs } from "../../hooks";
import { computeBundleStats } from "../../lib/utils/bundle-stats";
import { matchesPreset } from "../../lib/filter-utils";
import { IMAGE_BASE_URL, ADVENTURER_NFT_CONTRACT_ADDRESS } from "../../lib/constants";
import { normalizeContractAddress } from "../../lib/utils/normalization";
import { formatUSDSmart } from "../../lib/utils";
import { CountdownTimer } from "../ui";

interface HeroProps {
    activeAuctions?: number;
    totalVolume?: number;
    totalBids?: number;
    allAuctions?: AuctionWithNFTs[];
    onSelectAuction?: (auctionId: string) => void;
}

// Helper to get adventurer image URL
const getAdventurerImageUrl = (tokenId: string): string => {
    const tokenIdNum = tokenId.startsWith("0x")
        ? parseInt(tokenId, 16)
        : parseInt(tokenId, 10);
    const paddedTokenId = "0x" + tokenIdNum.toString(16).padStart(64, '0');
    return `https://api.cartridge.gg/x/arcade-main/torii/static/${ADVENTURER_NFT_CONTRACT_ADDRESS}/${paddedTokenId}/image`;
};

// Check if NFT is from Adventurer collection
const isAdventurerNFT = (contractAddress: string): boolean => {
    const normalized = normalizeContractAddress(contractAddress).toLowerCase();
    const adventurerContract = normalizeContractAddress(ADVENTURER_NFT_CONTRACT_ADDRESS).toLowerCase();
    return normalized === adventurerContract;
};

export default function Hero({
    activeAuctions = 0,
    totalVolume = 0,
    totalBids = 0,
    allAuctions = [],
    onSelectAuction
}: HeroProps) {
    // Find the best "hot deal" auction
    const featuredAuction = useMemo(() => {
        if (!allAuctions || allAuctions.length === 0) return null;

        // Filter to hot deals only
        const hotDeals = allAuctions.filter(auction =>
            matchesPreset(auction, "hot-deals")
        );

        if (hotDeals.length === 0) return null;

        // Sort by highest value (power for beasts, XP for adventurers)
        const sorted = [...hotDeals].sort((a, b) => {
            const statsA = computeBundleStats(a.nfts);
            const statsB = computeBundleStats(b.nfts);

            // Compare by max power or max XP
            const valueA = Math.max(statsA.maxPower, statsA.maxXP / 10);
            const valueB = Math.max(statsB.maxPower, statsB.maxXP / 10);

            return valueB - valueA;
        });

        return sorted[0];
    }, [allAuctions]);

    // Get featured auction details
    const featuredDetails = useMemo(() => {
        if (!featuredAuction) return null;

        const stats = computeBundleStats(featuredAuction.nfts);
        const firstNft = featuredAuction.nfts[0];

        // Determine image source
        let imageSrc = "/logo.png";
        let isAdventurer = false;

        if (firstNft) {
            isAdventurer = isAdventurerNFT(firstNft.contractAddress);
            if (isAdventurer) {
                imageSrc = getAdventurerImageUrl(firstNft.tokenId);
            } else if (firstNft.metadata?.image) {
                imageSrc = firstNft.metadata.image;
            } else if (firstNft.imagePath) {
                imageSrc = `${IMAGE_BASE_URL}/${firstNft.imagePath}`;
            }
        }

        // Get display name
        const name = featuredAuction.name || (firstNft?.metadataName) || "Hot Deal";

        // Parse starting price
        const priceStr = featuredAuction.starting_price || "0";
        const price = priceStr.startsWith("0x") || priceStr.startsWith("0X")
            ? parseInt(priceStr, 16) / 1e6
            : parseFloat(priceStr) / 1e6;

        return {
            id: featuredAuction.auction_id,
            name,
            imageSrc,
            isAdventurer,
            isBase64: imageSrc.startsWith("data:"),
            price,
            stats,
            endTime: featuredAuction.end_time,
            status: featuredAuction.status,
            nftCount: featuredAuction.nfts.length || parseInt(featuredAuction.item_count) || 1
        };
    }, [featuredAuction]);

    return (
        <div className="w-full min-h-fit flex flex-col items-center justify-center px-4 py-6 md:py-8">
            <div className="flex flex-col items-center justify-center gap-4 md:gap-6 w-full h-full">

                {/* Featured Hot Deal */}
                {featuredDetails ? (
                    <div className="w-full max-w-lg">
                        {/* Hot Deal Badge */}
                        <div className="flex justify-center mb-3">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-orbitron uppercase tracking-wider font-bold bg-orange-500/20 border border-orange-500/50 text-orange-400">
                                <span className="text-base">🔥</span>
                                Hot Deal
                            </span>
                        </div>

                        {/* Featured Card */}
                        <div
                            onClick={() => onSelectAuction?.(featuredDetails.id)}
                            className="group relative flex flex-col sm:flex-row items-center gap-4 sm:gap-6 p-4 sm:p-6 rounded-2xl border border-[rgb(50,255,52)]/30 bg-black/60 hover:border-[rgb(50,255,52)]/60 hover:bg-black/70 transition-all cursor-pointer"
                        >
                            {/* Image */}
                            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-xl overflow-hidden flex-shrink-0 bg-[rgb(50,255,52)]/5">
                                {featuredDetails.isBase64 ? (
                                    <img
                                        src={featuredDetails.imageSrc}
                                        alt={featuredDetails.name}
                                        draggable={false}
                                        className="w-full h-full object-contain"
                                    />
                                ) : featuredDetails.imageSrc === "/logo.png" ? (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <Image
                                            src="/logo.png"
                                            alt={featuredDetails.name}
                                            width={80}
                                            height={80}
                                            draggable={false}
                                            className="w-16 h-16 object-contain opacity-50"
                                        />
                                    </div>
                                ) : (
                                    <img
                                        src={featuredDetails.imageSrc}
                                        alt={featuredDetails.name}
                                        draggable={false}
                                        className="w-full h-full object-contain"
                                    />
                                )}
                            </div>

                            {/* Details */}
                            <div className="flex flex-col items-center sm:items-start gap-2 text-center sm:text-left flex-1">
                                {/* Name */}
                                <h2 className="text-lg sm:text-xl font-orbitron font-bold text-white uppercase tracking-wide">
                                    {featuredDetails.name}
                                </h2>

                                {/* Stats badges */}
                                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5">
                                    <span className="px-2 py-0.5 rounded text-[10px] font-orbitron border border-white/20 bg-white/5 text-white/80">
                                        {featuredDetails.nftCount} {featuredDetails.isAdventurer ? 'Adventurer' : 'Beast'}{featuredDetails.nftCount > 1 ? 's' : ''}
                                    </span>
                                    {featuredDetails.stats.hasT1 && (
                                        <span className="px-2 py-0.5 rounded text-[10px] font-orbitron border border-amber-500/40 bg-amber-500/20 text-amber-400">
                                            T1 Included
                                        </span>
                                    )}
                                    {featuredDetails.stats.maxPower > 0 && (
                                        <span className="px-2 py-0.5 rounded text-[10px] font-orbitron border border-[rgb(50,255,52)]/30 bg-[rgb(50,255,52)]/10 text-[rgb(50,255,52)]">
                                            ⚡ {featuredDetails.stats.maxPower} Power
                                        </span>
                                    )}
                                    {featuredDetails.stats.maxXP > 0 && (
                                        <span className="px-2 py-0.5 rounded text-[10px] font-orbitron border border-cyan-500/30 bg-cyan-500/10 text-cyan-400">
                                            ✦ {featuredDetails.stats.maxXP.toLocaleString()} XP
                                        </span>
                                    )}
                                </div>

                                {/* Price & Countdown */}
                                <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 mt-1">
                                    <div className="text-[rgb(186,255,188)]/70 text-sm">
                                        Reserve: <span className="text-white font-bold">{formatUSDSmart(featuredDetails.price)}</span>
                                    </div>
                                    {featuredDetails.endTime && (
                                        <div className="text-[rgb(186,255,188)]/70 text-sm">
                                            Ends: <CountdownTimer
                                                endTime={featuredDetails.endTime}
                                                status={featuredDetails.status}
                                                className="font-orbitron text-white"
                                                showUrgency={true}
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* CTA */}
                                <div className="mt-2">
                                    <span className="text-orange-400 text-sm font-orbitron uppercase tracking-wider">
                                        No bids yet — Set the price!
                                    </span>
                                </div>
                            </div>

                            {/* Arrow indicator */}
                            <div className="hidden sm:flex items-center justify-center w-8 h-8 rounded-full bg-[rgb(50,255,52)]/10 text-[rgb(50,255,52)] group-hover:bg-[rgb(50,255,52)]/20 transition-all">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="m9 18 6-6-6-6"/>
                                </svg>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* Fallback: Show logo when no hot deals */
                    <>
                        <div className="w-fit h-full flex items-center justify-center rounded-2xl p-2">
                            <Image src="/logo.png" alt="logo" width={500} height={500} draggable={false} className="w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40" />
                        </div>
                        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center">Survivor Exchange</h1>
                        <p className="text-base sm:text-lg md:text-xl text-center px-4 font-medium">Find your next champion.</p>
                    </>
                )}

                <p className="text-sm sm:text-base md:text-lg text-center px-4">Buy, sell, and auction{" "}
                    <span className="font-bold text-[rgb(50,255,52)]">
                        <Link href="https://lootsurvivor.io/" target="_blank" className="hover:cursor-pointer hover:underline hover:text-[rgb(50,255,52)]">Loot Survivor</Link>
                    </span>{" "}beasts.
                </p>

                {/* Platform Stats - Social Proof */}
                {(activeAuctions > 0 || totalVolume > 0) && (
                    <div className="flex flex-wrap items-center justify-center gap-4 md:gap-8 mt-2 px-4">
                        {activeAuctions > 0 && (
                            <div className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl border border-[rgb(50,255,52)]/20 bg-[rgb(50,255,52)]/5">
                                <span className="text-xl md:text-2xl font-bold text-[rgb(50,255,52)] font-orbitron">{activeAuctions}</span>
                                <span className="text-[10px] md:text-xs uppercase tracking-widest text-[rgb(186,255,188)]/70 font-orbitron">Active Auctions</span>
                            </div>
                        )}
                        {totalVolume > 0 && (
                            <div className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl border border-[rgb(50,255,52)]/20 bg-[rgb(50,255,52)]/5">
                                <span className="text-xl md:text-2xl font-bold text-[rgb(50,255,52)] font-orbitron">${totalVolume.toLocaleString()}</span>
                                <span className="text-[10px] md:text-xs uppercase tracking-widest text-[rgb(186,255,188)]/70 font-orbitron">Total Volume</span>
                            </div>
                        )}
                        {totalBids > 0 && (
                            <div className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl border border-[rgb(50,255,52)]/20 bg-[rgb(50,255,52)]/5">
                                <span className="text-xl md:text-2xl font-bold text-[rgb(50,255,52)] font-orbitron">{totalBids}</span>
                                <span className="text-[10px] md:text-xs uppercase tracking-widest text-[rgb(186,255,188)]/70 font-orbitron">Total Bids</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Trust Badge */}
                <div className="flex items-center gap-2 mt-1 text-xs text-[rgb(186,255,188)]/60">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Secured by Starknet Smart Contracts</span>
                </div>
            </div>
        </div>
    )
}
