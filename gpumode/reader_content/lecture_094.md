---
num: 94
title: "tvm-ffi, compiler와 runtime 사이의 얇지만 중요한 문"
original: "Lecture 94: tvm-ffi"
speaker: Tianqi Chen
part: 7
part_label: Part VII · 시스템 실전과 최신 주제
priority: Medium
status: partial
---

:::crux
이 노트는 transcript, slides, code 없이 작성한 자료가 제한된 노트다. 제목에서 확실히 잡히는 질문은 **TVM 같은 compiler stack에서 FFI가 왜 단순한 binding이 아니라 시스템 설계의 핵심 경계가 되는가**다. tvm-ffi의 실제 API와 설계 결정은 원본 자료 확인이 필요하다.
:::

## 1. 확인된 내용과 조심할 선

local notes에는 speaker가 Tianqi Chen으로 기록되어 있고 YouTube link만 있다. transcript fetch는 실패했고 slides/code/paper/repo folder는 없다. 그래서 이 강의가 TVM의 새 FFI package 소개인지, runtime object model 설명인지, Python/C++ extension 설계 강의인지는 아직 확인해야 한다.

다만 TVM과 FFI의 조합은 충분히 중요한 독해 포인트를 준다. ML compiler는 Python 사용자, C++ runtime, generated kernel, device memory, external library 사이를 계속 오간다. 그 사이의 경계가 흐리면 성능 버그도, lifetime 버그도, packaging 버그도 같이 온다.

## 2. FFI는 "함수 호출"보다 넓다

Foreign Function Interface라고 하면 다른 언어의 함수를 부르는 얇은 wrapper를 떠올리기 쉽다. compiler/runtime stack에서는 조금 더 복잡하다. object ownership, type conversion, error propagation, dynamic dispatch, serialization, ABI stability가 모두 얽힌다.

TVM 계열 시스템에서는 Python에서 schedule을 만들고, C++ 쪽 IR/runtime object를 만지고, 최종적으로 device code를 실행하는 흐름이 자연스럽다. 이때 FFI가 튼튼해야 사용자는 Python의 생산성을 얻고 runtime은 C++의 제어력을 유지한다.

:::figure flow
label: Figure · compiler stack에서 FFI가 놓이는 자리
- python: 사용자가 IR, schedule, module을 조립한다
- ffi: type, object lifetime, error boundary를 건넌다
- cpp_runtime: lowering, registry, packed function, module loading을 담당한다
- generated_code: CUDA, LLVM, vendor library 호출로 내려간다
- device: kernel 실행과 memory movement가 실제 비용을 만든다
:::

## 3. 성능 경계로서의 FFI

FFI overhead는 hot path에 들어가면 금방 문제가 된다. kernel 하나가 milliseconds라면 Python-to-C++ 호출 비용은 작아 보일 수 있지만, 작은 operator를 많이 launch하거나 tuning loop에서 수만 번 호출하면 이야기가 달라진다.

그래서 좋은 FFI 설계는 "어디까지 crossing을 허용할 것인가"를 정한다. fine-grained call을 편하게 만들 것인지, 큰 operation 단위로 묶을 것인지, callback을 어느 방향으로 허용할 것인지가 전체 시스템의 모양을 바꾼다.

## 4. 타입과 lifetime이 조용한 난제다

compiler IR object는 보통 graph처럼 서로를 참조한다. Python object가 사라졌는데 C++ object가 살아 있거나, 반대로 runtime buffer가 device에서 사용 중인데 host wrapper가 해제되면 문제는 매우 피곤해진다.

또한 dynamic type system과 static type system 사이에는 번역 비용이 있다. Tensor shape, dtype, device, symbolic expression, module handle 같은 값이 어느 쪽에서 검증되는지 알아야 debugging이 가능하다. 에러 메시지가 FFI boundary에서 증발하면 하루가 길어진다.

## 5. 원본에서 확인할 질문

원본을 볼 때는 tvm-ffi가 기존 TVM runtime FFI와 어떤 관계인지부터 확인하자. 새 package인지, refactor인지, Python extension authoring을 위한 별도 layer인지에 따라 독해가 달라진다.

또한 zero-copy, object registry, packed function, exception mapping, build system, wheel packaging, thread safety 같은 항목이 언급되는지 살펴보면 좋다. 이런 주제들은 화려하지 않지만 compiler를 실제로 쓰게 만드는 볼트와 너트다.

## 6. 혼자 해볼 것

작은 C++ function을 Python에서 호출하는 binding을 하나 만들어 보고, scalar call과 batched call의 overhead를 비교해 보자. 꼭 TVM이 아니어도 된다. pybind11, ctypes, cffi 중 하나로 FFI boundary의 감각을 잡는 것이 목적이다.

그다음 device buffer handle을 직접 넘긴다고 상상하며 ownership table을 적어 보자. 누가 할당하고, 누가 해제하며, 에러가 나면 누가 정리하는가. FFI 설계는 이 표가 지저분해질 때 본색을 드러낸다.

## Source Links

- [YouTube](https://www.youtube.com/watch?v=fQcCCSdAFI8)
- Local notes: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/notes/lecture_094.md`
- Local transcript stub: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/transcripts/lecture_094.md`
