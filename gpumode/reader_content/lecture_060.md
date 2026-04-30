---
num: 60
title: Optimizing Linear Attention, 선형화 뒤에도 남는 병목
original: "Lecture 60: Optimizing Linear Attention"
speaker: Songlin Yang
part: 5
part_label: Part V · 추론·학습·통신 스케일
priority: High
status: partial
---

:::crux
transcript와 slides가 없어 Songlin Yang이 다룬 linear attention variant나 kernel은 확인되지 않았다. 안전하게 말할 수 있는 핵심은 **attention을 선형 시간/메모리로 만들었다고 성능 문제가 끝나는 것이 아니라, scan, state update, memory layout, hardware utilization 문제가 새로 드러난다는 점**이다.
:::

## 1. linear attention은 하나의 algorithm 이름이 아니다

linear attention은 넓은 가족 이름이다. kernel feature map을 쓰는 방식, recurrent state를 쓰는 방식, chunking을 쓰는 방식, causal/non-causal 형태가 모두 다를 수 있다. notes에는 구체 variant가 없으므로 어떤 수식도 원본 강의의 내용처럼 쓰면 안 된다.

그래도 공통 질문은 있다. quadratic attention이 sequence length에 대해 부담스러우니, K/V 전체와 Q의 모든 pair를 직접 만들지 않는 길을 찾는다. 하지만 complexity를 낮춘 뒤에도 GPU에서 빠르게 실행되는지는 별개의 문제다.

## 2. Big-O가 줄어도 kernel은 삐질 수 있다

quadratic attention은 큰 intermediate와 HBM traffic 때문에 비싸다. linear attention은 이론적으로 더 좋은 scaling을 약속할 수 있다. 그러나 GPU는 큰 dense matmul을 아주 잘한다. 반대로 작은 scan, recurrent update, irregular memory access는 hardware를 덜 채울 수 있다.

따라서 optimization의 질문은 "O(n)이니까 빠르다"가 아니다. 어느 sequence length부터 이득인가, batch와 head dimension이 어느 정도인가, state를 register/shared/global memory 어디에 둘 수 있는가, backward pass는 어떻게 되는가를 봐야 한다.

:::figure flow
label: Figure · linear attention 최적화에서 흔한 관심사
- transform: Q/K/V를 variant가 요구하는 표현으로 바꾼다
- accumulate: sequence를 따라 state나 prefix quantity를 갱신한다
- query: 현재 Q와 축적된 state로 output을 만든다
- normalize: variant가 요구하는 scale이나 denominator를 적용한다
- backward: training이면 scan과 state gradient를 다시 다룬다
:::

## 3. causal 구조는 병렬화를 어렵게 한다

sequence를 앞에서 뒤로 누적하는 causal linear attention은 recurrent한 냄새가 난다. 각 token이 이전 state에 의존하면, 단순히 모든 position을 독립적으로 계산하기 어렵다. parallel scan이나 chunking이 필요할 수 있다.

이 부분이 GPU 최적화의 재미있는 지점이다. algorithm은 순차적으로 보이지만, chunk 안에서는 병렬화하고 chunk 사이에는 prefix를 전달하는 식으로 구조를 바꿀 수 있다. 원본 강의가 어떤 전략을 택했는지는 확인 필요다.

## 4. benchmark는 FlashAttention과 다르게 읽어야 한다

linear attention을 standard attention 또는 FlashAttention과 비교할 때는 quality와 speed를 함께 봐야 한다. 같은 model architecture인지, retraining이 필요한지, perplexity나 downstream metric이 어떻게 바뀌는지 없으면 성능 비교가 반쪽이다.

또 짧은 sequence에서는 quadratic attention이 이미 충분히 빠를 수 있다. linear attention의 이득은 긴 sequence, memory pressure, streaming decode 같은 조건에서 더 잘 드러날 수 있다. 그래서 shape sweep이 중요하다.

## 5. 손으로 해볼 것

길이 8짜리 toy sequence를 만들고, 일반 attention이 만드는 `8 x 8` score matrix의 element 수를 세어 보자. 그 다음 linear attention variant가 있다고 가정하고 per-token state 크기를 `d x d` 또는 `d`로 놓았을 때 필요한 저장량을 비교해 본다.

정확한 variant는 원본 강의에서 확인해야 한다. 하지만 이 작은 비교만으로도 "quadratic matrix를 없앤 뒤 무엇을 새로 들고 다니는가"라는 질문이 생긴다. 그 질문이 linear attention 최적화의 입구다.

## Source Links

- [YouTube](https://www.youtube.com/watch?v=RTJKXK5L8gw)
- Local notes: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/notes/lecture_060.md`
- Local transcript stub: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/transcripts/lecture_060.md`
