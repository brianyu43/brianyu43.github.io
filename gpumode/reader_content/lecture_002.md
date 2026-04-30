---
num: 2
title: CUDA 첫 문법과 PMPP의 관점
original: Lecture 2 Ch1-3 PMPP book
speaker: Andreas Koepf
part: 1
part_label: Part I · 측정과 CUDA 기초
priority: High
status: rich
---

:::crux
GPU 프로그래밍의 첫 문턱은 "많은 thread를 띄운다"가 아니라 "어떤 output element를 어떤 thread가 책임질지 정한다"이다. vector add, RGB to grayscale, mean filter는 모두 이 감각을 익히기 위한 작은 훈련장이다.
:::

## 1. PMPP식으로 CUDA를 보기

이 강의는 PMPP(Programming Massively Parallel Processors) 앞부분을 CUDA Mode식으로 복습한다. 병렬화는 말로는 쉽다. 하지만 실제로 높은 성능을 내려면 sequential loop를 그냥 여러 조각으로 나누는 것보다 더 많은 생각이 필요하다.

예를 들어 prefix sum처럼 처음 보기에는 순차적인 문제가 있다. 반대로 vector addition처럼 거의 embarrassingly parallel한 문제도 있다. GPU 공부의 초반에는 이 차이를 구분하는 눈이 중요하다. 모든 문제가 같은 모양으로 병렬화되지는 않는다.

Andreas는 memory bandwidth도 계속 강조한다. LLM inference처럼 token을 하나씩 만들 때 batch가 작으면 GPU 계산 유닛을 충분히 못 쓸 수 있다. 즉 병렬성이 있다고 자동으로 빠른 것은 아니다. 데이터 이동과 실행 모양이 맞아야 한다.

## 2. host, device, 그리고 귀찮지만 중요한 copy

CUDA의 기본 프로그램은 host CPU와 device GPU 사이를 오간다. GPU memory를 할당하고, CPU memory의 데이터를 GPU로 복사하고, kernel을 launch하고, 결과를 다시 가져온다. 처음에는 이 순서가 장황해 보이지만 성능을 이해하려면 꼭 지나가야 한다.

강의의 vector addition 예제는 이 흐름을 가장 단순한 형태로 보여준다. 한 thread가 한 output element를 맡는다. `d_`는 device pointer, `h_`는 host pointer처럼 이름을 나눠 두면 머릿속에서도 데이터가 어디 사는지 덜 헷갈린다.

PyTorch를 쓰면 이 중 많은 부분이 감춰진다. 하지만 감춰졌다는 말은 없어진다는 뜻이 아니다. tensor가 CUDA device에 있으면 PyTorch는 그에 맞는 CUDA kernel을 호출하거나 생성한다. 나중에 느린 코드를 만났을 때 이 경계를 기억해야 한다.

## 3. grid, block, thread

CUDA kernel은 많은 thread로 실행된다. 이 thread들은 grid, block, thread라는 계층으로 조직된다. 각 thread는 `blockIdx`, `threadIdx`, `blockDim` 같은 built-in 값을 이용해 자신이 맡을 global index를 계산한다.

처음 익힐 공식은 단순하다. 1차원에서는 대개 `idx = blockIdx.x * blockDim.x + threadIdx.x` 꼴이다. 전체 원소 수가 block size로 딱 나누어떨어지지 않으므로, kernel 안에는 `if (idx < n)` 같은 guard가 필요하다.

block 안의 thread들은 shared memory를 공유할 수 있다. block끼리는 독립적이고 실행 순서를 가정하면 안 된다. 이 제약은 귀찮은 규칙이 아니라 CUDA 알고리즘 설계의 뼈대다.

:::figure grid
label: Figure · 한 원소를 맡는 thread 찾기
- cell: grid는 여러 block으로 이루어진다.
- cell: block은 여러 thread를 담는다.
- cell: 각 thread는 block index와 thread index로 자기 global index를 만든다.
- cell: index가 output 범위 안이면 해당 element를 계산한다.
:::

## 4. 세 예제의 공통 구조

vector addition은 한 thread가 `a[i] + b[i]`를 계산한다. RGB to grayscale도 비슷하다. 한 pixel을 맡은 thread가 RGB 값을 읽고 grayscale 값을 쓴다. data가 2D 이미지라면 index 계산이 조금 더 입체적일 뿐이다.

mean filter는 한 걸음 더 간다. 한 output pixel을 계산하려면 주변 pixel 여러 개를 읽어야 한다. 그래서 "한 thread가 한 output element"라는 전략은 그대로지만, memory access 패턴은 더 복잡해진다. 여기서 이후 강의의 shared memory와 tiling 이야기가 자연스럽게 기다리고 있다.

matrix multiplication도 언급된다. 단순한 전략은 한 output matrix element를 한 thread가 맡고, row와 column의 dot product를 계산하는 것이다. 아직 빠른 matmul은 아니지만, GPU kernel을 생각하는 기본 문법으로는 아주 좋은 출발점이다.

## 5. compilation도 실행 모델의 일부다

CUDA code는 보통 `nvcc`를 거쳐 PTX 같은 중간 표현으로 내려간다. 이때 `__global__` 함수는 host에서 launch할 수 있는 kernel이라는 뜻을 갖는다. triple angle bracket 문법은 "이 함수를 GPU에서 grid/block 모양으로 실행하라"는 CUDA C++ 확장이다.

강의 자료에는 순수 CUDA C 예제와 PyTorch extension 예제가 함께 있다. 같은 kernel 아이디어가 standalone CUDA 프로그램으로도, Python에서 호출되는 extension으로도 나타난다. 둘을 나란히 보면 PyTorch가 편의를 주는 층과 CUDA가 실제 일을 하는 층이 분리되어 보인다.

:::tip
`vector_addition.cu`를 먼저 컴파일해 보고, 같은 indexing 패턴을 RGB grayscale kernel에서 찾아보자. "thread 하나가 output 하나"라는 문장이 실제 코드에서 어디에 있는지 표시해 보면 좋다.
:::

## 6. 초반에 조심할 것

thread를 많이 launch하는 것을 CPU thread 생성 비용과 같은 식으로 상상하면 안 된다. GPU에서는 아주 많은 thread를 띄우는 것이 자연스럽다. 대신 block 크기, memory access, guard 조건, shared memory 사용 가능 범위를 신경 써야 한다.

이 강의는 아직 최적화 끝판왕을 만들지 않는다. 목표는 CUDA 프로그램의 해부학을 익히는 것이다. data가 어디 있고, 누가 계산하고, 어떻게 launch되는지 알면 이후 profiler와 memory hierarchy 이야기가 훨씬 선명해진다.

## Source Links

- [YouTube](https://www.youtube.com/watch?v=NQ-0D5Ti2dc)
- [Slides](https://github.com/gpu-mode/lectures/blob/main/lecture_002/cuda_mode_lecture2.pptx)
- [Slides Google](https://docs.google.com/presentation/d/1deqvEHdqEC4LHUpStO6z3TT77Dt84fNAvTIAxBJgDck/edit#slide=id.g2b1444253e5_1_75)
- [Code](https://github.com/gpu-mode/lectures/tree/main/lecture_002)
- [Supplemental code](https://github.com/cuda-mode/lecture2)
- Local notes: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/notes/lecture_002.md`
- Local transcript: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/transcripts/lecture_002.md`
