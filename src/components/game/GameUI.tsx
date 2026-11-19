import { useEffect, useState } from "react";
import { jump, move, resetGame, runtime, slide } from "@/game/engine";
import { CHARACTERS, useGame } from "@/game/store";
import { initAudio, setMuted, setVolumes, sfx, startMusic, stopMusic } from "@/game/audio";
import { Button } from "@/components/ui/button";
import logo from "@/assets/neon-rush-logo.webp";

function start() {
  const s = useGame.getState();
  const source = s.screen;
  if (source === "menu") window.__lovableEvents?.track?.("project.main_menu_choice", { choice: "play" });
  if (source === "howto") {
    s.setPref({ seenHowto: true });
    window.__lovableEvents?.track?.("project.how_to_play_completed", {});
  }
  initAudio(s.muted); sfx.click(); resetGame(runtime.game);
  useGame.setState({ screen: "playing", score: 0, runCoins: 0 }); startMusic();
  window.__lovableEvents?.track?.("project.run_entered", { source, kind: "new" });
}
const go = (screen: "menu" | "select" | "howto" | "settings") => {
  const s = useGame.getState();
  if (s.screen === "menu") window.__lovableEvents?.track?.("project.main_menu_choice", { choice: screen });
  initAudio(s.muted); sfx.click(); s.setScreen(screen);
};

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
        if (s.screen === "playing") s.setScreen("paused"); else if (s.screen === "paused") { s.setScreen("playing"); window.__lovableEvents?.track?.("project.run_entered", { source: "paused", kind: "resume" }); }
      }
    };
    let sx = 0, sy = 0, fired = false;
    const ts = (e: TouchEvent) => { const t = e.touches[0]; if (!t) return; sx = t.clientX; sy = t.clientY; fired = false; };
    const tm = (e: TouchEvent) => {
      if (fired) return;
      const t = e.touches[0]; if (!t) return;
      const dx = t.clientX - sx, dy = t.clientY - sy;
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
  const [shopMessage, setShopMessage] = useState("");
  useEffect(() => setMuted(s.muted), [s.muted]);
  useEffect(() => setVolumes(s.musicVol, s.sfxVol), [s.musicVol, s.sfxVol]);
  useEffect(() => {
    if (s.screen === "playing" || s.screen === "settings") startMusic(); else stopMusic();
  }, [s.screen]);
  useEffect(() => {
    const visibility = () => {
      if (document.hidden) {
        stopMusic();
        if (useGame.getState().screen === "playing") useGame.getState().setScreen("paused");
      } else if (["playing", "settings"].includes(useGame.getState().screen)) startMusic();
    };
    document.addEventListener("visibilitychange", visibility);
    return () => { document.removeEventListener("visibilitychange", visibility); stopMusic(); };
  }, []);

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
            <Button variant="game" size="game" aria-label="Pause" className="btn-icon pointer-events-auto" onClick={() => { sfx.click(); s.setScreen("paused"); }}>❚❚</Button>
          </div>
        </div>
      )}

      {s.screen === "menu" && (
        <div key="menu" className="screen-enter pointer-events-auto mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-between p-5 pb-8 pt-safe">
          <div className="flex w-full items-center justify-between">
            <div className="hud-panel flex items-center gap-2 font-display"><Coin />{s.wallet}</div>
            <div className="flex gap-2">
              <Button variant="game" size="game" className="btn-icon" aria-label="How to play" onClick={() => go("howto")}>?</Button>
              <Button variant="game" size="game" className="btn-icon" aria-label="Settings" onClick={() => go("settings")}>⚙</Button>
            </div>
          </div>
          <div className="flex flex-col items-center">
            <img src={logo} alt="NEON RUSH" width={820} height={420} className="logo-img" />
            <div className="best-chip font-display">BEST · {s.best}</div>
          </div>
          <div className="flex w-full flex-col gap-3">
            <Button variant="game" size="game" className="btn-neon btn-primary-neon" onClick={start}>▶ PLAY</Button>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="game" size="game" className="btn-neon" onClick={() => go("select")}>RUNNERS</Button>
              <Button variant="game" size="game" className="btn-neon" onClick={() => go("howto")}>HOW TO PLAY</Button>
            </div>
            <Button variant="game" size="game" className="btn-neon btn-gold" disabled={!s.dailyAvailable()}
              onClick={() => { window.__lovableEvents?.track?.("project.main_menu_choice", { choice: "daily_reward" }); initAudio(s.muted); const a = s.claimDaily(); if (a) { sfx.reward(); setReward(a); } }}>
              {s.dailyAvailable() ? `🎁 DAILY REWARD · DAY ${s.lastDaily ? Math.min(7, s.streak + 1) : 1}` : "REWARD CLAIMED ✓"}
            </Button>
          </div>
        </div>
      )}

      {s.screen === "howto" && (
        <div key="howto" className="screen-enter pointer-events-auto mx-auto flex w-full max-w-md flex-1 flex-col gap-4 overflow-y-auto p-5 pb-8">
          <div className="flex items-center justify-between">
            <Button variant="game" size="game" className="btn-icon" onClick={() => go("menu")} aria-label="Back">←</Button>
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
          <Button variant="game" size="game" className="btn-neon btn-primary-neon mt-auto" onClick={start}>▶ LET'S RUN</Button>
        </div>
      )}

      {s.screen === "settings" && (
        <div key="settings" className="screen-enter pointer-events-auto mx-auto flex w-full max-w-md min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5 pb-8">
          <div className="flex items-center justify-between">
            <Button variant="game" size="game" className="btn-icon" onClick={() => go("menu")} aria-label="Back">←</Button>
            <h2 className="font-display text-xl tracking-widest">SETTINGS</h2>
            <span className="w-12" />
          </div>
          <div className="hud-panel space-y-5 p-5">
            <label className="flex items-center justify-between font-display text-sm tracking-widest">
              SOUND
              <Button variant="game" size="game" role="switch" aria-label="Sound" aria-checked={!s.muted} className={`toggle ${!s.muted ? "toggle-on" : ""}`} onClick={() => { s.toggleMute(); initAudio(!s.muted); sfx.click(); }}><span /></Button>
            </label>
            {([["MUSIC", "musicVol"], ["EFFECTS", "sfxVol"]] as const).map(([label, k]) => (
              <label key={k} className="block font-display text-sm tracking-widest">
                <span className="flex justify-between">{label}<span className="text-primary">{Math.round(s[k] * 100)}%</span></span>
                <input type="range" min={0} max={1} step={0.05} value={s[k]} disabled={s.muted} className="neon-range mt-2 w-full"
                  onChange={(e) => s.setPref({ [k]: Number(e.target.value) })} onPointerUp={() => { initAudio(s.muted); sfx.coin(); }} />
              </label>
            ))}
          </div>
          <section className="space-y-3 border-t border-border pt-4">
            <h3 className="font-display text-sm">GRAPHICS QUALITY</h3>
            <div className="grid grid-cols-2 gap-3" role="group" aria-label="Graphics quality">
              {(["low", "high"] as const).map(q => <Button variant="game" size="game" key={q} aria-pressed={s.graphics === q} className={`btn-neon ${s.graphics === q ? "quality-active" : ""}`} onClick={() => { s.setPref({ graphics: q }); sfx.click(); }}>{q.toUpperCase()}</Button>)}
            </div>
          </section>
          <p className="text-center text-xs text-muted-foreground">Progress is saved on this device.</p>
        </div>
      )}

      {s.screen === "select" && (
        <div key="select" className="screen-enter pointer-events-auto mx-auto flex w-full max-w-4xl min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5 pb-8">
          <div className="flex shrink-0 items-center justify-between gap-2">
            <Button variant="game" size="game" className="btn-icon" onClick={() => { setShopMessage(""); go("menu"); }} aria-label="Back">←</Button>
            <h2 className="font-display text-lg">RUNNER STORE</h2>
            <div className="hud-panel flex items-center gap-2 font-display"><Coin />{s.wallet}</div>
          </div>
          <div className="runner-grid">
            {CHARACTERS.map((c, i) => {
              const owned = c.currency === "coins" && s.unlocked.includes(i), sel = s.character === i;
              return (
                <Button variant="game" size="game" key={c.name} className={`char-card ${sel ? "char-card-active" : ""}`}
                  aria-label={`${c.name} ${sel ? "selected" : owned ? "equip" : c.currency === "INR" ? `₹${c.price} unavailable` : `${c.price} coins`}`}
                  aria-pressed={sel}
                  onClick={() => {
                    if (c.currency === "INR") { setShopMessage("Real-money purchases are not available yet. This runner remains locked."); return; }
                    if (s.pick(i)) { setShopMessage(""); sfx.click(); }
                    else { setShopMessage(`You need ${c.price - s.wallet} more coins to unlock ${c.name}.`); sfx.crash(); }
                  }}>
                  <img src={c.image} alt={`${c.name} futuristic runner artwork`} loading="lazy" width={384} height={512} className="runner-portrait" />
                  <span className="font-display text-sm">{c.name}</span>
                  <span className="runner-price">{sel ? "SELECTED" : owned ? "EQUIP" : c.currency === "INR" ? `₹${c.price}` : <span className="inline-flex items-center gap-1"><Coin />{c.price}</span>}</span>
                  <span className="text-xs text-muted-foreground">{c.currency === "INR" ? "LOCKED · COMING SOON" : owned ? "OWNED" : "COIN UNLOCK"}</span>
                </Button>
              );
            })}
          </div>
          {shopMessage && <p role="status" className="shop-message">{shopMessage}</p>}
          <Button variant="game" size="game" className="btn-neon btn-primary-neon shrink-0" onClick={start}>PLAY</Button>
        </div>
      )}

      {s.screen === "paused" && (
        <div className="overlay">
          <img src={logo} alt="" className="logo-img logo-sm" />
          <h2 className="font-display text-4xl neon-text text-primary">PAUSED</h2>
          <Button variant="game" size="game" className="btn-neon btn-primary-neon" onClick={() => { initAudio(s.muted); sfx.click(); s.setScreen("playing"); window.__lovableEvents?.track?.("project.run_entered", { source: "paused", kind: "resume" }); }}>RESUME</Button>
          <Button variant="game" size="game" className="btn-neon" onClick={start}>RESTART</Button>
          <Button variant="game" size="game" className="btn-neon" onClick={() => go("menu")}>MAIN MENU</Button>
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
          <Button variant="game" size="game" className="btn-neon btn-primary-neon" onClick={start}>RESTART</Button>
          <Button variant="game" size="game" className="btn-neon" onClick={() => go("menu")}>MAIN MENU</Button>
        </div>
      )}

      {reward > 0 && (
        <div className="overlay pointer-events-auto" onClick={() => setReward(0)}>
          <div className="hud-label">DAILY REWARD · DAY {s.streak}</div>
          <div className="flex items-center gap-3 font-display text-5xl text-gold neon-text"><Coin />+{reward}</div>
          <p className="text-sm text-muted-foreground">Come back tomorrow for a bigger reward!</p>
          <Button variant="game" size="game" className="btn-neon btn-gold">COLLECT</Button>
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
