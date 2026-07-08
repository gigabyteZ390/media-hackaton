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
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
