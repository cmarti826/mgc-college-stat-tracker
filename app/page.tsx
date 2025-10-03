import Link from 'next/link'
export default function Home() {
  return (
    <div className="card">
      <h1 className="text-2xl font-semibold mb-2">Welcome</h1>
      <p>Use <Link className="underline" href="/auth">Auth</Link> to sign in, then go to <Link className="underline" href="/schedule">Schedule</Link>.</p>
    </div>
  )
}
