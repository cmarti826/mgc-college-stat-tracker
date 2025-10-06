'use client'

import { ReactNode, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useProfile, Role } from '@/lib/useProfile'

export default function RoleGate({ allow, children }: { allow: Role[]; children: ReactNode }) {
  const { loading, role } = useProfile()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    if (!role) { router.replace('/auth'); return }
    if (!allow.includes(role)) { router.replace('/'); }
  }, [loading, role, router, allow])

  if (loading) return <div style={{ padding: 16 }}>Checking permissions…</div>
  if (!role || !allow.includes(role)) return null
  return <>{children}</>
}
