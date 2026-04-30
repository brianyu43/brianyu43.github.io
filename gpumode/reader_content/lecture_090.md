---
num: 90
title: Resilient ML engineering, 오래 가는 실력의 바닥
original: "Lecture 90: Building resilient ML Engineering skills"
speaker: Stas Bekman
part: 7
part_label: Part VII · 시스템 실전과 최신 주제
priority: Low
status: partial
---

:::crux
archive record는 speaker Stas Bekman, YouTube 링크, caption fetch failure를 제공한다. slides/code/papers/repo link는 없다. 따라서 실제 조언 목록이나 사례는 이 파일에서 만들지 않는다. 다만 제목이 던지는 질문은 또렷하다. **ML engineer가 바뀌는 model, framework, hardware 속에서도 재현하고 측정하고 설명하는 힘을 어떻게 기르는가**다.
:::

## 1. 강의 요약이 아니라 준비 노트다

이 파일은 원본 강의의 내용을 재현하지 못한다. caption이 비어 있고, 발표 자료도 없다. speaker가 어떤 incident, project, tool, career advice를 이야기했는지는 영상 확인이 필요하다.

그럼에도 GPU Mode reader에 둘 이유는 있다. Part VII의 주제처럼, 시스템 공부는 kernel syntax만으로 끝나지 않는다. 오래 가는 ML engineering은 문제를 작게 만들고, 숫자를 읽고, 바뀐 환경에서 다시 세우는 능력에 가깝다.

## 2. resilient skill은 API 암기가 아니다

ML stack은 계속 움직인다. PyTorch, CUDA, compiler, driver, distributed runtime, model architecture가 모두 버전을 바꾼다. 특정 API 하나만 붙잡으면 금방 낡는다.

덜 낡는 것은 습관이다. 작은 reproduction을 만드는 습관, baseline을 남기는 습관, profiler와 log를 같이 보는 습관, release note를 읽는 습관, 고친 뒤 regression을 막는 습관이다. 이 목록은 강의 인용이 아니라 제목을 읽기 위한 준비 프레임이다.

:::figure ladder
label: Figure · 오래 가는 ML systems 습관
- reproduce: 증상을 작고 반복 가능하게 만든다
- measure: wall-clock, profiler, metric, log를 분리해서 본다
- isolate: data, model, kernel, runtime, infra를 나눠 확인한다
- explain: 원인을 글과 test로 남긴다
- maintain: version 변화와 regression을 추적한다
:::

## 3. debugging은 기술 지식의 압축이다

좋은 debugging은 단순히 에러를 없애는 일이 아니다. 어떤 층에서 문제가 생겼는지 가설을 세우고, 그 가설을 싸게 검증하는 일이다.

GPU/ML systems에서는 이 층이 많다. numerical issue인지, memory pressure인지, kernel launch overhead인지, communication wait인지, data pipeline인지 분리해야 한다. resilient skill은 많은 도구를 아는 것보다 이 분리 능력에서 나온다.

## 4. 임시 해결도 기록이 있어야 산다

ML engineering에서 workaround는 피하기 어렵다. deadline은 있고, GPU time은 비싸며, dependency는 기다려 주지 않는다. 문제는 임시 해결 자체가 아니라, 왜 들어갔는지 나중에 아무도 모르는 상태다.

원본 강의가 이 주제를 다뤘는지는 아직 알 수 없다. 하지만 reader가 가져갈 질문은 분명하다. fix를 넣을 때 어떤 metric, comment, test, issue가 같이 남아야 팀이 다음 변경을 견딜 수 있는가.

## 5. 원본을 볼 때 남길 기록

영상을 볼 때 speaker가 드는 실제 사례를 중심으로 적는다. tool 이름보다 사고 순서가 더 중요하다. 증상은 무엇이었고, 어떤 관측으로 범위를 좁혔고, 마지막에 어떤 guardrail을 남겼는지 본다.

개인 연습으로는 최근 ML bug 하나를 postmortem처럼 써 보는 것이 좋다. 증상, 재현 방법, 측정값, 틀린 가설, 실제 원인, 방지 test를 한 페이지에 담으면 이 강의의 제목이 훨씬 덜 추상적으로 느껴진다.

## Source Links

- [YouTube](https://www.youtube.com/watch?v=A_20dqGfuWI)
- Local notes: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/notes/lecture_090.md`
- Local transcript stub: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/transcripts/lecture_090.md`
