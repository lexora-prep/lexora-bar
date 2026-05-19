import Ably from "ably"

type AdminRealtimeNotification = {
  id: string
  title: string
  body: string
  href: string | null
  severity: string
  createdAt: string
}

type AdminRealtimeDmMessage = {
  id: string
  threadId: string
  authorId: string
  author: string
  role: string
  content: string
  createdAt: string
  editedAt: string | null
  readBy: string[]
  isDeleted: boolean
}

export type AdminRealtimeEvent =
  | {
      type: "team_dm_message"
      recipientId: string
      senderId: string
      senderName: string
      threadId: string
      dmMessage: AdminRealtimeDmMessage
      notification: AdminRealtimeNotification
    }
  | {
      type: "admin_notification"
      recipientId: string
      notification: AdminRealtimeNotification
    }

let ablyRest: Ably.Rest | null = null

function getAblyRestClient() {
  const apiKey = process.env.ABLY_API_KEY?.trim()

  if (!apiKey) {
    return null
  }

  if (!ablyRest) {
    ablyRest = new Ably.Rest(apiKey)
  }

  return ablyRest
}

export async function publishAdminRealtimeEvent(event: AdminRealtimeEvent) {
  const client = getAblyRestClient()

  if (!client) {
    console.warn("ABLY_API_KEY is not configured. Realtime event was skipped.")
    return
  }

  const channel = client.channels.get(`admin:user:${event.recipientId}`)
  await channel.publish(event.type, event)
}
