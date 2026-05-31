import { prisma } from "@/lib/prisma"
import type { Prisma } from "@prisma/client"

type UserNotificationSeverity = "low" | "normal" | "high" | "critical"

type CreateUserNotificationInput = {
  userId: string
  type?: string
  title: string
  body?: string | null
  link?: string | null
  severity?: UserNotificationSeverity
  metadata?: Prisma.InputJsonValue
}

type LogUserActivityInput = {
  userId: string
  actorUserId?: string | null
  action: string
  entityType?: string | null
  entityId?: string | null
  title?: string | null
  body?: string | null
  metadata?: Prisma.InputJsonValue
  ipAddress?: string | null
  userAgent?: string | null
}

function cleanText(value: unknown, fallback = "") {
  const text = String(value ?? "").trim()
  return text.length > 0 ? text : fallback
}

function normalizeSeverity(value: unknown): UserNotificationSeverity {
  const clean = String(value ?? "").trim().toLowerCase()

  if (clean === "low") return "low"
  if (clean === "high") return "high"
  if (clean === "critical") return "critical"

  return "normal"
}

export async function createUserNotification(input: CreateUserNotificationInput) {
  try {
    const userId = cleanText(input.userId)

    if (!userId) return null

    return await prisma.user_notifications.create({
      data: {
        user_id: userId,
        type: cleanText(input.type, "general"),
        title: cleanText(input.title, "Notification"),
        body: input.body ? cleanText(input.body) : null,
        link: input.link ? cleanText(input.link) : null,
        severity: normalizeSeverity(input.severity),
        metadata: input.metadata ?? {},
      },
    })
  } catch (error) {
    console.error("CREATE USER NOTIFICATION ERROR:", error)
    return null
  }
}

export async function logUserActivity(input: LogUserActivityInput) {
  try {
    const userId = cleanText(input.userId)

    if (!userId) return null

    return await prisma.user_activity_logs.create({
      data: {
        user_id: userId,
        actor_user_id: input.actorUserId ? cleanText(input.actorUserId) : null,
        action: cleanText(input.action, "activity.logged"),
        entity_type: input.entityType ? cleanText(input.entityType) : null,
        entity_id: input.entityId ? cleanText(input.entityId) : null,
        title: input.title ? cleanText(input.title) : null,
        body: input.body ? cleanText(input.body) : null,
        metadata: input.metadata ?? {},
        ip_address: input.ipAddress ? cleanText(input.ipAddress) : null,
        user_agent: input.userAgent ? cleanText(input.userAgent) : null,
      },
    })
  } catch (error) {
    console.error("LOG USER ACTIVITY ERROR:", error)
    return null
  }
}
