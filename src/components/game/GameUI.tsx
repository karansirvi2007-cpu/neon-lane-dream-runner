import { useEffect, useState } from "react";
import { jump, move, resetGame, runtime, slide } from "@/game/engine";
import { CHARACTERS, useGame } from "@/game/store";
import { initAudio, setMuted, setVolumes, sfx, startMusic, stopMusic } from "@/game/audio";
import logo from "@/assets/neon-rush-logo.webp";

function start() {
  const s = useGame.getState();
  initAudio(s.muted); sfx.click(); resetGame(runtime.game);
  useGame.setState({ screen: "playing", score: 0, runCoins: 0 }); startMusic();
}
const go = (screen: "menu" | "select" | "howto" | "settings") => { sfx.click(); stopMusic(); useGame.getState().setScreen(screen); };

function useControls() {
  useEffect(() => {
    const act = (a: "l" | "r" | "u" | "d") => {
      if (useGame.getState().screen !== "playing") return;
      const g = runtime.game;
      if (a === "l") { move(g, -1); sfx.lane(); } else if (a === "r") { move(g, 1); sfx.lane(); }
      else if (a === "u") { if (jump(g)) sfx.jump(); } else { slide(g); sfx.slide(); }
    };
    const key = (e: KeyboardEvent) => {
      const m: Record<string, "l" | "r" | "u" | "d"> = { ArrowLeft: "l", KeyA: "l", ArrowRight: "r", KeyD: "r", ArrowUp: "u", KeyW: "u", Space: "u", ArrowDown: "d", KeyS: "d" };
      const a = m[e.code]; if (a) { e.preventDefault(); act(a); }
      if (e.code === "Escape" || e.code === "KeyP") {
        const s = useGame.getState();
        if (s.screen === "playing") s.setScreen("paused"); else if (s.screen === "paused") s.setScreen("playing");
      }
    };
    let sx = 0, sy = 0, fired = false;
    const ts = (e: TouchEvent) => { sx = e.touches[0]!.clientX; sy = e.touches[0]!.clientY; fired = false; };
    const tm = (e: TouchEvent) => {
      if (fired) return;
      const dx = e.touches[0]!.clientX - sx, dy = e.touches[0]!.clientY - sy;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 28) return;
      fired = true;
      act(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "r" : "l") : dy < 0 ? "u" : "d");
    };
    window.addEventListener("keydown", key);
    window.addEventListener("touchstart", ts, { passive: true });
    window.addEventListener("touchmove", tm, { passive: true });
    return () => { window.removeEventListener("keydown", key); window.removeEventListener("touchstart", ts); window.removeEventListener("touchmove", tm); };
  }, []);
}

const Coin = () => <span className="coin-dot" aria-hidden />;

export default function GameUI() {
  useControls();
  const s = useGame();
  const [reward, setReward] = useState(0);
  useEffect(() => setMuted(s.muted), [s.muted]);
  useEffect(() => setVolumes(s.musicVol, s.sfxVol), [s.musicVol, s.sfxVol]);

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col select-none">
      {s.screen === "playing" && (
        <div className="screen-fade flex items-start justify-between p-4">
          <div className="hud-panel">
            <div className="hud-label">SCORE</div>
            <div className="font-display text-3xl text-primary neon-text">{s.score}</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hud-panel flex items-center gap-2 font-display text-xl"><Coin />{s.runCoins}</div>
            <button aria-label="Pause" className="btn-icon pointer-events-auto" onClick={() => { sfx.click(); s.setScreen("paused"); }}>❚❚</button>
          </div>
        </div>
      )}

      {s.screen === "menu" && (
        <div key="menu" className="screen-enter pointer-events-auto mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-between p-5 pb-8 pt-safe">
          <div className="flex w-full items-center justify-between">
            <div className="hud-panel flex items-center gap-2 font-display"><Coin />{s.wallet}</div>
            <div className="flex gap-2">
              <button className="btn-icon" aria-label="How to play" onClick={() => go("howto")}>?</button>
              <button className="btn-icon" aria-label="Settings" onClick={() => go("settings")}>⚙</button>
            </div>
          </div>
          <div className="flex flex-col items-center">
            <img src={logo} alt="NEON RUSH" width={820} height={420} className="logo-img" />
            <div className="best-chip font-display">BEST · {s.best}</div>
          </div>
          <div className="flex w-full flex-col gap-3">
            <button className="btn-neon btn-primary-neon" onClick={start}>▶ PLAY</button>
            <div className="grid grid-cols-2 gap-3">
              <button className="btn-neon" onClick={() => go("select")}>RUNNERS</button>
              <button className="btn-neon" onClick={() => go("howto")}>HOW TO PLAY</button>
            </div>
            <button className="btn-neon btn-gold" disabled={!s.dailyAvailable()}
              onClick={() => { initAudio(s.muted); const a = s.claimDaily(); if (a) { sfx.reward(); setReward(a); } }}>
              {s.dailyAvailable() ? `🎁 DAILY REWARD · DAY ${s.lastDaily ? Math.min(7, s.streak + 1) : 1}` : "REWARD CLAIMED ✓"}
            </button>
          </div>
        </div>
      )}

      {s.screen === "howto" && (
        <div key="howto" className="screen-enter pointer-events-auto mx-auto flex w-full max-w-md flex-1 flex-col gap-4 overflow-y-auto p-5 pb-8">
          <div className="flex items-center justify-between">
            <button className="btn-icon" onClick={() => go("menu")} aria-label="Back">←</button>
            <h2 className="font-display text-xl tracking-widest">HOW TO PLAY</h2>
            <span className="w-12" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[["←  →", "Swipe left / right", "Change lane"], ["↑", "Swipe up · Space", "Jump"], ["↓", "Swipe down", "Slide"], ["❚❚", "P · Esc", "Pause"]].map(([i, k, t]) => (
              <div key={t} className="info-card"><span className="info-icon font-display">{i}</span><span className="font-display text-sm">{t}</span><span className="text-xs text-muted-foreground">{k}</span></div>
            ))}
          </div>
          <div className="hud-panel space-y-2 p-4 text-sm">
            <p><span className="tag tag-gold">YELLOW HURDLE</span> Jump over it</p>
            <p><span className="tag tag-pink">PINK GATE</span> Slide under it</p>
            <p><span className="tag tag-cyan">TALL BLOCK</span> Switch lanes</p>
            <p className="flex items-center gap-2"><Coin /> Coins add +10 score and unlock new runners</p>
            <p className="text-muted-foreground">The city speeds up the longer you survive.</p>
          </div>
          <button className="btn-neon btn-primary-neon mt-auto" onClick={start}>▶ LET'S RUN</button>
        </div>
      )}

      {s.screen === "settings" && (
        <div key="settings" className="screen-enter pointer-events-auto mx-auto flex w-full max-w-md flex-1 flex-col gap-4 p-5 pb-8">
          <div className="flex items-center justify-between">
            <button className="btn-icon" onClick={() => go("menu")} aria-label="Back">←</button>
            <h2 className="font-display text-xl tracking-widest">SETTINGS</h2>
            <span className="w-12" />
          </div>
          <div className="hud-panel space-y-5 p-5">
            <label className="flex items-center justify-between font-display text-sm tracking-widest">
              SOUND
              <button role="switch" aria-checked={!s.muted} className={`toggle ${!s.muted ? "toggle-on" : ""}`} onClick={() => { s.toggleMute(); initAudio(!s.muted); sfx.click(); }}><span /></button>
            </label>
            {([["MUSIC", "musicVol"], ["EFFECTS", "sfxVol"]] as const).map(([label, k]) => (
              <label key={k} className="block font-display text-sm tracking-widest">
                <span className="flex justify-between">{label}<span className="text-primary">{Math.round(s[k] * 100)}%</span></span>
                <input type="range" min={0} max={1} step={0.05} value={s[k]} disabled={s.muted} className="neon-range mt-2 w-full"
                  onChange={(e) => s.setPref({ [k]: Number(e.target.value) })} onPointerUp={() => { initAudio(s.muted); sfx.coin(); }} />
              </label>
            ))}
          </div>
          <p className="text-center text-xs text-muted-foreground">Progress is saved on this device.</p>
        </div>
      )}

      {s.screen === "select" && (
        <div key="select" className="screen-enter pointer-events-auto mx-auto flex w-full max-w-2xl flex-1 flex-col justify-end gap-4 p-5 pb-8">
          <div className="flex items-center justify-between">
            <button className="btn-icon" onClick={() => go("menu")} aria-label="Back">←</button>
            <h2 className="font-display text-xl tracking-widest">CHOOSE RUNNER</h2>
            <div className="hud-panel flex items-center gap-2 font-display"><Coin />{s.wallet}</div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {CHARACTERS.map((c, i) => {
              const owned = s.unlocked.includes(i), sel = s.character === i;
              return (
                <button key={c.name} className={`char-card ${sel ? "char-card-active" : ""}`}
                  style={{ "--char": c.accent } as React.CSSProperties}
                  onClick={() => { if (s.pick(i)) sfx.click(); else sfx.crash(); }}>
                  <span className="char-swatch" />
                  <span className="font-display tracking-widest">{c.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {sel ? "SELECTED" : owned ? "TAP TO USE" : <span className="inline-flex items-center gap-1"><Coin />{c.price}</span>}
                  </span>
                </button>
              );
            })}
          </div>
          <button className="btn-neon btn-primary-neon" onClick={start}>PLAY</button>
        </div>
      )}

      {s.screen === "paused" && (
        <div className="overlay">
          <img src={logo} alt="" className="logo-img logo-sm" />
          <h2 className="font-display text-4xl neon-text text-primary">PAUSED</h2>
          <button className="btn-neon btn-primary-neon" onClick={() => { sfx.click(); s.setScreen("playing"); }}>RESUME</button>
          <button className="btn-neon" onClick={start}>RESTART</button>
          <button className="btn-neon" onClick={() => go("menu")}>MAIN MENU</button>
        </div>
      )}

      {s.screen === "over" && (
        <div className="overlay">
          <h2 className="font-display text-4xl text-destructive neon-text">GAME OVER</h2>
          {s.newBest && <div className="badge-best font-display">NEW BEST!</div>}
          <div className="grid w-full max-w-xs grid-cols-3 gap-2 text-center">
            <div className="hud-panel"><div className="hud-label">SCORE</div><div className="font-display text-2xl">{s.score}</div></div>
            <div className="hud-panel"><div className="hud-label">BEST</div><div className="font-display text-2xl text-primary">{s.best}</div></div>
            <div className="hud-panel"><div className="hud-label">COINS</div><div className="font-display text-2xl text-gold">+{s.runCoins}</div></div>
          </div>
          <button className="btn-neon btn-primary-neon" onClick={start}>RESTART</button>
          <button className="btn-neon" onClick={() => go("menu")}>MAIN MENU</button>
        </div>
      )}

      {reward > 0 && (
        <div className="overlay pointer-events-auto" onClick={() => setReward(0)}>
          <div className="hud-label">DAILY REWARD · DAY {s.streak}</div>
          <div className="flex items-center gap-3 font-display text-5xl text-gold neon-text"><Coin />+{reward}</div>
          <p className="text-sm text-muted-foreground">Come back tomorrow for a bigger reward!</p>
          <button className="btn-neon btn-gold">COLLECT</button>
        </div>
      )}
      <div className={`loading-screen ${s.loaded ? "loading-done" : ""}`} aria-hidden={s.loaded}>
        <img src={logo} alt="NEON RUSH" className="logo-img" />
        <div className="loading-bar"><span /></div>
        <p className="font-display text-xs tracking-[0.4em] text-muted-foreground">LOADING CITY…</p>
      </div>
    </div>
  );
}
