'use client';
import * as React from 'react';
import { Field } from '@base-ui/react/field';
import { Form } from '@base-ui/react/form';
import { Switch } from '@base-ui/react/switch';
import styles from './form.module.css';

/**
 * Repro: `Form.clearErrors` replaces the whole errors object using the value captured in the
 * render closure, so when several fields change within a single commit their clears collide and
 * only the last write survives.
 *
 * Steps:
 * 1. Leave both switches off and press "Sign up". A fake server response sets both errors.
 * 2. Press "Accept all" — it flips both switches in one commit.
 *
 * Expected: both errors clear, since both fields changed.
 * Actual: one error remains, on a field that is now switched on and still reports `aria-invalid`.
 *
 * Control: flipping the switches one at a time clears both errors, because each change lands in
 * its own commit and reads the updated errors object.
 */
export default function ClearErrorsExperiment() {
  const [errors, setErrors] = React.useState<Form.Props['errors']>({});
  const [newsletter, setNewsletter] = React.useState(false);
  const [terms, setTerms] = React.useState(false);
  const [pending, setPending] = React.useState(false);

  React.useEffect(() => {
    if (!pending) {
      return undefined;
    }

    const timeout = setTimeout(() => {
      setErrors({
        newsletter: 'Please opt in',
        terms: 'You must accept the terms',
      });
      setPending(false);
    }, 500);

    return () => clearTimeout(timeout);
  }, [pending]);

  return (
    <Form
      className={styles.Form}
      errors={errors}
      onSubmit={(event) => {
        event.preventDefault();
        setPending(true);
      }}
    >
      <Field.Root className={styles.Field} name="newsletter">
        <Field.Label className={styles.Label}>
          <Switch.Root
            className={styles.Switch}
            checked={newsletter}
            onCheckedChange={setNewsletter}
          >
            <Switch.Thumb className={styles.Thumb} />
          </Switch.Root>
          Newsletter
        </Field.Label>
        <Field.Error className={styles.Error} />
      </Field.Root>

      <Field.Root className={styles.Field} name="terms">
        <Field.Label className={styles.Label}>
          <Switch.Root className={styles.Switch} checked={terms} onCheckedChange={setTerms}>
            <Switch.Thumb className={styles.Thumb} />
          </Switch.Root>
          Terms
        </Field.Label>
        <Field.Error className={styles.Error} />
      </Field.Root>

      <button
        type="button"
        className={styles.Button}
        onClick={() => {
          // Both fields change in the same commit, so both call `clearErrors` against the same
          // captured errors object.
          setNewsletter(true);
          setTerms(true);
        }}
      >
        Accept all
      </button>

      <button type="submit" className={styles.Button} disabled={pending}>
        {pending ? 'Signing up…' : 'Sign up'}
      </button>

      <pre>{JSON.stringify(errors, null, 2)}</pre>
    </Form>
  );
}
