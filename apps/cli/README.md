# Worktree CLI

[English](README.md) | [한국어](README.ko.md)

A command-line tool for managing project tasks and schedules.

Requires Windows x64 and Node.js 24 or later.

## Desktop app

Installation link (GitHub) : [@DevPumpkin0113/worktree](https://github.com/DevPumpkin0113/worktree)

## CLI installation

```powershell
npm install --global @devpumpkin0113/worktree-cli
```

## Start — `init`

Run in your project folder and follow the prompts.

```powershell
cd C:\projects\example
worktree init
```

Choose a project name, data directory, ID prefix, and task rules. Enter accepts the default; Ctrl+C cancels. Skip this step for an initialized project.

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

## Tasks — `task`

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
worktree milestone edit MS001 --end 2026-10-30
worktree milestone delete MS001 --yes --children keep
```

Use `--children keep` to retain tasks or `--children delete` to delete them. Add `--detach` when external predecessor references must be removed. Deletion cannot be undone.

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

## References and related projects

- [Backlog.md](https://github.com/MrLesk/Backlog.md) — Reference for document-based tasks and human–AI collaboration.
- [Linear](https://linear.app/features) — Related issue and project management service.
