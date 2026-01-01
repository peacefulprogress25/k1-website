import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "K1 — Energy-backed stablecoin",
  description:
    "K1 is an energy-backed stablecoin financing the transition to a Kardashev Type I civilization.",
  icons: {
    icon: "/favicon.png", // change to /favicon.ico if you used that
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
