---
num: 23
title: Tensor Core를 먹여 살리는 일
original: "Lecture 23: Tensor Cores"
speaker: Vijay Thakkar & Pradeep Ramani
part: 2
part_label: Part II · 병렬 패턴과 Attention
priority: High
status: rich
---

:::crux
Tensor Core는 빠른 matrix multiply 장치지만, 성능은 instruction 하나로 나오지 않는다. data를 global memory에서 shared memory로 옮기고, swizzle하고, warp 또는 warp-group이 먹을 모양으로 맞추고, pipeline을 유지해야 한다. 핵심은 **Tensor Core 자체보다 Tensor Core를 굶기지 않는 surrounding machinery**다.
:::

## 1. Tensor Core는 matrix multiply의 가속기다

Vijay Thakkar와 Pradeep Ramani의 강의는 NVIDIA 내부에서 CUTLASS와 CuTe를 다루는 사람들의 시각을 보여준다. Tensor Core는 matrix multiply-add를 아주 빠르게 수행하는 hardware unit이다. ML workload에서 GEMM과 convolution이 너무 중요하니, GPU architecture도 그쪽으로 깊이 진화했다.

Volta에서는 warp-level Tensor Core instruction이 등장했고, Ampere를 거쳐 Hopper에서는 warp-group MMA가 중요해졌다. Hopper의 WGMMA는 네 개 warp가 협력해 더 큰 matrix operation을 수행하고, operand는 register뿐 아니라 shared memory descriptor를 통해 공급된다. instruction이 커질수록 프로그래머가 맞춰야 할 주변 조건도 커진다.

## 2. tile hierarchy가 성능의 지도다

큰 GEMM은 output matrix의 tile로 나뉜다. thread block이 큰 output tile을 맡고, warp 또는 warp-group이 그 안의 작은 tile을 맡고, MMA instruction이 더 작은 instruction tile을 계산한다. 이 계층을 잘 맞추어야 data reuse가 생긴다.

문제는 data layout이다. Tensor Core가 원하는 operand 모양과 global memory의 row/column-major layout은 그대로 맞지 않는다. shared memory에 올릴 때 swizzle하고, vectorized load를 만들고, bank conflict를 피해야 한다. CUTLASS와 CuTe는 이 복잡한 일을 tile programming model로 감싸준다.

:::figure ladder
label: Figure · Tensor Core kernel의 공급 사슬
- HBM: A/B matrix tile을 global memory에서 읽음
- TMA/copy: Hopper에서는 TMA 등으로 shared memory로 이동
- shared memory: swizzle된 operand tile을 보관
- WGMMA/MMA: warp 또는 warp-group이 matrix multiply 수행
- epilogue: accumulator를 scale, activation, store 형태로 정리
:::

## 3. CUTLASS는 “instruction wrapper”가 아니다

CUTLASS는 단순히 `mma()`를 부르기 쉽게 하는 얇은 wrapper가 아니다. tile scheduler, collective copy, collective MMA, epilogue, pipeline stage, shared memory layout까지 kernel 전체를 구성하는 template library다. 좋은 Tensor Core kernel은 copy와 math가 겹치고, shared memory buffer가 잘 관리되고, output tile 사이 load balancing도 맞아야 한다.

그래서 CUTLASS 코드가 복잡하다. 하지만 복잡함에는 이유가 있다. architecture마다 instruction shape, memory movement, synchronization primitive가 바뀐다. library는 그 차이를 감추는 동시에 고성능을 위한 선택지를 노출해야 한다. 쉬운 API와 peak performance 사이에는 늘 긴 줄다리기가 있다.

## 4. Hopper에서 바뀐 것들

Hopper는 cluster, distributed shared memory, Tensor Memory Accelerator(TMA), warp-group MMA 같은 기능을 강조한다. TMA는 global memory에서 shared memory로 tensor-shaped block을 비동기적으로 옮길 수 있고, bounds와 swizzle 같은 정보를 descriptor로 가진다. 단순 copy loop가 아니라 hardware-assisted data movement에 가깝다.

WGMMA도 중요하다. Ampere식 warp-level MMA에서는 operand가 주로 register에서 오지만, Hopper WGMMA는 shared memory operand와 descriptor가 핵심이다. TMA와 WGMMA가 모두 async 성격을 가지므로 barrier와 pipeline 관리가 성능에 직접 연결된다.

## 5. 왜 직접 쓰기 어려운가

Tensor Core를 잘 쓰려면 어느 dtype을 쓸지, tile shape는 어떤지, stage count는 얼마인지, shared memory layout은 어떻게 할지, copy instruction은 무엇인지, epilogue는 어떤지 모두 맞춰야 한다. 하나만 틀려도 compile은 되지만 성능이 안 나올 수 있다.

이 강의의 메시지는 “모두가 PTX를 외워야 한다”가 아니다. 오히려 CUTLASS/CuTe 같은 library가 왜 필요한지를 보여준다. peak에 가까운 kernel은 hardware detail과 programming abstraction 사이의 계약이다. 계약서를 안 읽고 서명하면 언젠가 성능 청구서가 온다.

## 6. 손으로 해볼 것

작은 GEMM을 대상으로 tile hierarchy를 그려보자. 전체 C matrix, CTA tile, warp tile, MMA tile을 서로 다른 색으로 표시한다. 각 단계에서 A와 B tile이 어디에 저장되는지, 재사용은 어디서 일어나는지 써본다.

그 다음 CUTLASS GEMM 예제에서 tile shape, stage count, element type을 찾아본다. 코드를 전부 이해하려 하지 말고, “이 type parameter가 memory movement를 바꾸는가, MMA shape를 바꾸는가, epilogue를 바꾸는가?”만 분류해도 큰 진전이다.

## Source Links

- [YouTube](https://www.youtube.com/watch?v=hQ9GPnV0-50)
- [Slides](https://drive.google.com/file/d/18sthk6IUOKbdtFphpm_jZNXoJenbWR8m/view)
- Local notes: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/notes/lecture_023.md`
- Local transcript: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/transcripts/lecture_023.md`
