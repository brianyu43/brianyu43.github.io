---
num: 96
title: "TLX, Triton 너머의 kernel 언어를 읽는 법"
original: "Lecture 96: TLX"
speaker: Missing
part: 7
part_label: Part VII · 시스템 실전과 최신 주제
priority: High
status: partial
---

:::crux
이 노트는 transcript, slides, code가 없는 자료가 제한된 노트다. local notes는 title과 YouTube link만 주지만, 자동 추출된 topic hint에는 Triton, kernel, warp, fusion, scheduling이 남아 있다. 따라서 핵심 질문은 **TLX가 어떤 kernel programming abstraction을 제안하며, Triton의 생산성과 low-level scheduling control 사이 어디에 서는가**로 잡는다.
:::

## 1. 알려진 것과 모르는 것

speaker는 local notes에서 Missing으로 되어 있다. transcript fetch는 실패했고 slides/code/repo folder도 없다. TLX가 특정 library 이름인지, Triton extension인지, compiler IR인지, research language인지는 원본 확인 전까지 확정할 수 없다.

다만 Triton, kernel, warp, fusion, scheduling이라는 단서가 함께 잡힌다. 이 조합은 보통 "타일 단위로 쉽게 쓰되, 더 낮은 실행 제어를 어떻게 줄 것인가"라는 질문으로 이어진다.

## 2. Triton이 준 좋은 기본값

Triton은 Python 안에서 tile-based GPU kernel을 쓰게 해 준다. program id로 tile을 나누고, block pointer와 vectorized operation으로 memory access를 표현하며, compiler가 많은 lowering을 맡는다. 이 생산성은 실제로 큰 힘이다.

하지만 더 복잡한 kernel로 갈수록 기본값만으로 부족해진다. warp specialization, async copy, shared memory swizzle, inter-warp communication, fusion boundary 같은 결정은 compiler가 늘 맞히기 어렵다. TLX가 이 영역을 다룬다면, 독자는 "무엇을 더 노출하는가"를 봐야 한다.

:::figure ladder
label: Figure · kernel DSL을 읽을 때의 abstraction 사다리
- tensor_op: PyTorch 같은 framework operation
- tile_program: Triton식 block/tile program
- warp_plan: warp별 역할, pipeline, synchronization
- instruction_path: MMA, load/store, barrier 같은 hardware primitive
- measurement: profiler counter와 benchmark로 가설을 검증
:::

## 3. fusion은 공짜 점심이 아니다

fusion은 kernel launch overhead와 global memory traffic을 줄일 수 있다. 그러나 fusion이 커지면 register pressure, occupancy, scheduling complexity가 올라간다. 어떤 op를 붙이면 빨라지고, 어떤 op를 붙이면 느려지는지 profiler 없이 맞히기는 어렵다.

TLX가 fusion을 강조한다면, 단순히 "여러 op를 하나로"가 아니라 intermediate를 어디에 두는지, layout을 어떻게 유지하는지, reduction과 elementwise를 어떻게 섞는지 확인해야 한다. fusion은 요리라기보다 짐 싸기에 가깝다. 너무 많이 넣으면 가방이 안 닫힌다.

## 4. warp와 scheduling을 드러낸다는 뜻

warp-level control은 성능을 열어 주지만, 동시에 correctness 부담을 키운다. 누가 load하고, 누가 compute하고, 어느 barrier에서 만나며, shared memory를 언제 덮어써도 되는지 명확해야 한다.

좋은 DSL은 low-level primitive를 그냥 노출하는 데서 끝나지 않는다. 사용자가 잘못된 schedule을 만들었을 때 compiler가 잡아 줄 수 있는지, layout conversion과 synchronization을 추적할 수 있는지, generated code를 살펴볼 수 있는지가 중요하다.

## 5. 원본에서 확인할 질문

TLX가 Triton syntax를 확장하는지, 별도 IR을 제안하는지, 혹은 특정 backend를 위한 compiler pass인지 확인하자. 예제 kernel이 있다면 matmul, attention, reduction, scan 중 무엇인지도 중요하다.

benchmark가 있다면 비교 기준을 조심해서 보자. PyTorch, Triton, CUDA, vendor library 중 무엇과 비교했는지, shape와 dtype은 무엇인지, tuning effort가 같았는지 확인해야 한다. kernel language 비교는 code length만으로 끝나지 않는다.

## 6. 혼자 해볼 것

Triton으로 작은 fused operation을 하나 작성해 보자. 예를 들어 `y = gelu(x @ w + b)`를 matmul과 epilogue로 나누어 생각하고, fusion이 memory traffic을 줄이는 대신 register pressure를 늘릴 수 있음을 기록한다.

그다음 `num_warps`, block size, `num_stages`를 바꾸며 benchmark를 남긴다. TLX 원본을 볼 때 이 표가 있으면 "이 언어가 무엇을 자동화하고 무엇을 사용자에게 맡기는지" 더 잘 보인다.

## Source Links

- [YouTube](https://www.youtube.com/watch?v=TH1i-GmMZuQ)
- Local notes: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/notes/lecture_096.md`
- Local transcript stub: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/transcripts/lecture_096.md`
