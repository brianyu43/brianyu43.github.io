---
num: 89
title: cuTile, tile abstraction을 어디까지 믿을까
original: "Lecture 89: cuTile (from friends at NVIDIA)"
speaker: Mehdi Amini, Jared Roesch
part: 6
part_label: Part VI · DSL·정확성·새 커널 모델
priority: Low
status: partial
---

:::crux
확인된 것은 제목, speaker, YouTube 링크뿐이다. cuTile의 API나 NVIDIA toolchain 안에서의 위치는 단정하지 않는다. 대신 이 장은 **tile 중심 abstraction을 볼 때 무엇이 쉬워지고 무엇이 여전히 programmer에게 남는지**를 묻는 짧은 지도다.
:::

## 1. 지금 확인된 자료

local notes에는 Mehdi Amini와 Jared Roesch가 speaker로 기록되어 있고 YouTube 링크만 있다. transcript fetch는 실패했다. slides, code, paper, repo folder는 missing이다.

따라서 cuTile의 API, NVIDIA 내부/외부 프로젝트 여부, CuTe나 MLIR과의 관계는 단정하지 않는다. 제목의 "(from friends at NVIDIA)"도 배경 힌트일 뿐, 기술 내용을 대신하지 않는다.

## 2. tile은 GPU 사고의 기본 단위

GPU 성능은 큰 tensor를 작은 작업 조각으로 나누는 방식에 크게 좌우된다. tile은 data reuse를 만들고, memory transaction을 정렬하고, parallel work를 hardware에 맞추는 단위가 된다. 그래서 많은 DSL과 library가 tile abstraction을 중심에 둔다.

하지만 tile은 단어 하나로 끝나지 않는다. logical tile, memory tile, thread tile, MMA tile이 서로 다를 수 있다. 좋은 abstraction은 이 차이를 숨길 때와 드러낼 때를 잘 고른다.

:::figure ladder
label: Figure · tile abstraction에서 확인할 층
- logical: tensor 연산을 어떤 block으로 나누는가
- memory: tile이 global/shared/register에 어떻게 놓이는가
- execution: warp/thread가 tile 안의 일을 어떻게 나누는가
- hardware: MMA, copy engine, cache line과 어떻게 맞는가
- tuning: shape별 tile parameter를 어떻게 고르는가
:::

## 3. abstraction의 장점과 빚

cuTile 같은 도구가 유용하려면 반복적인 index 계산과 layout 실수를 줄여야 한다. programmer가 "이 tile을 이 방식으로 옮기고 계산한다"를 더 직접 표현할 수 있으면, kernel code는 읽기 쉬워질 수 있다.

그 대신 abstraction은 빚을 만든다. generated code가 느릴 때 이유를 추적할 수 있어야 하고, corner case에서 어떤 memory access가 생기는지 볼 수 있어야 한다. tile abstraction이 profiler와 이어지지 않으면, 예쁜 문법 뒤에서 시간이 새어 나간다.

## 4. NVIDIA toolchain 안에서 볼 질문

원본 강의를 볼 때는 cuTile이 어느 층의 도구인지 확인하자. CUDA C++ library인지, Python DSL인지, MLIR dialect인지, CUTLASS/CuTe와 이어지는 component인지에 따라 해석이 달라진다.

또 target workload를 보자. GEMM, convolution, attention, stencil, collective communication 중 어디를 겨냥하는가? tile abstraction은 범용일수록 어려워지고, 특화될수록 강해진다. 어느 쪽을 택했는지가 중요하다.

## 5. 혼자 해볼 것

간단한 tiled matmul을 손으로 설계해 보자. block tile, warp tile, MMA tile을 따로 적고, 각 단계에서 어떤 data가 global memory에서 shared memory로, 다시 register로 이동하는지 표시한다.

cuTile 자료를 볼 때는 API 이름보다 예제가 드러내는 decision을 보자. tile 크기는 누가 정하는가? layout 변환은 명시적인가? hardware generation이 바뀌면 code도 바뀌는가? 이 질문들이 abstraction의 실제 무게를 알려 준다.

## Source Links

- [YouTube](https://www.youtube.com/watch?v=_b4I4rKpsGA)
- Local notes: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/notes/lecture_089.md`
- Local transcript stub: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/transcripts/lecture_089.md`
