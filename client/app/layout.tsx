"use client";
import { Playfair_Display, Inter, JetBrains_Mono } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { Header } from "./components/layout";
import { DisclaimerModal } from "./components/modals";
import { StarknetProvider } from "./providers/starknet-provider";
import { ApolloGraphQLProvider } from "./providers/apollo-provider";
import { WalletModalProvider } from "./providers/wallet-modal-provider";
import { EVMProvider } from "./providers/evm-provider";
import { ToastProvider } from "./providers/toast-provider";
import { ErrorBoundary } from "./components/ui";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <title>Survivor Exchange - Find Your Next Champion</title>
        <meta
          name="description"
          content="Find your next champion. Buy, sell, and auction Loot Survivor beasts on Survivor Exchange."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <link rel="icon" href="/logo.png" />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Survivor Exchange" />
        <meta property="og:title" content="Survivor Exchange - Find Your Next Champion" />
        <meta property="og:description" content="Find your next champion. Buy, sell, and auction Loot Survivor beasts." />
        <meta property="og:image" content="/og-default.png" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Survivor Exchange - Find Your Next Champion" />
        <meta name="twitter:description" content="Find your next champion. Buy, sell, and auction Loot Survivor beasts." />
        <meta name="twitter:image" content="/og-default.png" />
      </head>
      <body
        className={`${playfair.variable} ${inter.variable} ${jetbrains.variable} antialiased`}
        style={{ backgroundColor: 'var(--color-bg)' }}
      >
        <EVMProvider>
          <ApolloGraphQLProvider>
            <StarknetProvider>
              <WalletModalProvider>
<ToastProvider>
                  <ErrorBoundary>
                    <Suspense>
                      <DisclaimerModal />
                      <Header />
                      {children}
                    </Suspense>
                  </ErrorBoundary>
                </ToastProvider>
              </WalletModalProvider>
            </StarknetProvider>
          </ApolloGraphQLProvider>
        </EVMProvider>
      </body>
    </html>
  );
}