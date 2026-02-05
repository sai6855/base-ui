# Bundle Size Findings (Static Analysis)

## Scope

- Analyzed directory: /packages
- Analysis type: Static (no builds, no tooling)
- Optimization goal: Byte-level bundle size reduction

---

## High-Impact Findings

> Likely to save meaningful bundle size

### 1. Root barrel export widens graph

- Location(s): `packages/react/src/index.ts`, `packages/react/package.json` exports map
- Issue: The root entry re-exports every component via `export *`, encouraging imports from `@base-ui/react` rather than subpath entrypoints.
- Why this increases bundle size: Consumers who import from the root are more likely to pull in a broad graph, and any side effects in submodules defeat tree-shaking.
- Suggested direction (no code): Promote and document subpath imports (already listed in `exports`), and consider splitting the root entrypoint into a minimal façade that only re-exports types or selected safe-by-default modules.

### 2. Type file re-exports runtime from `@floating-ui/react-dom`

- Location(s): `packages/react/src/floating-ui-react/types.ts`
- Issue: `types.ts` re-exports runtime functions (`arrow`, `flip`, etc.) and does `export * from '.'`, which is a runtime re-export from the module root.
- Why this increases bundle size: Any import from `types.ts` (including type-only imports in TS) can still pull in runtime re-exports in JS output, keeping `@floating-ui/react-dom` in the bundle.
- Suggested direction (no code): Split type-only exports into a dedicated `types` entrypoint with `export type` only, and avoid `export * from '.'` in a type-centric module.

### 3. Dev-only Store Inspector shipped in main utils entrypoint

- Location(s): `packages/utils/src/store/StoreInspector.tsx`, `packages/utils/src/store/index.ts`
- Issue: Store inspector UI (large CSS string, portals, SVGs, pointer/drag logic) is exported in the primary store barrel.
- Why this increases bundle size: Any consumer that uses `@base-ui/utils/store` now pays for dev UI code and `react-dom` portal logic even in production.
- Suggested direction (no code): Move `StoreInspector` to a separate entrypoint (e.g. `@base-ui/utils/store/inspector`) or gate it behind a dev-only export.

### 4. `reselect` dependency used for a narrow surface area

- Location(s): `packages/utils/src/store/createSelector.ts`, `packages/utils/package.json`, `packages/react/package.json`
- Issue: The only direct usage of `reselect` is in `createSelector.ts`.
- Why this increases bundle size: Pulling `reselect` into the dependency graph for a small selector helper increases baseline size for any consumer using store utilities.
- Suggested direction (no code): Replace with a lightweight local memoization utility, or move selector creation into its own optional entrypoint.

---

## Medium-Impact Findings

> Moderate or situational improvements

### 1. Broad barrel re-exports outside the root entrypoint

- Location(s): `packages/utils/src/store/index.ts`, `packages/react/src/utils/popups/index.ts`, `packages/react/src/floating-ui-react/utils.ts`, `packages/react/src/use-render/index.ts`, `packages/react/src/labelable-provider/index.ts`
- Issue: These barrels re-export whole modules even when consumers only need a subset.
- Why this increases bundle size: Barrels widen the import surface and can pull in transitive modules with side effects or large constants.
- Suggested direction (no code): Replace barrels with narrower entrypoints or explicit named exports, and avoid `export *` when re-exporting heavy modules.

### 2. Type-only modules importing React at runtime

- Location(s): `packages/react/src/utils/types.ts`
- Issue: The file imports `React` as a value but only uses React types.
- Why this increases bundle size: This introduces a runtime dependency on `react` from a purely type module.
- Suggested direction (no code): Convert to `import type * as React from 'react'` to keep the JS output free of the import.

### 3. Root re-exports from `floating-ui-react` can over-pull internals

- Location(s): `packages/react/src/floating-ui-react/types.ts`, `packages/react/src/floating-ui-react/utils.ts`
- Issue: These modules re-export runtime utilities from multiple internal paths, which can pull in helper stacks even when only a single utility is needed.
- Why this increases bundle size: Re-exporting multiple utilities through a single module increases retention in bundlers that don’t tree-shake across re-export boundaries well.
- Suggested direction (no code): Encourage direct, narrow imports or split the utilities into smaller entrypoints.

---

## Low-Impact / Micro-Optimizations

> Byte-level improvements, but worth doing at scale

- `packages/utils/src/formatErrorMessage.ts` uses a default export; prefer named export to improve tree-shaking and avoid interop helpers.
- `packages/utils/src/store/StoreInspector.tsx` embeds large CSS and SVG literals; consider moving them to shared constants or conditionally loaded assets.
- `packages/react/src/utils/popupStateMapping.ts` and `packages/react/src/utils/stateAttributesMapping.ts` create small hook objects for state mapping; these could be shared or reused across modules to avoid repeated literal emission.

---

## Code Duplication Findings

### Data attribute enums repeated across components

- Files involved:
  - `packages/react/src/combobox/arrow/ComboboxArrowDataAttributes.ts`
  - `packages/react/src/combobox/popup/ComboboxPopupDataAttributes.ts`
  - `packages/react/src/tooltip/arrow/TooltipArrowDataAttributes.ts`
  - `packages/react/src/popover/arrow/PopoverArrowDataAttributes.ts`
  - `packages/react/src/menu/arrow/MenuArrowDataAttributes.ts`
  - `packages/react/src/preview-card/arrow/PreviewCardArrowDataAttributes.ts`
  - `packages/react/src/toast/arrow/ToastArrowDataAttributes.ts`
- Similarity: Each file declares an enum of `data-*` attribute names with near-identical structure and docs.
- Suggested consolidation approach: Centralize shared `data-*` constants in a single module (or reuse `CommonPopupDataAttributes` with `as const` maps) and re-export per component as types only.

### CSS vars enums repeated across components

- Files involved:
  - `packages/react/src/combobox/positioner/ComboboxPositionerCssVars.ts`
  - `packages/react/src/popover/viewport/PopoverViewportCssVars.ts`
  - `packages/react/src/popover/positioner/PopoverPositionerCssVars.ts`
  - `packages/react/src/scroll-area/viewport/ScrollAreaViewportCssVars.ts`
  - `packages/react/src/scroll-area/root/ScrollAreaRootCssVars.ts`
  - `packages/react/src/toast/positioner/ToastPositionerCssVars.ts`
  - `packages/react/src/toast/root/ToastRootCssVars.ts`
- Similarity: Repeated `enum` structures mapping CSS custom property names.
- Suggested consolidation approach: Move CSS var names to shared const objects and reuse via `type` aliases to avoid runtime enum emission in multiple files.

---

## TypeScript Runtime Bloat

- Finding: `enum` used for `data-*` attributes and CSS vars.
- File(s): `packages/react/src/utils/stateAttributesMapping.ts`, `packages/react/src/utils/popupStateMapping.ts`, plus all `*DataAttributes.ts` and `*CssVars.ts` files under `packages/react/src/**`.
- Why this emits runtime code: TypeScript enums compile to runtime objects; these are repeated across many files and are often only used as string constants.

- Finding: Runtime re-exports inside a type-heavy module.
- File(s): `packages/react/src/floating-ui-react/types.ts`
- Why this emits runtime code: `export * from '.'` and runtime `export { ... }` cause JS re-exports even when the importing site only wants types.

- Finding: Value import for type-only React usage.
- File(s): `packages/react/src/utils/types.ts`
- Why this emits runtime code: A non-type import inserts a `react` import into JS output for a file that only needs type information.

---

## Import & Re-export Issues

- Pattern: `export * from` barrels.
- File(s): `packages/react/src/index.ts`, `packages/utils/src/store/index.ts`, `packages/react/src/utils/popups/index.ts`, `packages/react/src/floating-ui-react/utils.ts`, `packages/react/src/use-render/index.ts`, `packages/react/src/labelable-provider/index.ts`
- Why this blocks tree-shaking: Broad re-exports increase module retention and complicate dead-code elimination when any submodule has side effects.

- Pattern: `export * from '.'` in a type module.
- File(s): `packages/react/src/floating-ui-react/types.ts`
- Why this blocks tree-shaking: Creates a runtime re-export loop and forces bundlers to retain the full root module.

- Pattern: `import * as React from 'react'` in type-only modules.
- File(s): `packages/react/src/utils/types.ts`
- Why this blocks tree-shaking: Forces a runtime dependency for a module that is otherwise types-only.

---

## Architectural Observations

> Structural patterns that inflate bundles

- `packages/react/src/index.ts` acts as a monolithic entrypoint while the package already exposes subpath exports; the root export encourages wide imports.
- `packages/react/src/floating-ui-react/` re-exports a large surface area of `@floating-ui/react-dom`, increasing the chance that consumers pull more of the floating stack than needed.
- `packages/utils/src/store/StoreInspector.tsx` co-locates dev tooling UI with core store logic, which expands the default store entrypoint.

---

## Global Patterns Across Packages

- Repeated use of `enum` for string constants across many files.
- Widespread use of `export * from` barrels, including in type-focused modules.
- Dev/diagnostic utilities exported through primary entrypoints.
- Type-only modules importing runtime React symbols.

---

## Suggested Optimization Order

1. Entry-point slimming (root barrels, dev-only exports, type-only splits).
2. Replace enums-as-constants with `as const` objects and type aliases.
3. Reduce dependency surface (`reselect`, floating-ui re-exports).

---

## Notes

- Assumptions made: `StoreInspector` is not required in production bundles for most consumers.
- Areas needing human review: Confirm whether any `export *` barrels are relied on for side-effectful initialization.
