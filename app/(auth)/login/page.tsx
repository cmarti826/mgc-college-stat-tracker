// app/(auth)/login/page.tsx
import { Suspense } from "react";
import LoginInner from "./LoginInner";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin h-8 w-8 border-b-2 border-gray-900 rounded-full"></div></div>}>
      <LoginInner />
    </Suspense>
  );
}