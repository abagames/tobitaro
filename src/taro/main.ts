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
import { wrap, range } from "../util/math";
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

let arrowSpawnTicks: number;

function initInGame() {
  state = "inGame";
  ticks = 0;
  arrowSpawnTicks = 0;
  sga.spawn(taro);
}

let gameSpeed: number;

function updateInGame() {
  gameSpeed = 1 + ticks * 0.0005;
  arrowSpawnTicks--;
  if (arrowSpawnTicks < 0) {
    arrowSpawnTicks = (100 / gameSpeed) * random.get(0.5, 1);
    sga.spawn(arrow);
  }
  view.clear();
  view.context.fillStyle = "black";
  view.context.fillRect(0, 43, 120, 17);
  terminal.draw();
  sga.update();
}

function taro(a: Actor) {
  let isJumping = false;
  let isDead = false;
  a.vel.set(0.3, 0);
  a.pos.set(60, 40);
  a.addUpdater(() => {
    if (isDead) {
      a.vel.y += 0.2;
      return;
    }
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
        a.vel.y = -2 / Math.sqrt(gameSpeed);
      }
    }
    a.rotationPattern = a.vel.x > 0 ? "k" : "n";
    sga.pool.get(arrow).forEach((ar: Actor) => {
      if (a.testCollision(ar)) {
        isDead = true;
        a.rotationPattern = a.vel.x > 0 ? "j" : "b";
        a.animInterval = 9999999;
        a.vel.x *= -2;
        a.vel.y = -3 / Math.sqrt(gameSpeed);
      }
    });
    sga.pool.get(coin).forEach((c: Actor) => {
      if (a.testCollision(c)) {
        c.remove();
      }
    });
  });
}

let arrowAddingPattern = 0;

function arrow(a: Actor) {
  arrowAddingPattern = wrap(arrowAddingPattern + 1, 0, 6);
  a.animChar = "C";
  switch (arrowAddingPattern) {
    case 0:
    case 3:
      a.pos.set(-3, arrowAddingPattern === 0 ? 40 : random.get(20, 30));
      a.vel.set(0.4, 0);
      break;
    case 1:
    case 4:
      a.pos.set(123, arrowAddingPattern === 1 ? 40 : random.get(20, 30));
      a.vel.set(-0.4, 0);
      a.rotationPattern = "n";
      break;
    case 2:
    case 5:
      a.pos.set(random.get(0, 120), -3);
      a.vel.set(0, 0.3);
      a.rotationPattern = "l";
      break;
  }
  if (random.get() < 0.1) {
    const cp = new Vector(a.pos);
    cp.x -= a.vel.x * 5;
    cp.y -= a.vel.y * 5;
    range(10).forEach(i => {
      cp.x -= a.vel.x * 15;
      cp.y -= a.vel.y * 15;
      sga.spawn(coin, cp, a.vel);
    });
  }
  a.animInterval = 20;
  a.collidingRect.set(4, 1);
  a.addUpdater(() => {
    if (a.pos.x < -6 || a.pos.x > 126 || a.pos.y > 40) {
      a.remove();
    }
  });
}

function coin(a: Actor, p: Vector, v: Vector) {
  a.pos.set(p);
  a.vel.set(v);
  a.animChar = "E";
  a.animInterval = 15;
  a.addUpdater(() => {
    if (
      (a.vel.x < 0 && a.pos.x < -6) ||
      (a.vel.x > 0 && a.pos.x > 126) ||
      a.pos.y > 40
    ) {
      a.remove();
    }
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
  collidingRect = new Vector(4, 4);

  update() {
    super.update();
    this.pos.x += this.vel.x * gameSpeed;
    this.pos.y += this.vel.y * gameSpeed;
    if (this.ticks % this.animInterval === 0) {
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

  testCollision(aa: Actor) {
    return (
      Math.abs(this.pos.x - aa.pos.x) <
        (this.collidingRect.x + aa.collidingRect.x) / 2 &&
      Math.abs(this.pos.y - aa.pos.y) <
        (this.collidingRect.y + aa.collidingRect.y) / 2
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
`,
  `
ww  w
wwwwww
ww  w
`,
  `
ww ww
 wwwww
ww ww
`,
  `
w
w
w
`,
  `
 w
www
 w
`
];
