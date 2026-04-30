---
num: 62
title: Exo 2, scheduling language를 키운다는 것
original: "Lecture 62: Exo 2 Growing a scheduling language"
speaker: Yuka Ikarashi
part: 5
part_label: Part V · 추론·학습·통신 스케일
priority: High
status: partial
---

:::crux
transcript와 slides가 없어 Yuka Ikarashi가 설명한 Exo 2의 구체 기능은 확인되지 않았다. 제목에서 안전하게 읽을 수 있는 중심은 **algorithm을 쓰는 언어와 hardware에 맞게 schedule을 바꾸는 언어를 분리해, 최적화 과정을 더 명시적이고 검증 가능하게 만들려는 시도**다.
:::

## 1. scheduling language는 "어떻게 실행할까"를 말한다

컴파일러를 처음 배울 때는 보통 program semantics에 집중한다. 무엇을 계산하는가. 하지만 고성능 kernel에서는 어떻게 계산하는가가 거의 같은 무게를 가진다. loop를 어떻게 나누고, memory를 어디에 두고, parallelism을 어떻게 배치하는지가 성능을 만든다.

Exo 계열의 핵심 관심사는 이런 scheduling 선택을 언어로 다루는 데 있다고 볼 수 있다. 단, local notes에는 구체 API나 예제가 없으므로 Exo 2의 실제 설계를 단정하지 않는다.

## 2. schedule은 optimization log이기도 하다

고성능 코드를 손으로 고치다 보면 algorithm과 optimization이 뒤섞인다. loop tiling, unrolling, vectorization, memory staging이 원래 계산식 사이에 스며들어, 나중에는 무엇이 의미이고 무엇이 성능 trick인지 구분하기 어렵다.

scheduling language는 이 둘을 떼어 놓으려는 방향이다. 먼저 계산을 쓰고, 그 계산을 target에 맞게 바꾸는 transformation을 별도로 기록한다. 그러면 최적화 과정을 읽고, 재적용하고, 검증하기 쉬워진다.

:::figure flow
label: Figure · algorithm과 schedule을 나눠 보는 그림
- spec: 계산하려는 loop와 tensor 관계를 쓴다
- schedule: tile, reorder, fuse, split 같은 변환을 적용한다
- memory: buffer placement와 data movement를 정한다
- target: CPU, GPU, accelerator에 맞는 code를 만든다
- check: 변환 뒤에도 같은 계산인지 확인한다
:::

## 3. "growing"은 기능 추가보다 언어 확장의 문제다

제목의 `Growing a scheduling language`는 단순히 feature를 더한다는 말보다 넓게 읽힌다. schedule language가 실제 workload를 만나면 새로운 transformation, 새로운 memory pattern, 새로운 hardware constraint를 표현해야 한다. 언어가 자라야 하는 이유다.

하지만 언어가 커질수록 위험도 있다. primitive가 많아지면 배우기 어렵고, transformation끼리 상호작용이 복잡해진다. 좋은 scheduling language는 표현력과 reasoning 가능성 사이에서 균형을 잡아야 한다.

## 4. GPU 독자에게 중요한 연결점

CUDA나 Triton을 직접 쓰는 사람에게 scheduling language는 남의 일이 아니다. block tiling, shared memory staging, warp-level mapping, vectorized load는 모두 schedule 선택이다. 다만 CUDA에서는 이 선택이 code 구조 안에 박혀 있고, Exo 같은 접근에서는 transformation으로 드러날 수 있다.

원본 강의를 볼 때는 어떤 target을 예로 들었는지 확인해야 한다. CPU SIMD인지, embedded accelerator인지, GPU인지에 따라 scheduling primitive의 맛이 달라진다. GPU Mode reader라면 GPU와 연결되는 지점을 따로 표시해 두면 좋다.

## 5. 손으로 해볼 것

간단한 matrix multiply loop를 세 겹으로 써 보자. 그 다음 algorithm은 그대로 두고, `i`, `j`, `k` loop를 tile한다고 말로 적어 본다. tile 크기를 바꾸면 memory reuse와 parallelism이 어떻게 달라지는지 짧게 설명한다.

이 연습의 목적은 빠른 matmul을 직접 완성하는 것이 아니다. 계산과 schedule을 분리해서 말하는 습관을 만드는 것이다. 그 습관이 Exo 2 같은 강의를 훨씬 읽기 쉽게 만든다.

## Source Links

- [YouTube](https://www.youtube.com/watch?v=62gKfSyqCkA)
- Local notes: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/notes/lecture_062.md`
- Local transcript stub: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/transcripts/lecture_062.md`
