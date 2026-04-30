#!/usr/bin/env python3
from __future__ import annotations

import html
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / "reader_content"
OUT = ROOT / "index.html"


PARTS = [
    (1, 10, "1", "Part I · 측정과 CUDA 기초"),
    (11, 24, "2", "Part II · 병렬 패턴과 Attention"),
    (25, 38, "3", "Part III · 커널 프레임워크와 이식성"),
    (39, 57, "4", "Part IV · 프로덕션 커널과 GEMM"),
    (58, 75, "5", "Part V · 추론·학습·통신 스케일"),
    (76, 89, "6", "Part VI · DSL·정확성·새 커널 모델"),
    (90, 104, "7", "Part VII · 시스템 실전과 최신 주제"),
]


def esc(value: object) -> str:
    return html.escape("" if value is None else str(value), quote=True)


def part_for(num: int) -> tuple[str, str]:
    for start, end, pid, label in PARTS:
        if start <= num <= end:
            return pid, label
    return "9", "Appendix"


def inline(text: str) -> str:
    text = esc(text)
    text = re.sub(r"`([^`]+)`", r"<code>\1</code>", text)
    text = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", text)
    text = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r'<a href="\2" target="_blank" rel="noopener">\1</a>', text)
    return text


def lecture_subtitle(num: int, original: str) -> str:
    if re.match(rf"^\s*Lecture\s+{num}\b", original, re.IGNORECASE):
        return original
    return f"Lecture {num} · {original}"


def parse_front_matter(text: str) -> tuple[dict[str, str], str]:
    if not text.startswith("---\n"):
        return {}, text
    _, fm, body = text.split("---", 2)
    meta: dict[str, str] = {}
    for line in fm.splitlines():
        if ":" in line:
            key, value = line.split(":", 1)
            value = value.strip()
            if len(value) >= 2 and value[0] == value[-1] and value[0] in {"'", '"'}:
                value = value[1:-1]
            meta[key.strip()] = value
    return meta, body.strip()


def flush_paragraph(lines: list[str], out: list[str]) -> None:
    if not lines:
        return
    out.append(f"<p>{inline(' '.join(line.strip() for line in lines))}</p>")
    lines.clear()


def render_figure(kind: str, body: str) -> str:
    label = "Figure"
    items: list[tuple[str, str]] = []
    for line in body.splitlines():
        line = line.strip()
        if line.startswith("label:"):
            label = line.split(":", 1)[1].strip()
        elif line.startswith("- "):
            raw = line[2:].strip()
            if ":" in raw:
                a, b = raw.split(":", 1)
                items.append((a.strip(), b.strip()))
            else:
                items.append((raw, ""))

    if kind == "grid":
        return """<div class="figure">
          <div class="fig-label">Figure · grid/block/thread</div>
          <div class="grid-viz">
            <div class="block-grid">
              <div class="block hot">block 0</div><div class="block">block 1</div><div class="block">block 2</div><div class="block">block 3</div>
              <div class="block">block 4</div><div class="block">block 5</div><div class="block">block 6</div><div class="block">block 7</div>
            </div>
            <div>
              <div class="threads"><div class="thread">0</div><div class="thread">1</div><div class="thread">2</div><div class="thread">3</div><div class="thread">4</div><div class="thread">5</div><div class="thread">6</div><div class="thread">7</div><div class="thread dim">8</div><div class="thread dim">9</div><div class="thread dim">10</div><div class="thread dim">11</div><div class="thread dim">12</div><div class="thread dim">13</div><div class="thread dim">14</div><div class="thread dim">15</div></div>
              <div class="fig-note">thread가 어떤 output을 맡는지부터 확인하자.</div>
            </div>
          </div>
        </div>"""

    if kind == "memory":
        return f"""<div class="figure">
          <div class="fig-label">{esc(label)}</div>
          <div class="memory-bars">
            <div class="memory-row"><div class="bar-label">Register</div><div class="bar-wrap"><div class="bar-fill" style="width:92%"></div></div><div class="bar-value">가깝고 작다</div></div>
            <div class="memory-row"><div class="bar-label">Shared</div><div class="bar-wrap"><div class="bar-fill" style="width:72%"></div></div><div class="bar-value">block 안 공유</div></div>
            <div class="memory-row"><div class="bar-label">Global/HBM</div><div class="bar-wrap"><div class="bar-fill warn" style="width:34%"></div></div><div class="bar-value">크고 멀다</div></div>
          </div>
        </div>"""

    if kind == "ladder":
        rows = "\n".join(
            f'<div class="ladder-step"><b>{esc(a)}</b><span>{inline(b)}</span></div>' for a, b in items
        )
        return f"""<div class="figure">
          <div class="fig-label">{esc(label)}</div>
          <div class="ladder">
            {rows}
          </div>
        </div>"""

    rows = "\n".join(
        f'<div class="flow-step"><b>{esc(a)}</b><span>{inline(b)}</span></div>' for a, b in items
    )
    return f"""<div class="figure">
          <div class="fig-label">{esc(label)}</div>
          <div class="flow">
            {rows}
          </div>
        </div>"""


def render_body(body: str) -> str:
    out: list[str] = []
    para: list[str] = []
    lines = body.splitlines()
    i = 0
    in_section = False
    while i < len(lines):
        line = lines[i].rstrip()
        stripped = line.strip()
        if not stripped:
            flush_paragraph(para, out)
            i += 1
            continue

        if stripped.startswith(":::"):
            flush_paragraph(para, out)
            block = stripped[3:].strip()
            block_lines: list[str] = []
            i += 1
            while i < len(lines) and lines[i].strip() != ":::":
                block_lines.append(lines[i])
                i += 1
            i += 1
            content = "\n".join(block_lines).strip()
            if block == "crux":
                out.append(f'<div class="crux"><div class="crux-label">핵심 질문 (THE CRUX)</div>{render_body(content)}</div>')
            elif block == "aside":
                out.append(f'<div class="aside"><div class="aside-label">ASIDE</div>{render_body(content)}</div>')
            elif block == "tip":
                out.append(f'<div class="tip"><div class="tip-label">TIP</div>{render_body(content)}</div>')
            elif block.startswith("figure"):
                kind = block.split(maxsplit=1)[1] if len(block.split()) > 1 else "flow"
                out.append(render_figure(kind, content))
            else:
                out.append(render_body(content))
            continue

        if stripped.startswith("## "):
            flush_paragraph(para, out)
            if in_section:
                out.append("</section>")
            out.append(f"<section><h2>{inline(stripped[3:].strip())}</h2>")
            in_section = True
            i += 1
            continue

        if stripped.startswith("- "):
            flush_paragraph(para, out)
            items = []
            while i < len(lines) and lines[i].strip().startswith("- "):
                items.append(f"<li>{inline(lines[i].strip()[2:].strip())}</li>")
                i += 1
            out.append("<ul>" + "".join(items) + "</ul>")
            continue

        if re.match(r"\d+\.\s+", stripped):
            flush_paragraph(para, out)
            items = []
            while i < len(lines) and re.match(r"\d+\.\s+", lines[i].strip()):
                item = re.sub(r"^\d+\.\s+", "", lines[i].strip())
                items.append(f"<li>{inline(item)}</li>")
                i += 1
            out.append("<ol>" + "".join(items) + "</ol>")
            continue

        para.append(stripped)
        i += 1

    flush_paragraph(para, out)
    if in_section:
        out.append("</section>")
    html_body = "\n".join(out)
    return html_body


def load_lectures() -> list[tuple[dict[str, str], str]]:
    lectures = []
    for path in sorted(CONTENT.glob("lecture_*.md")):
        meta, body = parse_front_matter(path.read_text(encoding="utf-8"))
        if "num" not in meta:
            raise SystemExit(f"missing num in {path}")
        num = int(meta["num"])
        pid, label = part_for(num)
        meta.setdefault("part", pid)
        meta.setdefault("part_label", label)
        meta.setdefault("priority", "Low")
        meta.setdefault("status", "partial")
        meta.setdefault("speaker", "Unknown")
        meta.setdefault("original", meta.get("title", f"Lecture {num}"))
        lectures.append((meta, body))
    return lectures


def render_article(meta: dict[str, str], body: str, prev_meta: dict[str, str] | None, next_meta: dict[str, str] | None) -> str:
    num = int(meta["num"])
    badge_class = "partial" if meta.get("status") == "partial" else "high"
    status_label = "partial · source-limited" if meta.get("status") == "partial" else "rich · transcript available"
    prev_button = (
        f'<button type="button" data-go="lecture-{int(prev_meta["num"]):03d}"><span class="nav-label">Previous</span>'
        f'L{int(prev_meta["num"]):03d} · {esc(prev_meta["title"])}</button>'
        if prev_meta
        else '<button type="button" data-go="welcome"><span class="nav-label">처음</span>GPU Mode 한글 노트</button>'
    )
    next_button = (
        f'<button class="next" type="button" data-go="lecture-{int(next_meta["num"]):03d}"><span class="nav-label">Next</span>'
        f'L{int(next_meta["num"]):03d} · {esc(next_meta["title"])}</button>'
        if next_meta
        else '<button class="next" type="button" disabled><span class="nav-label">Next</span>마지막 강의</button>'
    )
    return f"""    <article id="lecture-{num:03d}" class="lecture" data-part="{esc(meta['part'])}" data-part-label="{esc(meta['part_label'])}" data-title="{esc(meta['title'])}" data-en="{esc(meta['original'])}" data-speaker="{esc(meta['speaker'])}">
      <header class="lecture-header">
        <div class="chapter-num">{num:03d}</div>
        <h1>{esc(meta['title'])}</h1>
        <p class="lecture-en">{esc(lecture_subtitle(num, meta['original']))}</p>
        <div class="lecture-meta">
          <span>Speaker · {esc(meta['speaker'])}</span>
          <span>Priority · {esc(meta['priority'])}</span>
          <span class="badge {badge_class}">{status_label}</span>
        </div>
      </header>

      {render_body(body)}

      <div class="chapter-nav">
        {prev_button}
        {next_button}
      </div>
    </article>"""


def render_index() -> str:
    lectures = load_lectures()
    if len(lectures) != 104:
        raise SystemExit(f"expected 104 lecture drafts, found {len(lectures)}")
    articles = []
    for i, (meta, body) in enumerate(lectures):
        prev_meta = lectures[i - 1][0] if i else None
        next_meta = lectures[i + 1][0] if i + 1 < len(lectures) else None
        articles.append(render_article(meta, body, prev_meta, next_meta))

    return f"""<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>GPU Mode 한글 노트 · 104강 리더</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700;800&amp;display=swap" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css" rel="stylesheet">
<link rel="stylesheet" href="assets/gpumode-reader.css?v=quality-1">
</head>
<body>
<div class="layout">
  <aside class="sidebar" aria-label="GPU Mode lecture navigation">
    <div class="sidebar-brand">
      <h2>GPU Mode 한글 노트</h2>
      <p>CUDA · Triton · PyTorch 커널을 읽는 기록</p>
      <button class="home-link" type="button" data-go="welcome">처음 화면으로</button>
    </div>
    <div class="search-wrap">
      <input id="search" type="search" placeholder="강의 제목 / 키워드 검색..." autocomplete="off">
    </div>
    <nav id="lecture-nav-container"></nav>
  </aside>

  <main class="content">
    <div id="welcome" class="welcome">
      <h1>GPU Mode 104강 한글 노트</h1>
      <p class="sub">CUDA · Triton · GPU kernel · ML systems를 책처럼 넘겨 읽는 리더</p>
      <p class="lead">OSTEP 노트처럼 질문에서 시작하고, 짧은 절로 나누고, 필요한 그림만 곁들여 읽는 GPU Mode 노트다. GPU 얘기는 복잡하지만 페이지까지 복잡할 필요는 없다.</p>
      <h2>읽는 법</h2>
      <ul>
        <li><strong>핵심 질문</strong>: 그 강의가 결국 풀려는 문제. 여기서 길을 잃지 않으면 반은 이긴다.</li>
        <li><strong>그림</strong>: CUDA 타임라인, grid/block/thread, 메모리 계층처럼 머릿속에 모양이 있어야 하는 것만 시각화했다.</li>
        <li><strong>TIP / ASIDE</strong>: 바로 써먹을 조언과 곁가지 이야기. 몰라도 되지만, 알면 다음 강의가 덜 낯설다.</li>
      </ul>
      <div class="footer-note"><strong>상태:</strong> 44-104 자막은 2026-04-30에 재시도했지만 모두 실패했다. 자막이 없는 장은 partial 배지를 붙였고, 확인 가능한 자료 안에서만 설명한다.</div>
    </div>

{chr(10).join(articles)}
  </main>
</div>

<script>
(() => {{
  const navRoot = document.getElementById('lecture-nav-container');
  const search = document.getElementById('search');
  const welcome = document.getElementById('welcome');
  const lectures = Array.from(document.querySelectorAll('article.lecture'));
  const byId = new Map(lectures.map((lecture) => [lecture.id, lecture]));
  const groups = new Map();

  for (const lecture of lectures) {{
    const part = lecture.dataset.part || '0';
    const label = lecture.dataset.partLabel || `Part ${{part}}`;
    if (!groups.has(part)) groups.set(part, {{ label, lectures: [] }});
    groups.get(part).lectures.push(lecture);
  }}

  for (const [, group] of groups) {{
    const wrap = document.createElement('div');
    wrap.className = 'part-group';
    const label = document.createElement('div');
    label.className = 'part-label';
    label.textContent = group.label;
    wrap.appendChild(label);
    const list = document.createElement('ul');
    list.className = 'lecture-list';
    for (const lecture of group.lectures) {{
      const li = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.target = lecture.id;
      button.dataset.search = `${{lecture.dataset.title}} ${{lecture.dataset.en}} ${{lecture.dataset.speaker}}`.toLowerCase();
      button.innerHTML = `<span class="lecture-num">${{lecture.querySelector('.chapter-num').textContent}}</span><span class="lecture-title">${{lecture.dataset.title}}</span><span class="lecture-speaker">${{lecture.dataset.speaker}}</span>`;
      button.addEventListener('click', () => showLecture(lecture.id, true));
      li.appendChild(button);
      list.appendChild(li);
    }}
    wrap.appendChild(list);
    navRoot.appendChild(wrap);
  }}

  const navButtons = Array.from(navRoot.querySelectorAll('button[data-target]'));
  const goButtons = Array.from(document.querySelectorAll('[data-go]'));

  function clearActive() {{
    welcome.style.display = 'none';
    lectures.forEach((lecture) => lecture.classList.remove('active'));
    navButtons.forEach((button) => button.classList.remove('active'));
  }}

  function showWelcome(pushHash = true) {{
    clearActive();
    welcome.style.display = 'block';
    if (pushHash) history.replaceState(null, '', window.location.pathname);
    window.scrollTo({{ top: 0, behavior: 'smooth' }});
  }}

  function showLecture(id, pushHash = true) {{
    const lecture = byId.get(id);
    if (!lecture) {{
      showWelcome(pushHash);
      return;
    }}
    clearActive();
    lecture.classList.add('active');
    const activeButton = navButtons.find((button) => button.dataset.target === id);
    if (activeButton) activeButton.classList.add('active');
    if (pushHash) history.replaceState(null, '', `#${{id}}`);
    localStorage.setItem('gpumode-last-lecture', id);
    scrollForLecture(lecture);
  }}

  function scrollForLecture(lecture) {{
    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    if (window.matchMedia('(max-width: 860px)').matches) {{
      lecture.scrollIntoView({{ block: 'start', behavior }});
      return;
    }}
    window.scrollTo({{ top: 0, behavior }});
  }}

  goButtons.forEach((button) => {{
    button.addEventListener('click', () => {{
      const target = button.dataset.go;
      if (target === 'welcome') showWelcome(true);
      else showLecture(target, true);
    }});
  }});

  search.addEventListener('input', () => {{
    const q = search.value.trim().toLowerCase();
    navButtons.forEach((button) => {{
      const li = button.closest('li');
      li.classList.toggle('hidden', q && !button.dataset.search.includes(q));
    }});
  }});

  document.addEventListener('keydown', (event) => {{
    if (event.key === '/' && document.activeElement !== search) {{
      event.preventDefault();
      search.focus();
      return;
    }}
    if (event.key === 'Escape') {{
      search.blur();
      search.value = '';
      search.dispatchEvent(new Event('input'));
      showWelcome(true);
      return;
    }}
    const current = lectures.findIndex((lecture) => lecture.classList.contains('active'));
    if (event.key === 'ArrowRight' && current >= 0 && current < lectures.length - 1) showLecture(lectures[current + 1].id, true);
    if (event.key === 'ArrowLeft' && current > 0) showLecture(lectures[current - 1].id, true);
  }});

  window.addEventListener('hashchange', () => {{
    const target = decodeURIComponent(window.location.hash.replace(/^#/, ''));
    if (target && byId.has(target)) showLecture(target, false);
    else showWelcome(false);
  }});

  const hash = decodeURIComponent(window.location.hash.replace(/^#/, ''));
  const last = localStorage.getItem('gpumode-last-lecture');
  if (hash && byId.has(hash)) showLecture(hash, false);
  else if (last && byId.has(last)) showLecture(last, false);
  else showWelcome(false);
}})();
</script>
</body>
</html>
"""


def main() -> None:
    OUT.write_text(render_index(), encoding="utf-8")
    print(f"wrote {OUT}")


if __name__ == "__main__":
    main()
