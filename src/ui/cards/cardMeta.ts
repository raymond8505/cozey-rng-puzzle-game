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
    blurb: "This draw shows only edge pieces.",
  },
  neighborPunch: {
    name: "Neighbor Punch",
    cardClass: "attack",
    blurb: "This draw shows pieces bordering the board.",
  },
  secondLook: {
    name: "Second Look",
    cardClass: "defense",
    blurb: "Draw up to twice; keep either.",
  },
  crowbar: {
    name: "Crowbar",
    cardClass: "defense",
    blurb: "Pry a placed piece back into your hand.",
  },
};

/** Brief confirmation shown when an effect goes live (dry, factual). */
export const EFFECT_TOAST: Readonly<Record<CardEffectKind, string>> = {
  governorSpeed: "Governor engaged — comfortable speed this draw.",
  filterEdge: "Edge Punch — the Machine now shows edge pieces.",
  filterNeighbor: "Neighbor Punch — the Machine now shows bordering pieces.",
  secondLookArmed: "Second Look — draw up to twice, keep either.",
  crowbarLift: "Pried loose — route the piece.",
};
