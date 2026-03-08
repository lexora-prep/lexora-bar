"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

export default function Sidebar() {
  const pathname = usePathname()

  const menu = [
    { name: "Dashboard", href: "/dashboard" },
    { name: "Rule Training", href: "/rule-training" },
    { name: "MBE", href: "/mbe" },
    { name: "Flashcards", href: "/flashcards" },
    { name: "Weak Areas", href: "/weak-areas" },
    { name: "Rule Bank", href: "/rule-bank" },
    { name: "Analytics", href: "/analytics" },
    { name: "Review", href: "/review" },
    { name: "Settings", href: "/settings" },
  ]

  return (
    <div
      style={{
        width: 240,
        height: "100vh",
        background: "#0f172a",
        color: "white",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "20px 16px",
      }}
    >

      {/* TOP */}
      <div>
        <div
          style={{
            fontSize: 22,
            fontWeight: 700,
            marginBottom: 30,
          }}
        >
          Lexora
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {menu.map((item) => {
            const active = pathname === item.href

            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  padding: "10px 12px",
                  borderRadius: 8,
                  textDecoration: "none",
                  color: "white",
                  background: active ? "#1e293b" : "transparent",
                  fontSize: 15,
                }}
              >
                {item.name}
              </Link>
            )
          })}
        </div>
      </div>


      {/* BOTTOM USER PROFILE */}
      <div
        style={{
          borderTop: "1px solid #1e293b",
          paddingTop: 14,
          display: "flex",
          alignItems: "center",
          gap: 10,
          cursor: "pointer",
        }}
      >

        {/* Avatar */}
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: "50%",
            background: "#334155",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          JD
        </div>

        {/* User Info */}
        <div style={{ lineHeight: 1.2 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>
            James Davidson
          </div>

          <div style={{ fontSize: 12, opacity: 0.7 }}>
            Kentucky · Jul 2025
          </div>
        </div>
      </div>

    </div>
  )
}