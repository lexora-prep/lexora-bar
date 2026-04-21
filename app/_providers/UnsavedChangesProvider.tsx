"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { useRouter } from "next/navigation"

type DirtyConfig = {
  reason?: string
  message?: string
  onSave?: () => void | Promise<void>
  onDiscard?: () => void | Promise<void>
}

type PendingType = "navigation" | "action" | null

type UnsavedChangesContextValue = {
  isDirty: boolean
  setDirty: (dirty: boolean, config?: DirtyConfig) => void
  clearDirty: () => void
  requestNavigation: (href: string) => void
  requestAction: (action: () => void | Promise<void>) => void
}

const UnsavedChangesContext = createContext<UnsavedChangesContextValue | null>(null)

export function UnsavedChangesProvider({
  children,
}: {
  children: ReactNode
}) {
  const router = useRouter()

  const [isDirty, setIsDirty] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [message, setMessage] = useState(
    "You have an active session. Do you want to save it before leaving?"
  )
  const [isWorking, setIsWorking] = useState(false)

  const dirtyConfigRef = useRef<DirtyConfig | null>(null)
  const pendingTypeRef = useRef<PendingType>(null)
  const pendingHrefRef = useRef<string | null>(null)
  const pendingActionRef = useRef<null | (() => void | Promise<void>)>(null)

  const resetPending = useCallback(() => {
    pendingTypeRef.current = null
    pendingHrefRef.current = null
    pendingActionRef.current = null
  }, [])

  const clearDirty = useCallback(() => {
    setIsDirty(false)
    dirtyConfigRef.current = null
    setModalOpen(false)
    setIsWorking(false)
    resetPending()
  }, [resetPending])

  const setDirtyWithConfig = useCallback((dirty: boolean, config?: DirtyConfig) => {
    setIsDirty(dirty)

    if (dirty) {
      dirtyConfigRef.current = config ?? null
      setMessage(
        config?.message ||
          "You have an active session. Do you want to save it before leaving?"
      )
      return
    }

    dirtyConfigRef.current = null
  }, [])

  const proceedNow = useCallback(async () => {
    const pendingType = pendingTypeRef.current
    const pendingHref = pendingHrefRef.current
    const pendingAction = pendingActionRef.current

    setModalOpen(false)
    resetPending()

    if (pendingType === "navigation" && pendingHref) {
      router.push(pendingHref)
      return
    }

    if (pendingType === "action" && pendingAction) {
      await pendingAction()
    }
  }, [resetPending, router])

  const requestNavigation = useCallback(
    (href: string) => {
      if (!href) return

      if (!isDirty) {
        router.push(href)
        return
      }

      pendingTypeRef.current = "navigation"
      pendingHrefRef.current = href
      pendingActionRef.current = null
      setMessage(
        dirtyConfigRef.current?.message ||
          "You have an active session. Do you want to save it before leaving?"
      )
      setModalOpen(true)
    },
    [isDirty, router]
  )

  const requestAction = useCallback(
    (action: () => void | Promise<void>) => {
      if (!isDirty) {
        void action()
        return
      }

      pendingTypeRef.current = "action"
      pendingHrefRef.current = null
      pendingActionRef.current = action
      setMessage(
        dirtyConfigRef.current?.message ||
          "You have an active session. Do you want to save it before leaving?"
      )
      setModalOpen(true)
    },
    [isDirty]
  )

  const handleStay = useCallback(() => {
    setModalOpen(false)
    setIsWorking(false)
    resetPending()
  }, [resetPending])

  const handleSaveAndLeave = useCallback(async () => {
    if (isWorking) return
    setIsWorking(true)

    try {
      const onSave = dirtyConfigRef.current?.onSave
      if (onSave) {
        await onSave()
      }

      setIsDirty(false)
      dirtyConfigRef.current = null
      await proceedNow()
    } catch (error) {
      console.error("SAVE BEFORE LEAVE ERROR:", error)
      setModalOpen(false)
    } finally {
      setIsWorking(false)
    }
  }, [isWorking, proceedNow])

  const handleAbandonAndLeave = useCallback(async () => {
    if (isWorking) return
    setIsWorking(true)

    try {
      const onDiscard = dirtyConfigRef.current?.onDiscard
      if (onDiscard) {
        await onDiscard()
      }

      setIsDirty(false)
      dirtyConfigRef.current = null
      await proceedNow()
    } catch (error) {
      console.error("DISCARD BEFORE LEAVE ERROR:", error)
      setModalOpen(false)
    } finally {
      setIsWorking(false)
    }
  }, [isWorking, proceedNow])

  useEffect(() => {
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (!isDirty) return
      event.preventDefault()
      event.returnValue = ""
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
    }
  }, [isDirty])

  const value = useMemo<UnsavedChangesContextValue>(
    () => ({
      isDirty,
      setDirty: setDirtyWithConfig,
      clearDirty,
      requestNavigation,
      requestAction,
    }),
    [isDirty, setDirtyWithConfig, clearDirty, requestNavigation, requestAction]
  )

  return (
    <UnsavedChangesContext.Provider value={value}>
      {children}

      {modalOpen && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/35 px-4">
          <div className="w-full max-w-[460px] rounded-[24px] border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="mb-2 text-[18px] font-semibold tracking-[-0.03em] text-slate-900">
              Leave this session?
            </div>

            <div className="mb-5 text-[14px] leading-6 text-slate-500">
              {message}
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={handleStay}
                disabled={isWorking}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-[13px] font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                Stay here
              </button>

              <button
                type="button"
                onClick={handleAbandonAndLeave}
                disabled={isWorking}
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-[13px] font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-60"
              >
                {isWorking ? "Working..." : "Abandon and leave"}
              </button>

              <button
                type="button"
                onClick={handleSaveAndLeave}
                disabled={isWorking}
                className="rounded-xl bg-blue-600 px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
              >
                {isWorking ? "Working..." : "Save and leave"}
              </button>
            </div>
          </div>
        </div>
      )}
    </UnsavedChangesContext.Provider>
  )
}

export function useUnsavedChanges() {
  const context = useContext(UnsavedChangesContext)

  if (!context) {
    throw new Error("useUnsavedChanges must be used within UnsavedChangesProvider")
  }

  return context
}