---
num: 77
title: GPU kernel DSL, 무엇을 숨기고 무엇을 드러낼까
original: "Lecture 77: Domain Specific Languages for GPU Kernels"
speaker: Tri Dao
part: 6
part_label: Part VI · DSL·정확성·새 커널 모델
priority: High
status: partial
---

:::crux
Tri Dao의 실제 예제와 주장 흐름은 transcript가 없어 확인하지 못했다. 대신 이 장은 제목에서 출발해 **GPU kernel DSL을 평가하는 기준**을 세운다. CUDA의 복잡함을 줄이되, tiling·memory·parallelism 같은 성능 결정 요소를 얼마나 정확히 표현하게 해 주는가가 핵심 체크포인트다.
:::

## 1. 지금 확인된 자료

local notes에는 speaker가 Tri Dao로 기록되어 있고 YouTube link만 있다. transcript fetch는 실패했다. slides와 code는 확인되지 않았다. 따라서 이 강의가 Triton, ThunderKittens, CuTe, TVM, MLIR 계열 중 무엇을 중심으로 다뤘는지는 알 수 없다.

그러므로 이 reader는 특정 DSL 소개가 아니다. GPU kernel DSL을 평가할 때의 질문 목록이다. Tri Dao의 다른 작업을 떠올려도 여기서는 title 이상의 내용을 강의에 귀속시키지 않는다.

## 2. DSL은 편의 문법이 아니라 성능 contract다

GPU kernel DSL은 programmer에게 더 높은 수준의 표현을 준다. 하지만 좋은 DSL은 단지 CUDA 문법을 숨기는 데서 끝나지 않는다. 어떤 parallelism이 생기는지, memory hierarchy를 어떻게 쓰는지, compile-time constant와 runtime value가 어떻게 나뉘는지 표현해야 한다.

Triton을 예로 들면 program id, block size, mask, vectorized load/store가 언어의 핵심 감각이다. CUDA보다 짧게 쓸 수 있지만, tiling과 memory access pattern을 모르면 여전히 느린 kernel이 나온다. DSL은 마법 지팡이가 아니라 더 짧은 손잡이다.

:::figure ladder
label: Figure · GPU DSL을 평가하는 층
- semantics: operation이 어떤 tensor contract를 갖는가
- tiling: work를 block/program 단위로 어떻게 나누는가
- memory: global/shared/register에 무엇을 언제 올리는가
- lowering: DSL code가 어떤 compiler IR과 machine code로 내려가는가
- tuning: shape와 hardware별 parameter를 어떻게 찾는가
:::

## 3. abstraction의 좋은 긴장

너무 low-level이면 programmer가 모든 bank conflict와 pipeline을 직접 챙겨야 한다. 너무 high-level이면 compiler가 중요한 결정을 추측해야 한다. GPU DSL의 어려움은 이 사이의 적절한 노출을 찾는 것이다.

좋은 DSL은 자주 쓰는 pattern을 쉽게 만들되, 성능이 안 나올 때 내려갈 통로를 남긴다. tile shape, num warps, stages, memory layout, vectorization을 조정할 수 있어야 한다. 반대로 너무 많은 knob이 있으면 사용자는 autotuner 없이는 길을 잃는다.

## 4. LLM kernel에서 DSL이 빛나는 자리

LLM workload는 비슷한 pattern이 반복된다. matmul, attention, normalization, activation, quantize/dequantize, KV cache update가 계속 나온다. 이 반복성은 DSL과 compiler가 재사용 가능한 pattern을 만들기 좋은 환경이다.

하지만 LLM kernel은 shape가 고정되어 있지 않다. prefill과 decode가 다르고, batch size와 sequence length가 흔들리고, dtype과 hardware generation도 바뀐다. DSL이 실제로 유용하려면 빠른 happy path뿐 아니라 shape 다양성도 견뎌야 한다.

## 5. 혼자 해볼 것

같은 vector add나 layernorm을 CUDA와 Triton으로 각각 써 보고, code 길이보다 드러난 개념이 어떻게 다른지 적어 보자. CUDA는 thread/block과 memory를 직접 드러내고, Triton은 block tensor와 mask를 더 앞에 둔다. 이 차이를 느끼면 DSL 논의가 훨씬 구체적이 된다.

원본 강의를 볼 때는 어떤 DSL을 좋다고 말하는지보다, 어떤 실패 사례를 보여주는지 보자. DSL의 철학은 잘 될 때보다 안 될 때 더 잘 드러난다.

## Source Links

- [YouTube](https://www.youtube.com/watch?v=5qSN-R_E3w0)
- Local notes: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/notes/lecture_077.md`
- Local transcript stub: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/transcripts/lecture_077.md`
