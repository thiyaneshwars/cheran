import type { Metadata } from "next";
import { Newsreader, Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-code",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Cheran Co-operative Society | Accounting & Production Ledger",
  description:
    "Statutory accounting, powerloom Dhothi and Saree piece registers, godown inventory, and Co-optex dispatch monitoring for Cheran Co-operative Weavers Society.",
  icons: {
    icon: "/images/cheran_logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${newsreader.variable} ${plusJakarta.variable} ${jetbrainsMono.variable}`}
    >
      <body className="antialiased selection:bg-[#14233C] selection:text-[#FAF7F0]">
        {children}
      </body>
    </html>
  );
}
