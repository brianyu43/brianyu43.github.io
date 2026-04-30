---
num: 58
title: Disaggregated LLM Inference, prefill과 decode를 떼어 보기
original: "Lecture 58: Disaggregated LLM Inference"
speaker: Junda Chen
part: 5
part_label: Part V · 추론·학습·통신 스케일
priority: High
status: partial
---

:::crux
Junda Chen의 실제 system, benchmark 수치, 구현 세부는 이 archive만으로는 확인되지 않는다. 다만 제목의 `Disaggregated LLM Inference`는 **LLM serving을 한 덩어리 GPU loop로 보지 않고, 서로 다른 성격의 일을 나눠 배치하는 관점**을 요구한다. 아래 설명은 그 관점을 읽기 위한 준비 운동이다.
:::

## 1. disaggregated라는 말의 범위를 먼저 묻자

`Disaggregated LLM Inference`는 꽤 넓은 제목이다. prefill과 decode 분리일 수도 있고, compute와 memory 자원 분리일 수도 있으며, serving cluster에서 역할별 worker를 나누는 이야기일 수도 있다. local notes에는 세부 자료가 없으므로 어느 쪽이라고 단정하지 않는다.

다만 LLM inference에서 disaggregation이 자주 등장하는 이유는 있다. prompt를 처리하는 prefill은 큰 matrix 연산에 가깝고, token을 하나씩 생성하는 decode는 KV cache를 계속 읽는 latency-sensitive 작업에 가깝다. 두 단계는 같은 model을 쓰지만 병목과 좋은 batch 모양이 다르다. 강의가 이 구도를 어떻게 썼는지는 원본에서 다시 확인해야 한다.

## 2. prefill과 decode는 다른 생물이다

prefill은 입력 prompt 전체를 한 번에 처리한다. sequence length가 길면 attention과 GEMM 작업량이 크고, GPU를 꽤 잘 채울 수 있다. throughput-oriented batching이 잘 맞는 경우가 많다.

decode는 매 step 새 token 하나를 만들며 반복된다. batch가 커져도 per-token latency와 KV cache memory traffic이 중요해진다. request마다 남은 길이가 다르고, early stopping도 있다. 그래서 scheduling과 cache placement가 성능을 크게 흔든다.

:::figure flow
label: Figure · disaggregated inference를 보는 한 가지 그림
- request: prompt와 generation 조건이 들어온다
- prefill worker: prompt 전체를 처리하고 KV cache를 만든다
- transfer: KV cache 또는 필요한 state를 다음 단계로 넘긴다
- decode worker: token-by-token 생성과 batching을 관리한다
- response: latency SLO와 throughput 목표를 함께 맞춘다
:::

## 3. 분리하면 새 비용도 생긴다

disaggregation은 공짜가 아니다. prefill과 decode를 다른 worker나 device로 나누면 KV cache 이동, queueing, admission control, fault handling, backpressure 같은 비용이 생긴다. 특히 KV cache는 작지 않다. 잘못 옮기면 계산을 줄이려다 network와 memory traffic을 키울 수 있다.

또 분리된 system은 debugging이 어려워진다. 하나의 request가 여러 worker를 지나가므로 trace와 metric이 필요하다. p95 latency가 나빠졌을 때 prefill queue인지, cache transfer인지, decode batcher인지 찾을 수 있어야 한다.

## 4. benchmark는 workload mix가 생명이다

LLM serving benchmark는 prompt length, output length, arrival rate, batching policy, model size, quantization, GPU type이 함께 있어야 읽힌다. disaggregated inference에서는 여기에 worker ratio와 network topology까지 붙는다.

원본 강의를 볼 때는 어떤 traffic assumption을 썼는지 먼저 적자. 짧은 prompt가 많은 chat workload와 긴 문서 summarization workload는 전혀 다른 system을 요구할 수 있다. 같은 architecture가 한쪽에서는 멋지고 다른 쪽에서는 과할 수 있다.

## 5. 손으로 해볼 것

가상의 serving workload를 하나 만든다. prompt length 평균, output length 평균, request arrival rate를 정하고, prefill time과 decode token time을 아주 단순한 식으로 둔다. 그 다음 prefill worker와 decode worker 수를 바꾸며 어디에 queue가 쌓이는지 계산해 보자.

숫자는 거칠어도 괜찮다. 이 작은 queueing model은 disaggregation이 왜 system design 문제인지 보여 준다. kernel 하나가 빨라도 queue가 막히면 사용자는 느리다고 느낀다.

## Source Links

- [YouTube](https://www.youtube.com/watch?v=tIPDwUepXcA)
- Local notes: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/notes/lecture_058.md`
- Local transcript stub: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/transcripts/lecture_058.md`
