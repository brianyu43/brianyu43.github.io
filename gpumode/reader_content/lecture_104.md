---
num: 104
title: "Gluon과 Linear Layouts, 낮게 내려가되 손잡이는 남기기"
original: "Lecture 104: Gluon and Linear Layouts"
speaker: "Peter Bell, Mario Lezcano, Keren Zhou"
part: 7
part_label: Part VII · 시스템 실전과 최신 주제
priority: High
status: partial
---

:::crux
이 노트는 transcript는 없지만 official slide PDF가 있는 자료가 제한된 노트다. 핵심 질문은 **Triton식 생산성을 유지하면서 Blackwell 같은 최신 GPU의 warp specialization, TMA, mbarrier, tensor memory를 더 직접 제어하려면 어떤 언어 설계가 필요한가**다.
:::

## 1. 슬라이드가 말해 주는 큰 흐름

local notes에는 speakers가 Peter Bell, Mario Lezcano, Keren Zhou로 기록되어 있고, GPU Mode repo의 `lecture_104/gluon.pdf`가 연결되어 있다. transcript fetch는 실패했고 code link는 없다. 그래도 slides에는 agenda, code fragment, Blackwell matmul case study, profiling/sanitizer/tooling 내용이 꽤 분명히 들어 있다.

agenda는 Gluon introduction, Triton과의 비교, language design, Linear Layouts deep dive, optimized Blackwell matmul, developer tools로 이어진다. 이 강의는 추상 이론만이 아니라 "새 hardware에서 kernel expert에게 어떤 손잡이를 줄 것인가"를 묻는다.

## 2. 왜 새 언어가 필요하다고 말하는가

슬라이드는 Triton을 high-level tile-based GPU programming으로 소개한다. effort 대비 성능이 좋고 compiler가 많은 복잡성을 처리한다는 장점도 분명히 인정한다.

하지만 Blackwell 쪽 예시는 block-level programming model과 warp specialization 사이의 mismatch를 강조한다. 어떤 warp는 load를 맡고, 어떤 warp는 MMA를 기다리고, 어떤 warp는 epilogue를 수행하는 식의 schedule에서는 compiler가 항상 최선의 결정을 찾기 어렵다. Gluon의 목표는 더 낮은 제어와 생산성 사이에 새 자리를 만드는 것이다.

:::figure flow
label: Figure · Gluon이 드러내는 kernel 제어면
- tile_api: Triton과 비슷한 타일 중심 코드를 유지한다
- layouts: tensor가 hardware thread에 어떻게 분포되는지 명시한다
- warp_specialize: partition별 sub-kernel과 fork-join 구조를 표현한다
- intrinsics: mbarrier, TMA, tensor core 같은 hardware 기능을 부른다
- tools: profiler, sanitizer, layout visualizer로 낮은 제어의 위험을 줄인다
:::

## 3. Linear Layouts는 layout class를 하나의 언어로 묶는다

슬라이드는 기존에 register, shared memory, tensor memory layout을 위해 여러 class가 있었다고 설명한다. Linear Layouts는 data가 hardware에 어떻게 놓이는지를 함수로 표현하려는 시도다.

정의는 꽤 수학적이다. Linear Layout은 `F2` 위의 linear map, 즉 XOR와 AND를 쓰는 binary matrix로 설명된다. 이 관점은 단순히 예쁜 수학이 아니라 generic lowering, optimal layout conversion, swizzling, shuffle sequence 도출을 가능하게 하는 기반으로 제시된다.

## 4. Gluon의 낮은 손잡이들

Gluon slide에는 `gl.warp_specialize`의 fork-join model, default partition과 worker partition, static shared memory allocator, hardware intrinsic 노출이 나온다. 예시에는 `mbarrier`, `tma.async_load`, shared memory allocation 같은 Blackwell/Hopper 계열 async programming 요소가 보인다.

이런 기능은 kernel expert에게 강력하지만 공짜는 아니다. hardware 이해가 필요하고, portability도 제한된다. 슬라이드의 비교표도 Gluon을 "Tiles with Layouts", "Warp Partitions", "SOL performance", "not portable" 쪽으로 놓는다.

## 5. Blackwell matmul case study

slides는 optimized Blackwell matmul에서 `tcgen05.mma`, tensor memory, 2-CTA mode, TMA multicast, Cluster Launch Control을 언급한다. 특히 2-CTA mode는 CTA들이 B tile을 공유해 더 큰 MMA를 쓰고 shared memory replication을 줄이는 그림으로 설명된다.

TMA multicast는 여러 CTA가 같은 B tile을 global memory에서 중복 load하지 않도록 하는 방향으로 제시된다. Cluster Launch Control은 persistent kernel에서 work imbalance를 줄이기 위한 dynamic scheduling 맥락으로 설명된다. 정확한 성능 숫자는 slide context를 더 확인해야 하지만, B200 benchmark 예시는 Gluon matmul이 cuBLAS와 비슷한 수준의 TFLOPS를 보였다는 취지로 읽힌다.

## 6. 도구가 없으면 낮은 제어는 위험하다

Gluon은 낮은 수준을 노출하는 대신 tool 이야기도 같이 한다. Proton profiler는 Triton/Gluon kernel 최적화를 위한 낮은 overhead profiling으로 소개되고, host/device instrumentation과 PC sampling 같은 mode가 나온다.

sanitizer도 중요하다. concurrency sanitizer는 mbarrier를 기다리기 전 TMA load를 쓰는 식의 race를 잡고, invalid instruction sanitizer는 TMA alignment check를 넣는다. floating point sanitizer와 global memory sanitizer도 언급된다. 낮게 내려간 언어일수록 이런 난간이 없으면 생산성이 금방 무너진다.

## Source Links

- [YouTube](https://www.youtube.com/watch?v=oYs_qtuk2Pg)
- [GPU Mode lecture folder](https://github.com/gpu-mode/lectures/tree/main/lecture_104)
- [Slides PDF](https://github.com/gpu-mode/lectures/blob/main/lecture_104/gluon.pdf)
- [Gluon tutorials](https://triton-lang.org/main/getting-started/tutorials/gluon/index.html)
- [Gluon examples](https://triton-lang.org/main/getting-started/examples/gluon/index.html)
- [Linear layout visualizer](https://deep-learning-profiling-tools.github.io/linear-layout-viz/)
- Local notes: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/notes/lecture_104.md`
- Local transcript stub: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/transcripts/lecture_104.md`
