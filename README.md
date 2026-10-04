# Session Tab Controller

An experimental, dependency-free OpenCode V2 plugin for creating session tabs,
messaging other sessions, and waiting for results in the foreground or background.
It is deliberately a small toy, not a production job scheduler.

## Install

Requires OpenCode V2 (developed against 2.0.22) and the local managed service.

```sh
opencode plugin add github:fermumen/session_tab_controller
```

The package includes both server and TUI entrypoints. No separate CLI plugin
configuration or build step is needed. Reopen the TUI if it does not reload.

For local development, clone this repository and add its absolute directory to
the global `plugins` array in `~/.config/opencode/opencode.json`, preserving other
settings:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["/absolute/path/to/session_tab_controller"]
}
```

Alternatively, symlink the repository into `~/.config/opencode/plugins/`.
Do not install both the GitHub package and a local checkout at the same time.

## Tools

Server, RPC, and TUI definitions are plain objects (the SDK's `define` helpers return those same
objects unchanged).

Adds the `session_tabs.create`, `session_tabs.list`, `session_tabs.send`, and `session_tabs.wait`
Code Mode tools (effective names use underscores, e.g. `session_tabs_create`).
It accepts `title`, optional `prompt`, and optional `model` containing `providerID`,
`id`, and `variant`. Without a model, OpenCode uses its normal default.

The server creates a root session at the invoking plugin's location, broadcasts
an RPC event, and optionally submits the first prompt. The TUI syncs the session
and opens a background tab without changing focus.

`list({})` lists saved sessions in the current folder, not just open tabs.
Use `allDirectories: true` for every folder, `search` to filter titles, and
`cursor`/`limit` for pagination. Execution status is a foreground snapshot:
`inactive` does not rule out background tools.

`wait({ sessionID })` waits in the foreground for the session's agent loop to
become idle, then returns its latest assistant text and finish reason. It does
not send a prompt or wait for future work. The default timeout is 300 seconds;
use `timeoutSeconds: 1` for a bounded poll. A timeout doesn't stop the target.
`background: true` returns immediately and queues a synthetic notification in
the calling conversation when idle, timed out, or failed. That notification can
wake the calling agent when it is idle. Waiting for your own session is rejected.

`send({ sessionID, prompt })` submits a queued prompt to an idle session and
returns its result after the completion marker following that prompt. It rejects
busy targets and overlapping plugin sends. `background: true` returns the
admitted `promptID` immediately and notifies this conversation later.

`wait({ sessionID, promptID })` observes that specific prompt instead of taking
the latest reply. `create` also returns `promptID` when given a first prompt.
Results include `completed`, `error`, `cancelled`, or `timeout`. If another input
overlaps, the result is `ambiguous`; if compaction/revert removes the prompt from
active context, the result is `untracked`. Neither returns a guessed reply.
Automatically loaded `AGENTS.md` instruction messages do not count as overlapping
requests. Other user or synthetic inputs between the surrounding idle markers do.
Prompt-specific waits check context every 500 ms with cancellation and a deadline;
later work in the session does not block retrieval of an earlier completed prompt.
The deadline also covers context reads. Timeout returns no reply, and cancelling
an observer does not cancel the independent target session.

```js
const session = JSON.parse(await tools.session_tabs.create({
  title: "Luna chat",
  model: { providerID: "openai", id: "gpt-6-luna", variant: "low" }
}))
await tools.session_tabs.send({ sessionID: session.sessionID, prompt: "Hello!" })

await tools.session_tabs.list({})
await tools.session_tabs.send({ sessionID: "ses_...", prompt: "Hello" })
await tools.session_tabs.send({ sessionID: "ses_...", prompt: "Hello", background: true })
await tools.session_tabs.wait({ sessionID: "ses_...", promptID: "msg_..." })
await tools.session_tabs.wait({ sessionID: "ses_..." })
await tools.session_tabs.wait({ sessionID: "ses_...", timeoutSeconds: 1 })
await tools.session_tabs.wait({ sessionID: "ses_...", background: true })
```

## Try it

Ask an agent: "Create a tab called Hello using openai/gpt-6-luna low, and send
Hello. Do not modify files in that session."

For a direct test from this folder:

```sh
opencode api post /api/rpc/toy.session-tabs/create --data '{"input":{"title":"Toy tab test"}}'
```

Existing clients should reload the plugin automatically. If there is no
"Session Tabs toy plugin loaded" toast, reopen the TUI. Restarting the background
service is not normally necessary.

## Limitations

- Tabs must be enabled and a TUI must have the plugin loaded.
- All listening TUI windows whose current folder matches may open the tab.
- Events are live only: clients disconnected during creation miss the request.
- `tabRequested` means the event was emitted, not that a client acknowledged it.
- The optional prompt starts normal agent execution with normal permissions.
- Listing, send busy checks, and pending-prompt checks use the local `opencode api`
  CLI and managed service. Different remote/private servers are not supported;
  those reads might otherwise consult the wrong server.
- Background waits are in-memory and cancelled on plugin reload or service exit.
- Prompt attribution is conservative, not a native per-prompt completion API:
  use idle sessions without concurrent external inputs. Busy checking is not an
  atomic lock across other clients. Missing boundaries time out without a reply.
- Prompt observation uses active context, so compaction/revert can make it untracked.
- The idle wait does not cover detached background work inside the target session.
- This toy does not provide general transcript-reading or deleting tools.
- Repeated background observations can generate duplicate notifications.
- Root sessions do not inherit the caller's session-specific restrictions: this
  is independent session control, not sandboxed/read-only subagent delegation.
- Cancellation/partial failure during creation can leave a created session behind.

## Tests

Run `bun test` here to test the actual TUI event handler with lightweight UI
adapters: folder filtering, disabled tabs, background opening, synchronization
errors, declined opens, and listener cleanup. Session creation and first-prompt
delivery can be exercised with the real tool or RPC above.

## Uninstall

For the GitHub installation:

```sh
opencode plugin remove github:fermumen/session_tab_controller
```

For a local checkout, remove its config entry or discovery symlink, then reopen
the TUI if needed. Existing sessions are preserved.
