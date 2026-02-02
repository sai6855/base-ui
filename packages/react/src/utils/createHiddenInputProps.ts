import * as React from 'react';
import { visuallyHiddenInput } from '@base-ui/utils/visuallyHidden';

export interface CreateHiddenInputPropsOptions {
  type: 'checkbox' | 'radio';
  checked: boolean;
  disabled: boolean;
  required?: boolean;
  ref: React.Ref<HTMLInputElement>;
  id?: string;
  name?: string;
  readOnly?: boolean;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  onFocus: () => void;
}

export function createHiddenInputProps(
  options: CreateHiddenInputPropsOptions,
): React.ComponentPropsWithRef<'input'> {
  return {
    type: options.type,
    checked: options.checked,
    disabled: options.disabled,
    required: options.required,
    ref: options.ref,
    id: options.id,
    name: options.name,
    readOnly: options.readOnly,
    style: visuallyHiddenInput,
    tabIndex: -1,
    'aria-hidden': true,
    onChange: options.onChange,
    onFocus: options.onFocus,
  };
}
