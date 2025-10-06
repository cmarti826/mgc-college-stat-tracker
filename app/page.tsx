// app/page.tsx
import Link from 'next/link'

export default function Home() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">MGC College Golf Stats</h1>
      <p className="text-sm opacity-80">Create a round and enter hole-by-hole stats.</p>
      <div className="flex gap-3">
        <Link href="/rounds" className="rounded-2xl px-4 py-2 border">Open Rounds</Link>
        <Link href="/rounds/new" className="rounded-2xl px-4 py-2 border">New Round</Link>
      </div>
    </div>
  )
}
