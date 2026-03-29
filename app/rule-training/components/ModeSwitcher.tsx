"use client"

type ModeId = "typing" | "fillblank" | "buzzwords" | "ordering" | "flashcard"

type Props = {
  mode: ModeId
  setMode: (mode: ModeId) => void
}

const modes: { id: ModeId; label: string }[] = [
  { id: "typing", label: "Typing" },
  { id: "fillblank", label: "Fill Blank" },
  { id: "buzzwords", label: "Buzzwords" },
  { id: "ordering", label: "Ordering" },
  { id: "flashcard", label: "Flashcard" },
]

export default function ModeSwitcher({ mode, setMode }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {modes.map((item) => {
        const active = mode === item.id

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => setMode(item.id)}
            className={[
              "inline-flex items-center rounded-full px-4 py-2 text-[12px] font-medium transition-all duration-200",
              "border backdrop-blur-md",
              active
                ? "border-violet-300 bg-violet-50 text-violet-700 shadow-[0_6px_16px_rgba(139,92,246,0.16)]"
                : "border-blue-200/90 bg-white/75 text-blue-700 hover:border-violet-200 hover:bg-violet-50/40",
            ].join(" ")}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}