import { createFileRoute } from "@tanstack/react-router";
import Scene from "@/components/game/Scene";
import GameUI from "@/components/game/GameUI";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "NEON RUSH — 3D Endless Runner" },
      { name: "description", content: "Dash through a glowing neon city, dodge obstacles and collect coins in this free 3D endless runner." },
      { property: "og:title", content: "NEON RUSH — 3D Endless Runner" },
      { property: "og:description", content: "Dash through a glowing neon city, dodge obstacles and collect coins." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Game,
});

function Game() {
  return (
    <main className="game-root">
      <Scene />
      <GameUI />
    </main>
  );
}
