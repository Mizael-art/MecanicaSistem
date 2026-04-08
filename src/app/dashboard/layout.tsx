import { Sidebar } from '@/components/layout/Sidebar'
import { MobileNav } from '@/components/layout/MobileNav'
import { NavigationProgress } from '@/components/layout/NavigationProgress'
import { InactivityWatcher } from '@/components/layout/InactivityWatcher'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      {/* Barra de progresso de navegação — resolve lentidão perceptível entre abas */}
      <NavigationProgress />
      {/* Timeout de inatividade — desloga após 6h sem uso */}
      <InactivityWatcher />
      <Sidebar />
      <MobileNav />
      <main className="main-content">
        <div className="px-4 lg:px-6 py-5 max-w-[1280px]">
          {children}
        </div>
      </main>
    </div>
  )
}
