---
num: 18
title: Kernel fusion은 왕복을 줄이는 기술이다
original: "Lecture 18: Fusing Kernels"
speaker: Kapil Sharma
part: 2
part_label: Part II · 병렬 패턴과 Attention
priority: High
status: rich
---

:::crux
Kernel fusion의 첫 번째 이익은 멋진 arithmetic trick이 아니다. 같은 tensor를 HBM에 쓰고 다시 읽는 왕복, 그리고 작은 kernel launch를 줄이는 것이다. 하지만 모든 것을 하나의 mega-kernel로 묶으면 유지보수와 tuning이 무너질 수 있다. 좋은 fusion은 **memory traffic, launch overhead, code complexity 사이의 타협**이다.
:::

## 1. fusion이 필요한 순간

Kapil Sharma의 강의는 추천 모델과 DLRM류 workload에서 시작한다. embedding lookup, dense MLP, feature interaction, activation이 섞인 모델은 작은 연산이 많고 memory bandwidth에 민감하다. 이런 모델에서 `add`, `mul`, `relu`, `sigmoid` 같은 pointwise op를 따로 kernel로 실행하면 HBM을 여러 번 왕복한다.

예를 들어 tensor에 1을 더하는 kernel을 세 번 띄우는 대신 한 kernel에서 3을 더하면 launch도 한 번이고 memory도 덜 건드린다. 아주 단순한 예지만 fusion의 핵심이 잘 보인다. 계산이 복잡해서 빠른 것이 아니라, 불필요한 중간 저장을 없애서 빠르다.

## 2. torch.compile과 CUDA graph의 위치

강의에서는 `torch.compile`이 생성한 Triton pointwise kernel과 CUDA graph 이야기도 나온다. `torch.compile`은 graph를 보고 여러 pointwise op를 하나로 묶을 수 있다. CUDA graph는 반복되는 launch sequence를 capture해서 launch overhead를 줄이는 쪽에 가깝다. 둘은 같은 문제가 아니다.

Fusion은 kernel 수와 memory traffic을 줄인다. CUDA graph는 launch 경로의 CPU overhead를 줄인다. 둘 다 trace에서 “작은 kernel이 우르르 나오는” 상황을 덜 아프게 만들지만, 해결하는 층위가 다르다. 그래서 profiler에서 먼저 봐야 한다. 나는 launch overhead에 묶였는가, HBM traffic에 묶였는가?

:::figure flow
label: Figure · pointwise fusion의 기본 효과
- before: read x, add, write tmp1
- before again: read tmp1, mul, write tmp2
- before last: read tmp2, activation, write y
- fused: read x once, add/mul/activation in registers, write y once
:::

## 3. generated Triton을 읽는 즐거움과 위험

Kapil은 compiler가 만든 Triton kernel을 열어본다. `Triton POI`처럼 pointwise operation을 나타내는 kernel이 보이고, 그 안에 add/mul/activation이 합쳐져 있다. generated code는 사람이 처음부터 쓴 코드보다 지저분할 수 있지만, compiler가 어떤 연산을 묶었는지 확인하기에는 좋다.

여기서 중요한 태도는 “compiler가 해줬으니 끝”이 아니다. compiler가 fusion하지 못하는 graph break가 있을 수 있고, dynamic shape 때문에 CUDA graph capture가 어려울 수 있으며, padding은 overhead를 만든다. 자동화는 출발점이지 면죄부가 아니다.

## 4. 손으로 쓰는 fusion: CUDA와 Triton

강의 자료에는 `pointwise_add_relu_fused.cu`, Triton fused add/mul/relu 예제, LoRA on MLP fused kernel 같은 코드가 연결되어 있다. 손으로 fused kernel을 쓰면 compiler가 놓친 패턴을 직접 최적화할 수 있다. 특히 LoRA처럼 base matmul 주변에 작은 rank update와 activation이 붙는 경우, 중간 tensor를 줄이는 효과가 크다.

하지만 손으로 쓰는 순간 책임도 온다. dtype, broadcasting, stride, alignment, boundary mask, backward pass까지 직접 생각해야 한다. inference-only path라면 부담이 덜하지만, training kernel이면 gradient까지 확인해야 한다. fusion이 성능만큼 correctness를 요구한다는 사실을 잊으면 안 된다.

## 5. mega-kernel의 유혹

Q&A에서 “그럼 matmul과 activation까지 다 하나로 묶으면 되나?”라는 질문이 자연스럽게 나온다. 답은 조심스럽다. 이론적으로는 가능하지만, 한 kernel이 너무 많은 일을 하면 occupancy, register pressure, shared memory 사용량, tuning space가 커진다. 하나 바꾸면 전체를 다시 튜닝해야 한다.

Persistent kernel 같은 더 큰 아이디어도 있지만, 아무 모델에나 붙이는 만능 도구는 아니다. 보통은 pointwise chain, epilogue, memory-bound 작은 연산부터 묶는 것이 안전하다. matmul 자체는 이미 cuBLAS, CUTLASS, Triton matmul이 매우 세게 최적화되어 있으니, 그 주변의 불필요한 왕복을 먼저 본다.

## 6. 손으로 해볼 것

PyTorch에서 `y = sigmoid((x + a) * b)`를 세 줄로 작성하고 profiler로 kernel 수를 본다. 그 다음 `torch.compile`을 켜고 kernel 수가 줄어드는지 확인한다. 마지막으로 같은 연산을 작은 Triton kernel로 직접 써서 memory read/write 횟수를 생각해본다.

응용으로는 작은 LoRA layer를 잡아보자. base output, low-rank update, bias, activation을 어디까지 합칠 수 있는지 종이에 먼저 그린다. fusion 후보를 고르는 기준은 단순하다. 중간 tensor가 크고, 연산은 가벼우며, shape가 안정적인 곳부터다.

## Source Links

- [YouTube](https://www.youtube.com/watch?v=m6BSREnQ84U)
- [Lecture 018 repo folder](https://github.com/gpu-mode/lectures/tree/main/lecture_018)
- [FusedKernels.ipynb](https://github.com/gpu-mode/lectures/blob/main/lecture_018/FusedKernels.ipynb)
- [Triton fused add/mul/activation](https://github.com/gpu-mode/lectures/blob/main/lecture_018/kernels/triton_fused_add_mul_activation.py)
- [Pointwise add ReLU CUDA](https://github.com/gpu-mode/lectures/blob/main/lecture_018/kernels/src/pointwise_add_relu_fused.cu)
- Local notes: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/notes/lecture_018.md`
- Local transcript: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/transcripts/lecture_018.md`
