# Modo: tracker — Application Tracker & Quota Status

## Tracker Display

Lee y muestra `data/applications.md`.

**Formato del tracker:**
```markdown
| # | Date | Company | Role | Score | Status | PDF | Report | Notes |
```

**Score format:** New evaluations show `XX% (TN)` (e.g., `87% (T3)`). Pre-2026-04-14 entries show the old `X.X/5` format — both are valid.

**Status flow:** `Evaluated` → `Applied` → `Responded` → `Interview` → `Offer` / `Rejected` / `Discarded` / `SKIP`

- `Applied` = candidate submitted application
- `Responded` = recruiter/company responded and candidate replied (inbound)
- `Evaluated` = report complete, application pending decision

Si el usuario pide actualizar un estado, editar la fila correspondiente en `data/applications.md`.

## Statistics

Mostrar también:
- Total applications by status
- Average match % (new-format entries only)
- % with PDF generated
- % with report generated
- Company dedup flags (companies with 2+ applications)

## Quota Status

Lee `data/quota.md` y muestra el progreso de hoy vs objetivo:

```
Today's Quota — {date}
─────────────────────────────────────────
T1 (96–100%): {today_count} / 25 target   [{today_count/25 * 100:.0f}%]
T2 (91–95%):  {today_count} / 15 target   [{today_count/15 * 100:.0f}%]
T3 (86–90%):  {today_count} / 5 target    [{today_count/5 * 100:.0f}%]
T4 (80–85%):  {today_count} / 5 target    [{today_count/5 * 100:.0f}%]
─────────────────────────────────────────
Total:        {sum} / 50 target
```

Si no se han registrado aplicaciones hoy, mostrar: "No applications logged today. T1 queue is the priority."

**Reminder:** Fill T1 → T2 → T3/T4 in priority order each day.
