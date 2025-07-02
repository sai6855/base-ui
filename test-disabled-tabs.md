# Tabs Component - Disabled Tab Selection Bug Fix

## Bug Description

**Current behavior:** When tabs and tabpanels are not given a value, and `Tabs.Root` is not provided with a `value` or `defaultValue`, the component automatically picks the first tab as the selected tab. If the first tab is disabled, it still gets automatically selected.

**Expected behavior:**
- When no explicit selection is made by the consumer (via `value` or `defaultValue` props), disabled tabs should not be picked as the initially selected tab
- The first non-disabled tab should be picked instead
- A disabled tab should still be selected if:
  - The consumer explicitly sets it as selected (via `defaultValue` or `value` props)
  - The tab was selected while enabled, and later disabled

## Fix Implementation

The fix was implemented in `/workspace/packages/react/src/tabs/root/TabsRoot.tsx` with the following changes:

1. **Track user intent**: Added logic to track whether `defaultValue` or `value` was explicitly provided by the user
2. **Dynamic default calculation**: When no explicit value is provided, the component now dynamically finds the first non-disabled tab
3. **Respect explicit values**: When users explicitly set a disabled tab as selected, that choice is respected

## Key Changes

### 1. Track explicit props
```typescript
// Track whether defaultValue was explicitly provided
const wasDefaultValueProvided = React.useRef(defaultValue !== undefined);
const wasValueProvided = React.useRef(valueProp !== undefined);
```

### 2. Find first non-disabled tab
```typescript
// Function to find the first non-disabled tab
const findFirstNonDisabledTab = React.useCallback(() => {
  if (tabMap.size === 0) return 0;

  const tabEntries = Array.from(tabMap.values())
    .filter((metadata): metadata is CompositeMetadata<TabsTab.Metadata> => metadata !== null)
    .sort((a, b) => (a.index ?? 0) - (b.index ?? 0));

  for (const metadata of tabEntries) {
    if (!metadata.disabled) {
      return metadata.value ?? metadata.index ?? 0;
    }
  }

  // If all tabs are disabled, return the first one
  return tabEntries[0]?.value ?? tabEntries[0]?.index ?? 0;
}, [tabMap]);
```

### 3. Dynamic initial selection
```typescript
// Effect to handle initial tab selection when no explicit value/defaultValue was provided
React.useEffect(() => {
  if (
    !hasPerformedInitialCheck.current &&
    !wasDefaultValueProvided.current &&
    !wasValueProvided.current &&
    tabMap.size > 0 &&
    valueProp === undefined
  ) {
    hasPerformedInitialCheck.current = true;

    const firstNonDisabledTab = findFirstNonDisabledTab();

    // Only update if the current value points to a disabled tab
    if (value !== firstNonDisabledTab) {
      const currentTabMetadata = Array.from(tabMap.values()).find(
        (metadata) => metadata && (metadata.value ?? metadata.index) === value
      );

      if (currentTabMetadata?.disabled) {
        setValue(firstNonDisabledTab);
      }
    }
  }
}, [tabMap, value, setValue, valueProp, findFirstNonDisabledTab]);
```

## Test Cases Added

Added comprehensive test cases to verify the fix:

1. **Default behavior**: When no value/defaultValue is provided and first tab is disabled, second tab is selected
2. **Multiple disabled tabs**: When first two tabs are disabled, third tab is selected
3. **Explicit disabled selection**: When defaultValue explicitly selects a disabled tab, it remains selected
4. **Controlled disabled selection**: When value prop explicitly selects a disabled tab, it remains selected
5. **All tabs disabled**: When all tabs are disabled, first tab is still selected as fallback

## Backward Compatibility

This fix maintains full backward compatibility:
- Existing code that explicitly sets `value` or `defaultValue` continues to work exactly as before
- Only affects the automatic selection behavior when no explicit selection is made
- Disabled tabs can still be selected when explicitly requested by the developer

The fix solves the accessibility issue where disabled tabs were automatically selected while preserving developer control over tab selection.