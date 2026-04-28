const state = {
  chapter: "ch1",
  query: ""
};

const chapterButtons = [...document.querySelectorAll("[data-chapter-target]")];
const chapters = [...document.querySelectorAll(".chapter")];
const searchInput = document.querySelector("[data-search]");
const emptyState = document.querySelector("[data-empty]");
const sectionList = document.querySelector("[data-section-list]");

function normalize(value) {
  return value.toLowerCase().replace(/\s+/g, "");
}

function chapterText(chapter) {
  return normalize(chapter.textContent || "");
}

function setChapter(id) {
  state.chapter = id;

  chapterButtons.forEach((button) => {
    const active = button.dataset.chapterTarget === id;
    button.classList.toggle("active", active);
    button.setAttribute("aria-current", active ? "true" : "false");
  });

  chapters.forEach((chapter) => {
    chapter.classList.toggle("active", chapter.id === id);
  });

  renderSectionList();
  history.replaceState(null, "", `#${id}`);
}

function renderSectionList() {
  const active = document.getElementById(state.chapter);
  if (!active) return;

  const sections = [...active.querySelectorAll(":scope > section")].filter((section) => !section.classList.contains("recap"));
  const links = sections.map((section, index) => {
    if (!section.id) {
      section.id = `${active.id}-sec-${index + 1}`;
    }
    const heading = section.querySelector("h2, h3");
    if (!heading) return "";
    return `<a href="#${section.id}">${heading.textContent.trim()}</a>`;
  });

  sectionList.innerHTML = links.join("");
}

function applySearch() {
  const query = normalize(state.query);
  let firstVisible = null;
  let visibleCount = 0;

  chapterButtons.forEach((button) => {
    const chapter = document.getElementById(button.dataset.chapterTarget);
    const visible = !query || chapterText(chapter).includes(query);
    button.hidden = !visible;
    if (visible) {
      visibleCount += 1;
      firstVisible ||= button.dataset.chapterTarget;
    }
  });

  if (query && firstVisible && document.getElementById(state.chapter)?.textContent && !chapterText(document.getElementById(state.chapter)).includes(query)) {
    setChapter(firstVisible);
  }

  emptyState.classList.toggle("visible", visibleCount === 0);
}

chapterButtons.forEach((button) => {
  button.addEventListener("click", () => setChapter(button.dataset.chapterTarget));
});

searchInput.addEventListener("input", (event) => {
  state.query = event.target.value;
  applySearch();
});

const initial = location.hash.replace("#", "");
if (initial && document.getElementById(initial)) {
  setChapter(initial);
} else {
  setChapter(state.chapter);
}

applySearch();
