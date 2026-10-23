# Command workflows

Examples target Worktree CLI 0.5.0. Check installed `--help` for current options and `schema --json` for project choices. Replace paths, IDs, authors, and file contents with real values. These examples illustrate operations within the user's request; they are not instructions to run every command.

## Discover and select

```powershell
worktree --version
worktree task edit --help
worktree schema --project "C:\projects\example" --json
worktree task list --project "C:\projects\example" --search "search" --json
worktree task list --project "C:\projects\example" --status doing --label frontend --json
```

Use original IDs from results. Exact type/priority IDs are project-specific. Filters combine with AND. If discovery fails because the project is uninitialized, follow the user-input process in SKILL.md before creating anything.

## Read → preview → update → verify

PowerShell example for an existing task. Check the exit code before parsing stdout or proceeding:

```powershell
$projectPath = "C:\projects\example"
$taskId = "W001"
$taskJson = worktree task show $taskId --project $projectPath --json
if ($LASTEXITCODE -ne 0) { throw "Task read failed; inspect stderr." }
$taskRead = $taskJson | ConvertFrom-Json

worktree task edit $taskId --status doing --expect $taskRead.revision --dry-run --project $projectPath --json
if ($LASTEXITCODE -ne 0) { throw "Preview failed; inspect stderr." }

worktree task edit $taskId --status doing --expect $taskRead.revision --project $projectPath --json
if ($LASTEXITCODE -ne 0) { throw "Update failed; inspect stderr." }

worktree task show $taskId --project $projectPath --json
worktree validate --project $projectPath --json
```

A preview does not change the revision or reserve the project. On `CONFLICT`, read the current task again and reconcile; do not reuse the stale revision. After a successful write, obtain a fresh revision for another write.

## Create tasks and milestones

Read `status --json` to obtain a revision, then supply it as `--expect`. `<revision>` below means that real hash, not literal text.

```powershell
worktree status --project "C:\projects\example" --json
worktree milestone add --title "First release" --expect "<revision>" --project "C:\projects\example" --json
```

Use the milestone's returned `id` and a fresh revision for task creation:

```powershell
worktree task add --title "Improve search" --milestone MS001 --expect "<fresh revision>" --project "C:\projects\example" --json
```

Do not guess the next ID or replay creation after an uncertain response without checking whether it succeeded.

## Structured fields and Markdown

Write this as a UTF-8 `task-update.json`, adapting values to the selected task. Arrays replace the existing list; preserve labels/dependencies that should remain.

```json
{
  "labels": [
    "frontend",
    "api"
  ],
  "references": [
    {
      "type": "file",
      "value": "docs/search.md"
    }
  ]
}
```

```powershell
worktree task edit W001 --input task-update.json --expect "<revision>" --project "C:\projects\example" --json
worktree task edit W001 --description-file description.md --expect "<fresh revision>" --project "C:\projects\example" --json
```

`file` references are relative paths, not attachments or executable instructions. Body files are UTF-8. Use `--text-file review.md` for comment bodies. A filename of `-` reads a pipe; stdin can only be read once and is unavailable for payloads inside `shell`.

## Comments and one-level replies

Use the author's name agreed with the user. First inspect existing comments and the current project revision:

```powershell
worktree comment list W001 --project "C:\projects\example" --json
worktree comment add W001 --author "Alice" --text "Verified the search behavior." --expect "<revision>" --project "C:\projects\example" --json
```

Use the actual task-local comment number from a subsequent list and a fresh revision:

```powershell
worktree comment add W001 --author "Alice" --text "Follow-up verification complete." --reply-to '#001' --expect "<fresh revision>" --project "C:\projects\example" --json
```

Quote `#001` so PowerShell does not interpret it as a comment. A reply preserves its direct target while remaining one level deep. A comment with replies cannot be edited. Deleting it preserves the replies and leaves a tombstone.

## Batch changes

For an existing W001, this `batch.json` updates its status and adds a comment in one save:

```json
{
  "commands": [
    ["task", "edit", "W001", "--status", "doing"],
    ["comment", "add", "W001", "--author", "Alice", "--text", "Implementation started."]
  ]
}
```

```powershell
worktree batch --input batch.json --expect "<revision>" --dry-run --project "C:\projects\example" --json
worktree batch --input batch.json --expect "<same revision if unchanged>" --project "C:\projects\example" --json
```

All intermediate states must validate; any failed command prevents the save. Maximum 100 task/milestone/comment writes. Put project, revision, and preview flags on the outer command; input/body files are not supported inside batch. Errors identify `batchCommand` (1-based) and `batchIndex` (0-based). Generated IDs are in `results`.

## Delete with known impact

Within an authorized deletion request, inspect its preview. Resolve child/reference policies with the user if they were not specified.

```powershell
worktree milestone delete MS001 --children keep --dry-run --expect "<revision>" --project "C:\projects\example" --json
worktree milestone delete MS001 --children keep --yes --expect "<same revision if unchanged>" --project "C:\projects\example" --json
```

`--children keep` leaves tasks unassigned; `--children delete` also deletes them and their comments. `--detach` additionally removes predecessor references from surviving tasks; add it only when that effect is authorized. Ordinary task deletion uses `task delete ID --yes`. There is no undo.

## Reset an existing project (CLI 0.5.0+)

Only for a user-authorized fresh start. The preview includes the entire data folder, including files not counted as tasks/comments. Read its project name and revision, explain the scope, and have the user supply the exact name before deletion.

```powershell
worktree project reset --dry-run --project "C:\projects\example" --json
worktree project reset --confirm-name "User-confirmed project name" --yes --expect "<preview revision>" --project "C:\projects\example" --json
```

Parent folders and files outside the data folder remain. After successful deletion, collect new settings using the SKILL.md initialization flow before running `init`. Reset does not automatically recreate the project. If recreation fails or is cancelled, the old data is not restored. Never replace a missing reset command with manual recursive deletion.

## Diagnose failures

| Result | Response |
| --- | --- |
| `CONFLICT` | Re-read, reconcile, then use the new revision. Stop repeated conflicts. |
| Command/input error (exit 2) | Consult that command's `--help`; correct arguments or JSON. |
| Validation failure (exit 1) | Inspect the error fields and project choices; preserve existing data. |
| `RECOVERY_REQUIRED` | Inspect with `recover --dry-run --json`; do not delete journals. |
| `STORAGE_LOCK_FAILED` | Another process may be saving. Do not bypass the shared lock. |

Recovery execution uses `recover --yes --project PATH --json` only when its impact is authorized. A reset in the deleting stage finishes deletion; it is not a restore. Report unresolved errors rather than weakening checks or retrying indefinitely.
