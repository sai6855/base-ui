'use client';
import * as React from 'react';
import { mergeProps } from '../../merge-props';
import { GenericHTMLProps } from '../../utils/types';
import { useBaseUiId } from '../../utils/useBaseUiId';
import { useForkRef } from '../../utils/useForkRef';
import { useCompositeListItem } from '../../composite/list/useCompositeListItem';
import type { TabsRootContext } from '../root/TabsRootContext';
import type { TabValue } from '../root/TabsRoot';
import { TabsPanelDataAttributes } from './TabsPanelDataAttributes';

export interface TabPanelMetadata {
  id?: string;
  value: useTabsPanel.Parameters['value'];
}

export function useTabsPanel(parameters: useTabsPanel.Parameters): useTabsPanel.ReturnValue {
  const {
    getTabIdByPanelValueOrIndex,
    rootRef: externalRef,
    selectedValue,
    value: valueParam,
  } = parameters;

  const id = useBaseUiId();

  const metadata = React.useMemo(
    () => ({
      id,
      value: valueParam,
    }),
    [id, valueParam],
  );

  const { ref: listItemRef, index } = useCompositeListItem<TabPanelMetadata>({
    metadata,
  });

  const tabPanelValue = valueParam ?? index;

  const panelRef = React.useRef<HTMLElement>(null);
  const handleRef = useForkRef(panelRef, listItemRef, externalRef);

  const hidden = tabPanelValue !== selectedValue;

  const correspondingTabId = React.useMemo(() => {
    return getTabIdByPanelValueOrIndex(valueParam, index);
  }, [getTabIdByPanelValueOrIndex, index, valueParam]);

  const getRootProps = React.useCallback(
    (externalProps = {}) => {
      return mergeProps(
        {
          'aria-labelledby': correspondingTabId,
          hidden,
          id: id ?? undefined,
          role: 'tabpanel',
          tabIndex: hidden ? -1 : 0,
          ref: handleRef,
          [TabsPanelDataAttributes.index]: index,
        },
        externalProps,
      );
    },
    [correspondingTabId, handleRef, hidden, id, index],
  );

  return {
    hidden,
    getRootProps,
    rootRef: handleRef,
  };
}

export namespace useTabsPanel {
  export interface Parameters extends Pick<TabsRootContext, 'getTabIdByPanelValueOrIndex'> {
    /**
     * The id of the TabPanel.
     */
    id?: string;
    /**
     * The ref of the TabPanel.
     */
    rootRef?: React.Ref<HTMLElement>;
    /**
     * The (context) value of the currently active/selected Tab.
     */
    selectedValue: TabValue;
    /**
     * The value of the TabPanel. It will be shown when the Tab with the corresponding value is selected.
     */
    value?: TabValue;
  }

  export interface ReturnValue {
    /**
     * Whether the tab panel will be hidden.
     */
    hidden: boolean;
    /**
     * Resolver for the TabPanel component's props.
     * @param externalProps additional props for Tabs.TabPanel
     * @returns props that should be spread on Tabs.TabPanel
     */
    getRootProps: (externalProps?: GenericHTMLProps) => GenericHTMLProps;
    rootRef: React.RefCallback<HTMLElement> | null;
  }
}
