/**
 * Bundle Statistics Utilities
 * Computes aggregate stats for multi-NFT auction bundles
 * Supports both Beast and Adventurer NFT collections
 */

import type { FormattedNFT } from "../types/nft";
import { extractBeastStats } from "./tagline-generator";
import {
  BEASTS_NFT_CONTRACT_ADDRESS,
  ADVENTURER_NFT_CONTRACT_ADDRESS,
} from "../constants";
import { normalizeContractAddress } from "./normalization";

export interface BundleStats {
  // Size
  totalCount: number;
  beastCount: number;
  adventurerCount: number;

  // Tier breakdown (1 = Legendary, 5 = Common) - Beasts only
  tierCounts: Record<1 | 2 | 3 | 4 | 5, number>;
  hasT1: boolean;

  // Peak stats - Beasts
  maxPower: number;
  maxLevel: number;
  totalPower: number;

  // Peak stats - Adventurers
  maxXP: number;
  totalXP: number;

  // Type distribution - Beasts only
  typeCounts: {
    Brute: number;
    Hunter: number;
    Magical: number;
  };

  // Rarity flags - Beasts only
  hasShiny: boolean;
  hasAnimated: boolean;
  hasGenesis: boolean;
  shinyCount: number;
  animatedCount: number;
  genesisCount: number;
}

/**
 * Check if an NFT is from the Adventurer collection
 */
function isAdventurerNFT(nft: FormattedNFT): boolean {
  if (!nft.contractAddress) return false;
  const normalized = normalizeContractAddress(nft.contractAddress).toLowerCase();
  const adventurerContract = normalizeContractAddress(ADVENTURER_NFT_CONTRACT_ADDRESS).toLowerCase();
  return normalized === adventurerContract;
}

/**
 * Check if an NFT is from the Beast collection
 */
function isBeastNFT(nft: FormattedNFT): boolean {
  if (!nft.contractAddress) return false;
  const normalized = normalizeContractAddress(nft.contractAddress).toLowerCase();
  const beastContract = normalizeContractAddress(BEASTS_NFT_CONTRACT_ADDRESS).toLowerCase();
  return normalized === beastContract;
}

/**
 * Extract XP from an Adventurer NFT
 */
function extractAdventurerXP(nft: FormattedNFT): number {
  const getAttribute = (traitType: string): string | undefined => {
    const attr = nft.attributes.find(
      (a) => a.trait_type.toLowerCase() === traitType.toLowerCase()
    );
    return attr ? String(attr.value) : undefined;
  };

  const xp = getAttribute("XP") || getAttribute("Score") || "0";
  return parseInt(xp, 10) || 0;
}

/**
 * Compute aggregate statistics for a bundle of NFTs
 * Supports both Beast and Adventurer collections
 */
export function computeBundleStats(nfts: FormattedNFT[]): BundleStats {
  const stats: BundleStats = {
    totalCount: nfts.length,
    beastCount: 0,
    adventurerCount: 0,
    tierCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    hasT1: false,
    maxPower: 0,
    maxLevel: 0,
    totalPower: 0,
    maxXP: 0,
    totalXP: 0,
    typeCounts: { Brute: 0, Hunter: 0, Magical: 0 },
    hasShiny: false,
    hasAnimated: false,
    hasGenesis: false,
    shinyCount: 0,
    animatedCount: 0,
    genesisCount: 0,
  };

  for (const nft of nfts) {
    // Check if this is an Adventurer NFT
    if (isAdventurerNFT(nft)) {
      stats.adventurerCount++;
      const xp = extractAdventurerXP(nft);
      if (xp > stats.maxXP) {
        stats.maxXP = xp;
      }
      stats.totalXP += xp;
      continue;
    }

    // Otherwise treat as Beast NFT
    if (isBeastNFT(nft)) {
      stats.beastCount++;
    }

    const beastStats = extractBeastStats(nft);

    // Tier counts
    const tier = beastStats.tier as 1 | 2 | 3 | 4 | 5;
    if (tier >= 1 && tier <= 5) {
      stats.tierCounts[tier]++;
      if (tier === 1) {
        stats.hasT1 = true;
      }
    }

    // Peak stats
    if (beastStats.power > stats.maxPower) {
      stats.maxPower = beastStats.power;
    }
    if (beastStats.level > stats.maxLevel) {
      stats.maxLevel = beastStats.level;
    }
    stats.totalPower += beastStats.power;

    // Type distribution
    if (beastStats.beastType in stats.typeCounts) {
      stats.typeCounts[beastStats.beastType]++;
    }

    // Rarity flags
    if (beastStats.isShiny) {
      stats.hasShiny = true;
      stats.shinyCount++;
    }
    if (beastStats.isAnimated) {
      stats.hasAnimated = true;
      stats.animatedCount++;
    }
    if (beastStats.isGenesis) {
      stats.hasGenesis = true;
      stats.genesisCount++;
    }
  }

  return stats;
}

/**
 * Calculate value score for "Best Value" sorting
 * Higher score = better value (more power/XP per dollar)
 * Combines Beast power and Adventurer XP (XP normalized to power scale)
 */
export function computeValueScore(
  stats: BundleStats,
  reservePrice: number
): number {
  if (reservePrice <= 0) return 0;
  // Combine Beast power with Adventurer XP (XP / 10 to normalize to power scale)
  const combinedValue = stats.totalPower + stats.totalXP / 10;
  return combinedValue / reservePrice;
}

/**
 * Check if bundle has any rare traits (shiny, animated, or genesis)
 */
export function hasRareTraits(stats: BundleStats): boolean {
  return stats.hasShiny || stats.hasAnimated || stats.hasGenesis;
}
