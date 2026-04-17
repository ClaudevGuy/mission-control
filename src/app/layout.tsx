import type { Metadata } from "next";
import { Instrument_Sans, JetBrains_Mono, Fraunces } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import "./globals.css";

// Typography unified with the Mothership landing publication.
// Fraunces     — editorial display serif for all headings and numbers
// Instrument Sans — humanist UI sans for body, labels, buttons
// JetBrains Mono — code, timestamps, kbd, tags (unchanged)

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-heading",
  axes: ["opsz", "SOFT"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "MOTHERSHIP",
  description: "AI Project Command Center",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${instrumentSans.variable} ${fraunces.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body className="antialiased" suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              className: "!bg-card !border-border !text-foreground",
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
