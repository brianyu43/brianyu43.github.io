---
num: 36
title: FlashAttention 3를 CUTLASS로 읽기
original: "Lecture 36: CUTLASS and Flash Attention 3"
speaker: Jay Shah
part: 3
part_label: Part III · 커널 프레임워크와 이식성
priority: High
status: rich
---

:::crux
FlashAttention 3의 핵심은 attention 수식을 새로 쓰는 것이 아니라 Hopper hardware에 맞게 실행 시간을 겹치는 것이다. Score matrix를 HBM에 materialize하지 않는 FlashAttention의 기본 아이디어 위에, WGMMA, TMA, warp specialization, ping-pong scheduling, persistent kernel을 얹어 H100의 비동기 장치를 더 잘 먹인다.
:::

## 1. Attention의 병목은 큰 score matrix다

Jay Shah는 attention을 `O = softmax(QK^T)V`에서 차근차근 시작한다. Query와 Key를 곱하면 sequence length에 대해 큰 score matrix가 생긴다. Naive implementation은 이 score matrix를 HBM에 쓰고, softmax를 위해 다시 읽고, V와 곱는다. Long context에서는 이 HBM traffic이 핵심 병목이 된다.

FlashAttention의 기본 아이디어는 score matrix를 HBM에 만들지 않는 것이다. Q tile을 잡고 K/V tile을 block by block으로 읽으며, online softmax state를 유지하고 output을 누적한다. Backward에서도 forward attention matrix를 저장하지 않고 recomputation을 활용한다. 수학은 같게 두고 memory hierarchy를 정면으로 이용한다.

:::figure flow
label: Figure · FlashAttention이 HBM write를 피하는 흐름
- Q tile: 한 block의 query를 register/shared memory 가까이에 둔다
- K/V stream: key와 value tile을 순차적으로 가져온다
- QK: 현재 tile의 score를 계산한다
- online softmax: row max와 denominator를 갱신한다
- PV accumulate: 확률과 V를 곱해 output tile에 누적한다
:::

## 2. Hopper에서 새로 보는 두 도구: WGMMA와 TMA

FlashAttention 3는 Hopper, 특히 H100의 feature를 적극적으로 쓴다. WGMMA는 warp group 단위의 asynchronous MMA primitive다. 네 개 warp가 함께 Tensor Core 연산을 수행하는 식으로 이해하면 된다. TMA(Tensor Memory Accelerator)는 single thread가 bulk tensor movement를 issue할 수 있는 asynchronous load mechanism이다.

이 둘은 kernel 구조를 바꾼다. Ampere식 `cp.async` multi-stage pipeline도 좋지만, Hopper에서는 producer가 TMA로 global memory에서 shared memory로 tile을 가져오고, consumer warp group이 WGMMA로 연산하는 식의 역할 분리가 더 강력해진다. Hardware가 asynchronous하게 일할 수 있으면, software schedule도 그에 맞게 짜야 한다.

## 3. Warp specialization과 ping-pong scheduling

강의에서 중요한 phrase는 producer와 consumer다. 일부 warp group은 memory load를 맡고, 다른 warp group은 MMA와 softmax computation을 맡는다. 이 inter-warp-group overlap이 warp specialization이다. Producer가 다음 tile을 가져오는 동안 consumer는 현재 tile을 계산한다.

Ping-pong scheduling은 두 consumer group이 번갈아 일하도록 구성한다. 한쪽이 WGMMA를 수행하는 동안 다른 쪽은 softmax나 준비 작업을 하는 식으로 gap을 줄인다. 이상적인 그림처럼 완벽히 겹치지는 않지만, barrier와 pipeline을 이용해 상당히 근접하게 만들 수 있다. 여기서 CUTLASS/CuTe는 tile layout과 pipeline object를 표현하는 언어가 된다.

## 4. Register와 shared memory는 schedule의 일부다

FlashAttention kernel은 register pressure가 크다. Q/K/V tile, softmax state, accumulator를 들고 있어야 하기 때문이다. Hopper에서는 producer와 consumer가 다른 register budget을 갖도록 조정하는 방식도 중요하다. Consumer에게 더 많은 register를 주어 spilling을 피하고, producer는 TMA issue 중심으로 가볍게 둔다.

Shared memory layout도 단순 buffer가 아니다. TMA로 load한 뒤 consumer가 쓰기 좋은 형태로 놓아야 하고, 필요하면 internal transpose도 한다. Memory movement와 compute schedule이 따로 놀면 WGMMA를 빨리 만들어도 전체 kernel은 느려진다. GPU kernel에서 layout은 항상 실행 계획의 일부다.

## 5. Persistent kernel과 work scheduling

FlashAttention 3는 persistent kernel 관점도 다룬다. Logical work tile 수만큼 CTA를 무작정 띄우는 대신, GPU를 채울 정도의 physical CTA를 띄워두고 work tile을 계속 할당한다. 이렇게 하면 불규칙한 work나 tail effect를 줄이고 SM utilization을 안정시키는 데 도움이 된다.

다만 persistent scheduling은 complexity를 데려온다. Work queue, tile assignment, synchronization이 필요하고, 모든 shape에서 같은 이득을 주지는 않는다. 이 강의는 FlashAttention 3를 “기발한 trick 하나”가 아니라 Hopper hardware와 algorithm이 맞물린 총체적인 schedule로 보게 한다.

## 6. 손으로 해볼 것

작은 attention을 naive하게 구현하고 score matrix의 크기와 HBM read/write 양을 계산해보자. 그 다음 tile 단위 online softmax를 Python으로 구현해 score matrix를 만들지 않고도 같은 output을 얻는지 확인한다.

CUTLASS code를 바로 다 읽기 어렵다면, FlashAttention 3 slide에서 producer/consumer 역할과 TMA/WGMMA가 등장하는 부분만 먼저 따라가자. 어떤 warp가 data를 옮기고, 어떤 warp가 compute를 하는지 색으로 칠하면 schedule이 덜 무섭다.

## Source Links

- [YouTube](https://www.youtube.com/watch?v=JwUcZwPOCpA)
- [Lecture 036 repo folder](https://github.com/gpu-mode/lectures/tree/main/lecture_036)
- [Slides PDF](https://github.com/gpu-mode/lectures/blob/main/lecture_036/flash_attn_3_gpu_mode_talk.pdf)
- [Colfax Research blog](https://research.colfax-intl.com/blog/)
- Local notes: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/notes/lecture_036.md`
- Local transcript: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/transcripts/lecture_036.md`
