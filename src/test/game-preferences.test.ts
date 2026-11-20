import { beforeEach, describe, expect, it, vi } from "vitest";
import { CHARACTERS, useGame } from "@/game/store";
import { GRAPHICS } from "@/game/quality";

beforeEach(() => {
  localStorage.clear();
  useGame.setState({ wallet: 0, character: 0, unlocked: [0], graphics: "low", muted: false });
  window.__lovableEvents = { track: vi.fn(() => null) };
});

describe("runner unlock rules", () => {
  it("keeps coin runners priced at 0, 100, 250 and 500", () => {
    expect(CHARACTERS.filter(c => c.currency === "coins").map(c => c.price)).toEqual([0, 100, 250, 500]);
  });
  it("uses Indian rupee prices of 99, 199 and 299", () => {
    expect(CHARACTERS.filter(c => c.currency === "INR").map(c => c.price)).toEqual([99, 199, 299]);
  });
  it("deducts coins once when buying and never when re-equipping", () => {
    useGame.setState({ wallet: 250 });
    expect(useGame.getState().pick(2)).toBe(true);
    expect(useGame.getState().wallet).toBe(0);
    expect(useGame.getState().pick(2)).toBe(true);
    expect(useGame.getState().wallet).toBe(0);
  });
  it("rejects unaffordable coin unlocks", () => {
    expect(useGame.getState().pick(1)).toBe(false);
    expect(useGame.getState().unlocked).toEqual([0]);
  });
  it.each([4, 5, 6])("never unlocks paid runner %i using coins or an edited save", i => {
    useGame.setState({ wallet: 9999, unlocked: [0, i] });
    expect(useGame.getState().pick(i)).toBe(false);
    expect(useGame.getState().wallet).toBe(9999);
    expect(useGame.getState().character).toBe(0);
  });
});

describe("graphics and settings", () => {
  it("low quality uses one pixel ratio with no shadows or particles", () => {
    expect(GRAPHICS.low).toEqual({ dpr: 1, shadows: false, shadowSize: 512, particles: false });
  });
  it("high quality enables shadows and particles at 1.5 pixel ratio", () => {
    expect(GRAPHICS.high).toEqual({ dpr: 1.5, shadows: true, shadowSize: 1024, particles: true });
  });
  it("persists and tracks actual quality changes once", () => {
    useGame.getState().setPref({ graphics: "high" });
    useGame.getState().setPref({ graphics: "high" });
    expect(JSON.parse(localStorage.getItem("neon-rush-save") ?? "{}").graphics).toBe("high");
    expect(window.__lovableEvents?.track).toHaveBeenCalledTimes(1);
    expect(window.__lovableEvents?.track).toHaveBeenCalledWith("project.settings_value_changed", { setting: "graphics", value: "high" });
  });
  it("serializes sound changes without changing the saved boolean", () => {
    useGame.getState().toggleMute();
    expect(useGame.getState().muted).toBe(true);
    expect(window.__lovableEvents?.track).toHaveBeenCalledWith("project.settings_value_changed", { setting: "sound", value: "false" });
    useGame.getState().toggleMute();
    expect(window.__lovableEvents?.track).toHaveBeenCalledWith("project.settings_value_changed", { setting: "sound", value: "true" });
  });
  it.each(["musicVol", "sfxVol"] as const)("serializes %s without changing the saved number", setting => {
    useGame.setState({ [setting]: 0.8 });
    useGame.getState().setPref({ [setting]: 0.35 });
    expect(useGame.getState()[setting]).toBe(0.35);
    expect(window.__lovableEvents?.track).toHaveBeenCalledWith("project.settings_value_changed", { setting, value: "0.35" });
  });
});