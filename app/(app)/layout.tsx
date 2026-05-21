import ClientLayout from "../ClientLayout"
import QueryProvider from "../_providers/QueryProvider"

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <QueryProvider>
      <ClientLayout>{children}</ClientLayout>
    </QueryProvider>
  )
}
