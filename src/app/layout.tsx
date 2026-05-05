import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "STRATEGOS — Intelligence Platform",
  description: "Multi-Source Ground Truth Intelligence Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full" data-theme="dark" data-density="comfortable">
      <body className="h-full">{children}</body>
    </html>
  );
}
