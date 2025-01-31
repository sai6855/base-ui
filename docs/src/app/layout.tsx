import { Metadata } from 'next';
import * as React from 'react';
import { DocsProviders } from './DocsProviders';
import { Favicons } from './Favicons';
import { GoogleAnalytics } from '../components/GoogleAnalytics';

export default function Layout({ children }: React.PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="initial-scale=1, width=device-width" />
        <Favicons />

        {/* iOS header background */}
        <meta
          name="theme-color"
          content="oklch(98% 0.25% 264)"
          media="(prefers-color-scheme: light)"
        />
        <meta
          name="theme-color"
          content="oklch(17% 1% 264)"
          media="(prefers-color-scheme: dark)"
        />
      </head>
      <body>
        <DocsProviders>
          {children}
          <GoogleAnalytics />
        </DocsProviders>
      </body>
    </html>
  );
}

export const metadata: Metadata = {
  title: {
    template: '%s · Base UI',
    default: 'Base UI',
  },
  twitter: {
    site: '@Base_UI',
    card: 'summary_large_image',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    title: {
      template: '%s · Base UI',
      default: 'Base UI',
    },
    ttl: 604800,
  },
};
