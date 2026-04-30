---
num: 15
title: CUTLASS를 읽는 눈
original: "Lecture 15: CUTLASS"
speaker: Eric Auld
part: 2
part_label: Part II · 병렬 패턴과 Attention
priority: High
status: rich
---

:::crux
CUTLASS는 “GEMM을 빠르게 해주는 라이브러리”로만 보면 너무 납작하다. 이 강의의 핵심은 CUTLASS/CuTe가 GPU kernel을 **shape, stride, layout, tiling의 언어**로 말하게 만든다는 점이다. 난해한 template 문법 뒤에는 꽤 단순한 질문이 숨어 있다. 이 tensor의 좌표는 실제 memory 어디를 가리키는가?
:::

## 1. 왜 굳이 CUTLASS를 배우나

Eric Auld는 CUTLASS를 처음부터 만만한 도구로 소개하지 않는다. 오히려 “배울 만한 보상이 있지만, 진입 장벽도 있다”는 톤이다. cuBLAS, cuDNN 같은 host-side library는 아주 좋다. 정해진 연산을 호출하면 library가 Tensor Core 사용 여부, kernel 선택, 여러 최적화를 알아서 처리한다.

문제는 모델이 늘 정해진 연산만 하지 않는다는 데 있다. FlashAttention처럼 fusion이 필요하거나, epilogue에 특이한 연산이 붙거나, layout이 표준적이지 않거나, matmul과 그 주변을 한 kernel 안에서 만지고 싶을 때가 온다. 이때 CUTLASS는 vendor급 kernel을 완전히 새로 쓰지 않고 조립할 수 있는 부품 상자가 된다.

다만 이 부품 상자는 C++ template로 되어 있고, 표기법도 낯설다. 강의 초반의 “underscore convention” 이야기가 그래서 중요하다. `A_mk` 같은 이름은 그냥 예쁜 변수명이 아니라 tensor의 mode와 index를 표시하는 힌트다. CUTLASS 코드는 변수명부터 좌표계다.

## 2. CuTe의 중심: tensor는 pointer와 layout이다

CuTe에서 tensor는 크게 두 가지를 가진다. 실제 data를 가리키는 engine, 그리고 좌표를 offset으로 바꾸는 layout이다. layout은 shape와 stride로 이루어진다. “2차원 tensor”라고 말해도, 그것이 row-major인지 column-major인지, 혹은 더 복잡한 nested layout인지는 layout이 정한다.

이 관점은 처음에는 과하게 형식적이다. 하지만 GPU kernel에서는 이 형식성이 힘이 된다. coalesced load, shared memory tile, MMA operand layout은 모두 “좌표를 어떤 순서로 펴는가”에 달려 있다. CUTLASS는 이걸 주먹구구 index arithmetic 대신 composable layout 연산으로 다루려 한다.

:::aside
CuTe는 CUTLASS 3.0과 함께 나온 tensor/layout abstraction으로 설명된다. CUTLASS가 큰 kernel library라면, CuTe는 그 안에서 tensor shape와 tiling을 표현하는 문법에 가깝다.
:::

## 3. tiling은 큰 tensor를 작은 말로 바꾸는 일

GEMM을 빠르게 하려면 큰 matrix를 tile로 잘라야 한다. 이 말 자체는 익숙하다. CUTLASS/CuTe가 흥미로운 지점은 tiling을 단순히 “M을 128씩 자른다”가 아니라 layout의 변환으로 본다는 점이다. 큰 tensor의 좌표를 outer tile 좌표와 inner tile 좌표로 나눈다.

이 분해가 되면 같은 언어로 여러 층의 tile을 표현할 수 있다. thread block tile, warp tile, MMA instruction tile이 모두 같은 문제의 다른 해상도다. Tensor Core는 특정 shape의 MMA를 수행하고, kernel은 그 instruction tile을 더 큰 output tile 속에 배치한다.

:::figure ladder
label: Figure · CUTLASS가 보는 tiling 계층
- problem: 전체 GEMM 또는 convolution 문제
- CTA tile: thread block이 맡는 output 영역
- warp tile: warp들이 나눠 맡는 내부 영역
- MMA tile: Tensor Core instruction이 직접 먹는 작은 행렬
- element: 최종 coordinate와 memory offset
:::

## 4. Tensor Core와 library의 거리

Tensor Core를 직접 쓰려면 operand layout, register 배치, shared memory swizzle, instruction shape를 알아야 한다. CUTLASS는 이 작업을 모두 숨기지는 않는다. 대신 숨길 것과 드러낼 것을 나눈다. 사용자는 tile shape, element type, layout, epilogue 같은 고수준 선택을 하고, library는 architecture-specific machinery를 제공한다.

이 강의는 FlashAttention을 예로 드는 이유가 분명하다. FlashAttention은 단순히 matmul 하나가 아니라 QK, softmax, PV, online normalization이 얽힌 fused algorithm이다. 이런 곳에서는 “좋은 GEMM 호출”만으로 끝나지 않는다. 연산을 어떤 tile 단위로 streaming하고, 어떤 중간값을 register/shared memory에 둘지 결정해야 한다.

## 5. 읽는 법: 수식보다 좌표를 따라가자

CUTLASS 코드를 읽을 때 가장 좋은 습관은 template 이름을 한 번에 이해하려 하지 않는 것이다. 먼저 tensor의 shape, layout, tiling을 찾는다. 그 다음 어떤 coordinate가 어떤 layout을 거쳐 memory offset이 되는지 따라간다. 수식처럼 읽되, 실제 pointer까지 내려간다.

또 하나는 “static한 것과 dynamic한 것”을 구분하는 것이다. 큰 문제 크기는 runtime에 올 수 있지만, 작은 tile shape와 layout은 compile time에 박혀 있을 때가 많다. GPU compiler가 강하게 최적화하려면 이런 compile-time 정보가 매우 중요하다. CUTLASS의 긴 type은 이 정보를 compiler에게 먹이는 방식이기도 하다.

## 6. 손으로 해볼 것

작은 2D array를 하나 정하고 shape `(M, N)`, stride `(N, 1)`과 `(1, M)`을 직접 써보자. 같은 coordinate `(i, j)`가 row-major와 column-major에서 offset이 어떻게 달라지는지 계산한다. 그 다음 4x4 matrix를 2x2 tile로 자르고, outer coordinate와 inner coordinate를 나눠 써본다.

코드를 본다면 CUTLASS 전체를 바로 빌드하려 하지 말고 CuTe layout 예제를 먼저 읽는 편이 좋다. `make_shape`, `make_stride`, `make_layout`, `make_tensor`가 어떤 좌표계를 만드는지 종이에 그리면, template 괄호가 조금 덜 위협적으로 보인다.

## Source Links

- [YouTube](https://www.youtube.com/watch?v=G6q719ck7ww)
- [Eric Auld GitHub](https://github.com/ericauld)
- Local notes: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/notes/lecture_015.md`
- Local transcript: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/transcripts/lecture_015.md`
