'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Course = { id: string; name: string | null; city: string | null; state: string | null };

export default function CoursesPage() {
  const [rows, setRows] = useState<Course[]>([]);
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');

  async function load() {
    const { data } = await supabase.from<Course>('courses').select('id,name,city,state').order('name');
    setRows(data ?? []);
  }

  useEffect(() => { load(); }, []);

  async function createCourse() {
    if (!name.trim()) return;
    await supabase.from('courses').insert({ name: name.trim(), city: city || null, state: state || null });
    setName(''); setCity(''); setState('');
    await load();
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Courses</h1>

      <div className="rounded border bg-white p-3">
        <div className="mb-2 font-medium">Create Course</div>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
          <input className="rounded border px-3 py-2" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="rounded border px-3 py-2" placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} />
          <input className="rounded border px-3 py-2" placeholder="State" value={state} onChange={(e) => setState(e.target.value)} />
          <button className="rounded bg-[#0033A0] px-3 py-2 text-white" onClick={createCourse}>Create</button>
        </div>
      </div>

      <ul className="space-y-2">
        {rows.map(c => (
          <li key={c.id} className="rounded border bg-white p-3">
            <div className="font-medium">
              <Link href={`/courses/${c.id}`} className="text-[#0033A0] underline">
                {c.name ?? '(unnamed)'}
              </Link>
            </div>
            <div className="text-sm text-gray-600">{[c.city, c.state].filter(Boolean).join(', ')}</div>
          </li>
        ))}
        {rows.length === 0 && <li className="text-sm text-gray-600">No courses yet.</li>}
      </ul>
    </div>
  );
}
