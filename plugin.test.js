import { expect, test } from "bun:test"
import tui from "./tui.js"

// UI adapters let us exercise the real handler without running a terminal renderer.
function client({ directory = "/repo", enabled = true, syncError, opens = true, fallback = false } = {}) {
  const opened = []
  const synced = []
  const toasts = []
  const listeners = new Set()
  const location = { directory }
  const stop = tui.setup({
    location: fallback ? undefined : location,
    client: {
      rpc: () => ({
        events: {
          on: (name, listener) => {
            expect(name).toBe("open")
            listeners.add(listener)
            return () => listeners.delete(listener)
          },
        },
      }),
    },
    data: {
      location: { default: () => location },
      session: {
        sync: async (sessionID) => {
          synced.push(sessionID)
          if (syncError) throw syncError
        },
      },
    },
    ui: {
      tabs: {
        enabled: () => enabled,
        open: (sessionID) => {
          opened.push(sessionID)
          return opens
        },
        focus: () => { throw new Error("Must not steal focus") },
      },
      toast: { show: (toast) => toasts.push(toast) },
    },
    keymap: { layer() {} },
  })

  return {
    opened, synced, toasts, listeners, stop,
    async emit(eventDirectory = "/repo") {
      for (const listener of listeners) {
        listener({ data: { sessionID: "ses_test", title: "Test tab", directory: eventDirectory } })
      }
      await new Promise(setImmediate)
    },
  }
}

test("syncs before opening a background tab without focusing it", async () => {
  const ui = client()
  await ui.emit()
  expect(ui.synced).toEqual(["ses_test"])
  expect(ui.opened).toEqual(["ses_test"])
  expect(ui.toasts.at(-1)).toEqual({ message: "Opened tab: Test tab", variant: "success" })
})

test("does not open sessions for a different folder", async () => {
  const ui = client()
  await ui.emit("/other")
  expect(ui.synced).toEqual([])
  expect(ui.opened).toEqual([])
})

test("uses the default location when no current location is available", async () => {
  const ui = client({ fallback: true })
  await ui.emit()
  expect(ui.opened).toEqual(["ses_test"])
})

test("warns when session tabs are disabled", async () => {
  const ui = client({ enabled: false })
  await ui.emit()
  expect(ui.opened).toEqual([])
  expect(ui.toasts.at(-1).variant).toBe("warning")
})

test("reports sync errors without opening the tab", async () => {
  const ui = client({ syncError: new Error("Offline") })
  await ui.emit()
  expect(ui.opened).toEqual([])
  expect(ui.toasts.at(-1).variant).toBe("error")
  expect(ui.toasts.at(-1).message).toContain("Offline")
})

test("does not report success when the tab API declines the request", async () => {
  const ui = client({ opens: false })
  await ui.emit()
  expect(ui.toasts.at(-1).variant).toBe("error")
})

test("unsubscribes during plugin cleanup", async () => {
  const ui = client()
  ui.stop()
  expect(ui.listeners.size).toBe(0)
  await ui.emit()
  expect(ui.opened).toEqual([])
})
