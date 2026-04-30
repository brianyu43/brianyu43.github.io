---
num: 59
title: FastVideo, 이름만 남은 강의를 읽는 법
original: "Lecture 59: FastVideo"
speaker: Unknown
part: 5
part_label: Part V · 추론·학습·통신 스케일
priority: Medium
status: partial
---

:::crux
FastVideo에 대해 archive가 확실히 말하는 것은 많지 않다. speaker는 비어 있고, caption 수집은 실패했으며, slides/code/repo link도 없다. 제목은 video workload를 암시하지만 구체 프로젝트는 아직 모른다. 이 reader의 질문은 **video라는 축이 들어오면 GPU 비용표가 어떻게 달라지는가, 그리고 원본에서 그 비용표의 어느 부분을 실제로 다루는가**다.
:::

## 1. 이름을 설명으로 바꾸지 말자

`FastVideo`가 논문 이름인지, library인지, 내부 시스템인지, 단순한 강의 제목인지는 source note만으로 판별되지 않는다. 그러니 diffusion, transformer, VAE, scheduler, attention trick 같은 익숙한 말을 강의 내용처럼 붙이면 안 된다.

지금 할 수 있는 일은 작다. 비디오 모델을 읽을 때 필요한 비용 축을 미리 세워 두고, 원본에서 확인된 항목만 나중에 채운다. source-thin draft는 화려한 요약보다 좋은 빈 표에 가깝다.

## 2. video workload는 차원이 하나 더 늘어난다

이미지 모델은 height와 width를 다룬다. video는 여기에 frame 축이 붙는다. 그래서 tensor shape 하나도 `(batch, frames, channels, height, width)`처럼 읽어야 한다.

frame 수가 늘면 activation memory, attention 대상, decode 또는 sampling 반복의 총량이 같이 움직일 수 있다. 단, 이 강의가 정확히 어떤 video model을 대상으로 했는지는 아직 알 수 없다. 아래 내용은 강의 요약이 아니라 원본을 읽기 위한 계산 감각이다.

:::figure grid
label: Figure · video 비용을 묻는 네 축
- frames: 시간축이 길어질수록 저장하고 움직일 값이 늘어난다
- resolution: spatial token이나 pixel 수가 kernel 비용을 키운다
- steps: 반복 생성이라면 end-to-end latency에 직접 쌓인다
- batch: throughput을 돕지만 memory와 tail latency를 압박한다
:::

## 3. fast의 의미를 먼저 고른다

"빠르다"는 말은 하나가 아니다. training throughput이 빨라진 것일 수 있고, inference latency가 줄어든 것일 수 있다. 같은 품질에 더 적은 step을 쓰는 algorithmic change일 수도 있고, 같은 연산을 더 잘 배치한 systems work일 수도 있다.

원본을 볼 때 첫 표시점은 여기다. speaker가 무엇을 빠르게 만들었는가. wall-clock인지, GPU time인지, cost인지, memory footprint인지, 품질 대비 속도인지가 정해져야 나머지 주장을 읽을 수 있다.

## 4. 품질을 빼면 video 성능은 반쪽이다

video generation 계열이라면 속도와 품질을 같이 봐야 한다. temporal consistency, motion artifact, prompt alignment, flicker 같은 문제가 성능 숫자 뒤에 숨어 있을 수 있다.

강의가 다른 종류의 video processing을 다뤘다면 품질 지표도 달라진다. encoding, retrieval, understanding, generation은 모두 다른 metric을 쓴다. 따라서 이 노트는 특정 metric을 못 박지 않고, "비교가 같은 출력 품질을 유지하는가"라는 질문만 남긴다.

## 5. 손계산으로 준비하기

작은 표를 만들자. 행은 frames, resolution, batch, dtype, step count로 두고, 열은 memory, compute, latency, quality risk로 둔다. 각 칸에는 수식이 아니라 "늘어남", "줄어듦", "측정해야 함" 정도만 적어도 충분하다.

원본을 볼 때 FastVideo가 이 표의 어느 행을 건드리는지 표시한다. 아무 것도 표시할 수 없다면, 이 노트를 더 길게 쓰지 말고 caption이나 slide를 다시 구하는 것이 먼저다.

## Source Links

- [YouTube](https://www.youtube.com/watch?v=tquHfKqKo1s)
- Local notes: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/notes/lecture_059.md`
- Local transcript stub: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/transcripts/lecture_059.md`
