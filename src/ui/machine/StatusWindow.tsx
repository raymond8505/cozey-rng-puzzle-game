import { useEffect, useRef } from "react";
import { useGame } from "../store";

/** Console-style status readout: every game message is a line appended to a
 *  scrollable history. Sticks to the newest line unless the player has
 *  scrolled up to read back; returning to the bottom re-engages the stick. */
export function StatusWindow() {
  const log = useGame((s) => s.log);
  const boxRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef(true);

  const onScroll = () => {
    const el = boxRef.current;
    // 8px tolerance absorbs sub-pixel rounding at the bottom edge.
    if (el) stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 8;
  };

  useEffect(() => {
    const el = boxRef.current;
    if (el && stickRef.current) el.scrollTop = el.scrollHeight;
  }, [log]);

  return (
    <div
      className="status-window"
      ref={boxRef}
      onScroll={onScroll}
      role="log"
      aria-label="Machine status"
    >
      <ul className="status-list">
        {log.map((e) => (
          <li key={e.id} className={`status-line status-${e.tone}`}>
            {e.text}
          </li>
        ))}
      </ul>
    </div>
  );
}
