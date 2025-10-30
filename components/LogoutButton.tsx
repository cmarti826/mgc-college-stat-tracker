// components/LogoutButton.tsx

"use client";

import { useFormStatus } from "react-dom";
import { LogOut } from "lucide-react";

export default function LogoutButton() {
  return (
    <form action="/logout" method="post" className="inline">
      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={`
        inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium
        transition-all duration-200 focus-visible:ring-2 focus-visible:ring-offset-2
        focus-visible:ring-[var(--mgc-blue)] disabled:opacity-50 disabled:cursor-not-allowed
        ${pending
          ? "bg-gray-100 text-gray-500"
          : "text-[var(--mgc-blue)] hover:bg-gray-50 border border-gray-300"
        }
      `}
      aria-label={pending ? "Signing out..." : "Sign out"}
    >
      {pending ? (
        <>
          <svg
            className="animate-spin h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Signing out...
        </>
      ) : (
        <>
          <LogOut className="h-4 w-4" />
          Sign Out
        </>
      )}
    </button>
  );
}