---
num: 12
title: FlashAttention의 손맛
original: "Lecture 12: Flash Attention"
speaker: Thomas Viehmann
part: 2
part_label: Part II · 병렬 패턴과 Attention
priority: High
status: rich
---

:::crux
FlashAttention은 attention 수식을 바꾸는 마법이 아니다. QK^T, softmax, V 곱을 tile 단위로 다시 배치해 거대한 score matrix를 HBM에 만들지 않고, online softmax 상태를 들고 흐르게 하는 memory 알고리즘이다.
:::

## 1. attention을 memory 문제로 보기

attention은 두 번의 matmul과 softmax로 이루어진다. 평범하게 구현하면 QK^T score matrix를 만들고, softmax를 적용하고, 다시 V와 곱한다. sequence length가 길어지면 score matrix가 커져 memory가 빠르게 부담된다.

FlashAttention의 핵심은 이 중간 matrix를 크게 materialize하지 않는 것이다. tile을 읽고, 필요한 softmax 통계를 갱신하고, output accumulator를 업데이트한다. HBM 왕복을 줄이는 것이 목표다.

Thomas는 이를 matmul tiling의 연장선에서 설명한다. shared memory/SRAM으로 tile을 옮기고, 그 안에서 계산을 많이 한 뒤, 필요한 결과만 밖으로 내보낸다.

## 2. softmax가 문제를 어렵게 만든다

QK^T만 있었다면 tiled matmul로 생각하면 된다. 하지만 softmax는 row 전체의 max와 sum을 필요로 한다. tile 하나만 보고는 전체 softmax를 바로 알 수 없다.

그래서 online softmax가 필요하다. 새 tile을 볼 때마다 현재까지의 max와 normalization sum을 갱신하고, 기존 output accumulator를 새 max 기준으로 rescale한다. 이 trick 덕분에 score row 전체를 한 번에 들고 있지 않아도 된다.

stabilized softmax는 float32에서도 중요하다. 큰 logit을 그대로 exponentiate하면 overflow가 날 수 있다. max를 빼는 안정화는 attention kernel에서 성능만큼이나 correctness의 문제다.

:::figure flow
label: Figure · FlashAttention tile loop
- stage: Q tile과 K/V tile을 HBM에서 shared memory/register로 가져온다.
- stage: QK^T의 현재 tile score를 계산한다.
- stage: online max와 normalization sum을 갱신한다.
- stage: V tile을 곱해 output accumulator를 갱신한다.
- stage: 모든 K/V tile을 본 뒤 normalize된 output을 쓴다.
:::

## 3. block과 head의 mapping

CUDA kernel에서는 grid의 block들이 각자 attention 작업의 일부를 맡는다. 강의에서는 head dimension과 sequence tile을 어떻게 block에 배치할지 이야기한다. 한 block 안의 cooperating thread들이 shared memory를 써야 하므로, block mapping은 매우 중요하다.

head dimension이 크거나 tile size가 커지면 shared memory 사용량이 늘어난다. shared memory가 부족하면 tile을 줄이거나 register와 memory 사용을 다시 조정해야 한다.

이런 선택은 단순히 코드 취향이 아니다. block size, shared memory, register 수는 occupancy와 spill에 직접 영향을 준다. FlashAttention 구현이 어려운 이유는 알고리즘보다 이 resource juggling에 있다.

## 4. register spilling과 profiler

Thomas는 register spilling도 강조한다. thread가 너무 많은 local 상태를 들고 있으면 compiler가 register에 다 넣지 못하고 local memory로 spill할 수 있다. 그러면 빠르려고 만든 kernel이 느린 memory를 다시 두드리게 된다.

Nsight Compute 같은 profiler는 register 사용량, spill, occupancy 관련 신호를 준다. FlashAttention처럼 복잡한 kernel에서는 코드만 보고 성능을 확신하기 어렵다.

강의 자료에는 CUDA Python, inline compilation, Numba 같은 경로도 나온다. 어떤 도구를 쓰든 핵심은 같다. generated kernel이 실제로 shared memory와 register를 어떻게 쓰는지 확인해야 한다.

## 5. compiler fusion과 hand-written kernel

자동 compiler fusion은 elementwise나 memory-bound 연산에서 큰 도움을 준다. 하지만 FlashAttention처럼 softmax 통계와 matmul tiling이 얽힌 알고리즘을 compiler가 일반 PyTorch graph에서 완전히 회복하기는 어렵다.

그래서 Triton tutorial이나 hand-written CUDA 구현이 여전히 의미를 갖는다. 알고리즘 자체가 memory traffic을 줄이도록 재배치되어 있기 때문이다. 단순히 여러 op를 붙이는 fusion과는 층위가 다르다.

FlashAttention은 "attention을 빠르게 하는 kernel"이면서 동시에 GPU programming 교과서다. tiling, shared memory, online reduction, numerical stability, register pressure가 한데 모여 있다.

## 6. 읽고 구현할 때의 순서

먼저 작은 attention을 PyTorch로 구현하고 intermediate score matrix의 shape와 memory size를 계산해 보자. 그 다음 FlashAttention pseudo-code에서 어떤 값만 유지하면 되는지 표시한다.

작은 tile size로 CUDA 또는 Triton version을 만들어 correctness를 맞추고, 마지막에 profiler로 shared memory 사용량과 register spill을 본다. 처음부터 fastest FlashAttention을 목표로 잡으면 마음이 좀 다친다. 작게, 정확하게, 그 다음 빠르게.

:::tip
FlashAttention을 이해할 때 "QK^T를 안 만든다"만 외우지 말자. online max, online sum, output accumulator가 어떤 순서로 갱신되는지 손으로 한 row만 따라가면 훨씬 오래 남는다.
:::

## Source Links

- [YouTube](https://www.youtube.com/watch?v=zEuwuCTEf_0)
- [Code](https://github.com/gpu-mode/lectures/tree/main/lecture_012)
- [CUDA file](https://github.com/gpu-mode/lectures/blob/main/lecture_012/flash_attention.cu)
- [Notebook](https://github.com/gpu-mode/lectures/blob/main/lecture_012/flash_attention.ipynb)
- Local notes: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/notes/lecture_012.md`
- Local transcript: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/transcripts/lecture_012.md`
