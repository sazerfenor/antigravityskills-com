import { Metadata } from 'next';

/**
 * Preview layout - ensures noindex for all preview pages
 * This prevents search engines from indexing preview content
 */
export const metadata: Metadata = {
  title: 'Preview Mode',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function PreviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
