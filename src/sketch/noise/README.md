Implementing Noise
------------------

# Intro

As an artist working with code one of the tools I reach for most frequently is noise, Perlin noise that is. It can add a sense of life and natural movement to whatever you do. There are many implementations out there. I usually work in javascript so when I need to bring the noise I'll use either the [P5.js](https://p5js.org/) or [noisejs](https://github.com/josephg/noisejs). They have served me well.

Perlin noise is such a common component of generative art that I thought it would serve me well to learn how it create it myself. The implementations I have seen are not very self explanatory, but it turns out there is nothing too complicated happening. My goad here is to write an easy to understand implementation of perlin noise. As an added challenge, once we have the algorithm working, I'll move it onto the gpu using GPU.js to get some more speed out of it. Hopefully along the way we'll create some interesting art.

# Value noise

Before we start writing our Perlin Noise function we'll implement a slightly simpler version of noise called Value noise. It is very similar to Perlin and will give a good understanding of the general way Perlin noise works. Perlin noise is an adjustment to value noise that removes some (still repetition visible when zoomed out) visible artifacts of the algorithm.