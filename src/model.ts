import {
  defaultObediencePlan,
  OBEDIENCE_RULES,
  type ObedienceClassPlan,
} from "./rules";
export type Participant = {
  id: string;
  handler: string;
  dog: string;
  registration: string;
  division: string;
  entryType: string;
  jumpHeight: string;
  position: string;
  rounds: number[];
};
export type Project = {
  version: 1;
  discipline: "Rally" | "Obedience" | "Scent";
  trial: string;
  club: string;
  date: string;
  judge: string;
  className: string;
  round: string;
  level: 1 | 2 | 3 | 4 | 5;
  roundsPerSheet: 1 | 2;
  participants: Participant[];
  plan: ObedienceClassPlan;
};
export const newParticipant = (): Participant => ({
  id: crypto.randomUUID(),
  handler: "",
  dog: "",
  registration: "",
  division: "Standard",
  entryType: "Regular",
  jumpHeight: "",
  position: "",
  rounds: [1, 2],
});
export const initialProject = (): Project => ({
  version: 1,
  discipline: "Obedience",
  trial: "",
  club: "",
  date: new Date().toLocaleDateString("en-CA"),
  judge: "",
  className: "Level 1",
  round: "1",
  level: 1,
  roundsPerSheet: 2,
  participants: [newParticipant()],
  plan: defaultObediencePlan(1, "1", ""),
});
export function parseProject(text: string): Project {
  const p = JSON.parse(text);
  if (
    !p ||
    p.version !== 1 ||
    !["Rally", "Obedience", "Scent"].includes(p.discipline) ||
    !Array.isArray(p.participants) ||
    p.participants.length > 500 ||
    p.participants.length < 1 ||
    ![1, 2, 3, 4, 5].includes(p.level) ||
    ![1, 2].includes(p.roundsPerSheet)
  )
    throw Error("Choose a valid version 1 project (maximum 500 participants).");
  for (const key of ["trial", "club", "date", "judge", "className", "round"])
    if (typeof p[key] !== "string" || p[key].length > 200)
      throw Error("Invalid project metadata.");
  for (const person of p.participants) {
    for (const key of [
      "id",
      "handler",
      "dog",
      "registration",
      "division",
      "entryType",
      "jumpHeight",
      "position",
    ])
      if (typeof person[key] !== "string" || person[key].length > 200)
        throw Error("Invalid participant.");
    if (
      !Array.isArray(person.rounds) ||
      person.rounds.some((r: number) => ![1, 2].includes(r))
    )
      throw Error("Invalid round selection.");
  }
  if (
    !p.plan ||
    !Array.isArray(p.plan.items) ||
    !p.plan.judgeOptions ||
    p.plan.level !== p.level
  )
    throw Error("Invalid course plan.");
  if (
    p.plan.items.length > 100 ||
    typeof p.plan.rulesetId !== "string" ||
    p.plan.items.some(
      (item: {
        exerciseId: string;
        performanceOrder: number;
        segment?: number;
      }) =>
        !item ||
        !OBEDIENCE_RULES[p.level as 1 | 2 | 3 | 4 | 5].exercises.some(
          (e) => e.id === item.exerciseId,
        ) ||
        !Number.isFinite(item.performanceOrder) ||
        (item.segment !== undefined &&
          (!Number.isInteger(item.segment) || item.segment < 1)),
    )
  )
    throw Error("Invalid course exercises.");
  if (
    new Set(p.participants.map((person: Participant) => person.id)).size !==
    p.participants.length
  )
    throw Error("Duplicate participant identity.");
  return p;
}
