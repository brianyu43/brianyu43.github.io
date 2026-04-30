---
num: 86
title: CuTe DSL, tile을 언어로 생각하기
original: "Lecture 86: Getting Started with CuTe DSL"
speaker: Vicki Wang
part: 6
part_label: Part VI · DSL·정확성·새 커널 모델
priority: High
status: partial
---

:::crux
transcript는 실패했지만 `cute_dsl_introduce.pdf` slide 링크가 있다. notes에서 확인되는 핵심은 **CuTe DSL을 처음 배울 때, GPU kernel을 thread의 집합이 아니라 layout과 tile algebra로 바라보는 법**이다. 정확한 API와 예제 코드는 slide와 공식 문서를 직접 확인해야 한다.
:::

## 1. 지금 확인된 자료

local notes에는 speaker가 Vicki Wang으로 기록되어 있고 YouTube, lecture folder, `cute_dsl_introduce.pdf`가 있다. code link는 notes에 없다.

CuTe는 CUTLASS 계열에서 layout과 tiled tensor를 표현하는 중요한 abstraction으로 알려져 있다. 하지만 이 강의가 어떤 버전의 CuTe DSL, 어떤 syntax, 어떤 exercise를 다뤘는지는 transcript 없이 확정할 수 없다. 여기서는 입문자가 붙잡을 mental model을 정리한다.

## 2. thread보다 tile을 먼저 본다

CUDA를 처음 배울 때는 block, thread, index 계산이 앞에 나온다. CuTe류 abstraction은 관점을 조금 바꾼다. data가 어떤 layout을 갖고, 그 layout을 어떤 tile로 나누며, tile이 hardware operation에 어떻게 mapping되는지 먼저 생각하게 만든다.

이 관점은 matmul 같은 kernel에서 특히 유용하다. 성능은 단순히 thread 수가 아니라 data reuse, memory coalescing, MMA shape, shared memory staging으로 결정된다. CuTe DSL은 이런 구조를 코드에서 더 명시적으로 다루게 하려는 도구로 읽을 수 있다.

:::figure ladder
label: Figure · CuTe DSL을 읽는 층
- shape: tensor와 tile의 차원을 적는다
- layout: logical index가 physical memory로 가는 방식을 본다
- partition: tile을 thread/block/warp 단위로 나눈다
- copy: global과 shared memory 사이 이동을 계획한다
- mma: hardware matrix operation에 맞춰 계산한다
:::

## 3. layout은 장식이 아니다

GPU kernel에서 layout은 성능 그 자체에 가깝다. 같은 값이라도 memory에 놓인 순서와 접근 패턴이 다르면 coalescing, bank conflict, cache behavior가 달라진다. CuTe를 배울 때 layout notation이 낯설어도 피하면 안 된다.

좋은 연습은 작은 2D tensor를 손으로 그리는 것이다. logical coordinate가 어떤 stride를 거쳐 address가 되는지, tile을 자르면 어떤 thread가 어떤 element를 읽는지 표시해 보자. 처음에는 느리지만, 이 그림이 없으면 나중에 profiler 숫자가 외계어처럼 보인다.

## 4. 입문에서 조심할 점

CuTe DSL은 CUDA보다 high-level처럼 보일 수 있지만, low-level detail을 없애지는 않는다. 오히려 detail을 다른 문법으로 드러낸다. 그래서 "문법을 외우기"보다 "layout, tile, copy, mma가 각각 무엇을 책임지는지"를 분리해서 보는 편이 좋다.

원본 slide를 볼 때는 예제 하나를 끝까지 따라가자. input/output shape, tile shape, shared memory staging, final store까지 끊지 말고 이어야 한다. 중간에 모르는 symbol이 나오면 그 symbol이 performance decision인지 단순 type annotation인지 구분한다.

## 5. 혼자 해볼 것

작은 GEMM을 골라 naive PyTorch, Triton, CuTe DSL pseudo-structure로 비교해 보자. 실제 구현 전이라도 tile shape와 memory movement를 그림으로 그리면 충분히 얻는 게 있다.

가능하다면 slide의 첫 예제를 그대로 실행 가능한 환경에서 돌려 보고, generated code나 profiler trace를 확인하자. CuTe는 눈으로만 보면 추상적이고, 한 번 깨져 보면 갑자기 현실적이다.

## Source Links

- [YouTube](https://www.youtube.com/watch?v=9-dfte_N3yk)
- [Slides folder](https://github.com/gpu-mode/lectures/tree/main/lecture_086)
- [Slides PDF](https://github.com/gpu-mode/lectures/blob/main/lecture_086/cute_dsl_introduce.pdf)
- Local notes: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/notes/lecture_086.md`
- Local transcript stub: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/transcripts/lecture_086.md`
