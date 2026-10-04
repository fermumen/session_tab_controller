export const createInput = {
  type: "object",
  properties: {
    title: { type: "string", minLength: 1, description: "Title of the new session." },
    prompt: { type: "string", minLength: 1, description: "Optional first message; omission creates an idle session." },
    model: {
      type: "object",
      properties: {
        providerID: { type: "string", minLength: 1 },
        id: { type: "string", minLength: 1 },
        variant: { type: "string" },
      },
      required: ["providerID", "id"],
      additionalProperties: false,
    },
  },
  required: ["title"],
  additionalProperties: false,
}

// Portable RPC definitions are plain objects with JSON schemas.
export const SessionTabs = {
  id: "toy.session-tabs",
  methods: {
    create: {
      input: createInput,
      output: {
        type: "object",
        properties: {
          sessionID: { type: "string" },
          title: { type: "string" },
          directory: { type: "string" },
          tabRequested: { type: "boolean" },
          promptSent: { type: "boolean" },
          promptID: { type: ["string", "null"] },
        },
        required: ["sessionID", "title", "directory", "tabRequested", "promptSent", "promptID"],
        additionalProperties: false,
      },
    },
  },
  events: {
    open: {
      schema: {
        type: "object",
        properties: {
          sessionID: { type: "string" },
          title: { type: "string" },
          directory: { type: "string" },
        },
        required: ["sessionID", "title", "directory"],
        additionalProperties: false,
      },
    },
  },
}
