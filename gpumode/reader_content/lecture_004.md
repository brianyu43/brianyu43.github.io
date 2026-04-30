---
num: 4
title: 계산과 메모리의 기본값
original: Lecture 4 Compute and Memory Basics
speaker: Thomas Viehmann
part: 1
part_label: Part I · 측정과 CUDA 기초
priority: High
status: rich
---

:::crux
GPU 성능은 "thread를 많이 쓴다"만으로 설명되지 않는다. warp가 어떻게 실행되는지, block이 SM에 어떻게 배치되는지, memory traffic이 계산량에 비해 얼마나 큰지 알아야 kernel이 compute-bound인지 memory-bound인지 말할 수 있다.
:::

## 1. block은 SM 위에 올라간다

CUDA kernel을 launch할 때 우리는 block 안의 thread 수와 전체 block 수를 정한다. 실행 시 각 thread block은 어떤 Streaming Multiprocessor(SM)에 배정된다. 프로그래머가 "이 block은 저 SM으로"라고 직접 지정하지 않는다.

한 SM에는 여러 block이 동시에 올라갈 수 있다. 다만 register, shared memory, 최대 thread 수 같은 resource limit이 허락해야 한다. 그래서 block size는 성능에 영향을 준다. 너무 작으면 일을 충분히 못 채우고, 너무 크면 동시에 올라갈 block 수가 줄어들 수 있다.

강의에서 언급되는 RTX 3090 예처럼 한 SM이 수용할 수 있는 thread 수가 정해져 있을 때, 256이나 512 같은 block size가 깔끔하게 맞는 경우가 있다. 숫자를 외우기보다 "내 launch shape가 hardware limit과 어떻게 맞물리는가"를 보는 습관이 중요하다.

## 2. warp divergence는 조용히 시간을 먹는다

NVIDIA GPU에서 warp는 32개 thread가 lockstep으로 실행되는 단위다. 같은 warp 안의 thread들이 서로 다른 branch를 타면, GPU는 한쪽 branch를 실행하는 동안 다른 thread들을 비활성화하고, 다시 반대쪽을 실행한다.

이것이 warp divergence다. `if`가 항상 나쁜 것은 아니지만, warp 안에서 조건이 갈라지면 일부 lane이 놀게 된다. CPU의 branch와 같은 감각으로 보면 놓치기 쉽다.

특히 thread index에 따라 서로 다른 경로를 타는 코드는 조심해야 한다. 빠른 kernel은 종종 "모든 thread가 같은 일을 하되, 다른 data를 만진다"는 단순함을 유지하려고 애쓴다.

:::figure memory
label: Figure · 성능을 묻는 두 축
- layer: 계산량이 많고 memory traffic이 적으면 compute-bound에 가까워진다.
- layer: 계산량보다 load/store가 지배적이면 memory-bound에 가까워진다.
- layer: shared memory와 fusion은 memory traffic을 줄이는 대표 도구다.
- layer: occupancy와 divergence는 실행 자원을 얼마나 잘 채우는지 묻는다.
:::

## 3. occupancy는 만능 점수가 아니다

occupancy는 SM에 얼마나 많은 warp/block이 올라와 있는지를 보는 지표다. latency를 숨기려면 기다리는 warp가 충분히 있어야 하므로 occupancy는 중요하다.

하지만 occupancy가 높다고 항상 빠르지는 않다. register를 줄여 occupancy를 올렸더니 instruction이 늘거나 local memory spill이 생기면 오히려 느려질 수 있다. Nsight Compute의 occupancy 계산은 좋은 힌트지만, 최종 판정은 benchmark와 profile이 한다.

강의는 register와 local memory 이야기도 건드린다. 변수가 많고 compiler가 register에 다 담지 못하면 느린 local memory로 spill될 수 있다. "변수 하나 더"가 공짜가 아닐 때가 있다.

## 4. memory hierarchy와 data locality

많은 GPU kernel은 memory access에 묶인다. global memory에서 값을 읽고 계산한 뒤 다시 쓰는 패턴은 단순하지만, data reuse가 없으면 bandwidth 한계에 빨리 닿는다.

shared memory는 block 안의 thread들이 공유하는 빠른 on-chip memory다. 적절히 쓰면 global memory에서 여러 번 읽을 값을 한 번 가져와 block 안에서 재사용할 수 있다. 하지만 shared memory 자체도 제한된 resource라서, 쓰면 occupancy와 trade-off가 생긴다.

이 지점에서 tiling이 등장한다. 큰 문제를 shared memory에 들어갈 작은 tile로 나누고, tile 안에서 계산을 많이 한다. matmul, convolution, attention이 모두 이 발상 위에 서 있다.

## 5. arithmetic intensity로 감 잡기

Thomas는 flop per byte, 즉 memory transfer 한 byte당 얼마나 많은 floating-point operation을 하는지 보는 관점을 소개한다. 이 값이 낮으면 memory-bound일 가능성이 크고, 높으면 compute-bound에 가까워진다.

예를 들어 elementwise 연산은 대개 값을 읽고 조금 계산하고 바로 쓴다. 이런 연산은 kernel launch overhead와 memory bandwidth에 민감하다. 여러 elementwise 연산을 fusion하면 같은 data를 여러 번 global memory에 왕복시키지 않아도 된다.

반대로 matmul은 같은 값을 여러 번 재사용할 수 있어 arithmetic intensity를 높일 여지가 크다. 그래서 tiling과 shared memory가 특히 중요해진다.

## 6. 실전 읽기 포인트

profile을 볼 때 먼저 kernel 시간이 긴지, launch overhead가 많은지, memory throughput이 높은지, occupancy가 낮은지 나눠 보자. 하나의 숫자만 보지 않는 것이 좋다.

그리고 64-bit indexing 같은 사소해 보이는 선택도 성능에 영향을 줄 수 있다. 강의에서 PyTorch kernel을 옮기다 index type 때문에 느려졌던 경험담은 좋은 경고다. GPU에서는 "정확하지만 불필요하게 큰 타입"도 비용이 될 수 있다.

:::tip
빈 kernel, 단순 elementwise kernel, 작은 tiled kernel을 각각 profile해 보자. launch overhead, memory throughput, occupancy가 서로 다른 방식으로 보이면 이 강의가 꽤 몸에 들어온 것이다.
:::

## Source Links

- [YouTube](https://www.youtube.com/watch?v=lTmYrKwjSOU)
- [Slides](https://github.com/gpu-mode/lectures/blob/main/lecture_004/cuda-mode-2024-02-03.pdf)
- [Code](https://github.com/gpu-mode/lectures/tree/main/lecture_004)
- [Notebook](https://github.com/gpu-mode/lectures/blob/main/lecture_004/cuda-mode-session-4.ipynb)
- Local notes: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/notes/lecture_004.md`
- Local transcript: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/transcripts/lecture_004.md`
