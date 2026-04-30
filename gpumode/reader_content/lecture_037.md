---
num: 37
title: SASS를 읽는 이유
original: "Lecture 37: Introduction to SASS & GPU Microarchitecture"
speaker: Arun Demeure
part: 3
part_label: Part III · 커널 프레임워크와 이식성
priority: High
status: rich
---

:::crux
SASS를 공부하는 목적은 대부분 직접 assembly를 쓰기 위해서가 아니다. CUDA나 Triton code가 실제 GPU에서 어떤 instruction, register, pipeline, scheduler bottleneck으로 바뀌는지 진단하기 위해서다. PTX와 SASS는 1:1이 아니며, profiler의 line mapping도 완벽하지 않다. Assembly는 정답지가 아니라 현미경이다.
:::

## 1. 왜 SASS를 보나

Arun Demeure는 강의 초반에 중요한 경고를 한다. H100 같은 GPU에서 완전한 custom SASS를 open-source assembler만으로 편하게 쓰기는 어렵다. 그렇다면 왜 SASS를 공부할까? 답은 더 좋은 CUDA와 Triton을 쓰기 위해서다.

High-level language는 빨리 시작하게 해준다. 하지만 kernel이 정말 한계에 가까워질수록 vector load, register allocation, uniform register, instruction scheduling 같은 detail이 성능을 좌우한다. SASS를 읽으면 compiler가 내 의도를 어떻게 바꾸었는지 볼 수 있다. GPU 최적화에서 “내 코드는 이렇게 생겼는데요”는 종종 변명거리가 되지 못한다.

## 2. PTX는 실행 instruction이 아니다

PTX는 virtual ISA다. 실제 GPU가 실행하는 것은 SASS다. Arun은 아주 단순한 integer addition 예시로 PTX와 SASS가 1:1이 아님을 보여준다. PTX에서는 두 입력 addition처럼 보이는 것이 SASS에서는 `IADD3`처럼 세 입력 instruction으로 합쳐질 수 있다. 사용하지 않던 operand slot이 다른 계산과 합쳐지는 식이다.

Bitwise operation도 마찬가지다. 여러 logical operation이 `LOP3` 같은 instruction으로 합쳐질 수 있다. 이 변환은 compiler가 한다. 그래서 source line과 SASS instruction의 mapping은 자주 애매하다. 한 instruction이 여러 source operation에서 왔을 수 있고, 한 source line이 여러 instruction으로 흩어질 수 있다.

:::figure flow
label: Figure · CUDA code를 SASS로 읽는 순서
- source: CUDA/Triton code에서 의도한 연산을 확인
- PTX: virtual ISA 수준에서 compiler output을 본다
- SASS: 실제 instruction과 register 사용을 본다
- profile: stall, pipe utilization, memory metric과 연결한다
- rewrite: source를 compiler가 더 잘 최적화할 수 있게 바꾼다
:::

## 3. Architecture마다 사소하게, 그래서 크게 다르다

Volta, Turing, Ampere, Hopper는 비슷해 보이지만 instruction과 resource model이 계속 바뀐다. 예를 들어 uniform register는 per-warp 값처럼 동작하며, compiler가 이를 사용할 수 있게 code를 써야 할 때가 있다. CUDA나 PTX에서 직접 모든 것을 통제할 수 있는 것은 아니다.

또한 일부 constant memory access는 instruction 안에 섞여 보이지만 cache miss가 나면 큰 latency를 만들 수 있다. 이런 detail은 흔히 rare case처럼 보이지만, performance counter나 SASS를 읽을 때 설명력이 생긴다. Low-level 공부의 가치는 모든 것을 외우는 데 있지 않다. 이상한 profiler 결과를 만났을 때 물어볼 질문이 늘어나는 데 있다.

## 4. SM은 하나의 큰 덩어리가 아니다

Arun은 SM 내부 partition 관점도 강조한다. Warp scheduler, register allocation, pipeline은 per-SM 하나로만 생각하면 너무 거칠다. 예를 들어 sub-core/partition 단위로 warp가 배치되고, register allocation threshold에 따라 occupancy가 계단식으로 바뀔 수 있다.

Pipeline 이름도 오해를 부른다. Integer pipe가 integer만 하는 것이 아니고, fp32 pipe도 어떤 integer multiply를 처리할 수 있다. Newer architecture에서는 fp32-only pipe가 추가되는 식으로 변화가 있다. 결국 bottleneck은 “FP32 FLOPs가 부족함”처럼 간단히 끝나지 않는다. Decode/fetch/schedule rate, pipeline mix, memory instruction이 함께 본문이다.

## 5. Occupancy만으로 latency를 숨길 수 없다

Little's law 관점도 나온다. Throughput을 유지하려면 latency를 덮을 만큼 충분한 parallel work가 필요하다. 여기서 parallelism은 thread-level occupancy만 뜻하지 않는다. Instruction-level parallelism, 동시에 outstanding load가 얼마나 있는지, warp들이 program의 어느 위치에 흩어져 있는지도 중요하다.

Profiler에서 warp stall을 볼 때도 조심해야 한다. “warp가 stall했다”는 말은 원인 하나를 말해주지 않는다. Memory dependency인지, scheduler pressure인지, pipeline contention인지, register spill인지 더 파고들어야 한다. SASS와 microarchitecture 지식은 이 진단을 덜 흐리게 만든다.

## 6. 손으로 해볼 것

작은 CUDA kernel을 Compiler Explorer나 `cuobjdump`/`nvdisasm`으로 보고 PTX와 SASS를 비교해보자. Add 두 개, bitwise op 몇 개처럼 아주 단순한 code가 오히려 좋다. Compiler가 instruction을 합치는 장면을 직접 보면 PTX를 보는 태도가 달라진다.

그 다음 같은 kernel을 조금 바꾸어 register count와 occupancy가 어떻게 변하는지 Nsight Compute로 본다. SASS를 읽는 목적은 멋진 assembly 암송이 아니다. Source를 어떻게 바꾸면 compiler와 hardware가 덜 힘들어하는지 배우는 것이다.

## Source Links

- [YouTube](https://www.youtube.com/watch?v=we3i5VuoPWk)
- [Lecture 037 repo folder](https://github.com/gpu-mode/lectures/tree/main/lecture_037)
- [Slides PDF](https://github.com/gpu-mode/lectures/blob/main/lecture_037/sass_and_gpu_uarch.pdf)
- [Speaker GitHub](https://github.com/ademeure)
- Local notes: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/notes/lecture_037.md`
- Local transcript: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/transcripts/lecture_037.md`
