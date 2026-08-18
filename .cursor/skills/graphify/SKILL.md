---
name: graphify
description: Query graphify-out as persistent codebase memory to reduce tokens. Use on every prompt, run, or architecture question, and after every code change to update the graph.
---

# Graphify token memory

This repo stores a knowledge graph in `graphify-out/`. Use it instead of scanning files.

## Every prompt / run

If `graphify-out/graph.json` exists:

```bash
graphify query "<user question>" --budget 1500
```

For two symbols:

```bash
graphify path "<A>" "<B>"
```

For one concept:

```bash
graphify explain "<concept>"
```

Then Read/Grep only the files the graph points to.

## After every change

```bash
graphify update . --no-cluster
```

AST-only, no API cost. Cursor `afterFileEdit`/`stop` hooks and git post-commit hooks should run this; if they did not, run it before finishing.

## First-time / rebuild

```bash
graphify extract . --no-cluster
```

Outputs:

- `graphify-out/graph.json` — queryable graph
- `graphify-out/GRAPH_REPORT.md` — architecture summary (read only for broad review)
- `graphify-out/graph.html` — optional visual map

## Do not

- Dump `GRAPH_REPORT.md` into every turn
- Re-grep the whole `src/` tree when a graph query would answer it
- Skip the update after editing JS/JSX/CSS
