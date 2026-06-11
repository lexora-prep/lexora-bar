import { GlassCard } from "../shared/glass-card"
import { EmptyCompact } from "../shared/feedback-states"

export default function RuleAnalyticsTab() {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <GlassCard
        title="Rule Analytics"
        info="Detailed rule-level analytics require a dedicated rule analytics endpoint."
      >
        <EmptyCompact text="Rule-level analytics will appear here after the real backend endpoint is connected. No estimated or fake rule analytics are shown." />
      </GlassCard>
    </div>
  )
}
