// Placeholder shell for PR 1. The board, Machine, queue, hand, and end screen
// are built out in later PRs. This exists only so `yarn dev` renders something
// while the pure game core (src/game) is developed and unit-tested.

export function App() {
  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.5rem",
        height: "100%",
        padding: "1.5rem",
        textAlign: "center",
      }}
    >
      <h1 style={{ margin: 0, letterSpacing: "0.08em", fontWeight: 600 }}>
        PUNCHCARD
      </h1>
      <p style={{ margin: 0, color: "var(--ink-soft)" }}>
        Core engine online. The table is still being set.
      </p>
    </main>
  );
}
