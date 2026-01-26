"use client";

import { useMemo } from "react";
import type { FilterState } from "./filters";

interface FilterCoachingProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  totalCount?: number;
  filteredCount?: number;
}

interface Suggestion {
  label: string;
  action: () => void;
  type: "remove" | "expand" | "reset";
}

export default function FilterCoaching({
  filters,
  onFiltersChange,
  totalCount = 0,
  filteredCount = 0,
}: FilterCoachingProps) {
  // Generate smart suggestions based on active filters
  const suggestions = useMemo<Suggestion[]>(() => {
    const items: Suggestion[] = [];

    // Check for tier filter
    if (filters.tier) {
      items.push({
        label: `Remove T${filters.tier} filter`,
        action: () => onFiltersChange({ ...filters, tier: "" }),
        type: "remove",
      });
    }

    // Check for beast filter
    if (filters.beast) {
      items.push({
        label: `Remove ${filters.beast} filter`,
        action: () => onFiltersChange({ ...filters, beast: "" }),
        type: "remove",
      });
    }

    // Check for type filter
    if (filters.type) {
      items.push({
        label: `Remove ${filters.type} type`,
        action: () => onFiltersChange({ ...filters, type: "" }),
        type: "remove",
      });
    }

    // Check for price range
    if (filters.powerMin || filters.powerMax) {
      items.push({
        label: "Expand power range",
        action: () => onFiltersChange({ ...filters, powerMin: "", powerMax: "" }),
        type: "expand",
      });
    }

    // Check for level range
    if (filters.levelMin || filters.levelMax) {
      items.push({
        label: "Expand level range",
        action: () => onFiltersChange({ ...filters, levelMin: "", levelMax: "" }),
        type: "expand",
      });
    }

    // Check for rank range
    if (filters.rankMin || filters.rankMax) {
      items.push({
        label: "Expand rank range",
        action: () => onFiltersChange({ ...filters, rankMin: "", rankMax: "" }),
        type: "expand",
      });
    }

    // Check for shiny/animated filters
    if (filters.shiny === "true") {
      items.push({
        label: "Include non-shiny",
        action: () => onFiltersChange({ ...filters, shiny: "" }),
        type: "expand",
      });
    }

    if (filters.animated === "true") {
      items.push({
        label: "Include non-animated",
        action: () => onFiltersChange({ ...filters, animated: "" }),
        type: "expand",
      });
    }

    // Check for preset filters
    if (filters.preset) {
      const presetLabels: Record<string, string> = {
        "hot-deals": "Hot Deals",
        "has-t1": "Has T1",
        "shiny-animated": "Rare/Shiny",
        "ending-soon": "Ending Soon",
      };
      items.push({
        label: `Remove ${presetLabels[filters.preset] || filters.preset} preset`,
        action: () => onFiltersChange({ ...filters, preset: "" }),
        type: "remove",
      });
    }

    // Check for search query
    if (filters.search) {
      items.push({
        label: "Clear search",
        action: () => onFiltersChange({ ...filters, search: "" }),
        type: "remove",
      });
    }

    // Always offer to show all
    const hasAnyFilter = Object.entries(filters).some(([key, value]) => {
      if (key === "timeSort") return false; // Don't count default sort
      return value !== "";
    });

    if (hasAnyFilter && items.length < 4) {
      items.push({
        label: "Show all auctions",
        action: () =>
          onFiltersChange({
            id: "",
            search: "",
            beast: "",
            type: "",
            tier: "",
            levelMin: "",
            levelMax: "",
            powerMin: "",
            powerMax: "",
            rankMin: "",
            rankMax: "",
            shiny: "",
            animated: "",
            priceSort: "",
            tokenIdSort: "",
            summitTop15: "",
            timeSort: "ending-soon",
            preset: "",
            bundleSort: "",
          }),
        type: "reset",
      });
    }

    // Limit to 4 suggestions
    return items.slice(0, 4);
  }, [filters, onFiltersChange]);

  // Don't show if there are results or no suggestions
  if (filteredCount > 0 || suggestions.length === 0) {
    return null;
  }

  return (
    <div
      className="w-full max-w-2xl mx-auto py-12 px-6 text-center"
    >
      {/* Icon */}
      <div
        className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
        style={{
          backgroundColor: "var(--color-elevated)",
          border: "1px solid var(--color-border)",
        }}
      >
        <svg
          className="w-8 h-8"
          style={{ color: "var(--color-text-muted)" }}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          viewBox="0 0 24 24"
        >
          <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      {/* Message */}
      <h3
        className="font-display text-lg mb-2"
        style={{ color: "var(--color-text)" }}
      >
        No auctions match your filters
      </h3>
      <p
        className="text-sm mb-6"
        style={{ color: "var(--color-text-muted)" }}
      >
        Try adjusting your filters to see more results
        {totalCount > 0 && (
          <span style={{ color: "var(--color-text-dim)" }}>
            {" "}({totalCount} total available)
          </span>
        )}
      </p>

      {/* Suggestion Chips */}
      <div className="flex flex-wrap justify-center gap-2">
        {suggestions.map((suggestion, index) => (
          <button
            key={index}
            onClick={suggestion.action}
            className="px-4 py-2 rounded-full text-sm font-medium transition-all"
            style={{
              backgroundColor:
                suggestion.type === "reset"
                  ? "var(--color-gold)"
                  : "var(--color-elevated)",
              color:
                suggestion.type === "reset"
                  ? "var(--color-bg)"
                  : "var(--color-champagne)",
              border: `1px solid ${
                suggestion.type === "reset"
                  ? "var(--color-gold)"
                  : "var(--color-border)"
              }`,
            }}
            onMouseEnter={(e) => {
              if (suggestion.type !== "reset") {
                e.currentTarget.style.borderColor = "var(--color-gold)";
                e.currentTarget.style.color = "var(--color-gold)";
              }
            }}
            onMouseLeave={(e) => {
              if (suggestion.type !== "reset") {
                e.currentTarget.style.borderColor = "var(--color-border)";
                e.currentTarget.style.color = "var(--color-champagne)";
              }
            }}
          >
            {suggestion.type === "remove" && (
              <span className="mr-1.5">×</span>
            )}
            {suggestion.type === "expand" && (
              <span className="mr-1.5">↔</span>
            )}
            {suggestion.label}
          </button>
        ))}
      </div>
    </div>
  );
}
