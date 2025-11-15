import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Core Functions Viewer",
  description: "UA Ontology - Core Functions Viewer",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}

