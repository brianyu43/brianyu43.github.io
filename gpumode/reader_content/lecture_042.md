---
num: 42
title: Mosaic GPU와 Palace, 낮은 층을 Python으로 쓰기
original: "Lecture 42: Mosaic GPU"
speaker: Adam Paszke
part: 4
part_label: Part IV · 프로덕션 커널과 GEMM
priority: High
status: rich
---

:::crux
Mosaic GPU는 "Python으로 GPU kernel을 쉽게 쓰자"에서 멈추지 않는다. 목표는 Hopper와 Blackwell 같은 modern GPU의 TMA, WGMMA, block cluster, warp specialization을 노출하되, 반복되는 boilerplate는 걷어내는 것이다. 핵심 질문은 **peak performance를 위해 사람이 결정해야 할 것과 compiler/helper가 대신 해도 되는 것을 어디서 나눌 것인가**다.
:::

## 1. 예전 ML framework의 목표와 지금의 목표

Adam Paszke는 PyTorch 시절의 목표를 generality와 usability로 설명한다. 다양한 연구 아이디어를 빠르게 돌리는 것이 중요했고, 성능을 어느 정도 잃어도 연구 속도가 이겼다. 하지만 Transformer가 너무 성공하면서 상황이 바뀌었다. 많은 workload가 matmul, attention, normalization, pointwise op 주변으로 모였고, 몇 퍼센트 성능 차이가 큰 비용 차이가 된다.

그래서 kernel language의 목적도 달라진다. 처음부터 PyTorch나 JAX 대신 쓰는 생산성 도구가 아니다. 기본 framework로 충분히 빠르면 그대로 쓰면 된다. kernel language는 성능이 아쉬울 때 꺼내는 도구이고, 그때는 peak performance가 첫 번째 목표가 된다.

Mosaic GPU와 Palace는 이 위치에 있다. Python front end를 쓰지만, 편함만을 위해 low-level hardware detail을 숨기지는 않는다. 오히려 TMA, WGMMA, register allocation hint, block cluster처럼 성능에 영향을 주는 knob을 드러낸다. 대신 반복적이고 실수하기 쉬운 pipeline wiring은 helper로 줄인다.

## 2. Python DSL의 여러 맛

강의 초반에는 C++ template, string-based metaprogramming, Triton식 AST parsing, JAX/Palace식 tracing의 tradeoff가 나온다. C++ template은 강력하지만 error message와 debugging이 고통스러울 수 있다. string template은 단순하고 실용적이지만 scope, name collision, type checking 문제가 있다.

Triton은 Python AST를 읽고 `constexpr` 같은 staged programming을 제공한다. Palace는 JAX처럼 tracing한다. Python `if`는 trace 시점에 한 branch만 남고, Python `for`는 unroll되는 식이다. 일반 JAX에서는 이 제약이 불편할 때가 있지만, kernel에서는 오히려 자연스럽다. kernel programming에서는 unroll과 specialization이 성능 전략이기 때문이다.

Adam이 원하는 것은 "manual kernel을 잘 쓰는 playground"다. compiler가 완벽한 결정을 해 주기를 기다리지 않고, 사람이 tile size, pipeline, memory space, warp specialization 같은 중요한 선택을 직접 한다. 하지만 선택과 무관한 잡일은 자동화한다.

## 3. Palace의 기본 감각: reference와 block spec

Palace kernel의 인자는 일반 JAX array가 아니라 shaped reference다. `x_ref[...]`처럼 읽으면 그 시점의 값을 register 쪽 immutable array로 가져오고, `z_ref[...] = ...`처럼 쓰면 output reference에 저장한다. C의 pointer처럼 생겼지만, shape가 있는 reference라서 NumPy식 slicing 감각을 유지한다.

parallelism은 `grid`로 만든다. 하나의 program invocation이 output의 어느 tile을 맡는지 정하고, `program_id`에 해당하는 grid coordinate로 slice를 잡는다. Triton의 block pointer와 비슷한 문제를 Palace는 `BlockSpec`으로 더 명시적으로 표현한다.

`BlockSpec`은 두 가지를 말한다. 첫째, input/output을 어떤 tile shape로 자를 것인가. 둘째, grid coordinate가 그 tile coordinate로 어떻게 mapping되는가. 이 access pattern을 kernel body 밖에서 선언하면 runtime/compiler가 memory transfer와 compute를 pipeline할 수 있다. 여기서 중요한 말은 "optimization이 우연히 발견된다"가 아니라 "programmer가 access pattern을 약속했기 때문에 pipeline이 가능하다"다.

:::figure flow
label: Figure · Palace에서 matmul tile이 실행되기까지
- grid: output matrix를 BM x BN tile들로 나눈다
- block spec: A, B, C의 tile shape와 grid-to-tile mapping을 선언한다
- reference slice: kernel body는 pre-sliced reference를 받는다
- pipeline: GMEM에서 SMEM으로 옮기는 작업과 compute를 겹친다
- backend extension: Mosaic GPU가 TMA, WGMMA, swizzle, cluster 같은 feature를 쓴다
:::

## 4. modern GPU는 TPU를 닮아간다

Adam은 GPU와 TPU의 수렴을 흥미롭게 설명한다. classic GPU programming model은 많은 work를 flight에 띄워 memory latency를 숨기는 데 강했다. 하지만 modern GPU에서 WGMMA 같은 큰 Tensor Core instruction을 쓰면 한 block이 shared memory와 register를 많이 먹는다. 한 SM에 여러 block을 올려 latency를 숨기는 방식이 약해진다.

그래서 Hopper 이후의 GPU는 더 계획적인 pipeline을 요구한다. TMA로 HBM-to-SMEM transfer를 명시적으로 관리하고, WGMMA로 warp group 단위 matmul을 돌리며, block cluster와 TMA multicast로 block 사이 shared memory에 data를 뿌린다. 이 모습은 TPU의 static scheduling 감각과 가까워진다.

Mosaic GPU는 이 흐름을 전제로 한다. "portable한 하나의 kernel"보다 "hardware generation의 feature를 제대로 쓰는 kernel"을 우선한다. portability는 좋지만, 목표가 최고 성능이면 backend-specific API를 쓰는 것이 자연스럽다.

## 5. TMA, WGMMA, warp specialization을 어떻게 숨기지 않을까

Mosaic GPU는 SMEM allocation을 추상화하지 않는다. `run_scoped`로 shared memory와 barrier를 잡고, GMEM-to-SMEM copy를 명시할 수 있다. TMA descriptor 생성과 host/device descriptor 관리 같은 지루한 부분은 helper가 맡는다. 즉 control은 남기고 잡음은 줄인다.

`emit_pipeline`은 더 높은 수준의 helper다. programmer가 "이 compute를 여러 step으로 돌리고, 각 step에서 어떤 slice를 읽고 쓸지"를 `BlockSpec`으로 말하면, helper가 async copy와 wait, double buffering에 가까운 pipeline 구조를 만들어 준다. TMA swizzle이나 tiling transform도 block spec에 붙일 수 있다. Tensor Core가 좋아하는 layout으로 copy 도중 data를 재배치하는 식이다.

WGMMA도 같은 흐름이다. Hopper의 warp group MMA는 shared memory에서 operand를 읽고 accumulator에 누적한다. Mosaic GPU는 이를 Python DSL에서 호출할 수 있게 한다. block cluster와 TMA multicast도 직접 assembly를 엮는 대신 "이 copy를 cluster의 특정 dimension에 collective하게 하라"는 형태로 표현하려 한다.

## 6. FlashAttention 3와 profiler가 보여준 것

강의에서 가장 구체적인 demo는 FlashAttention 3 kernel이다. Adam은 Palace/Mosaic GPU 구현이 Hopper에서 70%대 Tensor Core utilization을 얻었고, kernel도 100-150줄 정도의 Python으로 표현된다고 설명한다. 정확한 숫자는 slide와 benchmark 조건을 함께 확인해야 하지만, 메시지는 분명하다. 낮은 층을 쓰더라도 boilerplate를 줄이면 kernel이 읽을 수 있는 크기로 남는다.

또 하나 인상적인 부분은 work group level profiler다. JAX `named_scope`를 Palace 안에서도 쓰게 하고, kernel 내부 event를 SMEM에 기록한 뒤 GMEM으로 복사해 Chrome tracing이나 Perfetto에서 본다. 각 process를 SM처럼, 각 line을 warp group처럼 해석해 QK, softmax, PV, barrier wait가 시간축에서 어떻게 겹치는지 본다.

FlashAttention 3에서는 한 warp group이 softmax를 계산하는 동안 다른 warp group이 matmul을 하도록 barrier로 stagger한다. softmax는 ALU를 쓰고 matmul은 Tensor Core를 쓰므로, 두 hardware unit을 동시에 바쁘게 만들려는 전략이다. head dimension 64와 256에서 softmax와 matmul의 상대 비용이 달라지는 모습도 trace에서 보인다.

## 7. 손으로 해볼 것

Palace를 바로 설치하지 않아도, 먼저 matmul의 `BlockSpec`을 종이에 써 보자. C의 `(pid_m, pid_n)` tile을 계산하려면 A는 `(pid_m, 0)` tile, B는 `(0, pid_n)` tile, C는 `(pid_m, pid_n)` tile을 본다. 이 mapping을 lambda로 적는 연습만 해도 "pointer arithmetic 대신 access pattern 선언"이라는 감각이 잡힌다.

그 다음 FlashAttention을 hardware resource 관점으로 나눠 보자. QK와 PV는 Tensor Core, softmax는 ALU, KV loading은 memory pipeline, barrier는 synchronization이다. trace를 상상하며 어느 resource가 비는지 적어 보면 왜 warp specialization이 단순한 마법 단어가 아닌지 보인다.

## Source Links

- [YouTube](https://www.youtube.com/watch?v=wKd90avC8Nc)
- [Lecture 042 repo folder listed in local notes](https://github.com/gpu-mode/lectures/tree/main/lecture_042)
- [Slides link listed in local notes](https://github.com/gpu-mode/lectures/blob/main/lecture_042/int8_mm_turing.pdf)
- Local notes: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/notes/lecture_042.md`
- Local transcript: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/transcripts/lecture_042.md`
