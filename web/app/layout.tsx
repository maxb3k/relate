import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Relate Coach MVP",
  description: "Voice-first AI relationship coach"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
