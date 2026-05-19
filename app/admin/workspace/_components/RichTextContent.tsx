"use client"

type RichTextContentProps = {
  content: string
  emptyText?: string
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
}

function basicSanitize(html: string) {
  let safe = html || ""

  safe = safe.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
  safe = safe.replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
  safe = safe.replace(/\son\w+="[^"]*"/gi, "")
  safe = safe.replace(/\son\w+='[^']*'/gi, "")
  safe = safe.replace(/\son\w+=\S+/gi, "")
  safe = safe.replace(/javascript:/gi, "")

  return safe
}

function looksLikeHtml(value: string) {
  return /<\/?[a-z][\s\S]*>/i.test(value)
}

function renderMentions(html: string) {
  return html.replace(
    /(^|[\s>])(@[A-Za-z0-9_.-][A-Za-z0-9_.\-\s]{0,40})/g,
    '$1<span class="lexora-rich-mention">$2</span>',
  )
}

export default function RichTextContent({ content, emptyText = "No content." }: RichTextContentProps) {
  const trimmed = String(content || "").trim()

  const html = looksLikeHtml(trimmed)
    ? renderMentions(basicSanitize(trimmed))
    : renderMentions(escapeHtml(trimmed).replace(/\n/g, "<br />"))

  return (
    <div className="lexora-rich-content">
      <style jsx global>{`
        .lexora-rich-content {
          color: #111827;
          font-size: 14.5px;
          line-height: 1.75;
          font-weight: 400;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .lexora-rich-content p {
          margin: 0 0 0.72em;
        }

        .lexora-rich-content p:last-child {
          margin-bottom: 0;
        }

        .lexora-rich-content ul,
        .lexora-rich-content ol {
          margin: 0.6em 0 0.8em 1.3em;
          padding: 0;
        }

        .lexora-rich-content blockquote {
          margin: 0.8em 0;
          padding-left: 12px;
          border-left: 3px solid #cbd5e1;
          color: #475569;
        }

        .lexora-rich-content a {
          color: #1d4ed8;
          text-decoration: underline;
          text-underline-offset: 2px;
        }

        .lexora-rich-mention {
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          background: rgba(29, 78, 216, 0.10);
          color: #1d4ed8;
          font-weight: 700;
          padding: 0 6px;
          margin: 0 1px;
          line-height: 1.55;
        }
      `}</style>

      {trimmed ? (
        <div dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <span style={{ color: "#94a3b8" }}>{emptyText}</span>
      )}
    </div>
  )
}
