import { useEffect } from "react";
import { useGame } from "../store";
import { machineSpeedMs } from "@/game/selectors";

/** Drives the Machine window: dispatches ADVANCE_MACHINE on a timer at the
 *  effective speed while the Machine is spinning (idle / second-look with a
 *  nonempty pool). The core owns which piece is displayed; this hook only
 *  decides *when* it advances. */
export function useMachineCycle() {
  const dispatch = useGame((s) => s.dispatch);
  // Spin only when a draw is actually available: plain idle, or second-look
  // with one draw used (awaiting the optional second). After two draws the
  // chooser is up and there's nothing left to draw, so stop cycling.
  const spinning = useGame(
    (s) =>
      s.state.pool.length > 0 &&
      (s.state.phase === "idle" ||
        (s.state.phase === "secondLook" && s.state.secondLook.drawsUsed === 1)),
  );
  const speed = useGame((s) => machineSpeedMs(s.state));

  useEffect(() => {
    if (!spinning) return;
    const id = setInterval(() => dispatch({ type: "ADVANCE_MACHINE" }), speed);
    return () => clearInterval(id);
  }, [spinning, speed, dispatch]);
}
