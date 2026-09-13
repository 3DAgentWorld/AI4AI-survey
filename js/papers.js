(function () {
  "use strict";

  var papers = Array.isArray(window.AI4AI_PAPERS) ? window.AI4AI_PAPERS : [];
  var stats = window.AI4AI_STATS || {};
  var pageSize = 25;
  var currentPage = 1;
  var controls = {
    search: document.getElementById("paperSearch"),
    year: document.getElementById("filterYear"),
    venue: document.getElementById("filterVenue"),
    role: document.getElementById("filterRole"),
    func: document.getElementById("filterFunction"),
    corpus: document.getElementById("filterCorpus"),
    code: document.getElementById("filterCode"),
    sort: document.getElementById("sortPapers")
  };

  if (!controls.search) return;

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function normalize(value) {
    return String(value || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  }

  function unique(field, flatten) {
    var values = [];
    papers.forEach(function (paper) {
      var value = paper[field];
      if (flatten && Array.isArray(value)) values = values.concat(value);
      else if (value !== null && value !== undefined && value !== "") values.push(String(value));
    });
    return Array.from(new Set(values));
  }

  function addOptions(select, values, descending) {
    values.sort(function (a, b) {
      return descending ? Number(b) - Number(a) : a.localeCompare(b);
    });
    values.forEach(function (value) {
      var option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      select.appendChild(option);
    });
  }

  addOptions(controls.year, unique("year"), true);
  addOptions(controls.venue, unique("venue"));
  addOptions(controls.role, unique("survey_role"));
  addOptions(controls.func, unique("functions", true));

  document.getElementById("statPapers").textContent = stats.total_papers || papers.length;
  document.getElementById("statMain").textContent = stats.main_text_papers || "—";
  document.getElementById("statCode").textContent = stats.papers_with_code || "—";

  papers.forEach(function (paper) {
    paper._search = normalize([
      paper.title,
      (paper.authors || []).join(" "),
      paper.venue,
      paper.venue_full,
      paper.citation_key,
      paper.survey_role,
      (paper.functions || []).join(" "),
      (paper.mechanism_families || []).join(" ")
    ].join(" "));
  });

  function readUrl() {
    var params = new URLSearchParams(window.location.search);
    controls.search.value = params.get("q") || "";
    controls.year.value = params.get("year") || "";
    controls.venue.value = params.get("venue") || "";
    controls.role.value = params.get("role") || "";
    controls.func.value = params.get("function") || "";
    controls.corpus.value = params.get("corpus") || "";
    controls.code.checked = params.get("code") === "1";
    controls.sort.value = params.get("sort") || "year-desc";
    currentPage = Math.max(1, Number(params.get("page")) || 1);
  }

  function writeUrl() {
    var params = new URLSearchParams();
    if (controls.search.value.trim()) params.set("q", controls.search.value.trim());
    if (controls.year.value) params.set("year", controls.year.value);
    if (controls.venue.value) params.set("venue", controls.venue.value);
    if (controls.role.value) params.set("role", controls.role.value);
    if (controls.func.value) params.set("function", controls.func.value);
    if (controls.corpus.value) params.set("corpus", controls.corpus.value);
    if (controls.code.checked) params.set("code", "1");
    if (controls.sort.value !== "year-desc") params.set("sort", controls.sort.value);
    if (currentPage > 1) params.set("page", String(currentPage));
    var query = params.toString();
    history.replaceState(null, "", window.location.pathname + (query ? "?" + query : ""));
  }

  function filteredPapers() {
    var query = normalize(controls.search.value.trim());
    var result = papers.filter(function (paper) {
      if (query && !paper._search.includes(query)) return false;
      if (controls.year.value && String(paper.year) !== controls.year.value) return false;
      if (controls.venue.value && paper.venue !== controls.venue.value) return false;
      if (controls.role.value && paper.survey_role !== controls.role.value) return false;
      if (controls.func.value && !(paper.functions || []).includes(controls.func.value)) return false;
      if (controls.corpus.value === "main" && paper.main_reference_number == null) return false;
      if (controls.corpus.value === "supplement" && paper.corpus !== "supplement") return false;
      if (controls.corpus.value === "both" && paper.corpus !== "both") return false;
      if (controls.code.checked && !(paper.code_urls || []).length) return false;
      return true;
    });
    var sort = controls.sort.value;
    result.sort(function (a, b) {
      if (sort === "year-asc") return a.year - b.year || a.title.localeCompare(b.title);
      if (sort === "title-asc") return a.title.localeCompare(b.title);
      if (sort === "venue-asc") return a.venue.localeCompare(b.venue) || b.year - a.year || a.title.localeCompare(b.title);
      return b.year - a.year || a.venue.localeCompare(b.venue) || a.title.localeCompare(b.title);
    });
    return result;
  }

  function corpusLabel(paper) {
    if (paper.corpus === "both") return "Main + supplement";
    if (paper.corpus === "main") return "Main text";
    return "Supplement";
  }

  function authorLabel(authors) {
    if (!authors || !authors.length) return "";
    if (authors.length <= 4) return authors.join(", ");
    return authors.slice(0, 3).join(", ") + ", et al.";
  }

  function rowHtml(paper) {
    var title = escapeHtml(paper.title);
    var titleHtml = paper.paper_url
      ? '<a class="paper-title" href="' + escapeHtml(paper.paper_url) + '" target="_blank" rel="noopener">' + title + "</a>"
      : '<span class="paper-title">' + title + "</span>";
    var functions = (paper.functions || []).map(function (value) {
      return '<span class="paper-tag">' + escapeHtml(value) + "</span>";
    }).join("");
    var repos = (paper.code_urls || []).map(function (url, index) {
      var label = paper.code_urls.length > 1 ? "repo " + (index + 1) : "repo";
      return '<a class="repo-link" href="' + escapeHtml(url) + '" target="_blank" rel="noopener">' + label + " ↗</a>";
    }).join("") || '<span class="no-code" aria-label="No code link">—</span>';
    return "<tr>" +
      "<td>" + titleHtml + '<span class="paper-authors">' + escapeHtml(authorLabel(paper.authors)) + "</span></td>" +
      "<td>" + escapeHtml(paper.venue) + "</td>" +
      "<td>" + escapeHtml(paper.year) + "</td>" +
      '<td><span class="placement-role">' + escapeHtml(paper.survey_role) + "</span>" + functions + "</td>" +
      '<td><span class="corpus-label">' + escapeHtml(corpusLabel(paper)) + "</span></td>" +
      "<td>" + repos + "</td>" +
      "</tr>";
  }

  function paginationHtml(pageCount) {
    if (pageCount <= 1) return "";
    var parts = ['<button type="button" data-page="' + (currentPage - 1) + '"' + (currentPage === 1 ? " disabled" : "") + ' aria-label="Previous page">←</button>'];
    var visible = [];
    for (var page = 1; page <= pageCount; page += 1) {
      if (page === 1 || page === pageCount || Math.abs(page - currentPage) <= 2) visible.push(page);
    }
    var previous = 0;
    visible.forEach(function (page) {
      if (previous && page - previous > 1) parts.push('<span class="pagination-gap">…</span>');
      parts.push('<button type="button" data-page="' + page + '" class="' + (page === currentPage ? "active" : "") + '"' + (page === currentPage ? ' aria-current="page"' : "") + ">" + page + "</button>");
      previous = page;
    });
    parts.push('<button type="button" data-page="' + (currentPage + 1) + '"' + (currentPage === pageCount ? " disabled" : "") + ' aria-label="Next page">→</button>');
    return parts.join("");
  }

  function render(updateUrl) {
    var result = filteredPapers();
    var pageCount = Math.max(1, Math.ceil(result.length / pageSize));
    currentPage = Math.min(currentPage, pageCount);
    var start = (currentPage - 1) * pageSize;
    document.getElementById("paperRows").innerHTML = result.slice(start, start + pageSize).map(rowHtml).join("");
    document.getElementById("resultCount").textContent = result.length + " of " + papers.length + " papers";
    document.getElementById("emptyState").hidden = result.length !== 0;
    document.querySelector(".paper-browser-table").hidden = result.length === 0;
    document.getElementById("pagination").innerHTML = paginationHtml(pageCount);
    if (updateUrl !== false) writeUrl();
  }

  var searchTimer;
  controls.search.addEventListener("input", function () {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(function () { currentPage = 1; render(); }, 120);
  });
  [controls.year, controls.venue, controls.role, controls.func, controls.corpus, controls.code, controls.sort].forEach(function (control) {
    control.addEventListener("change", function () { currentPage = 1; render(); });
  });

  document.getElementById("resetFilters").addEventListener("click", function () {
    controls.search.value = "";
    controls.year.value = "";
    controls.venue.value = "";
    controls.role.value = "";
    controls.func.value = "";
    controls.corpus.value = "";
    controls.code.checked = false;
    controls.sort.value = "year-desc";
    currentPage = 1;
    render();
  });

  document.getElementById("pagination").addEventListener("click", function (event) {
    var button = event.target.closest("button[data-page]");
    if (!button || button.disabled) return;
    currentPage = Number(button.dataset.page);
    render();
    document.querySelector(".result-bar").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  document.getElementById("exportCsv").addEventListener("click", function () {
    var rows = [["title", "authors", "venue", "year", "survey_role", "functions", "corpus", "paper_url", "code_urls"]];
    filteredPapers().forEach(function (paper) {
      rows.push([
        paper.title,
        (paper.authors || []).join("; "),
        paper.venue,
        paper.year,
        paper.survey_role,
        (paper.functions || []).join("; "),
        corpusLabel(paper),
        paper.paper_url || "",
        (paper.code_urls || []).join("; ")
      ]);
    });
    var csv = rows.map(function (row) {
      return row.map(function (cell) { return '"' + String(cell).replace(/"/g, '""') + '"'; }).join(",");
    }).join("\n");
    var blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    var link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "ai4ai-papers.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "/" && !/input|select|textarea/i.test(document.activeElement.tagName)) {
      event.preventDefault();
      controls.search.focus();
    }
  });

  window.addEventListener("popstate", function () { readUrl(); render(false); });
  readUrl();
  render(false);
}());
