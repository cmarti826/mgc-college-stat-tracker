// components/LogoutButton.tsx
'use client';

export default function LogoutButton() {
  return (
    <form action="/logout" method="post">
      <button
        type="submit"
        className="rounded-md border px-3 py-1 text-sm text-gray-700 hover:bg-gray-100"
      >
        Sign Out
      </button>
    </form>
  );
}
