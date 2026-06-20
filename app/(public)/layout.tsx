import { Navbar } from '@/components/public/layout/navbar'
import { FooterVisibilityGate } from '@/components/public/layout/footer-visibility-gate'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1">{children}</main>
      <FooterVisibilityGate />
    </div>
  )
}
