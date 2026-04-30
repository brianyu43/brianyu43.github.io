---
num: 3
title: Python 프로그래머를 위한 CUDA 입문
original: "Lecture 3: Getting Started With CUDA for Python Programmers"
speaker: Jeremy Howard
part: 1
part_label: Part I · 측정과 CUDA 기초
priority: High
status: rich
---

:::crux
Python으로 먼저 정확한 알고리즘을 쓰고, 그 구조를 CUDA kernel로 옮긴다. Jeremy Howard의 접근은 "CUDA를 외워라"가 아니라 "이미 아는 Python loop를 GPU의 blocks와 threads로 번역해 보자"에 가깝다.
:::

## 1. 낯선 CUDA를 익숙한 Python으로 당기기

강의는 이미지 tensor에서 시작한다. channel, height, width 모양의 rank-3 tensor를 보고, PyTorch와 matplotlib가 축 순서를 다르게 기대한다는 아주 현실적인 이야기부터 한다. CUDA 입문이지만 첫 장면은 여전히 Python 데이터 다루기다.

이 선택이 좋다. GPU kernel은 결국 data layout 위에서 돈다. 이미지의 한 pixel을 grayscale로 바꾸는 코드를 Python으로 쓰고, 그 다음 같은 일을 CUDA가 하도록 옮기면 "병렬화"가 추상 단어가 아니라 index 계산 문제로 내려온다.

Jeremy의 핵심 습관은 먼저 Python으로 작은 kernel runner를 흉내 내는 것이다. 진짜 GPU thread는 아니지만, block과 thread를 loop로 돌며 각 thread가 어떤 일을 하는지 눈으로 볼 수 있다.

## 2. range가 아니라 blocks와 threads

CUDA는 Python의 `range(n)`처럼 하나씩 값을 넘겨주는 모델이 아니다. 전체 일을 block들로 나누고, 각 block 안에 thread들이 있다. thread는 `blockIdx`, `threadIdx`, `blockDim`으로 자기 위치를 계산한다.

처음에는 이 구조가 불필요하게 이상해 보인다. 하지만 이유가 있다. 같은 block 안의 thread들은 shared memory를 공유하고, 필요하면 block 단위로 동기화할 수 있다. 나중에 빠른 kernel을 만들 때 이 구조가 바로 성능의 지렛대가 된다.

강의에서는 256 threads per block 같은 관용적인 값을 놓고, 필요한 block 수를 ceiling division으로 계산한다. 마지막 block이 남는 원소보다 더 많은 thread를 가질 수 있으므로 guard 조건이 꼭 필요하다.

:::figure ladder
label: Figure · Python loop에서 CUDA launch까지
- stage: Python 함수로 한 pixel 또는 한 element의 일을 정의한다.
- stage: Python loop로 block/thread runner를 흉내 낸다.
- stage: 같은 indexing을 CUDA C 함수로 옮긴다.
- stage: PyTorch extension으로 컴파일해 Python에서 호출한다.
:::

## 3. grayscale kernel의 교훈

grayscale 예제는 GPU 입문에 알맞다. 각 output pixel은 독립적이고, 입력의 RGB 세 값을 읽어 하나의 값을 쓴다. 한 thread가 한 output pixel을 맡으면 된다.

이때 중요한 것은 계산식보다 indexing이다. channel-first tensor를 어떻게 읽을지, row와 column을 어떻게 만들지, output 범위를 벗어난 thread는 어떻게 빠져나올지 정해야 한다. CUDA의 많은 초보 버그는 수학이 아니라 이 좌표 변환에서 나온다.

그리고 여기서 이미 debugging 전략이 나온다. 처음부터 CUDA에서만 작성하면 확인하기 어렵다. Python version을 먼저 만들고, 작은 입력에서 결과를 비교하면 훨씬 덜 헤맨다.

## 4. PyTorch extension으로 연결하기

CUDA kernel을 Python에서 쓰려면 binding이 필요하다. PyTorch는 C++/CUDA extension을 통해 이 경로를 제공한다. 강의에서는 Python에서 작성한 kernel 구조를 CUDA C로 옮기고, PyTorch가 compile/load한 함수를 호출한다.

CUDA의 triple angle bracket 문법은 처음 보면 이상하다. 하지만 읽는 법은 단순하다. 어떤 kernel을, 몇 개의 block과 몇 개의 thread로, 어떤 argument와 함께 실행할 것인지 적는다.

이 방식은 교육용 장난만은 아니다. Jeremy는 가능한 한 Python으로 먼저 생각하고 CUDA로 옮기는 습관을 실제 작업 방식으로도 선호한다고 말한다. 복잡한 kernel일수록 debug 가능한 작은 형태가 필요하기 때문이다.

## 5. matmul로 넘어가는 길

강의 후반은 matrix multiplication으로 향한다. 가장 단순한 matmul kernel은 output matrix의 한 cell을 한 CUDA thread가 맡고, dot product를 계산한다. 빠르지는 않지만 구조를 보기에는 좋다.

여기서 2D grid와 2D block이 등장한다. row와 column은 각각 block index와 thread index의 x/y 좌표에서 나온다. grayscale에서 배운 1D 감각을 2D로 확장하는 셈이다.

빠른 matmul은 다음 강의에서 shared memory와 tiling으로 이어진다. 지금은 "정확한 naive CUDA matmul"을 만드는 것만으로 충분하다. 정확함 없이 최적화로 달려가면, 나중에 profiler가 아니라 점괘를 읽게 된다.

## 6. 혼자 해볼 작은 과제

먼저 Python으로 grayscale 함수를 쓰고, 같은 입력에 대해 PyTorch 연산 결과와 비교해 보자. 그 다음 CUDA extension version을 만들고 결과가 byte 단위로 얼마나 가까운지 확인한다.

그 다음에는 일부러 block size를 바꿔 보자. 128, 256, 512 threads per block에서 launch 모양은 어떻게 달라지는가? 성능보다 먼저 "몇 개의 thread가 실제로 유효한 일을 했는가"를 계산해 보는 것이 좋다.

:::tip
CUDA 코드를 생성형 도구로 변환해 볼 수는 있다. 다만 그대로 믿지 말고 Python reference와 작은 tensor 테스트를 붙여라. GPU bug는 틀렸는데도 빠르게 틀릴 수 있다.
:::

## Source Links

- [YouTube](https://www.youtube.com/watch?v=4sgKnKbR-WE)
- [Code](https://github.com/gpu-mode/lectures/tree/main/lecture_003)
- [Colab](https://colab.research.google.com/drive/180uk6frvMBeT4tywhhYXmz3PJaCIA_uk?usp=sharing)
- [Notebook](https://github.com/gpu-mode/lectures/blob/main/lecture_003/pmpp.ipynb)
- [Supplemental code](https://github.com/cuda-mode/lecture2/tree/main/lecture3)
- Local notes: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/notes/lecture_003.md`
- Local transcript: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/transcripts/lecture_003.md`
