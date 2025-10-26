// app/players/layout.tsx
import NavPlayers from './Nav';

export default function PlayersLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <NavPlayers />
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
