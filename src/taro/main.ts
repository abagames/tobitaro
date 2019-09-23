import {
  init as utilInit,
  isJustPressed,
  random,
  clearJustPressed
} from "../util/main";
import * as view from "../util/view";
import * as text from "../util/text";
import * as terminal from "../util/terminal";
import {
  Actor,
  update as sgaUpdate,
  spawn,
  reset as sgaReset,
  pool
} from "../util/simpleGameActor";
import { Vector } from "../util/vector";
import { wrap, range, clamp } from "../util/math";
import { Random } from "../util/random";
import * as sss from "sounds-some-sounds";

type State = "title" | "inGame" | "gameOver";
let state: State;
let updateFunc = {
  title: updateTitle,
  inGame: updateInGame,
  gameOver: updateGameOver
};

utilInit(init, update, {
  viewSize: { x: 120, y: 60 },
  bodyBackground: "#ddd",
  viewBackground: "#eee",
  isUsingVirtualPad: false
});

function init() {
  initInGame();
  sss.init(0);
}

function update() {
  updateFunc[state]();
}

function initInGame() {
  state = "inGame";
}

function updateInGame() {
  view.clear();
  terminal.draw();
  sgaUpdate();
}

function initTitle() {
  state = "title";
  sgaReset();
}

function updateTitle() {
  if (isJustPressed) {
    initInGame();
  }
}

function initGameOver() {
  state = "gameOver";
  clearJustPressed();
}

function updateGameOver() {
  if (isJustPressed) {
    state = "inGame";
  }
}
