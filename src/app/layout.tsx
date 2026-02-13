import type { Metadata } from "next";
import "./globals.css";
import ThemeRegistry from "@/components/ThemeRegistry";
import { ClientAuthProvider } from "@/components/ClientAuthProvider";

// Don't prerender pages that use auth context
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "ניהול שיפוצים - Renovation Management",
  description: "מערכת לניהול פרויקטי שיפוצים",
  icons: {
    icon: { url: '/favicon.svg', type: 'image/svg+xml' },
    apple: '/favicon.svg',
    shortcut: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" suppressHydrationWarning>
      <head>
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
