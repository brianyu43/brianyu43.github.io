---
num: 35
title: SGLang, GPU를 기다리게 하지 않는 serving
original: "Lecture 35: SGLang"
speaker: Yineng Zhang
part: 3
part_label: Part III · 커널 프레임워크와 이식성
priority: High
status: rich
---

:::crux
SGLang performance optimization의 핵심은 LLM serving을 kernel 하나가 아니라 scheduling system으로 보는 것이다. Continuous batching에서는 CPU scheduler가 request를 받고, prefix cache를 맞추고, memory를 할당하고, batch를 구성한다. 이 CPU work가 GPU를 기다리게 하면 attention kernel이 아무리 빨라도 throughput은 샌다. 목표는 CPU scheduling과 GPU execution을 overlap하는 것이다.
:::

## 1. SGLang은 front end와 backend를 함께 본다

SGLang은 programming interface와 inference backend를 함께 제공하는 LLM serving system이다. Yineng Zhang은 SGLang이 가볍고 customizable한 open-source inference engine으로 쓰인다고 소개한다. 강의의 초점은 세 가지다. CPU overhead hiding, FlashInfer integration, 그리고 TurboMind GEMM optimization 계획이다.

Serving system에서는 모델 kernel만 빠르면 끝나지 않는다. Request가 계속 들어오고, 각 request는 prompt 길이와 generation 상태가 다르다. Scheduler는 continuous batching으로 이들을 섞어 GPU에 보낸다. 이 과정의 CPU logic이 blocking이면 GPU는 빈칸을 만든다.

## 2. CPU overhead는 idle GPU로 나타난다

강의는 다른 engine들의 CPU overhead 분석을 인용하며, 일부 경우 CPU scheduling 때문에 큰 시간이 낭비될 수 있다고 말한다. Scheduler는 input message를 받고, 이전 step 결과를 처리하고, stop condition을 확인하고, prefix matching과 request reorder를 수행하고, 다음 batch를 위한 memory를 할당한다. 이 일은 대부분 CPU work다.

Blocking scheduler에서는 CPU가 다음 batch를 준비하는 동안 GPU가 기다린다. 이상적인 구조는 GPU model worker가 현재 batch를 실행하는 동안 CPU scheduler가 다음 batch를 준비하는 것이다. 이렇게 pipeline을 만들면 CPU scheduling overhead를 숨길 수 있다. Serving에서 overlap은 optional optimization이 아니라 생존 기술에 가깝다.

:::figure flow
label: Figure · SGLang이 숨기려는 serving 시간축
- receive: 새 request와 이전 step 결과를 CPU가 받는다
- schedule: prefix cache, stop condition, request reorder를 처리한다
- allocate: 다음 batch의 KV/cache memory를 준비한다
- run GPU: model worker가 current batch를 실행한다
- overlap: GPU가 도는 동안 CPU는 next batch를 만든다
:::

## 3. Prefix cache는 scheduling 문제다

SGLang은 prefix caching을 early feature로 강조한다. LLM serving에서는 여러 request가 같은 system prompt나 shared prefix를 가질 수 있다. 이 prefix의 KV cache를 재사용하면 prefill work를 줄일 수 있다. 하지만 cache를 잘 쓰려면 request matching, eviction, memory allocation, batch construction이 함께 움직여야 한다.

강의에서는 radix tree 같은 prefix matching과 request reorder 이야기가 나온다. Cache hit을 많이 얻으려면 비슷한 prefix를 가진 request를 잘 묶어야 하지만, latency와 fairness도 고려해야 한다. Serving scheduler는 언제나 “GPU 효율”과 “사용자 지연” 사이에서 줄타기를 한다.

## 4. FlashInfer와 kernel integration

FlashInfer는 LLM inference를 위한 high-performance GPU kernel library로 소개된다. Attention, sampling, normalization, activation kernel 같은 serving hot path를 제공한다. SGLang은 FlashInfer team과 가까이 협업하며 새로운 optimization을 integration하고 benchmark한다고 설명한다.

여기서 중요한 점은 kernel library를 붙이는 일도 system work라는 것이다. 좋은 kernel을 호출하려면 input layout, batch shape, KV cache format, sampling path가 맞아야 한다. Kernel 하나가 빠른데 scheduler가 그 shape을 만들지 못하면 이득은 제한된다. Inference engine은 kernel과 batch planner가 함께 최적화되는 물건이다.

## 5. GEMM과 SM utilization

강의 후반에는 TurboMind GEMM optimization과 Stream-K에서 영감을 받은 방식도 언급된다. 목표는 workload를 나누어 SM idle time을 줄이는 것이다. Decode phase의 shape은 batch와 sequence 상태에 따라 작고 불규칙해질 수 있다. 이때 일반 GEMM이 모든 SM을 잘 채우지 못하면 tail effect가 생긴다.

Serving에서 GEMM은 training의 큰 dense GEMM과 다르게 보일 때가 많다. Request마다 길이가 다르고 batch가 계속 변한다. 그래서 kernel 성능표 하나보다 workload distribution을 보는 것이 중요하다. SGLang 강의는 “engine-level benchmark”가 왜 필요한지 잘 보여준다.

## 6. 손으로 해볼 것

작은 toy serving loop를 만들어보자. CPU가 request를 받고 batch를 구성한 뒤 GPU 작업을 sleep이나 dummy kernel로 흉내낸다. Blocking scheduler와 next-batch preparation을 overlap한 scheduler를 비교하면 idle gap이 눈에 보인다.

다음에는 prefix가 같은 request들을 일부러 섞어 넣고, cache hit을 높이기 위해 reorder하면 latency가 어떻게 바뀌는지 기록해보자. Serving optimization은 kernel보다 queue를 먼저 그려야 할 때가 많다.

## Source Links

- [YouTube](https://www.youtube.com/watch?v=XQylGyG7yp8)
- [Lecture 035 repo folder](https://github.com/gpu-mode/lectures/tree/main/lecture_035)
- [Slides PDF](https://github.com/gpu-mode/lectures/blob/main/lecture_035/SGLang-Performance-Optimization-YinengZhang.pdf)
- [Speaker profile](https://linkedin.com/in/zhyncs)
- Local notes: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/notes/lecture_035.md`
- Local transcript: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/transcripts/lecture_035.md`
