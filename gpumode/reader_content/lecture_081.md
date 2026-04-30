---
num: 81
title: Functional arrays, 순수한 식이 GPU code가 되기까지
original: "Lecture 81: High-performance purely functional data-parallel array programming"
speaker: Troels Henriksen
part: 6
part_label: Part VI · DSL·정확성·새 커널 모델
priority: Low
status: partial
---

:::crux
archive record는 speaker가 Troels Henriksen이라는 점과 YouTube 링크를 제공하지만, captions/slides/code/papers는 비어 있다. 따라서 특정 언어, compiler, benchmark를 이 강의의 내용으로 확정하지 않는다. 여기서의 질문은 **purely functional array programming이 mutation을 줄인 표현을 유지하면서 GPU가 원하는 parallel work와 memory locality로 어떻게 내려갈 수 있는가**다.
:::

## 1. 세 단어만 확실하다

제목에서 확실히 보이는 단어는 `purely functional`, `data-parallel`, `array programming`이다. 이 조합은 고수준 array expression과 compiler lowering을 떠올리게 한다.

하지만 어떤 system을 다뤘는지는 아직 모른다. Futhark 같은 특정 언어를 말했을 수도 있고, 더 넓은 array programming 관점을 말했을 수도 있다. source가 없는 이름은 예로만 다루고 강의 내용으로 쓰지 않는다.

## 2. functional array가 GPU에 던지는 약속

GPU programming은 흔히 index, memory, mutation을 직접 다루는 일처럼 보인다. functional array style은 계산을 map, reduce, scan, stencil 같은 transformation으로 표현하려 한다.

그 약속은 compiler가 더 큰 식을 보고 fusion, parallelization, memory planning을 할 수 있다는 데 있다. 하지만 약속은 구현이 아니다. 실제 성능은 expression을 어떤 schedule과 tile, memory movement로 낮추는지에 달려 있다.

:::figure flow
label: Figure · array expression이 kernel이 되는 길
- expression: map/reduce/scan 같은 고수준 식을 적는다
- fusion: 중간 array materialization을 줄일 수 있는지 본다
- schedule: parallel work 분해와 tile shape를 정한다
- memory: global/shared/register 사용을 배치한다
- codegen: GPU code를 만들고 사람이 성능을 확인한다
:::

## 3. 순수함은 비용을 없애지 않는다

side effect가 적으면 의미는 깨끗해진다. race condition을 줄이고 compiler reasoning을 돕는 장점도 있다. 하지만 GPU 비용은 사라지지 않는다. memory traffic, synchronization, occupancy, register pressure는 여전히 계산서에 남는다.

좋은 functional array system은 사용자가 성능을 전혀 보지 않아도 되는 마법이 아니다. 오히려 깨끗한 의미를 유지하면서 필요한 곳에서는 schedule이나 layout에 개입할 수 있어야 한다.

## 4. 원본에서 표시할 포인트

강의를 볼 때는 먼저 primitive set을 적는다. map/reduce/scan만 다루는지, scatter/gather와 irregular indexing을 어떻게 표현하는지, in-place update가 필요한 알고리즘을 어떤 식으로 바꾸는지 본다.

다음은 inspection이다. generated kernel이나 IR을 볼 수 있는가. benchmark가 있다면 handwritten CUDA, Triton, vendor library, 또는 다른 DSL 중 무엇과 비교했는가. 이 비교 대상이 빠지면 "high-performance"라는 말이 떠 있게 된다.

## 5. 작은 실험감

`y = reduce(x * x + 1)` 같은 계산을 떠올려 보자. eager execution에서는 곱, 더하기, reduce가 각각 중간 tensor를 만들 수 있다. fused expression에서는 중간 값을 memory에 쓰지 않고 지나갈 가능성이 있다.

이 손실험의 목적은 특정 framework를 평가하는 것이 아니다. 고수준 식이 실제 memory traffic으로 바뀌는 순간을 보는 것이다. 원본 강의가 어떤 예제를 쓰는지는 영상을 보고 나서만 채운다.

## Source Links

- [YouTube](https://www.youtube.com/watch?v=dFxO1Wb5-eY)
- Local notes: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/notes/lecture_081.md`
- Local transcript stub: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/transcripts/lecture_081.md`
