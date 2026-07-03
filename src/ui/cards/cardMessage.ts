import type { GameConfig, NoEffectCopyKey } from "@/config/game.config";
import type { CardPlayResult } from "@/game/types";
import type { LogLine } from "../statusLog";
import { EFFECT_TOAST } from "./cardMeta";

/** Map a card result to a user-facing status line. No-effect copy comes from
 *  config, keyed by the reasonCode prefix (§2.5). */
export function messageForResult(config: GameConfig, result: CardPlayResult): LogLine {
  if (result.kind === "effect") {
    return { text: EFFECT_TOAST[result.effect], tone: "effect" };
  }
  const key = result.reasonCode.split(".")[0] as NoEffectCopyKey;
  const text = config.copy.noEffect[key];
  return { text: text ?? "Nothing happened.", tone: "noEffect" };
}
