# Bundle Size Optimization Analysis Prompt

Use this prompt with AI tools to find bundle size optimization opportunities in your codebase.

---

## The Prompt

```
I need you to find bundle size optimization opportunities in this codebase.

Look for these SPECIFIC PATTERNS in production source code (ignore test files):

1. **Multiple iterations on same array**
   - `.map()` followed by `.forEach()`
   - Multiple `.map()` calls on same array
   - `.filter()` followed by `.map()` or `.reduce()`

2. **For loops with array push**
   - Pattern: `const arr = []; for(...) { arr.push(...) }; return arr;`
   - Can usually be replaced with `.map()` or `.reduce()`

3. **Array.from() followed by .map()**
   - Pattern: `Array.from(items).map(x => ...)`
   - Can use: `Array.from(items, x => ...)`

4. **Creating intermediate arrays unnecessarily**
   - Multiple transformations that could be combined
   - Temporary variables that are only used once

5. **Nested loops creating arrays**
   - Only flag if the logic is simple enough to use functional methods

FOCUS ON:
- Files in `src/` or `lib/` or `packages/` (production code)
- Exclude test files (*.test.*, *.spec.*)
- Exclude build output directories

OUTPUT FORMAT:
Create a markdown file called `bundle-size-optimizations.md` with:

For each finding:
1. **File path and line numbers**
2. **Current code snippet** (exact code)
3. **Optimization suggestion** (code example)
4. **Estimated byte savings** (10-20, 20-40, 40+)
5. **Priority** (High/Medium/Low based on:
   - High: production code, clear win, 20+ bytes
   - Medium: production code, 10-20 bytes
   - Low: complex logic, uncertain savings)

Group findings by priority (High → Medium → Low).

At the end, provide:
- Total estimated savings
- Top 3 highest-impact optimizations

EXAMPLE of a good finding:

### File: src/utils/helpers.ts (lines 45-52)
**Priority**: High
**Pattern**: Two separate iterations

**Current**:
```javascript
const labels = values.map(v => format(v));
const result = [];
labels.forEach((label, i) => {
  result.push(transform(label, i));
});
return result;
```

**Optimized**:
```javascript
return values.map((v, i) => transform(format(v), i));
```

**Estimated savings**: 25-30 bytes (eliminates intermediate array and variable declarations)

---

Now analyze my codebase and find all such opportunities.
```

---

## Tips for Using This Prompt

### 1. Start with a specific directory (for large repos)
```
Analyze only the `src/components/` directory first
```

### 2. For very large repos, break it down
```
Find opportunities in files modified in the last 3 months
```
or
```
Focus on the 10 largest source files first
```

### 3. Specify your build tool if relevant
```
We use Webpack/Rollup/Vite with Terser for minification
```

### 4. Ask for validation
```
After finding issues, verify by checking if the pattern appears in production bundles
```

### 5. Request measurement
```
For the top 3 findings, show me how to measure the actual bundle size difference
```

---

## Understanding the Savings

### How Bundle Size is Calculated

1. **Source code** → written by developers (with formatting, comments, long names)
2. **Minified code** → whitespace removed, names shortened (`myVariable` → `a`)
3. **Gzipped code** → compressed (what users actually download)

### Why These Patterns Save Bytes

**Multiple iterations → Single iteration**
- Eliminates variable declarations
- Removes extra method calls
- Reduces intermediate arrays
- Saves ~20-40 bytes per occurrence

**For loops → Functional methods**
- Removes scaffolding (`const arr = []`, `return arr`)
- More compact syntax after minification
- Saves ~15-25 bytes per occurrence

**Array.from().map() → Array.from(mapper)**
- Eliminates intermediate array creation
- One function call instead of two
- Saves ~10-15 bytes per occurrence

---

## Real Example from Base UI

### Before (resolveValueLabel.tsx)
```typescript
const labels = values.map((v) =>
  resolveSelectedLabel(v, items, itemToStringLabel));

const nodes: React.ReactNode[] = [];

labels.forEach((label, index) => {
  if (index > 0) {
    nodes.push(', ');
  }
  nodes.push(<React.Fragment key={index}>{label}</React.Fragment>);
});

return nodes;
```

### After
```typescript
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

### Result
**20 bytes saved** in minified + gzipped bundle

---

## Customization for Different Projects

### React/Preact Projects
Add this to the prompt:
```
Pay special attention to:
- Component render methods
- useMemo/useCallback dependencies
- Props transformation logic
```

### Node.js/Backend Projects
Add this to the prompt:
```
Focus on:
- Request/response processing pipelines
- Data transformation utilities
- Middleware chains
```

### Library/Package Projects
Add this to the prompt:
```
Prioritize:
- Public API exports (most impactful for users)
- Utility functions
- Core algorithms
```

---

## Measuring Actual Impact

After applying optimizations, measure the real impact:

### Using Webpack Bundle Analyzer
```bash
npm install --save-dev webpack-bundle-analyzer
# Check before and after sizes
```

### Using Bundlephobia (for npm packages)
```bash
npx bundlephobia <package-name>
```

### Using size-limit (CI integration)
```json
{
  "size-limit": [
    {
      "path": "dist/index.js",
      "limit": "10 KB"
    }
  ]
}
```

---

## Common Pitfalls to Avoid

1. **Don't optimize hot paths with complex logic**
   - Nested loops in performance-critical code may be optimal as-is

2. **Don't sacrifice readability for 5 bytes**
   - Focus on clear wins (20+ bytes)

3. **Don't optimize test code** (unless it's included in production)
   - Test bundle size doesn't matter to users

4. **Always benchmark if uncertain**
   - Some functional methods generate more code after transpilation

---

## Questions to Ask After Analysis

1. What's the total estimated savings across all findings?
2. Which 3 optimizations provide the most impact?
3. Are there patterns I should codify in linting rules?
4. Would any optimizations hurt readability significantly?
