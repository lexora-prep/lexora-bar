import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getWorkspaceActor } from "../_lib"

export async function POST(req: Request) {
  const auth = await getWorkspaceActor()
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  }

  try {
    const body = await req.json().catch(() => null)
    const recipientId = typeof body?.recipientId === "string" ? body.recipientId : ""
    const message = typeof body?.message === "string" ? body.message.trim() : ""

    if (!recipientId || !message) {
      return NextResponse.json(
        { ok: false, error: "Recipient and message are required." },
        { status: 400 }
      )
    }

    const existingMemberships = await prisma.workspace_direct_thread_members.findMany({
      where: {
        user_id: {
          in: [auth.actor.id, recipientId],
        },
      },
      select: {
        thread_id: true,
        user_id: true,
      },
    })

    let threadId: string | null = null
    const grouped = new Map<string, string[]>()

    for (const item of existingMemberships) {
      const arr = grouped.get(item.thread_id) || []
      arr.push(item.user_id)
      grouped.set(item.thread_id, arr)
    }

    for (const [candidateThreadId, users] of grouped.entries()) {
      const unique = Array.from(new Set(users))
      if (unique.length === 2 && unique.includes(auth.actor.id) && unique.includes(recipientId)) {
        threadId = candidateThreadId
        break
      }
    }

    if (!threadId) {
      const thread = await prisma.workspace_direct_threads.create({
        data: {
          created_by: auth.actor.id,
        },
        select: { id: true },
      })

      threadId = thread.id

      await prisma.workspace_direct_thread_members.createMany({
        data: [
          { thread_id: threadId, user_id: auth.actor.id },
          { thread_id: threadId, user_id: recipientId },
        ],
        skipDuplicates: true,
      })
    }

    await prisma.workspace_direct_messages.create({
      data: {
        thread_id: threadId,
        author_id: auth.actor.id,
        content: message,
        read_by: [auth.actor.id],
      },
    })

    return NextResponse.json({ ok: true, threadId })
  } catch (error) {
    console.error("POST DM ERROR:", error)
    return NextResponse.json({ ok: false, error: "Failed to send DM." }, { status: 500 })
  }
}