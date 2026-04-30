---
num: 103
title: "CuTe layout algebra, 주소 계산을 수학으로 붙잡기"
original: "Lecture 103: Fundamentals of CuTe Layout Algebra and Category-theoretic Interpretation"
speaker: "Jack Carlisle and Jay Shah"
part: 7
part_label: Part VII · 시스템 실전과 최신 주제
priority: High
status: partial
---

:::crux
이 노트는 transcript는 없지만 official slide PDF가 있는 자료가 제한된 노트다. 핵심 질문은 **CuTe의 layout을 단순한 stride 표가 아니라 합성 가능한 함수로 보면, GEMM/attention kernel의 tiling과 data placement를 어떻게 더 정확히 다룰 수 있느냐**다.
:::

## 1. 이 강의는 슬라이드가 있다

local notes에는 speaker가 Jack Carlisle and Jay Shah로 기록되어 있고, GPU Mode repo의 `lecture_103/layout_algebra.pdf`가 연결되어 있다. transcript fetch는 실패했고 code link는 없다. 따라서 말로 설명된 예시나 Q&A는 빠져 있지만, slide outline과 수식은 어느 정도 따라갈 수 있다.

슬라이드는 CuTe layouts, CuTe layout algebra, categories, categories of layouts, composition algorithm 순서로 구성된다. GEMM의 A/B/C tensor와 attention의 Q/K/V shape를 출발점으로 삼고, tensor를 iterator와 layout `L = S : D`로 표현한다.

## 2. layout은 shape와 stride 이상의 함수다

CuTe에서 layout은 shape `S`와 stride `D`의 쌍처럼 보인다. 예를 들어 `(4, 6) : (6, 1)`은 익숙한 2D mapping을 만든다. 하지만 강의는 여기서 한 발 더 간다. nested tuple shape와 stride를 통해 tile, warp, instruction layout까지 표현한다.

중요한 관점은 coordinate function이다. 입력 좌표가 있고, stride와 곱해져 integer offset으로 간다. 이렇게 보면 layout은 메모리 그림이 아니라 함수다. 함수로 보면 합성, 보완, coalesce 같은 연산을 말할 수 있다.

:::figure flow
label: Figure · CuTe layout을 함수로 읽기
- shape: 좌표 공간의 모양을 정한다
- stride: 각 좌표 축이 offset에 주는 기여를 정한다
- colex: nested tuple 좌표와 정수 구간을 오간다
- layout_function: 좌표를 실제 offset으로 보낸다
- composition: 한 layout의 결과를 다른 layout의 입력으로 연결한다
:::

## 3. nested tuple은 장식이 아니다

슬라이드는 mode, entry, rank, length, size 같은 용어를 정의한다. `(4, (5, 5), (2, (3, 3)))` 같은 nested tuple은 보기에는 복잡하지만, GPU kernel에서는 자연스럽다. threadblock, warp, lane, register tile처럼 계층이 있기 때문이다.

refinement도 중요한 아이디어다. 어떤 shape의 entry를 같은 size의 nested tuple로 바꾸면 더 세밀한 구조를 표현할 수 있다. 이는 "같은 총 원소 수를 다른 계층으로 보는 법"이다. kernel layout을 이해할 때 꽤 실용적인 언어다.

## 4. layout algebra의 기본 연산

슬라이드는 interleaved layout이 logical division `A ⊘ B`와 logical product `A ⊗ B` 같은 algebraic operation에서 자연스럽게 생긴다고 설명한다. 이 연산들은 composition, complement, coalesce, concatenation 같은 더 기본적인 연산 위에 정의된다.

composition은 특히 조심스럽다. `B ◦ A`는 shape가 A의 shape를 refine하고, layout function이 `ΦB ◦ ΦA`가 되도록 하는 layout이다. 그런데 임의의 두 layout을 합성한다고 항상 예쁜 layout으로 떨어지는 것은 아니다. 그래서 tractable layout이라는 제한이 등장한다.

## 5. tractable layout과 category 언어

슬라이드는 tractable layout을 column-major layout에서 mode permutation, mode removal, stride 0 mode insertion, reparenthesizing으로 얻을 수 있는 layout로 설명한다. compact layout, strided layout, broadcast layout이 예로 나온다.

category 이야기는 멋을 위한 장식이 아니라 합성 가능성을 다루기 위한 언어로 읽는 편이 좋다. object, morphism, composition rule을 가진 category를 소개하고, FinSet, Vect, positive integer divisibility 같은 예를 든다. layout을 morphism처럼 다루면 어떤 합성이 가능한지 더 엄밀하게 말할 수 있다.

## 6. kernel 작성자에게 왜 중요한가

layout algebra는 수학 강의처럼 보이지만, 실제로는 data movement를 덜 틀리게 만들기 위한 도구다. MMA accumulator layout, wgmma accumulator layout처럼 hardware instruction이 요구하는 배치가 있고, programmer는 register/shared/global memory 사이를 오가며 layout을 바꿔야 한다.

layout을 함수와 합성으로 이해하면 "이 transpose가 그냥 view인지, 실제 shuffle이 필요한지", "coalesce해도 의미가 같은지", "broadcast stride 0이 어디서 생기는지"를 더 차분하게 볼 수 있다. GPU kernel에서 주소 계산은 사소한 housekeeping이 아니라 성능과 correctness의 중심부다.

## Source Links

- [YouTube](https://www.youtube.com/watch?v=MVh_guNbWMA)
- [GPU Mode lecture folder](https://github.com/gpu-mode/lectures/tree/main/lecture_103)
- [Slides PDF](https://github.com/gpu-mode/lectures/blob/main/lecture_103/layout_algebra.pdf)
- Local notes: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/notes/lecture_103.md`
- Local transcript stub: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/transcripts/lecture_103.md`
