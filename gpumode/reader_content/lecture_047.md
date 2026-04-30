---
num: 47
title: KernelBot, Discord에서 커널을 재는 법
original: "Lecture 47: KernelBot Benchmark GPU Kernels on Discord"
speaker: Unknown
part: 4
part_label: Part IV · 프로덕션 커널과 GEMM
priority: High
status: partial
---

:::crux
transcript와 code가 없어 KernelBot의 실제 architecture는 확인되지 않았다. 그래도 제목이 던지는 질문은 좋다. **GPU kernel 학습을 개인 노트북 밖으로 꺼내, 공정한 benchmark, correctness test, community feedback이 있는 작은 경기장으로 만들려면 무엇을 조심해야 하는가**다.
:::

## 1. 지금 자료의 한계

local notes에는 제목, YouTube link, transcript failure만 있다. speaker, slides, code, repo folder는 확인되지 않았다. 따라서 이 글은 KernelBot이 실제로 어떤 Discord command, backend queue, GPU pool, scoring system을 썼는지 설명하지 않는다.

대신 GPU kernel benchmark bot을 읽을 때 필요한 원칙을 정리한다. Lecture 43의 int8 matmul 강의에도 온라인 제출 시스템 이야기가 나왔기 때문에, 이 강의는 그 community infrastructure 쪽을 더 직접적으로 다뤘을 가능성이 있다. 단, 그것도 추정이므로 원본 확인 전까지는 가능성으로만 둔다.

## 2. benchmark bot은 채점기이자 선생님이다

좋은 benchmark bot은 빠른 코드만 줄 세우지 않는다. correctness, sanitizer, timeout, reproducibility, warmup, variance를 함께 관리해야 한다. GPU kernel은 undefined behavior가 있어도 어떤 input에서는 빠르게 "맞아 보일" 수 있다. compute sanitizer와 structured test가 필요한 이유다.

또 feedback이 너무 빈약하면 학습이 멈춘다. "wrong answer"만 주면 사용자는 어디서 indexing이 깨졌는지 모른다. 반대로 정답 code를 너무 많이 보여주면 학습 과제가 사라진다. benchmark bot은 competitive programming judge와 teaching assistant 사이의 애매한 위치에 있다.

:::figure flow
label: Figure · Kernel benchmark bot의 최소 흐름
- submit: 사용자가 Discord에서 kernel code나 link를 제출한다
- build: 정해진 compiler, flags, GPU target으로 빌드한다
- validate: correctness test와 sanitizer를 실행한다
- benchmark: warmup 뒤 여러 input shape에서 timing을 잰다
- report: 점수, 실패 위치, 비교 기준, 재시도 힌트를 돌려준다
:::

## 3. 공정한 GPU benchmark는 생각보다 까다롭다

GPU benchmark는 같은 code라도 clock, thermal state, driver, stream, graph capture, input allocation, random seed에 영향을 받는다. Discord bot처럼 shared infrastructure를 쓰면 queue 상태와 이전 job의 영향도 고려해야 한다. 공정함은 단순히 같은 GPU에서 돌린다는 뜻이 아니다.

따라서 bot은 benchmark policy를 명시해야 한다. 몇 번 warmup하는지, median을 쓰는지 min을 쓰는지, correctness failure와 timeout을 어떻게 처리하는지, cuBLAS/PyTorch baseline을 어떤 조건으로 부르는지 정해야 한다. leaderboard가 재미있으려면 먼저 신뢰할 수 있어야 한다.

## 4. 보안과 격리도 kernel 문제다

사용자가 제출한 CUDA/C++ code를 서버에서 실행한다면 sandboxing이 필요하다. compile time abuse, file system access, long-running kernel, GPU hang, excessive memory allocation 같은 문제가 생길 수 있다. 이 강의가 실제로 다뤘는지는 확인되지 않았지만, benchmark bot 설계에서는 빼놓기 어렵다.

학습용 시스템이라도 infrastructure는 production 냄새가 난다. timeout, process isolation, GPU reset policy, log redaction, artifact cleanup이 있어야 한다. kernel 하나 재는 일도 여럿이 같이 쓰면 작은 운영체제가 된다.

## 5. 손으로 해볼 것

작은 benchmark challenge를 직접 설계해 보자. 예를 들어 row-wise layer norm kernel을 과제로 정하고, input shape 세 개, correctness tolerance, baseline, timeout, scoring formula를 적는다. 그 다음 사용자가 일부러 틀릴 법한 case를 세 개 만든다. non-contiguous input, odd dimension, large hidden size 같은 식이다.

원본 강의를 볼 때는 KernelBot이 이 문제들을 어떻게 풀었는지 확인하면 된다. Discord UI보다 더 중요한 것은 test와 benchmark의 신뢰성이다.

## Source Links

- [YouTube](https://www.youtube.com/watch?v=wiaiv9_TgN4)
- Local notes: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/notes/lecture_047.md`
- Local transcript stub: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/transcripts/lecture_047.md`
