import ClientLayout from "../ClientLayout"
import { UnsavedChangesProvider } from "../_providers/UnsavedChangesProvider"

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <UnsavedChangesProvider>
      <ClientLayout>{children}</ClientLayout>
    </UnsavedChangesProvider>
  )
}