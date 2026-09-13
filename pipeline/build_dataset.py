#!/usr/bin/env python3
"""Build the public AI4AI literature release from the survey source files."""

from __future__ import annotations

import argparse
import csv
import json
import re
import shutil
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path


ROLE_BY_ROW = (
    ["Training experience"] * 6
    + ["Evaluation feedback"] * 3
    + ["System changes"] * 6
    + ["Retained improvement"] * 4
    + ["Boundary case"]
)

MECHANISM_LABELS = {
    "synthetic_data": "Synthetic data",
    "evaluator_feedback": "Evaluator feedback",
    "model_supervision": "Model supervision",
    "search_selection": "Search & selection",
    "prompt_optimization": "Prompt optimization",
    "tool_use": "Tool use",
    "memory": "Memory",
    "self_play": "Self-play",
    "program_search": "Program search",
    "architecture_search": "Architecture search",
}


def read_json(path: Path):
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def write_json(path: Path, value) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def remove_machine_paths(value):
    if isinstance(value, dict):
        return {key: remove_machine_paths(item) for key, item in value.items()}
    if isinstance(value, list):
        return [remove_machine_paths(item) for item in value]
    if isinstance(value, str) and value.startswith(("/home/", "/mnt/", "/tmp/")):
        return Path(value).name
    return value


def clean_tex(value: str) -> str:
    replacements = {
        r'G\"odel': "Gödel",
        r'{\"o}': "ö",
        r"\&": "&",
        "---": "—",
        "--": "–",
        "{": "",
        "}": "",
    }
    for old, new in replacements.items():
        value = value.replace(old, new)
    combining_marks = {'"': "\u0308", "'": "\u0301", "`": "\u0300", "^": "\u0302", "~": "\u0303"}
    value = re.sub(
        r"\\([\"'`\^~])\{?([A-Za-z])\}?",
        lambda match: unicodedata.normalize("NFC", match.group(2) + combining_marks[match.group(1)]),
        value,
    )
    value = re.sub(r"\\[a-zA-Z]+\s*", "", value)
    return re.sub(r"\s+", " ", value).strip()


def normalized_title(value: str) -> str:
    value = unicodedata.normalize("NFKD", clean_tex(value)).casefold()
    return "".join(character for character in value if character.isalnum())


def parse_bibtex_authors(path: Path) -> dict[str, list[str]]:
    """Extract author lists without depending on a BibTeX package."""
    text = path.read_text(encoding="utf-8")
    result: dict[str, list[str]] = {}
    entry_pattern = re.compile(r"@\w+\s*\{\s*([^,\s]+)\s*,", re.I)

    for match in entry_pattern.finditer(text):
        key = match.group(1)
        cursor = match.end()
        depth = 1
        while cursor < len(text) and depth:
            if text[cursor] == "{":
                depth += 1
            elif text[cursor] == "}":
                depth -= 1
            cursor += 1
        body = text[match.end(): cursor - 1]
        author_match = re.search(r"\bauthor\s*=\s*", body, re.I)
        if not author_match:
            result[key] = []
            continue
        start = author_match.end()
        if start >= len(body) or body[start] not in '{"':
            result[key] = []
            continue
        opener = body[start]
        closer = "}" if opener == "{" else '"'
        index = start + 1
        nested = 1 if opener == "{" else 0
        while index < len(body):
            character = body[index]
            if opener == "{" and character == "{":
                nested += 1
            elif opener == "{" and character == "}":
                nested -= 1
                if nested == 0:
                    break
            elif opener == '"' and character == closer and body[index - 1] != "\\":
                break
            index += 1
        raw = re.sub(r"\s+", " ", body[start + 1:index]).strip()
        authors = []
        for author in re.split(r"\s+and\s+", raw):
            author = clean_tex(author.strip())
            if "," in author:
                last, first = (part.strip() for part in author.split(",", 1))
                author = f"{first} {last}".strip()
            if author:
                authors.append(author)
        result[key] = authors
    return result


def parse_landscape(path: Path) -> dict[str, dict[str, list[str] | str]]:
    mapping: dict[str, dict[str, list[str] | str]] = {}
    rows = []
    for line in path.read_text(encoding="utf-8").splitlines():
        if "\\citep{" not in line or " & " not in line:
            continue
        function = clean_tex(line.split(" & ", 1)[0])
        keys = []
        for group in re.findall(r"\\citep\{([^}]+)\}", line):
            keys.extend(item.strip() for item in group.split(","))
        rows.append((function, keys))

    if len(rows) != len(ROLE_BY_ROW):
        raise ValueError(f"Expected {len(ROLE_BY_ROW)} landscape rows, found {len(rows)}")
    for row_number, (function, keys) in enumerate(rows):
        for key in keys:
            item = mapping.setdefault(key, {"role": ROLE_BY_ROW[row_number], "functions": []})
            item["functions"].append(function)
    return mapping


def compact_venue(value: str) -> str:
    value_lower = value.casefold()
    ordered = (
        ("findings of the association for computational linguistics: emnlp", "Findings of EMNLP"),
        ("findings of emnlp", "Findings of EMNLP"),
        ("findings of the association for computational linguistics: acl", "Findings of ACL"),
        ("findings of acl", "Findings of ACL"),
        ("findings of the association for computational linguistics: naacl", "Findings of NAACL"),
        ("findings of naacl", "Findings of NAACL"),
        ("international conference on learning representations", "ICLR"),
        ("international conference on machine learning", "ICML"),
        ("neural information processing systems", "NeurIPS"),
        ("computer vision and pattern recognition", "CVPR"),
        ("international conference on computer vision", "ICCV"),
        ("empirical methods in natural language processing", "EMNLP"),
        ("annual meeting of the association for computational linguistics", "ACL"),
        ("north american chapter of the association for computational linguistics", "NAACL"),
        ("conference on language modeling", "COLM"),
        ("artificial intelligence", "AAAI"),
        ("acm multimedia", "ACM MM"),
        ("acmmm", "ACM MM"),
        ("33rd acm international conference on multimedia", "ACM MM"),
        ("acoustics, speech and signal processing", "ICASSP"),
        ("transactions on machine learning research", "TMLR"),
        ("accepted by tmlr", "TMLR"),
        ("nature", "Nature"),
        ("arxiv", "arXiv"),
        ("preprint", "Preprint"),
    )
    for needle, short in ordered:
        if needle in value_lower:
            return short
    for short in ("ICLR", "ICML", "NeurIPS", "CVPR", "ICCV", "ACL", "EMNLP", "NAACL", "COLM", "AAAI"):
        if short.casefold() in value_lower:
            return short
    return value.strip()


def evidence_summary(paper: dict | None) -> dict:
    if not paper:
        return {
            "fulltext_evidence": False,
            "mechanism_families": [],
            "improver_update_status": [],
            "updated_roles": [],
            "relevance_decision": None,
            "review_flags": [],
        }
    tags = {tag["tag_name"]: tag.get("value", {}) for tag in paper.get("tags", [])}
    mechanisms = set(tags.get("改进机制", {}).get("supporting_families", []))
    for loop in tags.get("改进机制", {}).get("loops", []):
        mechanisms.update(loop.get("families", []))
        if loop.get("family"):
            mechanisms.add(loop["family"])
    statuses, roles = set(), set()
    for loop in tags.get("改进者更新", {}).get("loops", []):
        if loop.get("status"):
            statuses.add(loop["status"])
        roles.update(role for role in loop.get("updated_roles", []) if role != "none")
    return {
        "fulltext_evidence": True,
        "mechanism_families": sorted(mechanisms),
        "improver_update_status": sorted(statuses),
        "updated_roles": sorted(roles),
        "relevance_decision": tags.get("相关性建议", {}).get("decision"),
        "review_flags": paper.get("review_flags", []),
    }


def markdown_cell(value: str) -> str:
    return value.replace("|", "\\|").replace("\n", " ")


def build_papers_markdown(papers: list[dict]) -> str:
    code_count = sum(bool(paper["code_urls"]) for paper in papers)
    lines = [
        "# Surveyed Papers",
        "",
        f"The complete literature inventory released with the AI4AI survey ({len(papers)} papers).",
        f"Titles link to publication pages; the Code column links to available repositories ({code_count} papers).",
        "",
        "| # | Title | Venue | Year | Survey role | Corpus | Code |",
        "|--:|-------|-------|-----:|-------------|--------|:----:|",
    ]
    for index, paper in enumerate(papers, 1):
        title = markdown_cell(paper["title"])
        linked_title = f"[{title}]({paper['paper_url']})" if paper.get("paper_url") else title
        role = markdown_cell(paper["survey_role"])
        corpus = {"both": "Main + supplement", "main": "Main", "supplement": "Supplement"}[paper["corpus"]]
        code = " ".join(
            f"[repo{'' if len(paper['code_urls']) == 1 else f' {number}'}]({url})"
            for number, url in enumerate(paper["code_urls"], 1)
        )
        lines.append(
            f"| {index} | {linked_title} | {markdown_cell(paper['venue'])} | {paper['year']} | "
            f"{role} | {corpus} | {code} |"
        )
    return "\n".join(lines) + "\n"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-root", type=Path, default=Path("../latex_paper_new"))
    parser.add_argument(
        "--evidence",
        type=Path,
        default=Path("../screening_runs/20260909_fulltext_tagging/current_evidence_export.json"),
    )
    parser.add_argument("--repo-root", type=Path, default=Path(__file__).resolve().parents[1])
    args = parser.parse_args()

    source_root = args.source_root.resolve()
    supplementary = source_root / "supplementary"
    repo_root = args.repo_root.resolve()
    data_dir = repo_root / "data"
    data_dir.mkdir(parents=True, exist_ok=True)

    inventory = read_json(supplementary / "literature_inventory.json")
    sources = read_json(supplementary / "reference_sources.json")
    full_evidence = read_json(args.evidence.resolve())
    code_records = read_json(repo_root / "pipeline" / "code_links.json")
    authors = parse_bibtex_authors(source_root / "references.bib")
    landscape = parse_landscape(supplementary / "tables" / "table_full_landscape.tex")

    source_by_key = {item["key"]: item for item in sources}
    evidence_by_title = {
        normalized_title(item["title"]): item for item in full_evidence.get("papers", [])
    }
    codes: dict[str, list[str]] = defaultdict(list)
    for item in code_records:
        if item["code_url"] not in codes[item["citation_key"]]:
            codes[item["citation_key"]].append(item["code_url"])

    papers = []
    for item in inventory:
        key = item["citation_key"]
        source = source_by_key.get(key, {})
        placement = landscape.get(key, {"role": "Related work & evidence", "functions": []})
        is_main = item.get("main_reference_number") is not None
        is_supplement = item.get("supplement_reference_number") is not None
        corpus = "both" if is_main and is_supplement else "main" if is_main else "supplement"
        paper = {
            "citation_key": key,
            "title": clean_tex(item["title"]),
            "authors": authors.get(key, []),
            "venue": compact_venue(source.get("venue") or item["venue"]),
            "venue_full": clean_tex(item["venue"]),
            "year": int(item["year"]),
            "paper_url": item.get("publication_url"),
            "code_url": codes[key][0] if codes[key] else None,
            "code_urls": codes[key],
            "survey_role": placement["role"],
            "functions": placement["functions"],
            "corpus": corpus,
            "main_reference_number": item.get("main_reference_number"),
            "supplement_reference_number": item.get("supplement_reference_number"),
        }
        paper.update(evidence_summary(evidence_by_title.get(normalized_title(item["title"]))))
        papers.append(paper)

    inventory_keys = {paper["citation_key"] for paper in papers}
    unknown_code_keys = sorted(set(codes) - inventory_keys)
    if unknown_code_keys:
        raise ValueError(f"Code records not present in literature inventory: {unknown_code_keys}")

    papers.sort(key=lambda paper: (-paper["year"], paper["venue"].casefold(), paper["title"].casefold()))
    write_json(data_dir / "papers.json", papers)

    stats = {
        "total_papers": len(papers),
        "papers_with_code": sum(bool(paper["code_urls"]) for paper in papers),
        "main_text_papers": sum(paper["main_reference_number"] is not None for paper in papers),
        "supplement_papers": sum(paper["supplement_reference_number"] is not None for paper in papers),
        "papers_with_fulltext_evidence": sum(paper["fulltext_evidence"] for paper in papers),
        "by_year": dict(sorted(Counter(str(paper["year"]) for paper in papers).items())),
        "by_venue": dict(Counter(paper["venue"] for paper in papers).most_common()),
        "by_survey_role": dict(Counter(paper["survey_role"] for paper in papers).most_common()),
        "by_function": dict(Counter(function for paper in papers for function in paper["functions"]).most_common()),
        "by_mechanism": dict(
            Counter(
                MECHANISM_LABELS.get(mechanism, mechanism.replace("_", " ").title())
                for paper in papers
                for mechanism in paper["mechanism_families"]
            ).most_common()
        ),
    }
    write_json(data_dir / "statistics.json", stats)
    (data_dir / "papers.js").write_text(
        "window.AI4AI_PAPERS = " + json.dumps(papers, ensure_ascii=False) + ";\n"
        + "window.AI4AI_STATS = " + json.dumps(stats, ensure_ascii=False) + ";\n",
        encoding="utf-8",
    )

    sanitized_sources = []
    for source in sources:
        public_source = {key: value for key, value in source.items() if key != "file_path"}
        sanitized_sources.append(public_source)
    write_json(data_dir / "reference_sources.json", sanitized_sources)
    with (data_dir / "reference_sources.csv").open("w", encoding="utf-8", newline="") as handle:
        fields = list(sanitized_sources[0])
        writer = csv.DictWriter(handle, fieldnames=fields, lineterminator="\n")
        writer.writeheader()
        writer.writerows(sanitized_sources)

    shutil.copyfile(args.evidence.resolve(), data_dir / "fulltext_evidence.json")
    shutil.copyfile(source_root / "references.bib", data_dir / "references.bib")
    for filename in (
        "bibtex_normalization.json",
        "draft_validation.json",
        "evidence_source_locations.json",
        "literature_inventory.json",
        "requested_citation_checks.json",
    ):
        write_json(data_dir / filename, remove_machine_paths(read_json(supplementary / filename)))
    shutil.copyfile(supplementary / "literature_inventory.csv", data_dir / "literature_inventory.csv")
    tables_dir = data_dir / "tables"
    tables_dir.mkdir(exist_ok=True)
    for table in (supplementary / "tables").glob("*.tex"):
        shutil.copyfile(table, tables_dir / table.name)

    (repo_root / "PAPERS.md").write_text(build_papers_markdown(papers), encoding="utf-8")
    print(
        f"Built {len(papers)} paper records; {stats['papers_with_code']} have code and "
        f"{stats['papers_with_fulltext_evidence']} match the full-text evidence export."
    )


if __name__ == "__main__":
    main()
