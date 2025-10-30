// app/login/page.tsx (optional — create if needed)

import { createServerSupabase } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default function LoginPage() {
  const supabase = createServerSupabase();

  const handleLogin = async (formData: FormData) => {
    'use server';
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (!error) {
      redirect('/dashboard');
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10">
      <form action={handleLogin} className="space-y-4">
        <input
          name="email"
          type="email"
          placeholder="Email"
          required
          className="w-full p-3 border rounded-md"
        />
        <input
          name="password"
          type="password"
          placeholder="Password"
          required
          className="w-full p-3 border rounded-md"
        />
        <button
          type="submit"
          className="w-full py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Login
        </button>
      </form>
    </div>
  );
}