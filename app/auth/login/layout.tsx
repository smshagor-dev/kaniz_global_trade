import { Navbar } from '@/components/public/layout/navbar'
import { FooterVisibilityGate } from '@/components/public/layout/footer-visibility-gate'

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      <FooterVisibilityGate />
    </div>
  )
}
