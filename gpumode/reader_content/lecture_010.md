---
num: 10
title: 제품용 CUDA 라이브러리 만들기
original: "Lecture 10: Build a Prod Ready CUDA library"
speaker: Oscar Amoros Huguet
part: 1
part_label: Part I · 측정과 CUDA 기초
priority: High
status: rich
---

:::crux
production CUDA는 빠른 kernel 하나로 끝나지 않는다. CUDA를 모르는 팀원도 쓸 수 있는 abstraction, host-side scheduling, stream, memory management, latency hiding까지 묶어야 비로소 라이브러리가 된다.
:::

## 1. CUDA ninja 혼자서는 제품이 안 된다

Oscar의 출발점은 경험적이다. CUDA kernel을 좋아하고 잘 쓰는 사람은 팀에 필요하다. 하지만 real application에서는 그 사람이 모든 호출 지점을 직접 붙잡고 있을 수 없다.

그래서 목표는 "모두를 CUDA ninja로 만들기"가 아니라, CUDA를 모르는 사용자도 좋은 성능을 얻을 수 있는 라이브러리를 제공하는 것이다. abstraction은 여기서 성능의 적이 아니라 배포의 조건이 된다.

물론 abstraction은 공짜가 아니다. 너무 높은 abstraction은 성능과 제어를 잃고, 너무 낮은 abstraction은 사용자에게 CUDA 세부사항을 떠넘긴다. production library는 이 중간 지점을 찾는 일이다.

## 2. host side가 먼저 보인다

CUDA 최적화라고 하면 kernel 내부만 떠올리기 쉽다. 하지만 Oscar는 실제 application에서는 host side code를 먼저 보아야 한다고 말한다. CPU thread가 GPU에 일을 어떻게 enqueue하는지, 어디서 synchronize되는지, memory allocation이 어디서 block되는지가 중요하다.

stream을 쓰면 copy와 compute를 겹칠 수 있다. 하지만 stream을 쓴다고 자동으로 overlap이 생기지는 않는다. dependency와 synchronization 지점이 잘못되면 CPU도 GPU도 기다린다.

production 환경에서는 allocation도 신경 써야 한다. 반복 루프 안에서 매번 GPU memory를 할당하고 해제하면 latency가 튄다. memory manager나 buffer pool이 필요한 이유다.

:::figure flow
label: Figure · 라이브러리가 숨겨야 하는 복잡도
- stage: 사용자는 익숙한 API로 일을 요청한다.
- stage: 라이브러리는 buffer를 확보하고 stream에 작업을 배치한다.
- stage: copy, kernel execution, 후속 copy를 가능한 한 겹친다.
- stage: iteration 끝에서는 필요한 지점만 synchronize한다.
- stage: 다음 iteration은 준비된 buffer를 재사용한다.
:::

## 3. vertical fusion과 horizontal fusion

강의는 fusion을 kernel 내부 수식 합치기보다 더 넓게 다룬다. vertical fusion은 producer와 consumer 사이의 latency를 줄이는 방향이다. 한 단계의 output을 다음 단계가 바로 소비하게 만들어 memory 왕복이나 기다림을 줄인다.

horizontal 또는 concurrent fusion은 독립적인 작업들을 동시에 진행해 자원을 더 잘 채우는 쪽에 가깝다. 여러 stream, 여러 copy, 여러 kernel을 어떻게 겹칠지 보는 문제다.

이 구분은 유용하다. 어떤 병목은 memory-bound kernel 자체에 있고, 어떤 병목은 host scheduling이나 stream dependency에 있다. 둘을 같은 "fusion"이라는 말로 뭉개면 처방이 흐려진다.

## 4. producer-consumer와 delay buffer

강의 후반의 중요한 그림은 producer-consumer model이다. producer가 데이터를 만들고 consumer가 사용한다. 목표는 consumer가 producer를 기다리지 않게 하고, producer도 빈 buffer를 기다리지 않게 하는 것이다.

이를 위해 여러 buffer를 돌려 쓰는 방식이 나온다. 어떤 pointer는 몇 iteration 전에 synchronize되어 이제 안전하게 재사용할 수 있다. Oscar는 이런 delay buffer 개념으로 stream 작업의 pipeline을 만든다.

이 방식은 단순한 double buffering보다 일반적이다. real-time 또는 soft real-time application에서는 latency spike를 줄이고 일정한 처리 흐름을 만드는 것이 중요하다. kernel time만 빠른 것과 제품이 부드럽게 도는 것은 다르다.

## 5. Python binding은 사용성을 넓힌다

강의는 C++/CUDA 중심이지만 Python 사용자도 염두에 둔다. 딥러닝 쪽 사용자의 상당수는 Python에서 작업하므로, 라이브러리가 Python에서 접근 가능해야 더 넓게 쓰인다.

다만 Python binding은 얇은 포장이어야 한다. performance-critical path는 C++/CUDA 쪽에서 관리하고, Python은 configuration과 high-level 호출을 맡는 편이 좋다.

여기서 API 설계가 중요해진다. 사용자가 CUDA stream과 buffer lifetime을 전부 알아야 한다면 라이브러리라고 부르기 어렵다. 하지만 필요할 때 advanced user가 제어할 수 있는 escape hatch는 남겨야 한다.

## 6. production-ready의 뜻

이 강의에서 production-ready는 "벤치마크가 빠르다"보다 넓다. 설치와 빌드가 가능하고, 사용자 API가 안정적이고, memory와 stream lifetime이 안전하며, profiling 가능한 구조를 갖춘 상태에 가깝다.

CUDA kernel 개발자는 종종 device code에 애정을 많이 준다. 그 마음은 이해된다. 하지만 제품에서는 host code, packaging, logging, error handling, synchronization policy가 같은 무게로 중요해진다.

:::tip
작은 CUDA library를 만들 때 API를 먼저 한 줄로 써 보자. "CUDA를 모르는 동료가 이 함수를 어떻게 부를까?"를 정하면 stream과 buffer 설계도 덜 흔들린다.
:::

## Source Links

- [YouTube](https://www.youtube.com/watch?v=FHsEW0HpuoU)
- [Slides folder](https://drive.google.com/drive/folders/158V8BzGj-IkdXXDAdHPNwUzDLNmr971_?usp=sharing)
- [Code / speaker GitHub](https://github.com/morousg)
- Local notes: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/notes/lecture_010.md`
- Local transcript: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/transcripts/lecture_010.md`
