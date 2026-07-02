// Public surface of the pure game core. UI imports from here.
export * from "./types";
export { GAME_CONFIG } from "@/config/game.config";
export type { GameConfig } from "@/config/game.config";
export { createInitialState } from "./init";
export { reduce } from "./reducer";
export * from "./selectors";
export { resolveCard } from "./cards";
export { generatePieces, edgePieceIds, neighborPieceIds } from "./pieces";
// Note: grid.cellCount(dims) is intentionally not re-exported to avoid a name
// clash with selectors.cellCount(state); import it from "@/game/grid" directly.
export type { GridDims } from "./grid";
export { colOf, rowOf, classifyCell, orthNeighbors } from "./grid";
export { Rng, shuffle, hashSeed, makeRngState } from "./rng";
