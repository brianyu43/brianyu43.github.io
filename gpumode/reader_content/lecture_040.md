---
num: 40
title: CUDA 문서를 사람 말로 잇기
original: "Lecture 40: CUDA Docs for Humans"
speaker: Charles Frye
part: 4
part_label: Part IV · 프로덕션 커널과 GEMM
priority: High
status: rich
---

:::crux
CUDA가 어려운 이유는 문서가 없어서만은 아니다. `CUDA`라는 한 단어가 software platform, programming model, hardware architecture, PTX 같은 여러 층을 한꺼번에 가리키기 때문이다. 이 강의의 핵심은 **흩어진 정답을 하나의 하이퍼텍스트 지도로 묶고, 추상 모델과 실제 하드웨어가 어디서 맞물리는지 보는 법**이다.
:::

## 1. 문서가 없었던 것이 아니라 길이 끊겨 있었다

Charles Frye는 Modal에서 만든 GPU Glossary를 보여주며 강의를 시작한다. `nvcc` compiler flag를 읽다가 compute capability가 나오고, compute capability를 따라가면 SM architecture가 나오고, 다시 compiler와 PTX로 이어진다. 각각의 정보는 NVIDIA 문서, 오래된 white paper, textbook, blog post에 있다. 문제는 초심자가 그 길을 스스로 찾아야 한다는 점이다.

그래서 이 강의의 분위기는 "CUDA 문서는 나쁘다"라기보다 "좋은 자료가 서로 충분히 연결되어 있지 않다"에 가깝다. Charles는 PTX ISA 문서, CUDA C++ Programming Guide, Best Practices Guide 같은 공식 자료를 높게 평가한다. 다만 이런 자료는 종종 PDF나 오래된 문서 형태라서, 웹에서 기대하는 식의 발견성과 상호 링크가 부족하다.

여기서 좋은 학습법도 나온다. 새로운 software system이나 programming model을 만나면 trace를 만들어서 클릭해 보라는 것이다. PyTorch profiler trace를 따라가며 ATen, host launch와 device execution의 비동기성, CUDA runtime과 driver의 경계를 배웠다는 이야기가 나온다. 멋진 kernel을 쓰기 전에, 먼저 내가 밟고 있는 stack을 보자는 말이다.

## 2. CUDA는 하나가 아니라 여러 층이다

강의에서 가장 중요한 정리는 "CUDA가 무엇인가?"라는 질문을 한 번에 답하지 않는 것이다. CUDA는 Python/PyTorch에서 보이는 software platform이기도 하고, C/C++나 Fortran에 들어가는 programming model이기도 하며, compute unified device architecture라는 hardware design 철학이기도 하다.

PyTorch 같은 application은 CUDA runtime API, CUDA driver API, `libcuda`, `cudart` 같은 층을 통해 GPU에 일을 보낸다. 이때 Python 사용자는 대부분 이 경계를 직접 보지 않는다. 하지만 문제가 생기면 에러 메시지는 아주 낮은 층에서 올라온다. 그래서 "PyTorch에서 CUDA 쓴다"는 말은 편하지만, debugging할 때는 너무 뭉툭한 말이 된다.

programming model 쪽에서는 kernel, grid, thread block, thread, shared memory 같은 개념이 나온다. 중요한 점은 이것들이 먼저 추상 개념이라는 것이다. thread block은 programming model의 단위이고, cooperative thread array는 PTX 쪽 구현 언어에서 보이는 표현이다. 둘을 구분하면 문서를 읽을 때 헷갈림이 줄어든다.

:::figure flow
label: Figure · CUDA라는 이름 아래의 층
- application: PyTorch나 C++ application이 kernel launch와 tensor operation을 호출한다
- runtime/driver: `cudart`, CUDA driver API, `libcuda`가 host code와 device 실행을 잇는다
- programming model: grid, block, thread, shared memory 같은 추상 규칙을 제공한다
- PTX: compiler가 내보내는 virtual ISA이며 hardware별 SASS로 내려간다
- hardware: SM, register file, L1/shared memory, HBM이 실제 실행을 맡는다
:::

## 3. shared memory는 말 그대로만 들으면 위험하다

CUDA의 shared memory는 thread block 안의 thread들이 공유하는 programmer-managed memory다. 그런데 같은 말을 hardware 관점에서 하면 SM 안의 L1 data cache와 scratchpad 성격이 섞인 공간을 가리키게 된다. 강의 중간 질문에서도 이 지점이 바로 교정된다. 단순한 cache라고 부르면 hardware-managed cache를 떠올리기 쉽지만, CUDA shared memory는 programmer가 배치와 동기화를 관리한다.

이 차이는 성능과도 연결된다. programmer-managed memory는 귀찮지만, 그만큼 context switch나 memory traffic의 영향을 직접 제어할 수 있다. GPU kernel을 최적화할 때 shared memory를 "빠른 배열" 정도로만 이해하면 곧 막힌다. 누가 언제 읽고 쓰는지, block 안에서 어떤 synchronization이 가능한지, block 밖과는 어떤 보장이 없는지를 함께 봐야 한다.

Charles가 강조하는 CUDA programming model의 제약도 여기서 이해된다. block 사이에는 마음대로 synchronization할 수 없고, block들은 임의 순서로 실행될 수 있어야 한다. 처음에는 답답하지만, 바로 이 제약 덕분에 같은 kernel이 SM 수가 다른 GPU에서도 비교적 자연스럽게 scale한다.

## 4. PTX는 단순한 중간 산물이 아니다

Charles의 두 번째 강한 주장은 CUDA stack에서 PTX가 아주 중요하다는 것이다. PTX는 compiler가 내보내는 intermediate representation이면서 virtual ISA다. 실행 시점에는 실제 GPU의 SM에 맞는 SASS/cubin 쪽으로 JIT 또는 runtime compile된다.

이 층이 있기 때문에 forward compatibility가 가능해진다. 하나의 binary나 package가 새 GPU에서 다시 compile되어 실행될 수 있고, 때로는 새 hardware의 이점을 어느 정도 얻는다. 최고 성능을 위해 SASS를 직접 겨냥하는 경우도 있지만, 배포성과 호환성을 생각하면 PTX라는 완충층이 큰 의미를 가진다.

CPU 쪽 x86와 microcode 이야기도 잠깐 나온다. 요지는 NVIDIA가 비교적 늦게 온 덕분에 "사람과 compiler가 겨냥하는 instruction set"과 "실제 hardware가 실행하는 binary instruction" 사이를 더 명시적으로 나눌 수 있었다는 관찰이다. 문서 지도를 만들 때 PTX를 빼놓으면 CUDA의 허리가 사라진다.

## 5. 좋은 문서는 실행 가능한 문서에 가까워진다

강의 후반은 GPU Glossary의 다음 단계 이야기다. LLM이 읽기 좋은 `llms.txt` 형식, retrieval이나 graph RAG, 그림과 텍스트를 함께 다루는 방법이 언급된다. 단순히 사이트 오른쪽 아래에 chat widget을 붙이는 방식은 충분하지 않다는 반성도 있다.

더 흥미로운 방향은 문서 안에서 작은 code snippet을 실제로 실행해 보는 것이다. Charles는 Modal 환경에서 `libcuda`를 지워 보거나 linking 방식을 바꿔 보며 어떤 층이 깨지는지 확인했다고 말한다. 이런 식의 실험은 용어를 정의하는 것보다 강하다. stack의 경계가 손에 잡히기 때문이다.

앞으로 보강하고 싶은 내용으로 synchronization hierarchy, thread block cluster, performance debugging 용어, occupancy, bank conflict, GPU fleet management, NVML, `nvidia-smi`, multi-GPU execution, NCCL, NVLink, PCIe 등이 나온다. 즉 이 문서는 CUDA kernel 문법만이 아니라 GPU를 실제로 운영하는 사람의 지도까지 넓히려 한다.

## 6. 손으로 해볼 것

첫 과제는 아주 작게 시작하면 된다. PyTorch 프로그램 하나를 profiler로 찍고, trace에서 CPU op, CUDA runtime call, kernel execution이 어떻게 분리되어 보이는지 확인해 보자. "Python에서 한 줄"이 GPU에서는 어떤 launch와 device work로 보이는지 보는 것만으로도 stack 감각이 달라진다.

두 번째는 CUDA 문서 읽기 지도 만들기다. `compute capability`, `SM`, `shared memory`, `PTX`, `cubin`, `SASS` 여섯 단어를 골라 각 단어가 어느 문서에서 정의되는지, 어떤 단어로 다시 링크되어야 하는지 적어 보자. 모르는 단어를 줄이는 것보다, 모르는 단어 사이의 길을 만드는 것이 이 강의의 태도다.

## Source Links

- [YouTube](https://www.youtube.com/watch?v=qmpGv72qPCE)
- [Slides](https://docs.google.com/presentation/d/15lTG6aqf72Hyk5_lqH7iSrc8aP1ElEYxCxch-tD37PE/edit)
- Local notes: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/notes/lecture_040.md`
- Local transcript: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/transcripts/lecture_040.md`
