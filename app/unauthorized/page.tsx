// app/unauthorized/page.tsx
export default function Unauthorized() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
      <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
      <p className="text-gray-600">You don't have permission to view this page.</p>
      <a href="/" className="mt-4 text-blue-600 hover:underline">Go Home</a>
    </div>
  );
}