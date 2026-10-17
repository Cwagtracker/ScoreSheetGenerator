import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import {
  initialProject,
  newParticipant,
  parseProject,
  type Project,
} from "./model";
import {
  OBEDIENCE_RULES,
  defaultObediencePlan,
  validateObediencePlan,
  type ObedienceLevel,
} from "./rules";
import { makePdf } from "./pdf";
import type { RallyCourseMapUpload } from "./rally";
import "./style.css";
import Preview from "./Preview";
function App() {
  const [p, setP] = useState(initialProject),
    [preview, setPreview] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [map, setMap] = useState<RallyCourseMapUpload>(),
    [drag, setDrag] = useState<number | null>(null);
  const update = (patch: Partial<Project>) => {
    setP((old) => ({ ...old, ...patch }));
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return "";
    });
  };
  const plan = { ...p.plan, judgeName: p.judge, trialRoundId: p.round };
  const issues =
    p.discipline === "Obedience" ? validateObediencePlan(plan) : [];
  const save = (blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  async function generate() {
    setBusy(true);
    setError("");
    try {
      const logo = new Uint8Array(
        await (await fetch("/cwags-logo.png")).arrayBuffer(),
      );
      const bytes = await makePdf(p, map, undefined, logo);
      if (preview) URL.revokeObjectURL(preview);
      setPreview(
        URL.createObjectURL(
          new Blob([bytes as BlobPart], { type: "application/pdf" }),
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "PDF could not be created.");
    } finally {
      setBusy(false);
    }
  }
  function move(from: number, to: number) {
    if (to < 0 || to >= p.plan.items.length) return;
    const items = [...p.plan.items];
    items.splice(to, 0, items.splice(from, 1)[0]);
    update({
      plan: {
        ...p.plan,
        items: items.map((i, n) => ({ ...i, performanceOrder: n + 1 })),
      },
    });
  }
  function field(label: string, key: keyof Project, type = "text") {
    return (
      <label>
        {label}
        <input
          type={type}
          value={String(p[key])}
          maxLength={120}
          onChange={(e) => update({ [key]: e.target.value })}
        />
      </label>
    );
  }
  return (
    <>
      <header>
        <a className="brand" href="#main">
          <img src="/cwags-logo.png" alt="C-Wags" />
          <span>
            Score Sheet Studio<small>RALLY · OBEDIENCE · SCENT</small>
          </span>
        </a>
        <span className="local">● Works entirely in your browser</span>
      </header>
      <main id="main">
        <div className="intro">
          <div className="eyebrow">LESS PAPERWORK. MORE RING TIME.</div>
          <h1>
            A good day starts with
            <br />a clear score sheet.
          </h1>
          <p>
            Set up your event, add your teams, and print sheets your judge can
            use.
          </p>
        </div>
        <div className="notice">
          <strong>Save a project file to keep your work.</strong> Unsaved data
          lives in this browser tab and is lost when it closes or reloads.
          Course maps are temporary and are not included in project files.
        </div>
        <div className="toolbar">
          <button
            onClick={() =>
              save(
                new Blob([JSON.stringify(p, null, 2)], {
                  type: "application/json",
                }),
                "cwags-project.json",
              )
            }
          >
            Save project JSON
          </button>
          <label className="button">
            Open project JSON
            <input
              className="file"
              type="file"
              accept=".json,application/json"
              onChange={async (e) => {
                try {
                  const f = e.target.files?.[0];
                  if (f) {
                    if (f.size > 2_000_000)
                      throw Error("Project file must be under 2 MB.");
                    update(parseProject(await f.text()));
                    setMap(undefined);
                    setError("");
                  }
                } catch (err) {
                  setError(String(err));
                }
                e.target.value = "";
              }}
            />
          </label>
        </div>
        <div className="workspace">
          <div>
            <section>
              <div className="section-head">
                <span>01</span>
                <h2>Event & class</h2>
              </div>
              <div className="tabs" role="group" aria-label="Discipline">
                {(["Rally", "Obedience", "Scent"] as const).map((d) => (
                  <button
                    aria-pressed={p.discipline === d}
                    className={p.discipline === d ? "selected" : ""}
                    key={d}
                    onClick={() =>
                      update({
                        discipline: d,
                        className:
                          d === "Obedience"
                            ? `Level ${p.level}`
                            : d === "Rally"
                              ? "Starter"
                              : "Scent Level 1",
                      })
                    }
                  >
                    {d}
                  </button>
                ))}
              </div>
              <div className="fields">
                {field("Trial / event name", "trial")}
                {field("Host / club", "club")}
                {field("Event date", "date", "date")}
                {field("Judge", "judge")}
                {p.discipline === "Obedience" ? (
                  <label>
                    Obedience level
                    <select
                      value={p.level}
                      onChange={(e) => {
                        const level = Number(e.target.value) as ObedienceLevel;
                        update({
                          level,
                          className: `Level ${level}`,
                          plan: defaultObediencePlan(level, p.round, p.judge),
                        });
                      }}
                    >
                      {[1, 2, 3, 4, 5].map((n) => (
                        <option key={n} value={n}>
                          Level {n}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  field("Class", "className")
                )}
                {field(
                  p.discipline === "Scent" ? "Starting round" : "Round",
                  "round",
                  "number",
                )}
              </div>
              {p.discipline === "Scent" && (
                <>
                  <h3>Print layout</h3>
                  <div className="tabs">
                    {([1, 2] as const).map((n) => (
                      <button
                        key={n}
                        aria-pressed={p.roundsPerSheet === n}
                        className={p.roundsPerSheet === n ? "selected" : ""}
                        onClick={() => update({ roundsPerSheet: n })}
                      >
                        {n} round{n === 2 ? "s" : ""} per sheet
                      </button>
                    ))}
                  </div>
                  <p className="hint">
                    Paired rounds keep each dog aligned. A blank round row means
                    the dog is not entered.
                  </p>
                </>
              )}
              {p.discipline === "Rally" && (
                <label className="upload">
                  Optional course map · PDF, JPG or PNG
                  <input
                    type="file"
                    accept="application/pdf,image/jpeg,image/png"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      if (f.size > 10_000_000) {
                        setError("Map must be under 10 MB.");
                        return;
                      }
                      setMap({
                        bytes: new Uint8Array(await f.arrayBuffer()),
                        fileName: f.name,
                        mimeType: f.type,
                      });
                      setPreview("");
                    }}
                  />
                  <span className="hint">
                    Temporary browser-only storage. First PDF page is used.{" "}
                    {map?.fileName}
                  </span>
                  {map && (
                    <button
                      onClick={() => {
                        setMap(undefined);
                        setPreview("");
                      }}
                    >
                      Remove map
                    </button>
                  )}
                </label>
              )}
            </section>
            <section>
              <div className="section-head">
                <span>02</span>
                <h2>Participants</h2>
              </div>
              {p.participants.map((d, index) => (
                <fieldset key={d.id}>
                  <legend>Team {index + 1}</legend>
                  <div className="fields">
                    {(
                      [
                        ["Handler", "handler"],
                        ["Dog", "dog"],
                        ["C-Wags number", "registration"],
                        ["Division", "division"],
                        ["Entry type", "entryType"],
                        ["Running position", "position"],
                        ...(p.discipline !== "Scent"
                          ? [["Jump height", "jumpHeight"]]
                          : []),
                      ] as [string, keyof typeof d][]
                    ).map(([label, key]) => (
                      <label key={key}>
                        {label}
                        <input
                          maxLength={100}
                          value={String(d[key])}
                          onChange={(e) =>
                            update({
                              participants: p.participants.map((x) =>
                                x.id === d.id
                                  ? { ...x, [key]: e.target.value }
                                  : x,
                              ),
                            })
                          }
                        />
                      </label>
                    ))}
                  </div>
                  {p.discipline === "Scent" && (
                    <div className="checks">
                      {Array.from(
                        { length: p.roundsPerSheet },
                        (_, i) => i + 1,
                      ).map((r) => (
                        <label key={r}>
                          <input
                            type="checkbox"
                            checked={d.rounds.includes(r)}
                            onChange={(e) =>
                              update({
                                participants: p.participants.map((x) =>
                                  x.id === d.id
                                    ? {
                                        ...x,
                                        rounds: e.target.checked
                                          ? [...x.rounds, r]
                                          : x.rounds.filter((n) => n !== r),
                                      }
                                    : x,
                                ),
                              })
                            }
                          />
                          Round {(Number(p.round) || 1) + r - 1}
                        </label>
                      ))}
                    </div>
                  )}
                  <button
                    className="text-button"
                    disabled={p.participants.length === 1}
                    onClick={() =>
                      update({
                        participants: p.participants.filter(
                          (x) => x.id !== d.id,
                        ),
                      })
                    }
                  >
                    Remove team
                  </button>
                </fieldset>
              ))}
              <button
                onClick={() =>
                  update({
                    participants: [...p.participants, newParticipant()],
                  })
                }
              >
                + Add participant
              </button>
            </section>
            {p.discipline === "Obedience" && (
              <section>
                <div className="section-head">
                  <span>03</span>
                  <h2>Judge's course planner</h2>
                </div>
                <p className="hint">
                  Drag exercises to arrange the course, or use the arrow
                  buttons. Scores always count each exercise once.
                </p>
                {OBEDIENCE_RULES[p.level].notes.map((n) => (
                  <p className="rule" key={n}>
                    {n}
                  </p>
                ))}
                {p.level === 3 && (
                  <label>
                    Required Heeling element
                    <select
                      value={
                        p.plan.judgeOptions.level3HeelingRequiredElement || ""
                      }
                      onChange={(e) =>
                        update({
                          plan: {
                            ...p.plan,
                            judgeOptions: {
                              ...p.plan.judgeOptions,
                              level3HeelingRequiredElement: e.target.value,
                            },
                          },
                        })
                      }
                    >
                      <option value="">Choose an element</option>
                      <option value="circle">Circle</option>
                      <option value="figure-8">Figure 8</option>
                      <option value="270-turn">270-degree turn</option>
                    </select>
                  </label>
                )}
                {p.level === 5 && (
                  <label>
                    Section containing Figure 8
                    <select
                      value={p.plan.judgeOptions.level5FigureEightSegment || ""}
                      onChange={(e) =>
                        update({
                          plan: {
                            ...p.plan,
                            judgeOptions: {
                              ...p.plan.judgeOptions,
                              level5FigureEightSegment: e.target.value,
                            },
                          },
                        })
                      }
                    >
                      <option value="">Choose a section</option>
                      {p.plan.items
                        .filter((i) => i.segment)
                        .map((i) => (
                          <option key={i.segment} value={i.segment}>
                            Section {i.segment}
                          </option>
                        ))}
                    </select>
                  </label>
                )}
                <ol className="course">
                  {p.plan.items.map((item, index) => {
                    const def = OBEDIENCE_RULES[p.level].exercises.find(
                      (e) => e.id === item.exerciseId,
                    )!;
                    return (
                      <li
                        key={`${item.exerciseId}-${item.segment}`}
                        draggable
                        onDragStart={() => setDrag(index)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => {
                          if (drag !== null) move(drag, index);
                          setDrag(null);
                        }}
                      >
                        <div>
                          <strong>
                            {index + 1}. {def.name}
                            {item.segment ? ` · Section ${item.segment}` : ""}
                          </strong>
                          <small>
                            {def.passFail
                              ? "Pass / Fail"
                              : `${def.maximumPoints} points${item.segment ? " shared across sections" : ""}`}
                          </small>
                          {p.level === 5 && item.segment && (
                            <label className="check">
                              <input
                                type="checkbox"
                                checked={item.exerciseFinished === false}
                                onChange={(e) =>
                                  update({
                                    plan: {
                                      ...p.plan,
                                      items: p.plan.items.map((x, n) =>
                                        n === index
                                          ? {
                                              ...x,
                                              exerciseFinished:
                                                !e.target.checked,
                                            }
                                          : x,
                                      ),
                                    },
                                  })
                                }
                              />
                              Combine with one following exercise
                            </label>
                          )}
                        </div>
                        <div className="arrows">
                          <button
                            aria-label={`Move ${def.name} up`}
                            disabled={!index}
                            onClick={() => move(index, index - 1)}
                          >
                            ↑
                          </button>
                          <button
                            aria-label={`Move ${def.name} down`}
                            disabled={index === p.plan.items.length - 1}
                            onClick={() => move(index, index + 1)}
                          >
                            ↓
                          </button>
                          {item.segment && item.segment > 1 && (
                            <button
                              aria-label="Remove Heeling section"
                              onClick={() =>
                                update({
                                  plan: {
                                    ...p.plan,
                                    items: p.plan.items
                                      .filter((_, n) => n !== index)
                                      .map((x, n) => ({
                                        ...x,
                                        performanceOrder: n + 1,
                                      })),
                                  },
                                })
                              }
                            >
                              ×
                            </button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ol>
                {[1, 3, 5].includes(p.level) && (
                  <button
                    onClick={() => {
                      const first = p.plan.items.find((i) => i.segment)!;
                      const next =
                        Math.max(...p.plan.items.map((i) => i.segment || 0)) +
                        1;
                      update({
                        plan: {
                          ...p.plan,
                          items: [
                            ...p.plan.items,
                            {
                              ...first,
                              segment: next,
                              performanceOrder: p.plan.items.length + 1,
                            },
                          ],
                        },
                      });
                    }}
                  >
                    + Add Heeling section
                  </button>
                )}
                <div
                  className={issues.length ? "validation" : "valid"}
                  role="status"
                >
                  {issues.length ? (
                    <>
                      <strong>Before exporting:</strong>
                      <ul>
                        {issues.map((i) => (
                          <li key={i.code + i.exerciseId}>{i.message}</li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    "Course order is valid."
                  )}
                </div>
                <details>
                  <summary>Points, descriptions & deductions</summary>
                  {OBEDIENCE_RULES[p.level].exercises.map((e) => (
                    <article key={e.id}>
                      <h3>
                        {e.name} · {e.maximumPoints ?? "Pass/fail"}
                      </h3>
                      <p>{e.description}</p>
                      {Object.entries(e.deductions).map(([k, v]) => (
                        <p key={k}>
                          <strong>{k}:</strong> {v.join("; ")}
                        </p>
                      ))}
                    </article>
                  ))}
                </details>
              </section>
            )}
          </div>
          <aside>
            <div className="preview-card">
              <div className="eyebrow">READY FOR THE RING</div>
              <h2>Your printable sheets</h2>
              <p>
                {p.participants.length} team
                {p.participants.length === 1 ? "" : "s"} · {p.discipline}
              </p>
              <p className="hint">
                US Letter · Clear scoring spaces
                <br />
                {p.discipline === "Obedience"
                  ? "Includes exercise reference pages."
                  : "Professional judge sheet layout."}
              </p>
              <button
                className="primary"
                disabled={busy || issues.length > 0}
                onClick={generate}
              >
                {busy ? "Preparing PDF…" : "Preview score sheets"}
              </button>
              {preview && (
                <>
                  <a
                    className="button download"
                    href={preview}
                    download="cwags-score-sheets.pdf"
                  >
                    Download PDF
                  </a>
                  <a href={preview} target="_blank" rel="noreferrer">
                    Open full-size preview
                  </a>
                  <Preview url={preview} />
                </>
              )}
              <p className="hint">
                Preview the completed PDF before downloading.
              </p>
            </div>
          </aside>
        </div>
        {error && (
          <div className="error" role="alert">
            {error}
            <button onClick={() => setError("")}>Dismiss</button>
          </div>
        )}
        <footer>
          <strong>Made for trial hosts and judges.</strong>
          <p>
            This independently produced tool is not an official C-Wags product.
            Verify current{" "}
            <a href="https://c-wags.org" target="_blank" rel="noreferrer">
              C-Wags rules and forms
            </a>{" "}
            before use. Obedience uses the September 2020 ruleset verified in
            the source reference on October 16, 2026. No account, database, or
            server storage. Project JSON files stay where you save them.
          </p>
        </footer>
      </main>
    </>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
