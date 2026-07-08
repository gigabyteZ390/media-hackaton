import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Political Statement Contradiction & Fact Checker",
  description:
    "Checks a politician's statements for self-consistency and factuality.",
};

// Apply theme (.dark) and language (.lang-ko) before paint to avoid a flash.
const initScript = `(function(){try{
  var t=localStorage.getItem('theme')||'light';
  if(t==='dark')document.documentElement.classList.add('dark');
  var l=localStorage.getItem('lang')||'ko';
  if(l==='ko')document.documentElement.classList.add('lang-ko');
}catch(e){}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont/tabler-icons.min.css"
        />
        <script dangerouslySetInnerHTML={{ __html: initScript }} />
      </head>
      <body className="min-h-screen antialiased font-sans">{children}</body>
    </html>
  );
}
