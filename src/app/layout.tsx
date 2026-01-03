import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { SWRProvider } from "@/components/providers/swr-provider";
import "./globals.css";

/**
 * QODA TYPOGRAPHY SYSTEM
 * =============================================================================
 * Inter Display: Headings & UI text (tracking-tight, bold)
 * JetBrains Mono: Financial data, IDs, terminal, code
 * 
 * Both fonts use CSS variable injection for Tailwind consumption.
 * =============================================================================
 */

// Inter - Primary UI font (display-optimized)
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
  weight: ["400", "500", "600", "700", "800"],
});

// JetBrains Mono - Financial data & code (tabular-nums by default)
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jetbrains",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Qoda | Financial Observability",
  description:
    "Monitor every transaction. Debug ledgers in real-time. The mission control for modern fintech stacks.",
  keywords: [
    "AI agents",
    "virtual cards",
    "spend management",
    "rebilling",
    "AI automation",
    "fintech",
    "financial observability",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans min-h-screen bg-background text-white antialiased`}
        suppressHydrationWarning
      >
        <ErrorBoundary level="page" showDetails={process.env.NODE_ENV === "development"}>
          <SWRProvider>
            {children}
          </SWRProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}

