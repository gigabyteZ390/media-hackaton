import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Political Statement Contradiction & Fact Checker",
  description:
    "Checks a politician's statements for self-consistency and factuality.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont/tabler-icons.min.css" />
      </head>
      <body className="min-h-screen antialiased font-sans">{children}</body>
    </html>
  );
}
