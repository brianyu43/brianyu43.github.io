---
num: 20
title: Scan, 순차 의존성을 병렬로 펴기
original: "Lecture 20: Scan Algorithm"
speaker: Izzat El Haj
part: 2
part_label: Part II · 병렬 패턴과 Attention
priority: High
status: rich
---

:::crux
Scan(prefix sum)은 겉보기에는 순차적이다. `y[i]`가 앞의 모든 `x`에 의존하기 때문이다. GPU에서 scan을 한다는 것은 이 의존성을 shared memory와 synchronization으로 잘게 펴는 일이다. 이 강의의 핵심은 **single thread block 안에서 scan을 어떻게 병렬화하고, 어디서 sync가 필요한지**를 보는 것이다.
:::

## 1. inclusive와 exclusive scan

Scan은 associative operator를 입력 배열 앞에서부터 누적한 결과다. addition을 예로 들면 inclusive scan은 `x[0] + ... + x[i]`를 `y[i]`에 둔다. exclusive scan은 `x[i]`를 빼고 `x[0] + ... + x[i-1]`를 둔다. 첫 값은 identity, 덧셈이면 0이다.

이 연산은 parallel computing의 작은 스위스칼 같은 존재다. stream compaction에서 각 thread가 결과를 어디에 써야 하는지 정하고, radix sort와 histogram, parsing, graph algorithm에서도 자주 나온다. 특히 exclusive scan은 “내 앞에 몇 개가 있었나”를 알려주기 때문에 위치 계산에 강하다.

## 2. 큰 scan은 segment로 나눈다

전체 배열을 한 번에 모든 thread가 scan할 수는 없다. thread block 사이 synchronization이 비싸고 제한적이기 때문이다. 그래서 먼저 input을 segment로 나누고, 각 block이 자기 segment를 scan한다. 각 block은 자기 segment의 partial sum도 남긴다.

그 다음 partial sum 배열을 다시 scan한다. 마지막으로 각 block은 앞 block들의 prefix sum을 자기 segment 결과에 더한다. 이 구조는 여러 kernel launch가 필요할 수 있다. Lecture 20은 이 전체 구조 중 첫 단추, 즉 single block scan에 집중한다.

:::figure flow
label: Figure · segmented scan의 세 단계
- local scan: 각 thread block이 자기 segment를 shared memory에서 scan
- scan partials: 각 block의 마지막 값을 모아 다시 scan
- uniform add: 앞 segment들의 합을 각 block 결과에 더함
:::

## 3. single block scan의 첫 구현

single block 안에서는 shared memory가 핵심이다. global memory에서 input을 읽어 shared memory buffer에 넣고, 여러 step의 scan 연산을 shared memory 안에서 수행한 뒤 결과를 global memory에 쓴다. 매 step마다 thread들이 서로의 값을 읽으므로 `__syncthreads()` 위치가 중요하다.

가장 직접적인 병렬 scan은 stride를 1, 2, 4, ...로 키우며 각 thread가 `i - stride` 값을 더하는 방식이다. 이 방식은 이해하기 쉽지만 각 step마다 같은 buffer를 읽고 쓰면 hazard가 생긴다. 한 thread가 방금 쓴 값을 다른 thread가 같은 step에서 읽어버리면 원래 의도한 이전 단계 값이 아니다.

## 4. double buffering과 boundary check

이 문제를 피하는 쉬운 방법은 double buffering이다. 한 buffer에서 읽고 다른 buffer에 쓰며 step마다 역할을 바꾼다. shared memory를 두 배로 쓰지만, 같은 step 안에서 읽기와 쓰기가 섞이는 위험을 줄인다. 강의에서는 이런 bug를 일부러 찾아보는 흐름도 나온다.

또 하나의 습관은 모든 memory access에 boundary check를 붙이는 것이다. stride가 커질수록 `threadIdx - stride`가 음수가 될 수 있고, 마지막 block에서는 global index가 `n`을 넘을 수 있다. GPU kernel에서 out-of-bounds는 조용히 틀린 값을 만들 수 있다. 조용한 버그가 제일 시끄럽게 시간을 잡아먹는다.

## 5. work efficiency를 묻기

Sequential scan은 O(n) work를 한다. 단순 병렬 scan은 step마다 많은 thread가 더하므로 O(n log n) work가 될 수 있다. parallel time은 줄었지만 총 work는 늘어난다. 이때 “work efficient한가?”라는 질문이 나온다.

이 강의에서는 최적 scan의 모든 답을 내기보다, 왜 더 좋은 알고리즘이 필요한지 감각을 만든다. shared memory를 쓰면 global memory traffic은 줄지만, synchronization과 extra work가 남는다. 다음 강의는 이 비용을 더 줄이는 방향으로 간다.

## 6. 손으로 해볼 것

입력 `[3, 6, 7, 4, 8, 2, 1, 9]`의 inclusive/exclusive scan을 손으로 계산한다. 그 다음 stride 1, 2, 4 step을 표로 그려 각 thread가 어느 값을 읽는지 표시한다. 같은 buffer를 제자리에서 update하면 어느 step에서 값이 오염되는지도 찾아보자.

CUDA로 구현한다면 block size를 작게 잡고 shared memory buffer를 출력해보는 것이 좋다. 성능보다 correctness가 먼저다. scan은 작은 index 실수 하나가 전체 뒤쪽 결과를 다 밀어버린다.

## Source Links

- [YouTube](https://www.youtube.com/watch?v=ZKrWyEqqPVY)
- [Slides](https://docs.google.com/presentation/d/1MEMsE5LKi6ush_60hlYu3-cz4DUCFzSL/edit?usp=sharing&ouid=106222972308395582904&rtpof=true&sd=true)
- Local notes: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/notes/lecture_020.md`
- Local transcript: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/transcripts/lecture_020.md`
