import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'UA 360 IP Generator',
  description: 'Generate a complete IP ecosystem from a short idea',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

