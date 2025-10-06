'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export type Role = 'player' | 'coach' | 'admin'

export function useProfile() {
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState<Role | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      setLoading(true)
      const { data: u } = await supabase.auth.getUser()
      const uid = u?.user?.id ?? null
      if (!uid) {
        if (mounted) { setRole(null); setUserId(null); setEmail(null); setLoading(false) }
        return
      }
      const em = u!.user!.email ?? null
      const { data: p } = await supabase.from('profiles').select('role').eq('id', uid).maybeSingle()
      if (mounted) {
        setUserId(uid)
        setEmail(em)
        setRole((p?.role as Role) ?? 'player') // default to player if missing
        setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  return { loading, role, userId, email }
}
