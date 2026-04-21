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
    <div className="w-full">
      <div className="grid w-full grid-cols-5 overflow-hidden rounded-[16px] border border-slate-200 bg-slate-50 p-[3px]">
        {modes.map((item) => {
          const active = mode === item.id

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setMode(item.id)}
              className={[
                "h-[34px] rounded-[12px] text-[12px] font-semibold transition-all duration-200",
                active
                  ? "bg-white text-blue-700 shadow-[0_1px_3px_rgba(15,23,42,0.08)]"
                  : "text-slate-500 hover:text-slate-700",
              ].join(" ")}
            >
              {item.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}