import * as main from "../tobi/main";
import * as view from "../tobi/view";
import * as text from "../tobi/text";
import { Terminal } from "../tobi/terminal";
import * as input from "../tobi/input";
import * as actor from "../tobi/actor";
import { Random } from "../tobi/random";
import { Vector, VectorLike } from "../tobi/vector";
import { range, wrap } from "../tobi/math";
import * as sound from "sounds-some-sounds";

type State = "title" | "inGame" | "gameOver";
let state: State;
let updateFunc = {
  title: updateTitle,
  inGame: updateInGame,
  gameOver: updateGameOver
};
let ticks = 0;
let score = 0;
let random = new Random();
let terminal: Terminal;
let maze: Terminal;

main.init(init, update, {
  viewSize: { x: 20 * 6, y: 12 * 6 },
  bodyBackground: "#ddd",
  viewBackground: "#eee",
  isUsingVirtualPad: true,
  isFourWaysStick: true
});

function init() {
  sound.init(104);
  terminal = new Terminal({ x: 20, y: 12 });
  maze = new Terminal({ x: 20, y: 12 });
  actor.setActorClass(Actor);
  text.defineSymbols(charPatterns, "A");
  initTitle();
}

function update() {
  view.clear();
  terminal.clear();
  updateFunc[state]();
  actor.update();
  if (score > 0) {
    const ss = `${score} `;
    terminal.print(ss, 0, 0, {
      color: "l",
      backgroundColor: "w"
    });
  }
  maze.draw();
  terminal.draw();
  ticks++;
}

let gameSpeed: number;
let nextExtendScore: number;
let isExtending: boolean;
let scrollTicks: number;
let life: number;

function initInGame() {
  sound.playJingle("l");
  state = "inGame";
  actor.reset();
  ticks = 0;
  score = 0;
  gameSpeed = 1;
  life = 2;
  nextExtendScore = 100;
  isExtending = false;
  scrollTicks = 0;
  maze.clear();
  for (let y = 0; y < 12; y++) {
    addMaze(y);
  }
  actor.spawn(player);
}

function updateInGame() {
  scrollTicks--;
  if (scrollTicks <= 0) {
    maze.scrollUp();
    addMaze(11);
    actor.get().forEach((a: Actor) => {
      a.pos.y--;
    });
    let x = random.getInt(2, 18);
    const av = random.getPlusOrMinus();
    actor.spawn(enemy, { x, y: 11 }, 3, av);
    setWall(x, 11, 0);
    x += av;
    if (x > 1 && x < 18) {
      setWall(x, 11, 2);
    }
    scrollTicks = 200 / gameSpeed;
  }
  gameSpeed += 0.0002;
  if (score >= nextExtendScore) {
    nextExtendScore += 100;
    isExtending = true;
  }
  if (life > 0) {
    const ls = `${range(life)
      .map(() => "E")
      .join("")} `;
    terminal.print(ls, 0, 11, {
      color: "l",
      backgroundColor: "w",
      symbol: "s"
    });
  }
  if (ticks === 150) {
    sound.playBgm();
  }
}

const angleOffsets = [[1, 0], [0, 1], [-1, 0], [0, -1]];

function player(a: Actor) {
  let coinMultiplier = 1;
  let coinTicks = 0;
  let invincibleTicks = 0;
  a.char = "A";
  a.animCount = 2;
  a.pos.set(9, 2);
  let pp = new Vector();
  a.move = () => {
    pp.set(a.pos);
    a.pos.add(a.vel);
    if (a.pos.y < 0) {
      a.pos.y = 0;
    }
    const mz = maze.getCharAt(a.pos.x, a.pos.y);
    if (mz != null && mz.char === "n") {
      sound.play("c");
      score += coinMultiplier;
      coinMultiplier++;
      coinTicks = 60;
    } else {
      coinMultiplier = 0;
    }
    const w = checkWall(a.pos.x, a.pos.y);
    if (w > 0) {
      if (w <= 2) {
        sound.play("l");
        setWall(a.pos.x, a.pos.y, w - 1);
      }
      a.pos.set(pp);
    }
  };
  a.addUpdater(() => {
    const sa = input.stickAngle / 2;
    if (sa < 0) {
      a.vel.set(0);
    } else {
      a.vel.set(angleOffsets[sa][0], angleOffsets[sa][1]);
      if (a.vel.x !== 0) {
        a.rotation = a.vel.x > 0 ? "k" : "n";
      }
    }
    if (a.pos.y < 0) {
      a.pos.y = 0;
    }
    if (coinTicks > 0) {
      coinTicks--;
      if (coinTicks === 0) {
        coinMultiplier = 1;
      }
      if (coinMultiplier > 1) {
        const ms = ` +${coinMultiplier}`;
        terminal.print(ms, 20 - ms.length, 0, {
          color: "l",
          backgroundColor: "w"
        });
      }
    }
    if (invincibleTicks <= 0) {
      actor.get(enemy).forEach((e: Actor) => {
        if (invincibleTicks <= 0 && e.testCollision(a)) {
          sound.playJingle("h", true);
          life--;
          if (life < 0) {
            initGameOver();
            a.remove();
            return;
          }
          invincibleTicks = 100;
          e.remove();
        }
      });
    } else {
      invincibleTicks--;
      a.color = invincibleTicks > 0 && invincibleTicks % 30 < 15 ? "w" : "l";
    }
    actor.get(extendHart).forEach((h: Actor) => {
      if (h.testCollision(a)) {
        sound.play("p");
        life++;
        h.remove();
      }
    });
  });
}

function enemy(a: Actor, _pos: VectorLike, _angle: number, angleVel: number) {
  let angle = _angle;
  a.pos.set(_pos);
  a.vel.set(1, 0);
  a.char = "C";
  a.animCount = 2;
  a.moveInterval = random.getInt(10, 30);
  a.rotation = angleVel > 0 ? "k" : "n";
  let hasGold = random.get() < 0.5;
  a.move = () => {
    for (let i = 0; i < 4; i++) {
      const ao = angleOffsets[angle];
      const w = checkWall(a.pos.x + ao[0], a.pos.y + ao[1]);
      if (w === 4) {
        a.remove();
        break;
      } else if (w === 0) {
        if (hasGold) {
          maze.print("n", a.pos.x, a.pos.y, {
            colorPattern: "l",
            symbolPattern: "s"
          });
        }
        if (hasGold && a.pos.y > 6 && isExtending) {
          isExtending = false;
          if (life < 2) {
            actor.spawn(extendHart, a.pos);
          }
        }
        a.pos.add({ x: ao[0], y: ao[1] });
        angle = wrap(angle + angleVel, 0, 4);
        break;
      }
      angle = wrap(angle - angleVel, 0, 4);
    }
  };
}

function extendHart(a: Actor, _pos: VectorLike) {
  a.pos.set(_pos);
  a.char = "E";
  a.addUpdater(() => {
    if (a.pos.y < 0) {
      a.remove();
    }
  });
}

function addMaze(y: number) {
  const r = [
    1,
    1,
    1,
    -1,
    0,
    0,
    -1,
    -1,
    1,
    1,
    1,
    1,
    -1,
    0,
    0,
    0,
    1,
    1,
    1,
    -1,
    0,
    0,
    0,
    0,
    -1,
    0,
    1,
    -1,
    -1,
    0,
    0,
    0
  ];
  setWall(0, y, 3, true);
  setWall(1, y, 3, true);
  for (let x = 2; x <= 9; x++) {
    const a = checkWall(x - 2, y) > 0 ? 1 : 0;
    const b = checkWall(x - 1, y) > 0 ? 1 : 0;
    const c = checkWall(x - 1, y - 1) > 0 ? 1 : 0;
    const d = checkWall(x, y - 1) > 0 ? 1 : 0;
    const e = checkWall(x + 1, y - 1) > 0 ? 1 : 0;
    const v = (a << 4) + (b << 3) + (c << 2) + (d << 1) + e;
    let n = r[v];
    if (n === -1) {
      n = random.get() > 0.5 ? 0 : 1;
    }
    setWall(x, y, n * 2, true);
  }
}

function checkWall(x: number, y: number) {
  if (x < 0 || x >= 20 || y < 0 || y >= 12) {
    return 4;
  }
  const c = maze.getCharAt(x, y);
  if (c.char === "x") {
    return 3;
  } else if (c.char === "w") {
    return 1;
  } else if (c.options.backgroundColor === "l") {
    return 2;
  } else {
    return 0;
  }
}

function setWall(x: number, y: number, n: number, isMirrored = false) {
  const char = [" ", "w", " ", "x"][n];
  const options: text.CharOptions =
    n === 0 ? {} : { backgroundColor: "l", isSymbol: true };
  maze.setCharAt(x, y, char, options);
  if (isMirrored) {
    maze.setCharAt(19 - x, y, char, options);
  }
}

class Actor extends actor.Actor {
  pos = new Vector();
  vel = new Vector();
  char = "A";
  rotation = "k";
  color = "l";
  animInterval = 30;
  animCount = 1;
  moveInterval = 20;
  moveTicks = 0;
  animIndex = 0;
  animIndexVel = 1;

  update() {
    super.update();
    maze.print(" ", this.pos.x, this.pos.y);
    this.moveTicks--;
    if (this.moveTicks <= 0 && this.vel.length > 0) {
      this.move();
      if (!this.isAlive) {
        return;
      }
      this.moveTicks = this.moveInterval / gameSpeed;
    }
    if (this.animCount >= 2 && this.ticks % this.animInterval === 0) {
      this.animIndex += this.animIndexVel;
      if (this.animIndex < 0 || this.animIndex >= this.animCount) {
        this.animIndexVel *= -1;
        this.animIndex += this.animIndexVel * 2;
      }
    }
    maze.print(
      String.fromCharCode(this.char.charCodeAt(0) + this.animIndex),
      this.pos.x,
      this.pos.y,
      {
        color: this.color,
        symbol: "s",
        rotation: this.rotation
      }
    );
  }

  move() {
    this.pos.add(this.vel);
  }

  testCollision(aa: Actor) {
    return this.pos.x === aa.pos.x && this.pos.y === aa.pos.y;
  }
}

function initTitle() {
  state = "title";
  ticks = 0;
}

function updateTitle() {
  terminal.print(" TOBURIED ", 5, 3, { color: "l", backgroundColor: "w" });
  if (ticks > 30) {
    terminal.print("[Arrow][WASD][Slide]", 0, 8, {
      color: "l",
      backgroundColor: "w"
    });
    terminal.print(" Move / Dig Wall ", 2, 9, {
      color: "l",
      backgroundColor: "w"
    });
  }
  if (input.isJustPressed) {
    initInGame();
  }
}

function initGameOver() {
  sound.stopBgm();
  state = "gameOver";
  input.clearJustPressed();
  ticks = 0;
}

function updateGameOver() {
  terminal.print(" GAME OVER ", 4, 3, { color: "l", backgroundColor: "w" });
  if (ticks > 20 && input.isJustPressed) {
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
 wwwww
wwwwww
ww w w
wwwww
 w  w
w   w
`,
  `
 wwwww
ww w w
wwwwww
wwwww
 w  w
 w   w
`,
  `
 w w
wwwww
wwwww
 www
  w
`
];
