export function LoadingState({
  text,
}: {
  text: string
}) {
  return (
    <main className="min-h-screen bg-white p-6">
      <div className="rounded-xl border border-[#e5e9f3] bg-white p-5 text-sm font-normal text-slate-500 shadow-sm">
        {text}
      </div>
    </main>
  )
}
