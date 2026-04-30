---
num: 29
title: Triton 안쪽으로 내려가기
original: "Lecture 29: Triton Internals"
speaker: Kapil Sharma
part: 3
part_label: Part III · 커널 프레임워크와 이식성
priority: High
status: rich
---

:::crux
Triton은 Python처럼 보이지만, 실행될 때는 Python DSL, Triton IR, Triton GPU IR, LLVM, PTX, cubin을 지나 driver가 load할 binary가 된다. 이 강의의 핵심은 “마법”을 없애는 것이다. Cache directory에 떨어지는 IR과 binary를 직접 보면, kernel tuning은 더 이상 검은 상자와의 눈치싸움이 아니다.
:::

## 1. 표면은 Python, 안쪽은 compiler

Kapil Sharma의 강의는 Triton을 쓰는 사람에게 “내 kernel이 어디로 가는가?”를 보여준다. Triton은 researcher와 engineer가 Python style DSL로 GPU kernel을 빠르게 작성하게 해준다. 그래서 PyTorch code에서 `@triton.jit`를 붙이면 뭔가 알아서 빠른 kernel이 생기는 듯 보인다.

하지만 그 안에는 compiler pipeline이 있다. CUDA도 host code와 device code가 분리되어 nvcc, host compiler, PTX, cubin을 거친다. Triton도 마찬가지로 여러 IR lowering 단계를 거친다. 차이는 CUDA C++ source가 아니라 Triton DSL에서 시작하고, MLIR ecosystem을 적극적으로 쓴다는 점이다.

## 2. CUDA compilation과 Triton compilation

CUDA 쪽에서는 nvcc toolchain이 host C++ code를 일반 compiler로 보내고, device code는 PTX 또는 cubin 쪽으로 내린다. PTX는 NVIDIA의 virtual ISA이고, 최종 실행은 architecture-specific SASS로 이어진다. Compiler Explorer 같은 도구로 vector add kernel의 PTX/SASS를 볼 수 있다.

Triton은 Python DSL을 common Triton IR로 바꾸고, target에 맞게 Triton GPU IR, NVIDIA GPU 관련 IR, LLVM IR, PTX, cubin으로 내려간다. 이 흐름은 “Triton이 portable할 수 있는 이유”와 “portable하지만 backend마다 다른 최적화가 필요한 이유”를 동시에 설명한다. Common IR이 있다고 해서 모든 hardware detail이 사라지는 것은 아니다.

:::figure flow
label: Figure · Triton kernel이 내려가는 길
- Python DSL: `@triton.jit` 함수와 block-level tensor 연산
- TTIR: Triton의 공통 intermediate representation
- TTGIR: GPU layout, program id, load/store가 더 구체화된 IR
- LLVM/PTX: backend가 이해하는 낮은 표현으로 lowering
- cubin/SASS: driver가 load하고 GPU가 실행하는 binary
:::

## 3. Triton cache는 공부 도구다

강의에서 가장 실용적인 장면은 cache directory를 직접 여는 부분이다. Triton은 기본적으로 home 아래 `.triton/cache`에 compile artifact를 둔다. Cache를 지우고 vector add kernel을 compile하면 TTIR, TTGIR, PTX, cubin, launcher 관련 shared library 같은 파일이 생긴다.

이 파일들을 보면 `program_id`, pointer arithmetic, masked load/store가 어떤 IR로 표현되는지 보인다. 성능 문제가 생겼을 때 “Triton이 이상해요”에서 멈추지 않고, 어느 단계에서 layout conversion이 생겼는지, load/store가 예상과 다른지, PTX가 어떤 모양인지 확인할 수 있다. 좋은 debugging은 추측의 양을 줄이는 일이다.

## 4. MLIR와 dialect라는 언어

MLIR의 ML은 machine learning이 아니라 Multi-Level Intermediate Representation이다. Compiler를 만들기 위한 toolkit에 가깝다. Triton은 MLIR 위에서 Triton 전용 dialect, Triton GPU dialect, NVIDIA GPU 쪽 dialect를 정의하고, 여러 pass를 통해 IR을 바꾼다.

Kapil은 constant propagation, dead code elimination, inlining, canonicalization, common subexpression elimination 같은 pass도 언급한다. 일부는 MLIR 생태계의 standard pass이고, Triton은 Python binding으로 이를 사용한다. 여기서 얻을 교훈은 단순하다. Triton kernel을 잘 쓰려면 syntax만 보지 말고, compiler가 볼 수 있는 형태로 정보를 주어야 한다.

## 5. target이 늘어날수록 질문도 늘어난다

강의 중 질문은 Metal, HIP, Triton CPU 같은 target으로 이어진다. 어느 IR layer에 다른 DSL을 꽂을 수 있는가? Triton IR을 common layer로 삼을 수 있는가? CPU backend에서는 x86 assembly로 내려갈 수 있는가? 이 질문들은 모두 같은 방향을 본다. GPU programming은 이제 단일 vendor API만의 문제가 아니라, compiler interface의 문제가 되었다.

그렇다고 “한 IR이면 모든 것이 해결된다”는 식으로 읽으면 곤란하다. IR이 높을수록 만들기 쉽지만 hardware-specific scheduling 정보는 덜 들어 있다. IR이 낮을수록 hardware에 가까우나 사람이 쓰기 어렵다. Triton의 가치는 그 사이에서 꽤 좋은 타협점을 제공한다는 데 있다.

## 6. 손으로 해볼 것

Triton vector add 예제를 하나 만들고, cache directory를 비운 뒤 실행해보자. 생성된 TTIR, TTGIR, PTX를 열어 `program_id`, mask, load, store가 어디에 나타나는지 표시한다. 이 작업은 한 번만 해도 Triton을 보는 눈이 달라진다.

다음에는 block size를 바꾸고 artifact가 어떻게 바뀌는지 비교한다. 시간이 있으면 `TRITON_CACHE_DIR`를 별도 위치로 지정해 실험별 artifact를 보존하자. Kernel tuning notebook 옆에 IR diff를 남기면, 나중에 자기 자신에게 꽤 친절한 사람이 된다.

## Source Links

- [YouTube](https://www.youtube.com/watch?v=njgow_zaJMw)
- [Lecture 029 repo folder](https://github.com/gpu-mode/lectures/tree/main/lecture_029)
- [Slides PDF](https://github.com/gpu-mode/lectures/blob/main/lecture_029/presentation.pdf)
- [vector_add.py](https://github.com/gpu-mode/lectures/blob/main/lecture_029/vector_add.py)
- Local notes: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/notes/lecture_029.md`
- Local transcript: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/transcripts/lecture_029.md`
