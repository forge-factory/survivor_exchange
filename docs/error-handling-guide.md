# Error Handling & Reliability Guide

**Document:** SUR-19 Implementation Guide  
**Date:** February 2, 2026  
**Status:** Complete

---

## Overview

This document describes the comprehensive error handling system implemented for survivor.exchange. The system provides consistent error handling, retry logic, validation, and user feedback across the application.

---

## Architecture

### Core Components

```
app/
├── lib/
│   └── utils/
│       ├── error-handling.ts          # Core error utilities
│       ├── graphql-error-handler.ts   # GraphQL-specific handling
│       └── validation.ts              # Input validation
├── components/
│   ├── ui/
│   │   ├── LoadingState.tsx           # Loading/error/transaction states
│   │   └── error-boundary.tsx         # React error boundaries
│   ├── error-boundaries/
│   │   └── auction-error-boundary.tsx # Auction-specific boundaries
│   └── bid-input-with-validation.tsx  # Validated input component
└── hooks/
    └── use-auctions-with-retry.ts     # Resilient data fetching
```

---

## Error Handling Utilities

### 1. Error Messages (`error-handling.ts`)

Standardized error messages for consistency:

```typescript
import { ErrorMessages } from "@/app/lib/utils";

// Usage
throw new Error(ErrorMessages.INSUFFICIENT_FUNDS);
```

**Available Messages:**
- `GRAPHQL_CONNECTION_ERROR` - Network issues
- `INSUFFICIENT_FUNDS` - Balance too low
- `TRANSACTION_REJECTED` - User rejected
- `TRANSACTION_TIMEOUT` - Taking too long
- `AUCTION_EXPIRED` - No longer active
- `BID_TOO_LOW` - Below minimum
- `INVALID_BID_AMOUNT` - Bad input
- `WALLET_NOT_CONNECTED` - No wallet
- `NETWORK_ERROR` - Connection issues
- `UNKNOWN_ERROR` - Fallback

### 2. useErrorHandler Hook

Centralized error handling with toast notifications:

```typescript
import { useErrorHandler } from "@/app/lib/utils";

function MyComponent() {
  const { handleError, handleSuccess } = useErrorHandler();

  const doSomething = async () => {
    try {
      await riskyOperation();
      handleSuccess("Success!", "Operation completed");
    } catch (err) {
      handleError(err, {
        component: "MyComponent",
        action: "do_something",
        auctionId: "123",
      });
    }
  };
}
```

### 3. Retry Logic

Automatic retry with exponential backoff:

```typescript
import { withRetry } from "@/app/lib/utils";

const result = await withRetry(
  async () => {
    return await fetchData();
  },
  {
    maxRetries: 3,
    delayMs: 1000,
    backoffMultiplier: 2,
    onRetry: (attempt, error) => {
      console.log(`Retry ${attempt}: ${error}`);
    },
  }
);
```

### 4. Bid Validation

Real-time bid amount validation:

```typescript
import { validateBidAmount } from "@/app/lib/utils";

const result = validateBidAmount("100.50", 50.00);
// result: { valid: true } or { valid: false, error: "..." }
```

---

## GraphQL Error Handling

### Automatic Retry for GraphQL

```typescript
import { executeWithRetry, parseGraphQLError } from "@/app/lib/utils";

try {
  const data = await executeWithRetry(
    async () => await apolloClient.query({ query: MY_QUERY }),
    (attempt, errorInfo) => {
      console.log(`Retry ${attempt}: ${errorInfo.message}`);
    }
  );
} catch (err) {
  const errorInfo = parseGraphQLError(err);
  // errorInfo: { message, code, isNetworkError, isRetryable }
}
```

### useAuctionsWithRetry Hook

Enhanced data fetching with automatic retry:

```typescript
import { useAuctionsWithRetry } from "@/app/hooks";

function AuctionList() {
  const {
    auctions,
    loading,
    error,
    isRetrying,
    retryCount,
    refetch,
    lastUpdated,
  } = useAuctionsWithRetry();

  if (isRetrying) {
    return <div>Retrying... (Attempt {retryCount})</div>;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  return <AuctionGrid auctions={auctions} />;
}
```

---

## Validation System

### Input Validation

```typescript
import {
  validateAddress,
  validateTokenAmount,
  validateAuctionName,
  validateNFTSelection,
} from "@/app/lib/utils";

// Address validation
const addressResult = validateAddress("0x1234...");

// Token amount
const amountResult = validateTokenAmount("100.50", 0.01, 1000000, 6);

// Auction name
const nameResult = validateAuctionName("My Auction");

// NFT selection
const nftResult = validateNFTSelection(["nft1", "nft2"], 1, 163);
```

### Form Validation Hook

```typescript
import { useFormValidation } from "@/app/lib/utils";

function CreateAuctionForm() {
  const values = {
    name: "My Auction",
    startingPrice: "100",
    duration: "60",
  };

  const validators = {
    name: validateAuctionName,
    startingPrice: (v) => validateTokenAmount(v, 0.01),
    duration: (v) => validateAuctionDuration(parseInt(v)),
  };

  const { validateField, validateAll } = useFormValidation(values, validators);

  const handleSubmit = () => {
    const { valid, errors } = validateAll();
    if (!valid) {
      console.log("Validation errors:", errors);
      return;
    }
    // Submit form
  };
}
```

---

## UI Components

### LoadingState

```tsx
import { LoadingState } from "@/app/components/ui";

// Basic loading
<LoadingState message="Loading auctions..." />

// Size variants
<LoadingState size="sm" message="Saving..." />
<LoadingState size="lg" message="Loading marketplace..." fullScreen />
```

### ErrorState

```tsx
import { ErrorState } from "@/app/components/ui";

<ErrorState
  title="Failed to Load"
  message="Unable to fetch auction data"
  onRetry={() => refetch()}
  retryCount={2}
  maxRetries={3}
/>
```

### TransactionState

```tsx
import { TransactionState } from "@/app/components/ui";

// Pending
<TransactionState
  status="pending"
  message="Submitting bid..."
  subMessage="Please confirm in your wallet"
/>

// Success
<TransactionState
  status="success"
  message="Bid placed successfully!"
  txHash="0x1234..."
/>

// Error
<TransactionState
  status="error"
  message="Transaction failed"
  subMessage="Insufficient funds"
/>
```

### BidInputWithValidation

```tsx
import { BidInputWithValidation, BidValidationSummary } from "@/app/components";

<BidInputWithValidation
  value={bidAmount}
  onChange={setBidAmount}
  minBid={50.00}
  maxBid={10000.00}
  disabled={isSubmitting}
  label="Your Bid (USDC)"
  showMinBidHint={true}
/>

<BidValidationSummary
  bidAmount={bidAmount}
  minBid={50.00}
  userBalance={userUSDCBalance}
  tokenSymbol="USDC"
/>
```

---

## Error Boundaries

### AuctionErrorBoundary

Wrap auction sections for graceful degradation:

```tsx
import { AuctionErrorBoundary } from "@/app/components/error-boundaries";

<AuctionErrorBoundary>
  <AuctionList />
</AuctionErrorBoundary>
```

### AuctionCardErrorBoundary

Per-card error handling:

```tsx
import { AuctionCardErrorBoundary } from "@/app/components/error-boundaries";

{collections.map((collection) => (
  <AuctionCardErrorBoundary key={collection.id}>
    <AuctionCard collection={collection} />
  </AuctionCardErrorBoundary>
))}
```

### BidActionErrorBoundary

Protect bid action components:

```tsx
import { BidActionErrorBoundary } from "@/app/components/error-boundaries";

<BidActionErrorBoundary>
  <BidActions
    onPlaceBid={handlePlaceBid}
    onMakeOffer={handleMakeOffer}
  />
</BidActionErrorBoundary>
```

---

## Best Practices

### 1. Always Use Standardized Errors

❌ **Don't:**
```typescript
toast.error("Something went wrong");
```

✅ **Do:**
```typescript
import { ErrorMessages, useErrorHandler } from "@/app/lib/utils";

const { handleError } = useErrorHandler();
handleError(new Error(ErrorMessages.NETWORK_ERROR));
```

### 2. Provide Context

❌ **Don't:**
```typescript
try {
  await placeBid();
} catch (err) {
  handleError(err);
}
```

✅ **Do:**
```typescript
try {
  await placeBid();
} catch (err) {
  handleError(err, {
    component: "BidActions",
    action: "place_bid",
    auctionId: selectedAuctionId,
    additionalData: { bidAmount, paymentToken },
  });
}
```

### 3. Use Retry for Network Operations

❌ **Don't:**
```typescript
const data = await fetchAuctions();
```

✅ **Do:**
```typescript
const data = await withRetry(
  async () => await fetchAuctions(),
  { maxRetries: 3, delayMs: 1000 }
);
```

### 4. Validate Early

❌ **Don't:**
```typescript
const handleBid = async () => {
  await placeBid(bidAmount); // May fail on contract
};
```

✅ **Do:**
```typescript
const handleBid = async () => {
  const validation = validateBidAmount(bidAmount, minBid);
  if (!validation.valid) {
    toast.error(validation.error);
    return;
  }
  await placeBid(bidAmount);
};
```

### 5. Show Transaction States

❌ **Don't:**
```typescript
const handleBid = async () => {
  setIsSubmitting(true);
  await placeBid();
  setIsSubmitting(false);
};
```

✅ **Do:**
```typescript
const handleBid = async () => {
  setTransactionStatus({
    type: "bid",
    status: "pending",
    message: "Submitting bid...",
  });
  
  try {
    const result = await placeBid();
    setTransactionStatus({
      type: "bid",
      status: "success",
      message: "Bid placed!",
      hash: result.txHash,
    });
  } catch (err) {
    setTransactionStatus({
      type: "bid",
      status: "error",
      message: handleError(err).error,
    });
  }
};
```

---

## Migration Guide

### Migrating Existing Components

1. **Replace console.error:**
   ```typescript
   // Before
   console.error("Error:", err);
   
   // After
   const { handleError } = useErrorHandler();
   handleError(err, { component: "MyComponent", action: "myAction" });
   ```

2. **Add Error Boundaries:**
   ```tsx
   // Before
   <AuctionList />
   
   // After
   <AuctionErrorBoundary>
     <AuctionList />
   </AuctionErrorBoundary>
   ```

3. **Add Validation:**
   ```typescript
   // Before
   const handleSubmit = () => {
     submitForm(values);
   };
   
   // After
   const handleSubmit = () => {
     const { valid, errors } = validateAll();
     if (!valid) {
       showErrors(errors);
       return;
     }
     submitForm(values);
   };
   ```

4. **Add Loading States:**
   ```tsx
   // Before
   {loading && <div>Loading...</div>}
   
   // After
   {loading && <LoadingState message="Loading auctions..." />}
   ```

---

## Testing

### Error Handling Tests

```typescript
import { validateBidAmount, parseErrorMessage } from "@/app/lib/utils";

describe("Validation", () => {
  it("validates bid amounts correctly", () => {
    expect(validateBidAmount("100", 50)).toEqual({ valid: true });
    expect(validateBidAmount("25", 50)).toEqual({
      valid: false,
      error: "Bid must be at least 50.00",
    });
  });
});

describe("Error Parsing", () => {
  it("parses insufficient funds errors", () => {
    const error = new Error("insufficient balance");
    expect(parseErrorMessage(error)).toBe(ErrorMessages.INSUFFICIENT_FUNDS);
  });
});
```

### Component Tests

```typescript
import { render, screen, fireEvent } from "@testing-library/react";
import { BidInputWithValidation } from "@/app/components";

describe("BidInputWithValidation", () => {
  it("shows validation error for low bid", () => {
    render(
      <BidInputWithValidation
        value="10"
        onChange={() => {}}
        minBid={50}
      />
    );
    
    fireEvent.blur(screen.getByRole("textbox"));
    expect(screen.getByText(/minimum bid/i)).toBeInTheDocument();
  });
});
```

---

## Performance Considerations

### 1. Debounce Validation

For real-time validation, debounce to avoid excessive checks:

```typescript
import { useCallback } from "react";
import { debounce } from "lodash";

const debouncedValidate = useCallback(
  debounce((value) => {
    const result = validateBidAmount(value, minBid);
    setError(result.valid ? null : result.error);
  }, 300),
  [minBid]
);
```

### 2. Memoize Error Messages

```typescript
import { useMemo } from "react";

const errorMessage = useMemo(() => {
  return parseErrorMessage(error);
}, [error]);
```

### 3. Lazy Load Error Boundaries

```typescript
import { lazy, Suspense } from "react";

const AuctionErrorBoundary = lazy(
  () => import("@/app/components/error-boundaries")
);

<Suspense fallback={<LoadingState />}>
  <AuctionErrorBoundary>
    <AuctionList />
  </AuctionErrorBoundary>
</Suspense>
```

---

## Troubleshooting

### Common Issues

**1. Error not showing in toast**
- Check that `useErrorHandler` is called inside `ToastProvider`
- Verify error is not null/undefined before calling `handleError`

**2. Retry not working**
- Ensure error is retryable (network errors are, GraphQL errors usually aren't)
- Check `maxRetries` and `delayMs` parameters

**3. Validation not triggering**
- For `BidInputWithValidation`, ensure `onChange` updates state
- Check that `minBid` prop is provided

**4. Error boundary not catching**
- Error boundaries only catch errors in render phase, not in event handlers
- Use `try-catch` in async functions

---

## Future Enhancements

### Planned Improvements

1. **Error Tracking Integration**
   - Sentry integration for production error tracking
   - User feedback collection on errors

2. **Advanced Retry Strategies**
   - Circuit breaker pattern for failing services
   - Intelligent retry based on error type

3. **Validation Rules Engine**
   - JSON-based validation rules
   - Custom validation functions

4. **Analytics**
   - Error rate monitoring
   - Validation failure analytics
   - User retry behavior tracking

---

## References

- **Error Handling:** `app/lib/utils/error-handling.ts`
- **GraphQL Handler:** `app/lib/utils/graphql-error-handler.ts`
- **Validation:** `app/lib/utils/validation.ts`
- **UI Components:** `app/components/ui/LoadingState.tsx`
- **Error Boundaries:** `app/components/error-boundaries/`
- **Retry Hook:** `app/hooks/use-auctions-with-retry.ts`

---

*Last Updated: February 2, 2026*  
*Maintained by: Forge ⚡*
