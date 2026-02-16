import type { Metadata } from "next";
import "./globals.css";
import ThemeRegistry from "@/components/ThemeRegistry";
import { ClientAuthProvider } from "@/components/ClientAuthProvider";

// Don't prerender pages that use auth context
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "ניהול שיפוצים - Renovation Management",
  description: "מערכת לניהול פרויקטי שיפוצים",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon-32x32.png" type="image/png" sizes="32x32" />
        <link rel="icon" href="/favicon-16x16.png" type="image/png" sizes="16x16" />
        <link rel="apple-touch-icon" href="/favicon_full_512.png" sizes="512x512" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Rubik:wght@300;400;500;700&display=swap"
        />
      </head>
      <body suppressHydrationWarning>
        <ThemeRegistry>
          <ClientAuthProvider>
            {children}
          </ClientAuthProvider>
        </ThemeRegistry>
      </body>
    </html>
  );
}
