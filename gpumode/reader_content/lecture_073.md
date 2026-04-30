---
num: 73
title: Large model quantization, 낮출 곳을 먼저 고르기
original: "Lecture 73: [ScaleML Series] Quantization in Large Models"
speaker: Unknown
part: 5
part_label: Part V · 추론·학습·통신 스케일
priority: High
status: partial
---

:::crux
source bundle은 이 강의가 ScaleML Series의 `Quantization in Large Models`라는 점, YouTube 링크, ScaleML bootcamp 링크를 제공한다. caption fetch는 실패했고 speaker/slides/code는 없다. 따라서 특정 quantization method를 강의 내용으로 쓰지 않는다. 이 reader의 중심 질문은 **large model에서 bit 수를 줄인다는 말이 어떤 tensor, granularity, kernel path, quality metric을 함께 선택한다는 뜻인가**다.
:::

## 1. 제목은 넓고 근거는 좁다

Quantization in Large Models라는 제목 하나에는 많은 방법이 들어갈 수 있다. PTQ, QAT, weight-only, activation quantization, KV cache quantization, FP8 training, INT4 serving이 모두 후보처럼 보인다.

하지만 후보는 강의 내용이 아니다. 지금 draft는 method catalog를 만들지 않고, 원본을 볼 때 어떤 축으로 받아 적어야 하는지 정리한다. ScaleML bootcamp 링크는 맥락 단서지만, 강의의 세부 주장까지 대신해 주지는 않는다.

## 2. 먼저 tensor를 고른다

quantization을 읽을 때 "몇 bit인가"보다 먼저 "무엇을 낮추는가"를 본다. weight만 낮추는지, activation도 낮추는지, KV cache까지 낮추는지에 따라 memory, compute, accuracy risk가 달라진다.

training까지 다루면 이야기는 더 조심스러워진다. gradient, optimizer state, loss scaling, numerical stability가 들어온다. 원본에서 어느 범위를 다뤘는지 표시하지 않으면, large model quantization이라는 말이 너무 쉽게 모든 것을 덮는다.

:::figure grid
label: Figure · quantization을 받아 적는 네 칸
- target: weight, activation, KV cache, gradient 중 무엇인가
- format: INT8, INT4, FP8 등 표현 방식은 무엇인가
- scale: per-tensor, per-channel, per-group 중 어느 granularity인가
- kernel: dequant를 따로 하는지, matmul/attention에 fuse하는지 본다
:::

## 3. granularity는 정확도와 비용을 동시에 바꾼다

scale을 tensor 전체에 하나만 두면 단순하지만 오차가 커질 수 있다. channel-wise나 group-wise scale은 더 섬세하지만 metadata와 dequant 비용을 만든다. large model에서는 이 overhead도 무시하기 어렵다.

그래서 quantization scheme은 model-level claim과 kernel-level claim을 같이 가진다. accuracy가 유지되는지, memory traffic이 줄었는지, hardware path가 빠른 dtype을 실제로 쓰는지, scale handling이 병목이 되지 않는지 함께 봐야 한다.

## 4. benchmark를 읽는 순서

baseline을 먼저 적는다. BF16/FP16과 비교하는지, FP8과 비교하는지, 이미 optimized된 low-bit baseline과 비교하는지에 따라 의미가 달라진다.

그다음 metric을 분리한다. perplexity나 downstream score는 품질을 말하고, latency/throughput/memory footprint는 system behavior를 말한다. 둘 중 하나만 있으면 quantization의 절반만 본 것이다.

## 5. 작게 재현해 볼 질문

transformer block 하나를 골라 tensor 목록을 만든다. embedding, QKV projection, attention score, value, output projection, MLP, KV cache 옆에 dtype과 scale granularity를 적어 본다.

그 표를 보면 "모델을 INT4로 만들었다" 같은 한 문장이 얼마나 많은 선택을 생략하는지 보인다. 원본을 볼 때 speaker가 실제로 고른 선택지만 이 표에 표시하면 된다.

## Source Links

- [YouTube](https://www.youtube.com/watch?v=6Cxnnvv3DnY)
- [ScaleML Bootcamp](https://scale-ml.org/bootcamp/)
- Local notes: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/notes/lecture_073.md`
- Local transcript stub: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/transcripts/lecture_073.md`
