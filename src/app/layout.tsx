import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cheran Co-operative Society Accounting System",
  description:
    "Production-ready accounting software with multi-bank aggregation, section accounting, double-entry ledger, and profit analysis.",
  icons: {
    icon: "/images/cheran_logo.png",
    shortcut: "/images/cheran_logo.png",
    apple: "/images/cheran_logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#f4f6f8] text-slate-900">{children}</body>
    </html>
  );
}
