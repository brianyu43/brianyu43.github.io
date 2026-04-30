---
num: 22
title: Speculative decoding을 vLLM 안에서 보기
original: "Lecture 22: Hacker's Guide to Speculative Decoding in VLLM"
speaker: Cade Daniel
part: 2
part_label: Part II · 병렬 패턴과 Attention
priority: High
status: rich
---

:::crux
Speculative decoding은 “작은 모델이 맞히면 빠르다” 정도로 끝나는 기법이 아니다. vLLM 안에서는 proposer, scorer, verifier, rejection sampler, scheduler가 맞물린다. 핵심 질문은 **target model forward 한 번으로 평균 몇 token을 안전하게 내보낼 수 있는가**다.
:::

## 1. 왜 autoregressive decoding이 답답한가

LLM decoding은 기본적으로 token을 하나씩 만든다. 다음 token을 만들려면 이전 token이 필요하다. batch가 작고 latency가 중요한 serving에서는 큰 model forward 한 번을 돌려 token 하나만 얻는 일이 많다. 이때 workload는 memory-bound가 되기 쉽다. 큰 weight를 HBM에서 읽는데, batch가 작아 compute를 충분히 채우지 못한다.

Speculative decoding은 이 병목을 다른 방향에서 건드린다. 작은 draft model이나 n-gram proposer가 여러 후보 token을 먼저 제안한다. 큰 target model은 이 후보들을 한 번에 score하고, acceptance rule에 따라 앞에서부터 몇 개를 받아들인다. 운이 좋으면 target model forward 한 번으로 token 여러 개를 얻는다.

## 2. vLLM의 원칙과 tension

Cade Daniel은 vLLM을 ease of use, performance, hardware support가 만나는 프로젝트로 설명한다. PagedAttention, tensor parallelism, multi-LoRA, chunked prefill, guided decoding, quantization 같은 기능들이 같은 serving engine 안에 들어간다. 이 넓이가 spec decoding을 어렵게 만든다.

vLLM은 high-throughput batch inference로 유명하지만, spec decoding은 low-latency small-batch에서도 중요하다. 두 목표는 항상 같은 방향이 아니다. throughput을 위한 scheduling과 batching 정책이 latency 최적화와 충돌할 수 있다. 그래서 “알고리즘은 간단한데 framework에 넣기는 어렵다”가 된다.

:::figure flow
label: Figure · speculative decoding loop
- propose: draft model, n-gram, Medusa/EAGLE류 방법이 후보 token을 냄
- score: target model이 prompt와 후보 token의 probability를 계산
- verify: rejection sampling 또는 acceptance rule로 앞 token부터 검증
- emit: accepted token을 output에 붙임
- schedule: 남은 request와 KV cache 상태를 다음 step에 반영
:::

## 3. acceptance rate가 성능의 심장이다

Spec decoding의 이득은 accepted tokens per step에서 나온다. 후보를 많이 내도 target이 대부분 거절하면 proposal overhead만 생긴다. 반대로 acceptance rate가 높으면 target forward 횟수가 줄어 time per token이 내려간다.

여기서 draft model 선택이 중요하다. 작은 Transformer draft model은 proposal quality가 좋을 수 있지만 자체 비용이 있다. n-gram proposer는 CPU-only로 단순하게 돌릴 수 있고 특정 반복 패턴에서는 잘 맞는다. Medusa나 EAGLE 같은 방법은 target model 주변에 multi-token prediction head를 붙이는 방향이다. 좋은 proposer는 싸고, target distribution과 충분히 닮아야 한다.

## 4. lossless rejection sampling과 실용적 변형

Rejection sampling은 target model의 분포를 망치지 않으면서 draft proposal을 받아들이는 방법이다. “그냥 target top-1과 같으면 accept” 같은 greedy rule보다 엄밀한 장점이 있다. 다만 구현에서는 proposal probability와 target probability를 함께 다루어야 하고, token별 acceptance를 prefix 순서로 처리해야 한다.

강의는 vLLM 안에서 proposer worker, scorer, verifier가 어떻게 나뉘는지도 짚는다. spec request와 non-spec request가 같은 batch 안에 섞일 수 있고, accepted token 수가 request마다 다르다. 즉, 알고리즘의 수식보다 scheduler와 data structure가 더 복잡해지는 순간이 온다.

## 5. memory-bound일 때 특히 빛난다

Spec decoding은 모든 상황에서 같은 이득을 주지 않는다. 큰 batch로 이미 compute-bound에 가까우면 target forward 한 번에 여러 token을 score하는 이득이 줄 수 있다. 반대로 small batch, live inference, latency-sensitive setting에서는 weight loading 비용이 커서 token 여러 개를 한 번에 검증하는 효과가 크다.

성능을 볼 때는 target model time, draft/proposal time, verification overhead, accepted tokens per step을 분리해서 봐야 한다. speedup 하나만 보면 원인을 잃는다. acceptance rate가 낮은지, proposer가 비싼지, scheduler overhead가 큰지에 따라 고칠 곳이 다르다.

## 6. 손으로 해볼 것

작은 vocabulary 예제를 만들고 draft distribution과 target distribution을 직접 적어본다. draft가 token 세 개를 제안했을 때, 앞에서부터 accept/reject가 어떻게 진행되는지 손으로 따라가면 prefix acceptance의 의미가 보인다.

vLLM 코드를 읽는다면 proposer, scorer, verifier가 분리된 파일을 찾고 data가 어떤 형태로 오가는지 먼저 본다. kernel 최적화보다 먼저 request scheduling과 KV cache 상태가 어떻게 변하는지 보는 편이 좋다.

## Source Links

- [YouTube](https://www.youtube.com/watch?v=9wNAgpX6z_4)
- [Slides](https://docs.google.com/presentation/d/1p1xE-EbSAnXpTSiSI0gmy_wdwxN5XaULO3AnCWWoRe4/edit)
- [Cade Daniel](https://x.com/cdnamz)
- Local notes: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/notes/lecture_022.md`
- Local transcript: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/transcripts/lecture_022.md`
