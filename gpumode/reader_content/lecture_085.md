---
num: 85
title: Factorio Learning Environment, RL 환경을 시스템으로 보기
original: "Lecture 85: Factorio Learning Environment"
speaker: Jack Hopkins
part: 6
part_label: Part VI · DSL·정확성·새 커널 모델
priority: Low
status: partial
---

:::crux
Factorio Learning Environment의 API, task set, benchmark 결과는 아직 확인하지 못했다. 그래서 이 장은 강의 내용을 대신 말하지 않고, **복잡한 게임을 learning environment로 만들 때 어떤 시스템 질문이 먼저 생기는가**를 정리한다. agent가 똑똑한지 보기 전에 환경이 실험 도구로 믿을 만한지 봐야 한다.
:::

## 1. 지금 확인된 자료

local notes에는 speaker가 Jack Hopkins로 기록되어 있고 YouTube 링크만 있다. transcript fetch는 실패했다. slides, code, paper, repo folder는 missing이다.

GPU Mode의 다른 강의보다 kernel 중심성은 낮아 보인다. 그래도 learning environment는 ML systems 관점에서 중요하다. RL은 model만으로 굴러가지 않는다. 환경 실행, state 수집, action 적용, reward 계산, logging, reproducibility가 모두 system이다.

## 2. 왜 Factorio인가

Factorio는 단순한 grid world가 아니다. 자원, 제작, 운송, 계획, 장기 목표가 얽힌다. 이런 환경은 agent가 짧은 반응만 잘해서는 해결하기 어렵고, planning과 tool use, long-horizon credit assignment를 요구할 수 있다.

하지만 이 문단은 Factorio 일반 특성에 대한 설명이지, 강의가 실제로 무엇을 보여줬다는 claim은 아니다. 원본을 볼 때는 Factorio Learning Environment가 어떤 task abstraction을 제공하는지, observation과 action space가 어떻게 정의되는지 확인해야 한다.

:::figure flow
label: Figure · RL environment를 system으로 볼 때의 loop
- reset: 재현 가능한 초기 상태를 만든다
- observe: agent가 볼 수 있는 state를 구성한다
- act: action을 환경에 적용한다
- step: simulation을 진행하고 reward를 계산한다
- log: episode, failure, metric을 남겨 비교한다
:::

## 3. learning environment의 어려움

좋은 environment는 재미있는 task만 있으면 되는 것이 아니다. 빠르게 많이 돌릴 수 있어야 하고, deterministic replay가 가능해야 하며, failure를 분석할 수 있어야 한다. agent가 실패했을 때 "멍청해서"인지 "환경 wrapper가 이상해서"인지 구분할 수 있어야 한다.

복잡한 환경일수록 reward 설계도 조심스럽다. reward가 너무 촘촘하면 agent가 편법을 찾고, 너무 sparse하면 학습 신호가 약하다. benchmark로 쓰려면 task 난이도와 평가 metric도 명확해야 한다.

## 4. GPU Mode 독자가 볼 포인트

GPU kernel 강의는 아니지만, systems 독자에게는 throughput이 여전히 중요하다. RL/OpenEnv 계열 workload에서는 environment step이 병목인지, model inference가 병목인지, rollout storage가 병목인지 나눠 봐야 한다.

원본 강의를 볼 때는 환경이 local simulation인지, remote service인지, parallel rollout을 어떻게 지원하는지 확인하자. 또 language agent를 염두에 둔 환경인지, classic RL policy를 위한 환경인지에 따라 API 모양이 달라질 수 있다.

## 5. 혼자 해볼 것

간단한 toy environment를 하나 만들고, random policy로 초당 step 수를 재 보자. 그다음 observation serialization, reward 계산, logging을 하나씩 켜며 어디서 느려지는지 본다. RL 시스템은 종종 model보다 주변 배관에서 시간이 샌다.

원본을 볼 때는 demo의 멋짐보다 evaluation protocol을 보자. seed, task set, success metric, replay/debug tool이 있으면 환경은 연구 도구에 가까워진다.

## Source Links

- [YouTube](https://www.youtube.com/watch?v=iXvYa2oIMbA)
- Local notes: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/notes/lecture_085.md`
- Local transcript stub: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/transcripts/lecture_085.md`
