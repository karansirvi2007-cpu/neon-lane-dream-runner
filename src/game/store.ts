import { create } from "zustand";
import type { GraphicsQuality } from "./quality";
import volt from "@/assets/runner-volt.webp";
import nova from "@/assets/runner-nova.webp";
import blaze from "@/assets/runner-blaze.webp";
import venom from "@/assets/runner-venom.webp";
import frost from "@/assets/runner-frost.webp";
import shadow from "@/assets/runner-shadow.webp";
import aurum from "@/assets/runner-aurum.webp";

export type Screen = "menu" | "select" | "howto" | "settings" | "playing" | "paused" | "over";
export const CHARACTERS = [
  { name: "VOLT", body: "#7c93ad", accent: "#22e6ff", price: 0, currency: "coins", image: volt },
  { name: "NOVA", body: "#a07fb8", accent: "#ff3df2", price: 100, currency: "coins", image: nova },
  { name: "BLAZE", body: "#b58a6a", accent: "#ffb020", price: 250, currency: "coins", image: blaze },
  { name: "VENOM", body: "#6f9c80", accent: "#4dff7a", price: 500, currency: "coins", image: venom },
  { name: "FROST", body: "#d1e1ed", accent: "#8deaff", price: 99, currency: "INR", image: frost },
  { name: "SHADOW", body: "#434758", accent: "#ff3a5c", price: 199, currency: "INR", image: shadow },
  { name: "AURUM", body: "#d8c9a0", accent: "#ffd23d", price: 299, currency: "INR", image: aurum },
];
const KEY = "neon-rush-save";
interface Save { best: number; wallet: number; character: number; unlocked: number[]; lastDaily: string; streak: number; muted: boolean; musicVol: number; sfxVol: number; seenHowto: boolean; graphics: GraphicsQuality }
const today = () => new Date().toISOString().slice(0, 10);
function load(): Save {
  const d: Save = { best: 0, wallet: 0, character: 0, unlocked: [0], lastDaily: "", streak: 0, muted: false, musicVol: 0.7, sfxVol: 0.8, seenHowto: false, graphics: "low" };
  if (typeof window === "undefined") return d;
  try {
    const saved = { ...d, ...JSON.parse(localStorage.getItem(KEY) || "{}") } as Save;
    saved.unlocked = Array.isArray(saved.unlocked) ? saved.unlocked.filter(i => CHARACTERS[i]?.currency === "coins") : [0];
    if (!saved.unlocked.includes(0)) saved.unlocked.push(0);
    if (!saved.unlocked.includes(saved.character)) saved.character = 0;
    saved.graphics = saved.graphics === "high" ? "high" : "low";
    return saved;
  } catch { return d; }
}

interface State extends Save {
  loaded: boolean; screen: Screen; score: number; runCoins: number; newBest: boolean;
  setScreen: (s: Screen) => void;
  finishRun: (score: number, coins: number) => void;
  pick: (i: number) => boolean;
  dailyAvailable: () => boolean;
  claimDaily: () => number;
  toggleMute: () => void;
  setPref: (p: Partial<Pick<Save, "musicVol" | "sfxVol" | "seenHowto" | "graphics">>) => void;
}

export const useGame = create<State>((set, get) => {
  const persist = () => {
    const { best, wallet, character, unlocked, lastDaily, streak, muted, musicVol, sfxVol, seenHowto, graphics } = get();
    localStorage.setItem(KEY, JSON.stringify({ best, wallet, character, unlocked, lastDaily, streak, muted, musicVol, sfxVol, seenHowto, graphics }));
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
      const runner = CHARACTERS[i];
      // Real-money unlocks require verified payment entitlements, never device saves.
      if (!runner || runner.currency !== "coins") return false;
      if (!s.unlocked.includes(i)) {
        const price = runner.price;
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
    toggleMute: () => {
      const muted = !get().muted;
      set({ muted }); persist();
      window.__lovableEvents?.track?.("project.settings_value_changed", { setting: "sound", value: String(!muted) });
    },
    setPref: (p) => {
      const previous = get();
      set(p); persist();
      for (const setting of ["musicVol", "sfxVol", "graphics"] as const) {
        const value = p[setting];
        if (value !== undefined && value !== previous[setting]) {
          window.__lovableEvents?.track?.("project.settings_value_changed", { setting, value: String(value) });
        }
      }
    },
  };
});
