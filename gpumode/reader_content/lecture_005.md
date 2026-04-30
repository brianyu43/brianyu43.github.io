---
num: 5
title: shared memory로 matmul 밀어보기
original: "Lecture 5: Going Further with CUDA for Python Programmers"
speaker: Jeremy Howard
part: 1
part_label: Part I · 측정과 CUDA 기초
priority: High
status: rich
---

:::crux
naive matmul은 각 thread가 global memory에서 같은 값을 반복해서 읽는다. shared memory tiling의 핵심은 block이 함께 쓸 작은 조각을 먼저 가져와 두고, 그 조각으로 더 많은 곱셈-덧셈을 하는 것이다.
:::

## 1. 지난 입문에서 한 발 더

이 강의는 Jeremy의 CUDA for Python Programmers 두 번째 편이다. 앞 강의에서 grayscale과 naive matmul을 통해 blocks와 threads를 배웠다면, 여기서는 성능을 위해 memory access를 바꾸기 시작한다.

matrix multiplication은 좋은 무대다. 계산식은 단순하지만 빠르게 만들기는 어렵다. output cell 하나를 만들려면 한 row와 한 column의 dot product가 필요하고, naive 구현은 같은 input 값을 여러 thread가 global memory에서 반복해서 읽는다.

PyTorch baseline과 비교해 정확성을 확인하는 습관은 그대로 유지된다. 먼저 pure Python의 작은 sample로 생각하고, CUDA kernel로 옮기고, 결과가 PyTorch와 가까운지 본다.

## 2. shared memory의 범위

shared memory는 모든 thread가 다 보는 전역 공간이 아니다. 특정 block 안의 thread들이 공유하는 on-chip memory다. CUDA 프로그래밍 관점에서는 "한 block이 협업할 수 있는 책상" 정도로 생각하면 좋다.

이 제한이 곧 설계의 모양을 만든다. block 하나가 output tile 하나를 맡고, 그 tile 계산에 필요한 input tile들을 shared memory에 올린다. 같은 block의 thread들은 그 shared memory 값을 재사용한다.

물론 shared memory는 작다. 모든 matrix를 올릴 수 없으니 tile로 쪼갠다. 큰 문제를 작은 조각으로 나누고, 조각마다 load, synchronize, compute를 반복한다.

:::figure flow
label: Figure · tiled matmul의 한 반복
- stage: block이 맡을 output tile을 정한다.
- stage: A tile과 B tile을 global memory에서 shared memory로 복사한다.
- stage: block 안 thread들이 동기화한다.
- stage: shared memory의 값으로 partial dot product를 누적한다.
- stage: 다음 tile로 이동해 누적을 계속한다.
:::

## 3. Python으로 CUDA의 모양을 흉내 내기

Jeremy는 곧장 CUDA C로 뛰지 않는다. Python으로 `dim3` 같은 작은 구조를 만들고, block과 thread loop를 직접 돌려 CUDA launch를 흉내 낸다. 처음 보면 우회로 같지만, 실제로는 debugging 비용을 줄이는 지름길이다.

shared memory도 Python tensor로 흉내 낸다. block마다 필요한 크기의 임시 공간을 만들고, thread들이 그 공간을 채우고 읽는다고 생각한다. 이렇게 하면 CUDA의 dynamic shared memory를 쓰기 전에 알고리즘의 순서를 확인할 수 있다.

중요한 변화는 kernel runner의 구조다. 이제 각 thread가 자기 output만 바로 계산하는 것이 아니라, "shared memory 채우기"와 "dot product 계산"이라는 두 단계에 참여한다. 단계 사이에는 동기화가 필요하다.

## 4. dynamic shared memory

CUDA에서는 launch할 때 dynamic shared memory 크기를 지정할 수 있다. kernel 안에서는 하나의 contiguous block으로 보이고, 프로그래머가 그 안을 A tile과 B tile 영역으로 나눠 쓴다.

강의의 matmul에서는 tile width에 따라 필요한 shared memory가 정해진다. 대략 A tile과 B tile 두 장이 필요하므로 tile width의 제곱에 두 배를 곱한 크기를 생각하게 된다. dtype 크기까지 고려해야 실제 byte 수가 나온다.

이 방식은 유연하지만 책임도 따른다. shared memory index를 잘못 계산하면 서로 다른 값이 겹쳐 쓰이고, 동기화가 빠지면 어떤 thread는 아직 채워지지 않은 값을 읽을 수 있다.

## 5. 빠름은 memory reuse에서 나온다

naive matmul에서는 같은 input 값이 여러 output cell 계산에 반복해서 쓰인다. shared memory tiling은 그 반복 읽기를 줄인다. global memory에서 한 번 가져온 tile을 block 안에서 여러 번 쓴다.

이때 계산량 자체는 크게 달라지지 않는다. 달라지는 것은 data movement다. GPU 성능 최적화에서 "계산을 줄이지 않았는데 빨라지는" 많은 사례가 바로 여기서 나온다.

Triton이나 CUTLASS가 하는 일도 큰 방향은 비슷하다. tile을 잘 고르고, memory movement를 줄이고, hardware가 좋아하는 모양으로 계산을 배치한다. 이 강의는 그 자동화된 도구들이 숨기는 기본 동작을 손으로 만져 보는 시간이다.

## 6. 혼자 확인할 것

작은 matrix에서 naive CUDA matmul과 shared memory matmul의 결과를 비교하자. 그 다음 tile width를 바꿔 보며 shared memory 사용량과 실행 시간이 어떻게 달라지는지 본다.

성능이 기대만큼 안 나오더라도 괜찮다. 이 강의의 목표는 최종 matmul library를 만드는 것이 아니라, shared memory를 쓰는 kernel의 구조를 이해하는 것이다. 빠른 GEMM은 이 구조 위에 훨씬 많은 디테일을 더한 물건이다.

:::tip
tile 계산을 종이에 한 번 그려 보자. 한 block이 output의 어느 사각형을 맡고, A와 B에서 어떤 사각형을 읽는지 그릴 수 있으면 CUDA 코드도 훨씬 덜 어둡다.
:::

## Source Links

- [YouTube](https://www.youtube.com/watch?v=wVsR-YhaHlM)
- [Code](https://github.com/gpu-mode/lectures/tree/main/lecture_005)
- [Notebook](https://github.com/gpu-mode/lectures/blob/main/lecture_005/matmul_l5.ipynb)
- Local notes: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/notes/lecture_005.md`
- Local transcript: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/transcripts/lecture_005.md`
