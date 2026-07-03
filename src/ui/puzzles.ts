// The set of puzzles. Each bundles its image and its own grid, so a puzzle can
// carry its own difficulty (image contrast + board size). Play Again alternates
// through this list. Images are vite asset imports (URLs); the grid feeds
// createInitialState as a per-run board override.

import wheatField from "@/assets/puzzle.jpg";
import waterLilies from "@/assets/puzzle-low.jpg";

export interface Puzzle {
  readonly id: string;
  readonly label: string;
  readonly src: string;
  readonly board: { readonly cols: number; readonly rows: number };
}

export const PUZZLES: readonly Puzzle[] = [
  // Higher contrast, distinct regions — the gentler puzzle.
  { id: "wheatfield", label: "Wheat Field with Cypresses", src: wheatField, board: { cols: 6, rows: 4 } },
  // Low contrast, tonal — harder to read, on a larger grid.
  { id: "waterlilies", label: "Water Lilies", src: waterLilies, board: { cols: 7, rows: 5 } },
];

export const nextPuzzleIndex = (i: number): number => (i + 1) % PUZZLES.length;
