---
num: 76
title: BackendBench, 빠른 kernel보다 맞는 kernel
original: "Lecture 76: BackendBench fixing the LLM kernel correctness problem"
speaker: Mark Saroufim
part: 6
part_label: Part VI · DSL·정확성·새 커널 모델
priority: High
status: partial
---

:::crux
이 강의는 transcript, slides, code가 모두 빠져 있어 source-limited 원고다. 제목만으로 확인되는 핵심 질문은 **LLM kernel backend가 점점 많아질 때, 성능 비교 전에 correctness를 어떻게 체계적으로 확인할 것인가**다. BackendBench의 구체 범위와 test suite는 원본 확인이 필요하다.
:::

## 1. 지금 확인된 자료

local notes에는 speaker가 Mark Saroufim으로 기록되어 있고 YouTube link만 있다. transcript fetch는 실패했다. slides, code, paper, repo folder는 확인되지 않았다.

따라서 BackendBench가 실제 project인지, benchmark suite인지, PyTorch backend 비교인지, Triton/CUDA kernel correctness harness인지는 아직 단정할 수 없다. 이 글은 title이 가리키는 correctness problem을 중심으로 읽기 지도를 만든다.

## 2. LLM kernel correctness는 생각보다 미끄럽다

kernel이 빠르다고 바로 쓸 수는 없다. attention, RMSNorm, rotary embedding, quantized matmul, fused optimizer처럼 LLM kernel은 dtype, shape, mask, stride, broadcasting, numerical tolerance가 얽힌다. 조금 틀린 kernel은 unit test 몇 개를 통과하고도 production에서 조용히 model quality를 망칠 수 있다.

특히 low precision과 fusion이 들어가면 "정답"도 단순하지 않다. FP32 reference와 bitwise match를 요구할 수 없는 경우가 많고, tolerance를 너무 넓게 잡으면 버그를 놓친다. correctness benchmark는 이 균형을 정해야 한다.

:::figure ladder
label: Figure · kernel correctness를 올리는 순서
- reference: 느리지만 명확한 PyTorch 또는 high precision implementation을 둔다
- shape sweep: batch, sequence, head dim, stride, alignment를 넓게 바꾼다
- dtype sweep: FP32, BF16, FP16, FP8/INT 계열 정책을 분리한다
- tolerance: operation별로 합리적인 error 기준을 둔다
- stress: mask, edge shape, non-contiguous tensor, extreme values를 넣는다
:::

## 3. backend가 많아질수록 test가 언어가 된다

CUDA, Triton, vendor library, custom DSL, compiler backend가 같은 operation을 구현할 수 있다. 이때 benchmark가 latency table만 있으면 서로 대화하기 어렵다. 같은 input domain에서 같은 semantics를 만족하는지 먼저 맞춰야 한다.

BackendBench라는 이름이 의미 있으려면, backend 간 비교 가능한 contract를 제공해야 한다. input shape, dtype, layout, tolerance, determinism, supported hardware를 명시해야 한다. 그래야 새 backend가 들어와도 "빠르다" 전에 "같은 일을 한다"를 말할 수 있다.

## 4. 성능과 correctness를 같이 읽기

correctness test는 성능과 분리되지 않는다. 어떤 backend는 특정 shape에서만 빠르고, 특정 dtype에서만 정확할 수 있다. 또 deterministic mode를 켜면 느려질 수도 있다. production 선택은 항상 correctness envelope와 performance envelope를 함께 본다.

LLM serving에서는 rare shape도 중요하다. batch size 1 decode path, 긴 sequence, padding이 많은 request, speculative decoding의 odd shape가 kernel을 다른 경로로 보낼 수 있다. test suite가 예쁜 square matmul만 보면 실제 문제를 놓친다.

## 5. 혼자 해볼 것

Triton으로 작은 RMSNorm이나 matmul wrapper를 만들고 PyTorch reference와 비교하는 test를 짜 보자. contiguous tensor만 넣지 말고 stride가 다른 view, 작은 shape, 큰 shape, 극단값을 넣어 본다. performance benchmark보다 먼저 correctness grid를 만드는 습관을 들이면 kernel 개발이 훨씬 덜 불안해진다.

원본 강의를 볼 때는 BackendBench가 어떤 operation과 backend를 포함하는지, tolerance를 어떻게 정하는지, failure를 어떻게 report하는지 확인하자. 좋은 correctness tool은 실패했을 때 사람이 다음 행동을 알 수 있게 해 준다.

## Source Links

- [YouTube](https://www.youtube.com/watch?v=BTfjdyZOKww)
- Local notes: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/notes/lecture_076.md`
- Local transcript stub: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/transcripts/lecture_076.md`
