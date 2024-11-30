'use client';
import * as React from 'react';
import { Collapsible } from '@base-ui-components/react/collapsible';
import classes from './collapsible.module.css';

function classNames(...c: Array<string | undefined | null | false>) {
  return c.filter(Boolean).join(' ');
}

export default function CollapsibleTransitions() {
  return (
    <div className={classes.grid}>
      <div>
        <Collapsible.Root defaultOpen={false}>
          <Collapsible.Trigger className={classes.trigger}>
            <ExpandMoreIcon className={classes.icon} />
            Trigger 1A
          </Collapsible.Trigger>
          <Collapsible.Panel
            className={classNames(classes.panel, classes.transition)}
          >
            <p>This is the collapsed content</p>
            <p>
              You can find the Base UI repository{' '}
              <a
                href="https://github.com/mui/base-ui"
                target="_blank"
                rel="noreferrer noopener"
              >
                here
              </a>
            </p>
          </Collapsible.Panel>
        </Collapsible.Root>
      </div>

      <div>
        <Collapsible.Root>
          <Collapsible.Trigger className={classes.trigger}>
            <ExpandMoreIcon className={classes.icon} />
            Trigger 1B
          </Collapsible.Trigger>
          <Collapsible.Panel
            className={classNames(classes.panel, classes.transition)}
          >
            <p>This is the collapsed content</p>
            <p>
              You can find the Base UI repository{' '}
              <a
                href="https://github.com/mui/base-ui"
                target="_blank"
                rel="noreferrer noopener"
              >
                here
              </a>
            </p>
          </Collapsible.Panel>
        </Collapsible.Root>
      </div>
    </div>
  );
}

function ExpandMoreIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      {...props}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
    >
      <path d="M16.59 8.59 12 13.17 7.41 8.59 6 10l6 6 6-6z" fill="currentColor" />
    </svg>
  );
}