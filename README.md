# A Survey on AI for AI

Project page and full HTML edition of the survey **"A Survey on AI for AI: When the Improver Becomes the Improvee"** by Deheng Ye, Zheng Zhang, Hao Wang, and Chunyan Miao (Ye and Zhang contributed equally).

- Live site (GitHub Pages): <https://3dagentworld.github.io/AI4AI-survey/>
- Landing page (`index.html`): abstract, contributions, lineage overview, citation.
- Full text (`paper.html`): the complete survey with a sticky table of contents, linked citations and back-references, interactive figures, and KaTeX-rendered mathematics.

## Source

The LaTeX source of the survey (Springer Nature `sn-jnl` template, `sn-nature` style) lives in the accompanying `survey_new/` directory of the parent workspace (Overleaf project). The HTML edition is generated from it by a small converter (`tex2html.py`, kept outside this repository) that turns the `.tex` body and the compiled `.bbl` bibliography into semantic HTML. Figures are rasterized from the vector sources (`Figures/*.pdf` plus the TikZ topic map compiled standalone) into `assets/` by `make_assets.py`.

## Citation

```bibtex
@article{ye2026ai4ai,
  title   = {A Survey on AI for AI},
  author  = {Ye, Deheng and Zhang, Zheng and Wang, Hao and Miao, Chunyan},
  note    = {Ye and Zhang contributed equally.},
  year    = {2026},
  month   = sep,
  url     = {https://3dagentworld.github.io/AI4AI-survey/}
}
```

© 2026 Ye, Zhang, Wang & Miao. Hosted on GitHub Pages.
