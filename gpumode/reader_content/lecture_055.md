---
num: 55
title: Modular의 unified device accelerator language
original: "Lecture 55: Modular’s unified device accelerator language"
speaker: Unknown
part: 4
part_label: Part IV · 프로덕션 커널과 GEMM
priority: High
status: partial
---

:::crux
이 강의는 transcript가 없고, local notes에는 YouTube와 slide drive link만 있다. Modular의 실제 언어 설계나 예제는 확인되지 않았다. 그래도 제목이 묻는 질문은 선명하다. **여러 accelerator를 하나의 언어로 다루려 할 때, 편한 abstraction과 hardware-specific control 사이의 긴장을 어떻게 감당할 것인가**다.
:::

## 1. unified라는 말은 늘 양쪽으로 당긴다

`unified device accelerator language`는 매력적인 목표다. CPU, GPU, 다른 accelerator를 하나의 언어 모델로 표현하면 code reuse와 portability가 좋아질 수 있다. 하지만 accelerator 성능은 대개 device-specific detail에서 나온다.

transcript가 없어 Modular가 어떤 해법을 제시했는지는 확인되지 않는다. 이 reader는 따라서 Modular의 구체 syntax나 compiler path를 설명하지 않는다. 대신 unified language를 읽을 때 놓치기 쉬운 tradeoff를 정리한다.

## 2. portability는 공짜가 아니다

accelerator language가 portable하려면 memory hierarchy, parallelism, synchronization, vectorization, layout 같은 차이를 표현할 방법이 필요하다. 너무 추상화하면 성능을 잃고, 너무 세부적이면 unified라는 장점이 약해진다.

CUDA는 NVIDIA GPU에 깊이 붙어 있고, Triton은 tile-level tensor program을 Python스럽게 표현한다. Modular의 언어가 이 사이 어디에 놓이는지는 원본 강의에서 확인해야 한다. 어떤 층까지 사용자가 직접 말하고, 어떤 층부터 compiler가 맡는지가 핵심이다.

:::figure ladder
label: Figure · accelerator language가 선택하는 abstraction 층
- operation: matmul, convolution, reduction 같은 high-level op
- tile: block shape, layout, program mapping을 표현한다
- thread: lane, warp, synchronization을 직접 다룬다
- memory: register, shared/local, global movement를 제어한다
- backend: target별 codegen과 runtime으로 내려간다
:::

## 3. 언어 설계는 compiler 약속이다

device language는 문법만의 문제가 아니다. 사용자가 어떤 정보를 compiler에게 주고, compiler가 어떤 최적화를 약속하는지의 계약이다. shape가 static인지 dynamic인지, aliasing을 어떻게 다루는지, memory placement를 어떻게 표시하는지에 따라 가능한 최적화가 달라진다.

unified language라면 더 많은 계약이 필요하다. 한 target에서는 자연스러운 layout이 다른 target에서는 느릴 수 있다. compiler가 target별 rewrite를 해도 semantic은 유지되어야 한다. 이 지점에서 type system, IR, scheduling abstraction이 중요해진다.

## 4. 성능 주장은 baseline을 봐야 한다

이런 강의에서 benchmark가 나온다면 반드시 baseline을 확인해야 한다. hand-written CUDA와 비교하는가, vendor library와 비교하는가, PyTorch eager와 비교하는가, Triton과 비교하는가. 비교 대상에 따라 결론이 완전히 달라진다.

또 "unified"의 성공은 한 device에서 빠른 것만으로는 부족하다. 여러 target에서 같은 source가 얼마나 적게 바뀌는지, target-specific tuning hook은 얼마나 필요한지, debug와 profiling이 가능한지도 함께 봐야 한다.

## 5. 손으로 해볼 것

간단한 reduction kernel을 상상해 보자. CUDA에서는 thread block과 shared memory를 어떻게 쓸지, Triton에서는 block size와 mask를 어떻게 둘지, high-level tensor API에서는 어떤 op로 표현할지 각각 적어 본다.

그 다음 unified language가 이 세 표현 중 어디에 가까워야 할지 생각해 보자. 성능을 얻으려면 어떤 정보가 반드시 드러나야 하는지도 같이 적는다. 원본 강의를 볼 때 이 목록이 좋은 체크리스트가 된다.

## Source Links

- [YouTube](https://www.youtube.com/watch?v=5gPG7SXoBag)
- [Slides](https://drive.google.com/file/d/1pIVJDkohQUt1ZawQvzzR7Wi3cRmyE8Pa/view?usp=sharing)
- Local notes: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/notes/lecture_055.md`
- Local transcript stub: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/transcripts/lecture_055.md`
