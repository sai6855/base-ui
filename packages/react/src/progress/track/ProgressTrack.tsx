'use client';
import * as React from 'react';
import PropTypes from 'prop-types';
import { useComponentRenderer } from '../../utils/useComponentRenderer';
import { useProgressRootContext } from '../root/ProgressRootContext';
import { progressStyleHookMapping } from '../root/styleHooks';
import { ProgressRoot } from '../root/ProgressRoot';
import { BaseUIComponentProps } from '../../utils/types';

/**
 *
 * Demos:
 *
 * - [Progress](https://base-ui.com/components/react-progress/)
 *
 * API:
 *
 * - [ProgressTrack API](https://base-ui.com/components/react-progress/#api-reference-ProgressTrack)
 */
const ProgressTrack = React.forwardRef(function ProgressTrack(
  props: ProgressTrack.Props,
  forwardedRef: React.ForwardedRef<HTMLSpanElement>,
) {
  const { render, className, ...otherProps } = props;

  const { state } = useProgressRootContext();

  const { renderElement } = useComponentRenderer({
    render: render ?? 'span',
    state,
    className,
    ref: forwardedRef,
    extraProps: otherProps,
    customStyleHookMapping: progressStyleHookMapping,
  });

  return renderElement();
});

namespace ProgressTrack {
  export interface State extends ProgressRoot.State {}

  export interface Props extends BaseUIComponentProps<'span', State> {}
}

ProgressTrack.propTypes /* remove-proptypes */ = {
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
   * A function to customize rendering of the component.
   */
  render: PropTypes.oneOfType([PropTypes.element, PropTypes.func]),
} as any;

export { ProgressTrack };
