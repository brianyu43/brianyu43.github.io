---
layout: post
title:  "I Built Everything I Could Think Of"
date:   2026-04-12 00:00:00 +0900
categories: essay building
---

> In a single month, I built nineteen repositories. A RISC-like OS from NAND gates. A Bitcoin arbitrage engine. A quantitative trading system. An FPS zombie game. A mobile antivirus. A WiFi speed lawsuit app. An automatic textbook translator. A macroeconomic dashboard. A knowledge graph of my own conversations. An agent-based simulation of SpaceX's IPO. A fine-tuned biology tutor on cloud A100s.
>
> Most of them are dead. This is a post about what I learned from the wreckage.

---

## 1. NAND to Pong

I wanted to understand a computer from the ground up — literally from NAND gates. Stack logic into an ALU, wire it into a CPU, build a RISC-like instruction set, bootstrap an OS, and run Pong on it.

I got further than I expected, but nowhere near where I wanted. The gap between a working ALU and a functioning terminal is enormous. File systems are a civilization's worth of abstraction away from transistor logic. I vibe-coded most of it, which means I got the result without fully earning the understanding. That still bothers me.

The lesson wasn't about hardware. It was about how deep "simple" things actually go.

## 2. Bitcoin Arbitrage

The idea was clean: spot price discrepancies across exchanges, execute automatically, pocket the spread. I set up a server, ran paper trades, and watched it crash. Repeatedly. The system never stayed alive long enough to validate the concept in practice.

The economics made sense on a whiteboard. The engineering did not make sense in production. Latency, API rate limits, session management, reconnection logic — every boring infrastructure problem I hadn't studied became a wall. I came away knowing that arbitrage isn't a strategy problem. It's a plumbing problem.

## 3. AlpacaStock

This was supposed to be my serious quant infrastructure. Alpaca's API for US equities, local-first architecture, a proper pipeline from signal generation to risk management to order routing. I designed the package structure, the data layers, the daemon lifecycle.

Then I hit the algorithm wall. Not the engineering — the alpha. I had a system that could execute any strategy cleanly, but I didn't have a strategy worth executing. Building the factory was the easy part. Knowing what to manufacture was the hard part.

## 4. Personal HTS + OpenClaw

I built a web-based home trading system on top of Korea Investment & Securities' API, modeled after Toss Securities' UI. It actually worked — live quotes, order execution, portfolio tracking. Then I connected OpenClaw so I could buy and sell stocks in natural language.

It was technically impressive and practically useless. The AI could parse "buy 10 shares of Samsung" just fine. But I couldn't find a single scenario where talking to a chatbot was faster or safer than tapping two buttons on a screen. The interface was a solution looking for a problem that didn't exist. I shut it down.

## 5. Macroeconomic Dashboard

KDI, OpenDART, Statistics Korea — I pulled public APIs and built a dashboard to track macro trends. GDP, interest rates, corporate filings, demographic shifts, all in one place.

This one was quietly useful. No drama, no failure, no pivot. Just a clean window into numbers that move slowly. Not everything needs to be a platform.

## 6–7. WiFi Speed App / Mobile Antivirus

I built these. They worked. There isn't much more to say. Sometimes you make things just to prove you can make things. The WiFi app compared your actual speed against what your carrier promised — confrontational by design. The antivirus was a standard mobile security tool. Neither changed how I think about building.

## 8. Left 4 Dead, Alone

I tried to build a single-player FPS inspired by Left 4 Dead 2. Zombie AI that follows the player. Stage transitions. Background music. Gun skins. Special zombie logic — boomers, hunters, tanks. All vibe-coded.

It got surprisingly far. The mechanics worked. Zombies chased you. Stages loaded. Music played. But the skins and animations were garbage, and in a first-person shooter, that's not a cosmetic problem — it's the entire experience. I couldn't push past the uncanny valley of procedurally generated character models. The project died looking like a PS1 fever dream.

## 9. Automatic Textbook Translation

My information theory textbook was in English, and I was tired of context-switching between languages while studying. So I pointed Codex at it and told it to translate the whole thing into Korean.

It took almost an hour. The equations didn't survive the round trip — LaTeX formatting broke in unpredictable ways. The introductory sections were readable. The technical sections were not. I ended up with a document that was faster to fix by hand than to have generated in the first place.

---

## What I Actually Learned

Nine projects. Nine different domains. Not a single one became something I use daily.

The pattern is obvious in retrospect. Every project where I didn't already understand the domain — arbitrage mechanics, alpha generation, game graphics, typesetting — the AI filled the gap with confident garbage. The code compiled. The outputs looked plausible. But plausible isn't correct, and in domains where I couldn't tell the difference, I was just generating waste at high speed.

Vibe coding has a brutal failure mode: it feels like progress. You're shipping commits, seeing outputs, watching things move on screen. But if you don't know what "right" looks like, you're building a factory that produces defective parts — and you're the last person who'd notice.

The projects that worked — the HTS, the macro dashboard — were the ones where I already knew what I was looking at. I understood the domain. The AI accelerated my hands, not my judgment. That's the difference.

**Part 2 continues with what happened when I stopped building for humans and started building for machines.**

