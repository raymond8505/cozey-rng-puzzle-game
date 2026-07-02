import type { GameConfig, NoEffectCopyKey } from "@/config/game.config";
import type { CardPlayResult } from "@/game/types";
import { EFFECT_TOAST } from "./cardMeta";

export interface CardToast {
  readonly message: string;
  readonly tone: "effect" | "noEffect";
}

/** Map a card result to user-facing copy. No-effect copy comes from config,
 *  keyed by the reasonCode prefix (§2.5). */
export function messageForResult(
  config: GameConfig,
  result: CardPlayResult,
): CardToast {
  if (result.kind === "effect") {
    return { message: EFFECT_TOAST[result.effect], tone: "effect" };
  }
  const key = result.reasonCode.split(".")[0] as NoEffectCopyKey;
  const message = config.copy.noEffect[key];
  return { message: message ?? "Nothing happened.", tone: "noEffect" };
}
