---
num: 50
title: CUDA, Triton, FlashAttention 학습 여정
original: "Lecture 50: A learning journey CUDA, Triton, Flash Attention"
speaker: Umar Jamil
part: 4
part_label: Part IV · 프로덕션 커널과 GEMM
priority: High
status: partial
---

:::crux
이 강의는 transcript가 없어 실제 학습 경로와 예제는 확인되지 않았다. 그래도 제목이 좋은 나침반을 준다. **CUDA, Triton, FlashAttention을 따로 외우지 말고, 같은 attention 병목을 점점 낮은 층에서 다시 설명하는 학습 여정으로 보는 것**이다.
:::

## 1. 확인된 것은 제목과 speaker뿐이다

local notes에 따르면 speaker는 Umar Jamil이고, transcript와 slide/code는 없다. 따라서 이 글은 Umar가 실제로 어떤 code를 보여줬는지, 어떤 순서로 배웠는지, 어떤 mistake를 강조했는지 재구성하지 않는다.

대신 "learning journey"라는 제목에 맞춰 독자가 따라갈 수 있는 안전한 학습 지도만 남긴다. 이 강의가 보강되면 실제 episode, code snippet, benchmark 결과로 바꿔야 한다.

## 2. CUDA는 실행 모델을 배우는 층이다

CUDA를 배울 때 처음 붙잡아야 하는 것은 syntax가 아니라 execution model이다. host가 kernel을 launch하고, grid와 block이 thread를 만들고, 각 thread가 자기 index를 계산해 data를 처리한다. 그 위에 register, shared memory, global memory, synchronization, occupancy가 붙는다.

FlashAttention을 이해하려면 이 기본기가 필요하다. attention은 단순히 수식이 아니라 tile을 어떻게 나누고, Q/K/V를 어떤 memory hierarchy에 두고, softmax를 online으로 유지하며, HBM traffic을 줄이는 실행 문제이기 때문이다.

:::figure ladder
label: Figure · attention을 배우는 층
- PyTorch: attention을 tensor operation 조합으로 쓴다
- Triton: output tile과 program ID, mask, block size로 생각한다
- CUDA: thread block, shared memory, synchronization을 직접 본다
- FlashAttention: online softmax와 tiling으로 HBM traffic을 줄인다
- profiler: 어느 층의 선택이 실제 병목을 만들었는지 확인한다
:::

## 3. Triton은 tile 감각을 빠르게 준다

Triton은 CUDA보다 Python에 가까운 표면을 제공하지만, 핵심은 여전히 tile이다. `program_id`가 어떤 output tile을 맡고, `tl.arange`가 tile 안 offset을 만들고, `tl.load`/`tl.store`가 mask와 함께 memory access를 표현한다.

학습 여정에서 Triton은 좋은 중간층이 된다. CUDA의 모든 thread-level detail로 바로 내려가기 전에, "내 program이 어떤 tile을 계산하는가"를 훈련할 수 있다. FlashAttention 같은 algorithm을 볼 때도 tile 단위 사고가 먼저 잡혀야 한다.

## 4. FlashAttention은 algorithm과 kernel의 접점이다

FlashAttention은 attention 수식을 바꾸는 것보다 memory traffic을 바꾸는 algorithm이다. QK 전체 matrix를 HBM에 만들고 softmax한 뒤 PV를 계산하는 대신, tile을 streaming하면서 online softmax를 유지한다. 덕분에 큰 intermediate를 쓰지 않고 HBM read/write를 줄인다.

이 아이디어는 CUDA와 Triton 양쪽에서 구현될 수 있다. 중요한 것은 "수학적으로 같은 attention"과 "hardware가 보는 data movement"를 동시에 보는 것이다. 학습자는 여기서 수식, tile, memory, profiler가 한 줄로 이어지는 경험을 한다.

## 5. 좋은 학습 순서

먼저 PyTorch attention을 쓰고 profiler로 병목을 본다. 다음으로 naive Triton matmul이나 softmax를 구현해 tile과 mask를 익힌다. 그 다음 CUDA shared memory tiled matmul을 보며 thread block과 synchronization을 익힌다. 마지막으로 FlashAttention의 online softmax와 fused kernel을 읽는다.

이 순서는 빠른 성능을 보장하는 순서가 아니라 덜 길을 잃는 순서다. CUDA를 먼저 완전히 끝내려 하면 너무 넓고, FlashAttention 논문만 읽으면 kernel의 몸이 안 보인다. 중간에 작은 benchmark를 계속 두는 것이 좋다.

## 6. 손으로 해볼 것

`softmax(QK^T)V`를 작은 행렬로 직접 계산한 뒤, Q block 하나와 K/V block 여러 개를 순서대로 보며 online softmax의 running max와 running sum이 어떻게 갱신되는지 써 보자. 이 손계산은 FlashAttention의 심장이다.

원본 강의를 볼 때는 Umar가 어떤 "막혔던 지점"을 이야기하는지 기록하자. learning journey 강의의 가치는 완성된 지식보다, 어디서 헷갈리고 어떻게 넘어갔는지에 있다.

## Source Links

- [YouTube](https://www.youtube.com/watch?v=4jQTb6sRGLg)
- Local notes: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/notes/lecture_050.md`
- Local transcript stub: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/transcripts/lecture_050.md`
