---
title: "Chirky Box"
order: 0
description: "My game console runs on Raspberry PI + browser. Supports KB & SNES controller."
tags: ["games", "raspberry pi", "webassembly", "chirky"]
---
<img class="project-mascot" src="/images/chirky-mascot.png" alt="Chirky mascot: a smiling chicken with a CRT monitor body and colourful tail feathers." width="1188" height="1185">

After playing Mario 1 on an original NES console in France, I was inspired to develop my own console.

I wondered whether it's still possible to get that immediate-response feeling using (partly) modern hardware.

So I built a console using the following:
| What | For |
|---|---|
| Raspberry PI 3 B+ | Runs the game under linux trixie lite |
| Original SNES controller | Better input device than keyboard |
| Raspberry PI Pico | Converts SNES inputs to USB generic joystick device |
| RGBerry | Converts Raspberry PI 4-pin output to SCART |
| 14" CRT TV | For no latency output |

I then got Astra to compile the console to wasm and add browser support:
[chirky.org](https://chirky.org/)

The github repo has the code:
https://github.com/slimbuck/chirky
