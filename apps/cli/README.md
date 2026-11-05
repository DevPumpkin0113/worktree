# Worktree CLI

[EN](https://github.com/DevPumpkin0113/worktree/blob/main/apps/cli/README.md) | [KO](https://github.com/DevPumpkin0113/worktree/blob/main/apps/cli/README.ko.md)

A command-line tool for managing project tasks and schedules.

Requires Windows x64 and Node.js 24 or later.

## Desktop app

Installation link (GitHub) : [@DevPumpkin0113/worktree](https://github.com/DevPumpkin0113/worktree)

## CLI installation

```powershell
npm install --global @devpumpkin0113/worktree-cli
```

## Update — `update`

```powershell
worktree update --check
worktree update
```

`--check` checks the latest version without installing. `update` updates the npm global installation and applies on the next run. No project is required. If npm cannot be located, use `npm install -g @devpumpkin0113/worktree-cli@latest`.

Interactive terminal commands check in the background at most once a day and show a known update on the next run. Updates are installed only when requested. Automatic checks never block commands and are disabled for `--json` and redirected output.

## Start — `init`

Run in your project folder and follow the prompts.

```powershell
cd C:\projects\example
worktree init
```

Choose a project name, data directory, ID prefix, and task rules. Enter accepts the default; Ctrl+C cancels. Skip this step for an initialized project.

Issue prefixes accept 1–20 ASCII letters, converted to uppercase, except reserved `EP` and `MS`. Priorities are limited to five, excluding Unassigned. Existing `EP`-prefix projects remain readable.

## Reference data

Use `--description` or `--description-file` with `epic add` / `epic edit` to write an epic goal. Goals are stored as Markdown in the epic document body and preserved when editing other fields.

`task add` and `task edit` accept this array through `--references` or JSON input:

```json
[
  { "type": "web", "value": "https://example.com/spec", "name": "Specification" },
  { "type": "file", "value": "docs/spec.md" },
  { "type": "folder", "value": "docs/assets", "name": "Assets" },
  { "type": "text", "value": "Legacy note" }
]
```

`name` is optional. File/folder paths are project-root-relative; absolute paths and parent traversal are rejected. `web` requires an absolute HTTP(S) URL. Existing `text`/`file` references remain supported without automatically adding names. Arrays replace the entire list; `[]` clears it.

## Session — `shell`

Keep a project open while running commands.

```powershell
worktree shell
```

Omit `worktree` inside the session.

```text
task list
task add --title "Improve search"
exit
```

| Command | Purpose |
| --- | --- |
| `use "C:\projects\other"` | Switch projects |
| `author "Alice"` | Set comment author |
| `language ko` | Use Korean messages |
| `format json` / `format table` | Change output format |
| `exit` / `quit` | Close the session |

Ctrl+C clears the current input. Session settings and history are discarded on exit.

## Issues — `task`

The UI calls these issues; existing `task` commands, IDs, and storage filenames remain compatible. CLI 0.6.0 supports `--epic EP001` to assign an issue directly to an epic without a milestone. Do not supply both a valid `--epic` and `--milestone`. `task edit ID --milestone -` keeps the current epic and makes the issue a direct child; `--epic -` clears the assignment.

Examples use the default W prefix. Replace IDs with those in your project.

```powershell
worktree task list
worktree task show W001
worktree task add --title "Improve search"
worktree task edit W001 --status doing
worktree task delete W001 --yes
```

Common options:

| Field | Example |
| --- | --- |
| Title | `--title "Improve search"` |
| Description | `--description-file description.md` |
| Status | `--status doing` |
| Assignee | `--owner "Alice"` |
| Milestone | `--milestone MS001` |
| Start date | `--start 2026-10-23` |
| End date | `--end 2026-10-30` |
| Priority | `--priority high` |
| Task type | `--type improvement` |
| Labels | `--labels "frontend,api"` |

Statuses: `todo`, `doing`, `blocked`, `done`. Priorities and types follow project settings. Run `worktree task add --help` for all fields.

### Completion timestamps

Changing an issue to `done` automatically records `completedAt` in UTC. Editing a completed issue preserves it; reopening clears it, and completing again records a new timestamp. Planned `start` and `end` dates remain unchanged. Existing completed issues without a timestamp are left unknown and excluded from daily completion statistics.

For an explicitly known historical completion time, correct a completed issue with:

```powershell
worktree task edit W001 --completed-at "2026-10-29T15:00:00.000Z"
worktree task show W001 --json
```

This example represents 2026-10-30 00:00 in Korea time. Correction is allowed only for completed issues and cannot exceed the updated timestamp. Retrospectively recorded work can have a completion timestamp earlier than its document creation timestamp. App Insights groups completions by Korea date.

### Search and filters

Filters can be combined.

```powershell
worktree task list --search "search"
worktree task list --owner "Alice"
worktree task list --status doing
worktree task list --milestone MS001
worktree task list --type feature
worktree task list --priority high
worktree task list --label frontend
```

## Milestones — `milestone`

Group tasks with a title and optional dates.

```powershell
worktree milestone list
worktree milestone show MS001
worktree milestone add --title "First release"
worktree milestone edit MS001 --start 2026-10-23 --end 2026-10-30
worktree milestone delete MS001 --yes --children keep
```

Use `--children keep` to retain tasks or `--children delete` to delete them. Add `--detach` when external predecessor references must be removed. Deletion cannot be undone.

## Epics — `epic` (CLI 0.6.0)

Epics group milestones and can also contain issues directly. Existing projects without epics remain readable without automatic file changes.

```powershell
worktree epic add --title "CLI delivery"
worktree epic list
worktree epic show EP001
worktree epic edit EP001 --title "Terminal task management"
worktree milestone edit MS001 --epic EP001
worktree task list --epic EP001
worktree milestone edit MS001 --epic -
worktree epic delete EP001 --yes --children keep
```

Use IDs returned by creation. Moving items preserves IDs, filenames, and comments. `--children keep` retains milestones and tasks and clears their epic assignment; `delete` removes descendants and their comments. External predecessor references require `--detach` consent. Projects containing epic data require app 0.34.0 / CLI 0.6.0 or later.

Icons: `epic add/edit --icon lucide:folder` or one Unicode emoji such as `🚀`. `--icon-color "#ef4444"` sets an optional icon color. `--icon -` resets to Lucide Layers; `--icon-color -` resets only the color. Read supported icon names in `worktree schema --json`.

## Comments — `comment`

```powershell
worktree comment list W001
worktree comment add W001 --author "Alice" --text "Please review."
worktree comment add W001 --author "Alice" --text "Reviewed." --reply-to '#001'
worktree comment edit W001 '#002' --text "Review complete."
worktree comment delete W001 '#002' --yes
```

Author selection: `--author`, session author, then app display name. Quote comment numbers. Comments with replies cannot be edited; deleting them preserves replies.

## Project — `project`

```powershell
worktree project show
worktree project edit --input settings.json
```

Include only changed fields in the JSON file. Arrays replace the entire list.

```json
{
  "name": "Team project",
  "assignees": [
    "Alice",
    "CODEX"
  ],
  "labels": [
    "frontend",
    "api"
  ]
}
```

Data location, prefix, and ID sequences cannot be changed.

## Reset — `project reset`

Available from CLI 0.5.0. Delete the existing planning data and settings, then create the project again.

```powershell
worktree project reset
worktree init
```

Review the deletion scope and enter the exact project name. Cancellation changes nothing. Reset permanently deletes the entire data folder and `worktree.json`; parent folders and files outside the data folder remain. There is no undo.

For automation, use the reviewed project name and revision:

```powershell
worktree project reset --dry-run --json
worktree project reset --confirm-name "Project name" --yes --expect "<revision>" --json
```

Enter new settings with `init` after reset. Ordinary `init` never overwrites a project.

## Check — `status`, `validate`, `schema`

```powershell
worktree status
worktree validate
worktree schema --json
```

| Command | Purpose |
| --- | --- |
| `status` | Project progress |
| `validate` | Check document errors |
| `schema` | Task fields and project-specific choices |

## Batch — `batch`

Run up to 100 task, milestone, or comment commands in order and save once. Any failure cancels the save.

```powershell
worktree batch --input batch.json --dry-run --json
worktree batch --input batch.json
```

```json
{
  "commands": [
    ["task", "add", "--title", "Improve search"],
    ["task", "edit", "W001", "--status", "doing"]
  ]
}
```

## Recovery — `recover`

Inspect interrupted saves or resets before recovery. A reset already in its deletion stage finishes deleting the remaining data.

```powershell
worktree recover --dry-run --json
worktree recover --yes
```

## Common options

| Option | Purpose |
| --- | --- |
| `--project "C:\projects\example"` | Target folder; defaults to the current folder |
| `--lang ko` / `--lang en` | Message language; defaults to English |
| `--json` | JSON output for automation |
| `--dry-run` | Preview changes |
| `--input data.json` | Read JSON input |
| `--expect HASH` | Save only if the previously read revision matches |

AI agents can use `--help` and `schema --json` to discover commands and choices, then `--json` and `--expect` to handle results and conflicts.

Read UTF-8 descriptions with `--description-file` and comments with `--text-file`. Use `-` instead of a filename for piped stdin. Use files inside a shell session.

Exit codes: `0` success · `1` read/validation/save failure · `2` command/input error.

## Help

```powershell
worktree --help
worktree task add --help
worktree help comment add
worktree --version
```

[Report an issue](https://github.com/DevPumpkin0113/worktree/issues) with the version, command, error, and reproduction steps.

## References

- [Backlog.md](https://github.com/MrLesk/Backlog.md)
- [Linear](https://linear.app/features)
