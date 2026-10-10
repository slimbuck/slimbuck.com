---
title: "Chirky Box"
order: 0
description: "My game console runs on Raspberry PI + browser. Supports KB & SNES controller."
tags: ["games", "raspberry pi", "webassembly", "chirky"]
---
After playing Mario 1 on an original NES console in France, I was inspired to develop my own console.

I wondered whether it's still possible to get that immediate-response feeling using (partly) modern hardware.

I have built a console out of:
- Raspberry PI 3 B+
- Original SNES controller
- Raspberry PI Pico (for controller to USB)
- RGBerry (PI to scart converter)
- 14" CRT TV

I got Astra to compile the console to wasm and add browser support:
[chirky.org](https://chirky.org/)

The github repo has the code:
https://github.com/slimbuck/chirky
