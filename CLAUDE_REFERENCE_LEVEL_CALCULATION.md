# Level Calculation Reference

Reference documentation for implementing XP-based level systems, based on Death Mountain's implementation.

## Level Formula

```typescript
export const calculateLevel = (xp: number) => {
  if (xp === 0) return 1;
  return Math.floor(Math.sqrt(xp));
};
```

**Formula:** `Level = floor(√XP)`

### XP to Level Table

| XP Range | Level |
|----------|-------|
| 0 | 1 |
| 1-3 | 1 |
| 4-8 | 2 |
| 9-15 | 3 |
| 16-24 | 4 |
| 25-35 | 5 |
| 36-48 | 6 |
| 49-63 | 7 |
| 64-80 | 8 |
| 81-99 | 9 |
| 100-120 | 10 |
| n² to (n+1)²-1 | n |

## Related Utility Functions

### Calculate XP Required for Next Level

```typescript
export const calculateNextLevelXP = (currentLevel: number, item: boolean = false) => {
  if (item) {
    return Math.min(400, (currentLevel + 1) ** 2);
  }
  return (currentLevel + 1) ** 2;
};
```

### Calculate Progress to Next Level (percentage)

```typescript
export const calculateProgress = (xp: number, item: boolean = false) => {
  const currentLevel = calculateLevel(xp);
  const nextLevelXP = calculateNextLevelXP(currentLevel, item);
  const currentLevelXP = currentLevel ** 2;
  return ((xp - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100;
};
```

## Data Flow Architecture

### Source: On-Chain Storage

XP is stored on-chain in the adventurer/game model within the Dojo world. Game actions (combat, obstacles, etc.) update XP via Cairo contracts.

### Indexing: Torii

Torii indexes model changes, making XP queryable through two APIs:

#### Option 1: SQL Endpoint (via metagame-sdk)

```typescript
import { useGameTokens } from "metagame-sdk/sql";

const { games } = useGameTokens({
  sortBy: "score",
  sortOrder: "desc",
  // ... other params
});

// Access: game.score
const level = calculateLevel(game.score);
```

#### Option 2: GraphQL Endpoint (direct query)

```graphql
{
  GameEventModels {
    edges {
      node {
        adventurer_id
        details {
          adventurer {
            health
            xp
            gold
          }
        }
      }
    }
  }
}
```

```typescript
// Access: adventurer.xp
const level = calculateLevel(game.xp);
```

## Implementation Checklist

1. **On-chain model** - Store XP field in your Cairo model
2. **Update logic** - Increment XP when relevant actions occur
3. **Indexing** - Ensure Torii indexes your model
4. **Frontend query** - Fetch XP via SQL or GraphQL
5. **Level calculation** - Apply `Math.floor(Math.sqrt(xp))`
6. **Display** - Show level in UI components

## Source Files (Death Mountain)

- Level utilities: `death-mountain/client/src/utils/game.ts`
- Leaderboard component: `death-mountain/client/src/desktop/components/Leaderboard.tsx`
- GraphQL fetcher: `death-mountain/client/src/dojo/useGameTokens.ts`
- Metagame SDK setup: `death-mountain/client/src/contexts/metagame.tsx`
