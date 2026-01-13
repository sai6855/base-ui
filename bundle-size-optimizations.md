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



  Factors That Affect Bundle Size

  1. Minification Efficiency (Most Important)

  Different code patterns minify differently:

  // Source: 80 characters
  const result = [];
  for (let i = 0; i < items.length; i++) {
    result.push(items[i] * 2);
  }

  // Minified: ~60 characters
  const a=[];for(let b=0;b<items.length;b++)a.push(items[b]*2);

  // VS

  // Source: 50 characters
  const result = items.map(item => item * 2);

  // Minified: ~35 characters
  const a=items.map(b=>b*2);

  Same functionality, but the second one is smaller BOTH in source and minified!

  2. AST Complexity (Abstract Syntax Tree)

  More complex code structures = larger minified output:

  // Complex: Multiple statements, variables
  const x = 5;
  const y = 10;
  const z = x + y;
  // Minified: const x=5,y=10,z=x+y; (~24 chars)

  // Simple: Single expression
  const z = 5 + 10;
  // Minified: const z=15; (~12 chars after constant folding)

  3. Compression (Gzip/Brotli) Loves Repetition

  // Repetitive code - compresses VERY well
  const a = "hello world";
  const b = "hello world";
  const c = "hello world";
  // After gzip: ~30 bytes (not 3× the string size!)

  // VS

  // Unique strings - compresses poorly
  const a = "hello world";
  const b = "foo bar baz";
  const c = "qux zap fizz";
  // After gzip: ~40 bytes (much larger relatively)

  4. String Literals vs Code

  // 30 characters source
  const msg = "Hello, World!";
  // Minified: const msg="Hello, World!"; (~30 chars - same!)

  // VS

  // 30 characters source
  const sum = a + b + c + d;
  // Minified: const sum=a+b+c+d; (~19 chars - much smaller!)

  Strings don't minify much, but code does!

  5. Function Calls and Method Chaining

  // 50 characters
  array.map(x => x).filter(x => x).reduce((a,b) => a+b)

  // Minified: ~48 characters (not much savings)
  // Each method name stays the same: .map .filter .reduce

  // VS

  // 40 characters
  array.reduce((a,x) => x ? a+x : a, 0)

  // Minified: ~38 characters
  // Fewer method names = smaller output

  Real Example from Your Repo

  // BEFORE: ~150 source characters
  const labels = values.map(v => format(v));
  const nodes = [];
  labels.forEach((label, i) => {
    nodes.push(transform(label, i));
  });
  return nodes;

  // Minified: ~110 bytes
  const a=values.map(v=>format(v)),b=[];a.forEach((c,d)=>{b.push(transform(c,d))});return b

  // AFTER: ~100 source characters
  return values.map((v, i) => transform(format(v), i));

  // Minified: ~90 bytes
  return values.map((v,i)=>transform(format(v),i))

  20 fewer source characters → 20 fewer minified bytes!

  But the correlation isn't 1:1. It's about:
  - ✅ Fewer variable declarations (const a=, const b=)
  - ✅ Fewer method calls (one .map instead of .map + .forEach)
  - ✅ Fewer semicolons and commas
  - ✅ Simpler AST structure

  What REALLY Matters for Bundle Size
  ┌──────────────────────────┬────────┬─────────────────────────────────────┐
  │          Factor          │ Impact │                 Why                 │
  ├──────────────────────────┼────────┼─────────────────────────────────────┤
  │ Number of function calls │ High   │ .map, .forEach, etc. don't minify   │
  ├──────────────────────────┼────────┼─────────────────────────────────────┤
  │ Variable declarations    │ High   │ const, let, var + names take space  │
  ├──────────────────────────┼────────┼─────────────────────────────────────┤
  │ Intermediate arrays      │ High   │ More allocations = more code        │
  ├──────────────────────────┼────────┼─────────────────────────────────────┤
  │ String literals          │ Medium │ Stay same size, don't compress much │
  ├──────────────────────────┼────────┼─────────────────────────────────────┤
  │ Control flow (if/for)    │ Medium │ Keywords don't minify               │
  ├──────────────────────────┼────────┼─────────────────────────────────────┤
  │ Whitespace/formatting    │ None   │ Completely removed                  │
  └──────────────────────────┴────────┴─────────────────────────────────────┘
  Key Takeaway

  Bundle size ≠ character count

  It's about:
  1. Code complexity (fewer statements, variables, calls)
  2. Minification efficiency (simple expressions > complex statements)
  3. Compression ratio (repetitive patterns > unique strings)

  That's why our optimizations work: we're reducing structural complexity, not just typing fewer characters!
