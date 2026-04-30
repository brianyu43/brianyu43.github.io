---
num: 84
title: numerics, AI가 숫자를 대하는 태도
original: "Lecture 84: Numerics and AI"
speaker: Paulius Micikevicius
part: 6
part_label: Part VI · DSL·정확성·새 커널 모델
priority: Low
status: partial
---

:::crux
transcript는 실패했지만 slide PDF 링크는 있다. notes만으로 확인되는 핵심 질문은 **AI system에서 numerics를 성능의 부록이 아니라 correctness와 model quality의 중심 문제로 다루는 법**이다. 구체적인 format, chart, NVIDIA 권장사항은 `numerics-and-ai.pdf`를 직접 확인해야 한다.
:::

## 1. 지금 확인된 자료

local notes에는 speaker가 Paulius Micikevicius로 기록되어 있고 YouTube와 `lecture_084/numerics-and-ai.pdf` 링크가 있다. code와 transcript는 없다.

Paulius Micikevicius라는 이름 때문에 mixed precision이나 AI numerics를 떠올릴 수 있지만, 이 노트에서는 notes가 확인해 준 범위를 넘지 않는다. 다만 numerics라는 주제 자체는 GPU Mode 독자에게 아주 중요하다. 빠른 kernel이 틀린 숫자를 만들면, 빠르게 틀릴 뿐이다.

## 2. AI에서 숫자는 계산 결과만이 아니다

AI workload는 floating point format의 영향을 크게 받는다. FP32, TF32, FP16, BF16, FP8 같은 선택은 memory bandwidth, Tensor Core throughput, overflow/underflow, training stability와 얽힌다. inference에서도 quantization과 accumulation precision이 output quality에 영향을 준다.

numerics를 성능 튜닝 뒤에 붙이는 체크박스로 보면 위험하다. kernel을 설계할 때부터 어떤 값이 큰 dynamic range를 갖는지, 어디서 accumulation이 일어나는지, loss scaling이나 normalization이 필요한지 생각해야 한다.

:::figure ladder
label: Figure · AI numerics를 점검하는 순서
- range: 값의 크기와 outlier가 어디서 생기는지 본다
- format: 저장 format과 accumulate format을 분리해서 생각한다
- operation: matmul, softmax, normalization처럼 민감한 지점을 찾는다
- tolerance: task와 dtype에 맞는 error 기준을 둔다
- quality: kernel error가 model metric으로 번지는지 확인한다
:::

## 3. 낮은 precision의 약속과 비용

낮은 precision은 memory traffic을 줄이고 Tensor Core를 더 잘 쓰게 해 준다. 그래서 AI system에서 매력적이다. 하지만 낮은 precision은 표현 가능한 숫자의 범위와 간격을 바꾼다. 작은 차이가 사라지거나, 큰 값이 overflow될 수 있다.

중요한 것은 format 이름을 외우는 게 아니다. 어떤 tensor를 낮은 precision으로 저장해도 되는지, 어떤 연산은 더 높은 precision으로 accumulate해야 하는지 구분하는 감각이다. 특히 softmax, reduction, optimizer state처럼 누적과 scale이 얽힌 곳은 조심해야 한다.

## 4. kernel 개발자가 볼 포인트

numerics는 framework 사용자만의 문제가 아니다. custom CUDA/Triton kernel을 쓰면 rounding, accumulation order, fast math option, atomic operation의 nondeterminism까지 직접 마주한다. reference와 비교할 때도 bitwise match만 고집할지, 상대/절대 오차를 어떻게 둘지 정해야 한다.

slide를 볼 때는 format별 장단점만 보지 말고, 실제 workflow를 찾자. training에서 어떤 test를 통과해야 하는가? inference에서 accuracy regression을 어떻게 잡는가? benchmark는 latency와 quality를 같이 보여 주는가? 숫자의 세계는 조용하지만, bug가 나면 아주 시끄럽다.

## 5. 혼자 해볼 것

작은 matmul과 softmax를 FP32, FP16, BF16으로 실행해 보고 FP32 reference와 비교해 보자. random input만 쓰지 말고 큰 값, 작은 값, 거의 같은 값이 섞인 input을 넣는다. error가 shape와 value range에 따라 어떻게 달라지는지 보는 것이 목표다.

원본 slide를 읽을 때는 "어떤 format이 빠르다"보다 "어떤 상황에서 안전한가"를 표시하자. 좋은 numerics 공부는 hardware 표와 model 품질 사이에 다리를 놓는다.

## Source Links

- [YouTube](https://www.youtube.com/watch?v=ua2NhlenIKo)
- [Slides folder](https://github.com/gpu-mode/lectures/tree/main/lecture_084)
- [Slides PDF](https://github.com/gpu-mode/lectures/blob/main/lecture_084/numerics-and-ai.pdf)
- Local notes: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/notes/lecture_084.md`
- Local transcript stub: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/transcripts/lecture_084.md`
