import * as React from 'react';
import type {
  VirtualElement,
  Side,
  Padding,
  FloatingRootContext,
  FloatingContext,
  Middleware,
} from '@floating-ui/react';
import type { GenericHTMLProps } from '../../utils/types';
import { Boundary, useAnchorPositioning } from '../../utils/useAnchorPositioning';
import { mergeReactProps } from '../../utils/mergeReactProps';
import { useSelectRootContext } from '../root/SelectRootContext';
import { useScrollLock } from '../../utils/useScrollLock';

/**
 *
 * API:
 *
 * - [useSelectPositioner API](https://mui.com/base-ui/api/use-select-positioner/)
 */
export function useSelectPositioner(
  params: useSelectPositioner.Parameters,
): useSelectPositioner.ReturnValue {
  const { open, alignOptionToTrigger, mounted, triggerElement } = useSelectRootContext();

  useScrollLock(alignOptionToTrigger && mounted, triggerElement);

  const {
    positionerStyles: enabledPositionerStyles,
    arrowStyles,
    hidden,
    arrowRef,
    arrowUncentered,
    renderedSide,
    renderedAlignment,
    positionerContext,
    isPositioned,
  } = useAnchorPositioning({
    ...params,
    keepMounted: true,
    trackAnchor: params.trackAnchor ?? !alignOptionToTrigger,
    mounted,
  });

  const positionerStyles: React.CSSProperties = React.useMemo(
    () => (alignOptionToTrigger ? { position: 'fixed' } : enabledPositionerStyles),
    [alignOptionToTrigger, enabledPositionerStyles],
  );

  const getPositionerProps: useSelectPositioner.ReturnValue['getPositionerProps'] =
    React.useCallback(
      (externalProps = {}) => {
        const hiddenStyles: React.CSSProperties = {};

        if (!open || hidden) {
          hiddenStyles.pointerEvents = 'none';
        }

        return mergeReactProps<'div'>(externalProps, {
          role: 'presentation',
          hidden: !mounted,
          style: {
            ...positionerStyles,
            ...hiddenStyles,
          },
        });
      },
      [open, hidden, mounted, positionerStyles],
    );

  const positioner = React.useMemo(
    () =>
      ({
        arrowRef,
        arrowUncentered,
        arrowStyles,
        side: alignOptionToTrigger ? 'none' : renderedSide,
        alignment: renderedAlignment,
        positionerContext,
        isPositioned,
      }) as const,
    [
      alignOptionToTrigger,
      arrowRef,
      arrowStyles,
      arrowUncentered,
      isPositioned,
      positionerContext,
      renderedAlignment,
      renderedSide,
    ],
  );

  return React.useMemo(
    () => ({
      getPositionerProps,
      positioner,
    }),
    [getPositionerProps, positioner],
  );
}

export namespace useSelectPositioner {
  export interface SharedParameters {
    /**
     * The anchor element to which the Select popup will be placed at.
     */
    anchor?:
      | Element
      | null
      | VirtualElement
      | React.MutableRefObject<Element | null>
      | (() => Element | VirtualElement | null);
    /**
     * The CSS position method for positioning the Select popup element.
     * @default 'absolute'
     */
    positionMethod?: 'absolute' | 'fixed';
    /**
     * The container element to which the Select popup will be appended to.
     */
    container?: HTMLElement | null | React.MutableRefObject<HTMLElement | null>;
    /**
     * The side of the anchor element that the Select element should align to.
     * @default 'bottom'
     */
    side?: Side;
    /**
     * The gap between the anchor element and the Select element.
     * @default 0
     */
    sideOffset?: number;
    /**
     * The alignment of the Select element to the anchor element along its cross axis.
     * @default 'start'
     */
    alignment?: 'start' | 'end' | 'center';
    /**
     * The offset of the Select element along its alignment axis.
     * @default 0
     */
    alignmentOffset?: number;
    /**
     * The boundary that the Select element should be constrained to.
     * @default 'clipping-ancestors'
     */
    collisionBoundary?: Boundary;
    /**
     * The padding of the collision boundary.
     * @default 5
     */
    collisionPadding?: Padding;
    /**
     * If `true`, the Select will be hidden if it is detached from its anchor element due to
     * differing clipping contexts.
     * @default false
     */
    hideWhenDetached?: boolean;
    /**
     * Whether the select popup remains mounted in the DOM while closed.
     * @default true
     */
    keepMounted?: boolean;
    /**
     * If `true`, allow the Select to remain in stuck view while the anchor element is scrolled out
     * of view.
     * @default false
     */
    sticky?: boolean;
    /**
     * Determines the padding between the arrow and the Select popup's edges. Useful when the popover
     * popup has rounded corners via `border-radius`.
     * @default 5
     */
    arrowPadding?: number;
    /**
     * Whether the select popup continuously tracks its anchor after the initial positioning upon mount.
     * @default true
     */
    trackAnchor?: boolean;
  }

  export interface Parameters extends SharedParameters {
    /**
     * If `true`, the Select is mounted.
     */
    mounted: boolean;
    /**
     * If `true`, the Select is open.
     */
    open?: boolean;
    /**
     * The Select root context.
     */
    floatingRootContext?: FloatingRootContext;
    /**
     * Floating node id.
     */
    nodeId?: string;
    /**
     * If specified, positions the popup relative to the selected option inside it.
     */
    inner?: Middleware;
    /**
     * Whether the floating element can flip to the perpendicular axis if it cannot fit in the
     * viewport.
     * @default true
     */
    allowAxisFlip?: boolean;
    /**
     * Whether to use fallback anchor postioning because anchoring to an inner item results in poor
     * UX.
     * @default false
     */
    innerFallback?: boolean;
    /**
     * Whether the user's current modality is touch.
     * @default false
     */
    touchModality?: boolean;
  }

  export interface ReturnValue {
    /**
     * Props to spread on the Select positioner element.
     */
    getPositionerProps: (externalProps?: GenericHTMLProps) => GenericHTMLProps;
    /**
     * The Select positioner context.
     */
    positioner: {
      /**
       * The ref of the Select arrow element.
       */
      arrowRef: React.MutableRefObject<Element | null>;
      /**
       * Determines if the arrow cannot be centered.
       */
      arrowUncentered: boolean;
      /**
       * The rendered side of the Select element.
       */
      side: 'top' | 'right' | 'bottom' | 'left' | 'none';
      /**
       * The rendered alignment of the Select element.
       */
      alignment: 'start' | 'end' | 'center';
      /**
       * The styles to apply to the Select arrow element.
       */
      arrowStyles: React.CSSProperties;
      /**
       * The floating context.
       */
      positionerContext: FloatingContext;
      /**
       * Whether the Select popup has been positioned.
       */
      isPositioned: boolean;
    };
  }
}
