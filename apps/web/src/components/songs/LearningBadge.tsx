type LearningStatus = "TO_LEARN" | "IN_PROGRESS" | "MASTERED" | null

const labels: Record<NonNullable<LearningStatus>, string> = {
  MASTERED:    "Mastered",
  IN_PROGRESS: "In Progress",
  TO_LEARN:    "To Learn",
}

const classes: Record<NonNullable<LearningStatus>, string> = {
  MASTERED:    "badge badge-mastered",
  IN_PROGRESS: "badge badge-progress",
  TO_LEARN:    "badge badge-learn",
}

export function LearningBadge({ status }: { status: LearningStatus }) {
  if (!status) return null
  return <span className={classes[status]}>{labels[status]}</span>
}
