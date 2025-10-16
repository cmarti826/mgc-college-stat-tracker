import Link from "next/link";

export default function AdminPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Admin</h1>
      <p className="text-sm text-neutral-600">Manage app data and settings.</p>

      <div className="grid sm:grid-cols-2 gap-3">
        <Link href="/admin/teams" className="border rounded-lg bg-white p-4 hover:bg-neutral-50">
          <div className="font-medium">Teams</div>
          <div className="text-sm text-neutral-600">Add, edit, delete teams & manage rosters</div>
        </Link>
        {/* Add more admin modules here later… */}
      </div>
    </div>
  );
}
