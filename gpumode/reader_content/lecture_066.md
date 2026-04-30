---
num: 66
title: Game Arena, 정적 benchmark 밖에서 reasoning 보기
original: "Lecture 66: Game Arena"
speaker: Lanxiang Hu
part: 5
part_label: Part V · 추론·학습·통신 스케일
priority: Low
status: partial
---

:::crux
이 원고는 transcript 없이 title, local notes, paper link에 근거한 source-limited 원고다. Game Arena의 핵심 질문은 **LLM의 reasoning을 고정된 문제집이 아니라 사람이 참여하는 live game 안에서 어떻게 관찰하고 평가할 것인가**다. kernel 강의는 아니지만, model evaluation을 시스템처럼 설계해야 한다는 점에서 GPU Mode 독자에게도 꽤 현실적인 주제다.
:::

## 1. 지금 확인된 자료

local notes에는 speaker가 Lanxiang Hu로 기록되어 있고, paper link는 `GameArena: Evaluating LLM Reasoning through Live Computer Games`다. transcript, slides, code, GPU Mode repo folder는 확인되지 않았다. 따라서 영상에서 실제로 어떤 demo, interface, 분석 chart를 설명했는지는 확인 필요다.

paper abstract 기준으로 GameArena는 static benchmark의 data contamination과 saturation 문제를 피하려는 dynamic benchmark다. 세 개의 game을 통해 deductive reasoning, inductive reasoning 같은 능력을 보려 하고, 사람과 LLM이 함께 참여하는 interaction log를 남긴다. paper abstract는 2000개가 넘는 game session, 100명 user study, 다섯 개 state-of-the-art LLM 평가를 언급하지만, 이 숫자의 조건과 세부 결과는 원문에서 다시 확인해야 한다.

## 2. benchmark를 "문제집"이 아니라 "환경"으로 보기

일반 benchmark는 입력과 정답이 고정되어 있다. 그래서 한 번 널리 알려지면 model이 실제로 reasoning을 잘하는지, benchmark distribution을 외웠는지 구분하기 어려워진다. Game Arena가 흥미로운 지점은 평가를 live environment로 옮긴다는 데 있다. model은 한 번 답하고 끝나는 것이 아니라, game state를 보고 다음 행동을 고른다.

이렇게 되면 평가 단위도 바뀐다. 최종 승패만 보는 것이 아니라, 중간 결정, 정보 갱신, 상대 행동에 대한 반응을 함께 봐야 한다. reasoning을 점수 하나로 납작하게 만드는 대신, 과정의 흔적을 남기려는 시도라고 읽으면 좋다.

:::figure flow
label: Figure · Game Arena를 읽는 흐름
- game state: 현재 board나 hidden information을 model과 사람이 본다
- action: model이 다음 수 또는 질문을 선택한다
- feedback: 환경과 상대가 상태를 바꾼다
- trace: 선택의 순서가 reasoning log처럼 남는다
- analysis: 최종 승패와 중간 결정을 함께 평가한다
:::

## 3. systems 관점에서 중요한 점

LLM evaluation도 결국 system design이다. 어떤 game을 고를지, 사람이 얼마나 개입할지, model에게 어떤 정보를 줄지, latency가 interaction quality에 영향을 주는지 모두 결과를 바꾼다. 특히 live game은 benchmark server, UI, logging, replay, privacy 같은 운영 문제가 따라온다.

GPU 성능 자체를 다루는 강의는 아니지만, inference serving과 연결되는 질문이 있다. model이 게임 중간에 여러 번 호출된다면 latency와 cost가 user engagement에 영향을 준다. reasoning benchmark가 커질수록 "좋은 prompt"만이 아니라 안정적인 serving pipeline도 평가의 일부가 된다.

## 4. 조심해서 읽을 부분

game benchmark는 재미있지만, 재미와 reasoning이 항상 같은 방향으로 움직이지는 않는다. 어떤 game은 전략보다 language fluency나 interface 적응력이 더 중요할 수 있다. 사람과 함께 하는 환경이라면 participant pool, instruction wording, session length도 결과에 섞인다.

그래서 원본을 볼 때는 세 가지를 적어 두자. 첫째, 세 game이 각각 어떤 reasoning 능력을 겨냥하는가. 둘째, LLM과 사람에게 주어진 정보가 같은가. 셋째, 분석이 win rate만 보는지, step-by-step decision도 보는지. 여기서 대충 넘어가면 benchmark가 예쁜 포스터가 되고, 읽는 사람은 아무것도 재현하지 못한다.

## 5. 혼자 해볼 작은 실험

작은 text game 하나를 골라 두 model에게 같은 state를 주고 다음 action을 고르게 해 보자. 중요한 것은 model이 이겼는지가 아니라, state 변화에 따라 이전 가정을 버리는지 기록하는 것이다. session log를 table로 만들면 reasoning benchmark가 왜 static QA보다 귀찮고, 동시에 왜 더 흥미로운지 바로 보인다.

이 강의는 자료가 보강되면 paper의 game design과 lecture demo 중심으로 다시 써야 한다. 지금 버전은 Game Arena를 과장하지 않고 읽기 위한 지도다.

## Source Links

- [YouTube](https://www.youtube.com/watch?v=Yb9MiSInuEs)
- [Paper](https://arxiv.org/abs/2412.06394)
- Local notes: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/notes/lecture_066.md`
- Local transcript stub: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/transcripts/lecture_066.md`
