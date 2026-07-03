// Builds the initial GameState from config + seed. This is the ONLY place the
// RNG is consumed (piece edges, pool order, deck order), which is what makes a
// run fully reproducible from its seed.

import type { GameConfig } from "@/config/game.config";
import { GAME_CONFIG } from "@/config/game.config";
import type { Card, GameState, PieceId } from "./types";
import { makeRngState, Rng, shuffle } from "./rng";
import { generatePieces } from "./pieces";

function buildDeck(config: GameConfig, rng: Rng): Card[] {
  // instanceId is the card's build-order index (0..deckSize-1) — unique within
  // a game and deterministic per seed (no cross-call mutable counter, so two
  // same-seed inits produce identical decks/hands).
  const cards: Card[] = [];
  let instanceId = 0;
  for (const { card, count } of config.deck) {
    for (let i = 0; i < count; i++) {
      cards.push({ instanceId: instanceId++, type: card });
    }
  }
  return shuffle(cards, rng);
}

export function createInitialState(
  seed: string = GAME_CONFIG.rng.seed,
  config: GameConfig = GAME_CONFIG,
): GameState {
  const dims = { cols: config.board.cols, rows: config.board.rows };
  const cellCount = dims.cols * dims.rows;

  // A single RNG stream, consumed in a fixed order: edges, then pool, then deck.
  const rngState = makeRngState(seed);
  const rng = new Rng(rngState.numericSeed);

  const pieces = generatePieces(dims, rng);
  const pool: PieceId[] = shuffle(
    pieces.map((p) => p.id),
    rng,
  );
  const fullDeck = buildDeck(config, rng);

  const openingSize = Math.min(config.hand.openingSize, fullDeck.length);
  const hand = fullDeck.slice(0, openingSize);
  const deck = fullDeck.slice(openingSize);

  return {
    config,
    pieces,
    pool,
    board: Array.from({ length: cellCount }, () => null),
    queue: [],
    hand,
    deck,
    discard: [],
    reshuffles: 0,
    held: null,
    phase: "idle",
    cardPlayedThisTurn: false,
    machine: {
      displayIndex: 0,
      filter: { kind: "none" },
      baseSpeedMs: config.machine.slowMs,
      governorActive: false,
    },
    secondLook: {
      armed: false,
      firstCapture: null,
      secondCapture: null,
      drawsUsed: 0,
    },
    rng: rngState,
    lastCardResult: null,
    lastRejection: null,
    turnCount: 0,
  };
}
