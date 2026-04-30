---
num: 43
title: Turing에서 int8 Tensor Core matmul 배우기
original: "Lecture 43: int8 tensorcore matmul for Turing"
speaker: Erik Schultheis
part: 4
part_label: Part IV · 프로덕션 커널과 GEMM
priority: High
status: rich
---

:::crux
이 강의는 state-of-the-art GEMM을 보여주려는 강의가 아니다. 오히려 Turing의 int8 Tensor Core matmul을 교육용으로 천천히 최적화하며, profiler가 알려주는 병목을 하나씩 줄인다. 핵심은 **Tensor Core instruction을 호출했다고 끝이 아니라, data를 어디에 두고 어떤 순서로 재사용할지 결정해야 성능이 나온다**는 점이다.
:::

## 1. 왜 하필 int8이고 왜 Turing인가

Erik은 처음부터 목표를 분명히 한다. 이 코드는 최고 성능용 production GEMM이 아니라 교육용이다. CUTLASS 같은 거대한 header library도 쓰지 않고, inline assembly도 직접 쓰지 않는다. CUDA toolkit의 WMMA 계열 API로 Tensor Core의 기본 사용법을 익힌다.

int8 matmul은 좋은 학습 재료다. 8-bit integer 두 개를 곱하면 결과는 더 넓은 accumulator가 필요하고, CPU에서는 AVX512 VNNI 같은 전용 dot product instruction이 등장한다. CUDA에도 Tensor Core를 쓰지 않는다면 `dp4a` 같은 네 개짜리 8-bit dot product instruction이 있다. Tensor Core로 가면 이 생각을 tile 단위로 확장한다.

또 int8은 결과 검증이 상대적으로 깔끔하다. floating point matmul은 accumulation order가 바뀌면 roundoff가 달라지고 tolerance를 정해야 한다. integer matmul은 overflow 조건을 조심해야 하지만, 같은 수학을 하면 exact result를 기대할 수 있다. 교육용 benchmark와 자동 채점에 잘 맞는다.

## 2. test가 좋아야 kernel을 고칠 수 있다

강의에는 온라인 제출 시스템 이야기가 나온다. 사용자가 code를 제출하면 correctness test, compute sanitizer, benchmark를 돌리고 점수를 준다. 이때 단순히 "틀렸습니다"라고 말하면 학습이 잘 되지 않는다. 어느 block boundary에서 처음 틀렸는지, 어떤 structured input에서 깨지는지 알려줘야 한다.

검증 방법도 여러 가지다. 작은 matrix는 눈으로 보기 쉽지만 실제 GPU block과 Tensor Core fragment 경로를 충분히 건드리지 못한다. identity matrix나 block-constant structured matrix는 indexing bug를 찾는 데 좋다. 큰 matrix의 전체 reference matmul은 비싸므로 Freivalds algorithm 같은 probabilistic check도 쓸 수 있다. `C = A B`라면 임의 vector `x`에 대해 `C x`와 `A (B x)`를 비교하는 방식이다.

이 이야기는 kernel 최적화 전에 아주 중요하다. 빠른데 틀린 kernel은 그냥 빠른 쓰레기다. 조금 무뚝뚝하지만, GPU는 그런 농담을 자주 친다.

## 3. scalar matmul에서 fragment matmul로 시선을 올리기

첫 구현은 naive scalar matmul을 16x16 fragment 단위로 바꾼 것에 가깝다. A는 `n x k`, B는 `k x n` int8이고, C는 `n x n` int32 accumulator다. scalar 관점에서는 `C[i,j]` 하나가 K 방향 inner product다. Tensor Core 관점에서는 16x16 tile fragment를 곱하고 accumulator fragment에 더한다.

CUDA WMMA API에는 fragment type, `load_matrix_sync`, `mma_sync`, `store_matrix_sync`, `fill_fragment` 같은 기본 함수가 있다. `mma_sync`가 fragment multiply-add를 수행한다. 여기서부터 중요한 경고가 따라온다. fragment 내부 storage layout은 unspecified이고 architecture마다 바뀔 수 있다. 즉 fragment 안의 element mapping을 마음대로 가정하면 API contract 밖으로 나간다.

첫 버전은 돌아가지만 느리다. Tensor Core를 호출했는데도 spec sheet의 speed-of-light와 멀다. 이유는 늘 그렇듯 "where's my data?"다. B가 row-major로 저장되어 K 방향 access가 strided가 되고, global memory load가 비효율적이다.

:::figure flow
label: Figure · int8 Tensor Core matmul 최적화 흐름
- naive WMMA: 16x16 fragment를 직접 global memory에서 load한다
- B transpose: B를 column-major로 두어 coalesced access를 만든다
- register reuse: 한 warp가 여러 output fragment를 맡아 input fragment를 재사용한다
- shared memory tiling: block 안 여러 warp가 input tile을 공유한다
- fragment reshuffle: load/store direct helper로 shared memory access 병목을 줄인다
- next steps: double buffering, larger block, 더 세밀한 instruction scheduling
:::

## 4. 첫 번째 교정: B를 column-major로 둔다

A와 B가 모두 row-major이면 matmul에서 B를 K 방향으로 읽을 때 stride가 커진다. Tensor Core 자체는 빠르지만, data가 제때 못 오면 warp는 기다린다. Nsight Compute의 memory chart에서는 L2와 L1 사이, device memory와 L2 사이 traffic이 크게 보이고, warp stall에서는 `LG throttle`과 `long scoreboard`가 눈에 띈다.

B를 column-major 형식으로 바꾸면 access pattern이 좋아진다. 별도 transpose kernel이 필요하지만, 큰 matmul은 `O(n^3)`이고 transpose는 `O(n^2)`라 충분히 큰 matrix에서는 overhead가 작다. transcript 기준으로 transpose overhead가 몇 ms 수준이고 kernel 시간이 크게 줄어드는 예가 나온다.

여기서 profiler 읽기의 작은 함정도 나온다. 최적화 뒤 kernel이 빨라졌는데 normalized warp stall 비율이 오히려 커질 수 있다. 분모인 "useful instruction을 낸 cycle"도 줄었기 때문이다. counter 하나만 보고 판단하면 안 된다. timing, instruction count, memory traffic, stall reason을 같이 봐야 한다.

## 5. register reuse: warp가 더 많은 output을 맡는다

다음 최적화는 register reuse다. 한 warp가 output fragment 하나만 계산하면 input fragment를 재사용할 기회가 적다. Erik은 예시로 warp 하나가 3x3 output fragments를 계산하도록 하며, A 쪽 3개, B 쪽 3개 input fragment를 load해 9개 accumulator fragment에 누적한다.

이 생각은 scalar tiled matmul과 같다. 단지 scalar element가 아니라 16x16 fragment를 단위로 볼 뿐이다. PMPP에서 thread coarsening이라고 부르는 감각이 여기서는 warp coarsening에 가깝다. data reuse가 늘고 global load와 index calculation이 줄어든다.

물론 공짜는 없다. accumulator fragment와 input fragment를 더 많이 들고 있어야 하므로 register usage가 늘어난다. 아직 spill이 나지 않더라도 occupancy가 떨어진다. 하지만 줄여야 할 latency 자체가 크게 줄었으므로 net win이 될 수 있다. 어느 정도까지 coarsening할지는 benchmark로 찾아야 한다.

## 6. shared memory는 빠르지만 공짜는 아니다

그 다음은 shared memory tiling이다. 여러 warp가 같은 input tile을 재사용할 수 있게 global memory에서 shared memory로 옮겨 두고, `load_matrix_sync`가 shared memory에서 fragment를 읽게 한다. Turing에는 Hopper의 TMA가 없으므로 thread들이 직접 vectorized load/store로 copy한다. 16-byte alignment를 compiler에 알려주기 위해 `int4`로 reinterpret하는 작은 기술도 나온다.

shared memory를 쓰면 device memory traffic은 크게 줄지만, 새로운 병목이 생긴다. `__syncthreads()` 때문에 barrier stall이 생기고, register spill이 local memory/L1/L2 traffic으로 보일 수 있다. 또 shared memory load 자체가 `MIO throttle`, `short scoreboard` 같은 stall reason으로 등장한다. shared memory는 global memory보다 빠르지만 무한히 빠른 공간은 아니다.

강의 후반의 재미있는 최적화는 fragment layout을 직접 해석하지 않고 우회하는 방법이다. `load_matrix_sync`로 memory layout에서 register layout으로 한 번 변환한 뒤, fragment 내부 storage를 blind copy하듯 store/load direct helper로 다룬다. element mapping을 알 필요는 없고, store와 load가 서로 inverse라는 점만 쓴다. 이로 shared memory access와 address calculation을 줄이며 추가 speedup을 얻는다.

## 7. 손으로 해볼 것

먼저 16x16 fragment 하나를 scalar element 하나처럼 생각하고, block matrix multiplication 식을 써 보자. `C_ij += A_ik * B_kj`에서 각 문자가 scalar가 아니라 fragment라고 보면 WMMA 코드가 훨씬 덜 낯설다.

그 다음 Nsight Compute를 켜고 같은 kernel의 두 version을 비교해 보자. B row-major version과 B column-major version을 만들고, wall time만 보지 말고 memory traffic, instruction count, `LG throttle`, `long scoreboard`를 같이 적는다. counter가 왜 좋아졌는지, 혹은 왜 직관과 다르게 보이는지 설명하는 연습이 이 강의의 진짜 과제다.

## Source Links

- [YouTube](https://www.youtube.com/watch?v=BgGe_erJB1A)
- [GPU Mode lectures repo](https://github.com/gpu-mode/lectures)
- Local notes: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/notes/lecture_043.md`
- Local transcript: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/transcripts/lecture_043.md`
