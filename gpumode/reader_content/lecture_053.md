---
num: 53
title: torch.compile Q&A, 질문으로 보는 컴파일 경계
original: "Lecture 53: torch.compile Q&A"
speaker: Richard Zou
part: 4
part_label: Part IV · 프로덕션 커널과 GEMM
priority: High
status: partial
---

:::crux
이 강의는 transcript가 실패했고, local notes에는 YouTube와 Google Docs slide link만 확인된다. 따라서 실제 Q&A의 질문 목록이나 답변은 만들지 않는다. 지금 붙잡을 수 있는 핵심은 **torch.compile을 마법 버튼으로 보지 말고, PyTorch 프로그램이 graph capture, guard, lowering, runtime 선택을 거치며 어디서 깨지고 어디서 빨라지는지 묻는 방식**이다.
:::

## 1. Q&A는 모르는 곳을 드러내는 형식이다

`torch.compile Q&A`라는 제목은 강의가 정리된 튜토리얼보다 질문과 답변에 가까웠을 가능성을 말해 준다. 하지만 transcript가 없으므로 어떤 질문이 나왔는지, Richard Zou가 어떤 사례를 들었는지는 확인되지 않는다.

그래서 이 reader 원고는 torch.compile의 공식 동작을 자세히 설명하는 글이 아니다. 원본을 다시 볼 때 적어야 할 질문의 틀이다. 어떤 model에서 compile을 켰는가, compile time과 runtime을 어떻게 나눴는가, graph break는 어디서 났는가, speedup은 어떤 shape에서 나온 것인가. 이런 질문을 챙겨야 강의를 다시 볼 때 손에 잡힌다.

## 2. torch.compile은 Python을 곧바로 CUDA로 바꾸지 않는다

초보자가 자주 기대하는 그림은 단순하다. PyTorch code를 넣으면 compiler가 알아서 최적 CUDA kernel을 내보낸다. 실제 시스템은 그보다 복잡하다. Python-level program을 추적하고, tensor shape와 dtype에 대한 가정을 세우고, graph를 만들고, backend가 실행 가능한 형태로 낮춘다.

이 과정에서 성능 이득은 여러 층에서 올 수 있다. Python overhead가 줄 수도 있고, operator가 fuse될 수도 있고, backend가 더 나은 kernel을 고를 수도 있다. 반대로 dynamic control flow, unsupported op, shape 변화, side effect가 있으면 graph break나 recompilation 비용이 생길 수 있다.

:::figure flow
label: Figure · torch.compile을 볼 때의 일반 경로
- eager: Python이 op를 하나씩 실행한다
- capture: 실행을 관찰해 graph와 guard를 만든다
- lower: backend가 graph를 실행 가능한 code로 낮춘다
- run: compile된 경로를 재사용한다
- break: guard 실패나 unsupported pattern이면 eager/재컴파일로 돌아간다
:::

## 3. speedup 숫자보다 조건이 먼저다

torch.compile 성능을 읽을 때는 "몇 배 빨라졌다"보다 조건표가 중요하다. model, batch size, sequence length, dtype, device, PyTorch version, backend, warmup 횟수, compile time 포함 여부가 없으면 숫자는 금방 미끄러진다.

특히 Q&A 강의라면 질문자가 겪은 문제의 context가 답의 절반이다. training인지 inference인지, single GPU인지 multi-GPU인지, custom op가 있는지, dynamic shape가 많은지에 따라 좋은 답이 달라진다. 좋은 reader는 답변만 모으지 않고 질문의 전제도 같이 적는다.

## 4. graph break는 실패가 아니라 진단 신호다

compile이 잘 안 될 때 graph break를 단순한 에러로만 보면 답답하다. 하지만 graph break는 compiler가 어디까지 프로그램을 이해했는지 알려 주는 신호다. Python object, data-dependent branch, unsupported operation, mutation 같은 부분이 드러난다.

원본 강의를 볼 때는 "이런 코드를 쓰면 깨진다"보다 "왜 깨졌는가"를 적는 편이 더 좋다. 그래야 같은 문제를 다른 model에서 만났을 때, 코드를 어떻게 바꾸거나 compile boundary를 어디에 둘지 판단할 수 있다.

## 5. 손으로 해볼 것

작은 PyTorch module 하나를 골라 eager와 `torch.compile`을 비교해 보자. 먼저 warmup을 분리하고, compile time을 뺀 steady-state latency를 재고, shape를 하나만 쓸 때와 여러 shape를 섞을 때를 나눠 본다.

그 다음 graph break 로그를 켜고 어떤 부분이 compile되지 않는지 확인한다. 이 작은 실험은 Q&A를 읽는 눈을 만들어 준다. 답을 외우는 것보다, 내 코드가 compiler에게 어떻게 보이는지 보는 쪽이 훨씬 오래 간다.

## Source Links

- [YouTube](https://www.youtube.com/watch?v=mG8TRTWs9Aw)
- [Slides / notes document](https://docs.google.com/document/d/1o98ffoNt0cnayHJt_C0qqDUz-IAp5OpdAInLxZrmv1M/edit?tab=t.0#heading=h.6nxlb7srrfft)
- Local notes: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/notes/lecture_053.md`
- Local transcript stub: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/transcripts/lecture_053.md`
