(function () {
  const root = document.documentElement;
  const body = document.body;
  const toc = document.querySelector("#toc");
  const searchInput = document.querySelector("#searchInput");
  const searchCount = document.querySelector("#searchCount");
  const progressBar = document.querySelector("#progressBar");
  const darkToggles = Array.from(document.querySelectorAll("[data-theme-toggle]"));
  const expandAll = document.querySelector("#expandAll");
  const collapseAll = document.querySelector("#collapseAll");
  const prevChapter = document.querySelector("#prevChapter");
  const nextChapter = document.querySelector("#nextChapter");
  const mobileMenu = document.querySelector("#mobileMenu");

  const chapters = Array.from(document.querySelectorAll(".chapter"));
  const sections = Array.from(document.querySelectorAll(".book-section"));
  const readableTargets = Array.from(document.querySelectorAll(".chapter, .book-section"));

  function slugText(el) {
    const heading = el.querySelector(":scope > h2, :scope > h3, :scope > .chapter-header h2");
    if (heading) {
      const clone = heading.cloneNode(true);
      clone.querySelectorAll(".collapse-btn").forEach((button) => button.remove());
      return clone.textContent.trim();
    }
    return (el.dataset.title || "").trim();
  }

  function ensureBodies() {
    chapters.forEach((chapter) => {
      if (chapter.querySelector(":scope > .chapter-body")) return;
      const header = chapter.querySelector(":scope > .chapter-header");
      const heading = chapter.querySelector(":scope > h2");
      const bodyWrap = document.createElement("div");
      bodyWrap.className = "chapter-body";
      const anchor = header || heading;
      while (anchor && anchor.nextSibling) {
        bodyWrap.appendChild(anchor.nextSibling);
      }
      chapter.appendChild(bodyWrap);
    });

    sections.forEach((section) => {
      if (section.querySelector(":scope > .section-body")) return;
      const heading = section.querySelector(":scope > h3");
      const bodyWrap = document.createElement("div");
      bodyWrap.className = "section-body";
      while (heading && heading.nextSibling) {
        bodyWrap.appendChild(heading.nextSibling);
      }
      section.appendChild(bodyWrap);
    });
  }

  function addCollapseButtons() {
    readableTargets.forEach((target) => {
      const heading = target.querySelector(":scope > h2, :scope > h3, :scope > .chapter-header h2");
      if (!heading || heading.querySelector(".collapse-btn")) return;
      const button = document.createElement("button");
      button.className = "collapse-btn";
      button.type = "button";
      button.setAttribute("aria-label", `${slugText(target)} 접기 또는 펼치기`);
      button.textContent = "−";
      button.addEventListener("click", () => {
        const collapsed = target.classList.toggle("is-collapsed");
        button.textContent = collapsed ? "+" : "−";
      });
      heading.appendChild(button);
    });
  }

  function buildToc() {
    if (!toc) return;
    const fragment = document.createDocumentFragment();
    chapters.forEach((chapter) => {
      const chapterLink = document.createElement("a");
      chapterLink.href = `#${chapter.id}`;
      chapterLink.className = "toc-chapter";
      chapterLink.textContent = slugText(chapter);
      fragment.appendChild(chapterLink);

      chapter.querySelectorAll(".book-section").forEach((section) => {
        const sectionLink = document.createElement("a");
        sectionLink.href = `#${section.id}`;
        sectionLink.className = "toc-section";
        sectionLink.textContent = slugText(section);
        fragment.appendChild(sectionLink);
      });
    });
    toc.textContent = "";
    toc.appendChild(fragment);
    toc.addEventListener("click", (event) => {
      if (event.target.tagName === "A") {
        body.classList.remove("toc-open");
      }
    });
  }

  function setTheme(mode) {
    const dark = mode === "dark";
    root.classList.toggle("dark", dark);
    darkToggles.forEach((toggle) => {
      toggle.textContent = dark ? "라이트 모드" : "다크 모드";
    });
    localStorage.setItem("algorithms-ko-theme", dark ? "dark" : "light");
  }

  function initTheme() {
    const saved = localStorage.getItem("algorithms-ko-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setTheme(saved || (prefersDark ? "dark" : "light"));
  }

  function updateProgress() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const percent = max > 0 ? (window.scrollY / max) * 100 : 0;
    progressBar.style.width = `${Math.min(100, Math.max(0, percent))}%`;
  }

  function clearMarks(node) {
    node.querySelectorAll("mark[data-search-mark]").forEach((mark) => {
      mark.replaceWith(document.createTextNode(mark.textContent));
    });
    node.normalize();
  }

  function highlightText(container, query) {
    if (!query) return;
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        if (node.parentElement.closest("script, style, mark")) return NodeFilter.FILTER_REJECT;
        return node.nodeValue.toLowerCase().includes(query.toLowerCase())
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT;
      },
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((textNode) => {
      const text = textNode.nodeValue;
      const lower = text.toLowerCase();
      const needle = query.toLowerCase();
      const fragment = document.createDocumentFragment();
      let index = 0;
      let match;
      while ((match = lower.indexOf(needle, index)) !== -1) {
        fragment.appendChild(document.createTextNode(text.slice(index, match)));
        const mark = document.createElement("mark");
        mark.dataset.searchMark = "true";
        mark.textContent = text.slice(match, match + query.length);
        fragment.appendChild(mark);
        index = match + query.length;
      }
      fragment.appendChild(document.createTextNode(text.slice(index)));
      textNode.replaceWith(fragment);
    });
  }

  function applySearch() {
    const query = searchInput.value.trim();
    let matches = 0;
    chapters.forEach((chapter) => {
      clearMarks(chapter);
      const chapterText = chapter.textContent;
      const chapterMatches = !query || chapterText.toLowerCase().includes(query.toLowerCase());
      let visibleSections = 0;

      chapter.querySelectorAll(".book-section").forEach((section) => {
        const sectionMatches = !query || section.textContent.toLowerCase().includes(query.toLowerCase());
        section.classList.toggle("search-hidden", !sectionMatches);
        if (sectionMatches) {
          visibleSections += 1;
          if (query) {
            matches += 1;
            highlightText(section, query);
          }
        }
      });

      const showChapter = chapterMatches || visibleSections > 0;
      chapter.classList.toggle("search-hidden", !showChapter);
      if (showChapter && query) chapter.classList.remove("is-collapsed");
    });

    if (!query) {
      searchCount.textContent = "검색어를 입력하면 섹션을 좁혀 볼 수 있습니다.";
    } else {
      searchCount.textContent = `${matches}개 섹션에서 찾았습니다.`;
    }
    window.dispatchEvent(new Event("scroll"));
  }

  function chapterIndexInView() {
    const midpoint = window.scrollY + window.innerHeight * 0.35;
    let index = 0;
    chapters.forEach((chapter, i) => {
      if (chapter.offsetTop <= midpoint) index = i;
    });
    return index;
  }

  function moveChapter(delta) {
    const index = chapterIndexInView();
    const next = chapters[Math.min(chapters.length - 1, Math.max(0, index + delta))];
    next?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function observeSections() {
    const links = Array.from(document.querySelectorAll(".toc a"));
    const byId = new Map(links.map((link) => [link.getAttribute("href").slice(1), link]));
    const updateActiveLink = () => {
      const probe = window.scrollY + Math.min(260, window.innerHeight * 0.35);
      let current = readableTargets[0];
      for (const target of readableTargets) {
        if (target.classList.contains("search-hidden")) continue;
        if (target.offsetTop <= probe) current = target;
        else break;
      }
      links.forEach((link) => link.classList.remove("is-active"));
      byId.get(current.id)?.classList.add("is-active");
    };
    window.addEventListener("scroll", updateActiveLink, { passive: true });
    window.addEventListener("resize", updateActiveLink);
    window.addEventListener("hashchange", () => setTimeout(updateActiveLink, 120));
    updateActiveLink();
  }

  ensureBodies();
  addCollapseButtons();
  buildToc();
  initTheme();
  observeSections();
  updateProgress();
  applySearch();

  window.addEventListener("scroll", updateProgress, { passive: true });
  window.addEventListener("resize", updateProgress);
  searchInput.addEventListener("input", applySearch);
  darkToggles.forEach((toggle) => {
    toggle.addEventListener("click", () => setTheme(root.classList.contains("dark") ? "light" : "dark"));
  });
  expandAll.addEventListener("click", () => {
    readableTargets.forEach((target) => target.classList.remove("is-collapsed"));
    document.querySelectorAll(".collapse-btn").forEach((button) => {
      button.textContent = "−";
    });
  });
  collapseAll.addEventListener("click", () => {
    sections.forEach((target) => target.classList.add("is-collapsed"));
    sections.forEach((target) => {
      target.querySelector(".collapse-btn").textContent = "+";
    });
  });
  prevChapter.addEventListener("click", () => moveChapter(-1));
  nextChapter.addEventListener("click", () => moveChapter(1));
  mobileMenu.addEventListener("click", () => body.classList.toggle("toc-open"));
})();
