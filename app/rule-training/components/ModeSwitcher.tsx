export default function ModeSwitcher({ mode, setMode }: any) {

  const modes = [
    { id: "typing", label: "Typing", icon: "⌨️" },
    { id: "fillblank", label: "Fill Blank", icon: "✏️" },
    { id: "buzzwords", label: "Buzzwords", icon: "☀️" },
    { id: "ordering", label: "Ordering", icon: "↕️" },
    { id: "flashcard", label: "Flashcard", icon: "🃏" },
  ]

  return (

    <div
      style={{
        display: "flex",
        gap: 10,
        marginBottom: 22,
      }}
    >

      {modes.map((m) => {

        const active = mode === m.id

        return (

          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 14px",
              borderRadius: 20,
              border: active ? "1px solid #2563EB" : "1px solid #E2E8F0",
              background: active ? "#EEF2FF" : "#F8FAFC",
              color: active ? "#2563EB" : "#334155",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >

            <span style={{ fontSize: 13 }}>{m.icon}</span>
            {m.label}

          </button>

        )

      })}

    </div>

  )

}