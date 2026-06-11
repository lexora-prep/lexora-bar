"use client"

export function LoadingState({
  text,
  compact = false,
}: {
  text: string
  compact?: boolean
}) {
  const cleanText = text.replace(/\.{3}$/, "")

  return (
    <div
      className={`flex w-full items-center justify-center bg-white px-5 ${
        compact ? "min-h-[220px] py-8" : "min-h-[calc(100vh-150px)] py-12"
      }`}
      role="status"
      aria-live="polite"
      aria-label={cleanText}
    >
      <div className="flex flex-col items-center text-center">
        <div className="relative flex h-[72px] w-[72px] items-center justify-center">
          <span className="absolute inset-0 animate-spin rounded-[24px] border border-violet-200 border-r-transparent" />
          <span className="absolute inset-[7px] rounded-[19px] border border-violet-100 bg-[linear-gradient(145deg,#ffffff_0%,#f4f0ff_100%)] shadow-[0_16px_38px_rgba(109,40,217,0.14)]" />

          <svg
            width="34"
            height="34"
            viewBox="0 0 34 34"
            fill="none"
            aria-hidden="true"
            className="relative z-10 text-violet-600"
          >
            <g>
              <animateTransform
                attributeName="transform"
                type="rotate"
                values="0 17 17;180 17 17;360 17 17"
                keyTimes="0;0.5;1"
                dur="2.15s"
                repeatCount="indefinite"
              />
              <path
                d="M9 4.5H25M9 29.5H25M11 5.5C11 10.4 13.2 13.3 17 17C20.8 13.3 23 10.4 23 5.5M11 28.5C11 23.6 13.2 20.7 17 17C20.8 20.7 23 23.6 23 28.5"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path d="M13.1 9.2H20.9L17 14.1L13.1 9.2Z" fill="currentColor" opacity="0.32">
                <animate
                  attributeName="opacity"
                  values="0.2;0.65;0.2"
                  dur="1.08s"
                  repeatCount="indefinite"
                />
              </path>
              <path d="M13.2 25.7H20.8L17 20.9L13.2 25.7Z" fill="currentColor" opacity="0.68">
                <animate
                  attributeName="opacity"
                  values="0.75;0.2;0.75"
                  dur="1.08s"
                  repeatCount="indefinite"
                />
              </path>
              <circle cx="17" cy="17" r="1" fill="currentColor">
                <animate
                  attributeName="cy"
                  values="15.3;18.7;15.3"
                  dur="1.08s"
                  repeatCount="indefinite"
                />
              </circle>
            </g>
          </svg>

          <span className="absolute -inset-3 -z-10 animate-pulse rounded-full bg-violet-200/25 blur-xl" />
        </div>

        <div className="mt-5 text-[12px] font-normal tracking-[-0.01em] text-[#273153]">
          {cleanText}
        </div>
        <div className="mt-1.5 text-[8px] font-normal text-slate-400">
          Fetching your latest recorded data
        </div>
        <div className="mt-3 flex items-center gap-1.5" aria-hidden="true">
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-300 [animation-delay:-0.3s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-400 [animation-delay:-0.15s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-500" />
        </div>
      </div>
    </div>
  )
}
