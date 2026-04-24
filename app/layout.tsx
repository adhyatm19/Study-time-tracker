import type { Metadata } from "next";
import { type ReactNode } from "react";

import "@/app/globals.css";

import { ThemeProvider } from "@/components/shared/theme-provider";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: `${APP_NAME} | Study time tracking for friend groups`,
  description:
    "A minimalist study time tracking app with Supabase auth, personal analytics, ambient audio, and a private group leaderboard."
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-svh bg-background font-sans text-foreground">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
