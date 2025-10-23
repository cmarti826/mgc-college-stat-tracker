// app/admin/tee-sets/page.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client'; // your browser client

// ---------- Types ----------
type TeeSet = {
  id: string;
  name: string;
  color?: string | null;
  course_id: string;
  // We only rely on course name now to avoid schema mismatches
  course?: {
    name: string;
  } | null;
};

type TeeSetHole = {
  tee_set_id: string;
  hole_number: number; // 1..18
  yardage: number | null;
};

type TeeSetWithYardages = {
  teeSet: TeeSet;
  yardages: (number | null)[];
};

const HOLE_LABELS = Array.from({ length: 18 }, (_, i) => `H${i + 1}`);

export default function ManageTeeSetsPage() {
  const router = useRouter();
  const supabase: SupabaseClient = createClient();

  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<TeeSetWithYardages[]>([]);
  const dirtyRef = useRef<Record<string, boolean>>({});

  // ---------- Load tee sets + yardages ----------
  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        // Only select the course name through the FK relation.
        // If your relation name differs, change `course:courses(name)` to match.
        const { data: teeSets, error: tsErr } = await supabase
          .from('tee_sets')
          .select('id,name,color,course_id,course:courses(name)')
          .order('name', { ascending: true });

        if (tsErr) throw tsErr;

        const all: TeeSetWithYardages[] = [];

        for (const ts of (teeSets || []) as TeeSet[]) {
          const { data: holes, error: hErr } = await supabase
            .from('tee_set_holes')
            .select('tee_set_id,hole_number,yardage')
            .eq('tee_set_id', ts.id)
            .order('hole_number', { ascending: true });

          if (hErr) throw hErr;

          const yardages = Array.from({ length: 18 }, () => null as number | null);
          (holes || []).forEach((h: TeeSetHole) => {
            if (h.hole_number >= 1 && h.hole_number <= 18) {
              yardages[h.hole_number - 1] = h.yardage;
            }
          });

          all.push({ teeSet: ts, yardages });
        }

        setItems(all);
      } catch (e: any) {
        setError(e?.message ?? 'Failed to load tee sets.');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange =
    (teeSetId: string, holeIndex: number) =>
    (raw: string) => {
      setItems((prev) =>
        prev.map((x) =>
          x.teeSet.id === teeSetId
            ? {
                ...x,
                yardages: x.yardages.map((y, idx) =>
                  idx === holeIndex ? (raw === '' ? null : Number(raw)) : y
                ),
              }
            : x
        )
      );
      dirtyRef.current[teeSetId] = true;
    };

  const saveYardages = async (teeSetId: string) => {
    try {
      setSavingId(teeSetId);
      setError(null);

      const current = items.find((x) => x.teeSet.id === teeSetId);
      if (!current) return;

      const rows = current.yardages.map((y, i) => ({
        tee_set_id: teeSetId,
        hole_number: i + 1,
        yardage: y,
      }));

      const { error: upErr } = await supabase.from('tee_set_holes').upsert(rows, {
        onConflict: 'tee_set_id,hole_number',
      });
      if (upErr) throw upErr;

      dirtyRef.current[teeSetId] = false;
    } catch (e: any) {
      setError(e?.message ?? 'Failed to save yardages.');
    } finally {
      setSavingId(null);
    }
  };

  const deleteTeeSet = async (teeSetId: string) => {
    if (!confirm('Delete this tee set? This cannot be undone.')) return;
    try {
      setDeletingId(teeSetId);
      setError(null);

      await supabase.from('tee_set_holes').delete().eq('tee_set_id', teeSetId);
      const { error: delErr } = await supabase.from('tee_sets').delete().eq('id', teeSetId);
      if (delErr) throw delErr;

      setItems((prev) => prev.filter((x) => x.teeSet.id !== teeSetId));
    } catch (e: any) {
      setError(e?.message ?? 'Failed to delete tee set.');
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
          <span className="i-lucide-plus" />
          New Tee Set
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
          {items.map(({ teeSet, yardages }) => (
            <div key={teeSet.id} className="rounded-lg border bg-white">
              {/* Header */}
              <div className="flex items-center justify-between border-b px-4 py-3">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-semibold">
                      {teeSet.name}
                      {teeSet.color ? ` • ${teeSet.color}` : ''}
                    </span>
                    {teeSet.course?.name && (
                      <span className="text-sm text-gray-500">• {teeSet.course.name}</span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => deleteTeeSet(teeSet.id)}
                  disabled={deletingId === teeSet.id}
                  className="text-sm text-red-600 hover:text-red-700 disabled:opacity-60"
                  title="Delete tee set"
                >
                  {deletingId === teeSet.id ? 'Deleting…' : 'Delete'}
                </button>
              </div>

              {/* Body */}
              <div className="px-4 py-4">
                {/* Front 9 */}
                <div className="mb-2 text-sm font-medium text-gray-700">Front 9</div>
                <div className="mb-6 grid grid-cols-9 gap-3">
                  {HOLE_LABELS.slice(0, 9).map((label, i) => (
                    <div key={label} className="flex flex-col items-center">
                      <div className="mb-1 text-xs font-semibold text-gray-600">{label}</div>
                      <input
                        type="number"
                        min={0}
                        inputMode="numeric"
                        className="w-16 rounded border p-1 text-center text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={yardages[i] ?? ''}
                        onChange={(e) => handleChange(teeSet.id, i)(e.target.value)}
                        placeholder="—"
                      />
                    </div>
                  ))}
                </div>

                {/* Back 9 */}
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
                          className="w-16 rounded border p-1 text-center text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={yardages[idx] ?? ''}
                          onChange={(e) => handleChange(teeSet.id, idx)(e.target.value)}
                          placeholder="—"
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Actions */}
                <div className="mt-6 flex items-center gap-3">
                  <button
                    onClick={() => saveYardages(teeSet.id)}
                    disabled={savingId === teeSet.id}
                    className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
                  >
                    {savingId === teeSet.id ? 'Saving…' : 'Save Yardages'}
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
