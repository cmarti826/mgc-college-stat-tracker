// app/admin/teams/DeleteTeamButton.tsx
"use client";

import { deleteTeamAction } from "./actions";

export default function DeleteTeamButton({ teamId, teamName }: { teamId: string; teamName: string }) {
  return (
    <form
      action={deleteTeamAction}
      onSubmit={(e) => {
        if (!confirm(`Delete team "${teamName}"? This cannot be undone.`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={teamId} />
      <button
        type="submit"
        className="px-3 py-1.5 rounded-md border border-red-300 text-red-700 text-sm font-medium hover:bg-red-50 transition"
      >
        Delete
      </button>
    </form>
  );
}