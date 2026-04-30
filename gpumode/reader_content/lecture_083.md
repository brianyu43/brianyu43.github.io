---
num: 83
title: kernel derivation, 빠른 코드를 증명하듯 만들기
original: "Lecture 83: Formalized Kernel Derivation"
speaker: Missing
part: 6
part_label: Part VI · DSL·정확성·새 커널 모델
priority: High
status: partial
---

:::crux
이 강의는 speaker, transcript, slides, code가 모두 확인되지 않았다. notes가 잡은 단서는 제목의 **Formalized Kernel Derivation**과 관련 term으로 감지된 FlashAttention, kernel뿐이다. 핵심 질문은 **빠른 GPU kernel을 감으로 튜닝하는 대신, 변환 규칙과 correctness를 따라 유도할 수 있는가**다.
:::

## 1. 지금 확인된 자료

local notes에는 YouTube 링크만 있고 speaker는 missing이다. transcript fetch는 실패했다. slides와 code도 없다. 그러므로 이 글은 특정 formal system이나 논문을 설명하지 않는다.

대신 kernel derivation이라는 표현 자체를 붙잡는다. derivation은 "결과 코드를 갑자기 보여주는 것"이 아니라, naive specification에서 optimized kernel까지 가는 길을 단계별 변환으로 설명한다는 뜻으로 읽을 수 있다.

## 2. 왜 formalized가 필요한가

GPU kernel 최적화는 자주 이야기식으로 전해진다. tile을 잡고, memory를 줄이고, warp를 맞추고, occupancy를 본다. 숙련자에게는 자연스럽지만, 배우는 사람에게는 어느 순간 마술처럼 보인다.

formalized derivation은 이 마술을 줄이려는 시도다. 먼저 수학적 specification을 둔다. 그다음 loop transformation, tiling, fusion, layout change, parallel mapping을 하나씩 적용한다. 각 단계가 의미를 보존한다고 말할 수 있으면, 최종 kernel은 "빠르지만 수상한 코드"가 아니라 "유도된 코드"가 된다.

:::figure flow
label: Figure · kernel derivation의 기본 흐름
- spec: 느리지만 명확한 tensor 수식 또는 reference code
- transform: tiling, fusion, reordering 같은 의미 보존 변환
- schedule: GPU block/thread와 memory hierarchy에 mapping
- code: CUDA, Triton, CuTe 같은 구현으로 낮춤
- check: reference와 numerics/correctness를 비교
:::

## 3. FlashAttention을 예로 떠올리기

notes에는 FlashAttention이 관련 term으로 감지되어 있다. 강의에서 실제로 어떤 예제를 썼는지는 확인할 수 없지만, FlashAttention은 derivation 관점으로 읽기 좋은 대상이다. naive attention에서 시작해 score matrix materialization을 없애고, online softmax를 도입하고, tile 단위 accumulation으로 바꾸는 흐름이 있기 때문이다.

다만 이것을 강의 내용으로 단정하면 안 된다. 원본을 볼 때 FlashAttention이 실제 예제인지, 아니면 notes의 keyword 감지에만 잡힌 것인지 확인하자. 확인되기 전까지는 "가능한 읽기 포인트"로만 둔다.

## 4. formal과 practical 사이

formal derivation은 correctness를 다루기 좋지만, GPU 성능은 hardware detail을 피할 수 없다. 같은 의미를 보존하는 변환이라도 register pressure가 너무 커지거나 memory coalescing이 깨지면 느리다. formal system이 useful하려면 cost model이나 schedule 선택과 만나는 지점이 있어야 한다.

또 numerics도 조심해야 한다. floating point에서는 연산 순서를 바꾸면 bitwise 결과가 달라질 수 있다. 따라서 "의미 보존"이 정확히 무엇을 뜻하는지, tolerance와 dtype policy가 어떻게 정의되는지 확인해야 한다.

## 5. 혼자 해볼 것

matrix transpose나 softmax처럼 작은 kernel 하나를 골라보자. 먼저 naive specification을 쓴 뒤, memory coalescing을 위해 loop order를 바꾸고, tile을 넣고, shared memory를 쓰는 과정을 한 줄씩 기록한다. 각 단계마다 왜 같은 결과라고 믿는지 적는다.

원본 강의를 볼 때는 proof나 formal notation이 어렵더라도 겁먹지 말자. 핵심은 빠른 코드를 천재의 손맛으로만 남기지 않고, 재현 가능한 변환의 줄로 만드는 것이다.

## Source Links

- [YouTube](https://www.youtube.com/watch?v=pB8jRHHGJcE)
- Local notes: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/notes/lecture_083.md`
- Local transcript stub: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/transcripts/lecture_083.md`
