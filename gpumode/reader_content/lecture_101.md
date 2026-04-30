---
num: 101
title: "CUTLASS를 어려운 길로 배우기"
original: "Lecture 101: Learning CUTLASS the hard way"
speaker: Kapil Sharma
part: 7
part_label: Part VII · 시스템 실전과 최신 주제
priority: High
status: partial
---

:::crux
이 노트는 transcript, slides, code가 없는 자료가 제한된 노트다. local notes에서 확실한 주제는 CUTLASS다. 핵심 질문은 **CUTLASS를 단순히 template invocation으로 쓰는 데서 그치지 않고, tile, layout, MMA, epilogue, pipeline을 이해하며 배우려면 어떤 순서가 좋은가**다.
:::

## 1. 자료 상태와 읽기 목표

local notes에는 speaker가 Kapil Sharma로 기록되어 있고 YouTube link만 있다. transcript fetch는 실패했고 slides/code/paper/repo folder는 없다. 따라서 강의의 구체 예제, CUTLASS version, target GPU, benchmark 숫자는 확인해야 한다.

그래도 "Learning CUTLASS the hard way"라는 제목은 방향이 분명하다. CUTLASS는 빠른 GEMM을 부르는 wrapper가 아니라, production GEMM kernel을 구성하는 부품 상자에 가깝다. 어려운 길은 괴롭히려는 길이 아니라 내부 구조를 보려는 길이다.

## 2. CUTLASS를 배우기 어려운 이유

CUTLASS는 template parameter가 많고 이름도 길다. 처음 보면 type이 code보다 더 큰 것처럼 느껴진다. 하지만 그 type들은 대개 tile shape, data type, layout, operator class, architecture, epilogue, pipeline policy를 표현한다.

어려움은 "문법"보다 "mapping"에 있다. M/N/K tile이 threadblock, warp, instruction tile로 어떻게 쪼개지는지, shared memory가 어떤 layout으로 쓰이는지, Tensor Core instruction이 어떤 shape를 먹는지 연결해야 한다.

:::figure ladder
label: Figure · CUTLASS를 아래에서 위로 읽는 사다리
- mma_instruction: hardware matrix instruction shape와 dtype을 본다
- warp_tile: warp가 어떤 accumulator 조각을 맡는지 본다
- threadblock_tile: shared memory와 pipeline stage를 이해한다
- epilogue: accumulator가 bias, activation, store로 나가는 길을 본다
- problem: GEMM shape와 layout이 전체 template 선택을 밀어낸다
:::

## 3. GEMM 하나에도 많은 계약이 있다

GEMM은 `C = A B`라고 쓰면 간단하지만 kernel에서는 계약이 많다. row-major/column-major, leading dimension, alignment, dtype accumulation, beta/alpha scaling, epilogue fusion, split-K 여부가 모두 영향을 준다.

CUTLASS를 배울 때는 처음부터 모든 feature를 켜기보다 가장 작은 GEMM에서 출발하는 편이 좋다. 같은 shape를 cuBLAS와 비교하고, correctness를 확인하고, profiler로 memory와 tensor core 사용을 본다. 그다음 epilogue나 layout을 하나씩 바꾼다.

## 4. 성능을 읽는 눈

CUTLASS kernel이 느릴 때는 template을 더 만지기 전에 병목을 분리해야 한다. Tensor Core를 쓰는지, memory coalescing이 되는지, shared memory bank conflict가 있는지, occupancy가 너무 낮은지, problem shape가 tile과 맞지 않는지 본다.

특히 edge shape는 중요하다. 예쁜 multiple-of-128 shape에서는 빠른 kernel도, 실제 LLM workload의 odd dimension이나 small batch에서는 다른 path로 갈 수 있다. "hard way"는 이런 지저분한 모서리를 보는 습관을 포함한다.

## 5. 원본에서 확인할 질문

강의가 CUTLASS 2.x 중심인지, CUTLASS 3.x/CuTe 중심인지 확인하자. 둘은 읽는 법이 다르다. CuTe가 들어오면 layout algebra와 tensor abstraction을 같이 이해해야 한다.

예제 code가 있다면 template parameter를 한 줄씩 풀어 보자. operation class, architecture tag, tile shape, stage count, epilogue operator가 각각 무엇을 정하는지 표로 옮기면 막연함이 줄어든다.

## 6. 혼자 해볼 것

CUTLASS example 중 가장 단순한 GEMM을 빌드하고, 같은 input을 cuBLAS와 비교한다. 그다음 M/N/K를 조금씩 바꾸며 performance가 어디서 떨어지는지 기록한다.

추가로 epilogue에 bias나 activation이 붙는 경우를 찾아보자. LLM kernel에서는 GEMM 뒤의 작은 연산을 어떻게 붙이느냐가 memory traffic을 크게 바꾼다.

## Source Links

- [YouTube](https://www.youtube.com/watch?v=jGouxuAHIfQ)
- Local notes: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/notes/lecture_101.md`
- Local transcript stub: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/transcripts/lecture_101.md`
