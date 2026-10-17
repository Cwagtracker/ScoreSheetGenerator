import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFPage,
  type PDFFont,
} from "pdf-lib";
import {
  OBEDIENCE_RULES,
  OBEDIENCE_GENERAL_NON_QUALIFYING,
  validateObediencePlan,
} from "./rules";
import { createRallyScoreSheetPdf, type RallyCourseMapUpload } from "./rally";
import { buildScentPages, SCENT_FAULTS } from "./scent";
import type { Project, Participant } from "./model";
const navy = rgb(0.08, 0.2, 0.25),
  gray = rgb(0.87, 0.9, 0.91);
export async function makePdf(
  p: Project,
  map?: RallyCourseMapUpload,
  template?: Uint8Array,
  logo?: Uint8Array,
) {
  if (p.discipline === "Rally") {
    const bytes =
      template ||
      new Uint8Array(
        await (await fetch("/rally-judge-sheet.pdf")).arrayBuffer(),
      );
    return createRallyScoreSheetPdf(
      bytes,
      [
        {
          id: p.round,
          class_name: p.className,
          class_type: "rally",
          judge_name: p.judge,
          round_number: Number(p.round),
        },
      ],
      p.participants.map((d) => ({
        selectionId: d.id,
        roundId: p.round,
        handler: d.handler,
        dog: d.dog,
        registration: d.registration,
        division: d.division,
        entryType: d.entryType,
        jumpHeight: d.jumpHeight,
        runningPosition: Number(d.position) || null,
      })),
      `${p.trial} | ${p.club}`,
      p.date,
      map ? { [p.round]: map } : {},
    );
  }
  if (p.discipline === "Obedience") {
    const issues = validateObediencePlan({
      ...p.plan,
      judgeName: p.judge,
      trialRoundId: p.round,
    });
    if (issues.length) throw Error(issues.map((i) => i.message).join(" "));
  }
  const doc = await PDFDocument.create(),
    font = await doc.embedFont(StandardFonts.Helvetica),
    bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const brand = logo ? await doc.embedPng(logo) : undefined;
  function text(
    page: PDFPage,
    value: string,
    x: number,
    y: number,
    size = 9,
    f: PDFFont = font,
  ) {
    let clean = value.replace(/[^\x20-\x7E\xA0-\xFF]/g, "-");
    while (clean.length && f.widthOfTextAtSize(clean, size) > 580 - x)
      clean = clean.slice(0, -1);
    page.drawText(clean, { x, y, size, font: f, color: navy });
  }
  function wrap(value: string, width: number, size = 9) {
    const words = value.split(/\s+/),
      lines: string[] = [];
    let line = "";
    for (const word of words) {
      if (font.widthOfTextAtSize(`${line} ${word}`, size) > width && line) {
        lines.push(line);
        line = word;
      } else line += (line ? " " : "") + word;
    }
    if (line) lines.push(line);
    return lines;
  }
  function header(title: string, person?: Participant) {
    const page = doc.addPage([612, 792]);
    text(page, "C-Wags", 32, 751, 23, bold);
    text(page, title, 32, 731, 12, bold);
    if (brand) {
      const scale = Math.min(78 / brand.width, 48 / brand.height);
      page.drawImage(brand, {
        x: 502,
        y: 730,
        width: brand.width * scale,
        height: brand.height * scale,
      });
    }
    let y = 704;
    for (const line of [
      p.trial || "Trial / event",
      `${p.club}  |  ${p.date}  |  Judge: ${p.judge}`,
      `${p.className}  |  Round ${p.round}`,
      person
        ? `${person.handler} / ${person.dog}  |  C-Wags # ${person.registration}`
        : "",
      person
        ? `${person.division}  |  ${person.entryType}  |  Jump: ${person.jumpHeight || "--"}  |  Position: ${person.position || "--"}`
        : "",
    ]) {
      for (const part of wrap(line, 548)) {
        text(page, part, 32, y);
        y -= 13;
      }
    }
    text(
      page,
      "Independently produced. Verify current official C-Wags rules and forms.",
      32,
      24,
      8,
    );
    return { page, y: y - 12 };
  }
  if (p.discipline === "Obedience")
    for (const person of p.participants) {
      const rules = OBEDIENCE_RULES[p.level];
      let { page, y } = header(
        `OBEDIENCE ${p.level} | PARTICIPANT SCORE SHEET`,
        person,
      );
      text(
        page,
        `Maximum ${rules.maximumPoints} | Qualifying ${rules.qualifyingPoints} | At least 50% in each exercise`,
        32,
        y,
        10,
        bold,
      );
      y -= 25;
      for (const ex of rules.exercises) {
        page.drawRectangle({
          x: 32,
          y: y - 27,
          width: 548,
          height: 28,
          color: gray,
        });
        text(page, ex.name, 39, y - 11, 10, bold);
        text(
          page,
          ex.passFail
            ? "Pass / Fail"
            : `Max ${ex.maximumPoints}   Earned _____   NQ [ ]`,
          365,
          y - 11,
          9,
        );
        y -= 43;
      }
      text(
        page,
        "Total __________   Result: Q [ ]  NQ [ ]     Judge signature __________________",
        32,
        y,
        10,
        bold,
      );
      y -= 25;
      text(page, "COURSE ORDER (split Heeling is one score)", 32, y, 9, bold);
      y -= 14;
      for (const line of wrap(
        p.plan.items
          .slice()
          .sort((a, b) => a.performanceOrder - b.performanceOrder)
          .map(
            (i) =>
              `${i.performanceOrder}. ${rules.exercises.find((e) => e.id === i.exerciseId)?.name}${i.segment ? ` (${i.segment})` : ""}${i.exerciseFinished === false ? " + next" : ""}`,
          )
          .join("  /  "),
        548,
        8,
      )) {
        text(page, line, 32, y, 8);
        y -= 11;
      }
      if (p.level === 3) {
        text(
          page,
          `Required Heeling element: ${p.plan.judgeOptions.level3HeelingRequiredElement}`,
          32,
          y - 5,
          8,
        );
      }
      if (p.level === 5) {
        text(
          page,
          `Figure 8: Heeling Section ${p.plan.judgeOptions.level5FigureEightSegment}`,
          32,
          y - 5,
          8,
        );
      }
      const ref = header(
        `OBEDIENCE ${p.level} | JUDGE'S EXERCISE REFERENCE`,
        person,
      );
      page = ref.page;
      y = ref.y;
      for (const ex of rules.exercises) {
        const lines = wrap(ex.description, 548, 8);
        const deductions = wrap(
          Object.entries(ex.deductions)
            .map(([k, v]) => `${k}: ${v.join("; ")}`)
            .join(" | "),
          548,
          8,
        );
        const height = 22 + (lines.length + deductions.length) * 11;
        if (y - height < 65) {
          page = header(
            `OBEDIENCE ${p.level} | REFERENCE CONTINUED`,
            person,
          ).page;
          y = 610;
        }
        text(
          page,
          `${ex.name} (${ex.maximumPoints ?? "Pass/fail"})`,
          32,
          y,
          9,
          bold,
        );
        y -= 13;
        for (const line of [...lines, ...deductions]) {
          text(page, line, 32, y, 8);
          y -= 11;
        }
        y -= 9;
      }
      for (const line of wrap(
        `General NQ: ${OBEDIENCE_GENERAL_NON_QUALIFYING.join("; ")}. Tie-breaker: ${rules.tieBreaker}`,
        548,
        8,
      )) {
        if (y < 55) {
          page = header("GENERAL NQ / TIE-BREAKER", person).page;
          y = 610;
        }
        text(page, line, 32, y, 8);
        y -= 11;
      }
    }
  if (p.discipline === "Scent") {
    const start = Number(p.round) || 1;
    const rounds = Array.from({ length: p.roundsPerSheet }, (_, i) => ({
      id: String(i + 1),
      class_name: p.className,
      class_type: "scent",
      judge_name: p.judge,
      trial_day_id: p.date,
      round_number: start + i,
    }));
    const lines = p.participants.flatMap((d) =>
      d.rounds
        .filter((r) => r <= p.roundsPerSheet)
        .map((r) => ({
          entryId: d.id,
          selectionId: `${d.id}-${r}`,
          roundId: String(r),
          handler: d.handler,
          dog: d.dog,
          registration: d.registration,
          runningPosition: Number(d.position) || null,
        })),
    );
    for (const sheet of buildScentPages(rounds, lines, p.roundsPerSheet)) {
      const h = header(
        `SCENT | ${p.roundsPerSheet} ROUND${p.roundsPerSheet === 2 ? "S" : ""} PER SHEET`,
      );
      let y = h.y;
      for (const dog of sheet.dogs) {
        const first = dog.lines.find(Boolean)!;
        text(
          h.page,
          `${first.runningPosition ?? "-"}. ${first.handler} / ${first.dog} / ${first.registration}`,
          32,
          y,
          8,
          bold,
        );
        y -= p.roundsPerSheet === 1 ? 0 : 12;
        dog.lines.forEach((line, i) => {
          h.page.drawRectangle({
            x: 32,
            y: y - 17,
            width: 548,
            height: p.roundsPerSheet === 1 ? 11 : 20,
            borderColor: gray,
            borderWidth: 0.5,
            ...(line ? { color: rgb(0.91, 0.95, 0.98) } : {}),
          });
          if (line)
            text(
              h.page,
              `Round ${start + i}    Time ______    Faults ______    Q [ ]  NQ [ ]    Judge ______`,
              38,
              y - 10,
              8,
            );
          y -= p.roundsPerSheet === 1 ? 20 : 21;
        });
        y -= p.roundsPerSheet === 1 ? 5 : 5;
      }
      for (const line of wrap(SCENT_FAULTS, 548, 8)) {
        text(
          h.page,
          line,
          32,
          65 - wrap(SCENT_FAULTS, 548, 8).indexOf(line) * 10,
          8,
        );
      }
      text(
        h.page,
        `Page ${sheet.page} / ${sheet.pageCount}. Blank round rows mean not entered.`,
        32,
        90,
        8,
      );
    }
  }
  return doc.save();
}
