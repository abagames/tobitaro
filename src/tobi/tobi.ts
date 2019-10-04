import * as view from "./view";
import * as input from "./input";
import * as text from "./text";
import * as terminal from "./terminal";
import { VectorLike } from "./vector";
import * as sound from "sounds-some-sounds";

export type Options = {
  viewSize?: VectorLike;
  bodyBackground?: string;
  viewBackground?: string;
  isUsingVirtualPad?: boolean;
  isFourWaysStick?: boolean;
};

let lastFrameTime = 0;
let _init: () => void;
let _update: () => void;
const defaultOptions: Options = {
  viewSize: { x: 126, y: 126 },
  bodyBackground: "#111",
  viewBackground: "black",
  isUsingVirtualPad: true,
  isFourWaysStick: false
};
let options: Options;
let ticks = 0;

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
  view.init(options.viewSize, options.bodyBackground, options.viewBackground);
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
  view.capture();
  ticks++;
  if (ticks === 10) {
    text.enableCache();
  }
}
