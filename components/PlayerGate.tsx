// components/PlayerGate.tsx

"use client";

import { usePlayer } from "@/hooks/usePlayer";
import { Loader2, AlertCircle, Users } from "lucide-react";

interface PlayerGateProps {
  children: (playerId: string) => React.ReactNode;
  fallback?: React.ReactNode;
}

export default function PlayerGate({ children, fallback }: PlayerGateProps) {
  const { playerId, loading, error } = usePlayer();

  // === Loading ===
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--mgc-blue)]" />
          <p className="text-sm text-gray-600">Loading player profile...</p>
        </div>
      </div>
    );
  }

  // === Error ===
  if (error) {
    return (
      fallback || (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
          <div className="max-w-md text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-3 text-red-500" />
            <p className="text-red-600 font-medium">Profile Error</p>
            <p className="mt-1 text-sm text-gray-600">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 text-sm text-[var(--mgc-blue)] hover:underline"
            >
              Try again
            </button>
          </div>
        </div>
      )
    );
  }

  // === No Player Linked ===
  if (!playerId) {
    return (
      fallback || (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
          <div className="max-w-md text-center">
            <Users className="h-12 w-12 mx-auto mb-3 text-gray-400" />
            <p className="text-gray-800 font-medium">No Player Linked</p>
            <p className="mt-1 text-sm text-gray-600">
              Please contact your coach to link your account.
            </p>
          </div>
        </div>
      )
    );
  }

  // === Authorized: Render children with playerId ===
  return <>{children(playerId)}</>;
}