import Link from 'next/link';

export default function LoginPage({
  searchParams,
}: {
  searchParams: { redirect?: string };
}) {
  const redirectTo = searchParams?.redirect ?? '/';

  // TODO: swap this placeholder for your actual login form/actions.
  return (
    <div className="max-w-md mx-auto p-6 bg-white border rounded-lg">
      <h1 className="text-xl font-semibold mb-3">Sign in</h1>
      <p className="text-sm text-neutral-600 mb-4">
        After sign in, you’ll be sent to <code>{redirectTo}</code>.
      </p>
      {/* Put your auth UI / form here */}
      <Link href={redirectTo} className="underline text-sm">
        Continue without signing in
      </Link>
    </div>
  );
}
