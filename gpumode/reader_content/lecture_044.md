---
num: 44
title: NVIDIA Profiling, 자료가 부족할 때의 읽기 지도
original: "Lecture 44: NVIDIA Profiling"
speaker: Unknown
part: 4
part_label: Part IV · 프로덕션 커널과 GEMM
priority: Medium
status: partial
---

:::crux
이 원고는 transcript와 slide 없이 제목과 YouTube metadata만으로 남기는 source-limited 원고다. 따라서 강의가 실제로 어떤 profiler 화면과 counter를 다뤘는지는 확인하지 않는다. 다만 제목이 가리키는 핵심 질문은 분명하다. **NVIDIA Profiling은 느린 kernel을 감으로 고치는 대신, 어떤 counter와 trace를 보고 다음 실험을 정할 것인가의 문제**다.
:::

## 1. 지금 확인된 것과 확인되지 않은 것

사용 가능한 local notes에 따르면 이 강의의 제목은 `NVIDIA Profiling`이고, transcript fetch는 실패했다. speaker, slides, code, related repo folder도 확인되지 않았다. 그러므로 아래 내용은 강의 내용의 재구성이 아니라, 이 강의를 다시 볼 때 붙잡을 reading guide다.

특히 어떤 profiler를 썼는지, Nsight Systems인지 Nsight Compute인지, NVTX range나 CUDA event를 어떻게 다뤘는지, 어떤 benchmark를 보여줬는지는 확인 필요다. 숫자나 tool option을 지어내지 않는 편이 낫다. profiling 강의에서 틀린 counter 이름 하나는 작은 오타가 아니라 잘못된 debugging 습관이 된다.

## 2. profiling은 시간을 쪼개는 일이다

NVIDIA Profiling을 읽을 때 첫 질문은 "전체가 느리다"가 아니라 "어느 층에서 시간이 쓰이는가"여야 한다. Python overhead인지, kernel launch overhead인지, H2D/D2H copy인지, kernel 내부 memory stall인지, Tensor Core utilization 문제인지 분리해야 한다.

보통 trace 수준 도구는 timeline을 보여주고, kernel 수준 도구는 counter를 보여준다. 이 구분을 머릿속에 두면 좋다. timeline은 "언제 무엇이 실행됐나"를 묻고, counter는 "그 kernel 안에서 왜 기다렸나"를 묻는다.

:::figure ladder
label: Figure · profiling을 내려가는 순서
- wall time: 사용자 입장에서 느린 구간을 찾는다
- timeline: CPU, copy, kernel launch, GPU execution의 순서를 본다
- kernel metrics: memory throughput, occupancy, warp stall, instruction mix를 확인한다
- source line: 병목 counter가 실제 코드의 어느 load/store/loop와 연결되는지 찾는다
- experiment: tile size, layout, fusion, synchronization을 하나씩 바꿔 다시 잰다
:::

## 3. counter는 답이 아니라 다음 질문이다

`occupancy`가 낮다고 항상 occupancy를 올려야 하는 것은 아니다. register를 더 쓰면서 memory traffic을 줄이면 occupancy는 내려가도 kernel은 빨라질 수 있다. `long scoreboard`가 높다고 무조건 prefetch를 넣는 것도 아니다. 실제로는 uncoalesced access, cache miss, dependency chain, insufficient independent work가 섞여 있을 수 있다.

좋은 profiling 습관은 counter를 처방전처럼 읽지 않는 것이다. counter는 다음 실험을 고르게 해 준다. memory throughput이 낮고 warp가 memory를 기다린다면 layout을 바꿔 보고, shared memory stall이 크다면 bank conflict나 load pattern을 의심한다. 하지만 실험은 하나씩 해야 한다. 두 개를 동시에 바꾸면 profiler가 답을 해도 사람이 못 알아듣는다.

## 4. 작은 kernel 하나로 도구를 익히자

이 강의를 다시 볼 때는 vector add보다 조금 더 구조가 있는 kernel을 곁에 두면 좋다. 예를 들어 row-wise reduction, transpose, tiled matmul 같은 작은 kernel을 준비하고, naive version과 optimized version을 만든다. 그러면 profiler counter의 변화가 더 잘 보인다.

특히 transpose는 memory coalescing을 보기 좋고, reduction은 synchronization과 occupancy를 보기 좋다. matmul은 Tensor Core, shared memory, register pressure, arithmetic intensity를 한꺼번에 다루지만 처음 도구를 익히기에는 조금 클 수 있다.

## 5. 확인할 것

원본 영상을 볼 때는 세 가지를 확인하자. 첫째, 강의자가 어떤 tool을 중심으로 설명하는가. 둘째, "항상 먼저 보는 화면"이 무엇인가. 셋째, counter를 보고 실제 code change로 이어지는 예제가 있는가.

자료가 보강되면 이 partial 원고는 실제 예제 중심으로 다시 써야 한다. 지금 버전은 독자를 속이지 않는 placeholder에 가깝다. 빈칸을 솔직하게 남기는 것도 reader의 품질이다.

## Source Links

- [YouTube](https://www.youtube.com/watch?v=F_BazucyCMw)
- Local notes: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/notes/lecture_044.md`
- Local transcript stub: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/transcripts/lecture_044.md`
