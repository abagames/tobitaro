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
import { range } from "../util/math";
import * as sss from "sounds-some-sounds";

type State = "title" | "inGame" | "gameOver";
let state: State;
let updateFunc = {
  title: updateTitle,
  inGame: updateInGame,
  gameOver: updateGameOver
};
let ticks = 0;
let score = 0;

utilInit(init, update, {
  viewSize: { x: 120, y: 60 },
  bodyBackground: "#ddd",
  viewBackground: "#eee",
  isUsingVirtualPad: false
});

function init() {
  sss.init(10);
  sga.setActorClass(Actor);
  text.defineSymbols(charPatterns, "A");
  initTitle();
}

function update() {
  terminal.clear();
  view.clear();
  view.context.fillStyle = "black";
  view.context.fillRect(0, 43, 120, 17);
  arrowSpawnTicks--;
  if (arrowSpawnTicks < 0) {
    arrowSpawnTicks = (100 / gameSpeed) * random.get(0.75, 1);
    sga.spawn(arrow);
  }
  updateFunc[state]();
  sga.update();
  if (score > 0) {
    terminal.print(`${score}`, 0, 0, { colorPattern: "lllllll" });
  }
  terminal.draw();
  ticks++;
}

let lifeHearts: any[];
let gameSpeed = 1;
let arrowSpawnTicks = 0;
let nextExtendScore: number;
let isExtending: boolean;

function initInGame() {
  sss.playJingle("l_st");
  state = "inGame";
  sga.reset();
  ticks = 0;
  score = 0;
  lifeHearts = range(2).map(i => sga.spawn(heart, i));
  gameSpeed = 1;
  arrowSpawnTicks = 0;
  nextExtendScore = 100;
  isExtending = false;
  sga.spawn(taro);
}

function updateInGame() {
  gameSpeed += 0.0002;
  if (score >= nextExtendScore) {
    nextExtendScore += 100;
    isExtending = true;
  }
  if (ticks === 150) {
    sss.playBgm();
  }
}

function taro(a: Actor) {
  let isJumping = false;
  let isDead = false;
  let coinTicks = 0;
  let coinMultiplier = 1;
  let invincibleTicks = 0;
  let isFirstPress = true;
  a.vel.set(0.3, 0);
  a.pos.set(60, 40);
  a.addUpdater(() => {
    if (isDead) {
      a.vel.y += 0.2;
      if (a.pos.y > 66) {
        a.remove();
        initGameOver();
      }
      return;
    }
    a.pos.clamp(0, 120, 0, 60);
    if (isJustPressed) {
      sss.play("l_tn");
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
        if (isFirstPress) {
          isFirstPress = false;
        } else {
          sss.play("j_jm0");
          isJumping = true;
          a.vel.y = -2 / Math.sqrt(gameSpeed);
        }
      }
    }
    a.rotationPattern = a.vel.x > 0 ? "k" : "n";
    if (invincibleTicks <= 0) {
      sga.pool.get(arrow).forEach((ar: Actor) => {
        if (invincibleTicks <= 0 && a.testCollision(ar)) {
          sss.setQuantize(0);
          sss.playJingle("l_ht2", true);
          sss.setQuantize(0.5);
          if (lifeHearts.length > 0) {
            lifeHearts[lifeHearts.length - 1].dead();
            lifeHearts.pop();
            invincibleTicks = 100;
          } else {
            sss.stopBgm();
            isDead = true;
            a.rotationPattern = a.vel.x > 0 ? "j" : "b";
            a.animInterval = 9999999;
            a.vel.x *= -2;
            a.vel.y = -3 / Math.sqrt(gameSpeed);
          }
        }
      });
    } else {
      invincibleTicks--;
      a.colorPattern =
        invincibleTicks > 0 && invincibleTicks % 30 < 15 ? "w" : "l";
    }
    sga.pool.get(coin).forEach((c: Actor) => {
      if (a.testCollision(c)) {
        sss.play("c_cg0");
        score += coinMultiplier;
        coinMultiplier++;
        coinTicks = 60;
        c.remove();
      }
    });
    if (coinTicks > 0) {
      coinTicks--;
      if (coinTicks === 0) {
        coinMultiplier = 1;
      }
      if (coinMultiplier > 1) {
        const ms = `+${coinMultiplier}`;
        terminal.print(ms, 20 - ms.length, 0, { colorPattern: "lllll" });
      }
    }
    sga.pool.get(extendHeart).forEach((e: Actor) => {
      if (a.testCollision(e)) {
        sss.play("p_ex");
        lifeHearts.push(sga.spawn(heart, lifeHearts.length));
        e.remove();
      }
    });
  });
}

function arrow(a: Actor) {
  const ap = random.getInt(6);
  a.animChar = "C";
  a.collidingRect.set(4, 1);
  switch (ap) {
    case 0:
    case 1:
      a.pos.set(-3, ap === 0 ? 40 : random.get(20, 30));
      a.vel.set(0.4, 0);
      break;
    case 2:
    case 3:
      a.pos.set(123, ap === 2 ? 40 : random.get(20, 30));
      a.vel.set(-0.4, 0);
      a.rotationPattern = "n";
      break;
    case 4:
    case 5:
      a.pos.set(random.get(20, 100), -3);
      a.vel.set(0, 0.3);
      a.rotationPattern = "l";
      a.collidingRect.set(1, 4);
      break;
  }
  if (ap < 4 && isExtending) {
    if (lifeHearts.length < 2) {
      const ep = new Vector(a.pos);
      ep.x -= a.vel.x * 25;
      ep.y -= a.vel.y * 25;
      sga.spawn(extendHeart, ep, a.vel, a.rotationPattern);
    }
    isExtending = false;
  } else if (random.get() < 0.2) {
    const cp = new Vector(a.pos);
    cp.x -= a.vel.x * 5;
    cp.y -= a.vel.y * 5;
    range(9).forEach(i => {
      cp.x -= a.vel.x * 15;
      cp.y -= a.vel.y * 15;
      sga.spawn(coin, cp, a.vel, a.rotationPattern);
    });
  }
  a.animInterval = 20;
  a.addUpdater(() => {
    if (a.pos.x < -6 || a.pos.x > 126 || a.pos.y > 40) {
      a.remove();
    }
  });
}

function coin(a: Actor, p: Vector, v: Vector, rp: string) {
  a.pos.set(p);
  a.vel.set(v);
  a.animChar = "E";
  a.animInterval = 15;
  a.rotationPattern = rp;
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

function extendHeart(a: Actor, p: Vector, v: Vector, rp: string) {
  a.pos.set(p);
  a.vel.set(v);
  a.animChar = "G";
  a.animInterval = 9999999;
  a.rotationPattern = rp;
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

function heart(a: Actor & { dead: Function }, i: number) {
  a.pos.set(i * 6 + 3, 56);
  a.colorPattern = "w";
  a.animChar = "G";
  a.animInterval = 45;
  a.animInterval = 9999999;
  let isDead = false;
  a.addUpdater(() => {
    if (isDead) {
      a.vel.y += 0.2;
      if (a.pos.y > 63) {
        a.remove();
      }
    }
  });
  a.dead = () => {
    isDead = true;
    a.rotationPattern = "n";
    a.vel.x = 1;
    a.vel.y = -2 / Math.sqrt(gameSpeed);
  };
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
  colorPattern = "l";

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
        colorPattern: this.colorPattern,
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
  ticks = 0;
}

function updateTitle() {
  terminal.print("TOBITARO", 6, 3, { colorPattern: "lllllllll" });
  if (ticks > 30) {
    terminal.print("[Press]   Turn", 3, 8);
  }
  if (ticks > 60) {
    terminal.print("[Release] Jump", 3, 9);
  }
  if (isJustPressed) {
    initInGame();
  }
}

function initGameOver() {
  state = "gameOver";
  clearJustPressed();
  ticks = 0;
}

function updateGameOver() {
  terminal.print("GAME OVER", 5, 3, { colorPattern: "lllllllll" });
  if (ticks > 20 && isJustPressed) {
    initInGame();
  } else if (ticks > 300) {
    initTitle();
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
`,
  `
 w w
wwwww
wwwww
 www
  w
`
];
