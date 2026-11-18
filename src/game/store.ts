import { create } from "zustand";

export type Screen = "menu" | "select" | "howto" | "settings" | "playing" | "paused" | "over";
export const CHARACTERS = [
  { name: "VOLT", body: "#7c93ad", accent: "#22e6ff", price: 0 },
  { name: "NOVA", body: "#a07fb8", accent: "#ff3df2", price: 100 },
  { name: "BLAZE", body: "#b58a6a", accent: "#ffb020", price: 250 },
  { name: "VENOM", body: "#6f9c80", accent: "#4dff7a", price: 500 },
];
const KEY = "neon-rush-save";
interface Save { best: number; wallet: number; character: number; unlocked: number[]; lastDaily: string; streak: number; muted: boolean; musicVol: number; sfxVol: number; seenHowto: boolean }
const today = () => new Date().toISOString().slice(0, 10);
function load(): Save {
  const d: Save = { best: 0, wallet: 0, character: 0, unlocked: [0], lastDaily: "", streak: 0, muted: false, musicVol: 0.7, sfxVol: 0.8, seenHowto: false };
  if (typeof window === "undefined") return d;
  try { return { ...d, ...JSON.parse(localStorage.getItem(KEY) || "{}") }; } catch { return d; }
}

interface State extends Save {
  loaded: boolean; screen: Screen; score: number; runCoins: number; newBest: boolean;
  setScreen: (s: Screen) => void;
  finishRun: (score: number, coins: number) => void;
  pick: (i: number) => boolean;
  dailyAvailable: () => boolean;
  claimDaily: () => number;
  toggleMute: () => void;
  setPref: (p: Partial<Pick<Save, "musicVol" | "sfxVol" | "seenHowto">>) => void;
}

export const useGame = create<State>((set, get) => {
  const persist = () => {
    const { best, wallet, character, unlocked, lastDaily, streak, muted, musicVol, sfxVol, seenHowto } = get();
    localStorage.setItem(KEY, JSON.stringify({ best, wallet, character, unlocked, lastDaily, streak, muted, musicVol, sfxVol, seenHowto }));
  };
  return {
    ...load(), loaded: false, screen: "menu", score: 0, runCoins: 0, newBest: false,
    setScreen: (screen) => set({ screen }),
    finishRun: (score, coins) => {
      const newBest = score > get().best;
      set({ screen: "over", score, runCoins: coins, newBest, best: Math.max(score, get().best), wallet: get().wallet + coins });
      persist();
    },
    pick: (i) => {
      const s = get();
      if (!s.unlocked.includes(i)) {
        const price = CHARACTERS[i]?.price ?? 0;
        if (s.wallet < price) return false;
        set({ wallet: s.wallet - price, unlocked: [...s.unlocked, i] });
      }
      set({ character: i }); persist(); return true;
    },
    dailyAvailable: () => get().lastDaily !== today(),
    claimDaily: () => {
      const s = get();
      if (s.lastDaily === today()) return 0;
      const yest = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
      const streak = s.lastDaily === yest ? Math.min(7, s.streak + 1) : 1;
      const amount = 50 * streak;
      set({ streak, lastDaily: today(), wallet: s.wallet + amount }); persist(); return amount;
    },
    toggleMute: () => { set({ muted: !get().muted }); persist(); },
    setPref: (p) => { set(p); persist(); },
  };
});
