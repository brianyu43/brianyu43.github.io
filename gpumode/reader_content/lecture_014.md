---
num: 14
title: Triton은 tile로 생각한다
original: "Lecture 14: Practitioners Guide to Triton"
speaker: Umer Adil
part: 2
part_label: Part II · 병렬 패턴과 Attention
priority: High
status: rich
---

:::crux
Triton은 Python처럼 보이지만 Python식 loop를 GPU에 옮기는 도구가 아니다. 핵심은 thread 하나가 아니라 **program 하나가 tile 하나를 맡는다**는 감각이다. 이 감각이 잡히면 `program_id`, `tl.arange`, `tl.load`, `mask`, autotune이 한 줄로 이어진다. 안 잡히면 코드가 돌아가도 왜 느린지 알 수 없다.
:::

## 1. 왜 Triton을 쓰는가

Umer Adil의 강의는 “Triton이 멋지다”에서 시작하지 않는다. 시작점은 더 실용적이다. PyTorch 연산 조합만으로는 느리고, CUDA C++로 내려가기는 부담스러울 때, 중간에 놓인 선택지가 Triton이다. Python 안에서 kernel을 쓰되, GPU memory access와 tile shape는 직접 생각한다.

그래서 Triton은 좋은 첫 커널을 빨리 쓰게 해준다. vector add 같은 커널은 금방 나온다. 하지만 “빠른” 커널은 별개의 문제다. block size, `num_warps`, `num_stages`, mask 처리, load/store 패턴을 놓치면 PyTorch보다 느린 커스텀 커널이 된다. GPU 프로그래밍에서 이것보다 슬픈 일도 많지만, 꽤 대표적인 슬픔이다.

CUDA를 대체한다기보다, CUDA로 내려가기 전에 머무를 수 있는 넓은 작업대에 가깝다. 아주 미세한 shared memory layout, bank conflict, 특정 instruction scheduling까지 붙잡아야 하면 CUDA가 필요할 수 있다. 반대로 LLM의 pointwise fusion, 작은 matmul 변형, custom activation처럼 tile 단위로 표현이 잘 되는 일은 Triton이 꽤 자연스럽다.

## 2. program_id가 blockIdx처럼 보일 때 조심하자

CUDA를 배운 사람은 `program_id`를 보면 곧장 `blockIdx`를 떠올린다. 완전히 틀린 비유는 아니다. 다만 Triton에서 한 program은 thread block이라기보다 **출력 tile을 계산하는 논리적 일감**이다. 그 안에서 `tl.arange(0, BLOCK_SIZE)`가 tile 안의 element index vector를 만든다.

vector add를 보면 구조가 선명하다. `pid = tl.program_id(0)`로 내가 몇 번째 tile인지 알고, `offsets = pid * BLOCK_SIZE + tl.arange(...)`로 이 tile이 읽을 위치를 만든다. `tl.load(x + offsets, mask=offsets < n)`로 경계 밖을 막고, 계산한 뒤 `tl.store`한다. 코드는 NumPy처럼 보이지만 실제로는 tile 전체를 대상으로 하는 SIMD식 표현이다.

matmul도 같은 생각의 2D 확장이다. `pid_m`, `pid_n`이 output matrix의 tile 좌표가 되고, M/N/K 방향의 offset vector를 만든 뒤 K축을 따라 누적한다. 처음부터 Tensor Core를 떠올리기보다, “내 program은 C의 어느 직사각형을 책임지는가?”를 먼저 묻는 편이 좋다.

:::figure flow
label: Figure · Triton kernel을 읽는 순서
- grid: 몇 개의 program을 띄우는가
- program_id: 이 program이 맡은 tile 좌표는 어디인가
- offsets: tile 안의 element 주소 vector는 어떻게 생겼는가
- mask: 마지막 tile과 경계 밖 접근을 어떻게 막는가
- load/store: HBM을 몇 번 읽고 쓰는가
:::

## 3. 디버깅은 interpret 모드부터

Triton의 친절한 부분 하나는 `TRITON_INTERPRET=1`이다. kernel을 GPU에서 바로 돌리지 않고 CPU 쪽 interpreter로 실행하면, kernel 안에서 `breakpoint()`와 `print`를 쓸 수 있다. 처음 `tl.load`의 모양이 머릿속과 다른지 확인하기에 아주 좋다.

물론 이것은 성능 측정용이 아니다. interpreter는 느리고, 모든 GPU 동작을 똑같이 재현하지도 않는다. 그래도 학습 단계에서는 큰 선물이다. CUDA kernel 안에서 printf를 뿌리며 어둠 속을 걷는 것보다, 특정 `program_id`에서 멈춰 offset과 mask를 보는 편이 훨씬 덜 고독하다.

강의 notebook의 `triton_util.py`도 이런 용도다. 특정 program에서만 breakpoint를 걸거나 print하게 해준다. tile 단위 사고가 흔들릴 때는 전체 실행을 보지 말고, program 하나를 손에 들고 보는 것이 빠르다.

## 4. benchmarking과 autotune은 “예쁜 코드”를 깨운다

Triton에는 benchmark helper와 autotune이 있다. 여기서 중요한 점은 autotune이 마법사가 아니라는 것이다. 후보 configuration을 사람이 정해주고, Triton이 그중 좋은 것을 고른다. 후보가 나쁘면 결과도 나쁘다.

가장 자주 만지는 값은 `BLOCK_SIZE`, `num_warps`, `num_stages`다. `BLOCK_SIZE`는 tile 크기와 memory transaction 모양을 바꾸고, `num_warps`는 한 program을 수행하는 병렬성을 바꾸며, `num_stages`는 pipelining 깊이에 영향을 준다. 작은 matrix에서는 PyTorch가 더 빠를 수 있고, 큰 matrix에서는 Triton kernel이 따라잡거나 앞설 수 있다. 그래서 size sweep 없이 “빠르다”라고 말하면 보통 너무 이르다.

실전에서는 baseline을 꼭 둔다. PyTorch eager, `torch.compile`, 기존 Triton 예제, 가능하면 cuBLAS나 CUTLASS까지 놓고 본다. 커스텀 kernel의 목표는 자존심이 아니라 병목 제거다.

## 5. Triton의 rough edge도 기술의 일부다

Umer는 Triton이 아직 거친 부분이 있다고 솔직히 말한다. compiler error가 친절하지 않을 때가 있고, 어떤 코드는 기대와 다르게 compile되거나 성능이 흔들린다. 이건 Triton을 피하라는 뜻이 아니라, 디버깅과 측정을 더 작은 단위로 하라는 뜻이다.

PTX를 dump해서 보는 습관도 여기서 나온다. 내가 쓴 tile 연산이 실제로 어떤 load/store와 instruction으로 내려갔는지 확인하면, “컴파일러가 알아서 해주겠지”의 범위가 조금씩 보인다. Triton은 추상화지만, 추상화 아래에 HBM, register, warp, instruction이 사라지는 것은 아니다.

## 6. 손으로 해볼 것

먼저 vector add를 직접 쓰고, 일부러 `mask`를 빼서 마지막 tile에서 무슨 일이 나는지 본다. 그 다음 interpreter로 특정 `program_id`의 `offsets`를 출력한다. 마지막으로 block size를 64, 128, 256, 1024로 바꿔 작은 N과 큰 N에서 PyTorch와 비교한다.

matmul은 처음부터 “최고 성능”을 목표로 하지 말자. naive Triton matmul을 쓰고, `BLOCK_M/N/K`, `num_warps`, `num_stages`만 sweep해도 꽤 많은 것을 배운다. 성능 숫자보다 중요한 질문은 이것이다. 이 kernel은 memory-bound인가, compute-bound인가, 아니면 launch overhead에 묶였는가?

## Source Links

- [YouTube](https://www.youtube.com/watch?v=DdTsX6DQk24)
- [Lecture 014 repo folder](https://github.com/gpu-mode/lectures/tree/main/lecture_014)
- [Notebook](https://github.com/gpu-mode/lectures/blob/main/lecture_014/A_Practitioners_Guide_to_Triton.ipynb)
- [triton_util.py](https://github.com/gpu-mode/lectures/blob/main/lecture_014/triton_util.py)
- Local notes: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/notes/lecture_014.md`
- Local transcript: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/transcripts/lecture_014.md`
