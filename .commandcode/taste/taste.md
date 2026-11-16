# Taste

## Communication
- Communicates in Dutch (Nederlands) and expects the assistant to respond in Dutch. Confidence: 0.8

## UX / Product
- Wants actions like starting a new document to happen immediately, without a confirmation prompt (prefers minimal friction over "are you sure?" dialogs). Confidence: 0.6

## Workflow
- Maintains two parallel versions of the editor — a native macOS app (Swift/MDEdit) and an Electron app (MarkdownEditor) — and scopes features to a specific app rather than assuming both get everything (e.g. Word export only in the native app, which stays heavier on OS integration while the Electron app stays lighter). Confidence: 0.6
- Keeps both projects under git (each with a GitHub remote) and asks the assistant to commit changes; committing should not imply pushing — push only on an explicit request. Confidence: 0.5
