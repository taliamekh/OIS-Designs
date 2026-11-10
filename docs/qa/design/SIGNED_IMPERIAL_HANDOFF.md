# QA-UNIT02 — negative feet/inches have two negative components

Confirmed06:28UTC by actual production `measure(value,"ft")` execution. This affects negative distances passed to the shared formatter, including the readable legacy opening's negative inside-corner distance. No QA production edits.

| Canonical metres | Actual | Correct rounded signed value |
| --- | --- | --- |
| -.05 | -1′ -2″ | -0′ 2″ |
| -1 | -4′ -3″ | -3′ 3″ |
| -.9398 | -4′ -1″ | -3′ 1″ |

The current formatter rounds signed total inches, floors the signed feet and uses JavaScript's signed remainder for inches. This exaggerates the magnitude. Format one leading sign and nonnegative feet/inches from rounded absolute inches. Preserve positive output and canonical metres; no saved-data migration is necessary. Round tiny values to plain0′0″ rather than negative zero; include half-inch ties and carry in the formatter check.

Actual06:32browser screenshots now confirm the same-1′-2″ error for the old-.05mcorner in both Open doorway and Window inspectors. Frozen evidence is under frozen-evidence/signed-ft-0633. The26assertion legacy UI audit passes24physical/recovery/units/history/reload cases and fails only the two signed displays. The original immediate body sample was premature during route return; the screenshot shows the actual incorrect value, and the retest now waits explicitly for the ft offset field. This is separate from the repaired physical validator; no native claim.
