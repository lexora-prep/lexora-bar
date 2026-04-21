import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getWorkspaceActor } from "../../../_lib"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ messageId: string }> }
) {
  const auth = await getWorkspaceActor()
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  }

  const { messageId } = await params

  try {
    const body = await req.json().catch(() => null)
    const emoji = typeof body?.emoji === "string" ? body.emoji.trim() : ""

    if (!emoji) {
      return NextResponse.json({ ok: false, error: "Emoji is required." }, { status: 400 })
    }

    const message = await prisma.workspace_messages.findUnique({
      where: { id: messageId },
      select: {
        id: true,
        is_deleted: true,
      },
    })

    if (!message) {
      return NextResponse.json({ ok: false, error: "Message not found." }, { status: 404 })
    }

    if (message.is_deleted) {
      return NextResponse.json(
        { ok: false, error: "Cannot react to a deleted message." },
        { status: 400 }
      )
    }

    const existing = await prisma.workspace_message_reactions.findFirst({
      where: {
        message_id: messageId,
        user_id: auth.actor.id,
        emoji,
      },
      select: { id: true },
    })

    if (existing) {
      await prisma.workspace_message_reactions.delete({
        where: { id: existing.id },
      })
    } else {
      await prisma.workspace_message_reactions.create({
        data: {
          message_id: messageId,
          user_id: auth.actor.id,
          emoji,
        },
      })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("POST WORKSPACE MESSAGE REACTION ERROR:", error)
    return NextResponse.json({ ok: false, error: "Failed to update reaction." }, { status: 500 })
  }
}