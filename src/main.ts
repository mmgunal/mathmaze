// Latin + Latin Extended cover Turkish and English; other scripts would only bloat the app.
import '@fontsource/baloo-2/latin-600.css';
import '@fontsource/baloo-2/latin-800.css';
import '@fontsource/baloo-2/latin-ext-600.css';
import '@fontsource/baloo-2/latin-ext-800.css';
import './ui/styles.css';
import * as THREE from 'three';
import { sfx } from './audio/sfx';
import { Character } from './game/character';
import { loadFont } from './game/labels';
import { Play } from './game/play';
import { Stage } from './game/stage';
import { themeFor } from './game/themes';
import { buildLevelView, toWorld, type LevelView } from './game/world';
import { lang, setLang, t } from './i18n';
import { LEVELS, WORLD_SIZES } from './level/curriculum';
import { availableLevels, loadMaze, type Layout } from './level/maze';

import { BLANK } from './game/labels';
import { speak, stopSpeaking } from './speech';
import { isUnlocked, saveStars, starsFor } from './storage';
import { confetti } from './ui/confetti';

const ui = document.getElementById('ui')!;
const stage = new Stage(document.getElementById('scene') as HTMLCanvasElement);

const icon = {
  play: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/></svg>',
  back: '<svg viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" d="M15 5l-7 7 7 7"/></svg>',
  bulb: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2a7 7 0 0 0-4 12.74V17a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2.26A7 7 0 0 0 12 2zm-2.5 18h5a.5.5 0 0 1 .5.5 1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 20.5a.5.5 0 0 1 .5-.5z"/></svg>',
  lock: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M7 10V8a5 5 0 0 1 10 0v2h.5A1.5 1.5 0 0 1 19 11.5v8a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19.5v-8A1.5 1.5 0 0 1 6.5 10H7zm2 0h6V8a3 3 0 0 0-6 0v2z"/></svg>',
  sound: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M4 9h3l5-4v14l-5-4H4a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1z"/><path fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" d="M16 8.5a5 5 0 0 1 0 7M18.8 6a8.5 8.5 0 0 1 0 12"/></svg>',
  mute: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M4 9h3l5-4v14l-5-4H4a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1z"/><path fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" d="M16 9l5 6M21 9l-5 6"/></svg>',
  replay: '<svg viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" d="M4 12a8 8 0 1 0 2.5-5.8M4 4v4.5h4.5"/></svg>',
  map: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M4 6.5 9 4l6 2.5L20 4v13.5L15 20l-6-2.5L4 20z" opacity=".9"/></svg>',
  hand: '<svg viewBox="0 0 64 64"><path fill="#fff" stroke="#2a2140" stroke-width="3.5" stroke-linejoin="round" d="M24 6a5 5 0 0 1 5 5v18l2-1a5 5 0 0 1 6 2l1 1a5 5 0 0 1 7 2l1 1a5 5 0 0 1 7 3v13c0 7-6 12-13 12H32c-5 0-8-2-11-6L12 44a5 5 0 0 1 7-7l0 0 0 0 0-26a5 5 0 0 1 5-5z"/></svg>',
};

const html = (s: string) => {
  const tpl = document.createElement('template');
  tpl.innerHTML = s.trim();
  return tpl.content.firstElementChild as HTMLElement;
};
const starRow = (n: number) => [0, 1, 2].map((i) => `<span class="${i < n ? 'star-on' : 'star-off'}">★</span>`).join('');

let cleanup: (() => void) | null = null;
function show(el: HTMLElement, dispose?: () => void) {
  cleanup?.();
  ui.replaceChildren(el);
  cleanup = dispose ?? null;
}

const layout = (): Layout => (window.innerWidth >= window.innerHeight ? 'landscape' : 'portrait');

/** HUD areas the camera keeps clear: top bar, and the question card (bottom, or bottom-left on wide screens). */
function setInsets(menu: boolean) {
  inPlay = !menu;
  if (menu) stage.insets = { top: 0, bottom: 0, left: 0, right: 0 };
  else if (layout() === 'portrait') stage.insets = { top: 90, bottom: 200, left: 0, right: 0 };
  else stage.insets = { top: 84, bottom: 120, left: 0, right: 0 };
}

let inPlay = false;
window.addEventListener('resize', () => setInsets(!inPlay));

// ── Scenic backdrop for menus: the first page with Pıtır idling at the start.
class Backdrop {
  private view: LevelView;
  private character = new Character();
  private stop: () => void;
  private time = 0;

  constructor(levelId: number) {
    const maze = loadMaze(levelId, layout());
    const theme = themeFor(levelId);
    stage.setTheme(theme);
    this.view = buildLevelView(maze, theme);
    this.view.root.add(this.character.root);
    this.character.root.scale.setScalar(1.3);
    this.character.root.position.copy(toWorld(maze.start.pos));
    stage.scene.add(this.view.root);
    setInsets(true);
    const s = toWorld(maze.start.pos);
    const around = (r: number) => [{ x: s.x - r, z: s.z - r }, { x: s.x + r, z: s.z + r }];
    stage.frame(around(5), 0, true);
    this.stop = stage.onUpdate((dt) => {
      this.time += dt;
      this.character.update(dt);
      this.view.update(dt);
      this.character.faceTowards(Math.sin(this.time * 0.6) * 0.6, 1);
      stage.frame(around(5 + Math.sin(this.time * 0.2) * 0.6), 0);
    });
  }

  dispose() {
    this.stop();
    stage.scene.remove(this.view.root);
    this.view.dispose();
  }
}

function titleScreen() {
  const backdrop = new Backdrop(availableLevels()[0]);
  const el = html(`
    <div class="title fade-in">
      <div class="logo">
        ${lang === 'tr'
          ? '<span class="l1">Matematik</span><span class="l2">Labirenti <span class="spark">✦</span></span>'
          : '<span class="l1">Math</span><span class="l2">Maze <span class="spark">✦</span></span>'}
      </div>
      <div class="bottom">
        <button class="btn sun play-btn" data-act="play">${icon.play}${t.play}</button>
        <div class="row">
          <button class="btn white round" data-act="sound" aria-label="sound">${sfx.muted ? icon.mute : icon.sound}</button>
          <button class="btn white round" data-act="lang" aria-label="language" style="font-size:20px">${lang === 'tr' ? 'EN' : 'TR'}</button>
        </div>
      </div>
    </div>`);
  el.addEventListener('click', (e) => {
    const act = (e.target as HTMLElement).closest('button')?.dataset.act;
    if (!act) return;
    sfx.tap();
    if (act === 'play') mapScreen();
    if (act === 'sound') {
      sfx.setMuted(!sfx.muted);
      titleScreen();
    }
    if (act === 'lang') {
      setLang(lang === 'tr' ? 'en' : 'tr');
      document.documentElement.lang = lang;
      titleScreen();
    }
  });
  show(el, () => backdrop.dispose());
}

function mapScreen() {
  const ready = new Set(availableLevels());
  const current = LEVELS.find((l) => isUnlocked(l.id) && starsFor(l.id) === 0)?.id ?? -1;
  let id = 0;
  const worlds = WORLD_SIZES.map((size, w) => {
    const first = LEVELS.findIndex((l) => l.world === w) + 1;
    const th = themeFor(first);
    const mid = themeFor(first + 3);
    const levels = Array.from({ length: size }, () => {
      const spec = LEVELS[id++];
      const open = isUnlocked(spec.id) && ready.has(spec.id);
      return `<button class="lvl ${open ? '' : 'locked'} ${spec.id === current ? 'current' : ''}" data-id="${spec.id}" ${open ? '' : 'disabled'}>
          <span class="bubble" style="--lc: ${themeFor(spec.id).accent}">${open ? spec.id : icon.lock}</span>
          <span class="stars">${open ? starRow(starsFor(spec.id)) : ''}</span>
        </button>`;
    }).join('');
    return `<section class="world" style="--wbg: linear-gradient(160deg, ${th.ground}, ${mid.ground}); --wink: rgba(42,33,64,0.55)">
        <span class="num">${w + 1}</span>
        <h2>${t.worlds[w]}</h2>
        <div class="levels">${levels}</div>
      </section>`;
  }).join('');
  const el = html(`
    <div class="map fade-in">
      <div class="topbar">
        <button class="btn white round" data-act="back" aria-label="back">${icon.back}</button>
        <h1>${t.map}</h1>
      </div>
      ${worlds}
    </div>`);
  el.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('button');
    if (!btn) return;
    sfx.tap();
    if (btn.dataset.act === 'back') return titleScreen();
    if (btn.dataset.id) playScreen(Number(btn.dataset.id));
  });
  show(el);
  el.querySelector('.current')?.scrollIntoView({ block: 'center' });
}

function promptHtml(text: string) {
  return text
    .split(BLANK)
    .map((s) => s.replace(/ /g, '&thinsp;'))
    .join('<span class="blank"></span>');
}

function playScreen(id: number) {
  const maze = loadMaze(id, layout());
  setInsets(false);
  const spec = maze.spec;
  let asked = 0;
  const el = html(`
    <div class="hud fade-in">
      <div class="topbar">
        <button class="btn white round" data-act="back" aria-label="back">${icon.back}</button>
        <div class="chip"><span>${t.level} ${id}</span><span class="stars">${starRow(3)}</span></div>
        <button class="btn sun round" data-act="hint" aria-label="hint">${icon.bulb}</button>
      </div>
      <div class="prompt hide"><div class="card"></div><div class="sub"></div><div class="dots"></div></div>
    </div>`);
  const prompt = el.querySelector('.prompt') as HTMLElement;
  const card = el.querySelector('.card') as HTMLElement;
  const sub = el.querySelector('.sub') as HTMLElement;
  const stars = [...el.querySelectorAll('.chip .stars span')] as HTMLElement[];
  let hintEl: HTMLElement | null = null;
  let hand: HTMLElement | null = null;
  let handTimer = 0;

  const clearHelpers = () => {
    hintEl?.remove();
    hintEl = null;
    hand?.remove();
    hand = null;
    clearTimeout(handTimer);
  };

  const play = new Play(stage, maze, themeFor(id), {
    ask(text, kind) {
      card.innerHTML =
        kind === 'target'
          ? `<span class="q">?</span>&thinsp;=&thinsp;${text}`
          : `${promptHtml(text)}${text.includes('=') ? '' : '&thinsp;=&thinsp;<span class="q">?</span>'}`;
      sub.textContent = asked === 0 ? (kind === 'target' ? t.findTarget.replace('{n}', text) : t.findPath) : '';
      prompt.classList.remove('hide', 'pop', 'shake');
      void prompt.offsetWidth;
      prompt.classList.add('pop');
      // First level: a pointing hand teaches the rule without any reading.
      if (id === availableLevels()[0] && asked === 0) handTimer = window.setTimeout(showHand, 1400);
      asked++;
    },
    correct() {
      clearHelpers();
      prompt.classList.add('hide');
    },
    mistake(count, at) {
      clearHelpers();
      // "Try again" bubble right above the stone that was tapped.
      const pop = html(`<div class="retry-pop" style="left:${at.x}px;top:${at.y}px"><span class="x">✕</span>${t.retry}</div>`);
      el.appendChild(pop);
      setTimeout(() => pop.remove(), 2300);
      prompt.classList.remove('pop', 'shake');
      void prompt.offsetWidth;
      prompt.classList.add('shake');
      const left = count === 0 ? 3 : count <= 2 ? 2 : 1;
      stars.forEach((s, i) => s.classList.toggle('lost', i >= left));
    },
    complete(n) {
      saveStars(id, n);
      resultScreen(id, n);
    },
  });

  if (import.meta.env.DEV) Object.assign(window, { __ml: { play, stage, THREE, playScreen } });

  function showHand() {
    const stone = play.correctStones[0];
    if (!stone) return;
    const p = stone.label.getWorldPosition(new THREE.Vector3()).project(stage.camera);
    hand = html(`<div class="hand">${icon.hand}</div>`);
    hand.style.left = `${((p.x + 1) / 2) * innerWidth}px`;
    hand.style.top = `${((1 - p.y) / 2) * innerHeight}px`;
    el.appendChild(hand);
  }

  el.addEventListener('click', (e) => {
    const act = (e.target as HTMLElement).closest('button')?.dataset.act;
    if (act === 'back') {
      sfx.tap();
      mapScreen();
    }
    if (act === 'hint' && play.hint()) {
      clearHelpers();
      hintEl = html(`<div class="bubble-hint">💡 ${t.hints[spec.topic]}</div>`);
      el.appendChild(hintEl);
      setTimeout(() => hintEl?.remove(), 4200);
    }
  });

  show(el, () => {
    clearHelpers();
    stopSpeaking();
    play.dispose();
  });

  // Level intro: the page's title and rule on a card over the whole maze; read aloud in the first worlds.
  const title = lang === 'tr' ? maze.page.title : t.topics[spec.topic];
  const flavor = t.flavor[id - 1];
  const rule = t.rules[maze.page.mechanic].replace('{n}', String(maze.page.target ?? ''));
  const intro = html(`
    <div class="intro-veil">
      <div class="intro-card" style="--ac: ${themeFor(id).accent}">
        <div class="intro-level">${t.level} ${id}</div>
        <h2>${title}</h2>
        <p class="flavor">${flavor}</p>
        <p class="rule">${rule}</p>
        <div class="intro-actions">
          <button class="btn white round" data-act="listen" aria-label="${t.listen}">${icon.sound}</button>
          <button class="btn mint intro-start" data-act="begin">${t.start} ${icon.play.replace('<svg', '<svg width="30" height="30"')}</button>
        </div>
      </div>
    </div>`);
  el.appendChild(intro);
  const readAloud = () => speak(`${title}. ${flavor} ${rule}`, lang);
  if (spec.world <= 2 && !sfx.muted) setTimeout(readAloud, 450);
  intro.addEventListener('click', (e) => {
    const act = (e.target as HTMLElement).closest('button')?.dataset.act;
    if (act === 'listen') {
      sfx.tap();
      readAloud();
    }
    if (act === 'begin') {
      e.stopPropagation();
      sfx.tap();
      stopSpeaking();
      intro.classList.add('leaving');
      setTimeout(() => intro.remove(), 320);
      play.begin();
    }
  });

  let resultEl: HTMLElement | null = null;
  function resultScreen(levelId: number, n: number) {
    const hasNext = availableLevels().includes(levelId + 1);
    resultEl = html(`
      <div class="veil">
        <div class="result">
          <h2>${t.great[n - 1]}</h2>
          <div class="big-stars">${starRow(n)}</div>
          <div class="actions">
            <button class="btn white round" data-act="map" aria-label="map">${icon.map}</button>
            <button class="btn white round" data-act="replay" aria-label="replay">${icon.replay}</button>
            ${hasNext ? `<button class="btn mint" data-act="next">${t.next} ${icon.play.replace('<svg', '<svg width="26" height="26"')}</button>` : ''}
          </div>
        </div>
      </div>`);
    el.appendChild(resultEl);
    confetti(el);
    const bigStars = [...resultEl.querySelectorAll('.big-stars span')] as HTMLElement[];
    bigStars.forEach((s, i) =>
      setTimeout(() => {
        s.classList.add('in');
        if (i < n) sfx.star(i);
      }, 350 + i * 280),
    );
    resultEl.addEventListener('click', (e) => {
      const act = (e.target as HTMLElement).closest('button')?.dataset.act;
      if (!act) return;
      sfx.tap();
      if (act === 'map') mapScreen();
      if (act === 'replay') playScreen(levelId);
      if (act === 'next') playScreen(levelId + 1);
    });
  }
}

await loadFont();
document.documentElement.lang = lang;
titleScreen();

// Dev shortcut: ?level=12 jumps straight into a level.
const devLevel = Number(new URLSearchParams(location.search).get('level'));
if (devLevel >= 1 && devLevel <= LEVELS.length) playScreen(devLevel);
