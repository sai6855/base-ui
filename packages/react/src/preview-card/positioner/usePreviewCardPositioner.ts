import * as React from 'react';
import type {
  Padding,
  FloatingContext,
  VirtualElement,
  FloatingRootContext,
} from '@floating-ui/react';
import { mergeReactProps } from '../../utils/mergeReactProps';
import { Boundary, useAnchorPositioning, type Side } from '../../utils/useAnchorPositioning';
import type { GenericHTMLProps } from '../../utils/types';
import { usePreviewCardRootContext } from '../root/PreviewCardContext';

export function usePreviewCardPositioner(
  params: usePreviewCardPositioner.Parameters,
): usePreviewCardPositioner.ReturnValue {
  const { keepMounted, mounted } = params;

  const { open } = usePreviewCardRootContext();

  const {
    positionerStyles,
    arrowStyles,
    hidden,
    arrowRef,
    arrowUncentered,
    renderedSide,
    renderedAlignment,
    positionerContext,
  } = useAnchorPositioning(params);

  const getPositionerProps: usePreviewCardPositioner.ReturnValue['getPositionerProps'] =
    React.useCallback(
      (externalProps = {}) => {
        const hiddenStyles: React.CSSProperties = {};

        if ((keepMounted && !open) || hidden) {
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
      [positionerStyles, open, keepMounted, hidden, mounted],
    );

  return React.useMemo(
    () => ({
      getPositionerProps,
      arrowRef,
      arrowUncentered,
      arrowStyles,
      side: renderedSide,
      alignment: renderedAlignment,
      positionerContext,
    }),
    [
      getPositionerProps,
      arrowRef,
      arrowUncentered,
      arrowStyles,
      renderedSide,
      renderedAlignment,
      positionerContext,
    ],
  );
}

export namespace usePreviewCardPositioner {
  export interface SharedParameters {
    /**
     * The anchor element to which the preview card popup will be placed at.
     */
    anchor?:
      | Element
      | null
      | VirtualElement
      | React.MutableRefObject<Element | null>
      | (() => Element | VirtualElement | null);
    /**
     * The CSS position strategy for positioning the preview card popup element.
     * @default 'absolute'
     */
    positionMethod?: 'absolute' | 'fixed';
    /**
     * The container element to which the preview card popup will be appended to.
     */
    container?: HTMLElement | null | React.MutableRefObject<HTMLElement | null>;
    /**
     * The side of the anchor element that the preview card element should align to.
     * @default 'bottom'
     */
    side?: Side;
    /**
     * The gap between the anchor element and the preview card element.
     * @default 0
     */
    sideOffset?: number;
    /**
     * The alignment of the preview card element to the anchor element along its cross axis.
     * @default 'center'
     */
    alignment?: 'start' | 'end' | 'center';
    /**
     * The offset of the preview card element along its alignment axis.
     * @default 0
     */
    alignmentOffset?: number;
    /**
     * The boundary that the preview card element should be constrained to.
     * @default 'clipping-ancestors'
     */
    collisionBoundary?: Boundary;
    /**
     * The padding of the collision boundary.
     * @default 5
     */
    collisionPadding?: Padding;
    /**
     * If `true`, the preview card will be hidden if it is detached from its anchor element due to
     * differing clipping contexts.
     * @default false
     */
    hideWhenDetached?: boolean;
    /**
     * If `true`, allow the preview card to remain in stuck view while the anchor element is scrolled
     * out of view.
     * @default false
     */
    sticky?: boolean;
    /**
     * Determines the padding between the arrow and the preview card popup's edges. Useful when the
     * preview card popup has rounded corners via `border-radius`.
     * @default 5
     */
    arrowPadding?: number;
    /**
     * If `true`, preview card stays mounted in the DOM when closed.
     * @default false
     */
    keepMounted?: boolean;
    /**
     * Whether the preview card popup continuously tracks its anchor after the initial positioning
     * upon mount.
     * @default true
     */
    trackAnchor?: boolean;
  }

  export interface Parameters extends SharedParameters {
    /**
     * Whether the preview card is mounted.
     */
    mounted: boolean;
    /**
     * If `true`, the preview card is open.
     */
    open?: boolean;
    /**
     * The floating root context.
     */
    floatingRootContext?: FloatingRootContext;
  }

  export interface ReturnValue {
    /**
     * Props to spread on the preview card positioner element.
     */
    getPositionerProps: (externalProps?: GenericHTMLProps) => GenericHTMLProps;
    /**
     * The ref of the preview card arrow element.
     */
    arrowRef: React.MutableRefObject<Element | null>;
    /**
     * Determines if the arrow cannot be centered.
     */
    arrowUncentered: boolean;
    /**
     * The rendered side of the preview card element.
     */
    side: 'top' | 'right' | 'bottom' | 'left';
    /**
     * The rendered alignment of the preview card element.
     */
    alignment: 'start' | 'end' | 'center';
    /**
     * The styles to apply to the preview card arrow element.
     */
    arrowStyles: React.CSSProperties;
    /**
     * The floating context.
     */
    positionerContext: FloatingContext;
  }
}
