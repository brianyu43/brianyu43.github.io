---
num: 63
title: Search-Based Deep Learning Compilers, 탐색이 컴파일러가 될 때
original: "Lecture 63: Search-Based Deep Learning Compilers"
speaker: Joe Fioti
part: 5
part_label: Part V · 추론·학습·통신 스케일
priority: High
status: partial
---

:::crux
Joe Fioti가 어떤 compiler와 search algorithm을 중심에 놓았는지는 아직 확인되지 않았다. 여기서는 제목을 좁게 읽어 **deep learning compiler에서 "탐색"이 왜 필요한가**를 준비한다. hand-written rule만으로 모든 shape와 hardware를 덮기 어렵고, 후보 공간과 측정 또는 cost model이 함께 필요하다는 정도까지가 안전한 출발점이다.
:::

## 1. search-based라는 말은 후보 공간을 전제로 한다

compiler가 search를 한다는 것은 아무 곳이나 뒤진다는 뜻이 아니다. 먼저 탐색할 공간이 있어야 한다. tile size, loop order, fusion boundary, memory placement, vector width, parallel mapping 같은 선택지를 어떤 형태로 표현할지 정해야 한다.

local notes에는 구체 compiler 이름이나 예제가 없다. 따라서 이 원고는 AutoTVM, Ansor, Triton autotune 같은 특정 시스템의 설명이 아니다. 원본을 볼 때 어떤 search space를 만들고 어떤 기준으로 후보를 고르는지 확인하기 위한 가이드다.

## 2. rule-based와 search-based는 적이 아니다

고성능 compiler에는 사람이 만든 rule이 필요하다. 말도 안 되는 schedule을 줄이고, hardware 제약을 지키고, correctness를 보장해야 한다. 하지만 rule만으로 모든 shape와 hardware, operator variant를 덮기는 어렵다.

search-based 접근은 이 빈틈을 메운다. 사람이 좋은 후보 공간을 설계하고, compiler가 그 안에서 측정하거나 예측한다. 중요한 건 search가 magic이 아니라는 점이다. 공간을 잘못 만들면 아무리 열심히 찾아도 좋은 답이 없다.

:::figure flow
label: Figure · search-based compiler의 일반 루프
- define: 가능한 schedule과 parameter 공간을 만든다
- prune: hardware 제약과 rule로 말이 안 되는 후보를 줄인다
- evaluate: benchmark 또는 cost model로 후보를 평가한다
- update: 결과를 바탕으로 다음 후보를 고른다
- emit: 선택한 schedule을 code로 생성하고 검증한다
:::

## 3. cost model은 편하지만 거짓말할 수 있다

모든 후보를 실제 GPU에서 benchmark하면 시간이 오래 걸린다. 그래서 cost model이나 learned model이 후보의 성능을 예측할 수 있다. 하지만 GPU 성능은 cache, occupancy, memory coalescing, compiler lowering, clock state 같은 요인에 민감하다.

좋은 search-based compiler는 예측과 실제 측정을 어떻게 섞는지가 중요하다. cost model을 신뢰하되 blind faith로 두지 않고, calibration과 validation을 계속 해야 한다. 원본 강의에 benchmark가 있다면 prediction error도 함께 보고 싶다.

## 4. 탐색 비용도 시스템 비용이다

autotuning은 결과 kernel이 빠르면 멋져 보이지만, tuning time도 실제 비용이다. shape가 자주 바뀌거나 model deployment가 잦으면 긴 search는 부담이 된다. cache 가능한가, offline tuning인가, online adaptation인가를 봐야 한다.

또 search result는 hardware와 software version에 묶일 수 있다. driver, compiler, GPU architecture가 바뀌면 최적 schedule이 달라질 수 있다. "한 번 찾은 답"이 영원한 답은 아니다.

## 5. 손으로 해볼 것

Triton의 작은 matmul이나 reduction kernel을 하나 골라 block size 후보 세 개만 정해 보자. 각 후보에 대해 예상되는 memory traffic, parallelism, register pressure를 말로 적고, 실제 benchmark 결과와 비교한다.

틀려도 괜찮다. search-based compiler를 이해하는 가장 좋은 방법은 내 머릿속 cost model이 얼마나 자주 빗나가는지 보는 것이다. 컴파일러도 결국 그 빗나감을 줄이려는 장치다.

## Source Links

- [YouTube](https://www.youtube.com/watch?v=_aT2eo-0uWk)
- Local notes: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/notes/lecture_063.md`
- Local transcript stub: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/transcripts/lecture_063.md`
