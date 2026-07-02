import puzzleUrl from "@/assets/puzzle.jpg";

/** The always-visible reference of the finished picture. */
export function TargetThumbnail({ size = 64 }: { size?: number }) {
  return (
    <img
      src={puzzleUrl}
      alt="Target picture"
      className="target-thumb"
      style={{ width: size, height: size }}
    />
  );
}
