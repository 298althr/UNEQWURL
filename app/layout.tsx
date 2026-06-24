import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./mobile.css";
import "./desktop.css";
import ThemeProvider from "@/components/ThemeProvider";
import { APP_NAME, APP_TAGLINE } from "@/lib/brand";

export const metadata: Metadata = {
  title: `${APP_NAME} — ${APP_TAGLINE}`,
  description: "Hear what better audio sounds like. Compare raw and UNEQWURL-enhanced sound in real time.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#080808" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var theme = localStorage.getItem('298eq-theme');
                var density = localStorage.getItem('298eq-density');
                var reducedMotion = localStorage.getItem('298eq-reduced-motion');
                var html = document.documentElement;
                if (theme === 'light' || theme === 'dark') html.setAttribute('data-theme', theme);
                else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) html.setAttribute('data-theme', 'light');
                if (density === 'compact') html.setAttribute('data-density', 'compact');
                if (reducedMotion === 'true') html.setAttribute('data-reduced-motion', 'true');
                if ('serviceWorker' in navigator) {
                  window.addEventListener('load', function() {
                    navigator.serviceWorker.register('/sw.js').catch(function() {});
                  });
                }
              })();
            `,
          }}
        />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
