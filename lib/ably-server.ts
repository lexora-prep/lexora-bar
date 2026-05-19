import Ably from "ably"

type AdminRealtimeEvent =
  | {
      type: "dm_message"
      recipientId: string
      senderId: string
      senderName: string
      threadId: string
      message: {
        id: string
        author: string
        author_id: string
        role: string
        content: string
        created_at: string
        edited_at: string | null
        read_by: string[]
        is_deleted: boolean
      }
    }
  | {
      type: "admin_notification"
      recipientId: string
      notification: {
        id: string
        title: string
        body: string
        href: string | null
        severity: string
        createdAt: string
      }
    }

let ablyRest: Ably.Rest | null = null

function getAblyRestClient() {
  const apiKey = process.env.ABLY_API_KEY

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
