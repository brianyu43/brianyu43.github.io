---
num: 80
title: FlashAttention 4를 읽는 법
original: "Lecture 80: How FlashAttention 4 Works"
speaker: Charles Frye
part: 6
part_label: Part VI · DSL·정확성·새 커널 모델
priority: High
status: partial
---

:::crux
transcript와 slides는 없다. notes에서 확인되는 강한 단서는 제목의 **FlashAttention 4**, speaker Charles Frye, 그리고 Modal의 reverse-engineering 글 링크다. 이 노트의 핵심 질문은 **FlashAttention 계열이 attention의 memory traffic을 어떻게 줄여 왔고, FA4를 읽을 때 무엇을 확인해야 하는가**다. FA4의 세부 trick은 source article과 영상 확인 전에는 단정하지 않는다.
:::

## 1. 지금 확인된 자료

local notes에는 YouTube 링크와 Modal blog 링크가 있다. GPU Mode lecture repo folder와 slide는 확인되지 않았다. transcript fetch도 실패했다. 따라서 이 글은 "FA4가 정확히 무엇을 한다"가 아니라 "FA4 설명을 따라갈 준비"에 가깝다.

FlashAttention이라는 이름은 이미 많은 배경을 요구한다. attention score matrix를 통째로 materialize하지 않고, tile 단위로 softmax state와 output을 갱신하는 감각이 먼저 있어야 한다. FA4라는 숫자는 새 버전의 세부 구현을 가리키겠지만, notes만으로는 그 세부를 안전하게 옮길 수 없다.

## 2. attention은 왜 memory 문제가 되는가

scaled dot-product attention은 말로는 간단하다. Q와 K를 곱하고, softmax를 하고, V를 곱한다. 하지만 sequence length가 길어지면 score matrix가 커지고, 이를 HBM에 쓰고 다시 읽는 비용이 커진다.

FlashAttention 계열의 기본 감각은 이 큰 중간 결과를 피하는 것이다. block 단위로 score를 계산하고, online softmax에 필요한 running max와 normalization state를 유지하면서 output을 누적한다. 이 설명은 FlashAttention family에 대한 일반 배경이며, FA4의 구체 구현 claim은 아니다.

:::figure memory
label: Figure · FlashAttention을 읽을 때 볼 memory 경로
- QKV: Q, K, V block을 HBM에서 가져온다
- score: 작은 tile의 score만 계산한다
- softmax: running max와 sum을 유지한다
- output: V와 곱한 결과를 누적한다
- avoid: 전체 score matrix를 HBM에 저장하지 않는다
:::

## 3. FA4에서 확인할 질문

FA4 설명을 읽을 때는 "새로운 알고리즘인가, 새로운 kernel engineering인가, 둘 다인가"를 먼저 나누자. attention의 수학은 그대로인데 hardware mapping, pipeline, layout, instruction 선택이 바뀌었을 수도 있다. 반대로 masking, grouped-query attention, variable length 같은 workload 요구가 중심일 수도 있다.

Modal 글을 볼 때는 benchmark 숫자만 따라가지 말고 baseline과 조건을 확인한다. GPU generation, dtype, head dimension, sequence length, causal 여부, batch shape가 바뀌면 attention kernel의 승패가 달라진다. 빠른 kernel은 항상 특정 조건과 함께 읽어야 한다.

## 4. CuTe와 kernel 표현

notes는 CuTe도 핵심 term으로 잡고 있다. CuTe는 tiled GPU kernel을 표현할 때 layout과 tensor view를 정교하게 다루는 도구다. FlashAttention 같은 kernel은 "무엇을 계산하는가"보다 "어떤 tile을 언제 어디에 놓는가"가 성능을 크게 좌우하므로, CuTe류 abstraction과 자연스럽게 만난다.

다만 이 강의가 CuTe를 얼마나 깊게 다뤘는지는 알 수 없다. 원본을 볼 때는 FA4 kernel이 layout, MMA shape, memory movement를 어떤 언어로 설명하는지 주목하자. 이름은 어렵지만 질문은 친숙하다. data를 덜 움직이고, 움직일 때는 hardware가 좋아하는 모양으로 움직이는가?

## 5. 혼자 해볼 것

작은 attention을 PyTorch로 구현하고, score matrix를 실제로 저장하는 버전과 block 단위로 누적하는 toy 버전을 비교해 보자. 성능을 production kernel과 비교하려는 실험이 아니라, memory footprint가 어떻게 달라지는지 보는 실험이다.

그다음 Modal article을 읽으며 FA4가 어느 층에서 새로워지는지 표시한다. algorithm, layout, pipeline, hardware instruction, benchmark methodology로 줄을 나누면 "빠르다"가 아니라 "왜 빠른가"를 더 차분하게 볼 수 있다.

## Source Links

- [YouTube](https://www.youtube.com/watch?v=VPslgC9piIw)
- [Code/article · Modal reverse-engineer FlashAttention 4](https://modal.com/blog/reverse-engineer-flash-attention-4)
- Local notes: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/notes/lecture_080.md`
- Local transcript stub: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/transcripts/lecture_080.md`
