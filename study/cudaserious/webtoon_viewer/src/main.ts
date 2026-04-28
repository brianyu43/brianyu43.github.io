import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ChevronsUp,
  Maximize2,
  Menu,
  Search,
  X,
  ZoomIn,
  ZoomOut,
  createIcons
} from "lucide";
import "./styles.css";
import type { Manifest, ManifestPage, ManifestVolume } from "./types";

const iconSet = {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ChevronsUp,
  Maximize2,
  Menu,
  Search,
  X,
  ZoomIn,
  ZoomOut
};

const STORAGE_KEY = "cuda-onebooks-reader-state";
const ZOOM_KEY = "cuda-onebooks-reader-zoom";
const zoomSteps = [70, 85, 100, 115, 130, 150, 180];

interface ReaderState {
  currentGlobalIndex: number;
  drawerOpen: boolean;
  zoom: number;
  query: string;
}

interface StoredState {
  globalIndex: number;
  scrollY: number;
  updatedAt: number;
}

interface Companion {
  id: "denji" | "aki" | "makima" | "yoru";
  name: string;
  line: string;
}

const companions: Companion[] = [
  { id: "denji", name: "Denji", line: "한 장만 더 넘기면 감 잡힐지도!" },
  { id: "aki", name: "Aki", line: "천천히 봐도 괜찮아. 구조가 먼저야." },
  { id: "makima", name: "Makima", line: "중요한 표는 다시 돌아와서 확인해." },
  { id: "yoru", name: "Yoru", line: "이 페이지는 전투력 높은 개념이네." }
];

let manifest: Manifest;
let pageIndex = new Map<number, ManifestPage>();
let pageVolume = new Map<number, ManifestVolume>();
let state: ReaderState = {
  currentGlobalIndex: 1,
  drawerOpen: false,
  zoom: readZoom(),
  query: ""
};
let saveScrollTimer = 0;
let urlTimer = 0;

const appElement = document.querySelector<HTMLDivElement>("#app");

if (!appElement) {
  throw new Error("Missing #app root");
}

const app = appElement;

void boot();

async function boot() {
  app.innerHTML = renderShell();
  wireStaticControls();

  try {
    const response = await fetch("/generated/manifest.json", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`manifest request failed (${response.status})`);
    }
    manifest = await response.json() as Manifest;
    indexManifest();
    renderReader();
    setupLazyImages();
    setupCurrentPageObserver();
    setupScrollSave();
    applyZoom();
    restoreInitialPosition();
    refreshIcons();
  } catch (error) {
    showMissingManifest(error);
  }
}

function renderShell() {
  return `
    <div class="app-shell">
      <header class="reader-bar">
        <div class="bar-left">
          <button class="icon-button" id="drawer-toggle" type="button" title="목차 열기" aria-label="목차 열기">
            <i data-lucide="menu"></i>
          </button>
          <button class="icon-button" id="prev-volume" type="button" title="이전 권" aria-label="이전 권">
            <i data-lucide="chevron-left"></i>
          </button>
          <button class="icon-button" id="next-volume" type="button" title="다음 권" aria-label="다음 권">
            <i data-lucide="chevron-right"></i>
          </button>
          <button class="current-pill" id="current-pill" type="button" title="현재 위치">
            <span class="pill-volume">Loading</span>
            <span class="pill-page">0 / 0</span>
          </button>
        </div>
        <div class="progress-wrap" aria-hidden="true">
          <div class="progress-fill" id="progress-fill"></div>
        </div>
        <div class="bar-right">
          <button class="icon-button" id="fit-width" type="button" title="폭 맞춤" aria-label="폭 맞춤">
            <i data-lucide="maximize-2"></i>
          </button>
          <button class="icon-button" id="zoom-out" type="button" title="축소" aria-label="축소">
            <i data-lucide="zoom-out"></i>
          </button>
          <span class="zoom-label" id="zoom-label">100%</span>
          <button class="icon-button" id="zoom-in" type="button" title="확대" aria-label="확대">
            <i data-lucide="zoom-in"></i>
          </button>
          <button class="icon-button" id="to-top" type="button" title="맨 위" aria-label="맨 위">
            <i data-lucide="chevrons-up"></i>
          </button>
        </div>
      </header>

      <aside class="drawer" id="drawer" aria-label="목차">
        <div class="drawer-head">
          <div>
            <div class="drawer-kicker">CUDA Onebooks</div>
            <h1>18권 웹툰 뷰어</h1>
          </div>
          <button class="icon-button" id="drawer-close" type="button" title="목차 닫기" aria-label="목차 닫기">
            <i data-lucide="x"></i>
          </button>
        </div>
        <label class="search-box">
          <i data-lucide="search"></i>
          <input id="toc-search" type="search" placeholder="권 제목, 페이지 label 검색" autocomplete="off" />
        </label>
        <nav class="toc-list" id="toc-list"></nav>
      </aside>
      <button class="drawer-backdrop" id="drawer-backdrop" type="button" aria-label="목차 닫기"></button>

      <main class="reader-main" id="reader-main">
        <div class="loading-state">
          <i data-lucide="book-open"></i>
          <span>manifest를 읽는 중입니다.</span>
        </div>
      </main>

      <aside class="companion-card" id="companion-card" aria-live="polite" tabindex="0"></aside>
    </div>
  `;
}

function wireStaticControls() {
  byId("drawer-toggle").addEventListener("click", () => setDrawer(true));
  byId("drawer-close").addEventListener("click", () => setDrawer(false));
  byId("drawer-backdrop").addEventListener("click", () => setDrawer(false));
  byId("current-pill").addEventListener("click", () => setDrawer(true));
  byId("prev-volume").addEventListener("click", () => moveVolume(-1));
  byId("next-volume").addEventListener("click", () => moveVolume(1));
  byId("fit-width").addEventListener("click", () => setZoom(100));
  byId("zoom-out").addEventListener("click", () => stepZoom(-1));
  byId("zoom-in").addEventListener("click", () => stepZoom(1));
  byId("to-top").addEventListener("click", () => scrollToPage(1, "smooth"));

  const searchInput = byId<HTMLInputElement>("toc-search");
  searchInput.addEventListener("input", () => {
    state.query = searchInput.value.trim().toLowerCase();
    renderToc();
  });
}

function renderReader() {
  const reader = byId("reader-main");
  reader.innerHTML = `<div class="strip" id="strip">${renderPages()}</div>`;
  renderToc();
  updateCurrentPage(1);
}

function renderPages() {
  return manifest.volumes.map((volume) => {
    const pageHtml = volume.pages.map((page) => {
      const cssWidth = Math.round(page.width / manifest.capture.deviceScaleFactor);
      return `
        <figure
          class="page-frame"
          id="page-${page.globalIndex}"
          data-global-index="${page.globalIndex}"
          data-volume-id="${volume.id}"
          style="--page-css-width: ${cssWidth}px;"
        >
          <img
            class="page-image"
            data-src="${page.src}"
            alt="${volume.id} ${page.pageIndex}쪽 - ${escapeHtml(page.label)}"
            width="${page.width}"
            height="${page.height}"
            loading="lazy"
            decoding="async"
          />
          <figcaption>
            <span>${volume.id}</span>
            <span>${page.pageIndex} / ${volume.pageCount}</span>
            <span>${escapeHtml(page.label)}</span>
          </figcaption>
        </figure>
      `;
    }).join("");

    return `
      <section class="volume-strip" id="volume-${volume.id}" aria-label="${volume.id} ${escapeHtml(volume.title)}">
        <div class="volume-marker">
          <span>${volume.id}</span>
          <strong>${escapeHtml(volume.title)}</strong>
          ${renderCompanionChip(getCompanion(volume))}
          <em>${volume.pageCount} pages</em>
        </div>
        ${pageHtml}
      </section>
    `;
  }).join("");
}

function renderToc() {
  if (!manifest) {
    return;
  }

  const toc = byId("toc-list");
  const query = state.query;

  toc.innerHTML = manifest.volumes.map((volume) => {
    const volumeMatches = searchable(`${volume.id} ${volume.title}`).includes(query);
    const pages = volume.pages.filter((page) => {
      if (!query || volumeMatches) {
        return true;
      }
      return searchable(`${volume.id} ${page.pageIndex} ${page.label}`).includes(query);
    });

    if (query && pages.length === 0) {
      return "";
    }

    const active = pageVolume.get(state.currentGlobalIndex)?.id === volume.id ? " active" : "";
    return `
      <section class="toc-volume${active}">
        <button type="button" class="toc-volume-button" data-jump="${volume.pages[0]?.globalIndex ?? 1}">
          <span>${volume.id}</span>
          <strong>${escapeHtml(volume.title)}</strong>
          <em>${volume.pageCount}</em>
        </button>
        <div class="toc-pages">
          ${pages.map((page) => `
            <button type="button" class="toc-page${page.globalIndex === state.currentGlobalIndex ? " current" : ""}" data-jump="${page.globalIndex}">
              <span>${String(page.pageIndex).padStart(2, "0")}</span>
              <span>${escapeHtml(page.label)}</span>
            </button>
          `).join("")}
        </div>
      </section>
    `;
  }).join("");

  toc.querySelectorAll<HTMLButtonElement>("[data-jump]").forEach((button) => {
    button.addEventListener("click", () => {
      const target = Number(button.dataset.jump);
      scrollToPage(target, "smooth");
      setDrawer(false);
    });
  });
}

function setupLazyImages() {
  const lazyImages = [...document.querySelectorAll<HTMLImageElement>("img[data-src]")];
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) {
        continue;
      }
      const image = entry.target as HTMLImageElement;
      const src = image.dataset.src;
      if (src) {
        image.src = src;
        image.removeAttribute("data-src");
      }
      observer.unobserve(image);
    }
  }, {
    rootMargin: "1800px 0px"
  });

  lazyImages.forEach((image) => observer.observe(image));
}

function setupCurrentPageObserver() {
  const frames = [...document.querySelectorAll<HTMLElement>(".page-frame")];
  const observer = new IntersectionObserver((entries) => {
    const visible = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => Math.abs(a.boundingClientRect.top - 84) - Math.abs(b.boundingClientRect.top - 84));

    if (visible[0]) {
      const globalIndex = Number((visible[0].target as HTMLElement).dataset.globalIndex);
      updateCurrentPage(globalIndex);
    }
  }, {
    rootMargin: "-78px 0px -55% 0px",
    threshold: [0, 0.1, 0.4, 0.75]
  });

  frames.forEach((frame) => observer.observe(frame));
}

function setupScrollSave() {
  window.addEventListener("scroll", () => {
    window.clearTimeout(saveScrollTimer);
    saveScrollTimer = window.setTimeout(() => {
      const stored: StoredState = {
        globalIndex: state.currentGlobalIndex,
        scrollY: window.scrollY,
        updatedAt: Date.now()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    }, 200);
  }, { passive: true });
}

function restoreInitialPosition() {
  const deepLink = readDeepLink();
  if (deepLink) {
    requestAnimationFrame(() => scrollToPage(deepLink, "auto"));
    return;
  }

  const stored = readStoredState();
  if (!stored) {
    return;
  }

  requestAnimationFrame(() => {
    if (pageIndex.has(stored.globalIndex)) {
      scrollToPage(stored.globalIndex, "auto");
    } else {
      window.scrollTo({ top: stored.scrollY, behavior: "auto" });
    }
  });
}

function updateCurrentPage(globalIndex: number) {
  const page = pageIndex.get(globalIndex);
  const volume = pageVolume.get(globalIndex);
  if (!page || !volume) {
    return;
  }

  state.currentGlobalIndex = globalIndex;
  byId("progress-fill").style.width = `${(globalIndex / manifest.totalPages) * 100}%`;
  byId("current-pill").innerHTML = `
    <span class="pill-volume">${volume.id}</span>
    <span class="pill-page">${page.pageIndex}/${volume.pageCount} · ${globalIndex}/${manifest.totalPages}</span>
  `;

  byId<HTMLButtonElement>("prev-volume").disabled = volume.id === manifest.volumes[0].id;
  byId<HTMLButtonElement>("next-volume").disabled = volume.id === manifest.volumes[manifest.volumes.length - 1].id;
  renderCompanion(volume);

  window.clearTimeout(urlTimer);
  urlTimer = window.setTimeout(() => {
    const params = new URLSearchParams(window.location.search);
    params.set("vol", volume.id);
    params.set("page", String(page.pageIndex));
    history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
  }, 150);

  renderToc();
  refreshIcons();
}

function renderCompanion(volume: ManifestVolume) {
  const companion = getCompanion(volume);
  byId("companion-card").innerHTML = `
    <div class="mascot-avatar ${companion.id}" aria-hidden="true">
      <span>${companion.name[0]}</span>
    </div>
    <div class="companion-copy">
      <strong>${companion.name}</strong>
      <p>${escapeHtml(companion.line)}</p>
    </div>
  `;
}

function renderCompanionChip(companion: Companion) {
  return `
    <span class="crew-chip ${companion.id}">
      <b aria-hidden="true">${companion.name[0]}</b>
      ${companion.name}
    </span>
  `;
}

function getCompanion(volume: ManifestVolume) {
  const index = manifest.volumes.findIndex((candidate) => candidate.id === volume.id);
  return companions[Math.max(0, index) % companions.length];
}

function moveVolume(direction: -1 | 1) {
  const currentVolume = pageVolume.get(state.currentGlobalIndex);
  if (!currentVolume) {
    return;
  }

  const index = manifest.volumes.findIndex((volume) => volume.id === currentVolume.id);
  const next = manifest.volumes[index + direction];
  if (next?.pages[0]) {
    scrollToPage(next.pages[0].globalIndex, "smooth");
  }
}

function scrollToPage(globalIndex: number, behavior: ScrollBehavior) {
  const frame = document.getElementById(`page-${globalIndex}`);
  if (!frame) {
    return;
  }
  frame.scrollIntoView({ behavior, block: "start" });
}

function setDrawer(open: boolean) {
  state.drawerOpen = open;
  document.body.classList.toggle("drawer-open", open);
  byId("drawer-toggle").setAttribute("aria-expanded", String(open));
  if (open) {
    byId<HTMLInputElement>("toc-search").focus({ preventScroll: true });
  }
}

function setZoom(nextZoom: number) {
  state.zoom = clampZoom(nextZoom);
  localStorage.setItem(ZOOM_KEY, String(state.zoom));
  applyZoom();
}

function stepZoom(direction: -1 | 1) {
  const current = zoomSteps.reduce((nearest, value) => {
    return Math.abs(value - state.zoom) < Math.abs(nearest - state.zoom) ? value : nearest;
  }, zoomSteps[0]);
  const index = zoomSteps.indexOf(current);
  setZoom(zoomSteps[Math.max(0, Math.min(zoomSteps.length - 1, index + direction))]);
}

function applyZoom() {
  document.documentElement.style.setProperty("--reader-zoom", String(state.zoom / 100));
  byId("zoom-label").textContent = `${state.zoom}%`;
  byId<HTMLButtonElement>("zoom-out").disabled = state.zoom <= zoomSteps[0];
  byId<HTMLButtonElement>("zoom-in").disabled = state.zoom >= zoomSteps[zoomSteps.length - 1];
}

function indexManifest() {
  pageIndex = new Map();
  pageVolume = new Map();
  for (const volume of manifest.volumes) {
    for (const page of volume.pages) {
      pageIndex.set(page.globalIndex, page);
      pageVolume.set(page.globalIndex, volume);
    }
  }
}

function readDeepLink() {
  const params = new URLSearchParams(window.location.search);
  const volumeId = params.get("vol")?.toUpperCase();
  const pageNumber = Number(params.get("page") ?? "");
  if (!volumeId || !Number.isFinite(pageNumber)) {
    return null;
  }

  const volume = manifest.volumes.find((candidate) => candidate.id === volumeId);
  const page = volume?.pages.find((candidate) => candidate.pageIndex === pageNumber);
  return page?.globalIndex ?? null;
}

function readStoredState() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as StoredState | null;
    if (stored && Date.now() - stored.updatedAt < 1000 * 60 * 60 * 24 * 30) {
      return stored;
    }
  } catch {
    return null;
  }
  return null;
}

function readZoom() {
  const stored = localStorage.getItem(ZOOM_KEY);
  if (stored === null) {
    return 100;
  }
  const value = Number(stored);
  return Number.isFinite(value) ? clampZoom(value) : 100;
}

function clampZoom(value: number) {
  return Math.max(zoomSteps[0], Math.min(zoomSteps[zoomSteps.length - 1], Math.round(value)));
}

function searchable(value: string) {
  return value.toLowerCase().normalize("NFKD");
}

function showMissingManifest(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  byId("reader-main").innerHTML = `
    <div class="empty-state">
      <i data-lucide="book-open"></i>
      <h2>아직 생성된 이미지가 없습니다.</h2>
      <p>먼저 <code>npm run capture</code>를 실행한 뒤 새로고침하면 321쪽 스트립이 열립니다.</p>
      <small>${escapeHtml(message)}</small>
    </div>
  `;
  refreshIcons();
}

function byId<T extends HTMLElement = HTMLElement>(id: string) {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing element #${id}`);
  }
  return element as T;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function refreshIcons() {
  createIcons({ icons: iconSet });
}
