'use client';
import * as React from 'react';
import PropTypes from 'prop-types';
import type { BaseUIComponentProps } from '../../utils/types';
import { useComponentRenderer } from '../../utils/useComponentRenderer';
import { mergeReactProps } from '../../utils/mergeReactProps';
import { FormRootContext } from './FormRootContext';
import { useEventCallback } from '../../utils/useEventCallback';

/**
 *
 * Demos:
 *
 * - [Form](https://base-ui.com/components/react-form/)
 *
 * API:
 *
 * - [FormRoot API](https://base-ui.com/components/react-form/#api-reference-FormRoot)
 */
const FormRoot = React.forwardRef(function FormRoot(
  props: FormRoot.Props,
  forwardedRef: React.ForwardedRef<HTMLFormElement>,
) {
  const {
    render,
    className,
    errors,
    onClearErrors: onClearErrorsProp,
    onSubmit: onSubmitProp,
    ...otherProps
  } = props;

  const formRef = React.useRef<FormRootContext['formRef']['current']>({
    fields: new Map(),
  });

  const onSubmit = useEventCallback(onSubmitProp || (() => {}));
  const onClearErrors = useEventCallback(onClearErrorsProp || (() => {}));

  const getFormProps = React.useCallback(
    (externalProps = {}) =>
      mergeReactProps<'form'>(externalProps, {
        noValidate: true,
        onSubmit(event) {
          let values = Array.from(formRef.current.fields.values());

          // Async validation isn't supported to stop the submit event.
          values.forEach((field) => {
            field.validate();
          });

          values = Array.from(formRef.current.fields.values());

          const invalidFields = values.filter((field) => !field.validityData.state.valid);

          if (invalidFields.length) {
            event.preventDefault();
            invalidFields[0]?.controlRef.current?.focus();
          } else {
            onSubmit(event as any);
          }
        },
      }),
    [onSubmit],
  );

  React.useEffect(() => {
    const invalidFields = Array.from(formRef.current.fields.values()).filter(
      (field) => field.validityData.state.valid === false,
    );

    if (invalidFields.length) {
      invalidFields[0]?.controlRef.current?.focus();
    }
  }, [errors]);

  const state = React.useMemo<FormRoot.State>(() => ({}), []);

  const { renderElement } = useComponentRenderer({
    propGetter: getFormProps,
    render: render ?? 'form',
    ref: forwardedRef,
    state,
    className,
    extraProps: otherProps,
  });

  const contextValue: FormRootContext = React.useMemo(
    () => ({ formRef, errors: errors ?? {}, onClearErrors }),
    [formRef, errors, onClearErrors],
  );

  return (
    <FormRootContext.Provider value={contextValue}>{renderElement()}</FormRootContext.Provider>
  );
});

namespace FormRoot {
  export interface Props extends BaseUIComponentProps<'form', State> {
    /**
     * Object of error messages with each key mapping to the `name` prop of a Field control, usually
     * from server-side validation.
     */
    errors?: FormRootContext['errors'];
    /**
     * Callback fired when the external server-side `error` messages should be cleared.
     */
    onClearErrors?: FormRootContext['onClearErrors'];
  }
  export interface State {}
}

FormRoot.propTypes /* remove-proptypes */ = {
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
   * Object of error messages with each key mapping to the `name` prop of a Field control, usually
   * from server-side validation.
   */
  errors: PropTypes.object,
  /**
   * Callback fired when the external server-side `error` messages should be cleared.
   */
  onClearErrors: PropTypes.func,
  /**
   * @ignore
   */
  onSubmit: PropTypes.func,
  /**
   * A function to customize rendering of the component.
   */
  render: PropTypes.oneOfType([PropTypes.element, PropTypes.func]),
} as any;

export { FormRoot };
