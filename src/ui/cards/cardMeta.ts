import type { CardType, CardEffectKind } from "@/game/types";

export type CardClass = "attack" | "defense";

interface CardMeta {
  readonly name: string;
  readonly cardClass: CardClass;
  /** Short, factual description shown on the card face. No metaphor (§1). */
  readonly blurb: string;
}

export const CARD_META: Readonly<Record<CardType, CardMeta>> = {
  governor: {
    name: "Governor",
    cardClass: "attack",
    blurb: "This draw runs at a comfortable speed.",
  },
  edgePunch: {
    name: "Edge Punch",
    cardClass: "attack",
    blurb: "This draw shows only edge tiles.",
  },
  neighborPunch: {
    name: "Neighbor Punch",
    cardClass: "attack",
    blurb: "This draw shows tiles bordering the board.",
  },
  secondLook: {
    name: "Second Look",
    cardClass: "defense",
    blurb: "Draw up to twice; keep either.",
  },
  crowbar: {
    name: "Crowbar",
    cardClass: "defense",
    blurb: "Pry a placed tile back off the board.",
  },
};

/** Brief confirmation shown when an effect goes live (dry, factual). */
export const EFFECT_TOAST: Readonly<Record<CardEffectKind, string>> = {
  governorSpeed: "Comfortable speed this draw.",
  filterEdge: "The Machine now only shows edge tiles.",
  filterNeighbor:
    "The Machine now only shows tiles neighbouring tiles on the board",
  secondLookArmed: "Draw two, pick one.",
  crowbarLift: "Take a tile from the board, park or replace it in a new spot",
};
