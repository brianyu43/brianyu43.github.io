---
num: 79
title: Mirage와 mega-kernel, launch를 줄이는 더 큰 질문
original: "Lecture 79 Mirage (MPK): Compiling LLMs into Mega Kernels"
speaker: Mengdi Wu, Xinhao Cheng
part: 6
part_label: Part VI · DSL·정확성·새 커널 모델
priority: High
status: partial
---

:::crux
이 강의는 transcript가 실패했고, 확인된 자료는 제목, speaker, YouTube, Mirage repo, slide PDF 링크다. 그래서 핵심 질문도 정직하게 좁혀 잡는다. **LLM 실행을 많은 작은 kernel의 줄로 볼 것인가, 아니면 더 큰 mega-kernel로 컴파일할 수 있는 프로그램으로 볼 것인가?** 구체적인 알고리즘과 성능 수치는 원본 slide와 repo 확인이 필요하다.
:::

## 1. 지금 확인된 자료

local notes에는 Mengdi Wu와 Xinhao Cheng이 speaker로 기록되어 있다. 자료 링크로는 GPU Mode YouTube, `lecture_079/Mirage-2025-09-13.pdf`, 그리고 `mirage-project/mirage` repo가 있다. transcript는 공개 caption 경로에서 가져오지 못했다.

따라서 이 reader는 Mirage의 내부 구현을 단정하지 않는다. "MPK", "mega-kernel", "Compiling LLMs"라는 제목이 가리키는 설계 질문을 읽기 지도처럼 정리한다. 성능 배수, 지원 model, compiler pass 이름 같은 것은 slide나 repo에서 직접 확인해야 한다.

## 2. 왜 mega-kernel인가

LLM inference나 training path는 많은 operator로 이뤄진다. operator마다 kernel을 따로 launch하고 intermediate tensor를 memory에 남기면, 계산 자체보다 launch overhead와 memory 왕복이 눈에 띌 수 있다. fusion은 이 비용을 줄이려는 오래된 전략이다.

mega-kernel이라는 말은 그 fusion의 범위를 더 크게 상상하게 만든다. 단순히 `bias + activation`을 붙이는 정도가 아니라, LLM의 여러 단계가 한 kernel 안에서 이어질 수 있는지 묻는 것이다. 이 질문은 멋있지만 위험하다. kernel이 커질수록 register pressure, shared memory 사용, occupancy, scheduling이 모두 어려워진다.

:::figure flow
label: Figure · many kernels에서 mega-kernel로 생각 바꾸기
- graph: LLM operator graph를 dependency가 있는 프로그램으로 본다
- boundary: kernel launch와 memory materialization이 생기는 경계를 찾는다
- fusion: 합칠 수 있는 연산과 합치면 안 되는 연산을 나눈다
- codegen: 하나의 큰 kernel 또는 적은 수의 kernel로 낮춘다
- verify: PyTorch reference와 numerics를 다시 비교한다
:::

## 3. compiler가 해야 하는 일

"컴파일해서 mega-kernel을 만든다"는 말은 사람이 손으로 긴 CUDA 파일을 쓰는 것과 다르다. compiler는 graph 수준의 의존성, tile 수준의 data reuse, thread/block 수준의 mapping을 함께 봐야 한다. 하나만 잘해도 전체가 빠르지 않을 수 있다.

이 지점에서 Mirage를 볼 때의 질문은 단순하다. search space를 어떻게 제한하는가? 후보 kernel이 맞는지 어떻게 검증하는가? dynamic shape나 여러 batch size가 들어오면 어떻게 대응하는가? notes에는 이 답이 없다. 하지만 repo와 slide를 읽을 때는 이 세 질문을 들고 들어가면 길을 덜 잃는다.

## 4. 성능보다 먼저 correctness

큰 fusion은 debugging을 어렵게 만든다. 작은 kernel 여러 개라면 중간 tensor를 찍어 볼 수 있지만, mega-kernel은 중간 상태가 kernel 안에 숨어 있을 수 있다. 그래서 reference implementation과의 비교, dtype별 tolerance, edge shape test가 더 중요해진다.

LLM 쪽에서는 "거의 맞는" 출력도 문제다. low precision, softmax, normalization, quantization이 섞이면 오차가 어디서 커지는지 찾기 어렵다. Mirage repo를 직접 만진다면 첫 실험은 speedup table이 아니라 작은 model 또는 작은 tensor에서 correctness envelope를 만드는 편이 낫다.

## 5. 혼자 해볼 것

작은 MLP block을 PyTorch eager로 만들고, `torch.compile` 또는 Triton kernel fusion이 어디까지 합쳐 주는지 관찰해 보자. profiler timeline에서 kernel launch 개수와 memory traffic을 먼저 본다. 그다음 "이 경계를 하나 더 없애려면 어떤 정보가 필요할까?"라고 적어 본다.

Mirage를 읽을 때는 repo의 hello world, 지원하는 model/operator, generated code를 찾자. slide에 benchmark가 있다면 input shape, hardware, baseline, compile time을 같이 적는다. mega-kernel은 빠른 숫자 하나보다 "어떤 조건에서 가능한가"가 더 중요하다.

## Source Links

- [YouTube](https://www.youtube.com/watch?v=sXDdRCy137c)
- [Slides folder](https://github.com/gpu-mode/lectures/tree/main/lecture_079)
- [Slides PDF](https://github.com/gpu-mode/lectures/blob/main/lecture_079/Mirage-2025-09-13.pdf)
- [Code · mirage-project/mirage](https://github.com/mirage-project/mirage)
- Local notes: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/notes/lecture_079.md`
- Local transcript stub: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/transcripts/lecture_079.md`
