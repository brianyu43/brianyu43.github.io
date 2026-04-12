---
layout: post
title:  "Now It's Biology"
date:   2026-04-12 00:00:00 +0900
categories: essay building biology
---

> Nineteen repositories in thirty days, and now I'm writing code for one domain. Not because I ran out of ideas. Because I finally figured out which ideas were mine.

---

## 17. LocalBio

I tried to fine-tune a biology tutor. Not a general-purpose model that happens to know biology — a model with a specific pedagogical voice. Patient explanations. Gentle correction of misconceptions. Hints before answers. "I don't know" when it didn't know.

The base was Qwen 10B, quantized, running on cloud A100s. I burned through $30 in free credits across seven training runs. Each run, I adjusted the dataset, tuned the prompts, tweaked the reward signals. Each run, the output stayed flat. The model didn't get better at teaching. It just got better at pattern-matching my formatting.

Then the infrastructure fell apart. Spot instances interrupted mid-training. A100 availability dried up. Checkpoints corrupted. I was fighting two wars at once — one against the model's stubbornness, one against the cloud's unreliability — and losing both.

I stopped. Not because the idea was wrong, but because the approach was premature. I didn't yet know enough about what makes a good biology explanation to encode it as training signal. I was trying to teach a model something I hadn't fully articulated to myself.

## 18. Biology Researcher Network

I pulled data from Google Scholar and mapped Korean biology researchers into a network graph. Who publishes with whom. Which institutions cluster together. Where the bridges are between subfields.

The graph visualization itself was fine — nodes, edges, force-directed layout, the usual. But the real value wasn't the output. It was the process. Crawling publication data forced me to read hundreds of abstracts I wouldn't have found otherwise. Building the edges forced me to understand how subfields relate. The graph was a byproduct. The education was the product.

## 19. BioNews

I built a biology news aggregator. It collected, it summarized, it displayed.

And then I realized I could just ask ChatGPT the same questions and get better answers with more context. The aggregator added a layer of automation to something that didn't need automating. Some problems are better solved by a conversation than a pipeline.

---

## What Nineteen Repositories Taught Me

Here's the uncomfortable truth about vibe coding.

When I didn't understand a domain, AI didn't fill the gap — it wallpapered over it. The Bitcoin arbitrage system produced plausible-looking code that crashed in production because I didn't understand exchange infrastructure. The FPS game had working zombie logic but unusable character models because I didn't understand 3D animation. The fine-tuned biology model reproduced my formatting without learning my pedagogy because I hadn't defined what good teaching looks like.

In every case, the AI was doing exactly what I asked. The problem was that I was asking the wrong things, and I didn't know enough to notice.

The projects that worked — really worked, not just compiled — were the ones where I brought the domain knowledge and the AI brought the speed. The HTS system worked because I understood trading interfaces. The macro dashboard worked because I understood what the numbers meant. The Kiwoom MCP server worked because I already knew both the API and the protocol.

**AI as a factory is only as good as the blueprint you hand it. And the blueprint has to come from you.**

This is the part that the "anyone can build anything now" narrative gets wrong. Yes, anyone can generate code. But generating code for a domain you don't understand is not building — it's producing artifacts. It's the software equivalent of AI-generated 20-second videos: technically impressive, semantically empty, and indistinguishable from noise if you don't already know what signal looks like.

Nineteen repositories. The ones I'm proud of are the ones where I knew what I was doing before I opened the terminal.

---

## Why Biology

I studied pharmacology. Biology isn't a new interest — it's the oldest one. Every other domain I wandered into over the past month was a detour. Finance, agent protocols, game development, infrastructure tooling — I learned something from each of them, but none of them were *mine* the way biology is.

The arXiv pipeline was the moment it clicked. I built a system to skim 1,900 papers a day and realized I didn't want to skim. I wanted to sit with one paper about gene regulation or protein folding and actually understand it. Not summarize it. Understand it.

So that's where I am now. Writing code for biology. Reading papers slowly. Building tools that help me learn, not tools that help me produce.

The repositories will keep coming. But they'll be about one thing. Machine learning applied to biological questions — not because it's trendy, but because it's the intersection where I actually know what "right" looks like. Where I can tell the difference between signal and garbage. Where the AI accelerates my understanding instead of replacing it.

Nineteen projects in thirty days taught me that the most productive thing I can do with AI is to use it in the one place where I don't need AI to tell me if the answer is correct.

That place, for me, is biology.

