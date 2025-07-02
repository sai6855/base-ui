'use client';
import * as React from 'react';
import type { BaseUIComponentProps, Orientation as BaseOrientation } from '../../utils/types';
import { useControlled } from '../../utils/useControlled';
import { useEventCallback } from '../../utils/useEventCallback';
import { useRenderElement } from '../../utils/useRenderElement';
import { CompositeList } from '../../composite/list/CompositeList';
import type { CompositeMetadata } from '../../composite/list/CompositeList';
import { useDirection } from '../../direction-provider/DirectionContext';
import { TabsRootContext } from './TabsRootContext';
import { tabsStyleHookMapping } from './styleHooks';
import type { TabsTab } from '../tab/TabsTab';
import type { TabsPanel } from '../panel/TabsPanel';

/**
 * Groups the tabs and the corresponding panels.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Tabs](https://base-ui.com/react/components/tabs)
 */
export const TabsRoot = React.forwardRef(function TabsRoot(
  componentProps: TabsRoot.Props,
  forwardedRef: React.ForwardedRef<HTMLDivElement>,
) {
  const {
    className,
    defaultValue,
    onValueChange: onValueChangeProp,
    orientation = 'horizontal',
    render,
    value: valueProp,
    ...elementProps
  } = componentProps;

  const direction = useDirection();

  const tabPanelRefs = React.useRef<(HTMLElement | null)[]>([]);

  // Track whether defaultValue was explicitly provided
  const wasDefaultValueProvided = React.useRef(defaultValue !== undefined);
  const wasValueProvided = React.useRef(valueProp !== undefined);

  // Calculate the computed default value
  const computedDefaultValue = React.useMemo(() => {
    // If explicit defaultValue or value was provided, use defaultValue (or 0 if defaultValue is undefined but value is provided)
    if (wasDefaultValueProvided.current || wasValueProvided.current) {
      return defaultValue ?? 0;
    }
    // If neither was provided, we'll compute the first non-disabled tab dynamically
    return 0; // Initial fallback, will be updated when tabs are registered
  }, [defaultValue]);

  const [value, setValue] = useControlled({
    controlled: valueProp,
    default: computedDefaultValue,
    name: 'Tabs',
    state: 'value',
  });

  const [tabPanelMap, setTabPanelMap] = React.useState(
    () => new Map<Node, CompositeMetadata<TabsPanel.Metadata> | null>(),
  );
  const [tabMap, setTabMap] = React.useState(
    () => new Map<Node, CompositeMetadata<TabsTab.Metadata> | null>(),
  );

  const [tabActivationDirection, setTabActivationDirection] =
    React.useState<TabsTab.ActivationDirection>('none');

  // Track if we've performed the initial disabled tab check
  const hasPerformedInitialCheck = React.useRef(false);

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

  // Effect to handle initial tab selection when no explicit value/defaultValue was provided
  React.useEffect(() => {
    // Only run this logic if:
    // 1. We haven't performed the initial check yet
    // 2. No explicit value or defaultValue was provided by the user
    // 3. We have tabs registered
    // 4. We're not in controlled mode
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
        // Check if current tab is disabled
        const currentTabMetadata = Array.from(tabMap.values()).find(
          (metadata) => metadata && (metadata.value ?? metadata.index) === value
        );

        if (currentTabMetadata?.disabled) {
          setValue(firstNonDisabledTab);
        }
      }
    }
  }, [
    tabMap,
    value,
    setValue,
    valueProp,
    findFirstNonDisabledTab,
  ]);

  const onValueChange = useEventCallback(
    (
      newValue: TabsTab.Value,
      activationDirection: TabsTab.ActivationDirection,
      event: Event | undefined,
    ) => {
      setValue(newValue);
      setTabActivationDirection(activationDirection);
      onValueChangeProp?.(newValue, event);
    },
  );

  // get the `id` attribute of <Tabs.Panel> to set as the value of `aria-controls` on <Tabs.Tab>
  const getTabPanelIdByTabValueOrIndex = React.useCallback(
    (tabValue: TabsTab.Value | undefined, index: number) => {
      if (tabValue === undefined && index < 0) {
        return undefined;
      }

      for (const tabPanelMetadata of tabPanelMap.values()) {
        // find by tabValue
        if (tabValue !== undefined && tabPanelMetadata && tabValue === tabPanelMetadata?.value) {
          return tabPanelMetadata.id;
        }

        // find by index
        if (
          tabValue === undefined &&
          tabPanelMetadata?.index &&
          tabPanelMetadata?.index === index
        ) {
          return tabPanelMetadata.id;
        }
      }

      return undefined;
    },
    [tabPanelMap],
  );

  // get the `id` attribute of <Tabs.Tab> to set as the value of `aria-labelledby` on <Tabs.Panel>
  const getTabIdByPanelValueOrIndex = React.useCallback(
    (tabPanelValue: TabsTab.Value | undefined, index: number) => {
      if (tabPanelValue === undefined && index < 0) {
        return undefined;
      }

      for (const tabMetadata of tabMap.values()) {
        // find by tabPanelValue
        if (
          tabPanelValue !== undefined &&
          index > -1 &&
          tabPanelValue === (tabMetadata?.value ?? tabMetadata?.index ?? undefined)
        ) {
          return tabMetadata?.id;
        }

        // find by index
        if (
          tabPanelValue === undefined &&
          index > -1 &&
          index === (tabMetadata?.value ?? tabMetadata?.index ?? undefined)
        ) {
          return tabMetadata?.id;
        }
      }

      return undefined;
    },
    [tabMap],
  );

  // used in `useActivationDirectionDetector` for setting data-activation-direction
  const getTabElementBySelectedValue = React.useCallback(
    (selectedValue: TabsTab.Value | undefined): HTMLElement | null => {
      if (selectedValue === undefined) {
        return null;
      }

      for (const [tabElement, tabMetadata] of tabMap.entries()) {
        if (tabMetadata != null && selectedValue === (tabMetadata.value ?? tabMetadata.index)) {
          return tabElement as HTMLElement;
        }
      }

      return null;
    },
    [tabMap],
  );

  const tabsContextValue: TabsRootContext = React.useMemo(
    () => ({
      direction,
      getTabElementBySelectedValue,
      getTabIdByPanelValueOrIndex,
      getTabPanelIdByTabValueOrIndex,
      onValueChange,
      orientation,
      setTabMap,
      tabActivationDirection,
      value,
    }),
    [
      direction,
      getTabElementBySelectedValue,
      getTabIdByPanelValueOrIndex,
      getTabPanelIdByTabValueOrIndex,
      onValueChange,
      orientation,
      setTabMap,
      tabActivationDirection,
      value,
    ],
  );

  const state: TabsRoot.State = {
    orientation,
    tabActivationDirection,
  };

  const element = useRenderElement('div', componentProps, {
    state,
    ref: forwardedRef,
    props: elementProps,
    customStyleHookMapping: tabsStyleHookMapping,
  });

  return (
    <TabsRootContext.Provider value={tabsContextValue}>
      <CompositeList<TabsPanel.Metadata> elementsRef={tabPanelRefs} onMapChange={setTabPanelMap}>
        {element}
      </CompositeList>
    </TabsRootContext.Provider>
  );
});

export namespace TabsRoot {
  export type Orientation = BaseOrientation;

  export type State = {
    /**
     * @type Tabs.Root.Orientation
     */
    orientation: Orientation;
    /**
     * @type Tabs.Tab.ActivationDirection
     */
    tabActivationDirection: TabsTab.ActivationDirection;
  };

  export interface Props extends BaseUIComponentProps<'div', State> {
    /**
     * The value of the currently selected `Tab`. Use when the component is controlled.
     * When the value is `null`, no Tab will be selected.
     * @type Tabs.Tab.Value
     */
    value?: TabsTab.Value;
    /**
     * The default value. Use when the component is not controlled.
     * When the value is `null`, no Tab will be selected.
     * When no defaultValue is provided, the first non-disabled tab will be selected automatically.
     * @type Tabs.Tab.Value
     * @default 0 (or first non-disabled tab if not explicitly set)
     */
    defaultValue?: TabsTab.Value;
    /**
     * The component orientation (layout flow direction).
     * @type Tabs.Root.Orientation
     * @default 'horizontal'
     */
    orientation?: Orientation;
    /**
     * Callback invoked when new value is being set.
     */
    onValueChange?: (value: TabsTab.Value, event?: Event) => void;
  }
}
