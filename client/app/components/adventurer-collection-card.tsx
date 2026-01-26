"use client";

import { useMemo, useState, useEffect } from "react";
import Image from "next/image";
import type { FormattedNFT } from "../lib/types";
import { formatUSDSmart, truncateAuctionName } from "../lib/utils";
import CountdownTimer from "./countdown-timer";
import BidPriceChart from "./bid-price-chart";

type AdventurerCollectionCardProps = {
    collection: {
        id: string;
        name: string;
        fullName?: string;
        totalMonsters: number;
        startingPrice: number;
        highestBid?: number;
        image: string;
        endTime?: string;
        status?: string;
    };
    isSelected: boolean;
    onSelect: () => void;
    onQuickBid?: () => void;
    nfts?: FormattedNFT[];
};

// Cache for adventurer images
const adventurerImageCache = new Map<string, string>();

// Helper to calculate time remaining
const getSecondsRemaining = (endTime?: string): number | null => {
    if (!endTime) return null;
    try {
        const endTimeNum = endTime.startsWith("0x") || endTime.startsWith("0X")
            ? parseInt(endTime, 16)
            : parseInt(endTime, 10);
        if (isNaN(endTimeNum) || endTimeNum === 0) return null;
        const now = Math.floor(Date.now() / 1000);
        return endTimeNum - now;
    } catch {
        return null;
    }
};

export default function AdventurerCollectionCard({
    collection,
    isSelected,
    onSelect,
    onQuickBid,
    nfts = []
}: AdventurerCollectionCardProps) {
    const [adventurerImage, setAdventurerImage] = useState<string | null>(null);
    const [imageLoading, setImageLoading] = useState(true);

    // Get first NFT for image fetching
    const firstNft = nfts[0];

    // Fetch adventurer image from contract
    useEffect(() => {
        if (!firstNft) {
            setImageLoading(false);
            return;
        }

        // Check cache
        const cached = adventurerImageCache.get(firstNft.tokenId);
        if (cached) {
            setAdventurerImage(cached);
            setImageLoading(false);
            return;
        }

        // Parse token ID
        const tokenIdNum = firstNft.tokenId.startsWith("0x")
            ? parseInt(firstNft.tokenId, 16)
            : parseInt(firstNft.tokenId, 10);

        setImageLoading(true);
        fetch(`/api/adventurer-image/${tokenIdNum}`)
            .then(res => res.ok ? res.json() : null)
            .then(data => {
                if (data?.metadata?.image) {
                    adventurerImageCache.set(firstNft.tokenId, data.metadata.image);
                    setAdventurerImage(data.metadata.image);
                }
            })
            .catch(() => {})
            .finally(() => setImageLoading(false));
    }, [firstNft]);

    // Calculate urgency level
    const urgencyInfo = useMemo(() => {
        const secondsRemaining = getSecondsRemaining(collection.endTime);
        const hasBids = collection.highestBid && collection.highestBid > 0;
        const isActive = collection.status && parseInt(collection.status) === 2;

        if (!isActive || secondsRemaining === null || secondsRemaining <= 0) {
            return { level: 'none', badge: null };
        }

        if (secondsRemaining <= 3600) {
            return {
                level: 'critical',
                badge: { text: 'Ending Soon!', color: 'bg-red-500', animate: true }
            };
        }
        if (secondsRemaining <= 14400) {
            return {
                level: 'high',
                badge: { text: 'Ending Soon', color: 'bg-orange-500', animate: false }
            };
        }
        if (hasBids) {
            return {
                level: 'active',
                badge: { text: 'Hot', color: 'bg-[rgb(50,255,52)]', animate: false, icon: '🔥' }
            };
        }
        return { level: 'normal', badge: null };
    }, [collection.endTime, collection.highestBid, collection.status]);

    const hasBids = collection.highestBid && collection.highestBid > 0;

    // Get XP and Level from first NFT attributes
    const getAttribute = (traitType: string) => {
        if (!firstNft?.attributes) return undefined;
        const attr = firstNft.attributes.find((a) => a.trait_type === traitType);
        return attr ? String(attr.value) : undefined;
    };

    const xp = getAttribute("XP") || getAttribute("Score") || "0";
    const level = getAttribute("Level") || Math.floor(Math.sqrt(parseInt(xp))).toString();
    const gameOver = getAttribute("Game Over") === "True";

    const stats = [
        {
            label: "Reserved Price",
            value: formatUSDSmart(collection.startingPrice / 1e6),
            suffix: undefined,
        },
        {
            label: "Highest Bid",
            value: hasBids
                ? formatUSDSmart(collection.highestBid!)
                : "Be first!",
            suffix: !hasBids ? "Set the price" : undefined,
            highlight: !hasBids,
        },
    ];

    return (
        <article
            role="button"
            tabIndex={0}
            onClick={onSelect}
            onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelect();
                }
            }}
            className={`group relative flex h-full w-full flex-col gap-6 overflow-hidden rounded-3xl border border-[rgb(50,255,52)]/20 bg-black/60 p-7 transition duration-200 hover:-translate-y-1 hover:border-[rgb(50,255,52)]/60 hover:shadow-[0_18px_45px_rgba(10,30,10,0.45)] hover:cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(50,255,52)]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black ${
                isSelected ? "border-[rgb(50,255,52)]/80 shadow-[0_22px_55px_rgba(20,255,80,0.35)]" : ""
            }`}
        >
            {isSelected && (
                <div className="absolute top-4 right-5 z-20" title="Currently viewing this auction">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="32"
                        height="32"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-[rgb(50,255,52)] transition-all duration-200 group-hover:scale-110"
                    >
                        <path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z" />
                        <path d="m9 12 2 2 4-4" />
                    </svg>
                </div>
            )}

            {/* Urgency Badge */}
            {urgencyInfo.badge && (
                <div className={`absolute top-4 left-4 z-20 px-2.5 py-1 rounded-full text-[10px] font-orbitron uppercase tracking-wider font-bold text-black ${urgencyInfo.badge.color} ${urgencyInfo.badge.animate ? 'animate-urgency-pulse' : ''}`}>
                    <span className="flex items-center gap-1">
                        {urgencyInfo.badge.icon && <span className="animate-fire">{urgencyInfo.badge.icon}</span>}
                        {urgencyInfo.badge.text}
                    </span>
                </div>
            )}

            {/* Dead Badge */}
            {gameOver && (
                <div className="absolute top-4 left-4 z-20 px-2.5 py-1 rounded-full text-[10px] font-orbitron uppercase tracking-wider font-bold bg-red-500/20 text-red-400 border border-red-500/40">
                    Dead
                </div>
            )}

            <header className="flex flex-col gap-1 text-[11px] font-orbitron uppercase tracking-[0.16em] text-[rgb(186,255,188)]/75">
                <span className="text-[10px] tracking-[0.2em] text-[rgb(186,255,188)]/60">
                    {collection.totalMonsters} adventurer{collection.totalMonsters === 1 ? '' : 's'} in this collection
                </span>
            </header>

            <div className="flex flex-col items-center gap-4 text-center">
                {/* Image */}
                <div className="h-24 w-24 rounded-2xl border border-[rgb(50,255,52)]/40 bg-[rgb(50,255,52)]/5 overflow-hidden flex items-center justify-center">
                    {imageLoading ? (
                        <div className="animate-pulse w-16 h-16 rounded-full bg-[rgb(50,255,52)]/10" />
                    ) : adventurerImage ? (
                        <img
                            src={adventurerImage}
                            alt={collection.name}
                            draggable={false}
                            className="h-full w-full object-contain"
                        />
                    ) : (
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            className="w-12 h-12 text-[rgb(50,255,52)]/40"
                        >
                            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <path d="m22 8-4 4" />
                            <path d="m18 8 4 4" />
                        </svg>
                    )}
                </div>

                <div className="flex flex-col gap-2 text-white">
                    <h3
                        className="text-xl font-orbitron uppercase tracking-[0.12em]"
                        title={collection.fullName || collection.name}
                    >
                        {truncateAuctionName(collection.name)}
                    </h3>

                    {/* Level & XP Stats */}
                    {firstNft && (
                        <div className="flex items-center justify-center gap-4 text-sm">
                            <div className="flex items-center gap-1">
                                <span className="text-white font-orbitron font-bold">{level}</span>
                                <span className="text-[rgb(186,255,188)]/50 text-[10px] uppercase">LVL</span>
                            </div>
                            <div className="w-px h-4 bg-[rgb(50,255,52)]/20" />
                            <div className="flex items-center gap-1">
                                <span className="text-[rgb(50,255,52)] font-orbitron font-bold">{parseInt(xp).toLocaleString()}</span>
                                <span className="text-[rgb(186,255,188)]/50 text-[10px] uppercase">XP</span>
                            </div>
                        </div>
                    )}

                    {collection.endTime && (
                        <p className="text-xs text-[rgb(186,255,188)]/70">
                            {collection.status && parseInt(collection.status) === 3 ? (
                                <CountdownTimer endTime={collection.endTime} status={collection.status} className="font-orbitron" showUrgency={false} />
                            ) : (
                                <>Ends in: <CountdownTimer endTime={collection.endTime} status={collection.status} className="font-orbitron" showUrgency={true} /></>
                            )}
                        </p>
                    )}
                </div>
            </div>

            <div className="flex flex-col gap-3 text-white">
                {stats.map((stat) => (
                    <div
                        key={stat.label}
                        className={`flex flex-col gap-1 rounded-2xl border px-5 py-3 text-left ${
                            stat.highlight
                                ? 'border-orange-500/40 bg-orange-500/10'
                                : 'border-white/12 bg-white/5'
                        }`}
                    >
                        <p className="text-[rgb(186,255,188)]/70 text-[10px] font-orbitron uppercase tracking-[0.18em]">
                            {stat.label}
                        </p>
                        <p className={`text-2xl font-orbitron tracking-tight ${
                            stat.highlight ? 'text-orange-400' : 'text-white'
                        }`}>{stat.value}</p>
                        {stat.suffix ? (
                            <span className={`text-xs font-orbitron uppercase tracking-[0.18em] ${
                                stat.highlight ? 'text-orange-400/80' : 'text-[rgb(186,255,188)]/80'
                            }`}>
                                {stat.suffix}
                            </span>
                        ) : null}
                    </div>
                ))}
                <div className="flex flex-col gap-2 rounded-2xl border border-[rgb(50,255,52)]/20 bg-[rgb(50,255,52)]/5 px-4 py-3">
                    <p className="text-[rgb(186,255,188)]/70 text-[10px] font-orbitron uppercase tracking-[0.18em]">
                        Live Price Chart
                    </p>
                    <BidPriceChart
                        width={200}
                        height={60}
                        startingPrice={collection.startingPrice / 1e6}
                        currentBid={collection.highestBid}
                    />
                </div>

                {/* Quick Bid Button */}
                {onQuickBid && collection.status && parseInt(collection.status) === 2 && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onQuickBid();
                        }}
                        className={`w-full mt-2 py-3 px-4 rounded-xl font-orbitron font-bold text-sm uppercase tracking-wider transition-all active:scale-[0.98] ${
                            urgencyInfo.level === 'critical'
                                ? 'bg-orange-500 text-black hover:bg-orange-400 hover:shadow-[0_0_20px_rgba(249,115,22,0.5)] animate-subtle-pulse'
                                : 'bg-[rgb(50,255,52)] text-black hover:bg-[rgb(40,220,42)] hover:shadow-[0_0_20px_rgba(50,255,52,0.4)]'
                        }`}
                    >
                        <span className="flex items-center justify-center gap-2">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                            </svg>
                            {hasBids ? 'Place Bid' : 'Be First to Bid'}
                        </span>
                    </button>
                )}
            </div>
        </article>
    );
}
