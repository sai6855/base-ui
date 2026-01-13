# Bundle Size Optimization Opportunities

This document lists patterns in the codebase that could be optimized to reduce bundle size, similar to the 20-byte reduction achieved in `resolveValueLabel.tsx` by replacing `.map()` + `.forEach()` with a single `.reduce()`.

## High Priority (Production Code)

### 1. useInteractions.ts (lines 27-30)
**Pattern**: Four separate `.map()` calls on the same array
```typescript
const referenceDeps = propsList.map((key) => key?.reference);
const floatingDeps = propsList.map((key) => key?.floating);
const itemDeps = propsList.map((key) => key?.trigger);
const triggerDeps = propsList.map((key) => key?.trigger);
```

**Optimization**: Single pass with destructuring or object creation
```typescript
// Could reduce to one iteration creating all four arrays at once
const { referenceDeps, floatingDeps, itemDeps, triggerDeps } = propsList.reduce(
  (acc, key) => {
    acc.referenceDeps.push(key?.reference);
    acc.floatingDeps.push(key?.floating);
    acc.itemDeps.push(key?.item);
    acc.triggerDeps.push(key?.trigger);
    return acc;
  },
  { referenceDeps: [], floatingDeps: [], itemDeps: [], triggerDeps: [] }
);
```

**Estimated savings**: ~40-60 bytes (eliminates 3 array iterations)

---

### 2. SliderValue.tsx (lines 41-45)
**Pattern**: For loop with array push
```typescript
const formattedValues = React.useMemo(() => {
  const arr = [];
  for (let i = 0; i < values.length; i += 1) {
    arr.push(formatNumber(values[i], locale, formatOptionsRef.current ?? undefined));
  }
  return arr;
}, [formatOptionsRef, locale, values]);
```

**Optimization**: Use `.map()` directly
```typescript
const formattedValues = React.useMemo(() => {
  return values.map((value) => formatNumber(value, locale, formatOptionsRef.current ?? undefined));
}, [formatOptionsRef, locale, values]);
```

**Estimated savings**: ~15-20 bytes (eliminates for loop scaffolding and intermediate array variable)

---

### 3. SliderValue.tsx (lines 49-53)
**Pattern**: For loop with array push
```typescript
const defaultDisplayValue = React.useMemo(() => {
  const arr = [];
  for (let i = 0; i < values.length; i += 1) {
    arr.push(formattedValues[i] || values[i]);
  }
  return arr.join(' – ');
}, [values, formattedValues]);
```

**Optimization**: Use `.map()` directly
```typescript
const defaultDisplayValue = React.useMemo(() => {
  return values.map((value, i) => formattedValues[i] || value).join(' – ');
}, [values, formattedValues]);
```

**Estimated savings**: ~15-20 bytes

---

### 4. AccordionTrigger.tsx (lines 25-41)
**Pattern**: For loop with conditional push
```typescript
function getActiveTriggers(accordionItemRefs: { current: (HTMLElement | null)[] }): HTMLElement[] {
  const { current: accordionItemElements } = accordionItemRefs;

  const output: HTMLElement[] = [];

  for (let i = 0; i < accordionItemElements.length; i += 1) {
    const section = accordionItemElements[i];
    if (!isElementDisabled(section)) {
      const trigger = section?.querySelector<HTMLElement>('[type="button"], [role="button"]');
      if (trigger && !isElementDisabled(trigger)) {
        output.push(trigger);
      }
    }
  }

  return output;
}
```

**Optimization**: Use `.reduce()` or chained `.filter()` + `.map()`
```typescript
function getActiveTriggers(accordionItemRefs: { current: (HTMLElement | null)[] }): HTMLElement[] {
  return accordionItemRefs.current.reduce<HTMLElement[]>((acc, section) => {
    if (!isElementDisabled(section)) {
      const trigger = section?.querySelector<HTMLElement>('[type="button"], [role="button"]');
      if (trigger && !isElementDisabled(trigger)) {
        acc.push(trigger);
      }
    }
    return acc;
  }, []);
}
```

**Estimated savings**: ~20-25 bytes (eliminates destructuring, output variable, and for loop)

---

### 5. valueArrayToPercentages.ts (lines 4-10)
**Pattern**: For loop with array push
```typescript
export function valueArrayToPercentages(values: number[], min: number, max: number) {
  const output = [];
  for (let i = 0; i < values.length; i += 1) {
    output.push(clamp(valueToPercent(values[i], min, max), 0, 100));
  }
  return output;
}
```

**Optimization**: Use `.map()` directly
```typescript
export function valueArrayToPercentages(values: number[], min: number, max: number) {
  return values.map((value) => clamp(valueToPercent(value, min, max), 0, 100));
}
```

**Estimated savings**: ~20-25 bytes (eliminates output variable and for loop)

---

### 6. parse.ts (lines 77-88)
**Pattern**: Two separate `.forEach()` calls on formatter parts
```typescript
parts.forEach((part) => {
  result[part.type] = part.value;
});

// The formatting options may result in not returning a decimal.
getFormatter(locale)
  .formatToParts(0.1)
  .forEach((part) => {
    if (part.type === 'decimal') {
      result[part.type] = part.value;
    }
  });
```

**Optimization**: Could potentially combine or use reduce, though the second call is conditional
```typescript
// First pass
parts.forEach((part) => {
  result[part.type] = part.value;
});

// Second pass only if needed - keep as is or optimize based on common path
const decimalPart = getFormatter(locale)
  .formatToParts(0.1)
  .find((part) => part.type === 'decimal');
if (decimalPart) {
  result.decimal = decimalPart.value;
}
```

**Estimated savings**: ~10-15 bytes (use `.find()` instead of `.forEach()`)

---

## Medium Priority (Test Code)

### 7. SelectRoot.test.tsx (line 2575)
**Pattern**: `Array.from().map()` chain
```typescript
const values = Array.from(hiddenInputs).map((input) => input.value);
```

**Optimization**: Use Array.from's mapping function
```typescript
const values = Array.from(hiddenInputs, (input) => input.value);
```

**Estimated savings**: ~10-15 bytes (eliminates intermediate array)

**Note**: This is in test code, so less critical for bundle size

---

## Low Priority (Complex Logic)

### 8. composite.ts (lines 356-360)
**Pattern**: Nested for loops with array push
```typescript
const targetCells: number[] = [];
for (let i = 0; i < width; i += 1) {
  for (let j = 0; j < height; j += 1) {
    targetCells.push(startIndex + i + j * cols);
  }
}
```

**Consideration**: This nested loop structure may actually be more performant than functional alternatives for this use case. The push pattern here is likely optimal for the hot path.

**Estimated savings**: Minimal or negative (functional alternatives may be larger)

---

## Summary

**Total estimated bundle size reduction**: ~130-180 bytes across all high priority optimizations

**Key takeaway**: Prefer functional array methods (`.map()`, `.reduce()`, `.filter()`) over imperative for loops when the logic is straightforward. Single-pass operations are more efficient than multiple passes over the same data.
