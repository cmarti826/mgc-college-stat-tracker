// components/RoleGate.tsx
"use client";

import { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useProfile, Role } from "@/lib/useProfile";

export default function RoleGate({ allow, children }: { allow: Role[]; children: ReactNode }) {
  const { loading, role } = useProfile();
  const router = useRouter();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!role || !allow.includes(role)) {
    router.replace("/unauthorized");
    return null;
  }

  return <>{children}</>;
}