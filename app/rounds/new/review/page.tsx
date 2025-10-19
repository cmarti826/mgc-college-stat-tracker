"use client";

import { useMemo } from "react";
import { saveRoundWithHoles } from "../actions";

export default function ReviewStep(props: {
  playerKey: string;
  courseKey: string;
  teeSetId: string;        // uuid
  playedAt: string;        // "YYYY-MM-DD"
  holes: Array<{
    number: number;        // hole number 1..18
    par: number;
    yardage: number;
    fairwayHit?: boolean;
    greenInReg?: boolean;
    putts?: number;
    sandSaveAttempt?: boolean;
    upAndDown?: boolean;
  }>;
}) {
  // shape the payload the RPC expects
  const holesJson = useMemo(
    () =>
      JSON.stringify(
        props.holes.map(h => ({
          hole: h.number,
          par: h.par,
          yardage: h.yardage,
          fir: !!h.fairwayHit,
          gir: !!h.greenInReg,
          putts: Number(h.putts ?? 0),
          sand: !!h.sandSaveAttempt,
          updown: !!h.upAndDown,
        }))
      ),
    [props.holes]
  );

  return (
    <form action={saveRoundWithHoles}>
      <input type="hidden" name="playerKey" value={props.playerKey} />
      <input type="hidden" name="courseKey" value={props.courseKey} />
      <input type="hidden" name="teeSetId"  value={props.teeSetId} />
      <input type="hidden" name="playedAt"  value={props.playedAt} />
      <input type="hidden" name="holesJson" value={holesJson} />

      <button
        type="submit"
        className="btn btn-primary"
      >
        Save &amp; Finish
      </button>
    </form>
  );
}
