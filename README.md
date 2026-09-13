# A Survey on AI for AI

[![Preprint](https://img.shields.io/badge/Preprint-preprints.org-b31b1b)](https://doi.org/10.20944/preprints202609.0591.v1)
[![Project Page](https://img.shields.io/badge/Project-Page-blue)](https://3dagentworld.github.io/AI4AI-survey/)
[![Papers](https://img.shields.io/badge/Papers-195-green)](PAPERS.md)
[![Code](https://img.shields.io/badge/Papers_with_code-108-orange)](https://3dagentworld.github.io/AI4AI-survey/papers.html?code=1)

Project page, full HTML edition, literature data, and interactive paper browser for
**“A Survey on AI for AI: When the Improver Becomes the Improvee”** by Deheng Ye,
Zheng Zhang, Hao Wang, and Chunyan Miao (Ye and Zhang contributed equally).

- [Project page](https://3dagentworld.github.io/AI4AI-survey/)
- [Full paper](https://3dagentworld.github.io/AI4AI-survey/paper.html)
- [Interactive paper browser](https://3dagentworld.github.io/AI4AI-survey/papers.html)
- [Complete paper list](PAPERS.md)
- [Data documentation](data/README.md)

## Literature release

The repository releases the 195-paper bibliography used by the survey, its taxonomy placement,
publication and code links, aggregate statistics, and the full-text tagging export for 500 screened
papers. The browser supports combined full-text search and filters for year, venue, survey role,
function, main/supplement corpus, and code availability, plus CSV export.

| Survey role | Papers |
|-------------|-------:|
| Training experience | 28 |
| Evaluation feedback | 16 |
| System changes | 32 |
| Retained improvement | 22 |
| Boundary cases | 6 |
| Related work and evidence | 91 |
| **Total** | **195** |

## Repository structure

```text
AI4AI-survey/
├── index.html                  # Survey overview
├── paper.html                  # Full HTML paper
├── papers.html                 # Searchable literature browser
├── PAPERS.md                   # Complete paper list
├── data/
│   ├── papers.json             # 195 papers: metadata, taxonomy, code links
│   ├── statistics.json         # Aggregate statistics
│   ├── fulltext_evidence.json  # Full-text tags for 500 screened papers
│   ├── references.bib          # Survey bibliography
│   └── README.md               # Data schema and file guide
└── pipeline/
    ├── build_dataset.py        # Rebuild public data and PAPERS.md
    └── README.md               # Build instructions
```

## Related project

For our previous survey repository and its searchable literature release, see
[awesome_hmma_agent](https://github.com/3DAgentWorld/awesome_hmma_agent).

## Citation

```bibtex
@article{202609.0591,
  doi       = {10.20944/preprints202609.0591.v1},
  url       = {https://doi.org/10.20944/preprints202609.0591.v1},
  year      = 2026,
  month     = {September},
  publisher = {Preprints},
  author    = {Deheng Ye and Zheng Zhang and Hao Wang and Chunyan Miao},
  title     = {A Survey on AI for AI: When the Improver Becomes the Improvee},
  journal   = {Preprints}
}
```

© 2026 Ye, Zhang, Wang & Miao. Hosted on GitHub Pages.
