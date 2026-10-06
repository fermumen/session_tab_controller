import { SessionTabs } from "./rpc.js"

// Session metadata marks a folder's coordinator. Forks inherit metadata and two
// TUIs can race to create one, so several sessions may carry the marker; the
// most recently updated one wins and the rest are reported, not changed.
const marker = "sessionTabsCoordinator"

export default {
  id: "session-tabs.ui",
  setup(context) {
    const tabs = context.client.rpc(SessionTabs)
    const stop = tabs.events.on("open", (event) => {
      const location = context.location ?? context.data.location.default()
      if (event.data.directory !== location.directory) return

      if (!context.ui.tabs.enabled()) {
        context.ui.toast.show({ message: "Session created, but session tabs are disabled.", variant: "warning" })
        return
      }

      void context.data.session.sync(event.data.sessionID).then(() => {
        if (!context.ui.tabs.open(event.data.sessionID)) {
          throw new Error("The client declined to open the tab")
        }
        context.ui.toast.show({ message: `Opened tab: ${event.data.title}`, variant: "success" })
      }).catch((error) => {
        context.ui.toast.show({ message: `Could not open session tab: ${String(error)}`, variant: "error" })
      })
    })

    const coordinators = async (directory) => {
      const found = []
      let cursor
      do {
        const page = await context.client.session.list({
          directory, parentID: null, limit: 200, order: "desc", ...(cursor ? { cursor } : {}),
        })
        found.push(...page.data.filter((session) => session.metadata?.[marker] === true && !session.time.archived))
        cursor = page.data.length > 0 ? page.cursor.next : undefined
      } while (cursor)
      return found
    }

    const show = async (sessionID) => {
      await context.data.session.sync(sessionID)
      if (!context.ui.tabs.focus(sessionID)) throw new Error("The client declined to open the tab")
      context.ui.tabs.move(sessionID, 0)
    }

    const coordinator = async (input) => {
      const argument = input?.trim() ?? ""
      if (argument !== "" && argument !== "new") {
        context.ui.toast.show({ message: "Usage: /coordinator [new]", variant: "warning" })
        return
      }
      if (!context.ui.tabs.enabled()) {
        context.ui.toast.show({ message: "The coordinator needs session tabs to be enabled.", variant: "warning" })
        return
      }

      const { directory } = context.location ?? context.data.location.default()
      const existing = await coordinators(directory)
      if (existing.length > 0 && argument !== "new") {
        if (existing.length > 1) {
          context.ui.toast.show({ message: `${existing.length - 1} other session(s) are also marked as coordinator; using the most recently active.`, variant: "warning" })
        }
        return show(existing[0].id)
      }

      const confirmed = await context.ui.dialog.confirm({
        title: "Coordinator",
        message: existing.length > 0
          ? "Create a new coordinator for this folder? Current coordinator sessions are kept but unmarked."
          : "No coordinator for this folder. Create one?",
        label: { confirm: "Create" },
      })
      if (!confirmed) return

      const session = await context.client.session.create({
        title: "Coordinator",
        agent: "coordinator",
        location: { directory },
        metadata: { [marker]: true },
      })
      // Unmark only after the replacement exists. Metadata updates replace the whole record.
      for (const previous of existing) {
        const { [marker]: _, ...metadata } = previous.metadata
        await context.client.session.update({ sessionID: previous.id, metadata })
      }
      await show(session.id)
    }

    // Registering from setup failed with "Keymap.Provider is missing" (seen in 2.0.22 and 2.0.24);
    // the app slot runs inside the UI providers.
    const stopSlot = context.ui.slot({
      append: "app",
      render: () => {
        context.keymap.layer(() => ({
          mode: "global",
          commands: [{
            id: "session-tabs.coordinator",
            title: "Open coordinator",
            description: "Focus this folder's coordinator tab, or create one. Pass new to replace it.",
            group: "Session Tabs",
            palette: true,
            slash: { name: "coordinator", aliases: ["co"], arguments: true },
            run: (input) => coordinator(input).catch((error) => {
              context.ui.toast.show({ message: `Coordinator failed: ${String(error)}`, variant: "error" })
            }),
          }],
        }))
        return null
      },
    })

    context.ui.toast.show({ message: "Session Tabs toy plugin loaded", variant: "success" })
    return () => {
      stopSlot()
      stop()
    }
  },
}
