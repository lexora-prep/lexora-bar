import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET() {
  const subjects = await prisma.subjects.findMany({
    include: {
      topics: {
        include: {
          rules: true
        }
      }
    }
  })

  return NextResponse.json({ subjects })
}
