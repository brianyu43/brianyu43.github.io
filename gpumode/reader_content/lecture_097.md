---
num: 97
title: "HipKittens, 이름이 귀여워도 portability는 진지하다"
original: "Lecture 97: HipKittens"
speaker: William Hu
part: 7
part_label: Part VII · 시스템 실전과 최신 주제
priority: Low
status: partial
---

:::crux
이 노트는 transcript, slides, code가 없는 자료가 제한된 노트다. 제목만 보면 HIP와 Kittens 계열 GPU kernel abstraction을 떠올릴 수 있지만, 실제 프로젝트 범위는 원본 확인이 필요하다. 핵심 질문은 **CUDA 중심 kernel idea를 다른 GPU stack으로 옮길 때 무엇이 그대로 가고 무엇이 다시 설계되어야 하느냐**다.
:::

## 1. 지금 확인된 자료

local notes에는 speaker가 William Hu로 기록되어 있고 YouTube link만 있다. transcript fetch는 실패했고 slides/code/paper/repo folder는 없다. HipKittens라는 이름의 정확한 repository, target hardware, supported operation은 이 자료만으로 알 수 없다.

그래서 이 글은 title에서 조심스럽게 읽을 수 있는 portability 문제를 중심으로 둔다. HIP는 AMD GPU programming stack과 관련된 이름으로 자주 쓰이고, Kittens라는 이름은 tile/register 중심 kernel abstraction을 떠올리게 한다. 하지만 여기서 구체 API를 지어내면 안 된다.

## 2. portability는 syntax 변환이 아니다

CUDA kernel을 HIP로 바꾸는 일은 함수 이름을 바꾸는 것으로 끝나지 않는다. warp와 wavefront 크기, memory hierarchy, vectorized load/store, matrix instruction, shared memory bank, compiler behavior가 다르다.

high-level abstraction이 있다면 이 차이를 감춰 주려 할 수 있다. 그러나 성능 kernel에서는 차이를 완전히 숨기는 순간 최적화 손잡이도 같이 사라질 수 있다. portability의 묘미는 "공통 개념"과 "hardware-specific escape hatch"의 균형이다.

:::figure flow
label: Figure · CUDA idea를 HIP 쪽으로 옮길 때 보는 층
- algorithm: attention, GEMM, reduction 같은 수학적 구조
- tiling: block, warp 또는 wave 단위의 작업 분할
- memory: global, shared/LDS, register reuse 전략
- instruction: matrix op, vector load, barrier primitive
- validation: correctness와 performance를 hardware별로 다시 확인
:::

## 3. Kittens류 abstraction을 읽는 포인트

tile abstraction은 kernel writer에게 큰 도움을 준다. register tile, shared memory tile, warp group 역할을 명시하면 code가 수학식과 hardware 사이 어딘가에서 읽힌다. 좋은 abstraction은 반복되는 boilerplate를 줄이고, layout 실수를 줄인다.

하지만 abstraction이 target hardware를 너무 NVIDIA식으로 가정하면 이식이 어렵다. 반대로 모든 hardware를 일반화하려다 보면 가장 중요한 fast path가 흐릿해진다. HipKittens가 흥미롭다면 아마 이 긴장 위에 있을 가능성이 높다.

## 4. correctness를 먼저 잡아야 한다

porting 작업에서는 "컴파일된다"와 "맞다"와 "빠르다"가 완전히 다른 단계다. dtype별 rounding, boundary mask, non-contiguous stride, alignment, odd shape에서 버그가 잘 난다.

특히 attention이나 matmul kernel은 작은 shape에서 우연히 맞고 큰 shape에서 틀릴 수 있다. reference implementation과 tolerance policy를 먼저 정해야 한다. 이 부분을 건너뛰면 benchmark 표가 모래 위에 선다.

## 5. 원본에서 확인할 질문

HipKittens가 어떤 upstream idea를 가져왔는지, target GPU가 무엇인지, 어떤 operation을 보여 주는지 확인하자. Flash attention, GEMM, convolution, reduction 중 무엇을 다루는지에 따라 읽는 렌즈가 달라진다.

또한 performance claim이 있다면 같은 hardware에서 vendor library와 비교했는지, CUDA version과 비교했는지, 아니면 portability 자체가 목표인지 분리해 보자. 이식성 강의에서 "느리다/빠르다"는 목표에 따라 다른 뜻을 가진다.

## 6. 혼자 해볼 것

아주 작은 vector add나 tiled matmul을 CUDA와 HIP pseudo-code로 나란히 써 보자. API 이름보다 execution model 차이를 적는 것이 중요하다. thread grouping, shared memory 이름, synchronization, compile toolchain을 표로 만든다.

그다음 실제 porting checklist를 만든다. build, correctness, profiler, shape sweep, dtype sweep, baseline 비교. portability는 한 번에 성공하는 마법이 아니라 체크박스를 줄여 가는 일에 가깝다.

## Source Links

- [YouTube](https://www.youtube.com/watch?v=jsYyF03Fs3o)
- Local notes: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/notes/lecture_097.md`
- Local transcript stub: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/transcripts/lecture_097.md`
