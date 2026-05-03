import { NextResponse } from "next/server"
import { Resend } from "resend"

export const runtime = "nodejs"

const SUPPORT_EMAIL = "support@lexoraprep.com"
const MAX_FILE_SIZE = 5 * 1024 * 1024

const allowedFileTypes = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg",
])

function clean(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : ""
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.RESEND_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: "Contact email service is not configured yet." },
        { status: 500 }
      )
    }

    const formData = await request.formData()

    const name = clean(formData.get("name"))
    const email = clean(formData.get("email"))
    const topic = clean(formData.get("topic"))
    const message = clean(formData.get("message"))
    const file = formData.get("attachment")

    if (!name || !email || !topic || !message) {
      return NextResponse.json(
        { error: "Please complete all required fields." },
        { status: 400 }
      )
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailPattern.test(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      )
    }

    const attachments: {
      filename: string
      content: Buffer
    }[] = []

    if (file instanceof File && file.size > 0) {
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: "Attachment must be 5 MB or smaller." },
          { status: 400 }
        )
      }

      if (!allowedFileTypes.has(file.type)) {
        return NextResponse.json(
          { error: "Only PDF, DOC, DOCX, PNG, JPG, and JPEG files are allowed." },
          { status: 400 }
        )
      }

      const arrayBuffer = await file.arrayBuffer()
      attachments.push({
        filename: file.name,
        content: Buffer.from(arrayBuffer),
      })
    }

    const resend = new Resend(apiKey)

    await resend.emails.send({
      from: "Lexora Prep Contact <onboarding@resend.dev>",
      to: SUPPORT_EMAIL,
      replyTo: email,
      subject: `Lexora Prep contact form: ${topic}`,
      text: [
        `Name: ${name}`,
        `Email: ${email}`,
        `Topic: ${topic}`,
        "",
        "Message:",
        message,
      ].join("\n"),
      attachments,
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("CONTACT_FORM_ERROR:", error)

    return NextResponse.json(
      { error: "Message could not be sent. Please try again later." },
      { status: 500 }
    )
  }
}
