import Image from "next/image";
import type { FormattedNFT } from "../../lib/types";
import { IMAGE_BASE_URL } from "../../lib/constants";

type MonsterCardProps = {
  nft: FormattedNFT;
  selected: boolean;
  onToggle: () => void;
  onInfoClick?: () => void;
  // Optional auction context
  currentBid?: string;
  bidCount?: number;
  timeRemaining?: string;
  watcherCount?: number;
  isEndingSoon?: boolean;
};

export default function MonsterCard({
  nft,
  selected,
  onToggle,
  onInfoClick,
  currentBid,
  bidCount,
  timeRemaining,
  watcherCount,
  isEndingSoon,
}: MonsterCardProps) {
  const getAttribute = (traitType: string) => {
    const attr = nft.attributes.find((a) => a.trait_type === traitType);
    return attr ? String(attr.value) : undefined;
  };

  const beastName = nft.beastName || "Unknown";
  const tier = nft.tier || getAttribute("Tier") || "—";
  const power = nft.power || getAttribute("Power") || "0";

  const imageSrc = nft.metadata?.image
    ? nft.metadata.image
    : nft.imagePath
      ? `${IMAGE_BASE_URL}/${nft.imagePath}`
      : "/logo.png";

  // Tier badge colors
  const tierColors: Record<string, { bg: string; text: string; border: string }> = {
    "1": { bg: "rgba(251, 191, 36, 0.15)", text: "#FCD34D", border: "rgba(251, 191, 36, 0.4)" }, // Gold - T1
    "2": { bg: "rgba(168, 85, 247, 0.15)", text: "#C084FC", border: "rgba(168, 85, 247, 0.4)" }, // Purple - T2
    "3": { bg: "rgba(59, 130, 246, 0.15)", text: "#60A5FA", border: "rgba(59, 130, 246, 0.4)" }, // Blue - T3
    "4": { bg: "rgba(34, 197, 94, 0.15)", text: "#4ADE80", border: "rgba(34, 197, 94, 0.4)" },   // Green - T4
    "5": { bg: "rgba(156, 163, 175, 0.15)", text: "#9CA3AF", border: "rgba(156, 163, 175, 0.4)" }, // Gray - T5
  };

  const tierStyle = tierColors[tier] || tierColors["5"];

  return (
    <article
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      onClick={onToggle}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onToggle();
        }
      }}
      className={`group relative flex flex-col overflow-hidden rounded-xl transition-all duration-200 cursor-pointer animate-card-lift focus:outline-none ${
        selected
          ? "ring-2 ring-[var(--color-gold)] shadow-[0_0_20px_rgba(212,175,55,0.3)]"
          : ""
      }`}
      style={{
        backgroundColor: 'var(--color-surface)',
        border: `1px solid ${selected ? 'var(--color-gold)' : 'var(--color-border)'}`,
      }}
    >
      {/* Image Container - 4:5 aspect ratio */}
      <div className="relative aspect-[4/5] w-full overflow-hidden">
        <Image
          src={imageSrc}
          alt={nft.metadataName}
          fill
          draggable={false}
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          unoptimized
        />

        {/* Hover Overlay - Shows on hover */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200">
          {/* Top info - Time & Watchers (shown on hover) */}
          <div className="absolute top-0 left-0 right-0 p-3 flex justify-between items-start opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            {timeRemaining && (
              <span
                className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium ${
                  isEndingSoon ? 'animate-urgency-pulse' : ''
                }`}
                style={{
                  backgroundColor: isEndingSoon ? 'rgba(245, 158, 11, 0.9)' : 'rgba(0,0,0,0.7)',
                  color: isEndingSoon ? '#000' : 'var(--color-text)',
                }}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
                {timeRemaining}
              </span>
            )}
            {watcherCount !== undefined && (
              <span
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs"
                style={{ backgroundColor: 'rgba(0,0,0,0.7)', color: 'var(--color-text-muted)' }}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                {watcherCount}
              </span>
            )}
          </div>

          {/* Quick Bid Button (shown on hover) */}
          {currentBid && (
            <div className="absolute bottom-16 left-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onInfoClick?.();
                }}
                className="w-full py-2.5 rounded-lg text-sm font-semibold btn-gold"
              >
                Quick Bid
              </button>
            </div>
          )}
        </div>

        {/* Selection Checkbox */}
        <div className="absolute top-2 right-2 z-20">
          {selected ? (
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'var(--color-gold)' }}
            >
              <svg className="w-4 h-4" style={{ color: 'var(--color-bg)' }} fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                <path d="M5 13l4 4L19 7" />
              </svg>
            </div>
          ) : (
            <div
              className="w-6 h-6 rounded-full border-2 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ borderColor: 'var(--color-champagne)', backgroundColor: 'rgba(0,0,0,0.5)' }}
            />
          )}
        </div>

        {/* Tier Badge (shown on hover or always if T1/T2) */}
        <div className={`absolute top-2 left-2 ${tier === "1" || tier === "2" ? "opacity-100" : "opacity-0 group-hover:opacity-100"} transition-opacity`}>
          <span
            className="px-2 py-1 rounded text-xs font-bold"
            style={{
              backgroundColor: tierStyle.bg,
              color: tierStyle.text,
              border: `1px solid ${tierStyle.border}`,
            }}
          >
            T{tier}
          </span>
        </div>

        {/* Gradient Overlay at Bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-24 card-gradient" />
      </div>

      {/* Card Content */}
      <div className="p-3 md:p-4">
        {/* Title */}
        <h3
          className="font-display text-base md:text-lg leading-tight truncate"
          style={{ color: 'var(--color-text)' }}
        >
          {nft.metadataName}
        </h3>

        {/* Beast Name */}
        <p
          className="text-xs mt-0.5 truncate"
          style={{ color: 'var(--color-text-muted)' }}
        >
          {beastName}
        </p>

        {/* Price & Bids Row */}
        <div className="flex items-center justify-between mt-3">
          {currentBid ? (
            <>
              <span
                className="font-mono text-sm font-semibold"
                style={{ color: 'var(--color-champagne)' }}
              >
                {currentBid}
              </span>
              {bidCount !== undefined && (
                <span
                  className="text-xs"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  {bidCount} bid{bidCount !== 1 ? 's' : ''}
                </span>
              )}
            </>
          ) : (
            <>
              <span
                className="text-xs"
                style={{ color: 'var(--color-text-muted)' }}
              >
                Power: {parseFloat(power).toFixed(0)}
              </span>
              {onInfoClick && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onInfoClick();
                  }}
                  className="text-xs flex items-center gap-1 transition-colors"
                  style={{ color: 'var(--color-gold)' }}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 16v-4" />
                    <path d="M12 8h.01" />
                  </svg>
                  Details
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Ending Soon Border Animation */}
      {isEndingSoon && (
        <div
          className="absolute inset-0 rounded-xl pointer-events-none animate-gold-glow"
          style={{ border: '2px solid var(--color-urgency)' }}
        />
      )}
    </article>
  );
}
