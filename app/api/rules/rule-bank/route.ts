import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET() {

  const subjects = await prisma.subject.findMany({
    include: {
      topics: {
        include: {
          rules: {
            include: {
              keywords: true
            }
          }
        }
      }
    }
  })

  return NextResponse.json({ subjects })
}