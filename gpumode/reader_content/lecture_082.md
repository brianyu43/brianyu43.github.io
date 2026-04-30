---
num: 82
title: Helion, ML kernel DSL이 높아져도 남는 일
original: "Lecture 82 Helion: A high-level DSL for ML kernels"
speaker: Jason Ansel, Oguz Ulgen, Will Feng
part: 6
part_label: Part VI · DSL·정확성·새 커널 모델
priority: High
status: partial
---

:::crux
Helion의 syntax, compiler design, benchmark는 archive에 남아 있지 않다. 그래서 이 글은 Helion을 소개한다고 우기지 않고, **high-level ML kernel DSL을 볼 때 놓치기 쉬운 질문**을 세운다. 코드가 쉬워지는 만큼, tiling과 memory movement를 누가 책임지는지 더 또렷하게 물어야 한다.
:::

## 1. 지금 확인된 자료

local notes에는 Jason Ansel, Oguz Ulgen, Will Feng이 speaker로 기록되어 있고 YouTube 링크만 있다. transcript는 실패했고, slides/code/paper/repo folder는 missing이다.

그래서 이 장은 Helion 소개를 흉내 내지 않는다. "high-level DSL for ML kernels"라는 제목을 읽는 데 필요한 질문표를 만든다. DSL은 코드가 짧아지는 도구이기도 하지만, 더 깊게는 성능 지식을 어떤 형태로 표현할지 정하는 언어다.

## 2. high-level의 약속

ML kernel을 직접 쓰는 일은 반복적인 괴로움이 있다. shape, stride, dtype, mask, vectorization, tile size, memory hierarchy를 모두 챙겨야 한다. high-level DSL은 이 중 일부를 compiler와 runtime에 맡기고, programmer가 operation의 의도를 더 크게 쓰게 하려 한다.

하지만 GPU에서 high-level은 공짜가 아니다. abstraction이 높아질수록 compiler가 더 많은 결정을 대신 해야 한다. 좋은 결정이면 생산성과 성능을 함께 얻는다. 나쁜 결정이면 사용자는 예쁜 코드로 느린 kernel을 얻게 된다. 예쁘게 망하면 디버깅이 더 서럽다.

:::figure ladder
label: Figure · ML kernel DSL이 숨기거나 드러내는 층
- semantics: tensor operation의 의미와 shape contract
- layout: contiguous, stride, tile layout, alignment
- schedule: program/block/thread에 work를 나누는 방식
- memory: global, shared, register 사이의 이동
- tuning: hardware와 shape별 parameter search
:::

## 3. DSL의 진짜 시험대

ML kernel DSL은 elementwise 예제에서는 좋아 보이기 쉽다. 진짜 시험은 attention, normalization, quantization, matmul epilogue, ragged shape처럼 실제 workload의 지저분함을 만날 때다. 여기서 DSL이 너무 좁으면 production에 못 들어간다.

또 하나의 시험은 fallback과 inspection이다. kernel이 느리거나 틀렸을 때 generated code, IR, profiler trace를 볼 수 있어야 한다. high-level DSL이 black box가 되면 성능 엔지니어는 답답해진다. 좋은 도구는 높은 문과 낮은 지하실을 둘 다 갖고 있다.

## 4. Helion을 볼 때의 질문

원본 강의를 볼 때는 Helion이 어떤 사용자를 겨냥하는지 확인하자. CUDA 전문가의 반복 작업을 줄이는 도구인지, PyTorch 사용자에게 kernel authoring을 열어 주는 도구인지, compiler 연구 플랫폼인지에 따라 좋은 설계가 달라진다.

그다음 실제 예제를 본다. DSL syntax가 어떤 정보를 요구하는가? autotuning을 제공하는가? PyTorch tensor와 어떻게 연결되는가? correctness test는 어떻게 쓰는가? notes에는 답이 없지만, 이 질문들은 강의를 보는 동안 곁에 둘 만하다.

## 5. 혼자 해볼 것

작은 layernorm이나 fused bias-GELU를 하나 골라 CUDA, Triton, 가능한 high-level DSL 스타일 pseudo-code로 나란히 써 보자. 코드 길이보다 "성능에 필요한 정보를 어디에 적는가"를 비교한다.

Helion 자료를 볼 때는 benchmark 표가 나오면 바로 믿지 말고, shape와 baseline을 같이 적는다. DSL은 언어라서, 최고의 예문보다 어색한 문장을 어떻게 처리하는지가 더 중요하다.

## Source Links

- [YouTube](https://www.youtube.com/watch?v=MBOPzfl1JBo)
- Local notes: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/notes/lecture_082.md`
- Local transcript stub: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/transcripts/lecture_082.md`
