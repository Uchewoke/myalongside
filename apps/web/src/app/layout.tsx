import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "MyAlongside — You Don't Have to Face It Alone",
  description:
    "Connect with mentors who have lived through the same life challenges you're facing. Peer support that actually understands.",
  keywords: [
    "peer support",
    "mentorship",
    "life events",
    "mental health",
    "community",
    "divorce support",
    "grief support",
  ],
  openGraph: {
    title: "MyAlongside — Peer Mentorship for Life's Hardest Moments",
    description:
      "Find a mentor who truly gets it — because they've been there.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
