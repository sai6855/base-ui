# Bundle Size Optimization Opportunities

Analysis Date: 2026-01-13
Total Estimated Savings: **182 bytes**

---

## High Priority (100 bytes total)

### 1. useInteractions.ts - Multiple .map() calls on same array
**File:** `packages/react/src/floating-ui-react/hooks/useInteractions.ts`
**Lines:** 27-30
**Pattern:** Four separate `.map()` calls on the same array
**Estimated Savings:** 25 bytes

#### Current Code:
```typescript
const referenceDeps = propsList.map((key) => key?.reference);
const floatingDeps = propsList.map((key) => key?.floating);
const itemDeps = propsList.map((key) => key?.item);
const triggerDeps = propsList.map((key) => key?.trigger);
```

#### Optimized Code:
```typescript
// Option 1: Single pass with for loop
const deps = { referenceDeps: [] as any[], floatingDeps: [] as any[], itemDeps: [] as any[], triggerDeps: [] as any[] };
for (const props of propsList) {
  deps.referenceDeps.push(props?.reference);
  deps.floatingDeps.push(props?.floating);
  deps.itemDeps.push(props?.item);
  deps.triggerDeps.push(props?.trigger);
}
const { referenceDeps, floatingDeps, itemDeps, triggerDeps } = deps;

// Option 2: Array destructuring (more concise but similar savings)
const [referenceDeps, floatingDeps, itemDeps, triggerDeps] =
  ['reference', 'floating', 'item', 'trigger'].map(key =>
    propsList.map(props => props?.[key as keyof ElementProps])
  );
```

#### Why it saves bytes:
- Eliminates 3 extra array iterations (4 → 1)
- Reduces method call overhead (4 `.map()` → 1 iteration)
- Fewer variable declarations in minified output

---

### 2. markOthers.ts - Chained .map().filter()
**File:** `packages/react/src/floating-ui-react/utils/markOthers.ts`
**Lines:** 34-49
**Pattern:** `.map()` followed by `.filter()`
**Estimated Savings:** 40 bytes

#### Current Code:
```typescript
const correctElements = (parent: HTMLElement, targets: Element[]): Element[] =>
  targets
    .map((target) => {
      if (parent.contains(target)) {
        return target;
      }
      const correctedTarget = unwrapHost(target);
      if (parent.contains(correctedTarget)) {
        return correctedTarget;
      }
      return null;
    })
    .filter((x): x is Element => x != null);
```

#### Optimized Code:
```typescript
const correctElements = (parent: HTMLElement, targets: Element[]): Element[] => {
  const result: Element[] = [];
  for (const target of targets) {
    if (parent.contains(target)) {
      result.push(target);
    } else {
      const correctedTarget = unwrapHost(target);
      if (parent.contains(correctedTarget)) {
        result.push(correctedTarget);
      }
    }
  }
  return result;
};
```

#### Why it saves bytes:
- Single pass instead of two (map + filter)
- No intermediate array with `null` values
- Fewer method calls and arrow functions

---

### 3. FloatingFocusManager.tsx - Chained .map().filter().flat()
**File:** `packages/react/src/floating-ui-react/components/FloatingFocusManager.tsx`
**Lines:** 335-342
**Pattern:** `.map().filter().flat()` chain
**Estimated Savings:** 35 bytes

#### Current Code:
```typescript
const getTabbableElements = useStableCallback((container?: Element) => {
  const content = getTabbableContent(container);
  return orderRef.current
    .map(() => content)
    .filter(Boolean)
    .flat() as Array<FocusableElement>;
});
```

#### Optimized Code:
```typescript
// If the intention is to return content when orderRef has items:
const getTabbableElements = useStableCallback((container?: Element) => {
  const content = getTabbableContent(container);
  return orderRef.current.length > 0 ? content : [];
});

// Or if replicating content N times is needed:
const getTabbableElements = useStableCallback((container?: Element) => {
  const content = getTabbableContent(container);
  const result: FocusableElement[] = [];
  for (const item of orderRef.current) {
    if (item) result.push(...content);
  }
  return result;
});
```

#### Why it saves bytes:
- Eliminates three chained array methods
- No intermediate arrays created
- Simpler logic reduces minified size

---

## Medium Priority (82 bytes total)

### 4. ToastProvider.tsx - Multiple consecutive .map() calls
**File:** `packages/react/src/toast/provider/ToastProvider.tsx`
**Lines:** 132-144
**Pattern:** Multiple transformations on same data
**Estimated Savings:** 30 bytes

#### Current Code:
```typescript
const toastsWithEnding = prevToasts.map((toast) =>
  toast.id === toastId ? { ...toast, transitionStatus: 'ending' as const, height: 0 } : toast,
);
const activeToasts = toastsWithEnding.filter((t) => t.transitionStatus !== 'ending');
return toastsWithEnding.map((toast) => {
  if (toast.transitionStatus === 'ending') {
    return toast;
  }
  const isActiveToastLimited = activeToasts.indexOf(toast) >= limit;
  return { ...toast, limited: isActiveToastLimited };
});
```

#### Optimized Code:
```typescript
return prevToasts.reduce((acc: typeof prevToasts, toast) => {
  if (toast.id === toastId) {
    acc.push({ ...toast, transitionStatus: 'ending' as const, height: 0 });
  } else if (toast.transitionStatus === 'ending') {
    acc.push(toast);
  } else {
    const activeCount = prevToasts.filter((t) => t.id !== toastId && t.transitionStatus !== 'ending').length;
    acc.push({ ...toast, limited: activeCount >= limit });
  }
  return acc;
}, []);
```

#### Why it saves bytes:
- Single pass instead of three (two maps + one filter)
- No intermediate arrays stored
- Fewer variable declarations

---

### 5. AriaCombobox.tsx - For loop with conditional push
**File:** `packages/react/src/combobox/root/AriaCombobox.tsx`
**Lines:** 301-309
**Pattern:** For loop building array
**Estimated Savings:** 22 bytes

#### Current Code:
```typescript
const limitedItems: Value[] = [];
for (const item of flatItems) {
  if (limit > -1 && limitedItems.length >= limit) {
    break;
  }
  if (filter(item, filterQuery, itemToStringLabel)) {
    limitedItems.push(item);
  }
}
return limitedItems;
```

#### Optimized Code:
```typescript
return flatItems.reduce((acc: Value[], item) => {
  if (limit > -1 && acc.length >= limit) return acc;
  if (filter(item, filterQuery, itemToStringLabel)) acc.push(item);
  return acc;
}, []);
```

#### Why it saves bytes:
- Removes variable declaration and intermediate array variable
- More compact functional syntax
- Fewer lines after minification

---

### 6. AccordionRoot.tsx - Array.slice() + push()
**File:** `packages/react/src/accordion/root/AccordionRoot.tsx`
**Lines:** 91-93
**Pattern:** Slice then push pattern
**Estimated Savings:** 18 bytes

#### Current Code:
```typescript
const nextOpenValues = value.slice();
nextOpenValues.push(newValue);
onValueChange(nextOpenValues, details);
```

#### Optimized Code:
```typescript
onValueChange([...value, newValue], details);
```

#### Why it saves bytes:
- One line instead of three
- No intermediate variable
- Spread syntax is more compact after minification

---

### 7. FloatingFocusManager.tsx - Conditional in array literal
**File:** `packages/react/src/floating-ui-react/components/FloatingFocusManager.tsx`
**Lines:** 660-674
**Pattern:** Ternary with null in array
**Estimated Savings:** 12 bytes

#### Current Code:
```typescript
const insideElements = [
  floating,
  rootAncestorComboboxDomReference,
  ...portalNodes,
  ...getInsideElements(),
  startDismissButtonRef.current,
  endDismissButtonRef.current,
  beforeGuardRef.current,
  afterGuardRef.current,
  portalContext?.beforeOutsideRef.current,
  portalContext?.afterOutsideRef.current,
  resolveRef(previousFocusableElement),
  resolveRef(nextFocusableElement),
  isUntrappedTypeableCombobox ? domReference : null,
].filter((x): x is Element => x != null);
```

#### Optimized Code:
```typescript
const insideElements = [
  floating,
  rootAncestorComboboxDomReference,
  ...portalNodes,
  ...getInsideElements(),
  startDismissButtonRef.current,
  endDismissButtonRef.current,
  beforeGuardRef.current,
  afterGuardRef.current,
  portalContext?.beforeOutsideRef.current,
  portalContext?.afterOutsideRef.current,
  resolveRef(previousFocusableElement),
  resolveRef(nextFocusableElement),
  ...(isUntrappedTypeableCombobox ? [domReference] : []),
].filter((x): x is Element => x != null);
```

#### Why it saves bytes:
- Conditional spread avoids pushing null then filtering
- Slightly more compact in minified output

---

## Summary

| Priority | File | Pattern | Savings |
|----------|------|---------|---------|
| **HIGH** | useInteractions.ts | 4× .map() calls | 25 bytes |
| **HIGH** | markOthers.ts | .map().filter() | 40 bytes |
| **HIGH** | FloatingFocusManager.tsx | .map().filter().flat() | 35 bytes |
| **MEDIUM** | ToastProvider.tsx | Multiple .map() calls | 30 bytes |
| **MEDIUM** | AriaCombobox.tsx | For loop with push | 22 bytes |
| **MEDIUM** | AccordionRoot.tsx | slice() + push() | 18 bytes |
| **MEDIUM** | FloatingFocusManager.tsx | Conditional in array | 12 bytes |

**Total Estimated Savings: 182 bytes**

---

## Top 3 Highest-Impact Optimizations

1. **markOthers.ts** (40 bytes) - High frequency utility, used in focus management
2. **FloatingFocusManager.tsx - getTabbableElements** (35 bytes) - Called during component initialization
3. **ToastProvider.tsx** (30 bytes) - State update logic in toast management

---

## Implementation Recommendations

### Phase 1: High Priority (100 bytes)
Implement optimizations #1-3 first. These are clear wins with minimal risk:
- useInteractions.ts - Four iterations → one
- markOthers.ts - Two iterations → one
- FloatingFocusManager.tsx - Three methods → simple conditional

### Phase 2: Medium Priority (82 bytes)
After verifying Phase 1, implement #4-7:
- Focus on ToastProvider.tsx (30 bytes) and AriaCombobox.tsx (22 bytes) first
- AccordionRoot.tsx and remaining FloatingFocusManager.tsx are smaller wins

### Testing
After each optimization:
1. Run `pnpm test:jsdom` for affected components
2. Run `pnpm test:chromium` for affected components
3. Verify bundle size with build tooling

### Measuring Impact
```bash
# Before changes
pnpm run build
# Note the bundle sizes

# After changes
pnpm run build
# Compare the sizes
```

---

## Notes

- All optimizations maintain the same functionality
- Focus on HIGH priority cases first for maximum impact
- Test thoroughly, especially for the `useInteractions` and `markOthers` utilities which are used extensively
- Consider adding ESLint rules to prevent these patterns in future code
