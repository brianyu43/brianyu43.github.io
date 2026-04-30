---
num: 45
title: H100에서 cuBLAS를 넘는다는 말
original: "Lecture 45: Outperforming cuBLAS on H100"
speaker: pranjalssh
part: 4
part_label: Part IV · 프로덕션 커널과 GEMM
priority: High
status: partial
---

:::crux
이 강의의 transcript와 slide는 현재 local archive에 없다. 따라서 "어떻게 cuBLAS를 이겼는지"를 단정할 수 없다. 그래도 제목만으로 붙잡아야 할 핵심 질문은 있다. **어떤 제한된 shape, dtype, epilogue, hardware path에서는 general-purpose cuBLAS보다 specialized H100 kernel이 빠를 수 있는데, 그 조건을 어떻게 정직하게 말할 것인가**다.
:::

## 1. 지금 말할 수 있는 범위

local notes가 확인해 주는 것은 제목, speaker handle, YouTube link, transcript failure뿐이다. slides, code, paper, repo folder는 없다. 그러므로 이 글은 강의의 실제 최적화 기법을 요약하지 않는다. H100, cuBLAS, GEMM specialization을 읽을 때의 틀만 제공한다.

특히 "outperforming cuBLAS"라는 문장은 언제나 조건부로 읽어야 한다. 모든 shape, dtype, batch, transpose flag, epilogue, alignment, warmup, workspace, stream setting에서 cuBLAS를 이긴다는 뜻일 가능성은 낮다. 보통은 특정 problem family에서 library의 일반성을 줄이고 더 공격적인 선택을 했다는 뜻이다.

## 2. cuBLAS는 약한 상대가 아니다

cuBLAS는 단순한 baseline이 아니다. NVIDIA가 architecture별로 오래 다듬은 dense linear algebra library다. 그래서 cuBLAS보다 빠른 kernel이 나오려면 대개 더 좁은 문제를 잡아야 한다. 예를 들어 fixed shape, fixed dtype, fixed layout, no transpose, 특정 epilogue fusion, 특정 batch 구조처럼 제약이 들어간다.

H100에서는 WGMMA, TMA, warp specialization, shared memory swizzle, register allocation 같은 주제가 중요할 수 있다. 하지만 이 강의가 실제로 무엇을 썼는지는 확인 필요다. reader에서는 "아마 썼을 것이다"라고 쓰지 않는다. 대신 원본을 볼 때 확인할 checklist로 남긴다.

:::figure ladder
label: Figure · cuBLAS를 넘었다는 claim을 읽는 순서
- shape: M/N/K와 batch가 고정인지 넓은 범위인지 확인한다
- dtype: FP16, BF16, FP8, INT8 등 Tensor Core path를 확인한다
- layout: alignment, transpose, stride, contiguous 조건을 본다
- fusion: epilogue나 scale/dequant이 포함됐는지 확인한다
- baseline: cuBLAS 호출 조건, warmup, timing method가 공정한지 본다
:::

## 3. H100 kernel에서 물어볼 질문

H100 kernel을 읽을 때는 data movement가 먼저다. TMA로 global memory에서 shared memory로 tile을 옮기는가, swizzle로 bank conflict를 피하는가, double buffering이나 multi-stage pipeline으로 copy와 WGMMA를 겹치는가를 본다.

다음은 warp specialization이다. producer warp group과 consumer warp group을 나누는지, register를 `setmaxnreg`류의 hint로 재분배하는지, barrier가 어디에 놓이는지 확인해야 한다. 이런 부분은 작은 code change가 큰 성능 차이를 낼 수 있고, 반대로 debugging이 매우 어려운 구간이기도 하다.

## 4. benchmark를 믿기 전에 보는 것

timing은 반드시 synchronization을 포함해 올바르게 재야 한다. CUDA event를 쓰더라도 warmup, stream, graph capture 여부, input allocation 위치, clock 상태가 영향을 준다. cuBLAS와 custom kernel이 같은 data layout을 받는지, custom kernel만 유리한 pre-processing을 빼먹지 않았는지도 봐야 한다.

그리고 speedup은 평균 하나보다 분포가 낫다. 특정 K에서만 빠른지, 작은 M/N에서 launch overhead가 지배하는지, 큰 matrix에서 memory bandwidth가 충분한지 봐야 한다. "cuBLAS보다 빠름"은 headline이고, engineer에게 필요한 것은 조건표다.

## 5. 손으로 해볼 것

원본을 보기 전 준비 운동으로, 하나의 fixed GEMM shape를 정해 보자. 예를 들어 `M=N=K=4096` 같은 큰 square GEMM과, LLM inference에서 나올 법한 skinny GEMM을 하나씩 잡는다. 각 shape에서 cuBLAS가 얼마나 일반적인 요구를 처리해야 하는지, custom kernel이 무엇을 가정할 수 있는지 적어 보자.

강의를 다시 볼 때는 모든 성능 claim 옆에 "조건"을 붙인다. dtype, shape range, GPU, clock, baseline, fusion 여부, pre/post-processing 포함 여부를 채우면 좋은 reader 원고로 확장할 수 있다.

## Source Links

- [YouTube](https://www.youtube.com/watch?v=ErTmTCRP1_U)
- Local notes: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/notes/lecture_045.md`
- Local transcript stub: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/transcripts/lecture_045.md`
