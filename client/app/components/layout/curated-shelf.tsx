"use client";

import { useRef, useState, useCallback } from "react";
import Link from "next/link";

type CuratedShelfProps = {
  title: string;
  icon?: React.ReactNode;
  viewAllHref?: string;
  children: React.ReactNode;
  emptyMessage?: string;
  isLoading?: boolean;
};

export default function CuratedShelf({
  title,
  icon,
  viewAllHref,
  children,
  emptyMessage = "No items to display",
  isLoading = false,
}: CuratedShelfProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const updateScrollButtons = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    setCanScrollLeft(container.scrollLeft > 0);
    setCanScrollRight(
      container.scrollLeft < container.scrollWidth - container.clientWidth - 10
    );
  }, []);

  const scroll = (direction: "left" | "right") => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const scrollAmount = container.clientWidth * 0.8;
    container.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });

    // Update buttons after scroll animation
    setTimeout(updateScrollButtons, 300);
  };

  return (
    <section className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 px-4 md:px-6">
        <div className="flex items-center gap-2">
          {icon && <span className="text-xl">{icon}</span>}
          <h2
            className="font-display text-lg md:text-xl font-semibold"
            style={{ color: "var(--color-text)" }}
          >
            {title}
          </h2>
        </div>
        {viewAllHref && (
          <Link
            href={viewAllHref}
            className="flex items-center gap-1 text-sm transition-colors hover:opacity-80"
            style={{ color: "var(--color-gold)" }}
          >
            View All
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </Link>
        )}
      </div>

      {/* Scrollable Content */}
      <div className="relative group">
        {/* Left Scroll Button */}
        {canScrollLeft && (
          <button
            onClick={() => scroll("left")}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            style={{
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-border)",
            }}
          >
            <svg
              className="w-5 h-5"
              style={{ color: "var(--color-text)" }}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        )}

        {/* Right Scroll Button */}
        {canScrollRight && (
          <button
            onClick={() => scroll("right")}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            style={{
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-border)",
            }}
          >
            <svg
              className="w-5 h-5"
              style={{ color: "var(--color-text)" }}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        )}

        {/* Scroll Container */}
        <div
          ref={scrollContainerRef}
          onScroll={updateScrollButtons}
          className="flex gap-4 overflow-x-auto px-4 md:px-6 pb-4 scrollbar-hide"
          style={{
            scrollSnapType: "x mandatory",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {isLoading ? (
            // Loading skeletons
            Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex-shrink-0 w-[200px] md:w-[240px] animate-pulse"
              >
                <div
                  className="aspect-[4/5] rounded-xl mb-3"
                  style={{ backgroundColor: "var(--color-elevated)" }}
                />
                <div
                  className="h-5 rounded w-3/4 mb-2"
                  style={{ backgroundColor: "var(--color-elevated)" }}
                />
                <div
                  className="h-4 rounded w-1/2"
                  style={{ backgroundColor: "var(--color-elevated)" }}
                />
              </div>
            ))
          ) : (
            children
          )}
        </div>

        {/* Empty State */}
        {!isLoading && !children && (
          <div
            className="text-center py-12 px-4"
            style={{ color: "var(--color-text-muted)" }}
          >
            {emptyMessage}
          </div>
        )}
      </div>
    </section>
  );
}
