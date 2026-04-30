---
num: 100
title: "InferenceX, 계속 재는 inference benchmark"
original: "Lecture 100: InferenceX Continuous OSS Inference Benchmarking"
speaker: "Kimbo Chen, Cam Quilici, Bryan Shan"
part: 7
part_label: Part VII · 시스템 실전과 최신 주제
priority: High
status: partial
---

:::crux
이 노트는 transcript, slides, code가 없는 자료가 제한된 노트다. local notes에서 분명히 보이는 주제는 continuous OSS inference benchmarking이다. 핵심 질문은 **open-source inference stack이 매일 바뀔 때, benchmark를 일회성 표가 아니라 지속적으로 믿을 수 있는 신호로 만들려면 무엇이 필요한가**다.
:::

## 1. 100번째 강의의 자료 상태

local notes에는 speakers가 Kimbo Chen, Cam Quilici, Bryan Shan으로 기록되어 있고 YouTube link만 있다. transcript fetch는 실패했고 slides/code/paper/repo folder는 없다. InferenceX의 실제 dashboard, harness, supported model/server 목록은 원본 확인이 필요하다.

그래도 continuous benchmarking이라는 단어는 충분히 구체적이다. 이것은 "한 번 재서 블로그에 올리기"가 아니라, code와 dependency가 바뀔 때마다 inference 성능을 추적하는 문제다.

## 2. inference benchmark는 쉽게 썩는다

inference stack은 빠르게 변한다. model runtime, CUDA driver, PyTorch, vLLM, TensorRT-LLM, tokenizer, kernel, quantization path, scheduler가 모두 움직인다. 어제의 benchmark가 오늘의 package 조합에서는 다른 의미가 될 수 있다.

그래서 benchmark는 result table보다 environment record가 먼저다. GPU type, driver, CUDA, library version, model revision, prompt/output distribution, concurrency, warmup, cache policy를 남겨야 한다. 숫자는 혼자 서 있지 못한다.

:::figure flow
label: Figure · continuous inference benchmark loop
- pin: model, runtime, hardware, dependency version을 기록한다
- run: 정해진 workload를 warmup과 함께 실행한다
- collect: latency, throughput, memory, error를 저장한다
- compare: 이전 run과 regression 또는 improvement를 비교한다
- explain: 변화가 code, config, dependency 중 어디서 왔는지 추적한다
:::

## 3. 무엇을 재는지가 곧 철학이다

LLM inference는 latency와 throughput이 서로 당긴다. batch를 키우면 throughput은 좋아질 수 있지만 per-request latency는 나빠진다. streaming decode에서는 first token latency와 inter-token latency도 따로 봐야 한다.

continuous benchmark라면 workload suite가 중요하다. batch size 1, 높은 concurrency, 긴 prompt, 긴 output, short chat, quantized model, multi-GPU serving을 나누어야 한다. 평균 하나로는 운영자가 결정을 내리기 어렵다.

## 4. OSS benchmark의 어려움

open-source stack은 장점도 크고 변동성도 크다. 최신 commit이 빠르지만 불안정할 수 있고, 특정 GPU에서만 좋은 path가 켜질 수 있다. benchmark harness는 failure를 성능 숫자처럼 정직하게 기록해야 한다.

또한 비교 대상의 tuning effort를 맞추어야 한다. 한 runtime은 default config, 다른 runtime은 hand-tuned config로 비교하면 표는 예쁘지만 공정하지 않다. continuous system은 config drift를 막는 장치가 필요하다.

## 5. 원본에서 확인할 질문

InferenceX가 어떤 runtime과 model을 포함하는지 확인하자. 그리고 benchmark가 synthetic prompt인지 real trace인지, output length를 어떻게 통제하는지, correctness나 response quality를 같이 보는지 살펴보자.

regression detection 방식도 중요하다. 단순 threshold인지, 통계적 noise를 고려하는지, hardware noise와 software regression을 어떻게 구분하는지 봐야 한다. benchmark는 알람이 너무 많아도, 너무 조용해도 쓸모가 줄어든다.

## 6. 혼자 해볼 것

작은 inference script를 하나 정하고 매일 같은 config로 latency와 tokens/sec를 JSON으로 저장해 보자. package version과 GPU 이름도 같이 남긴다. 며칠만 지나도 benchmark가 data engineering 문제라는 사실이 보인다.

그다음 의도적으로 batch size나 output length를 바꿔 regression처럼 보이게 만들어 보자. benchmark harness가 config 변화와 성능 변화를 구분해 주는지 확인하면 좋은 continuous benchmark의 조건이 드러난다.

## Source Links

- [YouTube](https://www.youtube.com/watch?v=kPBTBl7xvEY)
- Local notes: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/notes/lecture_100.md`
- Local transcript stub: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/transcripts/lecture_100.md`
