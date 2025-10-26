// app/admin/layout.tsx
import NavAdmin from './NavAdmin';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <NavAdmin />
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
