import type {
  SubjectDiagnostic,
  WeakArea,
} from "../../types"
import { GlassCard } from "../shared/glass-card"
import { EmptyCompact } from "../shared/feedback-states"

type StrengthsWeaknessesTabProps = {
  strongSubjects: SubjectDiagnostic[]
  weakSubjects: SubjectDiagnostic[]
  weakAreas: WeakArea[]
}

export default function StrengthsWeaknessesTab({
  strongSubjects,
  weakSubjects,
  weakAreas,
}: StrengthsWeaknessesTabProps) {
  return (
    <div className="grid grid-cols-1 gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300 xl:grid-cols-2">
      <GlassCard
        title="Strongest Subjects"
        info="Strong subjects currently use real BLL subject accuracy."
      >
        {strongSubjects.length > 0 ? (
          <div className="space-y-3">
            {strongSubjects.map((subject) => (
              <div
                key={subject.name}
                className="flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-3 text-[13px]"
              >
                <span className="text-[#11183d]">
                  {subject.name}
                </span>

                <span className="text-emerald-700">
                  {subject.accuracy}%
                </span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyCompact text="Complete more rules to identify your strongest subjects." />
        )}
      </GlassCard>

      <GlassCard
        title="Weakest Subjects and Rules"
        info="Weaknesses use real subject accuracy and weak-area records."
      >
        {weakSubjects.length > 0 || weakAreas.length > 0 ? (
          <div className="space-y-3">
            {weakSubjects.map((subject) => (
              <div
                key={subject.name}
                className="flex items-center justify-between rounded-xl bg-rose-50 px-4 py-3 text-[13px]"
              >
                <span className="text-[#11183d]">
                  {subject.name}
                </span>

                <span className="text-rose-700">
                  {subject.accuracy}%
                </span>
              </div>
            ))}

            {weakAreas.slice(0, 5).map((area) => (
              <div
                key={area.ruleId || area.id || `${area.subject}-${area.title}`}
                className="rounded-xl border border-rose-100 bg-white px-4 py-3"
              >
                <div className="text-[12px] text-[#11183d]">
                  {area.rule || area.title || "Untitled rule"}
                </div>

                <div className="mt-1 text-[11px] text-rose-600">
                  {area.subject}
                  {area.accuracy !== undefined
                    ? ` · ${area.accuracy}%`
                    : ""}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyCompact text="No confirmed weak subjects or rules exist yet." />
        )}
      </GlassCard>
    </div>
  )
}
