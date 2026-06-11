import { GlassCard } from "../shared/glass-card"
import { LockedMetric } from "../shared/feedback-states"

export default function TimeAnalysisTab() {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <GlassCard
        title="Time Analysis"
        info="This tab requires timestamped study-session duration and performance analytics."
      >
        <LockedMetric
          title="Time analytics not connected"
          text="Connect the real session-duration and hourly-performance backend before displaying time analysis."
        />
      </GlassCard>
    </div>
  )
}
