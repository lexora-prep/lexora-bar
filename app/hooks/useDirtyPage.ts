"use client"

import { useEffect } from "react"
import { useUnsavedChanges } from "@/app/_providers/UnsavedChangesProvider"

type UseDirtyPageOptions = {
  dirty: boolean
  reason?:
    | "unsaved_changes"
    | "active_session"
    | "editing_rule"
    | "study_plan"
    | "notes"
    | "custom_rule"
    | "mbe_session"
    | "flashcards_session"
    | "rule_training_session"
    | "weak_areas_session"
  message?: string
}

export function useDirtyPage({ dirty, reason, message }: UseDirtyPageOptions) {
  const { setDirty, clearDirty } = useUnsavedChanges()

  useEffect(() => {
    if (dirty) {
      setDirty(true, { reason, message })
      return
    }

    clearDirty()
  }, [dirty, reason, message, setDirty, clearDirty])

  useEffect(() => {
    return () => {
      clearDirty()
    }
  }, [clearDirty])
}