---
title: "HASTY 3D"
order: 2
description: "A blockout puzzle game written in C++/OpenGL ES, compiled to WebAssembly."
embed: "/apps/hasty/"
embedHeight: 760
---
I wrote this simple blockout-type game and published to the [Google Play Store](https://play.google.com/store/apps/details?id=com.slimbuck.hasty).

Since the game is written in C++ and uses OpenGL ES 2.0, I used the magical [emscripten](https://www.emscripten.org) to compile the game for the web. The result is a mostly-working version of HASTY 3D, running the browser.

This app requires Atomic support and so unfortunately does not run on Safari (and likely older browsers). Threading seems to run slowly resulting in audio clicks.

Space: drop piece
q, w, e, a, s, d: rotate piece
Up, down, left, right: move piece
Enter: ui select