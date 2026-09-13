# Data

This directory releases the literature base and supporting evidence for **A Survey on AI for
AI: When the Improver Becomes the Improvee**.

## Files

| File | Records | Description |
|------|--------:|-------------|
| `papers.json` | 195 | Reader-facing paper metadata, survey taxonomy, and code links. |
| `statistics.json` | 1 | Aggregate counts used by the paper browser. |
| `fulltext_evidence.json` | 500 | Full-paper machine tagging across eight review dimensions. |
| `literature_inventory.json` / `.csv` | 195 | Citation keys, publication links, and main/supplement numbering. |
| `reference_sources.json` / `.csv` | 195 | Bibliographic source registry (no machine-local paths). |
| `references.bib` | 195 | Bibliography used by the survey. |
| `evidence_source_locations.json` | 15 | Page-level source locations and PDF checksums for representative systems. |
| `bibtex_normalization.json` | 195 | BibTeX normalization and source records. |
| `requested_citation_checks.json` | — | Targeted citation verification records. |
| `draft_validation.json` | 1 | Validation summary for the manuscript and supplement. |
| `tables/*.tex` | 2 | Full landscape and evidence tables from the supplement. |

## `papers.json` schema

Each entry contains bibliographic fields (`citation_key`, `title`, `authors`, `venue`, `year`,
`paper_url`), zero or more repository links (`code_url`, `code_urls`), survey placement
(`survey_role`, `functions`, `corpus`, reference numbers), and a compact projection of any
matching full-text record (`mechanism_families`, improver-update fields, relevance decision,
and review flags).

The detailed 500-paper export is machine-extracted evidence. Treat it as an auditable research
artifact rather than as manually verified ground truth; the per-tag records include their own
review status and evidence passages.

## Rebuilding

See [`pipeline/README.md`](../pipeline/README.md).
