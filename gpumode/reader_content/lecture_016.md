---
num: 16
title: 프로파일러는 확대경이다
original: "Lecture 16: On Hands Profiling"
speaker: Taylor Robbie
part: 2
part_label: Part II · 병렬 패턴과 Attention
priority: High
status: rich
---

:::crux
좋은 profiling은 “어느 kernel이 몇 ms인가”를 보는 일이 아니라, **내 Python 코드와 GPU timeline 사이의 대응관계**를 찾는 일이다. Taylor Robbie의 hands-on 세션은 kernel 하나를 빠르게 만드는 이야기보다, 모델 전체에서 시간이 새는 위치를 추적하는 방법에 가깝다.
:::

## 1. 슬라이드보다 trace를 본 강의

이 강의는 준비된 슬라이드 강의라기보다 실제 모델을 열고 profiling view를 오가며 보는 세션이다. Taylor의 배경도 그쪽이다. Lightning AI와 PyTorch 쪽에서 profiling, benchmarking, model optimization을 다뤄온 사람답게, “이론적으로 병목일 것 같은 곳”보다 trace에서 보이는 증거를 먼저 잡는다.

GPU 성능 문제를 볼 때 흔한 실수는 kernel 이름만 보는 것이다. `gemm`, `embedding`, `pointwise` 같은 이름이 보이면 뭔가 안 듯하지만, 실제 질문은 더 구체적이다. 이 kernel은 어느 Python line에서 왔나? 앞뒤에 host gap이 있나? batch size를 올리면 같은 문제가 유지되나? memory peak 때문에 GPU가 굶고 있나?

## 2. PyTorch profiler가 보여주는 것

PyTorch profiler는 Chrome trace 형태로 CPU runtime, CUDA runtime, GPU kernel lane을 함께 보여준다. kernel을 클릭하면 stack trace를 통해 어느 Python 호출에서 launch되었는지 추적할 수 있다. 이 연결이 아주 중요하다. GPU lane만 보면 “무언가 느리다”이고, stack trace까지 보면 “내 코드의 이 부분이 느리다”가 된다.

Timeline에서 먼저 볼 것은 gap이다. GPU가 쉬고 있는데 CPU가 kernel을 준비하고 있다면 host overhead나 synchronization을 의심한다. 여러 kernel이 겹쳐 보인다면 CUDA stream과 scheduler가 어떻게 일을 배치하는지도 본다. 정상적인 CUDA 프로그램은 host가 launch하고, GPU는 나중에 실행한다. 이 비동기성을 모르면 trace를 잘못 읽기 쉽다.

:::figure ladder
label: Figure · profiling에서 확대하는 순서
- model: 처리량과 latency가 기대와 얼마나 다른가
- trace: GPU가 쉬는 gap이 있는가
- kernel: 긴 kernel은 compute인지 memory인지 확인한다
- stack: 그 kernel을 만든 Python line을 찾는다
- experiment: batch size, dtype, fusion, memory peak를 하나씩 바꾼다
:::

## 3. 빠른 kernel이 빠른 모델을 보장하지 않는다

강의 중 한 예시는 embedding kernel이다. kernel만 보면 아주 빠르거나, baseline보다 두 배 빨라 보일 수 있다. 그런데 모델에 넣으면 전체 속도가 기대만큼 나오지 않는다. 이유는 간단할 수 있다. kernel 자체가 병목이 아니거나, batch size가 너무 작아 GPU를 채우지 못하거나, 앞뒤 memory movement가 더 크다.

Taylor가 반복해서 보는 축은 batch size다. batch size 1에서는 많은 inference workload가 memory-bound처럼 보이고, GPU SM을 충분히 쓰지 못한다. batch를 키우면 arithmetic intensity가 달라지고, kernel launch overhead도 상대적으로 작아진다. 반대로 memory peak가 커져서 더 이상 batch를 못 올리는 경우도 있다.

## 4. memory profiler는 “왜 batch를 못 키우나”를 말해준다

성능 문제는 종종 시간보다 memory에서 시작한다. PyTorch의 memory profiler는 allocation timeline과 peak memory를 보여준다. 어떤 첫 batch가 유난히 크거나, activation이 오래 살아남거나, model object가 scope 밖에서도 참조되어 memory를 잡고 있으면 batch size를 못 올린다.

이런 문제는 kernel 최적화로 해결되지 않는다. reference를 끊거나, activation lifetime을 줄이거나, gradient accumulation과 micro-batch를 조정해야 한다. profiling의 좋은 점은 이런 결정을 감으로 하지 않게 만든다는 것이다. “느린 것 같다” 대신 “여기서 peak가 생겨 batch 4가 안 된다”라고 말할 수 있다.

## 5. flame graph와 stack trace는 친구다

trace가 넓은 지도라면 flame graph는 호출 비용의 단면이다. PyTorch profiler의 stack 정보를 flame graph로 바꾸면 어떤 Python path가 많은 CUDA work를 만들어내는지 보기 쉽다. 특히 framework code와 user code가 섞인 모델에서는 이것이 유용하다.

다만 flame graph도 전부는 아니다. CPU 시간이 크다고 GPU 병목이 아니고, GPU kernel 시간이 크다고 host가 문제 없는 것도 아니다. profiling view를 여러 개 열고 같은 사건을 다른 각도에서 보는 습관이 필요하다.

## 6. 손으로 해볼 것

작은 Transformer block이나 embedding-heavy 모델을 하나 잡고 PyTorch profiler를 켠다. 먼저 batch size 1과 batch size 4를 비교한다. GPU idle gap, kernel count, 가장 긴 kernel, memory peak를 각각 기록한다.

그 다음 의도적으로 `torch.cuda.synchronize()`를 한 줄 넣어본다. trace에서 host와 device timeline이 어떻게 달라지는지 확인하면 CUDA의 비동기 실행이 몸에 들어온다. 마지막으로 memory profiler를 켜고 첫 batch와 이후 batch의 allocation 차이를 본다.

## Source Links

- [YouTube](https://www.youtube.com/watch?v=SKV6kDk1s94)
- [Taylor Robbie LinkedIn](https://www.linkedin.com/in/taylor-robie/)
- Local notes: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/notes/lecture_016.md`
- Local transcript: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/transcripts/lecture_016.md`
