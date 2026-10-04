import { SessionTabs } from "./rpc.js"

export default {
  id: "toy.session-tabs.ui",
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

    context.ui.toast.show({ message: "Session Tabs toy plugin loaded", variant: "success" })
    return stop
  },
}
