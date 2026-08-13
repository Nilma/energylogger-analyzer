import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "EnergyLogger Analyzer",
  description: "Upload an energy measurement CSV and analyze energy consumption."
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
