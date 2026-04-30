# GPU Mode Reader Writing Guide

이 폴더는 `gpumode/index.html`에 들어갈 강의별 원고의 원천이다.

## 목표

- OSTEP 한글 노트처럼 읽히는 한국어 설명문.
- 기술적으로 솔직하고, 과장하지 않고, 강의의 중심 질문을 붙잡는다.
- 자동 요약 문장을 그대로 옮기지 않는다.
- 쉬운 말투를 쓰되, CUDA/Triton/attention/GEMM 같은 기술어는 자연스럽게 영어로 둔다.

## 원고 형식

각 강의는 `lecture_XXX.md` 파일 하나다.

```markdown
---
num: 1
title: 프로파일링부터 시작하자
original: How to profile CUDA kernels in PyTorch
speaker: Mark Saroufim
part: 1
part_label: Part I · 측정과 CUDA 기초
priority: High
status: rich
---

:::crux
핵심 질문 문단.
:::

## 1. 섹션 제목

본문 문단...

:::figure flow
label: Figure · 짧은 제목
- stage: 설명
- stage: 설명
:::

:::aside
곁가지 설명.
:::

:::tip
실전 팁.
:::

## Source Links

- [YouTube](...)
- Local source: ...
```

## Part Labels

front matter에는 아래 값을 정확히 쓴다.

- 001-010: `part: 1`, `part_label: Part I · 측정과 CUDA 기초`
- 011-024: `part: 2`, `part_label: Part II · 병렬 패턴과 Attention`
- 025-038: `part: 3`, `part_label: Part III · 커널 프레임워크와 이식성`
- 039-057: `part: 4`, `part_label: Part IV · 프로덕션 커널과 GEMM`
- 058-075: `part: 5`, `part_label: Part V · 추론·학습·통신 스케일`
- 076-089: `part: 6`, `part_label: Part VI · DSL·정확성·새 커널 모델`
- 090-104: `part: 7`, `part_label: Part VII · 시스템 실전과 최신 주제`

## 품질 기준

- 한 강의당 보통 5-7개 섹션.
- 각 섹션은 2-4문단 정도. 짧고 또렷하게.
- “이 강의는 documented from...” 같은 생성기 문구 금지.
- “appears as a central thread” 같은 원문 boilerplate 금지.
- transcript가 있는 001-043은 transcript에서 드러난 구체 흐름을 반영한다.
- transcript가 없는 044-104는 `partial` 상태를 정직하게 표시하고, 제목/슬라이드/code/notes 근거 안에서만 쓴다.
- 제목만 보고 알고리즘을 지어내지 않는다.
- 모든 중요한 숫자, benchmark claim, 고유명사는 불확실하면 “확인 필요”로 둔다.
- 독자가 바로 손으로 해볼 작은 실험이나 읽기 포인트를 넣는다.

## 추천 구조

1. 핵심 질문
2. 강의가 왜 필요한가
3. 핵심 메커니즘 또는 실행 모델
4. 머릿속 그림
5. 구현/성능에서 조심할 점
6. 혼자 해볼 과제
7. Source Links / 확인할 것

## 시각화 블록

가능하면 한 강의에 하나 정도만 넣는다. 장식이 아니라 이해를 도와야 한다.

- `:::figure flow`: compiler pipeline, training/inference path, communication path.
- `:::figure ladder`: profiler 단계, abstraction 단계.
- `:::figure grid`: CUDA grid/block/thread 설명.
- `:::figure memory`: memory hierarchy, bandwidth 중심 설명.

시각화가 억지스러우면 넣지 않는다.
