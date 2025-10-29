// app/(auth)/login/page.tsx
import { Suspense } from 'react'
import LoginInner from './LoginInner'

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-white">Loading...</div>}>
      <LoginInner />
    </Suspense>
  )
}