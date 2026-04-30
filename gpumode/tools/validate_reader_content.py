#!/usr/bin/env python3
from __future__ import annotations

import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / "reader_content"
REQUIRED_META = {"num", "title", "original", "speaker", "part", "part_label", "priority", "status"}
FORBIDDEN = [
    "appears as a central thread",
    "documented from",
    "Transcript-derived",
    "detected in the sources",
    "study the lecture examples",
]


def parse_front_matter(text: str) -> tuple[dict[str, str], str]:
    if not text.startswith("---\n"):
        return {}, text
    _, fm, body = text.split("---", 2)
    meta = {}
    for line in fm.splitlines():
        if ":" in line:
            k, v = line.split(":", 1)
            v = v.strip()
            if len(v) >= 2 and v[0] == v[-1] and v[0] in {"'", '"'}:
                v = v[1:-1]
            meta[k.strip()] = v
    return meta, body


def main() -> None:
    problems: list[str] = []
    files = sorted(CONTENT.glob("lecture_*.md"))
    if len(files) != 104:
        problems.append(f"expected 104 lecture drafts, found {len(files)}")

    seen = set()
    for path in files:
        text = path.read_text(encoding="utf-8")
        meta, body = parse_front_matter(text)
        missing = REQUIRED_META - set(meta)
        if missing:
            problems.append(f"{path.name}: missing front matter keys {sorted(missing)}")
            continue
        num = int(meta["num"])
        seen.add(num)
        if f"{num:03d}" not in path.name:
            problems.append(f"{path.name}: num/path mismatch")
        if ":::crux" not in body:
            problems.append(f"{path.name}: missing crux block")
        if body.count("## ") < 5:
            problems.append(f"{path.name}: fewer than 5 sections")
        if "## Source Links" not in body:
            problems.append(f"{path.name}: missing Source Links")
        for phrase in FORBIDDEN:
            if phrase in text:
                problems.append(f"{path.name}: forbidden boilerplate phrase: {phrase}")
        if re.search(r"Lecture \d+ · Lecture \d+", text):
            problems.append(f"{path.name}: duplicated lecture title pattern")

    missing_nums = [n for n in range(1, 105) if n not in seen]
    if missing_nums:
        problems.append("missing lecture numbers: " + ", ".join(f"{n:03d}" for n in missing_nums))

    if problems:
        print("\n".join(problems))
        raise SystemExit(1)
    print("reader content ok")


if __name__ == "__main__":
    main()
