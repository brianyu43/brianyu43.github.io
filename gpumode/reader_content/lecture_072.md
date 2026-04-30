---
num: 72
title: StreamingLLM, long-context를 KV cache 문제로 보기
original: "Lecture 72: [ScaleML Series] Efficient & Effective Long-Context Modeling for Large Language Models"
speaker: Guangxuan Xiao
part: 5
part_label: Part V · 추론·학습·통신 스케일
priority: High
status: partial
---

:::crux
transcript는 없지만 `StreamingLLM.pdf` slide가 있다. 이 강의의 핵심 질문은 **LLM을 긴 stream에 계속 붙여 두려면, attention 품질과 KV cache memory를 어떻게 동시에 다룰 것인가**다. slide는 attention sink와 rolling KV cache를 주요 아이디어로 제시한다.
:::

## 1. 지금 확인된 자료

local notes에는 speaker가 Guangxuan Xiao로 기록되어 있고, GitHub folder와 `StreamingLLM.pdf`가 있다. transcript와 code link는 notes에는 없지만, slide text에는 StreamingLLM code/blog link가 등장한다. 이 reader에서는 lecture notes의 source와 slide 내용만 사용한다.

slide는 streaming application, multi-round dialogue, decoding 단계의 KV cache memory 문제를 출발점으로 삼는다. 긴 context에서 이전 token의 key/value를 모두 저장하면 memory가 sequence length에 따라 커진다. 그래서 window attention처럼 최근 token만 남기는 접근이 자연스럽지만, 초기 token을 버리면 model이 무너질 수 있다고 설명한다.

## 2. KV cache가 long-context의 몸값이다

decoder-only Transformer는 새 token을 만들 때 현재 query와 과거 token의 key/value를 사용한다. 이미 계산한 K/V를 cache하면 재계산은 피하지만, 길이가 늘수록 memory가 쌓인다. serving 관점에서는 이 memory가 batch size와 sequence length를 직접 누른다.

window attention은 cache를 최근 token으로 제한해 memory를 줄인다. 문제는 model이 긴 문맥에서 특정 초기 token에 계속 attention을 주는 현상이다. slide는 이를 attention sink라고 부르고, 관련 없는 것처럼 보여도 attention을 끌어당기는 token이 있다고 설명한다.

:::figure memory
label: Figure · StreamingLLM의 cache 감각
- sink tokens: 초반의 attention sink token KV를 계속 보존한다
- rolling window: 최근 token의 KV만 sliding window로 유지한다
- evicted tokens: cache에서 빠진 token은 다시 attend할 수 없다
- decode step: 현재 query는 sink와 window 안의 KV를 본다
- memory budget: 전체 과거가 아니라 작은 고정 cache로 stream을 처리한다
:::

## 3. StreamingLLM의 조심스러운 약속

slide는 StreamingLLM이 attention sink token의 KV와 sliding window KV를 함께 보존한다고 설명한다. 이렇게 하면 모든 과거 token을 들고 있지 않아도 stream을 오래 처리할 수 있다. 또 slide는 recomputation baseline 대비 speedup claim을 제시하지만, 정확한 조건은 PDF의 figure와 실험 설정을 확인해야 한다.

중요한 단서도 slide에 직접 있다. StreamingLLM이 infinite context를 주는 것은 아니다. cache에서 evict된 token은 attend할 수 없다. 즉 "무한히 긴 텍스트를 완전히 기억한다"가 아니라, streaming deployment에서 안정적으로 굴러가는 cache policy에 가깝다.

## 4. GPU Mode 독자에게 중요한 연결점

KV cache는 model architecture와 GPU memory system이 만나는 자리다. cache layout, quantization, paging, batch scheduling, prefill/decode 분리, attention kernel 모두 여기로 모인다. long-context modeling을 논문 아이디어로만 읽으면 serving 병목을 놓치기 쉽다.

attention sink를 보존하는 policy는 kernel에도 영향을 준다. attention이 보는 key/value index가 연속 window만이 아니라 sink prefix와 recent window의 조합이 되기 때문이다. 실제 구현에서는 gather pattern, memory coalescing, cache compaction을 확인해야 한다.

## 5. 혼자 해볼 것

toy decoder setting을 놓고 KV cache memory를 계산해 보자. layer 수, KV head 수, head dim, dtype byte, batch size, sequence length를 곱하면 long-context가 왜 곧 memory 문제인지 금방 보인다.

원본 slide를 볼 때는 "attention sink를 몇 개 보존하는가", "position id를 어떻게 처리하는가", "어떤 model family에서 평가했는가", "evicted token을 다시 볼 수 없는 한계를 어떻게 설명하는가"를 따로 적어 두자.

## Source Links

- [YouTube](https://www.youtube.com/watch?v=DFcKFDt0QEg)
- [Slides folder](https://github.com/gpu-mode/lectures/tree/main/lecture_072)
- [Slides PDF](https://github.com/gpu-mode/lectures/blob/main/lecture_072/StreamingLLM.pdf)
- [ScaleML Bootcamp](https://scale-ml.org/bootcamp/)
- [Speaker site](https://guangxuanx.com)
- Local notes: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/notes/lecture_072.md`
- Local transcript stub: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/transcripts/lecture_072.md`
