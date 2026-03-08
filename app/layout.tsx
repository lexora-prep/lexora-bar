import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Sidebar from "./components/Sidebar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lexora Bar Prep",
  description: "AI powered bar exam training",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable}`}
        style={{
          margin: 0,
          display: "flex",
          height: "100vh",
          background: "#f6f8fb",
        }}
      >
        <Sidebar />

        <div
          style={{
            flex: 1,
            overflow: "auto",
          }}
        >
          {children}
        </div>
      </body>
    </html>
  );
}