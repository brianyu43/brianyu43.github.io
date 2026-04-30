---
num: 75
title: GPU Programming Fundamentals와 ThunderKittens
original: "Lecture 75 [ScaleML Series] GPU Programming Fundamentals + ThunderKittens"
speaker: William Brandon; Simran Arora
part: 5
part_label: Part V · 추론·학습·통신 스케일
priority: High
status: partial
---

:::crux
transcript는 없지만 두 slide PDF가 있다. 이 강의의 중심 질문은 **GPU hardware를 먼저 이해한 뒤, AI kernel을 tile 단위 abstraction으로 더 단순하고 효율적으로 쓸 수 있는가**다. 앞부분은 GPU programming fundamentals, 뒷부분은 ThunderKittens의 tile-based programming으로 읽힌다.
:::

## 1. 지금 확인된 자료

local notes에는 speakers가 William Brandon과 Simran Arora로 기록되어 있고, `GPU Programming Fundamentals.pdf`와 `ThunderKittens.pdf`가 있다. transcript와 code link는 없다. slide에는 CUDA program의 block/thread launch와 hardware-first perspective가 먼저 나오고, ThunderKittens slide에는 "simple abstractions for hardware-efficient AI kernel programming"이라는 방향이 보인다.

따라서 이 원고는 강의 전체를 완성된 tutorial로 재현하지 않는다. 대신 두 축을 잡는다. 하나는 GPU가 thread, memory hierarchy, bandwidth/latency로 움직인다는 기초 감각이고, 다른 하나는 AI kernel을 tile 단위로 표현해 hardware 선호와 가까워지려는 시도다.

## 2. hardware-first로 kernel을 보기

CUDA program은 grid, block, thread로 보이지만, 성능은 그 아래 hardware에서 결정된다. warp가 어떻게 실행되는지, register와 shared memory가 얼마나 가까운지, global memory access가 얼마나 비싼지 알아야 같은 code도 다르게 보인다.

초보자는 종종 "thread를 많이 쓰면 빠르다"에서 멈춘다. 실제로는 memory coalescing, occupancy, register pressure, synchronization, arithmetic intensity가 같이 움직인다. fundamentals part는 이 지도를 깔아 주는 역할로 읽으면 좋다.

:::figure memory
label: Figure · AI kernel을 hardware 가까이에서 보기
- registers: thread가 가장 가까이 쓰는 값, 많아지면 occupancy와 trade-off가 생긴다
- shared memory: block 안 재사용을 위한 빠른 scratchpad, bank conflict를 조심한다
- global memory: bandwidth가 크지만 latency가 높아 access pattern이 중요하다
- tile: matmul/attention의 data reuse 단위로 hardware path를 맞춘다
- synchronization: tile 사이 순서를 맞추되 너무 자주 멈추지 않게 한다
:::

## 3. ThunderKittens의 읽기 포인트

ThunderKittens slide는 AI hardware와 tile-based programming을 큰 축으로 둔다. 여기서 tile은 단순한 loop blocking이 아니라, matmul과 attention 같은 AI kernel에서 data movement와 compute를 함께 조직하는 단위다. 좋은 tile abstraction은 programmer가 hardware 세부를 모두 손으로 쓰지 않아도 효율적인 path를 타게 도와준다.

하지만 abstraction은 늘 긴장 속에 있다. 너무 높으면 hardware가 원하는 layout과 synchronization을 표현하기 어렵고, 너무 낮으면 CUDA를 직접 쓰는 것과 다르지 않다. ThunderKittens를 볼 때는 API가 귀여운지보다, 어떤 hardware primitive를 안전하게 감싸는지 보는 편이 낫다.

## 4. 성능에서 조심할 점

AI kernel은 대부분 "연산을 많이 한다"와 "데이터를 잘 움직인다" 사이의 균형이다. matmul은 tile이 잘 맞으면 compute-bound에 가까워질 수 있지만, attention은 sequence length, mask, KV cache layout에 따라 memory-bound 성격이 강해질 수 있다.

ThunderKittens 같은 framework를 평가할 때도 generated code 또는 backend path를 봐야 한다. 같은 high-level tile expression이 GPU generation마다 다르게 최적화될 수 있다. slide가 언급하는 hardware generation 변화의 문제의식도 여기와 맞닿아 있다.

## 5. 혼자 해볼 것

작은 tiled matmul을 손으로 그려 보자. A와 B tile이 shared memory에 들어오고, thread들이 register accumulator를 갱신한 뒤, C tile을 저장하는 흐름을 표시한다. 이 그림이 익숙해지면 ThunderKittens 같은 tile abstraction이 왜 필요한지 더 잘 보인다.

원본 slides를 볼 때는 fundamentals와 ThunderKittens를 따로 보지 말자. "이 abstraction은 방금 배운 hardware 사실 중 무엇을 숨기고, 무엇을 드러내는가"를 계속 물으면 강의가 더 오래 남는다.

## Source Links

- [YouTube](https://www.youtube.com/watch?v=Cl2B_hmg4gA)
- [Slides folder](https://github.com/gpu-mode/lectures/tree/main/lecture_075)
- [GPU Programming Fundamentals PDF](https://github.com/gpu-mode/lectures/blob/main/lecture_075/GPU%20Programming%20Fundamentals.pdf)
- [ThunderKittens PDF](https://github.com/gpu-mode/lectures/blob/main/lecture_075/ThunderKittens.pdf)
- [ScaleML Bootcamp](https://scale-ml.org/bootcamp/)
- [Speaker site](https://arorasimran.com)
- Local notes: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/notes/lecture_075.md`
- Local transcript stub: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/transcripts/lecture_075.md`
