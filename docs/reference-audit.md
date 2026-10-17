# Minimum reusable reference behavior

Inspected read-only on October 17, 2026: E:\Secretary Trial Management\Secretary Trial Management\cwags_trial_management-master.

- `src/lib/obedienceRules.ts`: self-contained September 2020 ruleset, reference verification date October 16, 2026. Retained descriptions, point catalogs, deductions, general NQ conditions, thresholds, segment limits and ordering validation. No service dependencies.
- `src/lib/rallyScoreSheetPdf.ts` and `public/templates/rally/rally-judge-sheet.pdf`: professional one-participant/round sheet, logo-safe metadata areas and temporary embedded first-page PDF or image map. Retained standalone exporter and authorized template.
- `src/lib/scentScoreSheetLayout.ts`: grouping by date/class, paired-round dog alignment by registration, blank unmatched round rows; capacities 20 dogs single-round and eight dogs paired-round. Retained pure pagination logic.
- `public/cwags-logo.png`: existing permitted branding.

No database, auth, Supabase, finances, entries service, dashboard, Games, RLS or trial-management code was imported. Source files were copied individually; the source repository was never edited.

The reference verification date is provenance, not a claim that these rules remain current. The app links to the official rulebook and directs users to verify current forms.
