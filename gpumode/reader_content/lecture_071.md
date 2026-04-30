---
num: 71
title: FlexOlmo, data를 섞지 않고 함께 학습하기
original: "Lecture 71: [ScaleML Series] FlexOlmo: Open Language Models for Flexible Data Use"
speaker: Sewon Min
part: 5
part_label: Part V · 추론·학습·통신 스케일
priority: High
status: partial
---

:::crux
transcript는 없지만 slide PDF가 있다. FlexOlmo의 핵심 질문은 **여러 party가 각자 가진 dataset을 중앙으로 모으지 못할 때, MoE 구조를 이용해 open language model training을 어떻게 더 유연하게 만들 수 있는가**다. 강의의 실제 설명 순서는 확인 필요지만, slide는 distributed data ownership과 MoE merging을 주요 축으로 둔다.
:::

## 1. 지금 확인된 자료

local notes에는 speaker가 Sewon Min으로 기록되어 있고, GitHub lecture folder와 `ScaleML_FlexOlmo.pdf`가 있다. transcript와 code는 없다. slide 첫 부분은 standard MoE가 보통 training/inference efficiency를 위해 쓰이지만, 이 talk에서는 서로 다른 party가 소유한 distributed dataset에 학습을 가능하게 하는 방향을 다룬다고 소개한다.

slide에는 centralized data access가 현실에서는 binary가 아니며, data가 later available이 되거나 sharing restriction을 가질 수 있다는 문제의식이 보인다. 따라서 이 노트는 FlexOlmo를 "더 빠른 MoE"보다 "data 사용 조건을 model architecture에 반영하려는 시도"로 읽는다.

## 2. data access는 현실에서 지저분하다

언어모델 학습 설명은 종종 모든 data가 한 bucket에 들어 있다고 가정한다. 현실에서는 그렇지 않다. public data와 proprietary data가 나뉘고, 어떤 data는 공유할 수 없고, 어떤 data는 나중에 생긴다. 중앙 학습을 기본값으로 두면 이런 조건은 모두 예외 처리가 된다.

FlexOlmo가 흥미로운 이유는 이 예외를 architecture 문제로 끌고 들어온다는 점이다. data owner가 raw data를 직접 공유하지 않고도 contribution을 만들 수 있다면, open model 생태계의 협업 방식도 달라질 수 있다.

:::figure flow
label: Figure · FlexOlmo를 읽는 큰 그림
- public base: 공유 가능한 data로 공통 model 또는 shared part를 만든다
- siloed data: 각 party가 자기 data 조건 안에서 expert를 학습한다
- MoE merging: expert를 합쳐 flexible model로 구성한다
- opt-out: 특정 expert나 data contribution을 나중에 제외할 수 있는지 본다
- evaluation: 전체 성능과 domain별 성능을 따로 확인한다
:::

## 3. MoE가 여기서 하는 일

MoE는 보통 parameter를 많이 두되 token마다 일부 expert만 쓰는 efficiency 구조로 소개된다. FlexOlmo slide는 MoE를 data ownership 문제에도 적용하려 한다. 각 dataset 또는 party의 contribution을 expert처럼 다루면, data를 합치지 않고도 model을 구성하거나 나중에 특정 contribution을 빼는 상상을 할 수 있다.

물론 "expert를 합치면 된다"는 말은 쉽고, 실제 training은 어렵다. routing, expert specialization, shared representation, merging 후 interference, opt-out 후 성능 변화가 모두 문제가 된다. slide에는 news data expert를 opt-out하는 결과가 언급되지만, 그 조건과 metric은 PDF 본문에서 다시 확인해야 한다.

## 4. GPU/시스템 독자에게 중요한 연결점

MoE는 algorithm만의 문제가 아니다. expert가 늘어나면 routing, all-to-all communication, memory placement, batching이 시스템 병목이 된다. FlexOlmo가 data flexibility를 얻기 위해 MoE를 쓴다면, 그 flexibility가 training과 serving cost를 어떻게 바꾸는지도 함께 봐야 한다.

특히 distributed data owner가 각자 expert를 학습하는 구조라면 checkpoint format, compatibility, tokenizer, optimizer state, evaluation protocol도 중요해진다. 좋은 architecture idea가 실제 open model workflow로 내려오려면 이런 지루한 부분까지 맞아야 한다.

## 5. 혼자 해볼 것

작은 toy corpus 세 개를 domain별로 나누고, "이 domain을 나중에 opt-out해야 한다"는 조건을 붙여 보자. dense model 하나를 학습하는 경우와 expert별로 분리하는 경우를 diagram으로 비교하면 FlexOlmo의 문제의식이 선명해진다.

원본 slides를 볼 때는 FlexOlmo가 해결하려는 policy problem과 model problem을 분리해서 적자. data governance와 GPU efficiency를 한 문장에 섞으면 멋져 보이지만, debugging은 훨씬 어려워진다.

## Source Links

- [YouTube](https://www.youtube.com/watch?v=KorF7Xpozhg)
- [Slides folder](https://github.com/gpu-mode/lectures/tree/main/lecture_071)
- [Slides PDF](https://github.com/gpu-mode/lectures/blob/main/lecture_071/ScaleML_FlexOlmo.pdf)
- [ScaleML Bootcamp](https://scale-ml.org/bootcamp/)
- [Speaker site](https://www.sewonmin.com)
- Local notes: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/notes/lecture_071.md`
- Local transcript stub: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/transcripts/lecture_071.md`
