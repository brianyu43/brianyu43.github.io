---
num: 88
title: TinyTPU, 축소 모형으로 accelerator 읽기
original: "Lecture 88: TinyTPU"
speaker: William Zhang
part: 6
part_label: Part VI · DSL·정확성·새 커널 모델
priority: Low
status: partial
---

:::crux
archive에는 speaker William Zhang, YouTube 링크, caption fetch failure가 남아 있다. slides/code/papers/repo folder는 발견되지 않았다. TinyTPU가 simulator인지, HDL project인지, compiler tutorial인지 이 파일만으로는 알 수 없다. 그래서 핵심 질문은 **작은 TPU-like 대상이 accelerator의 dataflow, memory, compiler boundary를 배우는 축소 모형으로 어떻게 쓰일 수 있는가**다.
:::

## 1. Tiny가 무엇을 줄였는지 아직 모른다

`TinyTPU`라는 이름은 작고 교육적인 accelerator를 떠올리게 한다. 하지만 작다는 것이 hardware size인지, ISA인지, compiler stack인지, tutorial scope인지는 원본을 봐야 한다.

이 노트는 특정 구현을 설명하지 않는다. 대신 작은 accelerator 강의를 들을 때 어떤 질문을 던지면 구조가 보이는지 적는다. source가 보강되면 이 틀 위에 실제 설계와 예제를 올리면 된다.

## 2. 작은 accelerator가 좋은 교재가 되는 이유

대형 accelerator는 많은 층이 동시에 움직인다. systolic array, on-chip buffer, DMA, instruction scheduling, compiler tiling, host runtime이 한꺼번에 나온다.

작은 모형은 그 층을 손으로 따라갈 수 있게 만든다. 값이 array 안에서 어떻게 이동하는지, buffer가 왜 모자라는지, compiler가 왜 tile을 잘라야 하는지가 더 잘 보인다. GPU 독자에게도 이 dataflow 감각은 유용하다.

:::figure flow
label: Figure · TinyTPU류 강의를 읽는 경로
- operation: 어떤 tensor op를 빠르게 하려는지 본다
- array: MAC 구조와 dataflow 방향을 확인한다
- memory: input, weight, accumulator buffer를 구분한다
- compiler: tensor op가 tile과 instruction으로 낮아지는지 본다
- runtime: host가 data movement와 execution을 어떻게 지시하는지 적는다
:::

## 3. GPU와 비교할 때 조심할 점

GPU는 general-purpose parallel processor에 가깝고, TPU-like design은 matrix operation을 위한 dataflow를 앞에 두는 경우가 많다. 둘 다 병렬 계산을 하지만 programmer가 보는 손잡이가 다르다.

따라서 "GPU보다 빠른가"를 첫 질문으로 두면 놓치는 것이 많다. array 크기, supported dtype, buffer capacity, instruction granularity가 어떤 programming model을 강제하는지 먼저 봐야 한다.

## 4. compiler와 simulator의 자리

작은 accelerator라도 compiler가 없으면 사용하기 어렵다. tensor program을 tile로 나누고, memory에 맞게 배치하고, 실행 순서를 정해야 한다.

원본을 볼 때는 TinyTPU가 어떤 frontend를 받는지, IR이나 instruction stream을 보여 주는지, simulator가 cycle count나 memory traffic을 어떻게 드러내는지 확인한다. 이 정보가 있어야 "작다"가 단순한 장난감인지, 학습 가능한 system인지 판단할 수 있다.

## 5. 종이에 먼저 그려 보기

4x4 systolic array를 그리고 4x4 matrix multiply가 몇 cycle에 어떤 값들을 움직이는지 손으로 따라가 보자. weight-stationary나 output-stationary 같은 이름은 그 다음에 붙여도 늦지 않다.

원본에서는 speaker가 실제로 어떤 dataflow를 썼는지만 표시한다. 이 강의가 hardware, simulator, compiler 중 어디에 무게를 두는지는 아직 비워 둔다.

## Source Links

- [YouTube](https://www.youtube.com/watch?v=qCxuLIMycCc)
- Local notes: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/notes/lecture_088.md`
- Local transcript stub: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/transcripts/lecture_088.md`
