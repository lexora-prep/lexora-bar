export function buildLevelAndProgress(attempts: number, accuracy: number) {
  let level = "Limited"
  let progressWidth = 0

  if (attempts <= 0) {
    return { level: "Limited", progressWidth: 0 }
  }

  const completionFactor = Math.min(attempts / 10, 1)

  if (attempts < 2) {
    level = "Limited"
    progressWidth = Math.max(6, Math.round(completionFactor * 18))
  } else if (accuracy < 55) {
    level = "Building"
    progressWidth = Math.max(10, Math.round((accuracy / 100) * 35))
  } else if (accuracy < 75) {
    level = "Progressing"
    progressWidth = Math.max(24, Math.round((accuracy / 100) * 65))
  } else {
    level = "Strong"
    progressWidth = Math.max(48, Math.round((accuracy / 100) * 100))
  }

  return { level, progressWidth }
}
