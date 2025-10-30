// app/rounds/new/error.tsx

"use client";

import { useEffect } from "react";

export default function NewRoundError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to console (or error reporting service)
    console.error("New Round page error:", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-[1200px] p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">New Round</h1>
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium hover:shadow transition"
        >
          Try Again
        </button>
      </div>

      <div className="rounded-xl border border-red-300 bg-red-50 p-5 text-red-800">
        <div className="flex items-start gap-3">
          <svg
            className="h-5 w-5 flex-shrink-0 mt-0.5"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
          <div>
            <p className="font-medium">Something went wrong</p>
            <p className="mt-1 text-sm">
              We couldn't load the form. This might be a temporary issue.
            </p>
            <details className="mt-3">
              <summary className="cursor-pointer text-sm font-medium hover:underline">
                Show details
              </summary>
              <pre className="mt-2 text-xs bg-red-100 p-3 rounded overflow-auto">
                {error.message}
                {error.digest && `\n\nDigest: ${error.digest}`}
              </pre>
            </details>
          </div>
        </div>
      </div>

      <div className="text-center text-sm text-gray-600">
        <p>
          <a href="/rounds" className="text-blue-600 hover:underline">
            ← Back to Rounds
          </a>
        </p>
      </div>
    </div>
  );
}