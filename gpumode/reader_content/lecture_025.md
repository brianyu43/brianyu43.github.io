---
num: 25
title: AMD Composable Kernel을 말하는 법
original: "Lecture 25: Speaking Composable Kernel (CK)"
speaker: Haocong Wang
part: 3
part_label: Part III · 커널 프레임워크와 이식성
priority: High
status: rich
---

:::crux
Composable Kernel(CK)은 AMD ROCm 쪽의 고성능 kernel framework다. 이 강의의 핵심은 NVIDIA 생태계 밖에서도 같은 문제가 반복된다는 점이다. convolution을 GEMM으로 보고, tensor view를 변환하고, tile을 load/store/shuffle하며, fused kernel을 조립한다. 이름은 다르지만 질문은 익숙하다. **data를 어떤 tile 모양으로 움직이고 재사용할 것인가?**
:::

## 1. CUDA Mode에서 AMD를 보는 이유

Haocong Wang의 강의는 ROCm과 Composable Kernel을 소개한다. CUDA Mode라는 이름이 붙어 있어도, 목표는 NVIDIA 하나를 외우는 것이 아니라 parallel programming의 구조를 배우는 것이다. AMD GPU에서도 Tensor Core에 해당하는 matrix unit, HBM, shared/local memory, kernel fusion 문제가 똑같이 등장한다.

ROCm은 AMD의 open compute platform이고, CK는 그 위에서 ML tensor operator를 만들기 위한 library다. GEMM, convolution, attention 같은 연산을 고성능으로 구현하려면 hardware-specific detail과 reusable abstraction이 함께 필요하다. 이 균형은 CUTLASS를 볼 때와 매우 닮았다.

## 2. CK의 역사: convolution에서 tensor operator로

초기 CK는 MIOpen의 convolution kernel과 깊게 연결되어 있었다. convolution이 중요했고, 기존 monolithic kernel 방식으로는 fusion과 다양한 shape 대응이 어려웠다. 시간이 지나며 AI Template 같은 framework와 함께, convolution, GEMM, attention을 더 일반적인 tensor operator로 표현하는 방향이 선명해졌다.

강의에서 중요한 문장은 convolution과 GEMM을 unified하게 본다는 흐름이다. NHWC tensor를 GEMM의 M/K 차원으로 mapping하고, tensor view를 transform해 implicit GEMM convolution을 만든다. 즉, 연산의 이름보다 coordinate transform이 더 근본적인 언어가 된다.

:::figure flow
label: Figure · CK식 tensor operator 구성
- tensor view: NHWC 같은 logical tensor와 memory layout을 표현
- transform: merge, split, freeze 등으로 GEMM 좌표계로 변환
- tile: HBM/LDS/register 사이를 tile 단위로 이동
- compute: matrix core 또는 vector unit에서 연산
- customize: epilogue, quantization, fusion을 붙여 kernel 변형
:::

## 3. tensor view는 좌표 변환 장치다

CK의 첫 번째 기둥은 tensor view다. naive tensor view는 memory에 놓인 tensor를 shape/stride로 바라본다. transform tensor view는 dimension을 merge하거나 split하고, 어떤 축을 고정하거나, 여러 logical dimension을 새 coordinate로 바꾼다.

이 장치는 단순한 편의 기능이 아니다. convolution을 GEMM처럼 실행하려면 input tensor의 window와 channel, batch와 spatial coordinate를 GEMM M/N/K로 바꿔야 한다. 손으로 index 식을 흩뿌리면 kernel이 금방 읽기 어려워진다. tensor view는 이 mapping을 library가 이해할 수 있는 형태로 만든다.

## 4. tile programming과 static distributed tensor

두 번째 기둥은 tile programming이다. GPU kernel은 결국 HBM에서 tile을 읽고, register나 LDS(local data share, NVIDIA의 shared memory와 비슷한 역할)로 옮기고, 다시 coalesced하게 store한다. CK는 이 과정을 tile-level operator로 표현한다.

Static distributed tensor라는 표현도 나온다. 이는 tile 안의 data가 thread들에 어떻게 분산되어 있는지를 compile-time 정보로 다루는 쪽에 가깝다. load tile, store tile, shuffle tile 같은 연산이 reusable primitive가 된다. 좋은 kernel framework는 “빠른 kernel 하나”가 아니라 “빠른 kernel을 계속 만들 수 있는 말”을 제공한다.

## 5. FlashAttention과 customization

CK는 ROCm FlashAttention에도 연결된다. FlashAttention은 QK, softmax, PV를 하나의 streaming/fused kernel로 묶어 HBM traffic을 줄이는 대표 사례다. AMD에서도 같은 algorithmic idea를 hardware에 맞게 구현해야 한다. Triton 논문/구현의 아이디어가 CK/C++ kernel로 옮겨지는 장면이다.

Customization도 CK의 중요한 장점으로 소개된다. 기존 GEMM kernel에 quantization, epilogue, additional op를 붙여 새로운 fused kernel을 만들 수 있다. 기능만 되게 하는 것은 비교적 쉽지만, 최적 성능을 내려면 tile shape, memory movement, hardware unit 사용을 다시 맞춰야 한다. 이 점은 모든 vendor에서 공평하게 어렵다.

## 6. 손으로 해볼 것

작은 NHWC convolution을 하나 잡고, 이것이 implicit GEMM의 M/N/K로 어떻게 바뀌는지 써보자. batch와 output spatial position이 M으로, filter/channel 쪽이 K로 들어가는 식의 mapping을 직접 그리면 CK의 tensor view가 왜 필요한지 보인다.

ROCm 환경이 있다면 CK example을 바로 빌드해도 좋지만, 없어도 slide의 transform tensor view 그림을 따라가는 것만으로 충분하다. NVIDIA의 CUTLASS/CuTe와 AMD의 CK가 같은 문제를 다른 문법으로 푸는 모습을 비교해보자.

## Source Links

- [YouTube](https://www.youtube.com/watch?v=-732zELVbpU)
- [Lecture 025 repo folder](https://github.com/gpu-mode/lectures/tree/main/lecture_025)
- [Slides PDF](https://github.com/gpu-mode/lectures/blob/main/lecture_025/AMD_ROCm_Speaking_Composable_Kernel_July_20_2024.pdf)
- Local notes: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/notes/lecture_025.md`
- Local transcript: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/transcripts/lecture_025.md`
