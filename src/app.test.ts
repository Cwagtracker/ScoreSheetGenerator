import { describe, it, expect } from "vitest";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { PDFDocument } from "pdf-lib";
import {
  OBEDIENCE_RULES,
  defaultObediencePlan,
  validateObediencePlan,
  calculateObedienceResult,
  type ObedienceLevel,
} from "./rules";
import { initialProject, newParticipant, parseProject } from "./model";
import { makePdf } from "./pdf";
import { buildScentPages } from "./scent";
describe("official scoring", () => {
  for (const n of [1, 2, 3, 4, 5] as ObedienceLevel[])
    it(`Level ${n} counts each score once`, () => {
      const r = OBEDIENCE_RULES[n],
        scores = Object.fromEntries(
          r.exercises
            .filter((e) => e.maximumPoints !== null)
            .map((e) => [e.id, e.maximumPoints]),
        );
      expect(calculateObedienceResult(n, scores, {}, "pass")).toEqual({
        total: r.maximumPoints,
        result: "Q",
      });
      expect(
        calculateObedienceResult(
          n,
          { ...scores, [r.exercises[0].id]: 0 },
          {},
          "pass",
        ).result,
      ).toBe("NQ");
      expect(calculateObedienceResult(n, {}, {}, "pass").result).toBe(
        "unjudged",
      );
      expect(
        calculateObedienceResult(
          n,
          { ...scores, [r.exercises[0].id]: NaN },
          {},
          "pass",
        ).result,
      ).toBe("invalid");
    });
  it("Honor is required", () => {
    const scores = Object.fromEntries(
      OBEDIENCE_RULES[2].exercises.map((e) => [e.id, e.maximumPoints]),
    );
    expect(calculateObedienceResult(2, scores, {}, "fail").result).toBe("NQ");
  });
});
describe("mandatory course order", () => {
  it("Greeting must be last", () => {
    const p = defaultObediencePlan(1, "1", "Judge");
    p.items.reverse().forEach((i, n) => (i.performanceOrder = n));
    expect(
      validateObediencePlan(p).some((i) => i.code === "GREETING_LAST"),
    ).toBe(true);
  });
  it("Level 2 first, linked and final blocks", () => {
    const p = defaultObediencePlan(2, "1", "Judge");
    expect(validateObediencePlan(p)).toEqual([]);
    [p.items[0], p.items[3]] = [p.items[3], p.items[0]];
    p.items.forEach((i, n) => (i.performanceOrder = n));
    expect(validateObediencePlan(p).map((i) => i.code)).toContain(
      "L2_HEELING_FIRST",
    );
    expect(validateObediencePlan(p).map((i) => i.code)).toContain(
      "L2_CALL_POSITION_LINK",
    );
    p.items.reverse().forEach((i, n) => (i.performanceOrder = n));
    expect(validateObediencePlan(p).map((i) => i.code)).toContain(
      "L2_END_ORDER",
    );
  });
  it("Level 3 element and two-section limit", () => {
    const p = defaultObediencePlan(3, "1", "Judge");
    expect(validateObediencePlan(p).map((i) => i.code)).toContain(
      "L3_HEELING_ELEMENT_REQUIRED",
    );
    p.judgeOptions.level3HeelingRequiredElement = "circle";
    p.items.push(
      { ...p.items[0], segment: 2, performanceOrder: 8 },
      { ...p.items[0], segment: 3, performanceOrder: 9 },
    );
    expect(validateObediencePlan(p).map((i) => i.code)).toContain(
      "TOO_MANY_PERFORMANCE_SEGMENTS",
    );
  });
  it("Level 4 incorporates Heeling without an extra score", () => {
    expect(
      OBEDIENCE_RULES[4].exercises.some((e) => e.allowsPerformanceSegments),
    ).toBe(false);
    expect(
      OBEDIENCE_RULES[4].exercises.reduce(
        (s, e) => s + (e.maximumPoints || 0),
        0,
      ),
    ).toBe(100);
  });
  it("Level 5 identifies Figure 8 and validates combinations", () => {
    const p = defaultObediencePlan(5, "1", "Judge");
    expect(validateObediencePlan(p).map((i) => i.code)).toContain(
      "L5_FIGURE_8_SECTION_REQUIRED",
    );
    p.judgeOptions.level5FigureEightSegment = "1";
    p.items[0].exerciseFinished = false;
    expect(validateObediencePlan(p)).toEqual([]);
    p.items.push({ ...p.items[0], segment: 2, performanceOrder: 11 });
    expect(validateObediencePlan(p).map((i) => i.code)).toContain(
      "L5_HEELING_COMBINATION_INVALID",
    );
    expect(
      OBEDIENCE_RULES[5].exercises.reduce(
        (s, e) => s + (e.maximumPoints || 0),
        0,
      ),
    ).toBe(150);
  });
});
it("JSON round trip and invalid schema", () => {
  const p = initialProject();
  expect(parseProject(JSON.stringify(p))).toEqual(p);
  expect(() => parseProject("{}")).toThrow();
});
describe("PDF invariants", () => {
  for (const level of [1, 2, 3, 4, 5] as ObedienceLevel[])
    it(`Level ${level}: score and readable reference pages`, async () => {
      const p = initialProject();
      p.level = level;
      p.className = `Level ${level}`;
      p.judge = "Judge Example";
      p.plan = defaultObediencePlan(level, "1", p.judge);
      p.plan.judgeOptions = {
        level3HeelingRequiredElement: "circle",
        level5FigureEightSegment: "1",
      };
      const bytes = await makePdf(
        p,
        undefined,
        undefined,
        new Uint8Array(readFileSync("public/cwags-logo.png")),
      );
      const doc = await PDFDocument.load(bytes);
      expect(doc.getPageCount()).toBe(2);
      for (const page of doc.getPages())
        expect(page.getSize()).toEqual({ width: 612, height: 792 });
      mkdirSync("work/pdfs", { recursive: true });
      writeFileSync(`work/pdfs/obedience-${level}.pdf`, bytes);
    });
  it("Rally produces one participant per page", async () => {
    const p = initialProject();
    p.discipline = "Rally";
    p.participants.push(newParticipant());
    const bytes = await makePdf(
      p,
      undefined,
      new Uint8Array(readFileSync("public/rally-judge-sheet.pdf")),
    );
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(2);
    writeFileSync("work/pdfs/rally.pdf", bytes);
  });
  for (const count of [1, 2] as const)
    it(`Scent ${count}-round pagination`, async () => {
      const p = initialProject();
      p.discipline = "Scent";
      p.roundsPerSheet = count;
      p.participants = Array.from({ length: 21 }, (_, i) => ({
        ...newParticipant(),
        handler: `Handler ${i + 1}`,
        dog: `Dog ${i + 1}`,
        position: String(i + 1),
      }));
      const bytes = await makePdf(p);
      expect((await PDFDocument.load(bytes)).getPageCount()).toBe(
        count === 1 ? 2 : 3,
      );
      writeFileSync(`work/pdfs/scent-${count}.pdf`, bytes);
    });
  it("Scent leaves missing paired round blank", () => {
    const rounds = [1, 2].map((n) => ({
      id: String(n),
      class_name: "Scent 1",
      class_type: "scent",
      judge_name: "J",
      trial_day_id: "today",
      round_number: n,
    }));
    const pages = buildScentPages(rounds, [
      {
        entryId: "dog",
        selectionId: "a",
        roundId: "2",
        handler: "H",
        dog: "D",
        registration: "123",
        runningPosition: 1,
      },
    ]);
    expect(pages[0].dogs[0].lines[0]).toBeUndefined();
    expect(pages[0].dogs[0].lines[1]?.registration).toBe("123");
  });
});
