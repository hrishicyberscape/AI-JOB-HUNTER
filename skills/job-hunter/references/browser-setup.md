# Browser setup

The skill needs a browser tool that can open pages, read page text, click, type and
**upload files**. The recommended choice for every agent is the
[Playwright MCP server](https://github.com/microsoft/playwright-mcp). It works the same
in Claude Code, Gemini CLI and Codex CLI, opens a real Chrome window the user can see
and sign in to, and keeps that sign-in between runs.

This repo ships ready-made config for it:

| Agent | Config file in this repo | Picked up automatically? |
|---|---|---|
| Claude Code | `.mcp.json` | Yes, approve the server when Claude Code asks |
| Gemini CLI | `.gemini/settings.json` | Yes, when Gemini CLI is started in the repo folder |
| Codex CLI | (user config) | Run the command below once |

All three store the browser profile in `.browser-profile/` (git-ignored). The user
signs in to LinkedIn, Indeed and so on **once** in that window, and later runs reuse
the session.

## Codex CLI
```bash
codex mcp add playwright -- npx @playwright/mcp@latest --user-data-dir .browser-profile
```
Or add this to `~/.codex/config.toml`:
```toml
[mcp_servers.playwright]
command = "npx"
args = ["@playwright/mcp@latest", "--user-data-dir", ".browser-profile"]
```

## Windows note
If the agent reports that `npx` can't be started, change the command to `cmd` and put
`/c`, `npx` in front of the arguments:
```json
"command": "cmd",
"args": ["/c", "npx", "@playwright/mcp@latest", "--user-data-dir", ".browser-profile"]
```

## Alternatives
- **Claude Code + Claude in Chrome:** works in the user's everyday Chrome, where they are
  probably already signed in. Install the Claude in Chrome extension, sign in to it with
  the same account as Claude Code, and start Claude Code with `claude --chrome`
  (or enable it with `/chrome`).
- **Chrome DevTools MCP**, or any other browser MCP server with navigation, page text,
  click, type and file upload.

## Mapping skill actions to tools
| Skill says | Playwright MCP tool | Claude in Chrome tool |
|---|---|---|
| open a page | `browser_navigate` | `navigate` |
| read page text | `browser_snapshot` | `get_page_text` / `read_page` |
| click / type | `browser_click` / `browser_type` | `computer` (click/type) or `find` + `form_input` |
| upload the resume | `browser_file_upload` (absolute path) | `file_upload` |
| wait for the user | ask in chat, then `browser_snapshot` again | same |

Always pass an **absolute** path when uploading a resume.

## Sign-in etiquette
The browser window is the user's. They type passwords and one-time codes and solve
captchas there. The agent never asks for a password in chat and never types one.
