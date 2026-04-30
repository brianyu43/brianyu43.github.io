---
num: 32
title: Unsloth, kernel에서 training library까지
original: "Lecture 32: Unsloth"
speaker: Daniel Han
part: 3
part_label: Part III · 커널 프레임워크와 이식성
priority: High
status: rich
---

:::crux
Unsloth 이야기는 “Triton kernel 몇 개를 빠르게 만들었다”에서 끝나지 않는다. RMSNorm, embedding, FlashAttention, cross entropy 같은 kernel을 손보는 일은 시작일 뿐이다. Fine-tuning library가 되려면 tokenizer, model bug, gradient accumulation, loss normalization, quantization path까지 맞아야 한다. 빠른 training은 kernel과 systems hygiene이 같이 만든다.
:::

## 1. 최적화 library가 마주친 진짜 일

Daniel Han은 Unsloth가 처음에는 fine-tuning을 빠르게 하고 memory를 줄이는 optimization library였다고 설명한다. 그런데 실제 사용자가 붙으면서 일이 커졌다. Gemma의 BOS token, RoPE, LayerNorm, activation function 같은 model-specific bug를 만나고, model analysis와 compatibility가 중요한 일이 되었다.

이 점이 강의의 매력이다. GPU kernel 강의처럼 시작하지만, production training library의 생활감이 강하다. Kernel이 빨라도 tokenizer가 틀리면 model quality가 무너진다. Cross entropy가 memory를 덜 써도 gradient accumulation denominator가 틀리면 loss가 다른 의미가 된다.

## 2. RMSNorm과 dtype discipline

Unsloth의 초기 kernel 중 하나는 RMSNorm이다. RMSNorm은 작아 보이지만 dtype discipline이 필요하다. 어떤 값을 fp32로 upcast할지, 언제 bf16/fp16으로 내릴지, backward에서 gradient가 reference와 맞는지 확인해야 한다. Daniel은 kernel code에 upcast/downcast 관련 주석이 많다는 점을 보여준다. 이 주석들은 장식이 아니라 correctness의 흔적이다.

Triton은 빠르게 kernel을 만들기 좋지만, compiler가 모든 numerical choice를 대신 책임지지는 않는다. 특히 LLM fine-tuning에서는 작은 오차가 반복 update를 거쳐 크게 보일 수 있다. “동작한다”와 “수렴한다” 사이에는 꽤 넓은 강이 있다.

:::figure flow
label: Figure · Unsloth식 최적화가 지나가는 층
- kernel: RMSNorm, embedding, cross entropy 같은 hot path를 Triton으로 최적화
- precision: upcast/downcast와 gradient correctness를 확인
- memory: logits나 activation 같은 큰 intermediate를 줄임
- model glue: tokenizer, RoPE, BOS token, architecture quirk를 맞춤
- convergence: 실제 fine-tuning loss와 quality가 유지되는지 확인
:::

## 3. Cross entropy는 memory 문제이면서 수학 문제다

LM training에서 cross entropy는 vocabulary dimension 때문에 큰 memory를 쓴다. LM head에서 logits를 만들고 loss를 계산하는 과정은 memory spike의 주범이 될 수 있다. Unsloth는 cross entropy 쪽에서도 kernel을 손보고, 필요한 upcast를 kernel 내부로 옮겨 memory usage를 줄이는 방향을 다룬다.

하지만 더 중요한 사건은 gradient accumulation의 denominator 문제다. 여러 microbatch를 accumulate할 때 loss를 어떤 denominator로 normalize하는지 틀리면, 겉보기에는 training이 돌아가도 gradient scale이 달라진다. Daniel은 이 문제를 강하게 강조한다. GPU 최적화는 수식을 바꾸지 않는다는 약속 위에서만 의미가 있다.

## 4. FlashAttention과 dependency의 현실

Unsloth는 FlashAttention도 활용한다. Attention은 long context fine-tuning에서 memory와 speed를 좌우한다. 다만 external dependency는 늘 현실적인 문제를 데려온다. 특정 hardware, 특정 dtype, 특정 build 환경에서 잘 맞아야 하고, package user가 설치에서 막히면 library 경험이 나빠진다.

그래서 Unsloth의 engineering은 “직접 Triton으로 다 쓰기”와 “검증된 external kernel을 잘 쓰기” 사이의 균형이다. 모든 kernel을 직접 쓰는 것은 control을 주지만 maintenance cost도 준다. 좋은 library는 여기서 너무 용감하지도, 너무 의존적이지도 않아야 한다.

## 5. Quantization은 싸게 돌리기 위한 현실적 도구다

강의에는 quantized model과 LoRA/fine-tuning 이야기도 나온다. 70B 같은 큰 model은 그대로 올리기 어렵고, quantization은 VRAM을 줄여 더 싼 장비에서 돌릴 수 있게 한다. Weight-only quantization, activation quantization, KV cache quantization은 각각 memory-bound와 compute-bound 상황에서 다른 의미를 갖는다.

Unsloth가 다루는 사용자 경험은 여기서 중요해진다. Pre-quantized model을 제공하고, LoRA training path를 맞추며, accuracy를 잃지 않는 범위를 찾아야 한다. Kernel이 빠른 것만으로는 부족하다. 사용자가 “그냥 fine-tune했는데 잘 됐다”고 느끼려면, 수많은 작은 default가 맞아야 한다.

## 6. 손으로 해볼 것

작은 language model에서 gradient accumulation을 직접 구현하고, denominator를 token count 기준과 batch count 기준으로 바꿔 loss scale을 비교해보자. 틀린 normalize가 얼마나 조용히 training을 바꾸는지 체감할 수 있다.

그 다음 RMSNorm reference와 Triton version을 만들고, forward뿐 아니라 backward gradient까지 비교한다. 마지막으로 nontrivial tokenizer setting, 예를 들어 BOS/EOS handling을 바꿨을 때 학습 데이터가 어떻게 달라지는지 확인하자. GPU 성능 작업은 생각보다 자주 tokenizer 옆자리에 앉아 있다.

## Source Links

- [YouTube](https://www.youtube.com/watch?v=hfb_AIhDYnA)
- [Slides](https://docs.google.com/presentation/d/1BvgbDwvOY6Uy6jMuNXrmrz_6Km_CBW0f2espqeQaWfc/edit?usp=sharing)
- [Daniel Han](https://x.com/danielhanchen)
- Local notes: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/notes/lecture_032.md`
- Local transcript: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/transcripts/lecture_032.md`
