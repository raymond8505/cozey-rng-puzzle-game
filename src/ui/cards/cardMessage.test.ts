import { describe, it, expect } from "vitest";
import { GAME_CONFIG } from "@/config/game.config";
import type { CardPlayResult, CardReasonCode } from "@/game/types";
import { messageForResult } from "./cardMessage";
import { EFFECT_TOAST } from "./cardMeta";

describe("messageForResult", () => {
  it("maps effect results to their confirmation copy", () => {
    const r: CardPlayResult = { kind: "effect", card: "governor", effect: "governorSpeed" };
    expect(messageForResult(GAME_CONFIG, r)).toEqual({
      message: EFFECT_TOAST.governorSpeed,
      tone: "effect",
    });
  });

  it("maps each no-effect reasonCode to the configured copy", () => {
    const cases: Array<[CardReasonCode, keyof typeof GAME_CONFIG.copy.noEffect]> = [
      ["edgePunch.noEdgePieces", "edgePunch"],
      ["neighborPunch.noQualifyingPieces", "neighborPunch"],
      ["secondLook.onePieceLeft", "secondLook"],
      ["crowbar.boardEmpty", "crowbar"],
    ];
    for (const [reasonCode, key] of cases) {
      const r: CardPlayResult = { kind: "noEffect", card: "crowbar", reasonCode };
      const out = messageForResult(GAME_CONFIG, r);
      expect(out.tone).toBe("noEffect");
      expect(out.message).toBe(GAME_CONFIG.copy.noEffect[key]);
      expect(out.message.length).toBeGreaterThan(0);
    }
  });
});
