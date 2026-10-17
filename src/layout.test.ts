import { it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { makePdf } from "./pdf";
import { initialProject, newParticipant } from "./model";
import { defaultObediencePlan } from "./rules";
it("all printable text stays inside margins, including dense Level 5 and full Scent sheets", async () => {
  for (const discipline of ["Obedience", "Scent"] as const) {
    for (const layout of [1, 2] as const) {
      const p = initialProject();
      p.discipline = discipline;
      p.judge = "Judge Example";
      p.level = 5;
      p.roundsPerSheet = layout;
      p.plan = defaultObediencePlan(5, "1", p.judge);
      p.plan.judgeOptions.level5FigureEightSegment = "1";
      if (discipline === "Scent")
        p.participants = Array.from({ length: 20 }, () => newParticipant());
      const bytes = await makePdf(
        p,
        undefined,
        undefined,
        new Uint8Array(readFileSync("public/cwags-logo.png")),
      );
      const task = getDocument({ data: bytes, useSystemFonts: true });
      const doc = await task.promise;
      for (let n = 1; n <= doc.numPages; n++) {
        const page = await doc.getPage(n),
          content = await page.getTextContent();
        for (const item of content.items) {
          if (!("str" in item) || !item.str.trim()) continue;
          expect(item.transform[4]).toBeGreaterThanOrEqual(30);
          expect(item.transform[5]).toBeGreaterThanOrEqual(20);
          expect(item.transform[4] + item.width).toBeLessThanOrEqual(584);
          expect(item.transform[5] + item.height).toBeLessThanOrEqual(780);
        }
      }
      await task.destroy();
    }
  }
}, 30000);
