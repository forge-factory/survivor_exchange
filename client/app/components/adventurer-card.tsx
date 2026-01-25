import Image from "next/image";
import type { FormattedNFT } from "../lib/types";

type AdventurerCardProps = {
  nft: FormattedNFT;
  selected: boolean;
  onToggle: () => void;
  onInfoClick?: () => void;
};

export default function AdventurerCard({
  nft,
  selected,
  onToggle,
  onInfoClick,
}: AdventurerCardProps) {
  const getAttribute = (traitType: string) => {
    const attr = nft.attributes.find((a) => a.trait_type === traitType);
    return attr ? String(attr.value) : undefined;
  };

  const playerName = getAttribute("Player Name") || nft.metadataName || "Unknown";
  const level = getAttribute("Level") || "1";
  const xp = getAttribute("XP") || getAttribute("Score") || "0";
  const health = getAttribute("Health") || "0";
  const gold = getAttribute("Gold") || "0";
  const gameName = getAttribute("Game Name") || "Death Mountain";
  const gameOver = getAttribute("Game Over") === "True";

  // TODO: Resolve actual image from metadata later
  // For now, use a placeholder or the metadata image if available
  const imageSrc = nft.metadata?.image || "/adventurer-placeholder.svg";

  const tokenIdDisplay = `#${parseInt(nft.tokenId, 16).toString()}`;

  const stats = [
    { label: "Level", value: level },
    { label: "XP", value: xp },
    { label: "HP", value: health },
    { label: "Gold", value: gold },
  ];

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
      className={`group relative flex h-full w-full flex-col gap-2 md:gap-4 overflow-hidden rounded-xl md:rounded-2xl border bg-black/70 backdrop-blur-sm p-3 md:p-4 transition-all duration-200 hover:-translate-y-0.5 hover:cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(50,255,52)]/70 ${
        selected
          ? "border-[rgb(50,255,52)] shadow-[0_0_20px_rgba(50,255,52,0.3)]"
          : "border-[rgb(50,255,52)]/15 hover:border-[rgb(50,255,52)]/40 hover:bg-black/80"
      }`}
    >
      {/* Selected state: always visible checkmark */}
      {selected && (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="absolute top-2 right-2 md:top-3 md:right-3 z-20 w-5 h-5 md:w-7 md:h-7 text-[rgb(50,255,52)]"
        >
          <path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      )}
      {/* Unselected state: faded empty checkbox on hover */}
      {!selected && (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="absolute top-2 right-2 md:top-3 md:right-3 z-20 w-5 h-5 md:w-7 md:h-7 text-white/30 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <rect x="3" y="3" width="18" height="18" rx="4" />
        </svg>
      )}

      <header className="flex items-center justify-between text-[9px] md:text-[10px] uppercase tracking-wider text-[rgb(186,255,188)]/60">
        <div className="flex items-center gap-2">
          <span>{tokenIdDisplay}</span>
          {/* Game Over badge - inline with token ID */}
          {gameOver && (
            <span className="rounded-full bg-red-500/20 border border-red-500/50 px-1.5 py-0.5 text-[7px] md:text-[8px] font-orbitron uppercase text-red-400">
              Dead
            </span>
          )}
        </div>
        <span className="truncate max-w-[50%] text-right">
          {gameName}
        </span>
      </header>

      <div className="flex flex-row md:flex-col items-center gap-3 text-white">
        <div className="relative flex h-20 w-20 md:h-28 md:w-28 flex-shrink-0 items-center justify-center bg-[rgb(50,255,52)]/5 rounded-lg">
          {nft.metadata?.image ? (
            <Image
              src={imageSrc}
              alt={playerName}
              width={112}
              height={112}
              draggable={false}
              className="h-full w-full object-contain"
              unoptimized
            />
          ) : (
            // Placeholder adventurer icon
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-12 h-12 md:w-16 md:h-16 text-[rgb(50,255,52)]/40"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="m22 8-4 4" />
              <path d="m18 8 4 4" />
            </svg>
          )}
          {onInfoClick && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onInfoClick();
              }}
              className="absolute bottom-0 right-0 z-20 w-5 h-5 md:w-6 md:h-6 rounded-full bg-black/70 border border-white/30 flex items-center justify-center text-white/80 hover:text-white hover:bg-black/90 hover:border-white/50 transition-all"
              title="View details"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-3 h-3 md:w-3.5 md:h-3.5"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4" />
                <path d="M12 8h.01" />
              </svg>
            </button>
          )}
        </div>
        <div className="flex flex-col gap-0.5 md:gap-1 text-left md:text-center flex-1 min-w-0">
          <h3 className="text-sm md:text-base font-orbitron uppercase tracking-wide leading-tight">
            {playerName}
          </h3>
          <p className="text-[10px] md:text-[11px] text-[rgb(186,255,188)]/50">Adventurer</p>
        </div>
      </div>

      <div className="grid grid-cols-4 md:grid-cols-2 gap-1 md:gap-2 text-white mt-auto">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="flex flex-col md:flex-row items-center md:justify-between rounded-md md:rounded-lg bg-white/5 px-1.5 md:px-3 py-1.5 md:py-2"
          >
            <span className="text-[rgb(186,255,188)]/50 text-[7px] md:text-[10px] uppercase">
              {stat.label}
            </span>
            <span className="text-[11px] md:text-sm font-medium text-white">
              {stat.value}
            </span>
          </div>
        ))}
      </div>
    </article>
  );
}
