# Premium Auction House Redesign

**Date**: 2026-01-26
**Status**: Approved
**Goal**: Transform Survivor Exchange from cyberpunk gaming aesthetic to premium auction house, optimized for marketing and sales conversion.

## Design Decisions Summary

| Decision | Choice |
|----------|--------|
| Visual Identity | Premium dark (navy/charcoal, gold accents) |
| Typography | Playfair Display (headlines) + Inter (body) |
| Card Design | Hybrid elegant (image + overlay, hover reveals) |
| Landing | Curated horizontal shelves |
| CTAs | Gold primary, ghost secondary |
| Navigation | Search-dominant header |
| Detail View | Split-screen panel (desktop) |
| Mobile Detail | Full-screen + sticky bid bar |
| Trust Signals | Activity feed + card indicators + provenance |
| Empty States | Filter coaching suggestions |

---

## 1. Visual Foundation

### Color System

| Role | Hex | CSS Variable |
|------|-----|--------------|
| Background | `#0A0E14` | `--color-bg` |
| Surface | `#14181F` | `--color-surface` |
| Elevated | `#1C2128` | `--color-elevated` |
| Border | `#2D333B` | `--color-border` |
| Primary CTA | `#D4AF37` | `--color-gold` |
| Secondary | `#E8DCC4` | `--color-champagne` |
| Text Primary | `#F5F5F5` | `--color-text` |
| Text Secondary | `#9CA3AF` | `--color-text-muted` |
| Success | `#10B981` | `--color-success` |
| Urgency | `#F59E0B` | `--color-urgency` |

### Typography

- **Headlines**: Playfair Display (Google Fonts)
- **Body**: Inter (Google Fonts)
- **Monospace**: JetBrains Mono (token IDs, addresses, timers)

### Spacing

- Card padding: 16-24px
- Border radius: 8-12px
- Border opacity: 10-15%
- Subtle shadows over heavy borders

---

## 2. Layout & Navigation

### Header (Search-Dominant)

```
┌─────────────────────────────────────────────────────────────────┐
│  [Logo]     [━━━━━━━━ Search beasts, auctions... ━━━━━━━━]  [Wallet] │
└─────────────────────────────────────────────────────────────────┘
```

- Height: 64px, fixed
- Background: `--color-surface` with subtle bottom border
- Search: ~50% width, gold border on focus

### Homepage Shelves

1. **Ending Soon** — Auctions < 1 hour (urgency)
2. **Highest Bids** — Most active (social proof)
3. **Rare & Legendary** — T1/T2, shiny, animated (aspiration)
4. **Recently Listed** — Fresh inventory (discovery)
5. **Your Watchlist** — Personalized (if logged in)

### Activity Feed (Desktop Sidebar)

- Right sidebar, ~250px width
- Real-time bid/sale updates
- Creates urgency and social proof

---

## 3. Card Design (Hybrid Elegant)

### Default State

- Image: 4:5 aspect ratio
- Gradient overlay at bottom
- Title (Playfair), price + bid count (Inter)

### Hover State

- Countdown + watcher count fade in
- Quick bid button appears (gold)
- Tier badge shows
- Subtle lift (`translateY(-4px)`)
- Gold glow border

### Trust Indicators

- Bid count: `3 bids`
- Watchers: `👁 12`
- Verified: `✓`
- Tier: Color-coded badge
- Ending soon: Gold border pulse

---

## 4. Split-Screen Detail Panel (Desktop)

- 60% grid / 40% detail panel
- Panel slides in from right
- Clicking cards swaps content without close/reopen

### Panel Sections

1. Header: Name, token ID, close button
2. Large image (expandable)
3. Price block: ETH + USD, countdown
4. Bid interface: Input, quick-bid buttons, Place Bid CTA
5. Tabs: Details, Bid History, Provenance

---

## 5. Mobile Experience

### Header

- Compact: Logo, search icon (expands), wallet avatar
- Height: 56px

### Detail View

- Full-screen with back button
- Scrollable content above sticky bar

### Sticky Bid Bar

- Fixed bottom (safe area aware)
- Input (40%) + Place Bid CTA (50%)
- Elevated surface with shadow

### Gestures

- Swipe left/right between auctions
- Pull to refresh
- Long press for quick actions

---

## 6. Trust Signals

### Activity Feed

- Live updates: "Beast #4521 sold for 0.5 ETH · 2m ago"
- Desktop: right sidebar
- Mobile: accessible via bell icon

### Card Indicators

- Bid count, watcher count, verified badge, tier badge

### Provenance (Detail View)

- Ownership chain: Minted → Sales → Current owner

---

## 7. Empty States (Filter Coaching)

Never show dead-end "No results." Instead:

```
No auctions match your filters.

Try adjusting:
[Remove T1 filter] [Expand price range] [Show all tiers]
```

Actionable chips that modify filters directly.

---

## Implementation Priority

1. **Phase 1**: Color system, typography, globals.css
2. **Phase 2**: Header redesign (search-dominant)
3. **Phase 3**: Card component redesign
4. **Phase 4**: Curated shelves homepage
5. **Phase 5**: Split-screen detail panel
6. **Phase 6**: Mobile optimizations + sticky bar
7. **Phase 7**: Activity feed + trust indicators
8. **Phase 8**: Empty state coaching

---

## Research Sources

- [OpenSea](https://opensea.io) - visual patterns
- [Expedite Studio - NFT Marketplace UX](https://expeditestudio.com/write-ups/ux-best-practices-for-nft-marketplace-design/)
- [Gapsy Studio - NFT UI/UX Design](https://gapsystudio.com/blog/nft-marketplace-ui-ux-design/)
