---
num: 13
title: Ring Attention과 긴 문맥
original: "Lecture 13: Ring Attention"
speaker: Andreas Koepf
part: 2
part_label: Part II · 병렬 패턴과 Attention
priority: High
status: rich
---

:::crux
Ring Attention은 attention의 quadratic 계산을 없애는 기술이 아니다. sequence를 device들에 나누고, FlashAttention식 blockwise softmax 상태를 돌려가며, 긴 context를 memory에 맞게 처리하려는 distributed attention 전략이다.
:::

## 1. 긴 문맥은 왜 아픈가

long context 모델은 매력적이다. 긴 문서, audio, video, multimodal 기록을 더 많이 넣을 수 있고, world model 같은 방향에서도 큰 context는 중요한 재료가 된다.

하지만 attention은 sequence length에 대해 memory가 빠르게 커진다. 강의에서는 Ring Attention paper의 예를 빌려, batch size 1이어도 매우 긴 token 수에서는 memory가 엄청나게 필요하다는 점을 강조한다.

여기서 먼저 솔직해야 한다. Ring Attention은 attention의 quadratic scaling 자체를 없애지 않는다. 필요한 계산은 여전히 많이 한다. 다만 memory와 communication을 조직해서 더 긴 sequence를 여러 device에서 처리하려 한다.

## 2. FlashAttention에서 이어지는 blockwise softmax

Ring Attention을 이해하려면 FlashAttention의 online softmax를 먼저 잡아야 한다. attention row를 block으로 나누어 보고, 각 block의 max와 normalization 정보를 합쳐도 전체 softmax와 같은 결과를 만들 수 있다.

Andreas는 softmax를 blockwise로 계산하는 법을 길게 설명한다. 한 block에서 얻은 local max와 sum, output을 다음 block의 정보와 결합한다. 새 max가 더 크면 이전 accumulator를 rescale해야 한다.

이 결합 법칙이 중요하다. block을 어떤 순서로 보더라도 필요한 통계를 갱신할 수 있어야 sequence를 나누고 돌릴 수 있다. Ring Attention은 이 성질을 distributed setting으로 가져간다.

:::figure flow
label: Figure · ring으로 K/V block을 돌리기
- stage: 각 GPU는 sequence의 query block과 key/value block 일부를 가진다.
- stage: 자기 K/V block으로 local FlashAttention update를 계산한다.
- stage: K/V block을 다음 GPU로 보내고, 이전 GPU에서 새 block을 받는다.
- stage: online softmax 상태와 output accumulator를 갱신한다.
- stage: 모든 block을 한 바퀴 본 뒤 각 GPU가 자기 query output을 완성한다.
:::

## 3. distributed parallelism의 위치

training에는 data parallelism, tensor/model parallelism, pipeline parallelism 등 여러 형태가 있다. Ring Attention은 sequence dimension을 나누는 sequence parallelism 쪽으로 생각할 수 있다.

각 device가 sequence의 일부를 맡고, attention에 필요한 K/V block을 ring 형태로 주고받는다. 이렇게 하면 모든 device가 전체 K/V를 한 번에 들고 있지 않아도 된다.

다만 communication이 사라지는 것은 아니다. block을 넘기는 비용과 계산을 어떻게 overlap할지가 성능의 핵심이 된다. 긴 context에서는 memory를 줄이는 대신 communication schedule이 새 병목이 될 수 있다.

## 4. inference와 training을 구분하자

강의에서 중요한 경고는 Ring Attention이 주로 training 쪽 기술로 보인다는 점이다. token-by-token inference에서는 KV cache와 decoding pattern이 다르고, FlashAttention 자체도 long context inference에 그대로 최적화되어 있지 않을 수 있다.

상용 long-context 모델들이 내부적으로 무엇을 쓰는지는 공개되어 있지 않은 경우가 많다. Ring Attention과 비슷한 아이디어가 들어갈 수는 있지만, 확정적으로 말하기 어렵다.

따라서 독자는 "long context = Ring Attention"으로 외우기보다, 어떤 workload에서 memory가 문제인지, compute가 문제인지, communication이 문제인지 나누어 보아야 한다.

## 5. reduction step의 비용

blockwise softmax는 여러 block의 통계를 합치는 reduction을 필요로 한다. Ring Attention에서도 각 device가 본 K/V block들에 대해 online state를 갱신하고, 최종 output을 얻는다.

이 reduction step은 attention matmul에 비해 작아 보일 수 있지만, 긴 sequence와 여러 device에서는 무시하기 어렵다. profiler로 communication, matmul, reduction이 각각 어디서 시간을 쓰는지 봐야 한다.

Andreas는 shared memory 질문에도 선을 긋는다. sequence parallelism은 device 간 분할 전략이고, 각 device 내부의 CUDA kernel은 여전히 shared memory를 쓸 수 있다. 층위를 섞지 않는 것이 중요하다.

## 6. 읽기와 실험 포인트

먼저 `howto_log_sum_exp.ipynb`처럼 log-sum-exp와 blockwise softmax 결합을 작은 숫자로 따라가 보자. 이 부분이 잡히면 Ring Attention의 수식은 훨씬 덜 무섭다.

그 다음 2개 또는 4개 device가 있다고 가정하고 K/V block이 ring으로 이동하는 표를 그려 보자. 각 step에서 어떤 device가 어떤 block을 보고, online max/sum/output을 어떻게 갱신하는지 적는다.

:::tip
Ring Attention을 볼 때 "계산량을 줄였나?"와 "memory placement를 바꿨나?"를 분리해서 읽자. 이 강의의 답은 대체로 후자다.
:::

## Source Links

- [YouTube](https://www.youtube.com/watch?v=ws7angQYIxI)
- [Slides](https://github.com/gpu-mode/lectures/blob/main/lecture_013/ring_attention.pptx)
- [Slides Google](https://docs.google.com/presentation/d/180lS8XbeR1_bTMaldg21LKYQkjXftHuh9VnZ3xk27qQ/edit)
- [Notebook](https://github.com/gpu-mode/lectures/blob/main/lecture_013/howto_log_sum_exp.ipynb)
- [Code](https://github.com/cuda-mode/ring-attention)
- Local notes: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/notes/lecture_013.md`
- Local transcript: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/transcripts/lecture_013.md`
