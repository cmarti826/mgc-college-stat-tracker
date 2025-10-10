// ==========================
// File: app/rounds/_components/HoleRow.tsx
// ==========================
"use client";

import { HoleInput } from "./RoundEntry";

export default function HoleRow({ value, onChange }: { value: HoleInput; onChange: (patch: Partial<HoleInput>) => void }) {
  const canFIR = value.par === 4 || value.par === 5;
  return (
    <tr className="border-t">
      <td className="p-2 font-medium">{value.hole_number}</td>
      <td className="p-2">
        <input
          type="number"
          inputMode="numeric"
          className="w-16 rounded-lg border p-1 text-center"
          value={value.par}
          onChange={(e) => onChange({ par: Number(e.target.value) })}
        />
      </td>
      <td className="p-2">
        <input
          type="number"
          inputMode="numeric"
          className="w-20 rounded-lg border p-1 text-center"
          value={value.yards ?? ""}
          onChange={(e) => onChange({ yards: e.target.value ? Number(e.target.value) : null })}
        />
      </td>
      <td className="p-2">
        <input
          type="number"
          inputMode="numeric"
          className="w-16 rounded-lg border p-1 text-center"
          value={value.strokes ?? ""}
          onChange={(e) => onChange({ strokes: e.target.value ? Number(e.target.value) : null })}
        />
      </td>
      <td className="p-2">
        <input
          type="number"
          inputMode="numeric"
          className="w-16 rounded-lg border p-1 text-center"
          value={value.putts ?? ""}
          onChange={(e) => onChange({ putts: e.target.value ? Number(e.target.value) : null })}
        />
      </td>
      <td className="p-2 text-center">
        <input type="checkbox" className="h-5 w-5" disabled={!canFIR} checked={!!value.fir && canFIR} onChange={(e) => onChange({ fir: canFIR ? e.target.checked : null })} />
      </td>
      <td className="p-2 text-center">
        <input type="checkbox" className="h-5 w-5" checked={!!value.gir} onChange={(e) => onChange({ gir: e.target.checked })} />
      </td>
      <td className="p-2 text-center">
        <input type="checkbox" className="h-5 w-5" checked={!!value.up_down} onChange={(e) => onChange({ up_down: e.target.checked })} />
      </td>
      <td className="p-2 text-center">
        <input type="checkbox" className="h-5 w-5" checked={!!value.sand_save} onChange={(e) => onChange({ sand_save: e.target.checked })} />
      </td>
      <td className="p-2 text-center">
        <input type="checkbox" className="h-5 w-5" checked={!!value.penalty} onChange={(e) => onChange({ penalty: e.target.checked })} />
      </td>
    </tr>
  );
}