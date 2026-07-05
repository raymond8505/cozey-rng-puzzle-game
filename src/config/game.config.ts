// Single source of truth for every tunable value. JSON-serializable shape:
// no functions, no class instances — so it can cross the server/client boundary
// or be swapped for a fetched config later without touching game or UI logic.
//
// Nothing in src/game or src/ui may hardcode a value that lives here. In
// particular there are NO pixel constants: geometry is normalized and SVG
// scales via viewBox, so changing board.cols/rows needs zero code changes.

export type DeckCardType =
  | "governor"
  | "edgePunch"
  | "neighborPunch"
  | "secondLook"
  | "crowbar"
  | "reveal";

/** Reason-code prefixes that map to no-effect copy (see resolveCard). */
export type NoEffectCopyKey =
  | "edgePunch"
  | "neighborPunch"
  | "secondLook"
  | "crowbar"
  | "reveal";

export interface GameConfig {
  readonly board: { readonly cols: number; readonly rows: number };
  readonly machine: {
    readonly fastMs: number;
    readonly slowMs: number;
    readonly comfortableMs: number;
  };
  readonly queue: { readonly capacityRatio: number };
  readonly hand: { readonly capacity: number; readonly openingSize: number };
  readonly deck: ReadonlyArray<{
    readonly card: DeckCardType;
    readonly count: number;
  }>;
  readonly scoring: {
    readonly tiers: ReadonlyArray<{
      readonly min: number;
      readonly slogan: string;
    }>;
  };
  readonly copy: {
    readonly noEffect: Readonly<Record<NoEffectCopyKey, string>>;
  };
  /** Deterministic fallback seed (tests, non-browser contexts). Interactive
   *  runs mint a random seed per game (src/ui/seed.ts) and carry it here so
   *  restart can reproduce the run. */
  readonly rng: { readonly seed: string };
}

export const GAME_CONFIG: GameConfig = {
  board: { cols: 7, rows: 5 },
  machine: { fastMs: 90, slowMs: 2600, comfortableMs: 750 },
  queue: { capacityRatio: 0.1 },
  hand: { capacity: 3, openingSize: 0 },
  // Governor is out of the shipped rotation (its type, effect, and UI remain
  // playable).
  deck: [
    { card: "crowbar", count: 3 },
    { card: "reveal", count: 2 },
    { card: "secondLook", count: 1 },
    { card: "edgePunch", count: 1 },
    { card: "neighborPunch", count: 2 },
  ],
  scoring: {
    tiers: [
      { min: 100, slogan: "Flawless." },
      { min: 85, slogan: "Basically perfect." },
      { min: 60, slogan: "Nailed it!" },
      { min: 30, slogan: "Nailed it…" },
      { min: 0, slogan: "Art." },
    ],
  },
  copy: {
    noEffect: {
      edgePunch:
        "No edge tiles are left in the Machine — the filter matched nothing.",
      neighborPunch:
        "Nothing on the board borders any tile still in the Machine.",
      secondLook:
        "Only one tile remained — the second look showed the same tile.",
      crowbar: "There was nothing on the board to pry loose.",
      reveal: "The finished picture is already showing.",
    },
  },
  rng: { seed: "dev-seed" },
};
