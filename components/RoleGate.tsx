// components/RoleGate.tsx

"use client";

import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useProfile, Role } from "@/lib/useProfile";
import { Loader2 } from "lucide-react";

interface RoleGateProps {
  allow: Role[];
  children: ReactNode;
  fallback?: ReactNode;
}

export default function RoleGate({
  allow,
  children,
  fallback,
}: RoleGateProps) {
  const { loading, role, error } = useProfile(); // ← NOW INCLUDES error
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!role || !allow.includes(role))) {
      router.replace("/unauthorized");
    }
  }, [loading, role, allow, router]);

  // === Loading State ===
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--mgc-blue)]" />
          <p className="text-sm text-gray-600">Checking permissions...</p>
        </div>
      </div>
    );
  }

  // === Error State ===
  if (error) {
    return (
      fallback || (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
          <div className="text-center max-w-md">
            <p className="text-red-600 font-medium">Access Error</p>
            <p className="mt-1 text-sm text-gray-600">
              {error.message || "Failed to load user profile."}
            </p>
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

  // === Unauthorized (handled by useEffect) ===
  if (!role || !allow.includes(role)) {
    return null;
  }

  // === Authorized ===
  return <>{children}</>;
}