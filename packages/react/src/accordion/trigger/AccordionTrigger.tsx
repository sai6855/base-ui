'use client';
import * as React from 'react';
import PropTypes from 'prop-types';
import { triggerOpenStateMapping } from '../../utils/collapsibleOpenStateMapping';
import { useComponentRenderer } from '../../utils/useComponentRenderer';
import { useEnhancedEffect } from '../../utils/useEnhancedEffect';
import { BaseUIComponentProps } from '../../utils/types';
import { useCollapsibleRootContext } from '../../collapsible/root/CollapsibleRootContext';
import { useCollapsibleTrigger } from '../../collapsible/trigger/useCollapsibleTrigger';
import type { AccordionItem } from '../item/AccordionItem';
import { useAccordionItemContext } from '../item/AccordionItemContext';

/**
 *
 * Demos:
 *
 * - [Accordion](https://base-ui.com/components/react-accordion/)
 *
 * API:
 *
 * - [AccordionTrigger API](https://base-ui.com/components/react-accordion/#api-reference-AccordionTrigger)
 */

const AccordionTrigger = React.forwardRef(function AccordionTrigger(
  props: AccordionTrigger.Props,
  forwardedRef: React.ForwardedRef<Element>,
) {
  const { disabled: disabledProp, className, id, render, ...otherProps } = props;

  const { panelId, disabled: contextDisabled, open, setOpen } = useCollapsibleRootContext();

  const { getRootProps } = useCollapsibleTrigger({
    panelId,
    disabled: disabledProp || contextDisabled,
    id,
    open,
    rootRef: forwardedRef,
    setOpen,
  });

  const { state, setTriggerId, triggerId } = useAccordionItemContext();

  useEnhancedEffect(() => {
    setTriggerId(id);
    return () => {
      setTriggerId(undefined);
    };
  }, [id, setTriggerId]);

  const { renderElement } = useComponentRenderer({
    propGetter: getRootProps,
    render: render ?? 'button',
    state,
    className,
    extraProps: { ...otherProps, id: triggerId },
    customStyleHookMapping: triggerOpenStateMapping,
  });

  return renderElement();
});

namespace AccordionTrigger {
  export interface Props extends BaseUIComponentProps<'button', AccordionItem.State> {}
}

export { AccordionTrigger };

AccordionTrigger.propTypes /* remove-proptypes */ = {
  // ┌────────────────────────────── Warning ──────────────────────────────┐
  // │ These PropTypes are generated from the TypeScript type definitions. │
  // │ To update them, edit the TypeScript types and run `pnpm proptypes`. │
  // └─────────────────────────────────────────────────────────────────────┘
  /**
   * @ignore
   */
  children: PropTypes.node,
  /**
   * Class names applied to the element or a function that returns them based on the component's state.
   */
  className: PropTypes.oneOfType([PropTypes.func, PropTypes.string]),
  /**
   * @ignore
   */
  disabled: PropTypes.bool,
  /**
   * @ignore
   */
  id: PropTypes.string,
  /**
   * A function to customize rendering of the component.
   */
  render: PropTypes.oneOfType([PropTypes.element, PropTypes.func]),
} as any;
