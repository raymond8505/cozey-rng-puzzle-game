import { useGame } from "../store";

/** The always-visible reference of the finished picture. Height is fixed;
 *  width follows the source image's aspect ratio (no square crop). */
export function TargetThumbnail({ size = 64 }: { size?: number }) {
  const puzzleSrc = useGame((s) => s.puzzleSrc);
  return (
    <img
      src={puzzleSrc}
      alt="Target picture"
      className="target-thumb"
      style={{ height: size }}
    />
  );
}
