#!/usr/bin/env python3
"""
shell.html + chapters/*.html → index.html 한 파일로 결합.
웹서버 없이 file:// 로 열어도 작동.
"""
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parent
SHELL = ROOT / "shell.html"
CHAPTERS_DIR = ROOT / "chapters"
OUT = ROOT / "index.html"
PLACEHOLDER = "<!-- CHAPTERS_INSERTED_HERE -->"


CH_TITLES = {
    1: "증명이란 무엇인가",
    2: "정렬 원리",
    3: "논리식",
    4: "수학적 데이터 타입",
    5: "수학적 귀납법",
    6: "상태 기계",
    7: "재귀적 데이터 타입",
    8: "무한 집합",
    9: "정수론",
    10: "유향 그래프와 부분 순서",
    11: "통신 네트워크",
    12: "단순 그래프",
    13: "평면 그래프",
    14: "합과 점근",
    15: "기수 규칙",
    16: "생성함수",
    17: "사건과 확률공간",
    18: "조건부 확률",
    19: "확률변수",
    20: "평균에서의 이탈",
    21: "임의 보행",
    22: "점화식",
}


def load_chapter(n: int) -> str:
    p = CHAPTERS_DIR / f"chapter{n:02d}.html"
    if not p.exists():
        title = CH_TITLES.get(n, f"챕터 {n}")
        return (
            f'<article id="ch{n}" class="chapter placeholder">'
            f'<h2>챕터 {n} — {title}</h2>'
            f'<p>이 챕터는 아직 작성 중입니다. 다시 빌드하면 채워집니다.</p>'
            f"</article>"
        )
    txt = p.read_text(encoding="utf-8").strip()
    # 안전 점검: 외부에 영향 줄 수 있는 태그가 들어왔는지 (단어 경계로)
    forbidden = [
        r"<script\b", r"<style\b", r"<link\b", r"<html\b",
        r"<head\b(?!er)", r"<body\b", r"<!doctype",
    ]
    for pat in forbidden:
        if re.search(pat, txt, flags=re.IGNORECASE):
            print(f"[warn] chapter{n:02d}.html 에 금지 태그 '{pat}' 매칭", file=sys.stderr)
    # 기본 클래스가 빠졌을 경우 보정
    if 'class="chapter' not in txt and 'class=\'chapter' not in txt:
        txt = re.sub(
            r'<article([^>]*?)id="ch(\d+)"',
            lambda m: f'<article{m.group(1)}id="ch{m.group(2)}" class="chapter"',
            txt, count=1,
        )
    return txt


def main() -> None:
    if not SHELL.exists():
        sys.exit(f"shell.html not found at {SHELL}")
    shell = SHELL.read_text(encoding="utf-8")
    if PLACEHOLDER not in shell:
        sys.exit(f"placeholder {PLACEHOLDER!r} not found in shell.html")
    parts = [load_chapter(n) for n in range(1, 23)]
    chapters_html = "\n\n".join(parts)
    output = shell.replace(PLACEHOLDER, chapters_html)
    OUT.write_text(output, encoding="utf-8")
    size_kb = OUT.stat().st_size / 1024
    print(f"Built {OUT.name}  ·  {size_kb:.1f} KB  ·  {len(parts)} chapters")


if __name__ == "__main__":
    main()
