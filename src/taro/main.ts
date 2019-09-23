import {
  init as utilInit,
  isJustPressed,
  random,
  clearJustPressed,
  isJustReleased
} from "../util/main";
import * as view from "../util/view";
import * as text from "../util/text";
import * as terminal from "../util/terminal";
import * as sga from "../util/simpleGameActor";
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
let ticks = 0;

utilInit(init, update, {
  viewSize: { x: 120, y: 60 },
  bodyBackground: "#ddd",
  viewBackground: "#eee",
  isUsingVirtualPad: false
});

function init() {
  sss.init(0);
  sga.setActorClass(Actor);
  text.defineSymbols(charPatterns, "A");
  initInGame();
}

function update() {
  updateFunc[state]();
  ticks++;
}

function initInGame() {
  state = "inGame";
  sga.spawn(taro);
}

function updateInGame() {
  view.clear();
  view.context.fillStyle = "black";
  view.context.fillRect(0, 43, 120, 17);
  terminal.draw();
  sga.update();
}

function taro(a: Actor) {
  let isJumping = false;
  a.pos.set(60, 40);
  a.vel.set(0.3, 0);
  a.addUpdater(() => {
    a.pos.clamp(0, 120, 0, 60);
    if (isJustPressed) {
      a.vel.x *= -1;
    }
    if (isJumping) {
      a.vel.y += 0.1;
      if (a.pos.y >= 40) {
        isJumping = false;
        a.vel.y = 0;
        a.pos.y = 40;
      }
    } else {
      if (isJustReleased) {
        isJumping = true;
        a.vel.y = -2;
      }
    }
    a.rotationPattern = a.vel.x > 0 ? "k" : "n";
  });
}

class Actor extends sga.Actor {
  pos = new Vector();
  vel = new Vector();
  animInterval = 30;
  animCount = 2;
  animChar = "A";
  char = "A";
  animIndex = 0;
  animIndexVel = 1;
  rotationPattern = "k";

  update() {
    super.update();
    this.pos.add(this.vel);
    if (ticks % this.animInterval === 0) {
      this.animIndex += this.animIndexVel;
      if (this.animIndex < 0 || this.animIndex >= this.animCount) {
        this.animIndexVel *= -1;
        this.animIndex += this.animIndexVel * 2;
      }
    }
    text.print(
      String.fromCharCode(this.animChar.charCodeAt(0) + this.animIndex),
      this.pos.x - 3,
      this.pos.y - 3,
      {
        colorPattern: "l",
        symbolPattern: "s",
        rotationPattern: this.rotationPattern
      }
    );
  }
}

function initTitle() {
  state = "title";
  sga.reset();
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

const charPatterns = [
  `
wwwwww
ww w w
ww w w
wwwwww
 w  w
 w  w
`,
  `

wwwwww
ww w w
ww w w
wwwwww
ww  ww
`
];
