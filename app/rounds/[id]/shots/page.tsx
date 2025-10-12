// app/rounds/[id]/shots/page.tsx
import { getRoundHeader, getShots } from "@/app/rounds/_components/shotActions";
import ShotEditor from "@/app/rounds/_components/ShotEditor";
import type { ShotInputType } from "@/app/rounds/_components/shotActions";
import Link from "next/link";

export default async function ShotsPage({ params }: { params: { id: string } }) {
  const roundId = params.id;

  const { data: round, error: hdrErr } = await getRoundHeader(roundId);
  if (hdrErr || !round) {
    return (
      <div className="mx-auto max-w-[1100px] p-6">
        <h1 className="text-2xl font-semibold">Round not found</h1>
        <p className="text-gray-600 mt-2">{hdrErr ?? "We couldn't load that round."}</p>
        <div className="mt-6">
          <Link href={`/rounds/${roundId}`} className="underline">
            Back to round
          </Link>
        </div>
      </div>
    );
  }

  const player = Array.isArray(round.player) ? round.player[0] : round.player;
  const course = Array.isArray(round.course) ? round.course[0] : round.course;
  const tee = Array.isArray(round.tee) ? round.tee[0] : round.tee;

  const dateStr = round.date
    ? new Date(round.date).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "";

  const header = {
    playerName: player?.full_name ?? player?.name ?? "Unknown Player",
    courseName: course?.name ?? "Unknown Course",
    teeName: tee?.name ?? "Tee",
    dateStr,
  };

  const { data: existingShots, error: shotsErr } = await getShots(roundId);
  if (shotsErr) {
    return (
      <div className="mx-auto max-w-[1100px] p-6">
        <h1 className="text-2xl font-semibold">Couldn’t load shots</h1>
        <p className="text-gray-600 mt-2">{shotsErr}</p>
        <div className="mt-6">
          <Link href={`/rounds/${roundId}`} className="underline">
            Back to round
          </Link>
        </div>
      </div>
    );
  }

  const shots: ShotInputType[] = (existingShots ?? []) as ShotInputType[];

  return (
    <div className="mx-auto max-w-[1100px] p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Shot Entry — Strokes Gained</h1>
        <Link href={`/rounds/${roundId}`} className="rounded-xl border px-4 py-2 hover:shadow">
          Back to Round
        </Link>
      </div>

      <ShotEditor roundId={roundId} header={header} initialShots={shots} />
    </div>
  );
}
