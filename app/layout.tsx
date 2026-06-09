import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
})

export const metadata: Metadata = {
  metadataBase: new URL("https://lexoraprep.com"),
  title: {
    default: "Lexora Prep",
    template: "%s | Lexora Prep",
  },
  description: "Structured bar exam memorization and progress tracking",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Lexora Prep",
    description: "Structured bar exam memorization and progress tracking",
    url: "https://lexoraprep.com/",
    siteName: "Lexora Prep",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Lexora Prep",
    description: "Structured bar exam memorization and progress tracking",
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>{children}</body>
    </html>
  )
}