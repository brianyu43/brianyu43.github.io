---
num: 57
title: CuTe, layout을 계산하는 법
original: "Lecture 57: CuTe"
speaker: Cris Cecka
part: 4
part_label: Part IV · 프로덕션 커널과 GEMM
priority: High
status: partial
---

:::crux
이 강의도 transcript는 실패했지만, local notes에는 GPU Mode repo의 lecture_057 folder와 CuTe slide PDF가 확인된다. 세부 slide 내용은 여기서 재구성하지 않는다. 핵심 질문은 **CuTe가 GPU kernel에서 layout, tiling, tensor view를 값처럼 조합하게 만들어 CUTLASS식 고성능 kernel 작성을 어떻게 더 명시적으로 만드는가**다.
:::

## 1. CuTe는 "예쁜 tensor wrapper"보다 더 낮은 층에 있다

CuTe는 CUTLASS 생태계에서 layout과 tensor abstraction을 다루는 중요한 구성요소로 알려져 있다. 하지만 이 노트는 강의의 실제 예제나 slide 순서를 확인하지 못했으므로, 특정 API 사용법을 단정하지 않는다.

GPU Mode 독자에게 CuTe가 중요한 이유는 matmul 같은 kernel이 결국 layout 문제이기 때문이다. data가 논리적으로는 matrix여도, hardware가 보는 것은 address, stride, tile, thread mapping이다. CuTe는 이 관계를 더 수학적이고 조합 가능한 방식으로 표현하려는 도구로 읽을 수 있다.

## 2. layout은 모양이 아니라 주소 함수다

초보자는 tensor shape를 먼저 본다. 하지만 kernel 작성자는 shape와 함께 layout을 봐야 한다. 같은 `(M, N)` matrix라도 row-major, column-major, tiled layout, swizzled layout은 memory access와 coalescing이 다르다.

CuTe를 읽을 때 좋은 관점은 layout을 "index를 address로 바꾸는 함수"로 보는 것이다. tile을 나누고, thread가 맡을 element를 정하고, shared memory에 옮길 때도 결국 이 함수들이 합성된다. 이름은 귀엽지만, 내용은 꽤 날카롭다.

:::figure flow
label: Figure · CuTe식 사고의 일반 흐름
- shape: 논리적 tensor 크기를 정한다
- layout: index가 memory offset으로 가는 규칙을 둔다
- tile: 큰 tensor를 작은 작업 단위로 나눈다
- map: thread와 warp가 tile 안의 좌표를 맡는다
- compose: copy, MMA, store 경로에서 layout을 맞물린다
:::

## 3. tiling은 performance와 correctness를 같이 건드린다

GEMM kernel에서 tile 크기는 Tensor Core utilization, shared memory 사용량, register pressure, occupancy, memory coalescing에 모두 영향을 준다. 좋은 tile은 계산을 많이 재사용하게 하지만, 너무 크면 resource를 많이 먹는다.

CuTe 같은 abstraction은 tile과 layout을 명시적으로 다루게 해 준다. 이것은 편의 기능이 아니라 안전장치이기도 하다. 복잡한 kernel에서 좌표 변환을 손으로 흩뿌리면 작은 off-by-one과 stride 착각이 성능과 correctness를 동시에 깨뜨린다.

## 4. slide를 볼 때는 예제 하나를 끝까지 따라가자

원본 slide가 보강된 자료로 확인되므로, rich 원고로 바꿀 때는 예제 하나를 처음부터 끝까지 따라가는 것이 좋다. 예를 들어 작은 matrix tile이 global memory에서 shared memory로, 다시 MMA operand로, 마지막 output tile로 가는 경로를 그리면 CuTe의 의미가 훨씬 선명해진다.

API 이름을 많이 나열하는 것보다 좌표가 어떻게 바뀌는지 보여 주는 편이 reader에 더 좋다. CuTe는 결국 "이 좌표가 어디에 놓이는가"를 놓치지 않게 하는 언어이기 때문이다.

## 5. 손으로 해볼 것

작은 `4 x 4` matrix를 `2 x 2` tile 네 개로 나눠 보자. 각 element `(i, j)`가 row-major memory offset `i * 4 + j`로 가는 표를 만들고, tile 좌표와 tile 내부 좌표로 다시 표현해 본다.

그 다음 shared memory tile에 transpose해서 넣는다고 가정하고 offset 표를 하나 더 만든다. 이 손표가 CuTe layout algebra를 읽는 가장 소박한 입구다. 기계가 하는 일을 사람이 한 번 손으로 해 보는 것, 묘하게 강력하다.

## Source Links

- [YouTube](https://www.youtube.com/watch?v=vzUhbDO_0qk)
- [GPU Mode lecture folder](https://github.com/gpu-mode/lectures/tree/main/lecture_057)
- [Slides PDF](https://github.com/gpu-mode/lectures/blob/main/lecture_057/CuTe%20-%20Copy%20for%20GPUMode.pdf)
- [Slides mirror](https://drive.google.com/file/d/1HU9O-B9Ycm-wlHS6vKxKFO7lEIXXBjfQ/view?usp=sharing)
- Local notes: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/notes/lecture_057.md`
- Local transcript stub: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/transcripts/lecture_057.md`
