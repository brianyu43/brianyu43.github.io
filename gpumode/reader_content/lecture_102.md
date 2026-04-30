---
num: 102
title: "quartet v2, 이름만 남았을 때 시스템 강의를 읽는 법"
original: "Lecture 102: quartet v2"
speaker: "Andrei Panferov and Erik Schultheis"
part: 7
part_label: Part VII · 시스템 실전과 최신 주제
priority: Low
status: partial
---

:::crux
이 노트는 transcript, slides, code가 없는 자료가 제한된 노트다. local notes에는 제목, speaker, YouTube link 외에 기술 단서가 거의 없다. 따라서 핵심 질문은 **quartet v2가 무엇인지 단정하기보다, version 2 시스템 발표를 검증하는 독해 절차를 어떻게 세울 것인가**다.
:::

## 1. 이 강의는 특히 빈칸이 크다

local notes에는 speakers가 Andrei Panferov and Erik Schultheis로 기록되어 있고 YouTube link만 있다. transcript fetch는 실패했고 slides/code/paper/repo folder는 없다. quartet v2가 library, compiler, kernel collection, serving system, research project 중 무엇인지는 확인되지 않았다.

이런 경우 좋은 reader 원고는 내용을 지어내지 않는 데서 시작한다. 모르는 것을 모른다고 표시해 두면 나중에 원본을 볼 때 채워 넣을 자리가 생긴다. 빈칸도 잘 관리하면 자료다.

## 2. v2 발표에서 먼저 볼 것

어떤 시스템의 v2 발표라면 보통 v1의 pain point가 있다. 성능이 부족했는지, API가 어려웠는지, correctness 문제가 있었는지, target hardware가 바뀌었는지, 운영 경험이 쌓였는지 확인해야 한다.

v2의 핵심은 새 기능 목록보다 trade-off 변화다. 더 빠른 대신 portability를 잃었는가. 더 쉬운 API 대신 low-level control을 숨겼는가. 더 큰 scale을 위해 debugging이 어려워졌는가. 시스템은 늘 어딘가에서 비용을 낸다.

:::figure flow
label: Figure · v2 시스템 발표를 읽는 순서
- baseline: v1 또는 기존 방식의 한계를 찾는다
- change: architecture, API, compiler, runtime 중 무엇이 바뀌었는지 본다
- evidence: benchmark, case study, failure report를 분리한다
- tradeoff: 성능, 생산성, 이식성, 정확성의 교환을 적는다
- adoption: 실제로 쓰려면 build, docs, debug tool이 있는지 확인한다
:::

## 3. 이름보다 interface를 보자

프로젝트 이름만으로는 거의 아무것도 알 수 없다. 원본에서 가장 먼저 찾아야 할 것은 interface다. 사용자는 어떤 code를 쓰는가. input과 output은 무엇인가. 기존 stack과 어디에서 만나는가.

GPU 시스템에서는 interface가 성능 경계가 되기도 한다. tensor layout을 노출하는지, scheduling을 숨기는지, kernel fusion을 자동으로 하는지, distributed placement를 사용자가 적는지에 따라 가능한 최적화가 달라진다.

## 4. 증거를 나누어 읽기

system talk의 evidence는 여러 층이다. microbenchmark는 특정 kernel이나 primitive의 상한을 보여 줄 수 있다. end-to-end benchmark는 실제 workload 감각을 준다. production anecdote는 failure mode를 알려 준다.

quartet v2 원본을 볼 때는 이 증거들을 섞지 말자. microbenchmark가 좋아도 end-to-end가 자동으로 좋아지는 것은 아니다. 반대로 end-to-end 개선이 있어도 어떤 component가 기여했는지 따로 확인해야 한다.

## 5. 나중에 채워야 할 질문

quartet v2가 어떤 domain의 system인지 먼저 적어야 한다. kernel DSL인지, inference engine인지, distributed runtime인지, model architecture tool인지에 따라 이 노트의 상당 부분이 달라진다.

그다음 v2에서 바뀐 핵심 mechanism을 하나만 고르자. scheduler, layout, compiler lowering, caching, communication protocol, API ergonomics 중 무엇이 중심인지 확인하면 독해가 선명해진다.

## 6. 혼자 해볼 것

원본을 보기 전에 "v2 발표 체크리스트"를 만들어 보자. 기존 문제, 새 설계, 증거, trade-off, migration cost, open questions 여섯 칸이면 충분하다.

영상을 본 뒤에는 각 칸을 한 문장으로 채운다. 한 칸이 비면 그 발표가 부족한 것일 수도 있고, 우리가 놓친 것일 수도 있다. 어느 쪽이든 다음 질문이 생긴다.

## Source Links

- [YouTube](https://www.youtube.com/watch?v=E0G3hf4DneA)
- Local notes: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/notes/lecture_102.md`
- Local transcript stub: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/transcripts/lecture_102.md`
