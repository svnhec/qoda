import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

export const metadata: Metadata = {
  title: "Switchboard | Financial OS for AI Agents",
  description:
    "Issue virtual cards to AI agents, manage spend policies, and automate rebilling for AI Automation Agencies.",
  keywords: [
    "AI agents",
    "virtual cards",
    "spend management",
    "rebilling",
    "AI automation",
    "fintech",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} font-sans min-h-screen`}
      >
        {children}
      </body>
    </html>
  );
}

