---
num: 8
title: CUDA 성능 체크리스트
original: "Lecture 8: CUDA Performance Checklist"
speaker: Mark Saroufim
part: 1
part_label: Part I · 측정과 CUDA 기초
priority: High
status: rich
---

:::crux
CUDA 최적화는 비밀 주문보다 체크리스트에 가깝다. DRAM을 덜 쓰는가, access가 coalesced인가, occupancy는 충분한가, divergence는 없는가, 그리고 이 모든 판단을 Nsight Compute로 확인했는가.
:::

## 1. 체크리스트가 필요한 이유

Mark는 이 강의를 "CUDA performance checklist"로 잡는다. 빠른 kernel을 만들 때 매번 천재적인 아이디어가 필요한 것은 아니다. 반복해서 확인해야 할 기본 질문들이 있다.

첫 질문은 memory다. GPU에는 큰 DRAM/HBM이 있고, 작지만 빠른 SRAM/shared memory가 있다. 빠르게 만들고 싶다면 가능한 한 느린 memory 왕복을 줄이고, 빠른 memory에서 재사용해야 한다.

다만 SRAM이 빠르니 무한히 넣으면 된다는 이야기는 아니다. SRAM은 면적과 열, 용량의 제약이 있다. 그래서 shared memory는 귀한 자원이고, 잘못 쓰면 occupancy를 깎아먹는다.

## 2. coalescing부터 의심하자

global memory access가 coalesced인지 보는 것은 기본 중의 기본이다. 인접한 thread들이 인접한 memory를 읽으면 hardware가 효율적으로 transaction을 묶을 수 있다. 반대로 흩어진 주소를 읽으면 bandwidth를 제대로 쓰기 어렵다.

강의 자료의 `coalesce.cu`는 이 차이를 직접 실험하기 위한 예제다. Nsight Compute에서 memory throughput, L1 cache throughput, replay 관련 지표를 보면 access pattern의 흔적이 보인다.

coalescing은 코드 한 줄의 문제가 아니라 data layout과 thread mapping의 문제다. thread index가 증가할 때 memory address도 자연스럽게 증가하는지 먼저 확인해 보자.

:::figure ladder
label: Figure · kernel을 볼 때의 체크 순서
- stage: correctness와 baseline timing을 고정한다.
- stage: memory access가 coalesced인지 본다.
- stage: occupancy와 block size를 확인한다.
- stage: divergence와 load imbalance를 찾는다.
- stage: shared memory, tiling, coarsening, fusion을 후보로 시험한다.
:::

## 3. occupancy는 heuristic이다

occupancy를 높이면 latency hiding에 도움이 된다. 하지만 강의는 occupancy를 최종 목표로 보지 않는다. Nsight Compute가 theoretical occupancy와 achieved occupancy를 보여 주더라도, kernel 시간이 줄었는지 함께 봐야 한다.

block size를 바꾸면 occupancy가 변한다. CUDA occupancy calculator나 runtime helper가 추천값을 줄 수 있다. 하지만 추천값은 시작점이지 정답지가 아니다.

tile quantization이나 wave quantization처럼, block과 problem size가 딱 맞지 않아 일부 block이 덜 찬 채 실행되는 문제도 있다. 이런 현상은 "thread를 많이 띄웠는데 왜 느리지"라는 질문의 답이 된다.

## 4. shared memory와 tiling

DRAM을 덜 쓰려면 reuse가 필요하다. shared memory tiling은 global memory에서 가져온 값을 block 안에서 여러 번 쓰게 해 준다. matmul, convolution, softmax, normalization 계열에서 자주 나오는 패턴이다.

하지만 shared memory로 옮기는 것 자체에도 비용이 있다. load, store, synchronization이 필요하고 bank conflict 같은 세부 문제도 생긴다. reuse가 충분하지 않으면 오히려 복잡하기만 할 수 있다.

그래서 checklist의 태도는 "shared memory를 쓰자"가 아니라 "global memory 왕복을 줄일 reuse가 있는가"다. reuse가 있다면 shared memory, register tiling, fusion 중 무엇이 맞는지 고른다.

## 5. coarsening, privatization, divergence

thread coarsening은 한 thread가 여러 element를 처리하게 하는 기법이다. launch와 indexing overhead를 줄이고 memory access를 더 잘 묶을 수 있지만, register pressure를 늘릴 수도 있다.

privatization은 여러 thread가 같은 global location을 다투지 않도록 중간 결과를 private/local 공간에 모았다가 나중에 합치는 방식이다. reduction이나 histogram류에서 자주 보인다.

divergence는 warp 안의 thread들이 서로 다른 경로를 타는 문제다. branch 자체보다 "같은 warp 안에서 조건이 갈리는가"가 핵심이다. 체크리스트는 이런 문제를 하나씩 profile로 확인하게 해 준다.

## 6. 좋은 실험의 모양

강의 자료는 `coalesce.cu`, `coarsening.cu`, `divergence.cu`, `occupancy.cu`, `tiling.cu`처럼 한 주제에 하나씩 작은 kernel을 둔다. 이 구성이 좋다. 한 번에 모든 최적화를 넣으면 무엇이 효과였는지 모른다.

각 kernel을 compile하고 `ncu`로 profile한 뒤, 한 가지 가설만 바꿔 다시 측정해 보자. 성능 공부에서 가장 비싼 버릇은 "이게 빠를 것 같아서"를 확인 없이 쌓는 것이다.

:::tip
Nsight Compute가 클라우드에서 안 도는 경우가 있다. 그럴 때는 로컬 GPU나 profiling 가능한 환경을 따로 마련하고, 최소 예제로 먼저 도구가 동작하는지 확인하자.
:::

## Source Links

- [YouTube](https://www.youtube.com/watch?v=SGhfUhlowB4)
- [Slides](https://docs.google.com/presentation/d/1cvVpf3ChFFiY4Kf25S4e4sPY6Y5uRUO-X-A4nJ7IhFE/edit?usp=sharing)
- [Code](https://github.com/gpu-mode/lectures/tree/main/lecture_008)
- [Supplemental code](https://github.com/cuda-mode/lectures/tree/main/lecture8)
- Local notes: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/notes/lecture_008.md`
- Local transcript: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/transcripts/lecture_008.md`
