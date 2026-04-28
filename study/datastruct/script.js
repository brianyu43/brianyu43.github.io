(function () {
  const body = document.body;
  const progressBar = document.getElementById("progressBar");
  const searchInput = document.getElementById("searchInput");
  const clearSearch = document.getElementById("clearSearch");
  const searchMeta = document.getElementById("searchMeta");
  const searchResults = document.getElementById("searchResults");
  const themeToggle = document.getElementById("themeToggle");
  const expandAll = document.getElementById("expandAll");
  const collapseAll = document.getElementById("collapseAll");
  const prevChapter = document.getElementById("prevChapter");
  const nextChapter = document.getElementById("nextChapter");

  const chapters = Array.from(document.querySelectorAll(".chapter"));
  const lessons = Array.from(document.querySelectorAll(".lesson"));
  const tocLinks = Array.from(document.querySelectorAll(".toc a"));

  const savedTheme = localStorage.getItem("ods-ko-theme");
  if (savedTheme) {
    body.dataset.theme = savedTheme;
  }
  themeToggle.textContent = body.dataset.theme === "dark" ? "라이트모드" : "다크모드";

  function updateProgress() {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = max <= 0 ? 0 : Math.min(1, Math.max(0, scrollTop / max));
    progressBar.style.width = `${Math.round(ratio * 100)}%`;
  }

  function setActive(id) {
    tocLinks.forEach((link) => {
      link.classList.toggle("active", link.getAttribute("href") === `#${id}`);
    });
  }

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      lessons.forEach((lesson) => lesson.classList.remove("is-current"));
      visible.target.classList.add("is-current");
      setActive(visible.target.id);
    },
    { rootMargin: "-20% 0px -65% 0px", threshold: [0.1, 0.25, 0.5] }
  );

  lessons.forEach((lesson) => observer.observe(lesson));

  document.querySelectorAll(".chapter-toggle").forEach((button) => {
    button.addEventListener("click", () => {
      const chapter = button.closest(".chapter");
      const collapsed = chapter.classList.toggle("collapsed");
      button.setAttribute("aria-expanded", String(!collapsed));
      button.textContent = collapsed ? "펼치기" : "접기";
    });
  });

  document.querySelectorAll(".section-toggle").forEach((button) => {
    button.addEventListener("click", () => {
      const lesson = button.closest(".lesson");
      const collapsed = lesson.classList.toggle("collapsed");
      button.setAttribute("aria-expanded", String(!collapsed));
      button.textContent = collapsed ? "펼치기" : "접기";
    });
  });

  function normalize(value) {
    return value.toLowerCase().replace(/\s+/g, " ").trim();
  }

  function runSearch() {
    const query = normalize(searchInput.value);
    searchResults.innerHTML = "";

    chapters.forEach((chapter) => chapter.classList.remove("hidden-by-search"));
    lessons.forEach((lesson) => lesson.classList.remove("hidden-by-search"));
    tocLinks.forEach((link) => link.parentElement.classList.remove("hidden-by-search"));

    if (!query) {
      searchMeta.textContent = `${lessons.length}개 섹션`;
      return;
    }

    const matches = [];
    lessons.forEach((lesson) => {
      const haystack = normalize(
        `${lesson.dataset.title || ""} ${lesson.dataset.keywords || ""} ${lesson.textContent || ""}`
      );
      const matched = haystack.includes(query);
      lesson.classList.toggle("hidden-by-search", !matched);
      if (matched) {
        lesson.classList.remove("collapsed");
        const chapter = lesson.closest(".chapter");
        chapter.classList.remove("collapsed");
        const chapterButton = chapter.querySelector(".chapter-toggle");
        if (chapterButton) {
          chapterButton.textContent = "접기";
          chapterButton.setAttribute("aria-expanded", "true");
        }
        const sectionButton = lesson.querySelector(".section-toggle");
        if (sectionButton) {
          sectionButton.textContent = "접기";
          sectionButton.setAttribute("aria-expanded", "true");
        }
        matches.push(lesson);
      }
    });

    chapters.forEach((chapter) => {
      const hasVisibleLesson = Array.from(chapter.querySelectorAll(".lesson")).some(
        (lesson) => !lesson.classList.contains("hidden-by-search")
      );
      chapter.classList.toggle("hidden-by-search", !hasVisibleLesson);
    });

    tocLinks.forEach((link) => {
      const target = document.querySelector(link.getAttribute("href"));
      const hidden = target && target.classList.contains("hidden-by-search");
      link.parentElement.classList.toggle("hidden-by-search", Boolean(hidden));
    });

    searchMeta.textContent = `${matches.length}개 섹션 일치`;
    matches.slice(0, 12).forEach((lesson) => {
      const anchor = document.createElement("a");
      anchor.href = `#${lesson.id}`;
      anchor.textContent = lesson.dataset.title || lesson.id;
      searchResults.appendChild(anchor);
    });
  }

  function chapterIndexFromScroll() {
    const viewportTop = window.scrollY + 140;
    let current = 0;
    chapters.forEach((chapter, index) => {
      if (chapter.offsetTop <= viewportTop) current = index;
    });
    return current;
  }

  function scrollToChapter(offset) {
    const current = chapterIndexFromScroll();
    const target = chapters[Math.min(chapters.length - 1, Math.max(0, current + offset))];
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  themeToggle.addEventListener("click", () => {
    body.dataset.theme = body.dataset.theme === "dark" ? "light" : "dark";
    localStorage.setItem("ods-ko-theme", body.dataset.theme);
    themeToggle.textContent = body.dataset.theme === "dark" ? "라이트모드" : "다크모드";
  });

  expandAll.addEventListener("click", () => {
    chapters.forEach((chapter) => {
      chapter.classList.remove("collapsed");
      const button = chapter.querySelector(".chapter-toggle");
      if (button) {
        button.textContent = "접기";
        button.setAttribute("aria-expanded", "true");
      }
    });
    lessons.forEach((lesson) => {
      lesson.classList.remove("collapsed");
      const button = lesson.querySelector(".section-toggle");
      if (button) {
        button.textContent = "접기";
        button.setAttribute("aria-expanded", "true");
      }
    });
  });

  collapseAll.addEventListener("click", () => {
    lessons.forEach((lesson) => {
      lesson.classList.add("collapsed");
      const button = lesson.querySelector(".section-toggle");
      if (button) {
        button.textContent = "펼치기";
        button.setAttribute("aria-expanded", "false");
      }
    });
  });

  prevChapter.addEventListener("click", () => scrollToChapter(-1));
  nextChapter.addEventListener("click", () => scrollToChapter(1));
  searchInput.addEventListener("input", runSearch);
  clearSearch.addEventListener("click", () => {
    searchInput.value = "";
    runSearch();
    searchInput.focus();
  });

  window.addEventListener("scroll", updateProgress, { passive: true });
  window.addEventListener("resize", updateProgress);
  window.addEventListener("hashchange", () => {
    const id = decodeURIComponent(location.hash.slice(1));
    const target = document.getElementById(id);
    if (!target) return;
    target.closest(".chapter")?.classList.remove("collapsed");
    target.classList.remove("collapsed");
  });

  document.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      searchInput.focus();
      searchInput.select();
    }
  });

  runSearch();
  updateProgress();
})();
