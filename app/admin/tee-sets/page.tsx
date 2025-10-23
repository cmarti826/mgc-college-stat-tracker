// app/admin/tee-sets/page.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

type Tee = {
  id: string;
  name: string;
  course_id: string;
  rating: number | null;
  slope: number | null;
  par: number | null;
};

type TeeHole = {
  tee_id: string;
  hole_number: number;
  yardage: number | null;
};

type TeeWithYardages = {
  tee: Tee;
  yardages: (number | null)[];
};

const HOLE_LABELS = Array.from({ length: 18 }, (_, i) => `H${i + 1}`);

export default function ManageTeesPage() {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<TeeWithYardages[]>([]);
  const [courseNames, setCourseNames] = useState<Record<string, string>>({});
  const dirtyRef = useRef<Record<string, boolean>>({});

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        // 1. Load all courses and make a map
        const { data: courses, error: cErr } = await supabase.from('courses').select('id,name');
        if (cErr) throw cErr;
        const cmap: Record<string, string> = {};
        (courses ?? []).forEach((c) => (cmap[c.id] = c.name));
        setCourseNames(cmap);

        // 2. Load all tees (from tees table)
        const { data: tees, error: tErr } = await supabase
          .from('tees')
          .select('id,name,course_id,rating,slope,par')
          .order('name', { ascending: true });
        if (tErr) throw tErr;

        // 3. For each tee, load tee_holes (yardages)
        const all: TeeWithYardages[] = [];
        for (const tee of tees ?? []) {
          const { data: holes, error: hErr } = await supabase
            .from('tee_holes')
            .select('hole_number,yardage')
            .eq('tee_id', tee.id)
            .order('hole_number', { ascending: true });
          if (hErr) throw hErr;

          const yardages = Array.from({ length: 18 }, () => null as number | null);
          (holes ?? []).forEach((h) => {
            if (h.hole_number >= 1 && h.hole_number <= 18) {
              yardages[h.hole_number - 1] = h.yardage;
            }
          });

          all.push({ tee: tee as Tee, yardages });
        }

        setItems(all);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleChange =
    (teeId: string, holeIndex: number) =>
    (raw: string) => {
      setItems((prev) =>
        prev.map((x) =>
          x.tee.id === teeId
            ? {
                ...x,
                yardages: x.yardages.map((y, idx) =>
                  idx === holeIndex ? (raw === '' ? null : Number(raw)) : y
                ),
              }
            : x
        )
      );
      dirtyRef.current[teeId] = true;
    };

  const saveYardages = async (teeId: string) => {
    try {
      setSavingId(teeId);
      const current = items.find((x) => x.tee.id === teeId);
      if (!current) return;

      const rows = current.yardages.map((y, i) => ({
        tee_id: teeId,
        hole_number: i + 1,
        yardage: y,
      }));

      const { error: upErr } = await supabase.from('tee_holes').upsert(rows, {
        onConflict: 'tee_id,hole_number',
      });
      if (upErr) throw upErr;

      dirtyRef.current[teeId] = false;
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSavingId(null);
    }
  };

  const deleteTee = async (teeId: string) => {
    if (!confirm('Delete this tee set?')) return;
    try {
      setDeletingId(teeId);
      await supabase.from('tee_holes').delete().eq('tee_id', teeId);
      const { error: delErr } = await supabase.from('tees').delete().eq('id', teeId);
      if (delErr) throw delErr;
      setItems((prev) => prev.filter((x) => x.tee.id !== teeId));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setDeletingId(null);
    }
  };

  const header = useMemo(
    () => (
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Manage Tee Sets</h1>
        <Link
          href="/admin/tee-sets/new"
          className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-gray-50"
        >
          + New Tee Set
        </Link>
      </div>
    ),
    []
  );

  return (
    <div className="container mx-auto px-4 py-6">
      {header}

      {error && (
        <div className="mb-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-md border p-6">Loading tee sets…</div>
      ) : items.length === 0 ? (
        <div className="rounded-md border p-6">No tee sets yet.</div>
      ) : (
        <div className="space-y-6">
          {items.map(({ tee, yardages }) => (
            <div key={tee.id} className="rounded-lg border bg-white">
              {/* Header */}
              <div className="flex items-center justify-between border-b px-4 py-3">
                <div className="flex flex-col">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-base font-semibold">
                      {tee.name}
                      {courseNames[tee.course_id] && (
                        <span className="text-sm text-gray-500">
                          {' '}
                          • {courseNames[tee.course_id]}
                        </span>
                      )}
                    </span>
                    {(tee.rating || tee.slope || tee.par) && (
                      <span className="text-xs text-gray-500">
                        {tee.rating ? `Rating ${tee.rating}` : ''}
                        {tee.slope ? ` • Slope ${tee.slope}` : ''}
                        {tee.par ? ` • Par ${tee.par}` : ''}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => deleteTee(tee.id)}
                  disabled={deletingId === tee.id}
                  className="text-sm text-red-600 hover:text-red-700 disabled:opacity-60"
                >
                  {deletingId === tee.id ? 'Deleting…' : 'Delete'}
                </button>
              </div>

              {/* Body */}
              <div className="px-4 py-4">
                <div className="mb-2 text-sm font-medium text-gray-700">Front 9</div>
                <div className="mb-6 grid grid-cols-9 gap-3">
                  {HOLE_LABELS.slice(0, 9).map((label, i) => (
                    <div key={label} className="flex flex-col items-center">
                      <div className="mb-1 text-xs font-semibold text-gray-600">{label}</div>
                      <input
                        type="number"
                        min={0}
                        inputMode="numeric"
                        className="w-16 rounded border p-1 text-center text-sm focus:ring-2 focus:ring-blue-500"
                        value={yardages[i] ?? ''}
                        onChange={(e) => handleChange(tee.id, i)(e.target.value)}
                      />
                    </div>
                  ))}
                </div>

                <div className="mb-2 text-sm font-medium text-gray-700">Back 9</div>
                <div className="grid grid-cols-9 gap-3">
                  {HOLE_LABELS.slice(9).map((label, i) => {
                    const idx = i + 9;
                    return (
                      <div key={label} className="flex flex-col items-center">
                        <div className="mb-1 text-xs font-semibold text-gray-600">{label}</div>
                        <input
                          type="number"
                          min={0}
                          inputMode="numeric"
                          className="w-16 rounded border p-1 text-center text-sm focus:ring-2 focus:ring-blue-500"
                          value={yardages[idx] ?? ''}
                          onChange={(e) => handleChange(tee.id, idx)(e.target.value)}
                        />
                      </div>
                    );
                  })}
                </div>

                <div className="mt-6 flex items-center gap-3">
                  <button
                    onClick={() => saveYardages(tee.id)}
                    disabled={savingId === tee.id}
                    className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
                  >
                    {savingId === tee.id ? 'Saving…' : 'Save Yardages'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
