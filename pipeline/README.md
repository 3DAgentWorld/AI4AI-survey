# Dataset build

`build_dataset.py` combines the paper's literature inventory, BibTeX library, full-landscape
table, full-text evidence export, and the curated code-link mapping into the public files under
`data/` and the root `PAPERS.md`.

Run from the repository root:

```bash
python pipeline/build_dataset.py \
  --source-root ../latex_paper_new \
  --evidence ../screening_runs/20260909_fulltext_tagging/current_evidence_export.json
```

The generated `reference_sources` release deliberately omits machine-local absolute paths.
