#!/usr/bin/env python3
"""Generate GPU Mode lecture blog pages in the cudatraining visual style."""

from __future__ import annotations

import html
import json
import re
from pathlib import Path


SITE_ROOT = Path(__file__).resolve().parents[1]
CUDA_DIR = Path(__file__).resolve().parent
OUT_DIR = CUDA_DIR / "gpumode"
ARCHIVE = Path("/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive")
NOTES = ARCHIVE / "notes"
TRANSCRIPTS = ARCHIVE / "transcripts"
METADATA = ARCHIVE / "metadata.json"


def esc(text: object) -> str:
    return html.escape(str(text or ""), quote=True)


def slug(number: int) -> str:
    return f"lecture-{number:03d}.html"


def note_path(number: int) -> Path:
    return NOTES / f"lecture_{number:03d}.md"


def transcript_path(number: int) -> Path:
    return TRANSCRIPTS / f"lecture_{number:03d}.md"


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="replace")


def split_sections(markdown: str) -> dict[str, str]:
    sections: dict[str, list[str]] = {}
    current = "title"
    sections[current] = []
    for line in markdown.splitlines():
        match = re.match(r"^##\s+(.+?)\s*$", line)
        if match:
            current = match.group(1).strip()
            sections[current] = []
            continue
        sections.setdefault(current, []).append(line)
    return {k: "\n".join(v).strip() for k, v in sections.items()}


def section(sections: dict[str, str], prefix: str) -> str:
    for key, value in sections.items():
        if key.startswith(prefix):
            return value
    return ""


def title_from_note(markdown: str) -> str:
    first = markdown.splitlines()[0] if markdown else ""
    return re.sub(r"^#\s*", "", first).strip()


def bullets(text: str) -> list[str]:
    out: list[str] = []
    for line in text.splitlines():
        line = line.strip()
        if line.startswith("- "):
            out.append(line[2:].strip())
    return out


def para_text(text: str) -> str:
    lines = []
    for line in text.splitlines():
        stripped = line.strip()
        if stripped and not stripped.startswith("- "):
            lines.append(stripped)
    return " ".join(lines).strip()


def inline_md(text: str) -> str:
    text = esc(text)
    text = re.sub(r"`([^`]+)`", r"<code>\1</code>", text)
    text = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", text)
    text = re.sub(r"\[([^\]]+)\]\((https?://[^)]+)\)", r'<a href="\2">\1</a>', text)
    return text


def plain(text: str) -> str:
    text = re.sub(r"\*\*([^*]+)\*\*", r"\1", text)
    text = re.sub(r"`([^`]+)`", r"\1", text)
    text = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r"\1", text)
    return text


def first_sentence(text: str, limit: int = 230) -> str:
    text = plain(" ".join(text.split()))
    if len(text) <= limit:
        return text
    cut = text[:limit].rsplit(" ", 1)[0]
    return cut.rstrip(".,;:") + "..."


def list_html(items: list[str], klass: str = "callout") -> str:
    if not items:
        return '<div class="callout"><div class="label">MISSING</div><p>수집된 항목이 없습니다.</p></div>'
    body = "\n".join(f"      <li>{inline_md(item)}</li>" for item in items)
    return f'<div class="{klass}">\n    <ul>\n{body}\n    </ul>\n  </div>'


def dialogue(items: list[str], who_a: str = "LEARNER", who_b: str = "ENGINEER", limit: int | None = None) -> str:
    selected = items[:limit] if limit else items
    if not selected:
        selected = ["이 섹션은 원자료가 부족합니다. 영상과 슬라이드를 다시 확인해야 합니다."]
    chunks = []
    for i, item in enumerate(selected):
        cls = "sam" if i % 2 == 0 else "jensen"
        who = who_a if i % 2 == 0 else who_b
        chunks.append(f'    <div class="dlg {cls}"><div class="who">{who}</div><div class="ln">{inline_md(item)}</div></div>')
    return "\n".join(chunks)


def links_for_record(record: dict[str, object]) -> list[tuple[str, str]]:
    links: list[tuple[str, str]] = []
    for label, key in [
        ("YouTube", "youtube_url"),
        ("GitHub folder", "github_folder_url"),
        ("Slides", "slides_url"),
        ("Code", "code_url"),
    ]:
        url = str(record.get(key) or "")
        if url:
            links.append((label, url))
    for url in record.get("paper_urls") or []:
        links.append(("Paper", str(url)))
    return links


def source_table(record: dict[str, object]) -> str:
    rows = []
    for label, url in links_for_record(record):
        rows.append(f"<tr><td>{esc(label)}</td><td><a href=\"{esc(url)}\" target=\"_blank\">{esc(url)}</a></td></tr>")
    if not rows:
        rows.append("<tr><td>Source</td><td>링크가 수집되지 않았습니다.</td></tr>")
    return """
  <table class="tbl">
    <thead><tr><th>Source</th><th>URL</th></tr></thead>
    <tbody>
      %s
    </tbody>
  </table>""" % "\n      ".join(rows)


def metric_bars(record: dict[str, object], core_count: int, term_count: int, transcript_status: str) -> str:
    transcript_width = {"available": 100, "partial": 55, "failed": 18, "unavailable": 12}.get(transcript_status, 18)
    slides_width = 100 if record.get("slides_url") else 20
    code_width = 100 if record.get("code_url") else 20
    core_width = min(100, max(18, core_count * 5))
    term_width = min(100, max(18, term_count * 7))
    return f"""
    <div class="viz">
      <div class="viz-cap"><span>FIG · source coverage</span><span>lecture {int(record['lecture_number']):03d}</span></div>
      <div class="bars">
        <div class="row"><span class="lbl">Transcript</span><span class="bar"><span style="width:{transcript_width}%"></span></span><span class="val">{esc(transcript_status)}</span></div>
        <div class="row"><span class="lbl">Slides</span><span class="bar sml"><span style="width:{slides_width}%"></span></span><span class="val">{'yes' if record.get('slides_url') else 'missing'}</span></div>
        <div class="row"><span class="lbl">Code</span><span class="bar sml"><span style="width:{code_width}%"></span></span><span class="val">{'yes' if record.get('code_url') else 'missing'}</span></div>
        <div class="row"><span class="lbl">Core ideas</span><span class="bar"><span style="width:{core_width}%"></span></span><span class="val">{core_count}</span></div>
        <div class="row"><span class="lbl">Key terms</span><span class="bar"><span style="width:{term_width}%"></span></span><span class="val">{term_count}</span></div>
      </div>
    </div>"""


def nav_links(number: int) -> str:
    prev_link = f'<a href="{slug(number - 1)}"><span class="lbl">Previous</span>Lecture {number - 1:03d}</a>' if number > 1 else '<a href="index.html"><span class="lbl">Index</span>GPU Mode 전체 목록</a>'
    next_link = f'<a class="nxt" href="{slug(number + 1)}"><span class="lbl">Next</span>Lecture {number + 1:03d}</a>' if number < 104 else '<a class="nxt" href="index.html"><span class="lbl">Index</span>GPU Mode 전체 목록</a>'
    return f'<div class="artnav">{prev_link}{next_link}</div>'


def generated_notice() -> str:
    return """
    <div class="callout">
      <div class="label">LOCAL STUDY NOTE</div>
      <p>이 글은 로컬 개인 학습 아카이브의 transcript / metadata / notes 를 바탕으로 재구성한 GPU Mode lecture note 입니다. 원자료가 없거나 caption fetch 가 실패한 곳은 추정하지 않고 명시했습니다.</p>
    </div>"""


def page_for(record: dict[str, object], note_md: str) -> str:
    number = int(record["lecture_number"])
    sections = split_sections(note_md)
    page_title = title_from_note(note_md)
    title = str(record.get("title") or page_title)
    speaker = str(record.get("speaker") or "Missing")
    transcript_status = str(record.get("transcript_status") or "unknown")
    notes_status = str(record.get("notes_status") or "unknown")
    priority = "TBD"
    priority_match = re.search(r"^- Priority:\s*(.+)$", section(sections, "11."), re.MULTILINE)
    if priority_match:
        priority = priority_match.group(1).strip()

    summary = para_text(section(sections, "2.")) or "요약 정보가 부족합니다."
    core = bullets(section(sections, "3."))
    terms = bullets(section(sections, "4."))
    relevance = para_text(section(sections, "5."))
    mechanisms = bullets(section(sections, "6."))
    perf = bullets(section(sections, "7."))
    code = bullets(section(sections, "8."))
    exercises = bullets(section(sections, "9."))
    connections = bullets(section(sections, "10."))
    study = bullets(section(sections, "11."))
    openq = bullets(section(sections, "12."))

    prev_href = slug(number - 1) if number > 1 else "index.html"
    next_href = slug(number + 1) if number < 104 else "index.html"

    return f"""<!doctype html>
<html lang="ko"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>GPU Mode Lecture {number:03d} — {esc(title)} · CUDA Training</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css" rel="stylesheet">
<link rel="stylesheet" href="../assets/style.css?v=2">
</head><body>

<div class="topbar">
  <div class="brand"><em>gpu</em>mode · lecture archive</div>
  <nav>
    <a href="../index.html">CUDA Training</a>
    <a href="index.html">GPU Mode Index</a>
    <a href="{prev_href}">← Prev</a>
    <a href="{next_href}">Next →</a>
  </nav>
</div>

<div class="wrap-wide">
  <section class="pod-hero">
    <div class="pod-kick">
      <span class="stack">GPU MODE</span>
      <span class="epn">LECTURE {number:03d}</span>
      <span>{esc(record.get('date_or_upload_date') or 'DATE MISSING')}</span>
      <span>{esc(transcript_status).upper()}</span>
      <span>{esc(priority).upper()}</span>
    </div>
    <h1>{esc(title)}</h1>
    <p class="dek">{inline_md(first_sentence(summary, 360))}</p>

    <div class="hosts">
      <div class="host sam">
        <div class="av">S</div>
        <div>
          <div class="role">Speaker</div>
          <div class="nm">{esc(speaker)}</div>
          <div class="sub">YouTube / repo metadata 기반</div>
        </div>
      </div>
      <div class="host jensen">
        <div class="av">G</div>
        <div>
          <div class="role">Study lens</div>
          <div class="nm">GPU kernel · compiler · LLM systems</div>
          <div class="sub">notes status: {esc(notes_status)}</div>
        </div>
      </div>
    </div>

    <div class="chapters">
      <div class="chapters-head"><span>CHAPTERS · 6 ACTS</span><span>local study draft</span></div>
      <div class="chapter-list">
        <a href="#a1"><span class="ts">00:00</span><span class="ix">01</span><span class="ti">강의 지도</span><span class="dur">summary · sources</span></a>
        <a href="#a2"><span class="ts">06:00</span><span class="ix">02</span><span class="ti">핵심 아이디어</span><span class="dur">{len(core)} bullets</span></a>
        <a href="#a3"><span class="ts">14:00</span><span class="ix">03</span><span class="ti">용어와 맥락</span><span class="dur">{len(terms)} terms</span></a>
        <a href="#a4"><span class="ts">22:00</span><span class="ix">04</span><span class="ti">커널 · 컴파일러 메커니즘</span><span class="dur">{len(mechanisms)} mechanisms</span></a>
        <a href="#a5"><span class="ts">31:00</span><span class="ix">05</span><span class="ti">성능 엔지니어링</span><span class="dur">{len(perf)} lessons</span></a>
        <a href="#a6"><span class="ts">40:00</span><span class="ix">06</span><span class="ti">실습과 재방문 계획</span><span class="dur">{len(exercises)} exercises</span></a>
      </div>
    </div>
  </section>

  <section class="act" id="a1">
    <div class="act-head">
      <div class="num">01 · MAP<b>강의 지도</b></div>
      <h2>이 강의는 어디에 꽂히는가.</h2>
    </div>
    <p class="act-lede">{inline_md(summary)}</p>
    <div class="act-body split">
      <div>
        {metric_bars(record, len(core), len(terms), transcript_status)}
      </div>
      <div>
        {generated_notice()}
        {source_table(record)}
      </div>
    </div>
  </section>

  <section class="act" id="a2">
    <div class="act-head">
      <div class="num">02 · CORE<b>핵심 아이디어</b></div>
      <h2>강의가 반복해서 밀어붙이는 기술적 주장들.</h2>
    </div>
    <p class="act-lede">원 transcript 와 노트에서 추출한 중심 논점을 엔지니어링 관점으로 다시 배열했다.</p>
{dialogue(core, limit=20)}
  </section>

  <section class="act" id="a3">
    <div class="act-head">
      <div class="num">03 · TERMS<b>용어와 맥락</b></div>
      <h2>이 강의를 읽기 위한 작은 사전.</h2>
    </div>
    <div class="act-body split rev">
      <div>
        <div class="viz">
          <div class="viz-cap"><span>Glossary</span><span>{len(terms)} entries</span></div>
          <table class="tbl">
            <tbody>
              {"".join(f"<tr><td>{inline_md(item)}</td></tr>" for item in terms[:24]) or "<tr><td>핵심 용어가 충분히 추출되지 않았습니다.</td></tr>"}
            </tbody>
          </table>
        </div>
      </div>
      <div>
        <div class="pull">“용어를 외우는 게 아니라, 어떤 병목을 가리키는 이름인지 붙잡는다.”<span class="by">study rule</span></div>
        <p class="act-lede">{inline_md(relevance or '시스템/커널/컴파일러 관련성은 원자료가 부족해 부분적으로만 정리되었습니다.')}</p>
      </div>
    </div>
  </section>

  <section class="act" id="a4">
    <div class="act-head">
      <div class="num">04 · MECHANISM<b>커널 · 컴파일러 메커니즘</b></div>
      <h2>알고리즘, 런타임, lowering, memory layout.</h2>
    </div>
    <div class="act-body split">
      <div>
        {list_html(mechanisms)}
      </div>
      <div>
        {list_html(code)}
      </div>
    </div>
  </section>

  <section class="act" id="a5">
    <div class="act-head">
      <div class="num">05 · PERF<b>성능 엔지니어링</b></div>
      <h2>빠르게 만드는 법보다 먼저, 무엇이 느린지 묻는다.</h2>
    </div>
{dialogue(perf, "PROF", "KERNEL", limit=14)}
  </section>

  <section class="act" id="a6">
    <div class="act-head">
      <div class="num">06 · PRACTICE<b>실습과 재방문 계획</b></div>
      <h2>읽고 끝내지 말고, 하나는 직접 재현한다.</h2>
    </div>
    <div class="act-body split rev">
      <div>
        <div class="viz">
          <div class="viz-cap"><span>Exercises</span><span>implement / profile / compare</span></div>
          <ol>
            {"".join(f"<li>{inline_md(item)}</li>" for item in exercises) or "<li>실습 항목이 부족합니다. 영상과 자료를 보고 직접 보강하세요.</li>"}
          </ol>
        </div>
        <div class="callout">
          <div class="label">Study priority</div>
          <ul>
            {"".join(f"<li>{inline_md(item)}</li>" for item in study) or "<li>우선순위 정보가 없습니다.</li>"}
          </ul>
        </div>
      </div>
      <div>
        <div class="callout">
          <div class="label">Connections</div>
          <ul>
            {"".join(f"<li>{inline_md(item)}</li>" for item in connections[:10]) or "<li>연결 lecture 를 확정하지 못했습니다.</li>"}
          </ul>
        </div>
        <div class="callout">
          <div class="label">Open questions</div>
          <ul>
            {"".join(f"<li>{inline_md(item)}</li>" for item in openq) or "<li>열린 질문이 없습니다.</li>"}
          </ul>
        </div>
      </div>
    </div>
    {nav_links(number)}
  </section>
</div>

<footer class="bot">
  <span>GPU Mode local study archive · generated from notes</span>
  <span><a href="index.html">Index</a></span>
</footer>
</body></html>
"""


def index_page(records: list[dict[str, object]]) -> str:
    def card(record: dict[str, object]) -> str:
        number = int(record["lecture_number"])
        title = str(record.get("title") or f"Lecture {number:03d}")
        speaker = str(record.get("speaker") or "Missing")
        status = str(record.get("transcript_status") or "unknown")
        tag = str(record.get("notes_status") or "note")
        return f"""
    <a class="card" href="{slug(number)}">
      <div class="num">{number:03d}</div>
      <div>
        <h3>{esc(title)}</h3>
        <p>{esc(speaker)} · transcript: {esc(status)} · slides: {'yes' if record.get('slides_url') else 'missing'} · code: {'yes' if record.get('code_url') else 'missing'}</p>
      </div>
      <div class="tag">{esc(tag).upper()}</div>
    </a>"""

    groups = [
        ("PART I · CUDA foundations", range(1, 15)),
        ("PART II · Kernels, collectives, attention", range(15, 31)),
        ("PART III · Triton, low-bit, serving", range(31, 47)),
        ("PART IV · Systems and compiler arc", range(47, 65)),
        ("PART V · ScaleML and multi-GPU", range(65, 81)),
        ("PART VI · DSLs, observability, CuTe", range(81, 105)),
    ]
    by_num = {int(r["lecture_number"]): r for r in records}
    cards = []
    for label, nums in groups:
        cards.append(f'    <div class="sec-label">{esc(label)}</div>')
        for n in nums:
            cards.append(card(by_num[n]))
    complete = sum(1 for r in records if r.get("notes_status") == "complete")
    partial = sum(1 for r in records if r.get("notes_status") == "partial")
    available = sum(1 for r in records if r.get("transcript_status") == "available")
    return f"""<!doctype html>
<html lang="ko"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>GPU Mode Lectures — 104편 블로그 노트</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css" rel="stylesheet">
<link rel="stylesheet" href="../assets/style.css?v=2">
</head><body>
<div class="topbar">
  <div class="brand"><em>gpu</em>mode · lecture archive</div>
  <nav>
    <a href="../index.html">CUDA Training</a>
    <a href="lecture-001.html">Start</a>
    <a href="https://www.youtube.com/@GPUMODE" target="_blank">YouTube</a>
  </nav>
</div>
<div class="wrap">
  <div class="hero">
    <p class="eyebrow"><span class="dot"></span>GPU MODE · 104 LECTURES · LOCAL STUDY BLOG</p>
    <h1>CUDA 커널에서<br>LLM 시스템까지.</h1>
    <div class="sub">GPU Mode 1–104 강의를 기존 CUDA Training 블로그 형식으로 다시 엮은 로컬 학습 노트. 각 페이지는 요약, 핵심 아이디어, 용어, 메커니즘, 성능 레슨, 실습으로 구성되어 있다.</div>
    <div class="stats">
      <div><b>104</b>lecture pages</div>
      <div><b>{available}</b>caption-backed</div>
      <div><b>{complete}</b>complete notes</div>
      <div><b>{partial}</b>partial notes</div>
      <div><b>GPU</b>kernels · compilers · systems</div>
    </div>
  </div>
  <div class="toc">
{"".join(cards)}
  </div>
</div>
<footer class="bot">
  <span>Generated from /gpumode_lecture_archive</span>
  <span>Personal study draft</span>
</footer>
</body></html>
"""


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    records = json.loads(METADATA.read_text(encoding="utf-8"))
    for record in records:
        number = int(record["lecture_number"])
        note_md = read(note_path(number))
        (OUT_DIR / slug(number)).write_text(page_for(record, note_md), encoding="utf-8")
    (OUT_DIR / "index.html").write_text(index_page(records), encoding="utf-8")
    print(f"Generated {len(records)} lecture pages plus index in {OUT_DIR}")


if __name__ == "__main__":
    main()
