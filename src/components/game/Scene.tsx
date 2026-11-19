import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { C, LANE_W, runtime, step } from "@/game/engine";
import { CHARACTERS, useGame } from "@/game/store";
import { sfx } from "@/game/audio";
import { GRAPHICS } from "@/game/quality";

const box = new THREE.BoxGeometry(1, 1, 1);

function makeTex(draw: (c: CanvasRenderingContext2D) => void, w = 128, h = 128) {
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
  draw(cv.getContext("2d")!);
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function Loop() {
  const last = useRef(0);
  useFrame((_, delta) => {
    const s = useGame.getState();
    if (s.screen !== "playing") return;
    const g = runtime.game;
    const ev = step(g, Math.min(delta, 0.05));
    if (ev.coins) sfx.coin();
    if (ev.crashed) { sfx.crash(); s.finishRun(g.score, g.coins); return; }
    last.current += delta;
    if (last.current > 0.1) { last.current = 0; useGame.setState({ score: g.score, runCoins: g.coins }); }
  });
  return null;
}

const visSpeed = () => (useGame.getState().screen === "playing" ? runtime.game.speed : useGame.getState().screen === "menu" || useGame.getState().screen === "select" ? 7 : 0);

function Road() {
  const tex = useMemo(() => {
    const t = makeTex((c) => {
      c.fillStyle = "#0a0716"; c.fillRect(0, 0, 128, 128);
      c.strokeStyle = "#3a1d6e"; c.lineWidth = 2; c.strokeRect(0, 0, 128, 128);
      c.fillStyle = "#22e6ff"; c.fillRect(41, 0, 3, 128); c.fillRect(84, 0, 3, 128);
    });
    t.repeat.set(1, 40); return t;
  }, []);
  useFrame((_, d) => { tex.offset.y += (visSpeed() * Math.min(d, 0.05)) / 5; });
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, -90]} receiveShadow>
        <planeGeometry args={[LANE_W * 3 + 0.6, 200]} />
        <meshStandardMaterial map={tex} emissiveMap={tex} emissive="#ffffff" emissiveIntensity={0.6} roughness={0.35} metalness={0.4} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (LANE_W * 1.5 + 0.4), 0.15, -90]} scale={[0.2, 0.3, 200]} geometry={box}>
          <meshBasicMaterial color={s < 0 ? "#ff3df2" : "#22e6ff"} toneMapped={false} />
        </mesh>
      ))}
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.05, -90]}>
        <planeGeometry args={[200, 220]} /><meshStandardMaterial color="#07040f" />
      </mesh>
    </group>
  );
}

const N_B = 36;
function City() {
  const refs = [useRef<THREE.InstancedMesh>(null), useRef<THREE.InstancedMesh>(null)];
  const tex = useMemo(() => makeTex((c) => {
    c.fillStyle = "#000"; c.fillRect(0, 0, 64, 128);
    for (let y = 6; y < 128; y += 10) for (let x = 6; x < 64; x += 12)
      if (Math.random() > 0.45) { c.fillStyle = Math.random() > 0.8 ? "#ffffff" : "#888"; c.fillRect(x, y, 6, 5); }
  }, 64, 128), []);
  const data = useMemo(() => [0, 1].map((k) => Array.from({ length: N_B / 2 }, (_, i) => ({
    side: i % 2 ? 1 : -1, x: 8 + Math.random() * 8, z: -i * 10 - k * 5, h: 8 + Math.random() * 26, w: 4 + Math.random() * 3,
  }))), []);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useFrame((_, d) => {
    const dz = visSpeed() * Math.min(d, 0.05) * 0.9;
    data.forEach((arr, k) => {
      const m = refs[k]!.current; if (!m) return;
      arr.forEach((b, i) => {
        b.z += dz; if (b.z > 15) b.z -= 180;
        dummy.position.set(b.side * b.x, b.h / 2, b.z); dummy.scale.set(b.w, b.h, b.w); dummy.updateMatrix();
        m.setMatrixAt(i, dummy.matrix);
      });
      m.instanceMatrix.needsUpdate = true;
    });
  });
  return (
    <>
      {["#22e6ff", "#ff3df2"].map((col, k) => (
        <instancedMesh key={k} ref={refs[k]!} args={[box, undefined, N_B / 2]} frustumCulled={false}>
          <meshStandardMaterial color="#120a24" map={tex} emissiveMap={tex} emissive={col} emissiveIntensity={1.6} roughness={0.6} />
        </instancedMesh>
      ))}
    </>
  );
}

function Player() {
  const root = useRef<THREE.Group>(null), body = useRef<THREE.Group>(null);
  const lL = useRef<THREE.Mesh>(null), lR = useRef<THREE.Mesh>(null), aL = useRef<THREE.Mesh>(null), aR = useRef<THREE.Mesh>(null);
  const ch = CHARACTERS[useGame((s) => s.character)] ?? CHARACTERS[0]!;
  useFrame((st, d) => {
    const g = runtime.game, screen = useGame.getState().screen, t = st.clock.elapsedTime;
    if (!root.current || !body.current) return;
    const idle = screen === "menu" || screen === "select";
    root.current.position.set(idle ? 0 : g.x, g.y, 0);
    root.current.rotation.y = idle ? Math.PI + Math.sin(t * 0.6) * 0.6 : (g.lane * LANE_W - g.x) * -0.15;
    const sl = g.slideT > 0 && !idle ? 1.25 : 0;
    body.current.rotation.x += (sl - body.current.rotation.x) * Math.min(1, d * 18);
    const ph = screen === "playing" ? t * (8 + g.speed * 0.3) : idle ? t * 2 : 0;
    const air = g.y > 0.05 ? 0.3 : 1;
    const sw = Math.sin(ph) * 0.9 * air * (idle ? 0.15 : 1);
    if (lL.current && lR.current && aL.current && aR.current) {
      lL.current.rotation.x = sw; lR.current.rotation.x = -sw; aL.current.rotation.x = -sw; aR.current.rotation.x = sw;
    }
  });
  const mat = <meshStandardMaterial color={ch.body} metalness={0.5} roughness={0.35} />;
  const glow = <meshStandardMaterial color={ch.accent} emissive={ch.accent} emissiveIntensity={2.2} toneMapped={false} />;
  return (
    <group ref={root}>
      <group ref={body}>
        <mesh position={[0, 1.15, 0]} castShadow><capsuleGeometry args={[0.32, 0.5, 4, 10]} />{mat}</mesh>
        <mesh position={[0, 1.2, -0.3]}><boxGeometry args={[0.3, 0.12, 0.05]} />{glow}</mesh>
        <mesh position={[0, 1.2, 0.29]}><boxGeometry args={[0.36, 0.4, 0.1]} />{mat}</mesh>
        <mesh position={[0, 1.78, 0]} castShadow><sphereGeometry args={[0.26, 16, 12]} />{mat}</mesh>
        <mesh position={[0, 1.8, -0.18]}><boxGeometry args={[0.36, 0.1, 0.14]} />{glow}</mesh>
        <mesh position={[0, 2.06, 0]}><coneGeometry args={[0.06, 0.25, 6]} />{glow}</mesh>
        {[[-0.44, aL], [0.44, aR]].map(([x, r], i) => (
          <mesh key={i} ref={r as React.RefObject<THREE.Mesh>} position={[x as number, 1.4, 0]} castShadow>
            <capsuleGeometry args={[0.09, 0.5, 3, 6]} />{i ? glow : mat}
          </mesh>
        ))}
        {[[-0.16, lL], [0.16, lR]].map(([x, r], i) => (
          <mesh key={i} ref={r as React.RefObject<THREE.Mesh>} position={[x as number, 0.45, 0]} castShadow>
            <capsuleGeometry args={[0.11, 0.55, 3, 6]} />{mat}
          </mesh>
        ))}
        <mesh position={[0, 0.03, 0]} rotation-x={-Math.PI / 2}><ringGeometry args={[0.35, 0.5, 24]} />{glow}</mesh>
      </group>
    </group>
  );
}

function Obstacles() {
  const refs = useRef<(THREE.Group | null)[]>([]);
  useFrame(() => {
    runtime.game.obs.forEach((o, i) => {
      const r = refs.current[i]; if (!r) return;
      const on = o.active && useGame.getState().screen !== "menu" && useGame.getState().screen !== "select";
      r.visible = on; if (!on) return;
      r.position.set(o.lane * LANE_W, 0, o.z);
      r.children[0]!.visible = o.type === "low"; r.children[1]!.visible = o.type === "high"; r.children[2]!.visible = o.type === "block";
    });
  });
  const neonY = <meshStandardMaterial color="#ffd23d" emissive="#ffb020" emissiveIntensity={2} toneMapped={false} />;
  const post = <meshStandardMaterial color="#222" metalness={0.8} roughness={0.3} />;
  return (
    <>
      {Array.from({ length: C.OB_POOL }, (_, i) => (
        <group key={i} ref={(el) => { refs.current[i] = el; }} visible={false}>
          <group>
            <mesh geometry={box} position={[0, 0.55, 0]} scale={[1.9, 0.25, 0.25]} castShadow>{neonY}</mesh>
            {[-0.85, 0.85].map((x) => <mesh key={x} geometry={box} position={[x, 0.3, 0]} scale={[0.15, 0.6, 0.15]}>{post}</mesh>)}
            <mesh geometry={box} position={[0, 0.25, 0]} scale={[1.7, 0.08, 0.08]}>{neonY}</mesh>
          </group>
          <group>
            <mesh geometry={box} position={[0, 1.75, 0]} scale={[2, 0.9, 0.3]} castShadow>
              <meshStandardMaterial color="#3d0d33" emissive="#ff3df2" emissiveIntensity={1.4} toneMapped={false} />
            </mesh>
            {[-0.95, 0.95].map((x) => <mesh key={x} geometry={box} position={[x, 1.1, 0]} scale={[0.12, 2.2, 0.12]}>{post}</mesh>)}
          </group>
          <group>
            <mesh geometry={box} position={[0, 1.4, 0]} scale={[1.9, 2.8, 1.9]} castShadow>
              <meshStandardMaterial color="#101a2c" metalness={0.6} roughness={0.35} />
            </mesh>
            <mesh geometry={box} position={[0, 1.4, 0.96]} scale={[1.6, 0.12, 0.02]}>
              <meshBasicMaterial color="#ff3a5c" toneMapped={false} />
            </mesh>
            <mesh geometry={box} position={[0, 2.82, 0]} scale={[1.92, 0.06, 1.92]}>
              <meshBasicMaterial color="#22e6ff" toneMapped={false} />
            </mesh>
          </group>
        </group>
      ))}
    </>
  );
}

function Coins() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useFrame((st) => {
    const m = ref.current; if (!m) return;
    const t = st.clock.elapsedTime, hide = ["menu", "select"].includes(useGame.getState().screen);
    runtime.game.coinPool.forEach((c, i) => {
      dummy.position.set(c.lane * LANE_W, c.y + Math.sin(t * 4 + i) * 0.1, c.z);
      dummy.rotation.set(Math.PI / 2, 0, t * 4 + i);
      dummy.scale.setScalar(c.active && !hide ? 1 : 0); dummy.updateMatrix(); m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, C.COIN_POOL]} frustumCulled={false}>
      <cylinderGeometry args={[0.35, 0.35, 0.08, 16]} />
      <meshStandardMaterial color="#ffd23d" emissive="#ffaa00" emissiveIntensity={1.5} metalness={0.9} roughness={0.2} toneMapped={false} />
    </instancedMesh>
  );
}

const NP = 120;
function Particles() {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(NP * 3).fill(-999), 3));
    g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(NP * 3), 3));
    return g;
  }, []);
  const st = useMemo(() => ({ v: new Float32Array(NP * 3), life: new Float32Array(NP), next: 0 }), []);
  const palette = useMemo(() => ["#ffd23d", "#22e6ff", "#ff3df2", "#4dff7a"].map((c) => new THREE.Color(c)), []);
  useFrame((_, d) => {
    const dt = Math.min(d, 0.05), g = runtime.game;
    const pos = geo.getAttribute("position").array as Float32Array, col = geo.getAttribute("color").array as Float32Array;
    while (g.bursts.length) {
      const [x, y, z] = g.bursts.pop()!;
      for (let k = 0; k < 12; k++) {
        const i = st.next = (st.next + 1) % NP, c = palette[k % 4]!;
        pos.set([x, y, z], i * 3); col.set([c.r, c.g, c.b], i * 3);
        st.v.set([(Math.random() - 0.5) * 6, Math.random() * 6 + 1, (Math.random() - 0.5) * 6], i * 3);
        st.life[i] = 0.6;
      }
    }
    const v = st.v, life = st.life;
    const sp = useGame.getState().screen === "playing" ? g.speed : 0;
    for (let i = 0; i < NP; i++) {
      if (life[i]! <= 0) continue;
      life[i] = life[i]! - dt; v[i * 3 + 1] = v[i * 3 + 1]! - 12 * dt;
      pos[i * 3] = pos[i * 3]! + v[i * 3]! * dt; pos[i * 3 + 1] = pos[i * 3 + 1]! + v[i * 3 + 1]! * dt; pos[i * 3 + 2] = pos[i * 3 + 2]! + (v[i * 3 + 2]! + sp) * dt;
      if (life[i]! <= 0) pos[i * 3 + 1] = -999;
    }
    geo.getAttribute("position").needsUpdate = true; geo.getAttribute("color").needsUpdate = true;
  });
  return (
    <points geometry={geo} frustumCulled={false}>
      <pointsMaterial size={0.14} vertexColors toneMapped={false} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
}

function CameraRig() {
  const { camera } = useThree();
  const tgt = useMemo(() => new THREE.Vector3(), []);
  useFrame((_, d) => {
    const g = runtime.game, idle = ["menu", "select"].includes(useGame.getState().screen);
    if (idle) tgt.set(0, 2.3, 8); else tgt.set(g.x * 0.6, 3.6 + g.y * 0.35, 6.8);
    camera.position.lerp(tgt, 1 - Math.exp(-6 * Math.min(d, 0.05)));
    camera.lookAt(idle ? 0 : g.x * 0.5, idle ? 2.1 : 1.2, idle ? 0 : -10);
  });
  return null;
}

function Ready({ onReady }: { onReady: () => void }) {
  const done = useRef(false);
  useFrame(() => { if (!done.current) { done.current = true; onReady(); } });
  return null;
}

export default function Scene() {
  const wrap = useRef<HTMLDivElement>(null);
  const quality = GRAPHICS[useGame(s => s.graphics)];
  useEffect(() => () => { runtime.game.bursts.length = 0; }, []);
  return (
    <div ref={wrap} className="absolute inset-0">
      <Canvas shadows={quality.shadows} dpr={quality.dpr} camera={{ fov: 62, position: [0, 3.6, 6.8], near: 0.1, far: 220 }}
        gl={{ antialias: true, powerPreference: "high-performance" }}>
        <color attach="background" args={["#0b0618"]} />
        <fog attach="fog" args={["#1a0b33", 30, 150]} />
        <hemisphereLight args={["#6a5cff", "#1a0b22", 0.9]} />
        <directionalLight position={[4, 10, 6]} intensity={1.6} color="#ffd9f5" castShadow={quality.shadows}
          shadow-mapSize={[quality.shadowSize, quality.shadowSize]} shadow-camera-left={-6} shadow-camera-right={6} shadow-camera-top={10} shadow-camera-bottom={-10} />
        <mesh position={[0, 24, -170]}><circleGeometry args={[30, 48]} /><meshBasicMaterial color="#ff4fa3" fog={false} /></mesh>
        <Loop /><CameraRig /><Road /><City /><Player /><Obstacles /><Coins />
        {quality.particles && <Particles />}
        <Ready onReady={() => { wrap.current?.setAttribute("data-scene-ready", "true"); useGame.setState({ loaded: true }); }} />
      </Canvas>
    </div>
  );
}
