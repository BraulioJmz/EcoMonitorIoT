import { Suspense } from "react"
import DashboardClient from "./dashboardClient"

export default function Page() {
  return (
    <Suspense fallback={null}>
      <DashboardClient />
    </Suspense>
  )
}