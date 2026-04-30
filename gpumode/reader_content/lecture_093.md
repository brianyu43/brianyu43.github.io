---
num: 93
title: "Cornserve, 멀티모달 serving을 쉽게 만든다는 말의 무게"
original: "Lecture 93: Cornserve Easy, Fast and Scalable Multimodal AI"
speaker: Jeff Ma
part: 7
part_label: Part VII · 시스템 실전과 최신 주제
priority: Low
status: partial
---

:::crux
이 노트는 transcript와 slides 없이 작성한 자료가 제한된 노트다. 지금 확인되는 질문은 **멀티모달 AI serving에서 easy, fast, scalable을 동시에 말하려면 어떤 시스템 경계가 필요하냐**다. Cornserve의 실제 architecture, API, benchmark는 원본 영상이나 추가 자료가 필요하다.
:::

## 1. 자료의 바닥선을 먼저 긋기

local notes에는 speaker가 Jeff Ma로 기록되어 있고 YouTube link만 있다. transcript, slides, code, paper, repo folder는 모두 확인되지 않았다. 따라서 Cornserve가 오픈소스 serving framework인지, 연구 prototype인지, product architecture인지 아직 확정할 수 없다.

이럴 때 독자는 제목의 형용사를 곧이곧대로 믿기보다 질문으로 바꾸는 편이 좋다. easy는 누구에게 쉬운가. fast는 어떤 workload에서 빠른가. scalable은 GPU 수, request rate, model count, modality count 중 무엇에 대한 말인가.

## 2. 멀티모달 serving은 한 모델 serving보다 울퉁불퉁하다

text-only LLM serving은 prefill과 decode의 모양만으로도 충분히 복잡하다. 멀티모달은 여기에 image/audio/video encoder, preprocessing, feature projection, variable-size input이 들어온다. request마다 tensor shape와 latency profile이 크게 달라진다.

그래서 scheduler는 단순히 token 수만 보지 못한다. 이미지 encoder가 먼저 막히는지, text decoder가 막히는지, CPU preprocessing이 발목을 잡는지, KV cache가 memory를 먹는지 분리해야 한다. "멀티모달"이라는 단어 하나가 queue를 여러 줄로 늘려 버린다.

:::figure flow
label: Figure · 멀티모달 serving의 흔한 경로
- ingress: image, text, audio 같은 서로 다른 입력이 들어온다
- preprocess: decode, resize, tokenize, feature extraction 준비가 일어난다
- encoder: modality별 encoder가 dense feature를 만든다
- bridge: feature를 language model 입력 형식에 맞춘다
- decoder: LLM이 prefill과 decode를 수행한다
- response: stream, batch, cache 정책이 사용자 latency를 결정한다
:::

## 3. easy는 API 문제가 아니라 실패 모드 문제다

serving system이 쉽다는 말은 hello world가 짧다는 뜻만은 아니다. batch가 섞이고, input이 크고, model이 여러 개고, GPU memory가 빠듯할 때 실패를 이해할 수 있어야 쉽다.

멀티모달에서는 특히 admission control이 중요하다. 큰 이미지 몇 장이 들어와 encoder batch를 밀어 버리거나, 긴 text prompt가 decoder queue를 오래 붙잡을 수 있다. framework가 이런 request를 어떻게 제한하고 관찰하게 해 주는지가 "easy"의 실제 내용이다.

## 4. fast와 scalable을 따로 읽기

fast는 한 request의 latency일 수도 있고, 전체 tokens/sec 또는 requests/sec일 수도 있다. scalable은 GPU를 더 붙였을 때 throughput이 늘어나는지, 여러 model을 얹었을 때 운영 복잡도가 감당되는지, modality가 늘어도 pipeline이 무너지지 않는지의 문제다.

원본을 볼 때는 benchmark table보다 workload definition을 먼저 확인하자. batch size, image resolution, output length, concurrency, GPU type, warmup, cache state가 빠진 숫자는 친절해 보이지만 실전에서는 길을 잃기 쉽다.

## 5. 구현자가 조심할 점

멀티모달 serving은 memory layout과 data movement가 숨어서 성능을 갉아먹는다. CPU에서 이미지를 만지고, GPU encoder로 옮기고, 다시 LLM 입력으로 붙이는 사이에 copy와 synchronization이 생긴다. 작은 copy도 request rate가 높으면 줄줄 샌다.

또한 model parallelism과 pipeline parallelism이 항상 답은 아니다. encoder와 decoder의 병목 위치가 다르면 GPU 배치도 달라져야 한다. Cornserve가 이 배치를 자동화하는지, 아니면 사용자가 policy를 적는지 확인하면 강의의 실전성이 보인다.

## 6. 혼자 해볼 것

간단한 vision-language pipeline을 하나 정하고 latency를 구간별로 재 보자. image load/resize, vision encoder, projection, LLM prefill, decode를 따로 기록한다. 처음부터 최적화하지 말고 어디서 시간이 사라지는지부터 본다.

다음에는 서로 다른 image resolution과 output length를 섞어 queue를 만들어 본다. 평균 latency가 아니라 p95 latency가 어떻게 움직이는지 보면 멀티모달 serving이 왜 scheduler 문제인지 몸으로 이해된다.

## Source Links

- [YouTube](https://www.youtube.com/watch?v=uIulphvtyGs)
- Local notes: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/notes/lecture_093.md`
- Local transcript stub: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/transcripts/lecture_093.md`
