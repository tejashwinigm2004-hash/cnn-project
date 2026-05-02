import { useEffect, useRef, useState } from "react";

// ── WORD REVEAL ─────────────────────────────────────────
export function WordReveal({ text, className = "", style = {} }) {
  const words = text.split(" ");
  const [visible, setVisible] = useState([]);
  useEffect(() => {
    words.forEach((_, i) => setTimeout(() => setVisible(v => [...v, i]), 120 * i));
  }, []);
  return (
    <span style={style} className={className}>
      {words.map((w, i) => (
        <span key={i} style={{
          display: "inline-block", marginRight: 8,
          opacity: visible.includes(i) ? 1 : 0,
          transform: visible.includes(i) ? "translateY(0)" : "translateY(20px)",
          transition: "all 0.5s cubic-bezier(.22,1,.36,1)",
        }}>{w}</span>
      ))}
    </span>
  );
}

// ── MARQUEE BAND ────────────────────────────────────────
export function MarqueeBand() {
  const items = ["🌿 100% Organic","🐄 A2 Gir Cows","🥛 Zero Preservatives","🚚 6AM Delivery","⭐ 500+ Families","🏆 Est. 2009","🌾 45 Acres Farm","💚 Vedic Farming"];
  const doubled = [...items, ...items];
  return (
    <div style={{ overflow: "hidden", background: "linear-gradient(90deg,rgba(249,199,79,0.08),rgba(57,211,83,0.08))", borderTop: "1px solid rgba(249,199,79,0.2)", borderBottom: "1px solid rgba(249,199,79,0.2)", padding: "10px 0" }}>
      <div style={{ display: "flex", gap: 48, animation: "marqueeScroll 22s linear infinite", whiteSpace: "nowrap", width: "max-content" }}>
        {doubled.map((item, i) => (
          <span key={i} style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.7)", letterSpacing: 1 }}>{item}</span>
        ))}
      </div>
    </div>
  );
}

// ── SCROLL REVEAL ────────────────────────────────────────
export function ScrollReveal({ children, delay = 0 }) {
  const ref = useRef();
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold: 0.15 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(32px)", transition: `all 0.6s cubic-bezier(.22,1,.36,1) ${delay}ms` }}>
      {children}
    </div>
  );
}

// ── STAT COUNTER ─────────────────────────────────────────
export function StatCounter({ value, label, color = "#f9c74f" }) {
  const [count, setCount] = useState(0);
  const ref = useRef();
  const num = parseInt(value);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        let start = 0;
        const step = Math.ceil(num / 40);
        const t = setInterval(() => { start += step; if (start >= num) { setCount(num); clearInterval(t); } else setCount(start); }, 40);
        obs.disconnect();
      }
    }, { threshold: 0.5 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [num]);
  return (
    <div ref={ref} style={{ textAlign: "center" }}>
      <div style={{ fontFamily: "'Playfair Display',serif", fontWeight: 900, fontSize: 36, background: `linear-gradient(135deg,${color},${color}88)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
        {count}{value.replace(/[0-9]/g, "")}
      </div>
      <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, marginTop: 4 }}>{label}</div>
    </div>
  );
}

// ── FLOATING PARTICLES ───────────────────────────────────
export function FloatingParticles() {
  const particles = Array(16).fill(0).map((_, i) => ({
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 12}s`,
    dur: `${10 + Math.random() * 10}s`,
    size: `${3 + Math.random() * 4}px`,
    color: ["#f9c74f", "#39d353", "#00b4d8", "#ff6b35", "#a78bfa"][i % 5],
  }));
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
      {particles.map((p, i) => (
        <div key={i} style={{ position: "absolute", bottom: "-10px", left: p.left, width: p.size, height: p.size, borderRadius: "50%", background: p.color, animation: `particle ${p.dur} ${p.delay} ease-in-out infinite`, opacity: 0.5 }} />
      ))}
    </div>
  );
}

// ── CUSTOM CURSOR ────────────────────────────────────────
export function CustomCursor({ color = "#4ade80" }) {
  const dot = useRef();
  const ring = useRef();
  useEffect(() => {
    let rx = 0, ry = 0;
    const move = (e) => {
      const x = e.clientX, y = e.clientY;
      if (dot.current) dot.current.style.transform = `translate(${x - 4}px,${y - 4}px)`;
      rx += (x - rx - 18) * 0.12;
      ry += (y - ry - 18) * 0.12;
      if (ring.current) ring.current.style.transform = `translate(${rx}px,${ry}px)`;
    };
    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, []);
  return (
    <>
      <div ref={dot} style={{ position: "fixed", width: 8, height: 8, borderRadius: "50%", background: color, pointerEvents: "none", zIndex: 9999, mixBlendMode: "difference" }} />
      <div ref={ring} style={{ position: "fixed", width: 36, height: 36, borderRadius: "50%", border: `2px solid ${color}`, pointerEvents: "none", zIndex: 9998, opacity: 0.6, transition: "transform .08s linear" }} />
    </>
  );
}

// ── GRAIN OVERLAY ────────────────────────────────────────
export function GrainOverlay({ opacity = 0.04 }) {
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 9997, opacity, backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`, backgroundRepeat: "repeat", backgroundSize: "180px" }} />
  );
}