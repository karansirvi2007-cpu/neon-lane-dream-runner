import { useEffect, useState } from "react";
import { jump, move, resetGame, runtime, slide } from "@/game/engine";
import { CHARACTERS, useGame } from "@/game/store";
import { initAudio, setMuted, sfx, startMusic, stopMusic } from "@/game/audio";

function start() {
  const s = useGame.getState();
  initAudio(s.muted); sfx.click(); resetGame(runtime.game);
  useGame.setState({ screen: "playing", score: 0, runCoins: 0 }); startMusic();
}
const go = (screen: "menu" | "select") => { sfx.click(); stopMusic(); useGame.getState().setScreen(screen); };

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

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col select-none">
      {s.screen === "playing" && (
        <div className="flex items-start justify-between p-4">
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
        <div className="pointer-events-auto flex flex-1 flex-col items-center justify-between p-6 pb-10">
          <div className="flex w-full justify-between">
            <div className="hud-panel flex items-center gap-2 font-display"><Coin />{s.wallet}</div>
            <button className="btn-icon" aria-label="Toggle sound" onClick={() => s.toggleMute()}>{s.muted ? "🔇" : "🔊"}</button>
          </div>
          <div className="text-center">
            <h1 className="title-neon font-display">NEON<br />RUSH</h1>
            <p className="mt-2 font-display text-sm tracking-[0.3em] text-muted-foreground">BEST {s.best}</p>
          </div>
          <div className="flex w-full max-w-xs flex-col gap-3">
            <button className="btn-neon btn-primary-neon" onClick={start}>PLAY</button>
            <button className="btn-neon" onClick={() => go("select")}>CHARACTERS</button>
            <button className="btn-neon btn-gold" disabled={!s.dailyAvailable()}
              onClick={() => { initAudio(s.muted); const a = s.claimDaily(); if (a) { sfx.reward(); setReward(a); } }}>
              {s.dailyAvailable() ? `DAILY REWARD · DAY ${s.lastDaily ? Math.min(7, s.streak + 1) : 1}` : "REWARD CLAIMED ✓"}
            </button>
            <p className="text-center text-xs text-muted-foreground">Swipe or use arrow keys · ↑ jump · ↓ slide</p>
          </div>
        </div>
      )}

      {s.screen === "select" && (
        <div className="pointer-events-auto flex flex-1 flex-col justify-end gap-4 p-5 pb-8">
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
    </div>
  );
}
