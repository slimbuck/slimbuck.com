---
title: "Chirky"
order: 0
description: "A game console which runs on Raspberry PI + CRT + snes controller or in the browser."
tags: ["games", "raspberry pi", "webassembly"]
embed: "/apps/chirky/"
embedHeight: 860
---
After playing Mario on an original NES console in France, I was inspired to develop my own console.

I wondered whether it's still possible to get that immediate-response feel using (partly) modern hardware. And with agents all the grunt work becomes a doddle.

My console comprises:
- Raspberry PI 3 B+
- Original SNES controller
- Raspberry PI Pico (for controller to USB)
- RGBerry (PI to scart converter)
- 14" CRT TV

The software is an agent-made c application running on Trixie Lite.

I have a cool dashboard running on the laptop which shows the console status, allows me to create and edit levels etc.

I call the platform Chirky.

https://github.com/slimbuck/chirky

Choose a game in the launcher below. Click the game to focus it, use the arrow
keys to move, and press **X** or **Enter** to select. Touch controls and standard
browser gamepads are also supported. The browser version uses the same game code
as the console.
