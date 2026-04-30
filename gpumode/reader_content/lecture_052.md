---
num: 52
title: Low Precision scaling laws, 숫자와 dtype의 균형
original: "Lecture 52: Scaling Laws for Low Precision"
speaker: Tanishq Kumar
part: 4
part_label: Part IV · 프로덕션 커널과 GEMM
priority: Medium
status: partial
---

:::crux
transcript와 slides가 없어 이 강의의 scaling law나 실험 결과는 확인되지 않았다. 따라서 구체 식이나 conclusion은 만들지 않는다. 지금 붙잡을 수 있는 핵심 질문은 **precision을 낮추면 compute와 memory는 좋아지지만 accuracy, stability, scaling behavior는 어떻게 변하는가**다.
:::

## 1. 자료 한계

local notes에는 speaker Tanishq Kumar, YouTube link, transcript failure만 있다. slides, code, paper link는 없다. 제목은 low precision의 scaling laws를 말하지만, 어떤 model size, dataset, precision format, metric을 다뤘는지는 확인되지 않았다.

그러므로 이 원고는 강의 내용의 요약이 아니다. 원본을 다시 볼 때 어떤 축을 기록해야 하는지 알려주는 source-limited 원고다. scaling law는 숫자와 조건이 생명이라, 근거 없는 매끈한 설명을 넣으면 오히려 해롭다.

## 2. low precision은 단순한 압축이 아니다

precision을 낮추면 memory footprint와 bandwidth가 줄고, hardware가 지원하면 throughput도 올라간다. FP16, BF16, FP8, INT8, INT4 같은 format은 training과 inference에서 각각 다른 tradeoff를 가진다. 하지만 낮은 bit가 항상 이득은 아니다. scaling factor, outlier, accumulation dtype, optimizer state, activation distribution이 함께 움직인다.

특히 training에서는 stability가 중요하다. inference quantization에서는 calibration과 quality drop을 본다면, training low precision에서는 gradient, update, loss scaling, convergence가 들어온다. 제목의 scaling laws가 어느 쪽을 말하는지는 확인 필요다.

:::figure grid
label: Figure · low precision을 볼 때의 네 축
- format: FP8, INT8, INT4처럼 표현 방식과 dynamic range가 다르다
- placement: weight, activation, KV cache, gradient, optimizer state 중 어디를 낮추는가
- hardware: Tensor Core path, accumulation dtype, conversion cost가 다르다
- metric: perplexity, accuracy, throughput, memory, cost 중 무엇을 최적화하는가
:::

## 3. scaling law라면 반드시 조건표가 필요하다

scaling law는 "모델이 커지면 어떻게 된다"는 이야기처럼 들리지만, 실제로는 실험 조건의 묶음이다. parameter count, token count, dataset, architecture, optimizer, learning rate schedule, precision policy, loss metric을 함께 봐야 한다.

low precision scaling law라면 여기에 quantization granularity, scale format, clipping, stochastic rounding, accumulation precision, hardware target도 붙는다. 어느 하나가 빠지면 같은 결론을 재현하기 어렵다.

## 4. kernel reader에게 중요한 연결점

GPU Mode 독자에게 low precision은 model quality만의 주제가 아니다. dtype이 바뀌면 kernel도 바뀐다. int8 Tensor Core matmul, FP8 GEMM, low-bit dequant fusion, KV cache quantization, bandwidth-bound attention 같은 문제가 바로 연결된다.

하지만 kernel throughput만 보고 precision policy를 정할 수는 없다. 더 빠른 dtype이 quality를 크게 떨어뜨리면 end-to-end cost가 오히려 나빠질 수 있다. 반대로 아주 작은 quality drop으로 memory capacity가 열리면 serving economics가 크게 좋아질 수 있다. scaling law는 이 균형을 정량화하려는 시도다.

## 5. 손으로 해볼 것

작은 LLM inference scenario를 하나 만들고, FP16 weight와 INT8 weight-only quantization의 memory footprint를 비교해 보자. weight memory, KV cache memory, activation memory를 나눠 적으면 "precision을 낮췄는데도 어디가 여전히 큰가"가 보인다.

원본 강의를 볼 때는 모든 graph에 대해 x축, y축, model family, precision format, baseline, metric을 적자. 특히 "law"라고 부르는 식이 있다면 fit range와 residual을 확인해야 한다. 예쁜 직선은 늘 의심하고, 그 의심은 꽤 건강하다.

## Source Links

- [YouTube](https://www.youtube.com/watch?v=YCfzf0TunOM)
- Local notes: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/notes/lecture_052.md`
- Local transcript stub: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/transcripts/lecture_052.md`
