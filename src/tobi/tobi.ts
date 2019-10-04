import * as view from "./view";
import * as text from "./text";
import * as terminal from "./terminal";
import * as input from "./input";
import * as sound from "sounds-some-sounds";
import * as actor from "./actor";
import * as debug from "./debug";
import { Vector, VectorLike } from "./vector";
export { view, text, terminal, input, sound, actor, debug, Vector, VectorLike };
export { clamp, wrap, isInRange, range, stableSort } from "./math";
export { Random } from "./random";

export type Options = {
  viewSize?: VectorLike;
  bodyBackground?: string;
  viewBackground?: string;
  isUsingVirtualPad?: boolean;
  isFourWaysStick?: boolean;
  isCapturing?: boolean;
};

let lastFrameTime = 0;
let _init: () => void;
let _update: () => void;
const defaultOptions: Options = {
  viewSize: { x: 126, y: 126 },
  bodyBackground: "#111",
  viewBackground: "black",
  isUsingVirtualPad: true,
  isFourWaysStick: false,
  isCapturing: false
};
let options: Options;
let textCacheEnableTicks = 10;

export function init(
  __init: () => void,
  __update: () => void,
  _options?: Options
) {
  _init = __init;
  _update = __update;
  options = { ...defaultOptions, ..._options };
  window.addEventListener("load", onLoad);
}

function onLoad() {
  view.init(
    options.viewSize,
    options.bodyBackground,
    options.viewBackground,
    options.isCapturing
  );
  input.init(options.isUsingVirtualPad, options.isFourWaysStick);
  const terminalSize = {
    x: Math.ceil(view.size.x / text.letterSize),
    y: Math.ceil(view.size.y / text.letterSize)
  };
  terminal.init(terminalSize);
  text.init();
  _init();
  update();
}

function update() {
  requestAnimationFrame(update);
  const now = window.performance.now();
  const timeSinceLast = now - lastFrameTime;
  if (timeSinceLast < 1000 / 60 - 5) {
    return;
  }
  lastFrameTime = now;
  sound.update();
  input.update();
  _update();
  if (options.isCapturing) {
    view.capture();
  }
  textCacheEnableTicks--;
  if (textCacheEnableTicks === 0) {
    text.enableCache();
  }
}
