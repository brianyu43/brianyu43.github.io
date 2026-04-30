---
num: 74
title: RoPE, YaRN, PaTH로 position을 다시 보기
original: "Lecture 74: [ScaleML Series] Positional Encodings and PaTH Attention"
speaker: Songlin Yang
part: 5
part_label: Part V · 추론·학습·통신 스케일
priority: High
status: partial
---

:::crux
transcript는 없지만 `path_talk.pdf` slide가 있다. 이 강의의 핵심 질문은 **Transformer가 token 순서를 어떻게 encoding하고, RoPE의 한계를 PaTH attention이 어떤 수학적 구조로 넘으려 하는가**다. 세부 증명과 실험값은 slide/paper 원문에서 확인해야 한다.
:::

## 1. 지금 확인된 자료

local notes에는 speaker가 Songlin Yang으로 기록되어 있고, GitHub folder와 `path_talk.pdf`가 있다. slide 제목은 `Modern Position Encoding in Transformers: RoPE/Yarn and PaTH`다. transcript와 code는 없다.

slide 초반은 positional information의 필요성에서 시작한다. causal mask가 없는 self-attention은 input token을 unordered set처럼 다룰 수 있으므로, word order를 구분하려면 position 정보를 넣어야 한다. 이어 absolute positional encoding, RoPE, YaRN, PaTH가 등장한다.

## 2. RoPE의 좋은 점과 긴 문맥의 불편함

RoPE는 query와 key에 회전을 적용해 attention logit이 상대 위치에 의존하도록 만든다. slide는 rotation matrix의 composition과 inverse 같은 성질을 짚고, RoPE attention score가 absolute position이 아니라 `i - j`에 연결된다고 설명한다.

이 구조는 elegant하다. 하지만 slide는 RoPE가 pre-training context보다 긴 sequence에서 perplexity가 빠르게 나빠질 수 있다고 설명한다. YaRN이나 position interpolation 같은 방법은 이런 long-context extrapolation 문제를 다루는 쪽으로 읽을 수 있다.

:::figure flow
label: Figure · position encoding을 읽는 흐름
- absolute PE: embedding에 위치 signal을 더한다
- RoPE: query/key를 position별 rotation으로 바꾼다
- interpolation: 긴 sequence의 position을 훈련 범위 안으로 압축해 본다
- PaTH: data-dependent transformation으로 더 강한 구조를 시도한다
- evaluation: 긴 문맥 perplexity와 실제 task 성능을 따로 본다
:::

## 3. PaTH가 던지는 질문

slide에서 PaTH는 RoPE와 비교되며 data-dependent generalized Householder matrix라는 표현이 나온다. RoPE가 data-independent rotation이라면, PaTH는 position 처리에 더 표현력 있는 transformation을 넣으려는 방향으로 보인다. slide에는 PaTH가 특정 이론적 문제를 풀 수 있다는 주장도 나오지만, 이 부분은 원문 증명을 확인해야 한다.

중요한 것은 PaTH를 "RoPE보다 세다"로만 읽지 않는 것이다. 더 강한 표현력은 학습 안정성, kernel cost, checkpoint conversion, long-context generalization을 함께 건드린다. slide에는 RoPE 기반 pretrained checkpoint를 PaTH로 바꾸는 cheap conversion 이야기도 보이지만, 실제 품질과 비용은 세부 실험을 봐야 한다.

## 4. GPU/커널 관점의 연결

position encoding은 model math처럼 보이지만 kernel에도 영향을 준다. RoPE는 attention 앞에서 Q/K에 적용되는 비교적 규칙적인 elementwise transform이다. fused attention kernel 안에 넣을 수 있고, layout과 vectorization이 중요하다.

PaTH처럼 더 복잡한 transformation이 들어가면 compute overhead와 memory access pattern을 확인해야 한다. long-context 성능을 얻기 위해 attention kernel이 느려지면 serving에서는 trade-off가 생긴다. architecture idea와 kernel path를 같이 읽는 습관이 필요하다.

## 5. 혼자 해볼 것

작은 2D rotation matrix로 RoPE의 핵심 성질을 손으로 확인해 보자. `R(a)^T R(b) = R(b-a)`가 왜 상대 위치로 이어지는지 직접 써 보면, slide의 수식이 훨씬 덜 낯설어진다.

원본 slide를 볼 때는 RoPE, YaRN, PaTH 각각에 대해 "무엇을 바꾸는가", "long-context에서 무엇을 개선한다고 주장하는가", "kernel 비용은 어떻게 변하는가"를 표로 정리하자.

## Source Links

- [YouTube](https://www.youtube.com/watch?v=QXbXdN3KIcY)
- [Slides folder](https://github.com/gpu-mode/lectures/tree/main/lecture_074)
- [Slides PDF](https://github.com/gpu-mode/lectures/blob/main/lecture_074/path_talk.pdf)
- [ScaleML Bootcamp](https://scale-ml.org/bootcamp/)
- [Speaker site](https://sustcsonglin.github.io)
- Local notes: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/notes/lecture_074.md`
- Local transcript stub: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/transcripts/lecture_074.md`
