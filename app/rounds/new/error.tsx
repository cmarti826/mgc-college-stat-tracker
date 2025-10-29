// app/rounds/new/error.tsx

"use client";

export default function NewRoundError({ error }: { error: Error }) {
  return (
    <div className="mx-auto max-w-[1200px] p-6">
      <h1 className="text-2xl font-semibold">New Round</h1>
      <div className="mt-4 rounded-xl border border-red-300 bg-red-50 p-4 text-red-800">
        <div className="font-medium">Something went wrong rendering this page.</div>
        <pre className="mt-2 text-sm overflow-auto">{error.message}</pre>
      </div>
    </div>
  );
}
