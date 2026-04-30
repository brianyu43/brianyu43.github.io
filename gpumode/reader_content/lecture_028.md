---
num: 28
title: Liger Kernel, 빠른 Triton보다 믿을 수 있는 Triton
original: "Lecture 28: Liger Kernel - Efficient Triton Kernels for LLM Training"
speaker: Byron Hsu
part: 3
part_label: Part III · 커널 프레임워크와 이식성
priority: High
status: rich
---

:::crux
Liger Kernel의 핵심은 “Triton kernel을 빠르게 쓰는 법”보다 조금 더 엄격하다. LLM training에서 memory spike와 launch overhead를 줄이되, bf16, contiguity, gradient, convergence까지 production 기준으로 검증해야 한다. Custom kernel은 빨라 보이는 순간보다, 학습 loss가 끝까지 같은 길로 가는 순간에 비로소 쓸 수 있다.
:::

## 1. 병목은 GPU utilization 숫자 뒤에 숨어 있다

Byron Hsu는 LLM training의 두 병목에서 출발한다. 하나는 memory다. 큰 model에서는 weight, gradient, optimizer state만으로도 GPU memory를 크게 먹고, activation은 FSDP나 ZeRO로도 자동으로 사라지지 않는다. 그래서 forward 중 activation이 쌓이고 backward 중 gradient가 쌓이는 profile을 보면, 어디서 memory spike가 나는지 직접 보인다.

다른 하나는 time이다. GPU utilization이 100%라고 해서 유용한 FLOPs가 충분히 나오는 것은 아니다. GPU가 “바쁘다”와 “잘 일한다”는 다르다. PyTorch profiler timeline을 보면 elementwise op가 줄줄이 launch되고, small kernel들이 많아 launch overhead와 memory traffic이 커지는 경우가 있다. Liger Kernel은 이 작은 낭비들을 LLM training operator 단위에서 줄인다.

## 2. 왜 Triton인가

CUDA로 production kernel을 쓰면 control은 많지만 개발 비용도 크다. Triton은 Python 안에서 kernel을 쓰고 PTX까지 내려가는 길을 제공한다. Byron은 Triton이 PyTorch만큼 쉽지는 않다고 선을 긋는다. 여전히 stride, physical layout, block size, numerical precision을 이해해야 한다. 그래도 CUDA보다 빠르게 kernel idea를 구현하고 팀 안에서 리뷰하기 쉽다.

Liger Kernel이 겨냥하는 지점은 바로 이 중간층이다. 연구용 prototype kernel이 아니라, training loop에 넣어도 되는 RMSNorm, fused linear cross entropy 같은 operator를 Triton으로 제공한다. 즉 “한 번 빠른 kernel을 짠다”보다 “kernel을 test하고, benchmark하고, convergence까지 확인하는 습관을 library에 넣는다”가 더 중요하다.

:::figure ladder
label: Figure · Liger Kernel 검증 사다리
- correctness: PyTorch reference와 forward/backward 값을 비교한다
- performance: Triton benchmark와 profiler로 시간 차이를 본다
- memory: peak memory와 activation spike가 줄었는지 확인한다
- convergence: 실제 training loss curve가 reference와 같이 가는지 본다
- layout: transpose, stride, contiguity가 kernel 가정과 맞는지 확인한다
:::

## 3. RMSNorm은 작은 예제지만 좋은 예제다

RMSNorm은 LLM에서 자주 등장하고, reduction과 elementwise scaling이 함께 있는 좋은 입문 kernel이다. 단순히 `x / rms(x)`를 계산한다고 끝이 아니다. 어느 dtype으로 accumulate할지, bf16 input에서 어디까지 fp32로 올릴지, backward가 reference와 맞는지 확인해야 한다.

Triton benchmark decorator를 이용하면 여러 size에서 kernel 시간을 비교하기 쉽다. 그러나 benchmark만으로는 충분하지 않다. PyTorch profiler에서 실제 training graph 안의 op들이 어떻게 줄었는지 봐야 한다. Byron이 강조하는 관점은 “성능 표 하나”가 아니라 “profile timeline에서 operation이 정말 줄었는가”다.

## 4. fused linear cross entropy의 memory 절약

Liger Kernel의 대표 예시는 fused linear cross entropy다. 일반적인 LM head에서는 hidden state에 linear layer를 적용해 거대한 logits를 만들고, 그 logits를 cross entropy에 넘긴다. Vocabulary가 크면 logits tensor 자체가 큰 memory spike가 된다. Training에서는 이 spike가 batch size와 sequence length 선택을 막는다.

Fusion의 아이디어는 linear와 cross entropy 사이의 큰 intermediate를 global memory에 오래 남기지 않는 것이다. 필요한 조각을 계산하고 loss/reduction에 바로 써서 memory를 줄인다. 이때 numerical detail은 더 까다로워진다. softmax normalization, target index, backward gradient가 reference와 맞아야 하고, memory를 줄인 대신 loss가 조금씩 어긋나면 production에서는 실패다.

## 5. contiguity는 사소하지 않다

강의에서 특히 실전적인 부분은 contiguity다. PyTorch tensor는 logical shape과 physical storage가 다를 수 있다. `transpose`를 했다고 data가 실제 memory에서 재배치되는 것은 아니며, stride만 바뀔 수 있다. Triton kernel은 physical view로 load/store를 하기 때문에 이 차이를 놓치면 값은 그럴듯하게 틀린다. 제일 얄미운 종류의 bug다.

그래서 custom kernel을 넣을 때는 input contract를 분명히 해야 한다. contiguous만 받는지, arbitrary stride를 받을지, 내부에서 `.contiguous()`를 부를지 결정해야 한다. `.contiguous()`는 correctness를 쉽게 만들지만, 큰 copy 때문에 성능 이득을 지워버릴 수 있다. 빠른 kernel이 느린 copy를 몰래 데리고 오면 꽤 서운하다.

## 6. 손으로 해볼 것

RMSNorm을 작은 Triton kernel로 구현하고 PyTorch reference와 forward/backward를 비교해보자. dtype을 bf16, fp32로 바꾸며 tolerance를 기록하면 precision 문제가 눈에 들어온다.

그 다음 profiler를 켜고 작은 training step에서 fused operator가 launch 수와 peak memory를 어떻게 바꾸는지 본다. 마지막으로 일부러 non-contiguous input을 넣어 kernel이 실패하는지, 조용히 틀리는지, 명확히 error를 내는지 확인해보자. Production kernel의 절반은 빠른 코드고, 나머지 절반은 이런 불편한 질문들이다.

## Source Links

- [YouTube](https://www.youtube.com/watch?v=gWble4FreV4)
- [Slides](https://docs.google.com/presentation/d/1CGTV-uKw9crrBo13q1jAzAFCFzlpZFjeL4bnK67pTd8/edit?usp=sharing)
- [Lecture 28 README links](https://github.com/cuda-mode/lectures/blob/main/README.md#lecture-28-liger-kernel)
- [Colab 1](https://colab.research.google.com/drive/1CQYhul7MVG5F0gmqTBbx1O1HgolPgF0M?usp=sharing)
- [Colab 2](https://colab.research.google.com/drive/1Z2QtvaIiLm5MWOs7X6ZPS1MN3hcIJFbj?usp=sharing)
- Local notes: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/notes/lecture_028.md`
- Local transcript: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/transcripts/lecture_028.md`
