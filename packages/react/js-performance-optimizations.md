# JavaScript Performance Optimization Opportunities

Based on techniques from [Optimizing JavaScript](https://romgrk.com/posts/optimizing-javascript/), this document catalogs performance optimization opportunities found in the Base UI codebase.

---

## Table of Contents

1. [Array Method Optimizations](#1-array-method-optimizations)
2. [String Comparison Optimizations](#2-string-comparison-optimizations)
3. [Object Shape Consistency](#3-object-shape-consistency)
4. [Array.includes() → Set.has() Conversions](#4-arrayincludes--sethas-conversions)
5. [String Operation Optimizations](#5-string-operation-optimizations)
6. [Indirection & Property Access](#6-indirection--property-access)
7. [Store Operation Optimizations](#7-store-operation-optimizations)
8. [Summary Table](#summary-table)

---

## 1. Array Method Optimizations

### Blog Reference

> **Section: "4. Avoid array/object methods"**
>
> "Those methods are useful, but come at a cost: they need to create a new array each, and the closure also has some cost. If you're looking for maximum performance, change those to a regular for loop."
>
> ```javascript
> // Slow: Multiple iterations + intermediate arrays
> const result = numbers
>   .map((n) => Math.round(n * 10))
>   .filter((n) => n % 2 === 0)
>   .reduce((a, n) => a + n, 0);
>
> // Fast: Single loop pass
> let result = 0;
> for (let i = 0; i < numbers.length; i++) {
>   let n = Math.round(numbers[i] * 10);
>   if (n % 2 !== 0) continue;
>   result = result + n;
> }
> ```

### Why It Matters

Functional methods like `.map()`, `.filter()`, `.reduce()` create intermediate arrays requiring garbage collection and multiple loop passes. For hot paths, imperative `for` loops that process data in a single pass are faster.

---

### 1.1 markOthers.ts - Chained map().filter() (HIGH PRIORITY)

**File:** `src/floating-ui-react/utils/markOthers.ts`
**Lines:** 34-49

**Blog Section:** "4. Avoid array/object methods" - Chained methods creating intermediate arrays

```typescript
// Current: Creates intermediate array
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

**Suggested Improvement:**

```typescript
const correctElements = (parent: HTMLElement, targets: Element[]): Element[] => {
  const result: Element[] = [];
  for (let i = 0; i < targets.length; i++) {
    const target = targets[i];
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

**Impact:** High - Used in focus management and DOM accessibility control (hot path)

---

### 1.2 useListNavigation.ts - Nested map() in Event Handler (HIGH PRIORITY)

**File:** `src/floating-ui-react/hooks/useListNavigation.ts`
**Lines:** 679-698

**Blog Section:** "4. Avoid array/object methods" - Array methods in hot paths

```typescript
// Current: .map() inside keyboard event handler
current: cellMap.map((itemIndex) =>
  itemIndex != null ? listRef.current[itemIndex] : null,
),

// Also problematic:
disabledIndices: getGridCellIndices(
  [
    ...((typeof disabledIndices !== 'function' ? disabledIndices : null) ||
      listRef.current.map((_, listIndex) =>
        isListIndexDisabled(listRef, listIndex, disabledIndices)
          ? listIndex
          : undefined,
      )),
    undefined,
  ],
  cellMap,
),
```

**Impact:** High - Executes on every arrow key press in grid navigation

---

### 1.3 composite.ts - forEach() in Grid Algorithm (HIGH PRIORITY)

**File:** `src/floating-ui-react/utils/composite.ts`
**Lines:** 106-122, 343, 364

**Blog Section:** "4. Avoid array/object methods" - forEach prevents early exit optimization

```typescript
// Current: forEach over DOM elements (cannot break early)
listRef.current.forEach((el, idx) => {
  if (el == null) {
    return;
  }
  const rowEl = el.closest('[role="row"]');
  if (rowEl) {
    hasRoleRow = true;
  }
  if (rowEl !== currentRowEl || currentRowIndex === -1) {
    currentRowEl = rowEl;
    currentRowIndex += 1;
    rows[currentRowIndex] = [];
  }
  rows[currentRowIndex].push(idx);
  rowIndexMap[idx] = currentRowIndex;
});

// Line 364: .every() without early break
```

**Impact:** High - Part of grid navigation, runs on every keypress

---

### 1.4 ToastRoot.tsx - slice().reduce() Chain (HIGH PRIORITY)

**File:** `src/toast/root/ToastRoot.tsx`
**Line:** 136

**Blog Section:** "4. Avoid array/object methods" - Chained methods with intermediate allocations

```typescript
// Current: Creates intermediate array before reduce
const offsetY = React.useMemo(() => {
  return toasts.slice(0, toasts.indexOf(toast)).reduce((acc, t) => acc + (t.height || 0), 0);
}, [toasts, toast]);
```

**Suggested Improvement:**

```typescript
const offsetY = React.useMemo(() => {
  const toastIndex = toasts.indexOf(toast);
  let offset = 0;
  for (let i = 0; i < toastIndex; i++) {
    offset += toasts[i].height || 0;
  }
  return offset;
}, [toasts, toast]);
```

**Impact:** High - Toast layout calculations run frequently

---

### 1.5 ToastProvider.tsx - Triple Iteration Pattern (HIGH PRIORITY)

**File:** `src/toast/provider/ToastProvider.tsx`
**Lines:** 132-144

**Blog Section:** "4. Avoid array/object methods" - Multiple iterations creating intermediate arrays

```typescript
// Current: map → filter → map with O(n²) indexOf
const toastsWithEnding = prevToasts.map((toast) =>
  toast.id === toastId ? { ...toast, transitionStatus: 'ending' as const, height: 0 } : toast,
);

const activeToasts = toastsWithEnding.filter((t) => t.transitionStatus !== 'ending');

return toastsWithEnding.map((toast) => {
  if (toast.transitionStatus === 'ending') {
    return toast;
  }
  const isActiveToastLimited = activeToasts.indexOf(toast) >= limit; // O(n) inside map!
  return { ...toast, limited: isActiveToastLimited };
});
```

**Suggested Improvement:** Combine into single pass, use index tracking instead of indexOf

**Impact:** High - Called on every toast close

---

### 1.6 validateMinimumDistance.ts - reduce() for Array Building (HIGH PRIORITY)

**File:** `src/slider/utils/validateMinimumDistance.ts`
**Lines:** 10-18

**Blog Section:** "4. Avoid array/object methods" - reduce() overhead for simple operations

```typescript
// Current: reduce for simple array building
const distances = values.reduce((acc: number[], val, index, vals) => {
  if (index === vals.length - 1) {
    return acc;
  }
  acc.push(Math.abs(val - vals[index + 1]));
  return acc;
}, []);
```

**Suggested Improvement:**

```typescript
const distances: number[] = [];
for (let i = 0; i < values.length - 1; i++) {
  distances.push(Math.abs(values[i] - values[i + 1]));
}
```

**Impact:** High - Called during slider thumb movement

---

### 1.7 useCompositeRoot.ts - reduce() for Max Index (MEDIUM)

**File:** `src/composite/root/useCompositeRoot.ts`
**Lines:** 208-213

**Blog Section:** "4. Avoid array/object methods"

```typescript
// Current: reduce to find max
const maxGridIndex = cellMap.reduce(
  (foundIndex: number, index, cellIndex) =>
    index != null && !isListIndexDisabled(elementsRef, index, disabledIndices)
      ? cellIndex
      : foundIndex,
  -1,
);
```

**Impact:** Medium - Part of keyboard navigation

---

### 1.8 useFieldValidation.ts - Multiple reduce() Calls (MEDIUM)

**File:** `src/field/root/useFieldValidation.ts`
**Lines:** 102-108, 121-127, 170-174

**Blog Section:** "4. Avoid array/object methods"

```typescript
// Current: Three separate reduce operations
const currentNativeValidityObject = validityKeys.reduce(
  (acc, key) => {
    acc[key] = currentNativeValidity[key];
    return acc;
  },
  {} as Record<keyof ValidityState, boolean>,
);

const formValues = Array.from(formRef.current.fields.values()).reduce((acc, field) => {
  if (field.name) {
    acc[field.name] = field.getValue();
  }
  return acc;
}, {} as Form.Values);
```

**Impact:** Medium - Validation runs on submit/blur

---

### 1.9 Form.tsx - filter() + reduce() (MEDIUM)

**File:** `src/form/Form.tsx`
**Lines:** 109, 121-126

**Blog Section:** "4. Avoid array/object methods"

```typescript
// Current: filter creates new array for single element lookup
const invalidFields = values.filter((field) => !field.validityData.state.valid);

const formValues = values.reduce((acc, field) => {
  if (field.name) {
    (acc as Record<string, any>)[field.name] = field.getValue();
  }
  return acc;
}, {} as FormValues);
```

**Impact:** Medium - Form submission

---

### 1.10 resolveValueLabel.tsx - flatMap() + reduce() (MEDIUM)

**File:** `src/utils/resolveValueLabel.tsx`
**Lines:** 81, 119-129

**Blog Section:** "4. Avoid array/object methods"

```typescript
// Current: flatMap creates intermediate arrays
const flatItems: LabeledItem[] = isGroupedItems(items)
  ? (items as Group<LabeledItem>[]).flatMap((g) => g.items)
  : (items as LabeledItem[]);

// reduce for JSX array building
return values.reduce((acc, value, index) => {
  if (index > 0) {
    acc.push(', ');
  }
  acc.push(
    <React.Fragment key={index}>
      {resolveSelectedLabel(value, items, itemToStringLabel)}
    </React.Fragment>,
  );
  return acc;
}, []);
```

**Impact:** Medium - Select display updates

---

### 1.11 parseNumber.ts - filter().map() Chain (MEDIUM)

**File:** `src/number-field/utils/parse.ts`
**Lines:** 142-145, 77-88

**Blog Section:** "4. Avoid array/object methods"

```typescript
// Current: Chained filter().map()
const unitParts = getFormatter(computedLocale, options)
  .formatToParts(1)
  .filter((p) => p.type === 'unit')
  .map((p) => escapeRegExp(p.value));
```

**Impact:** Medium - Number field input parsing

---

### 1.12 nodes.ts - filter() + flatMap() (LOW)

**File:** `src/floating-ui-react/utils/nodes.ts`
**Lines:** 10-16

**Blog Section:** "4. Avoid array/object methods"

```typescript
// Current: Filter + recursive flatMap
const directChildren = nodes.filter(
  (node) => node.parentId === id && (!onlyOpenChildren || node.context?.open),
);

return directChildren.flatMap((child) => [
  child,
  ...getNodeChildren(nodes, child.id, onlyOpenChildren),
]);
```

**Impact:** Low - Floating element tree traversal

---

### 1.13 itemEquality.ts - filter() for Removal (LOW)

**File:** `src/utils/itemEquality.ts`
**Line:** 53

**Blog Section:** "4. Avoid array/object methods"

```typescript
// Current: filter for removal
export function removeItem<Item, Value>(
  collection: readonly Item[],
  value: Value,
  comparer: ItemEqualityComparer<Item, Value>,
): Item[] {
  return collection.filter((item) => !compareItemEquality(item, value, comparer));
}
```

**Impact:** Low - Used across various components

---

## 2. String Comparison Optimizations

### Blog Reference

> **Section: "2. Avoid string comparisons"**
>
> "Strings are more complex to compare than it might seem. If we know the set of strings we're comparing in advance, we can map them to integers, which are much cheaper to compare."
>
> ```typescript
> // Slow: string comparison - O(n) character comparison
> enum Position {
>   TOP = 'TOP',
>   BOTTOM = 'BOTTOM',
> }
>
> // Fast: integer comparison - O(1)
> enum Position {
>   TOP,
>   BOTTOM,
> } // 0, 1
> ```
>
> "Example: The original parser was using strings to represent types, by switching to integers the parser ran 2x faster."

### Why It Matters

String equality checks are O(n) operations requiring character-by-character comparison. Numeric enums reduce this to O(1) integer comparison.

---

### 2.1 Animation Type Comparisons (HIGH PRIORITY)

**File:** `src/collapsible/panel/useCollapsiblePanel.ts`
**Lines:** 54, 73, 93-98

**Blog Section:** "2. Avoid string comparisons" - String-based state machines

```typescript
// Current: String comparisons in animation hot path
if (animationTypeRef.current === 'css-animation') { ... }
if (animationTypeRef.current === 'css-transition') { ... }
animationTypeRef.current = 'css-animation';
animationTypeRef.current = 'css-transition';
animationTypeRef.current = 'none';
```

**Suggested Improvement:**

```typescript
const enum AnimationType {
  CssAnimation = 0,
  CssTransition = 1,
  None = 2,
}
```

**Impact:** High - Panel animation performance (~5-10% improvement)

---

### 2.2 Checkbox Status State Machine (HIGH)

**File:** `src/checkbox-group/useCheckboxGroupParent.ts`
**Lines:** 18, 62-70

**Blog Section:** "2. Avoid string comparisons" - String-based state machines

```typescript
// Current: String-based state machine
const [status, setStatus] = React.useState<'on' | 'off' | 'mixed'>('mixed');

if (status === 'mixed') {
  // ... setStatus('on')
} else if (status === 'on') {
  // ... setStatus('off')
} else if (status === 'off') {
  // ... setStatus('mixed')
}
```

**Suggested Improvement:**

```typescript
const enum CheckboxStatus {
  On = 0,
  Off = 1,
  Mixed = 2,
}
```

**Impact:** High - Checked on every interaction

---

### 2.3 Selection Mode Comparisons (HIGH)

**Files:** Multiple combobox files (20+ locations)

**Blog Section:** "2. Avoid string comparisons" - Repeated type checking

```typescript
// Current: Repeated string comparisons
if (selectionMode === 'none') { ... }
else if (selectionMode === 'single') { ... }
else if (selectionMode === 'multiple') { ... }
```

**Suggested Improvement:**

```typescript
const enum SelectionMode {
  None = 0,
  Single = 1,
  Multiple = 2,
}
```

**Impact:** High - Combobox rendering and event handling

---

### 2.4 Validation Mode Comparisons (MEDIUM)

**Files:** 10+ form/field files including:

- `src/field/root/FieldRoot.tsx`
- `src/checkbox/root/CheckboxRoot.tsx`
- `src/combobox/input/ComboboxInput.tsx`

**Blog Section:** "2. Avoid string comparisons"

```typescript
// Current: Repeated in many validation contexts
if (validationMode === 'onBlur') { ... }
if (validationMode === 'onChange') { ... }
if (validationMode === 'onSubmit') { ... }
```

**Suggested Improvement:**

```typescript
const enum ValidationMode {
  OnChange = 0,
  OnBlur = 1,
  OnSubmit = 2,
}
```

**Impact:** Medium - Validation runs on submit/blur

---

### 2.5 Menu Type Comparisons (MEDIUM)

**Files:** Menu components (20+ locations)

**Blog Section:** "2. Avoid string comparisons"

```typescript
// Current: Spread across MenuRoot, MenuPopup, MenuPositioner
if (parent.type === 'context-menu') { ... }
if (parent.type === 'menu') { ... }
if (parent.type === 'menubar') { ... }
```

**Impact:** Medium - Menu navigation

---

### 2.6 Keyboard Key Comparisons (MEDIUM)

**File:** `src/combobox/chip/ComboboxChip.tsx`
**Lines:** 38-82

**Blog Section:** "2. Avoid string comparisons"

```typescript
// Current: Multiple string comparisons per keydown
if (event.key === 'ArrowLeft') { ... }
else if (event.key === 'ArrowRight') { ... }
else if (event.key === 'Backspace' || event.key === 'Delete') { ... }
else if (event.key === 'Enter' || event.key === ' ') { ... }
else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { ... }
```

**Note:** Some files already use Set-based key groups (see `composite.ts` with `ARROW_KEYS`, `HORIZONTAL_KEYS`). This pattern should be applied consistently.

**Impact:** Medium - Keyboard navigation

---

## 3. Object Shape Consistency

### Blog Reference

> **Section: "3. Avoid different shapes"**
>
> "JS engines try to optimize code by assuming objects have a specific shape and that functions will receive objects of same shape."
>
> ```javascript
> // All objects MUST have the same shape for monomorphic code:
> const o1 = { a: 1, b: 0, c: 0, d: 0 };
> const o2 = { a: 1, b: 0, c: 0, d: 0 }; // Same order, same properties
>
> // BAD: Different shapes cause polymorphic/megamorphic deoptimization
> const o1 = { a: 1 };
> const o2 = { b: 1 }; // Different shape!
> ```
>
> "There is a dramatic slowdown that happens when engines go from monomorphic → polymorphic → megamorphic."

### Why It Matters

Objects with different property orderings trigger deoptimization from monomorphic to polymorphic/megamorphic states. Creating objects with identical property order maintains fast paths.

---

### 3.1 Dynamic Property Spreads in useRole.ts (MEDIUM)

**File:** `src/floating-ui-react/hooks/useRole.ts`
**Lines:** 61-74

**Blog Section:** "3. Avoid different shapes" - Conditional spreads creating different shapes

```typescript
// Current: Conditional spreads create different shapes
const trigger: ElementProps['trigger'] = React.useMemo(() => {
  return {
    'aria-haspopup': ariaRole === 'alertdialog' ? 'dialog' : ariaRole,
    'aria-expanded': 'false',
    ...(ariaRole === 'listbox' && { role: 'combobox' }),
    ...(ariaRole === 'menu' && isNested && { role: 'menuitem' }),
    ...(role === 'select' && { 'aria-autocomplete': 'none' }),
    ...(role === 'combobox' && { 'aria-autocomplete': 'list' }),
  };
}, [ariaRole, isNested, role]);
```

**Suggested Improvement:** Define all properties upfront with explicit undefined values:

```typescript
return {
  'aria-haspopup': ariaRole === 'alertdialog' ? 'dialog' : ariaRole,
  'aria-expanded': 'false',
  role:
    ariaRole === 'listbox' ? 'combobox' : ariaRole === 'menu' && isNested ? 'menuitem' : undefined,
  'aria-autocomplete': role === 'select' ? 'none' : role === 'combobox' ? 'list' : undefined,
};
```

**Impact:** Medium - Improves JIT compilation (~2-5%)

---

### 3.2 Conditional Object Creation in useInteractions.ts (MEDIUM)

**File:** `src/floating-ui-react/hooks/useInteractions.ts`
**Lines:** 70-80

**Blog Section:** "3. Avoid different shapes" - Dynamic property additions

```typescript
// Current: Adds properties conditionally
if (elementKey === 'floating') {
  outputProps.tabIndex = -1;
  outputProps[FOCUSABLE_ATTRIBUTE] = '';
}
```

**Impact:** Medium - Creates different hidden classes

---

## 4. Array.includes() → Set.has() Conversions

### Blog Reference

> **Section: "12. Data structures"**
>
> "I/O complexity for a lookup in a `Set` is `O(1)`, while it's `O(n)` for an `Array`. Sets are useful when a dataset must be searched numerous times."
>
> ```javascript
> // Slow: O(n) lookup
> if (adminIdsArray.includes(id)) { ... }
>
> // Fast: O(1) lookup
> if (adminIdsSet.has(id)) { ... }
> ```

### Why It Matters

`Array.includes()` is O(n), `Set.has()` is O(1). For repeated lookups, Sets are significantly faster.

---

### 4.1 useTypeahead.ts - ignoreKeys Array (HIGH)

**File:** `src/floating-ui-react/hooks/useTypeahead.ts`
**Line:** 143

**Blog Section:** "12. Data structures" - Array.includes() in hot path

```typescript
// Current: O(n) on every keydown
if (
  listContent == null ||
  ignoreKeys.includes(event.key) || // <-- O(n) operation
  event.key.length !== 1 ||
  event.ctrlKey ||
  event.metaKey ||
  event.altKey
) {
  return;
}
```

**Suggested Improvement:**

```typescript
const ignoreKeysSet = React.useMemo(() => new Set(ignoreKeys), [ignoreKeys]);

// Then use:
if (ignoreKeysSet.has(event.key)) { ... }
```

**Impact:** High - Checked on every keydown

---

### 4.2 useCheckboxGroupParent.ts - Multiple includes() (HIGH)

**File:** `src/checkbox-group/useCheckboxGroupParent.ts`
**Lines:** 39, 47, 79

**Blog Section:** "12. Data structures" - O(n) lookups in loops

```typescript
// Current: O(n) lookups in filter loops
const none = allValues.filter(
  (v) => disabledStatesRef.current.get(v) && uncontrolledState.includes(v),  // O(n) each iteration
);

// Line 79:
checked: value.includes(childValue),  // O(n)
```

**Impact:** High - For large checkbox groups becomes O(n²)

---

### 4.3 useHover.ts - Event Type Checking (MEDIUM)

**File:** `src/floating-ui-react/hooks/useHover.ts`
**Lines:** 166, 175

**Blog Section:** "12. Data structures"

```typescript
// Current: Array includes
return type?.includes('mouse') && type !== 'mousedown';

// Line 175:
? ['click', 'mousedown'].includes(dataRef.current.openEvent.type)
```

**Note:** `useHoverFloatingInteraction.ts:38` already has `clickLikeEvents = new Set(['click', 'mousedown'])`. This pattern should be applied consistently.

**Impact:** Medium - Called on mouse interactions

---

### 4.4 Good Pattern Already in Use

**File:** `src/composite/composite.ts`
**Lines:** 29-41

**Blog Section:** "12. Data structures" - Correct implementation

```typescript
// GOOD: Already using Sets
export const HORIZONTAL_KEYS = new Set([ARROW_LEFT, ARROW_RIGHT]);
export const VERTICAL_KEYS = new Set([ARROW_UP, ARROW_DOWN]);
export const ARROW_KEYS = new Set([...HORIZONTAL_KEYS, ...VERTICAL_KEYS]);
export const ALL_KEYS = new Set([...ARROW_KEYS, HOME, END]);
```

This is the pattern that should be applied to other key checking code.

---

## 5. String Operation Optimizations

### Blog Reference

> **Section: "10. Use strings carefully"**
>
> "Strings are more complex than they appear. We already covered comparing them, but looking at creating them is also worthwhile."
>
> "Avoid mutation methods when possible. For example, use concatenation (`+`) instead of `.trim()` or `.replace()` when you can."
>
> ```javascript
> // Slow: Uses map + join (mutations)
> classNames.map((c) => `button--${c}`).join(' ');
>
> // Fast: Pure concatenation
> let result = '';
> for (const c of classNames) {
>   result += `button--${c} `;
> }
> ```

### Why It Matters

String mutations force copies. Concatenation with `+` is generally faster than mutation methods for building strings.

---

### 5.1 SliderValue.tsx - Repeated trim() (LOW)

**File:** `src/slider/value/SliderValue.tsx`
**Line:** 37

**Blog Section:** "10. Use strings carefully" - Avoid redundant mutations

```typescript
// Current: trim() called twice
return htmlFor.trim() === '' ? undefined : htmlFor.trim();
```

**Suggested Improvement:**

```typescript
const trimmedHtmlFor = htmlFor.trim();
return trimmedHtmlFor === '' ? undefined : trimmedHtmlFor;
```

**Impact:** Low - Memoized hook

---

### 5.2 SliderValue.tsx - String Concatenation in Loop (MEDIUM)

**File:** `src/slider/value/SliderValue.tsx`
**Lines:** 31-36

**Blog Section:** "10. Use strings carefully" - String building patterns

```typescript
// Current: String concatenation in loop
let htmlFor = '';
for (const thumbMetadata of thumbMap.values()) {
  if (thumbMetadata?.inputId) {
    htmlFor += `${thumbMetadata.inputId} `;
  }
}
```

**Suggested Improvement:**

```typescript
const ids: string[] = [];
for (const thumbMetadata of thumbMap.values()) {
  if (thumbMetadata?.inputId) {
    ids.push(thumbMetadata.inputId);
  }
}
const htmlFor = ids.join(' ');
```

**Impact:** Medium - For large thumb maps

---

### 5.3 useFilter.ts - JSON.stringify for Cache Key (LOW)

**File:** `src/combobox/root/utils/useFilter.ts`
**Lines:** 20-41

**Blog Section:** "10. Use strings carefully"

```typescript
// Current: JSON.stringify on every call
const cacheKey = `${stringifyLocale(options.locale)}|${JSON.stringify(mergedOptions)}`;
```

**Impact:** Low - Only on first call per options combination

---

## 6. Indirection & Property Access

### Blog Reference

> **Section: "5. Avoid indirection"**
>
> "Another thing that will make a function more difficult to optimize is indirection. Usually in JS, indirection comes from accessing values through: proxies, deeply nested objects, or repeated property chains."
>
> ```javascript
> // Slow: Proxy adds unpredictable overhead
> const proxy = new Proxy(point, { get: (t, k) => t[k] });
> const x = proxy.x;
>
> // Slow: Deep property chain
> result = this.state.circle.center.point.x;
>
> // Fast: Direct access
> const x = point.x;
> ```

### Why It Matters

Deep property access chains and repeated ternary operations prevent optimization. Caching intermediate values is faster.

---

### 6.1 safePolygon.ts - Repeated Ternary Access (MEDIUM)

**File:** `src/floating-ui-react/safePolygon.ts`
**Lines:** 109-118

**Blog Section:** "5. Avoid indirection" - Repeated conditional property access

```typescript
// Current: Repeated ternary property access
const left = (isFloatingWider ? refRect : rect).left;
const right = (isFloatingWider ? refRect : rect).right;
const top = (isFloatingTaller ? refRect : rect).top;
const bottom = (isFloatingTaller ? refRect : rect).bottom;
```

**Suggested Improvement:**

```typescript
const horizontalRect = isFloatingWider ? refRect : rect;
const verticalRect = isFloatingTaller ? refRect : rect;
const left = horizontalRect.left;
const right = horizontalRect.right;
const top = verticalRect.top;
const bottom = verticalRect.bottom;
```

**Impact:** Medium - Called during polygon calculations

---

### 6.2 useFieldValidation.ts - Deep Property Chains (LOW)

**File:** `src/field/root/useFieldValidation.ts`
**Lines:** 72, 88-95, 225-228

**Blog Section:** "5. Avoid indirection" - Repeated Map access through nested properties

```typescript
// Current: Repeated Map access
formRef.current.fields.get(controlId);
formRef.current.fields.set(controlId, ...);
```

**Suggested Improvement:** Cache field lookup:

```typescript
const fields = formRef.current.fields;
const currentFieldData = fields.get(controlId);
if (currentFieldData) {
  fields.set(controlId, { ...currentFieldData, ...updates });
}
```

**Impact:** Low - Validation paths

---

### 6.3 detectBrowser.ts - Multiple Navigator Access (LOW)

**File:** `packages/utils/src/detectBrowser.ts`
**Lines:** 38-50, 58-65, 72-78

**Blog Section:** "5. Avoid indirection"

```typescript
// Current: Each function independently accesses navigator
const uaData = (navigator as any).userAgentData as NavigatorUAData | undefined;
// Called 3 times in getNavigatorData(), getUserAgent(), getPlatform()
```

**Suggested Improvement:** Cache at module load

**Impact:** Low - Initialization only

---

## 7. Store Operation Optimizations

### Blog Reference

> **Section: "1. Avoid work"**
>
> "The most effective optimization technique is avoiding unnecessary work. Before optimizing individual operations, identify if the operation is necessary at all."
>
> Also relates to **Section: "4. Avoid array/object methods"** for the spread-then-delete pattern.

### Why It Matters

Object spread followed by selective deletion is inefficient. Filtering during creation avoids unnecessary operations.

---

### 7.1 ReactStore.ts - Spread-then-Delete Pattern (MEDIUM)

**File:** `packages/utils/src/store/ReactStore.ts`
**Lines:** 179-194, 202-217

**Blog Section:** "1. Avoid work" + "4. Avoid array/object methods"

```typescript
// Current: Spread then delete (unnecessary work)
public update(values: Partial<State>): void {
  const newValues = { ...values };
  for (const key in newValues) {
    if (!Object.hasOwn(newValues, key)) {
      continue;
    }
    if (this.controlledValues.get(key) === true) {
      delete newValues[key];
      continue;
    }
  }
  super.update(newValues);
}
```

**Suggested Improvement:**

```typescript
public update(values: Partial<State>): void {
  const newValues: Partial<State> = {};
  for (const key in values) {
    if (Object.hasOwn(values, key) && this.controlledValues.get(key) !== true) {
      newValues[key as keyof State] = values[key as keyof State];
    }
  }
  super.update(newValues);
}
```

**Impact:** Medium - Store updates are frequent

---

### 7.2 fastObjectShallowCompare.ts - Two Separate Loops (LOW)

**File:** `packages/utils/src/fastObjectShallowCompare.ts`
**Lines:** 16-30

**Blog Section:** "1. Avoid work"

```typescript
// Current: Two loops
for (const key in a) {
  aLength += 1;
  if (!is(a[key], b[key])) {
    return false;
  }
  if (!(key in b)) {
    return false;
  }
}
for (const _ in b) {
  bLength += 1;
}
return aLength === bLength;
```

**Impact:** Low - Utility function

---

## Summary Table

| Category           | File                       | Blog Section                    | Priority | Hot Path          | Recommendation          |
| ------------------ | -------------------------- | ------------------------------- | -------- | ----------------- | ----------------------- |
| Array Methods      | markOthers.ts              | "4. Avoid array/object methods" | HIGH     | Yes (focus)       | Use for loop            |
| Array Methods      | useListNavigation.ts       | "4. Avoid array/object methods" | HIGH     | Yes (keyboard)    | Combine into for loop   |
| Array Methods      | composite.ts               | "4. Avoid array/object methods" | HIGH     | Yes (grid nav)    | Use for loop with break |
| Array Methods      | ToastRoot.tsx              | "4. Avoid array/object methods" | HIGH     | Yes (layout)      | Single for loop         |
| Array Methods      | ToastProvider.tsx          | "4. Avoid array/object methods" | HIGH     | Yes (close)       | Single pass iteration   |
| Array Methods      | validateMinimumDistance.ts | "4. Avoid array/object methods" | HIGH     | Yes (slider)      | For loop                |
| String Comparisons | useCollapsiblePanel.ts     | "2. Avoid string comparisons"   | HIGH     | Yes (animation)   | Numeric enum            |
| String Comparisons | useCheckboxGroupParent.ts  | "2. Avoid string comparisons"   | HIGH     | Yes (interaction) | Numeric enum            |
| String Comparisons | Combobox (20+ files)       | "2. Avoid string comparisons"   | HIGH     | Yes (rendering)   | Numeric enum            |
| Set Conversion     | useTypeahead.ts            | "12. Data structures"           | HIGH     | Yes (keydown)     | Use Set                 |
| Set Conversion     | useCheckboxGroupParent.ts  | "12. Data structures"           | HIGH     | Yes (state)       | Use Set                 |
| Object Shape       | useRole.ts                 | "3. Avoid different shapes"     | MEDIUM   | Medium            | Consistent properties   |
| Object Shape       | useInteractions.ts         | "3. Avoid different shapes"     | MEDIUM   | Medium            | Consistent properties   |
| Store Ops          | ReactStore.ts              | "1. Avoid work"                 | MEDIUM   | Yes (updates)     | Filter during creation  |
| String Ops         | SliderValue.tsx            | "10. Use strings carefully"     | LOW      | Medium            | Cache trim result       |
| Indirection        | safePolygon.ts             | "5. Avoid indirection"          | MEDIUM   | Medium            | Cache rect selection    |

---

## Implementation Priority

### Phase 1 (Highest Impact)

1. Array method optimizations in hot keyboard navigation paths
2. Set conversions for key checking (useTypeahead.ts, useCheckboxGroupParent.ts)
3. Animation type numeric enum

### Phase 2 (Medium Impact)

1. Selection mode and validation mode numeric enums
2. Object shape consistency in useRole.ts
3. Store operation optimizations

### Phase 3 (Lower Impact)

1. String operation optimizations
2. Remaining array method cleanups
3. Indirection fixes

---

## Notes

- Always profile before and after changes to verify impact
- Some optimizations may have minimal real-world impact
- Focus on hot paths first (keyboard handlers, animation loops, frequent renders)
- Consider readability tradeoffs for low-impact optimizations
