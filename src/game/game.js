// ==========================================
// 3D Endless Runner Game Engine
// ==========================================
import * as THREE from 'three';
import { $, rnd, pick, read, save, notify, playSound } from '../util/util.js';
import {
  lanes,
  SEG,
  COUNT,
  mat,
  basic,
  mesh,
  characters,
  createCharacter,
  createTrackSegment,
  createTrain,
  createBarrier,
  createOverhead,
  coinGeo,
  coinMat,
  createPowerupMesh,
  createBoardMesh
} from '../components/components.js';

export class GameEngine {
  constructor() {
    this.initThree();
    this.initState();
    this.initEnvironment();
    this.initCharacter();
    this.initMissions();
    this.initInputs();
    this.updateHud();
    this.clock = new THREE.Clock();
  }

  initThree() {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0xcdeaff, 50, 155);

    this.camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 400);
    this.camera.position.set(0, 5.2, 9);
    this.camera.lookAt(0, 1.5, -12);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    document.body.appendChild(this.renderer.domElement);

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    this.hemi = new THREE.HemisphereLight(0xffffff, 0x839078, 1);
    this.scene.add(this.hemi);

    this.sun = new THREE.DirectionalLight(0xffedc8, 1);
    this.sun.position.set(7, 15, 5);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    Object.assign(this.sun.shadow.camera, {
      left: -14,
      right: 14,
      top: 14,
      bottom: -14,
      near: 1,
      far: 45
    });
    this.scene.add(this.sun);
  }

  initState() {
    this.scroll = [];
    this.obstacles = [];
    this.collectibles = [];
    this.particles = [];

    this.state = 'start';
    this.lane = 1;
    this.px = 0;
    this.py = 0;
    this.vy = 0;
    this.slide = 0;
    this.speed = 18;
    this.distance = 0;
    this.coins = 0;
    this.bonus = 0;
    this.jet = 0;
    this.mag = 0;
    this.shoes = 0;
    this.boardTime = 0;

    this.boards = read('runner_boards', 1);
    this.best = read('runner_best', 0);
    this.total = read('runner_total', 0);
    this.owned = read('runner_owned', [0, 1, 2]);
    this.chosen = read('runner_chosen', 0);
    this.mult = read('runner_mult', 1);

    this.stumble = 99;
    this.invincible = 0;
    this.spawnAt = 35;
    this.coinAt = 18;
    this.powerAt = 170;
    this.runT = 0;
    this.themeTimer = 0;
    this.muted = false;

    this.jumps = 0;
    this.slides = 0;
    this.jetCount = 0;
  }

  initEnvironment() {
    // Tracks
    for (let i = 0; i < COUNT; i++) {
      const seg = createTrackSegment();
      seg.position.z = 10 - i * SEG;
      this.scene.add(seg);
      this.scroll.push({ o: seg, limit: 30, span: COUNT * SEG });
    }

    // Trees, Buildings, Lights
    const treeGreen = [mat(0x27814a), mat(0x3aa14c)];
    const trunk = mat(0x755039);
    const pole = mat(0x444854);
    const lamp = basic(0xffedab);
    const buildingColors = [0xe6d0af, 0xc5d8e7, 0xe5b9c0, 0xc9ddc7, 0xe8d9a5];

    for (const s of [-1, 1]) {
      for (let i = 0; i < 12; i++) {
        // Tree
        const t = new THREE.Group();
        mesh(t, new THREE.CylinderGeometry(0.15, 0.2, 1.2, 6), trunk, 0, 0.6);
        mesh(t, new THREE.ConeGeometry(0.95, 2.4, 8), treeGreen[i % 2], 0, 2.2);
        mesh(t, new THREE.ConeGeometry(0.7, 1.8, 8), treeGreen[i % 2], 0, 3.25);
        t.position.set(s * 7.6, 0, 7 - i * 16);
        this.scene.add(t);
        this.scroll.push({ o: t, limit: 30, span: 192 });

        // Building
        const h = rnd(10, 32);
        const w = rnd(5, 9);
        const d = rnd(8, 14);
        const b = new THREE.Group();
        mesh(b, new THREE.BoxGeometry(w, h, d), mat(pick(buildingColors)), 0, h / 2);
        for (let row = 2; row < h - 1; row += 3) {
          for (let z = -d / 2 + 1; z < d / 2; z += 2.5) {
            mesh(b, new THREE.BoxGeometry(0.04, 1, 1.2), mat(0x486782), -s * (w / 2 + 0.025), row, z);
          }
        }
        b.position.set(s * (12 + w / 2 + rnd(0, 3)), 0, 12 - i * 17);
        this.scene.add(b);
        this.scroll.push({ o: b, limit: 36, span: 204 });

        // Light Pole
        const l = new THREE.Group();
        mesh(l, new THREE.BoxGeometry(0.12, 4.5, 0.12), pole, 0, 2.25);
        mesh(l, new THREE.BoxGeometry(1, 0.12, 0.12), pole, -s * 0.5, 4.4);
        mesh(l, new THREE.BoxGeometry(0.45, 0.15, 0.4), lamp, -s, 4.32);
        l.position.set(s * 6.5, 0, 10 - i * 17);
        this.scene.add(l);
        this.scroll.push({ o: l, limit: 30, span: 204 });
      }
    }

    // Ground plane
    this.ground = mesh(this.scene, new THREE.PlaneGeometry(600, 600), mat(0x9fb585));
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.position.y = -0.06;
    this.ground.receiveShadow = true;

    // Hoverboard Mesh
    this.boardMesh = createBoardMesh();
    this.scene.add(this.boardMesh);
  }

  initCharacter() {
    if (!this.owned.includes(this.chosen)) this.chosen = 0;
    this.selectCharacter(this.chosen);
  }

  selectCharacter(idx) {
    if (this.runner) this.scene.remove(this.runner.g);
    this.runner = createCharacter(characters[idx]);
    this.scene.add(this.runner.g);
    this.chosen = idx;
    save('runner_chosen', idx);
    this.renderOutfits();
  }

  renderOutfits() {
    const outfitsEl = $('outfits');
    if (!outfitsEl) return;
    outfitsEl.innerHTML = '';
    characters.forEach((c, i) => {
      const b = document.createElement('div');
      b.className = 'skin' + (i === this.chosen ? ' sel' : '') + (this.owned.includes(i) ? '' : ' lock');
      b.style.background = '#' + c.shirt.toString(16).padStart(6, '0');
      b.innerHTML = c.icon + '<small></small>';
      b.querySelector('small').textContent = this.owned.includes(i) ? c.name : c.cost + ' coins';
      b.onclick = () => {
        if (!this.owned.includes(i)) {
          if (this.total < c.cost) {
            notify('Need ' + (c.cost - this.total) + ' more coins');
            return;
          }
          this.total -= c.cost;
          this.owned.push(i);
          save('runner_total', this.total);
          save('runner_owned', this.owned);
        }
        this.selectCharacter(i);
      };
      outfitsEl.appendChild(b);
    });
    if ($('total')) $('total').textContent = this.total;
  }

  initMissions() {
    this.missions = [
      { name: 'Collect 25 coins', target: 25, get: () => this.coins },
      { name: 'Jump 6 times', target: 6, get: () => this.jumps },
      { name: 'Slide 5 times', target: 5, get: () => this.slides },
      { name: 'Run 200 m', target: 200, get: () => Math.floor(this.distance) },
      { name: 'Get 1 jetpack', target: 1, get: () => this.jetCount }
    ];
    this.resetMissions();
  }

  resetMissions() {
    this.activeMissions = this.missions.slice(0, 3).map((m) => ({ m, base: m.get() }));
  }

  updateMissions() {
    for (let i = 0; i < this.activeMissions.length; i++) {
      const a = this.activeMissions[i];
      if (a.m.get() - a.base >= a.m.target) {
        this.mult = Math.min(10, this.mult + 1);
        save('runner_mult', this.mult);
        this.boards++;
        save('runner_boards', this.boards);
        notify('MISSION DONE! x' + this.mult);
        const next = this.missions.find((m) => !this.activeMissions.some((x) => x.m === m)) || pick(this.missions);
        this.activeMissions[i] = { m: next, base: next.get() };
      }
    }
    const missionsEl = $('missions');
    if (missionsEl) {
      missionsEl.innerHTML = this.activeMissions
        .map(
          (a) =>
            a.m.name + ' (' + Math.min(a.m.target, Math.max(0, a.m.get() - a.base)) + '/' + a.m.target + ')'
        )
        .join('<br>');
    }
  }

  getScore() {
    return Math.floor((this.distance + this.bonus) * this.mult);
  }

  updateHud() {
    if ($('score')) $('score').textContent = this.getScore();
    if ($('coins')) $('coins').textContent = this.coins;
    if ($('best')) $('best').textContent = this.best;
    if ($('mult')) $('mult').textContent = this.mult;
    if ($('speed')) $('speed').textContent = Math.round(this.speed * 3);
    if ($('boards')) $('boards').textContent = this.boards;

    for (const [id, t] of [
      ['jetHud', this.jet],
      ['magHud', this.mag],
      ['shoeHud', this.shoes]
    ]) {
      const el = $(id);
      if (el) {
        el.classList.toggle('hidden', t <= 0);
        const b = el.querySelector('b');
        if (b) b.textContent = Math.ceil(t);
      }
    }
  }

  reset() {
    for (const o of this.obstacles) this.scene.remove(o.g);
    this.obstacles.length = 0;
    for (const c of this.collectibles) this.scene.remove(c.g);
    this.collectibles.length = 0;
    for (const p of this.particles) this.scene.remove(p.g);
    this.particles.length = 0;

    this.lane = 1;
    this.px = 0;
    this.py = 0;
    this.vy = 0;
    this.slide = 0;
    this.distance = 0;
    this.coins = 0;
    this.bonus = 0;
    this.jet = 0;
    this.mag = 0;
    this.shoes = 0;
    this.boardTime = 0;
    this.jumps = 0;
    this.slides = 0;
    this.jetCount = 0;
    this.speed = 18;
    this.stumble = 99;
    this.invincible = 0;
    this.spawnAt = 35;
    this.coinAt = 18;
    this.powerAt = 170;

    this.runner.g.visible = true;
    this.runner.g.rotation.set(0, 0, 0);
    this.runner.g.position.set(0, 0, 0);
    this.camera.position.set(0, 5.2, 9);

    this.resetMissions();
    this.updateHud();
  }

  begin() {
    this.reset();
    this.state = 'play';
    $('start')?.classList.add('hidden');
    $('over')?.classList.add('hidden');
    $('paused')?.classList.add('hidden');
    playSound(440, 700, this.muted);
  }

  finish() {
    if (this.state !== 'play') return;
    this.state = 'over';
    const s = this.getScore();
    this.total += this.coins;
    save('runner_total', this.total);
    if (s > this.best) {
      this.best = s;
      save('runner_best', this.best);
    }
    let top = read('runner_top', []);
    top.push(s);
    top.sort((a, b) => b - a);
    top = top.slice(0, 5);
    save('runner_top', top);

    if ($('finalScore')) $('finalScore').textContent = s;
    if ($('finalCoins')) $('finalCoins').textContent = this.coins;
    if ($('finalBest')) $('finalBest').textContent = this.best;
    if ($('ranking')) $('ranking').textContent = 'Top scores: ' + top.join(' · ');
    $('over')?.classList.remove('hidden');
    this.renderOutfits();
    playSound(160, 50, this.muted);
  }

  hit(o) {
    if (this.boardTime > 0) {
      this.boardTime = 0;
      this.invincible = 2;
      notify('BOARD SAVED YOU!');
      o.dead = true;
      o.g.visible = false;
      return;
    }
    if (o.type === 'train' || this.stumble < 4) {
      this.finish();
      return;
    }
    this.stumble = 0;
    this.invincible = 1.5;
    o.dead = true;
    o.g.visible = false;
    this.speed = Math.max(14, this.speed * 0.7);
    $('flash')?.classList.add('on');
    setTimeout(() => $('flash')?.classList.remove('on'), 120);
    notify('WATCH OUT!');
    playSound(220, 80, this.muted);
  }

  board() {
    if (this.state !== 'play' || this.boardTime > 0 || this.boards < 1) return;
    this.boards--;
    save('runner_boards', this.boards);
    this.boardTime = 20;
    notify('HOVERBOARD!');
    playSound(300, 800, this.muted);
  }

  move(d) {
    if (this.state === 'play') {
      this.lane = Math.max(0, Math.min(2, this.lane + d));
    }
  }

  jump() {
    if (this.state === 'play' && this.jet <= 0 && this.py <= 0.03 && this.slide <= 0) {
      this.vy = this.shoes > 0 ? 17 : 12.5;
      this.jumps++;
      playSound(300, 700, this.muted);
    }
  }

  duck() {
    if (this.state !== 'play' || this.jet > 0) return;
    if (this.py > 0.1) {
      this.vy = -22;
    } else if (this.slide <= 0) {
      this.slide = 0.75;
      this.slides++;
      playSound(450, 150, this.muted);
    }
  }

  pause() {
    if (this.state === 'play') {
      this.state = 'pause';
      $('paused')?.classList.remove('hidden');
    } else if (this.state === 'pause') {
      this.state = 'play';
      $('paused')?.classList.add('hidden');
    }
  }

  usePower(type) {
    playSound(400, 900, this.muted);
    if (type === 'jet') {
      this.jet = 5;
      this.jetCount++;
      notify('JETPACK!');
    } else if (type === 'mag') {
      this.mag = 9;
      notify('MAGNET!');
    } else if (type === 'shoe') {
      this.shoes = 9;
      notify('SUPER SNEAKERS!');
    } else {
      const r = Math.floor(Math.random() * 4);
      if (r === 0) {
        this.coins += 30;
        this.bonus += 300;
        notify('+30 COINS!');
      } else if (r === 1) {
        this.boards++;
        save('runner_boards', this.boards);
        notify('+1 BOARD!');
      } else if (r === 2) {
        this.mag = 12;
        notify('MAGNET 12s!');
      } else if (r === 3) {
        this.shoes = 12;
        notify('SNEAKERS 12s!');
      }
    }
  }

  addObstacle(type, l, z) {
    const g = type === 'train' ? createTrain() : type === 'barrier' ? createBarrier() : createOverhead();
    g.position.set(lanes[l], 0, z);
    this.scene.add(g);
    this.obstacles.push({ g, type, l, hz: type === 'train' ? 4 : 0.35, dead: false });
  }

  spawnRow() {
    const ids = [0, 1, 2].sort(() => Math.random() - 0.5);
    const r = Math.random();
    if (r < 0.35) {
      this.addObstacle('train', ids[0], -135);
      if (Math.random() < 0.4) this.addObstacle('train', ids[1], -135);
    } else if (r < 0.6) {
      this.addObstacle('train', ids[0], -135);
      this.addObstacle('barrier', ids[1], -135);
    } else {
      const type = r < 0.8 ? 'barrier' : 'overhead';
      const n = 1 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i++) this.addObstacle(type, ids[i], -135);
    }
  }

  spawnCoins() {
    const l = Math.floor(Math.random() * 3);
    const arc = Math.random() < 0.35;
    for (let i = 0; i < 7; i++) {
      const z = -125 - i * 2.3;
      if (this.obstacles.some((o) => o.l === l && Math.abs(o.g.position.z - z) < o.hz + 2)) continue;
      const y = this.jet > 0 ? 5 : arc ? 1.25 + Math.sin((i / 6) * Math.PI) * 1.7 : 1.3;
      const g = mesh(this.scene, coinGeo, coinMat, lanes[l], y, z);
      this.collectibles.push({ g, type: 'coin' });
    }
  }

  spawnPower() {
    const l = Math.floor(Math.random() * 3);
    const type = pick(['jet', 'mag', 'shoe', 'box', 'box']);
    const g = createPowerupMesh(type);
    g.position.set(lanes[l], 1.5, -125);
    this.scene.add(g);
    this.collectibles.push({ g, type });
  }

  initInputs() {
    window.addEventListener('keydown', (e) => {
      const k = e.key;
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(k)) e.preventDefault();
      if (k === 'ArrowLeft' || k.toLowerCase() === 'a') this.move(-1);
      if (k === 'ArrowRight' || k.toLowerCase() === 'd') this.move(1);
      if (k === 'ArrowUp' || k.toLowerCase() === 'w') this.jump();
      if (k === 'ArrowDown' || k.toLowerCase() === 's') this.duck();
      if (k.toLowerCase() === 'h') this.board();
      if (k.toLowerCase() === 'p' || k === 'Escape') this.pause();
      if (k.toLowerCase() === 'm') this.muted = !this.muted;
      if ((k === ' ' || k === 'Enter') && this.state === 'start') this.begin();
      else if ((k.toLowerCase() === 'r' || k === 'Enter' || k === ' ') && this.state === 'over') this.begin();
    });

    let sx = 0;
    let sy = 0;
    this.renderer.domElement.addEventListener(
      'touchstart',
      (e) => {
        sx = e.changedTouches[0].clientX;
        sy = e.changedTouches[0].clientY;
      },
      { passive: true }
    );
    this.renderer.domElement.addEventListener(
      'touchend',
      (e) => {
        const dx = e.changedTouches[0].clientX - sx;
        const dy = e.changedTouches[0].clientY - sy;
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
        if (Math.abs(dx) > Math.abs(dy)) this.move(dx < 0 ? -1 : 1);
        else dy < 0 ? this.jump() : this.duck();
      },
      { passive: true }
    );

    let lastTap = 0;
    this.renderer.domElement.addEventListener('click', () => {
      const t = performance.now();
      if (t - lastTap < 300) this.board();
      lastTap = t;
    });

    $('startBtn')?.addEventListener('click', () => this.begin());
    $('restartBtn')?.addEventListener('click', () => this.begin());
    $('pauseBtn')?.addEventListener('click', () => this.pause());
    $('resumeBtn')?.addEventListener('click', () => this.pause());
    $('boardBtn')?.addEventListener('click', () => this.board());

    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.state === 'play') this.pause();
    });
  }

  updateTheme() {
    const phase = Math.floor(this.distance / 220) % 3;
    const colors = [
      { fog: 0xcdeaff, ground: 0x9fb585, sky: '#398dd4', light: 1 },
      { fog: 0xffbd87, ground: 0x99816a, sky: '#a45c9d', light: 0.7 },
      { fog: 0x3b4b83, ground: 0x35425d, sky: '#101b40', light: 0.42 }
    ];
    const t = colors[phase];
    this.scene.fog.color.setHex(t.fog);
    this.ground.material.color.setHex(t.ground);
    this.hemi.intensity = t.light;
    this.sun.intensity = t.light;
    document.body.style.background =
      'linear-gradient(' + t.sky + ',#' + new THREE.Color(t.fog).getHexString() + ')';
  }

  animatePlayer(dt) {
    this.runT += dt * (this.state === 'play' ? this.speed * 0.7 : 7);
    const air = this.py > 0.08 || this.jet > 0;
    const angle = air || this.slide > 0 ? 0 : Math.sin(this.runT) * 0.9;

    this.runner.legL.rotation.x = air ? -0.65 : angle;
    this.runner.legR.rotation.x = air ? 0.45 : -angle;
    this.runner.armL.rotation.x = air ? -1 : -angle;
    this.runner.armR.rotation.x = air ? -1 : angle;

    this.runner.g.position.set(
      this.px,
      this.py + (air || this.slide > 0 ? 0 : Math.abs(Math.sin(this.runT)) * 0.06),
      0
    );
    this.runner.g.rotation.x +=
      ((this.slide > 0 ? 1.1 : this.jet > 0 ? -0.35 : 0) - this.runner.g.rotation.x) *
      Math.min(1, dt * 12);
    this.runner.g.rotation.z +=
      ((lanes[this.lane] - this.px) * -0.08 - this.runner.g.rotation.z) * Math.min(1, dt * 10);

    this.runner.flames.forEach((f) => {
      f.visible = this.jet > 0;
      f.scale.y = 0.7 + Math.random() * 0.8;
    });
    this.runner.g.visible = this.invincible <= 0 || Math.floor(this.invincible * 12) % 2 === 0;
  }

  loop() {
    requestAnimationFrame(() => this.loop());
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const v =
      (this.state === 'play' ? this.speed * (this.jet > 0 ? 1.25 : 1) : this.state === 'start' ? 8 : 0) *
      dt;

    if (this.state === 'play') {
      this.distance += this.speed * dt * 0.2;
      this.speed = Math.min(40, this.speed + 0.3 * dt);
      this.stumble += dt;
      this.invincible = Math.max(0, this.invincible - dt);
      this.jet = Math.max(0, this.jet - dt);
      this.mag = Math.max(0, this.mag - dt);
      this.shoes = Math.max(0, this.shoes - dt);
      this.boardTime = Math.max(0, this.boardTime - dt);

      this.px += (lanes[this.lane] - this.px) * Math.min(1, dt * 14);

      if (this.jet > 0) {
        this.py += (4.3 - this.py) * Math.min(1, dt * 4);
        this.vy = 0;
        this.slide = 0;
      } else {
        this.vy -= 34 * dt;
        this.py += this.vy * dt;
        if (this.py < 0) {
          this.py = 0;
          this.vy = 0;
        }
        this.slide = Math.max(0, this.slide - dt);
      }

      this.spawnAt -= v;
      this.coinAt -= v;
      this.powerAt -= v;

      if (this.spawnAt <= 0) {
        this.spawnRow();
        this.spawnAt = 28 + this.speed * 0.9 + rnd(0, 12);
      }
      if (this.coinAt <= 0) {
        this.spawnCoins();
        this.coinAt = this.jet > 0 ? 16 : 42 + rnd(0, 30);
      }
      if (this.powerAt <= 0) {
        this.spawnPower();
        this.powerAt = 350 + rnd(0, 130);
      }

      // Obstacle collisions
      for (let i = this.obstacles.length - 1; i >= 0; i--) {
        const o = this.obstacles[i];
        o.g.position.z += v;
        if (
          !o.dead &&
          this.invincible <= 0 &&
          this.jet <= 0 &&
          Math.abs(o.g.position.z) < o.hz + 0.4 &&
          Math.abs(this.px - o.g.position.x) < 1.5
        ) {
          const top = this.py + (this.slide > 0 ? 0.8 : 1.8);
          const bottom = this.py;
          if (
            o.type === 'train' ||
            (o.type === 'barrier' && bottom < 0.9) ||
            (o.type === 'overhead' && top > 1.3 && bottom < 2)
          ) {
            this.hit(o);
            if (this.state !== 'play') break;
          }
        }
        if (o.g.position.z > 17) {
          this.scene.remove(o.g);
          this.obstacles.splice(i, 1);
        }
      }

      // Collectibles
      for (let i = this.collectibles.length - 1; i >= 0; i--) {
        const c = this.collectibles[i];
        c.g.position.z += v;
        c.g.rotation.y += dt * 3;
        const targetY = this.py + 0.9;

        if (
          c.type === 'coin' &&
          this.mag > 0 &&
          Math.abs(c.g.position.z) < 9 &&
          Math.abs(c.g.position.x - this.px) < 5
        ) {
          c.g.position.x += (this.px - c.g.position.x) * Math.min(1, dt * 9);
          c.g.position.y += (targetY - c.g.position.y) * Math.min(1, dt * 9);
          c.g.position.z += (0 - c.g.position.z) * Math.min(1, dt * 4);
        }

        const dx = c.g.position.x - this.px;
        const dy = c.g.position.y - targetY;
        const dz = c.g.position.z;
        if (dx * dx + dy * dy + dz * dz < (c.type === 'coin' ? 1.7 : 2.4)) {
          if (c.type === 'coin') {
            this.coins++;
            this.bonus += 10;
            playSound(900, 1200, this.muted);
          } else {
            this.usePower(c.type);
          }
          this.scene.remove(c.g);
          this.collectibles.splice(i, 1);
          continue;
        }

        if (c.g.position.z > 15) {
          this.scene.remove(c.g);
          this.collectibles.splice(i, 1);
        }
      }

      this.updateMissions();
      this.updateHud();

      this.themeTimer += dt;
      if (this.themeTimer > 0.25) {
        this.themeTimer = 0;
        this.updateTheme();
      }
    }

    // Scroll world scenery
    for (const s of this.scroll) {
      s.o.position.z += v;
      if (s.o.position.z > s.limit) s.o.position.z -= s.span;
    }

    this.animatePlayer(dt);

    // Camera follow
    this.camera.position.x += (this.px * 0.45 - this.camera.position.x) * Math.min(1, dt * 5);
    this.camera.position.y +=
      (5.2 + Math.min(this.py, 4) * 0.45 - this.camera.position.y) * Math.min(1, dt * 3);
    this.camera.lookAt(this.camera.position.x * 0.5, 1.6 + Math.min(this.py, 4) * 0.35, -12);

    // Hoverboard visual
    this.boardMesh.visible = this.boardTime > 0 && this.state === 'play';
    if (this.boardMesh.visible) {
      this.boardMesh.position.set(this.px, this.py + 0.06, 0);
      this.boardMesh.rotation.y += dt * 4;
    }

    this.renderer.render(this.scene, this.camera);
  }

  start() {
    this.loop();
  }
}
