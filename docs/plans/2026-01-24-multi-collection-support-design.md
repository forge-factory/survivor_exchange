# Multi-Collection NFT Support Design

**Date**: 2026-01-24
**Status**: Approved
**Branch**: `feature/adventurer-nft-support`

## Goal

Enable the Survivor Exchange auction platform to support multiple NFT collections (BEAST + Adventurer) through a permissioned whitelist system.

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Whitelisting approach | Permissioned (admin-only) | Prevents malicious/fake NFT contracts |
| Validation point | At `add_items()` | Fail fast, single validation point |
| Gas optimization | Pragmatic (high-impact only) | Balance between performance and complexity |
| Error naming | Rename to generic | `NOT_BEAST_OWNER` → `NOT_NFT_OWNER` |
| Initial collections | Auto-whitelist at deploy | BEAST + Adventurer ready immediately |
| Mixed collections | Allowed | One auction can contain multiple collection types |

## Contract Addresses

```cairo
BEAST_ADDRESS:      0x046da8955829adf2bda310099a0063451923f02e648cf25a1203aac6335cf0e4
ADVENTURER_ADDRESS: 0x036017e69d21d6d8c13e266eabb73ef1f1d02722d86bdcabe5f168f8e549d3cd
```

## Files to Modify

| File | Changes |
|------|---------|
| `constants.cairo` | Rename `NOT_BEAST_OWNER` → `NOT_NFT_OWNER`, add `COLLECTION_NOT_SUPPORTED` |
| `utils.cairo` | Add `ADVENTURER_ADDRESS_MAINNET()` |
| `store.cairo` | Add `supported_collection()`, `set_supported_collection()` |
| `systems/admin.cairo` | Implement whitelist functions, auto-whitelist in `dojo_init` |
| `components/auctionable.cairo` | Add whitelist check in `add_items()`, rename error usage |

## Implementation Details

### 1. Constants (`constants.cairo`)

```cairo
pub const NOT_NFT_OWNER: felt252 = 'Not NFT owner';
pub const COLLECTION_NOT_SUPPORTED: felt252 = 'Collection not supported';
```

### 2. Utils (`utils.cairo`)

```cairo
pub fn ADVENTURER_ADDRESS_MAINNET() -> felt252 {
    0x036017e69d21d6d8c13e266eabb73ef1f1d02722d86bdcabe5f168f8e549d3cd
}
```

### 3. Store (`store.cairo`)

```cairo
fn supported_collection(self: @Store, address: felt252) -> SupportedNFTCollection
fn set_supported_collection(ref self: Store, collection: @SupportedNFTCollection)
```

### 4. Admin System (`systems/admin.cairo`)

- `dojo_init`: Auto-whitelist BEAST + Adventurer
- `add_supported_collection`: Admin-only, adds collection to whitelist
- `remove_supported_collection`: Admin-only, removes from whitelist

### 5. Auctionable (`components/auctionable.cairo`)

Add in `add_items()` after seller check:

```cairo
let supported = store.supported_collection(collection.into());
assert(supported.standard != 0 || supported.collection_address != 0,
       Errors::COLLECTION_NOT_SUPPORTED);
```

## Expected Behavior

### For Sellers

- List BEAST NFTs: Works
- List Adventurer NFTs: Works
- List unknown NFTs: Rejected with `COLLECTION_NOT_SUPPORTED`
- Mixed collection auctions: Allowed

### For Admins

- Whitelist new collection: `add_supported_collection(address, standard)`
- Remove collection: `remove_supported_collection(address)`

## Follow-up Tasks

1. **Fix test infrastructure** - Study Summit's mock/testing patterns and fix existing tests
2. **Frontend support** - Add Adventurer NFT metadata fetching and display (separate design)

## Testing Strategy (Post-Implementation)

```cairo
#[test]
fn test_add_items_whitelisted_collection()

#[test]
#[should_panic(expected: 'Collection not supported')]
fn test_add_items_unlisted_collection()

#[test]
fn test_mixed_collection_auction()

#[test]
fn test_admin_whitelist_functions()

#[test]
#[should_panic(expected: 'Unauthorized')]
fn test_non_admin_cannot_whitelist()
```
