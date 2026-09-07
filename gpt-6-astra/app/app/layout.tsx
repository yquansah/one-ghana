import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'One Ghana — The Presidency',
  icons: { icon: '/favicon.svg' },
  description:
    'Govern Ghana through a transparent learning simulation of economic policy, institutions, and household welfare.',
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
