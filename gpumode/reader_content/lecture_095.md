---
num: 95
title: "Monarch와 single controller programming"
original: "Lecture 95: Single controller programming with Monarch"
speaker: "Allen Wang and Colin Taylor"
part: 7
part_label: Part VII · 시스템 실전과 최신 주제
priority: Medium
status: partial
---

:::crux
이 노트는 transcript, slides, code가 없는 자료가 제한된 노트다. 지금 붙잡을 수 있는 핵심 질문은 **분산 ML 프로그램을 여러 process의 조각난 관점이 아니라 하나의 controller 관점에서 쓰면 무엇이 쉬워지고 무엇이 위험해지는가**다. Monarch의 실제 programming model은 원본 확인이 필요하다.
:::

## 1. 자료 상태

local notes에는 speaker가 Allen Wang and Colin Taylor로 기록되어 있고 YouTube link만 있다. transcript fetch는 실패했고 slides/code/paper/repo folder는 없다. Monarch가 어떤 project의 어떤 version인지, PyTorch distributed와 어떤 관계인지도 이 자료만으로는 말할 수 없다.

그래서 여기서는 single controller programming이라는 문구를 중심으로 읽는다. distributed training/serving에서는 "누가 전체를 보고 있는가"가 API의 모양을 크게 바꾼다.

## 2. single controller가 던지는 약속

전통적인 SPMD 스타일에서는 각 rank가 같은 program을 실행하고, rank id에 따라 다른 일을 한다. 이 방식은 강력하지만 debugging할 때 머리가 쉽게 둘로, 넷으로, 여덟으로 갈라진다. log도 rank마다 나오고, failure도 rank마다 다르게 보인다.

single controller programming은 사용자가 하나의 driver 관점에서 여러 worker/device를 조작하게 만들겠다는 약속처럼 읽힌다. tensor나 actor가 remote에 있어도, 코드는 더 중앙집중적인 control flow로 표현될 수 있다.

:::figure flow
label: Figure · single controller식 분산 프로그램의 mental model
- controller: 전체 작업 그래프와 control flow를 잡는다
- placement: tensor, module, task가 어느 device나 worker에 놓일지 정한다
- remote_exec: worker가 실제 compute와 communication을 수행한다
- sync_points: 결과, exception, barrier가 controller 관점으로 돌아온다
- observability: 실패와 profiling 정보가 한 곳에서 해석되어야 한다
:::

## 3. 쉬워지는 것과 어려워지는 것

쉬워지는 것은 orchestration이다. 여러 machine에 model shard를 놓고, pipeline stage를 만들고, evaluation job을 섞는 일을 한 파일에서 표현할 수 있다면 생산성이 좋아진다. 특히 연구 code는 control flow가 자주 바뀌기 때문에 이런 장점이 크다.

어려워지는 것은 illusion management다. 코드가 하나처럼 보인다고 실행도 하나처럼 단순해지는 것은 아니다. remote call latency, data movement, failure propagation, partial retry, backpressure는 여전히 존재한다. API가 이것들을 너무 숨기면 예쁜 code가 느린 system이 된다.

## 4. GPU 시스템에서 중요한 경계

분산 ML의 병목은 compute만이 아니다. activation transfer, parameter shard movement, optimizer state, checkpoint IO, collective communication이 섞인다. single controller가 이런 비용을 어떻게 드러내는지가 중요하다.

또한 scheduling 결정이 controller에 몰리면 편하지만, 너무 세밀한 작업까지 controller가 지시하면 overhead가 커질 수 있다. 반대로 worker에 많은 자율성을 주면 programming model이 다시 복잡해진다. 좋은 설계는 어느 층에서 결정을 고정하고 어느 층에서 지연할지 조심스럽게 고른다.

## 5. 원본을 볼 때의 체크리스트

Monarch가 tensor abstraction인지, actor/runtime인지, distributed execution engine인지 먼저 확인하자. API 예제가 있다면 remote tensor가 local tensor처럼 보이는지, placement annotation이 명시적인지, async/future가 어떻게 표현되는지 보자.

failure case도 중요하다. 한 worker가 죽었을 때 controller는 어떤 exception을 보는가. collective가 hang 되면 어떻게 끊는가. debug trace가 rank별로 흩어지는가, 아니면 controller view로 재구성되는가. 이런 부분이 lecture의 진짜 실전성을 가른다.

## 6. 혼자 해볼 것

PyTorch distributed나 Ray 같은 도구로 아주 작은 2-worker job을 만들고, SPMD 스타일과 controller 스타일 pseudo-code를 나란히 써 보자. 같은 all-reduce나 remote matmul을 표현해도 어떤 정보가 보이고 숨는지 비교한다.

그다음 deliberately failure를 넣어 본다. 한 worker에서 exception을 내고, controller가 어떤 stack trace를 보는지 기록하자. 분산 programming model은 정상 경로보다 실패 경로에서 성격이 드러난다.

## Source Links

- [YouTube](https://www.youtube.com/watch?v=PO3CN3UYx7w)
- Local notes: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/notes/lecture_095.md`
- Local transcript stub: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/transcripts/lecture_095.md`
