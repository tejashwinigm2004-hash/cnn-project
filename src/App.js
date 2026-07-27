import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { auth } from "./firebaseConfig";
import AdminPage from './AdminPage';
import axios from 'axios';
import API_URL from './config';
import logo from './logo.png';
import { useState, useEffect, useRef, useCallback } from "react";
import { CustomCursor, GrainOverlay, WordReveal, MarqueeBand, ScrollReveal, StatCounter, FloatingParticles } from './fx-components';
import { useAuth } from "./context/AuthContext";

/* ─────────────────────────────────────────────
   SOUND ENGINE  (Web Audio API — no files needed)
───────────────────────────────────────────── */
export function spawnParticles(x, y) {
  const colors = ["#ff6b35","#f7931e","#f7c35a","#000","#ff9a6c"];
  for (let i = 0; i < 12; i++) {
    const el = document.createElement("div");
    el.className = "particle";
    const angle = (i / 12) * Math.PI * 2;
    const dist = 40 + Math.random() * 60;
    el.style.cssText = `left:${x}px;top:${y}px;background:${colors[i%colors.length]};--dx:${Math.cos(angle)*dist}px;--dy:${Math.sin(angle)*dist}px`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 800);
  }
}

export function addRipple(btn, e) {
  const r = btn.getBoundingClientRect();
  const rEl = document.createElement("div");
  rEl.className = "ripple-el";
  rEl.style.left = (e.clientX - r.left) + "px";
  rEl.style.top  = (e.clientY - r.top)  + "px";
  btn.appendChild(rEl);
  setTimeout(() => rEl.remove(), 600);
}
function createSound(type) {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const g = ctx.createGain();
  g.connect(ctx.destination);
  if (type === "click") {
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(800, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.08);
    g.gain.setValueAtTime(0.18, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
    o.connect(g);
    o.start();
    o.stop(ctx.currentTime + 0.18);
  } else if (type === "nav") {
    const o = ctx.createOscillator();
    o.type = "triangle";
    o.frequency.setValueAtTime(520, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(680, ctx.currentTime + 0.06);
    g.gain.setValueAtTime(0.12, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);
    o.connect(g);
    o.start();
    o.stop(ctx.currentTime + 0.14);
  } else if (type === "add") {
    [440, 554, 659].forEach((f, i) => {
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.value = f;
      const gi = ctx.createGain();
      gi.gain.setValueAtTime(0, ctx.currentTime + i * 0.06);
      gi.gain.linearRampToValueAtTime(0.12, ctx.currentTime + i * 0.06 + 0.03);
      gi.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.06 + 0.18);
      o.connect(gi);
      gi.connect(ctx.destination);
      o.start(ctx.currentTime + i * 0.06);
      o.stop(ctx.currentTime + i * 0.06 + 0.2);
    });
  } else if (type === "success") {
    [523, 659, 784, 1047].forEach((f, i) => {
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.value = f;
      const gi = ctx.createGain();
      gi.gain.setValueAtTime(0, ctx.currentTime + i * 0.07);
      gi.gain.linearRampToValueAtTime(0.15, ctx.currentTime + i * 0.07 + 0.04);
      gi.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.07 + 0.22);
      o.connect(gi); gi.connect(ctx.destination);
      o.start(ctx.currentTime + i * 0.07);
      o.stop(ctx.currentTime + i * 0.07 + 0.25);
    });
  }
}
/* ─────────────────────────────────────────────
   DATA
───────────────────────────────────────────── */
/* PRODUCTS moved inside App() - fetched from backend, see below */
const PLANS = [
  { id: "basic", name: "Starter", price: 1400, period: "month", color: "#00b4d8", items: ["500ml A2 Milk Daily", "250g Curd Weekly", "Free Delivery", "WhatsApp Updates"], popular: false },
  { id: "premium", name: "Premium", price: 3200, period: "month", color: "#39d353", items: ["1L A2 Milk Daily", "500g Ghee Monthly", "400g Paneer Weekly", "400g Dahi Weekly", "Free Priority Delivery", "Dedicated Manager"], popular: true },
  { id: "family", name: "Family", price: 5600, period: "month", color: "#f9c74f", items: ["2L A2 Milk Daily", "1Kg Ghee Monthly", "500g Paneer Twice/Week", "Seasonal Products", "Doorstep Delivery 5AM", "WhatsApp Bot Ordering", "Monthly Farm Visit"], popular: false },
];
const FAMILIES = [
  { name: "Raghavendra Family", location: "Indiranagar, Bangalore", since: "2021", img: "https://images.unsplash.com/photo-1511895426328-dc8714191011?w=300&q=80", quote: "Our kids love the A2 milk! We can taste the difference from store-bought dairy. Worth every rupee." },
  { name: "Priya & Suresh Kumar", location: "HSR Layout, Bangalore", since: "2022", img: "https://images.unsplash.com/photo-1484665987578-db5ac5dce2fb?w=300&q=80", quote: "The ghee is absolutely divine. We use it for everything — pooja, cooking, even skin care!" },
  { name: "Meenakshi Iyer", location: "Koramangala, Bangalore", since: "2023", img: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=300&q=80", quote: "Fresh paneer every week without stepping out. The subscription model changed our kitchen routine." },
  { name: "Arjun & Deepa Nair", location: "Whitefield, Bangalore", since: "2020", img: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&q=80", quote: "Been with CNN Farm Hub for 4 years! They feel like family. Best decision we ever made." },
];
const TIMELINE = [
  { year: "2021", title: "Farm Founded", text: "Started with 5 Gir cows on 2 acres of organic land in Karnataka.", color: "#39d353" },
  { year: "2022", title: "Organic Certified", text: "Received government organic certification after 4 years of natural farming.", color: "#00b4d8" },
  { year: "2023", title: "Local Delivery", text: "Launched home delivery serving 50 families in our region.", color: "#f9c74f" },
  { year: "2024", title: "Digital Platform", text: "Launched online ordering platform to reach wider customers.", color: "#ff6b35" },
  { year: "2026", title: "CNN Farm Hub", text: "Full-stack platform with subscriptions, app, and 500+ families served.", color: "#a78bfa" },
];

/* ─────────────────────────────────────────────
   GLOBAL STYLES (injected once)
───────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,400&family=Syne:wght@400;600;700;800&display=swap');
:root {
  --bg: #050505; --bg2: #0b0b0b; --bg3: #111;
  --gold1: #f9c74f; --gold2: #f3722c;
  --teal1: #00b4d8; --teal2: #0077b6;
  --rose1: #ff9a9e; --rose2: #e84393;
  --green1: #39d353; --green2: #00b894;
  --purple1: #7c3aed; --purple2: #a78bfa;
  --orange1: #ff6b35; --orange2: #f7931e;
  --glass: rgba(255,255,255,0.04);
  --glass-b: rgba(255,255,255,0.09);
}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{font-family:'Syne',sans-serif;background:var(--bg);color:#000;overflow-x:hidden}
::-webkit-scrollbar{width:4px}
::-webkit-scrollbar-track{background:var(--bg)}
::-webkit-scrollbar-thumb{background:linear-gradient(var(--gold1),var(--gold2));border-radius:3px}

@keyframes floatY{0%,100%{transform:translateY(0)}50%{transform:translateY(-16px)}}
@keyframes morphBlob{0%,100%{border-radius:60% 40% 30% 70%/60% 30% 70% 40%}50%{border-radius:30% 60% 70% 40%/50% 60% 30% 60%}}
@keyframes gradPan{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
@keyframes rippleAnim{0%{transform:translate(-50%,-50%) scale(0);opacity:.7}100%{transform:translate(-50%,-50%) scale(8);opacity:0}}
@keyframes btnBounce{0%{transform:scale(1)}25%{transform:scale(0.88) rotate(-1deg)}60%{transform:scale(1.1) rotate(.5deg)}100%{transform:scale(1)}}
@keyframes pageSlide{from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(249,199,79,0.4)}50%{box-shadow:0 0 0 18px rgba(249,199,79,0)}}
@keyframes shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes slideDown{from{opacity:0;transform:translateY(-14px)}to{opacity:1;transform:translateY(0)}}
@keyframes bgFlash{0%{background:rgba(255,255,255,0.12)}100%{background:transparent}}
@keyframes bgFlash{0%{background:rgba(255,255,255,0.12)}100%{background:transparent}}
@keyframes marquee{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
/* ── ADD AFTER @keyframes bgFlash ── */
@keyframes floatCard{0%,100%{transform:translateY(0px)}50%{transform:translateY(-10px)}}
@keyframes imgBreath{0%,100%{transform:scale(1)}50%{transform:scale(1.04)}}
@keyframes badgePulse{0%,100%{box-shadow:0 0 0 0 rgba(255,107,53,0.6)}60%{box-shadow:0 0 0 8px rgba(255,107,53,0)}}
@keyframes pricePop{0%{transform:scale(1)}40%{transform:scale(1.25) rotate(-3deg)}70%{transform:scale(0.95)}100%{transform:scale(1)}}
@keyframes particleBurst{0%{opacity:1;transform:translate(0,0) scale(1)}100%{opacity:0;transform:translate(var(--dx),var(--dy)) scale(0)}}
@keyframes addSuccess{0%{transform:scale(1)}30%{transform:scale(1.2)}60%{transform:scale(0.9)}100%{transform:scale(1)}}
@keyframes rippleAnim2{0%{transform:scale(0);opacity:0.6}100%{transform:scale(4);opacity:0}}
@keyframes glowPulse{0%,100%{box-shadow:0 0 0 0 rgba(255,107,53,0)}50%{box-shadow:0 0 32px 4px rgba(255,107,53,0.18)}}
@keyframes stockDot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.4;transform:scale(0.6)}}
@keyframes cardIn{0%{opacity:0;transform:translateY(60px) scale(0.9) rotateX(10deg)}100%{opacity:1;transform:translateY(0) scale(1) rotateX(0deg)}}
.float{animation:floatY 6s ease-in-out infinite}
.blob{animation:morphBlob 10s ease-in-out infinite}
.page-enter{animation:pageSlide .5s cubic-bezier(.22,1,.36,1) forwards}
.glass{background:var(--glass);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border:1px solid var(--glass-b)}
.glass-product{
  background:rgba(255,107,53,0.06);
  backdrop-filter:blur(16px);
  border:1px solid rgba(255,107,53,0.22);
  animation:floatCard 4s ease-in-out infinite, glowPulse 4s ease-in-out infinite;
  transition:box-shadow .4s ease;
}
.glass-product:hover{
  box-shadow:0 32px 70px rgba(255,107,53,0.25)!important;
}
.glass-product:not(:hover) .product-img{
  animation:imgBreath 5s ease-in-out infinite;
}
.glass-product:hover .product-img{
  animation:none;
  transform:scale(1.07);
  transition:transform .5s ease;
}
.glass-product:hover .shimmer-layer{
  animation:shimmer .8s ease forwards;
}
.glass-product:hover .desc-overlay{
  transform:translateY(0)!important;
}.glass-farm{background:rgba(0,180,216,0.06);backdrop-filter:blur(16px);border:1px solid rgba(0,180,216,0.22)}
.glass-sub{background:rgba(57,211,83,0.06);backdrop-filter:blur(16px);border:1px solid rgba(57,211,83,0.22)}
.glass-family{background:rgba(255,154,158,0.06);backdrop-filter:blur(16px);border:1px solid rgba(255,154,158,0.22)}
.tg-gold{background:linear-gradient(135deg,#f9c74f,#f3722c);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.tg-farm{background:linear-gradient(135deg,#00b4d8,#0077b6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.tg-sub{background:linear-gradient(135deg,#39d353,#00b894);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.tg-family{background:linear-gradient(135deg,#ff9a9e,#e84393);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
input,textarea{background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.12);color:#000;font-family:'Syne',sans-serif;font-size:14px;outline:none;border-radius:10px;padding:12px 14px;width:100%;transition:all .3s}
input::placeholder,textarea::placeholder{color:rgba(255,255,255,0.3)}
input:focus,textarea:focus{border-color:rgba(57,211,83,0.6);background:rgba(57,211,83,0.05);box-shadow:0 0 0 3px rgba(57,211,83,0.12)}
.card-wrap{opacity:0;animation:cardIn .65s cubic-bezier(.25,.46,.45,.94) forwards}
.price-val.pop{animation:pricePop .4s ease}
.add-btn.success{animation:addSuccess .4s ease}
.stock-dot{width:7px;height:7px;border-radius:50%;display:inline-block;animation:stockDot 1.5s ease-in-out infinite}
.particle{position:fixed;width:8px;height:8px;border-radius:50%;pointer-events:none;animation:particleBurst .7s ease-out forwards;z-index:9999}
.ripple-el{position:absolute;border-radius:50%;background:rgba(255,255,255,0.35);width:20px;height:20px;margin-left:-10px;margin-top:-10px;animation:rippleAnim2 .5s ease-out forwards;pointer-events:none}

/* ── MOBILE RESPONSIVE ── */
.farm-story-grid{grid-template-columns:1fr 1fr}
.farm-team-grid{grid-template-columns:repeat(3,1fr)}
.sub-plans-grid{grid-template-columns:repeat(3,1fr)}
.contact-grid{grid-template-columns:1fr 1fr}
.contact-form-fields{grid-template-columns:1fr 1fr}
.cart-grid{grid-template-columns:1.5fr 1fr}
.login-grid{grid-template-columns:1fr 1fr}
.footer-grid{grid-template-columns:2fr 1fr 1fr 1fr}
@media(max-width:768px){
  .hero-grid{grid-template-columns:1fr!important;padding-top:90px!important;padding-bottom:40px!important;gap:32px!important}
  .hero-image{display:none!important}
  .hero-stats{grid-template-columns:repeat(2,1fr)!important;gap:14px!important}
  .hero-btns{flex-direction:column!important;gap:10px!important}
  .products-grid{grid-template-columns:1fr!important}
  .sub-plans-grid{grid-template-columns:1fr!important;gap:16px!important}
  .families-grid{grid-template-columns:1fr!important}
  .farm-story-grid{grid-template-columns:1fr!important;gap:28px!important}
  .farm-story-img{display:none!important}
  .farm-stats-grid{grid-template-columns:repeat(2,1fr)!important}
  .farm-team-grid{grid-template-columns:1fr!important;gap:16px!important}
  .contact-grid{grid-template-columns:1fr!important;gap:28px!important}
  .contact-form-fields{grid-template-columns:1fr!important}
  .cart-grid{grid-template-columns:1fr!important}
  .cart-summary{position:static!important}
  .login-grid{grid-template-columns:1fr!important}
  .login-left{display:none!important}
  .footer-grid{grid-template-columns:1fr 1fr!important;gap:24px!important}
  .footer-brand{grid-column:1/-1!important}
  .families-join-cta{padding:32px 20px!important}
  .families-hero-pad{padding:24px 16px!important}
  .section-pad{padding:50px 16px 60px!important}
  .farm-visit-h2{font-size:26px!important}
  .sub-page-pad{padding:40px 16px!important}
  .sub-hero-pad{padding:24px 16px!important}
  .contact-hero-pad{padding:24px 16px!important}
}
@media(max-width:480px){
  .footer-grid{grid-template-columns:1fr!important}
}
`;
/* ─────────────────────────────────────────────
   ANIMATED BUTTON
───────────────────────────────────────────── */
function Btn({ children, onClick, style = {}, className = "", variant = "gold", disabled = false }) {
  const [anim, setAnim] = useState(false);
  const [ripple, setRipple] = useState(null);
  const ref = useRef();
  const variants = {
    gold: { background: "linear-gradient(135deg,#f9c74f,#f3722c)", color: "#0a0000", boxShadow: "0 6px 28px rgba(249,199,79,0.3)" },
    farm: { background: "linear-gradient(135deg,#00b4d8,#0077b6)", color: "#000", boxShadow: "0 6px 24px rgba(0,180,216,0.28)" },
    sub: { background: "linear-gradient(135deg,#39d353,#00b894)", color: "#020f05", boxShadow: "0 6px 24px rgba(57,211,83,0.28)" },
    family: { background: "linear-gradient(135deg,#ff9a9e,#e84393)", color: "#000", boxShadow: "0 6px 24px rgba(255,154,158,0.28)" },
    ghost: { background: "rgba(77, 12, 168, 0.04)", border: "1px solid rgba(255,255,255,0.15)", color: "#000" },
    outline: { background: "transparent", border: "2px solid rgba(57,211,83,0.55)", color: "#39d353" },
    orange: { background: "linear-gradient(135deg,#ff6b35,#f7931e)", color: "#000", boxShadow: "0 6px 24px rgba(255,107,53,0.28)" },
    purple: { background: "linear-gradient(135deg,#7c3aed,#a78bfa)", color: "#000", boxShadow: "0 6px 24px rgba(124,58,237,0.3)" },
  };
  const handle = (e) => {
    if (disabled) return;
    const rect = ref.current.getBoundingClientRect();
    setRipple({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setAnim(true);
    createSound("click");
    setTimeout(() => setAnim(false), 2000);
    setTimeout(() => setRipple(null), 700);
    onClick && onClick(e);
  };
  return (
    <button
      ref={ref}
      onClick={handle}
      disabled={disabled}
      style={{
        position: "relative", overflow: "hidden", border: "none", cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: "'Syne',sans-serif", fontWeight: 700, letterSpacing: ".3px",
        borderRadius: 10, padding: "11px 22px", fontSize: 14, transition: "transform .15s, box-shadow .15s",
        animation: anim ? "btnBounce 2s cubic-bezier(.36,.07,.19,.97) forwards" : "none",
        opacity: disabled ? 0.5 : 1,
        ...variants[variant], ...style,
      }}
      className={className}
    >
      {ripple && (
        <span style={{
          position: "absolute", left: ripple.x, top: ripple.y, width: 10, height: 10,
          borderRadius: "50%", background: "rgba(255,255,255,0.4)", pointerEvents: "none",
          animation: "rippleAnim .7s ease forwards", transformOrigin: "center",
        }} />
      )}
      {children}
    </button>
  );
}
/* ─────────────────────────────────────────────
   STAR RATING
───────────────────────────────────────────── */
function Stars({ n = 5 }) {
  return <span style={{ color: "#f9c74f", fontSize: 13 }}>{Array(5).fill(0).map((_, i) => i < n ? "★" : "☆").join("")}</span>;
}
/* ─────────────────────────────────────────────
   BADGE
───────────────────────────────────────────── */
function Badge({ label, color = "#f9c74f" }) {
  return (
    <span style={{
      display: "inline-block", padding: "3px 11px", borderRadius: 100,
      background: `${color}22`, color, border: `1px solid ${color}44`,
      fontSize: 11, fontWeight: 700, letterSpacing: ".6px", textTransform: "uppercase",
    }}>{label}</span>
  );
}
/* ─────────────────────────────────────────────
   SECTION HEADER
───────────────────────────────────────────── */
function SectionHead({ badge, badgeColor = "#f9c74f", title, titleClass = "tg-gold", sub }) {
  return (
    <div style={{ textAlign: "center", marginBottom: 56 }}>
      <Badge label={badge} color={badgeColor} />
      <h2 style={{ fontFamily: "'Playfair Display',serif", fontWeight: 900, fontSize: "clamp(32px,5vw,52px)", lineHeight: 1.15, margin: "16px 0 14px" }}>
        <span className={titleClass}>{title}</span>
      </h2>
      {sub && <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 16, maxWidth: 540, margin: "0 auto", lineHeight: 1.75 }}>{sub}</p>}
    </div>
  );
}
/* ─────────────────────────────────────────────
   NAV
───────────────────────────────────────────── */
function Nav({ page, setPage, cart }) {
  const { user, logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [openDropdown, setOpenDropdown] = useState(null); // NEW
 
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
 
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
 
  // NEW: inject dropdown CSS once
  useEffect(() => {
    const style = document.createElement("style");
    style.id = "nav-dropdown-styles";
    style.innerHTML = `
      .nav-dropdown {
        position: absolute;
        top: calc(100% + 10px);
        left: 50%;
        transform: translateX(-50%) translateY(-6px);
        min-width: 210px;
        background: rgba(247, 245, 237, 0.97);
        border: 1px solid rgba(47, 150, 33, 0.18);
        border-radius: 12px;
        padding: 8px 0;
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.2s ease, transform 0.2s ease, visibility 0.2s;
        box-shadow: 0 16px 40px rgba(109, 42, 42, 0.7);
        z-index: 999;
        backdrop-filter: blur(16px);
        pointer-events: none;
      }
      .nav-dropdown.open {
        opacity: 1;
        visibility: visible;
        transform: translateX(-50%) translateY(0);
        pointer-events: all;
      }
      .nav-dropdown-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 18px;
        font-size: 13px;
        font-weight: 500;
        color: rgba(11, 11, 11, 0.95);
        cursor: pointer;
        transition: color 0.18s, background 0.18s;
        white-space: nowrap;
      }
      .nav-dropdown-item:hover {
        color: #f9c74f;
        background: rgba(246, 245, 244, 0.07);
      }
      .nav-dropdown-divider {
        border: none;
        border-top: 1px solid rgba(255,255,255,0.07);
        margin: 6px 0;
      }
      .nav-dropdown-label {
        padding: 5px 18px 3px;
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: rgba(255,255,255,0.28);
        font-weight: 600;
      }
      .nav-link-wrap {
        position: relative;
      }
    `;
    if (!document.getElementById("nav-dropdown-styles")) {
      document.head.appendChild(style);
    }
    return () => document.getElementById("nav-dropdown-styles")?.remove();
  }, []);
 
  const go = (p) => {
    createSound("nav");
    setPage(p);
    setMobileOpen(false);
    setOpenDropdown(null); // close any open dropdown
    window.scrollTo(0, 0);
  };
 
  const handleLogout = () => {
    createSound("nav");
    logout();
    go("home");
  };
 
  const links = user?.role === "admin"
    ? ["home", "products", "farm", "families", "subscription", "contact", "admin"]
    : ["home", "products", "farm", "families", "subscription", "contact"];
  const labels = {
    home: "Home", products: "Products", farm: "Our Farm",
    families: "Families", subscription: "Subscribe", contact: "Contact", admin: "Admin"
  };
  // NEW: dropdown config for each nav link
  const dropdowns = {
    products: [
      { label: "🥛 Dairy & Milk",   page: "products" },
      { label: "🧀 Paneer & Ghee",  page: "products" },
      { label: "🥚 Eggs",           page: "products" },
      { label: "🍯 Honey",          page: "products" },
      { divider: true },
      { label: "🛒 All Products",   page: "products" },
    ],
    farm: [
      { label: "🌾 Our Story",      page: "farm" },
      { label: "🐄 Meet the Cows",  page: "farm" },
      { label: "♻️ Sustainability", page: "farm" },
      { label: "📸 Farm Gallery",   page: "farm" },
    ],
    families: [
      { label: "📦 Family Boxes",   page: "families" },
      { label: "🎁 Gift Hampers",   page: "families" },
      { label: "🧒 Kids & Schools", page: "families" },
      { label: "❤️ Community CSA",  page: "families" },
    ],
    subscription: [
      { sectionLabel: "Choose a plan" },
      { label: "🥦 Weekly Veggie Box",    page: "subscription" },
      { label: "🍓 Seasonal Fruit Box",   page: "subscription" },
      { label: "🧀 Dairy & Eggs Bundle",  page: "subscription" },
      { divider: true },
      { label: "⚙️ Manage Subscription", page: "subscription" },
    ],
    contact: [
      { label: "📞 Call Us",    page: "contact" },
      { label: "✉️ Email",      page: "contact" },
      { label: "📍 Find Us",    page: "contact" },
      { label: "💬 WhatsApp",   page: "contact" },
    ],
  };
 
  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (!e.target.closest(".nav-link-wrap")) setOpenDropdown(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
 
  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 1000,
      padding: scrolled ? "10px 0" : "18px 0",
      background: scrolled ? "rgba(252, 249, 249, 0.94)" : "transparent",
      backdropFilter: scrolled ? "blur(24px)" : "none",
      borderBottom: scrolled ? "1px solid rgba(255,255,255,0.07)" : "none",
      transition: "all .4s cubic-bezier(.22,1,.36,1)",
    }}>
 
      {/* Main flex row */}
      <div style={{
        maxWidth: 1280, margin: "0 auto", padding: "0 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
 
        {/* Logo */}
        <div onClick={() => go("home")} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, overflow: "hidden" }}>
            <img src={logo} alt="logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          </div>
          <span style={{ display: "flex", flexDirection: "column", lineHeight: "1.1" }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: "#f9c74f" }}>CNN Organic</span>
            <span style={{ fontSize: 15, fontWeight: 600, color: "#2e7d32" }}>Fresh Farm</span>
          </span>
        </div>
 
        {/* Desktop links — NOW WITH DROPDOWNS */}
        {!isMobile && (
          <div style={{ display: "flex", gap: 28, alignItems: "center" }}>
            {links.map(l => (
              <div
                key={l}
                className="nav-link-wrap"
                onMouseEnter={() => dropdowns[l] ? setOpenDropdown(l) : null}
                onMouseLeave={() => setOpenDropdown(null)}
              >
                {/* The link itself */}
                <span
                  onClick={() => go(l)}
                  style={{
                    cursor: "pointer", fontSize: 13, fontWeight: 600,
                    color: page === l ? "#f9c74f" : "rgba(11, 11, 11, 0.95)",
                    transition: "color .25s", textTransform: "capitalize",
                    borderBottom: page === l ? "2px solid #f9c74f" : "2px solid transparent",
                    paddingBottom: 2,
                    display: "flex", alignItems: "center", gap: 4,
                  }}
                >
                  {labels[l]}
                </span>
 
                {/* Dropdown panel */}
                {dropdowns[l] && (
                  <div className={`nav-dropdown${openDropdown === l ? " open" : ""}`}>
                    {dropdowns[l].map((item, i) => {
                      if (item.divider)      return <hr key={i} className="nav-dropdown-divider" />;
                      if (item.sectionLabel) return <div key={i} className="nav-dropdown-label">{item.sectionLabel}</div>;
                      return (
                        <div key={i} className="nav-dropdown-item" onClick={() => go(item.page)}>
                          {item.label}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
 
        {/* Right: Login/Logout + Cart + Hamburger */}
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {user ? (
            <>
              <span style={{ color: "#f9c74f", fontSize: 13, fontWeight: 600 }}>
                Hi, {user.name?.split(" ")[0] || "there"}
              </span>
              <Btn variant="ghost" onClick={handleLogout} style={{ padding: "8px 16px", fontSize: 13 }}>
                Logout
              </Btn>
            </>
          ) : (
            <Btn variant="ghost" onClick={() => go("login")} style={{ padding: "8px 16px", fontSize: 13 }}>
              Login
            </Btn>
          )}
          <Btn variant="gold" onClick={() => go("cart")} style={{ padding: "8px 16px", fontSize: 13 }}>
            🛒 Cart {cart.length > 0 && (
              <span style={{ background: "#ff3b30", borderRadius: "50%", padding: "1px 6px", fontSize: 11, marginLeft: 4 }}>
                {cart.length}
              </span>
            )}
          </Btn>
          {isMobile && (
            <button onClick={() => { createSound("nav"); setMobileOpen(v => !v); }} style={{
              background: "none", border: "none", color: "#000", fontSize: 22, cursor: "pointer",
            }}>
              {mobileOpen ? "✕" : "☰"}
            </button>
          )}
        </div>
 
      </div>
 
      {/* Mobile dropdown — unchanged */}
      {isMobile && mobileOpen && (
        <div className="glass" style={{
          position: "absolute", top: "100%", left: 0, right: 0,
          padding: "20px 24px", borderTop: "1px solid rgba(255,255,255,0.08)",
          animation: "slideDown .3s ease",
        }}>
         {links.map(l => (
            <div key={l} onClick={() => go(l)} style={{
              padding: "12px 0", cursor: "pointer",
              borderBottom: "1px solid rgba(0,0,0,0.08)",
              color: page === l ? "#f9c74f" : "#0b0b0b", fontWeight: 600,
            }}>
              {labels[l]}
            </div>
          ))}
        </div>
      )}
    </nav>
  );
}
/* ─────────────────────────────────────────────
   HERO — HOME
───────────────────────────────────────────── */
function Hero({ setPage }) {
  const stats = [
    { v: "500+", l: "Happy Families" }, { v: "15+", l: "Years of Farming" },
    { v: "100%", l: "Organic Certified" }, { v: "6AM", l: "Daily Delivery" },
  ];

  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @keyframes slamDown {
        0%   { opacity:0; transform:translateY(-80px) scaleY(1.3); }
        65%  { opacity:1; transform:translateY(6px) scaleY(0.92); }
        80%  { transform:translateY(-3px) scaleY(1.03); }
        100% { opacity:1; transform:translateY(0) scaleY(1); }
      }
      @keyframes slideBlur {
        0%   { opacity:0; transform:translateX(-60px); filter:blur(8px); }
        70%  { opacity:1; transform:translateX(4px); filter:blur(0); }
        100% { opacity:1; transform:translateX(0); filter:blur(0); }
      }
      @keyframes zoomSettle {
        0%   { opacity:0; transform:scale(2.5); filter:blur(6px) drop-shadow(0 0 30px rgba(249,199,79,0.8)); }
        65%  { opacity:1; transform:scale(0.93); filter:blur(0) drop-shadow(0 0 20px rgba(249,199,79,0.5)); }
        100% { opacity:1; transform:scale(1); filter:drop-shadow(0 0 14px rgba(249,199,79,0.4)); }
      }
      @keyframes flipUp {
        0%   { opacity:0; transform:rotateX(-90deg) translateY(30px); }
        60%  { opacity:1; transform:rotateX(10deg) translateY(-4px); }
        80%  { transform:rotateX(-4deg) translateY(2px); }
        100% { opacity:1; transform:rotateX(0deg) translateY(0); }
      }
      @keyframes glowPulse {
        0%,100% { filter:drop-shadow(0 0 10px rgba(249,199,79,0.35)); }
        50%     { filter:drop-shadow(0 0 28px rgba(249,199,79,0.8)); }
      }
      @keyframes itFadeUp {
        0%   { opacity:0; transform:translateY(12px); }
        100% { opacity:1; transform:translateY(0); }
      }
      @keyframes barGrow {
        from { width:0; opacity:0; }
        to   { width:100%; opacity:1; }
      }
      @keyframes floatText {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-6px); }
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  const itLetters = (text, baseDelay) =>
    text.split('').map((c, i) =>
      c === ' '
        ? <span key={i} style={{ display:'inline-block', width:'0.2em' }} />
        : <span key={i} style={{
            display: 'inline-block',
            opacity: 0,
            fontStyle: 'italic',
            fontSize: '55%',
            color: '#0a0a0a',
            animation: `itFadeUp .4s ease ${(baseDelay + i * 0.055).toFixed(3)}s forwards, floatText 3s ease-in-out ${(baseDelay + i * 0.055 + 0.4).toFixed(3)}s infinite`
          }}>{c}</span>
    );

  return (
    <section style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      background: `radial-gradient(ellipse 50% 40% at 80% 20%,rgba(249,199,79,0.07) 0%,transparent 55%),
        radial-gradient(ellipse 60% 35% at 65% 80%,rgba(57,211,83,0.07) 0%,transparent 55%), #fff`,
      position: "relative", overflow: "hidden",
    }}>
      {/* Blob */}
      <div className="blob" style={{ position: "absolute", top: "-10%", right: "-5%", width: 500, height: 500, background: "radial-gradient(circle,rgba(124,58,237,0.06) 0%,transparent 70%)", pointerEvents: "none" }} />
      <div className="blob" style={{ position: "absolute", bottom: "-15%", left: "-8%", width: 420, height: 420, background: "radial-gradient(circle,rgba(57,211,83,0.07) 0%,transparent 70%)", pointerEvents: "none", animationDelay: "-5s" }} />

      <div className="hero-grid" style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px", display: "grid", gridTemplateColumns: "1fr", gap: 60, alignItems: "center", paddingTop: 100, paddingBottom: 80 }}>
        {/* Left */}
        <div style={{ animation: "pageSlide .7s cubic-bezier(.22,1,.36,1) forwards" }}>
          <Badge label="🌿 Organic · A2 · Farm Fresh" color="#39d353" />

          <h1 style={{ fontFamily: "'Playfair Display',serif", fontWeight: 900, fontSize: "clamp(38px,6vw,72px)", lineHeight: 1.1, margin: "22px 0 22px", perspective: 1000, color: "#0a0a0a" }}>

            {/* Line 1: Pure Dairy From Heart — all in one line */}
            <span style={{
              display: 'flex',
              flexWrap: 'nowrap',
              alignItems: 'baseline',
              whiteSpace: 'nowrap',
              fontSize: 'clamp(24px, 5.5vw, 72px)',
              gap: '0.22em',
            }}>
              <span style={{ display:'inline-block', opacity:0, animation:'slamDown .5s cubic-bezier(.6,-.3,.4,1.4) .1s forwards, floatText 3s ease-in-out .6s infinite', color:'#0a0a0a' }}>Pure</span>
              <span style={{ display:'inline-block', opacity:0, animation:'slideBlur .65s cubic-bezier(.22,1,.36,1) .55s forwards, floatText 3s ease-in-out 1.2s infinite', color:'#0a0a0a' }}>Dairy</span>
              <span style={{
                display:'inline-block', opacity:0,
                animation:'zoomSettle .6s cubic-bezier(.22,1,.36,1) 1.05s forwards, floatText 3s ease-in-out 1.65s infinite',
                background:'linear-gradient(135deg,#ffe066 0%,#f9c74f 30%,#ffaa00 65%,#f9c74f 85%,#ffe066 100%)',
                backgroundSize:'300% auto',
                WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text',
              }}>From</span>
              <span style={{
                display:'inline-block', opacity:0, transformOrigin:'50% 100%',
                animation:'flipUp .65s cubic-bezier(.22,1,.36,1) 1.5s forwards, glowPulse 2.5s ease-in-out 2.3s infinite, floatText 3s ease-in-out 2.15s infinite',
                background:'linear-gradient(135deg,#ffe066 0%,#f9c74f 30%,#ffaa00 65%,#f9c74f 85%,#ffe066 100%)',
                backgroundSize:'300% auto',
                WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text',
              }}>Heart</span>
            </span>

            {/* underline bar under "Heart" */}
            <span style={{
              display:'block', height:2, width:0,
              background:'linear-gradient(90deg,transparent,#f9c74f 40%,#fff8dc 60%,transparent)',
              borderRadius:2, marginTop:4,
              animation:'barGrow .7s cubic-bezier(.22,1,.36,1) 2.3s forwards'
            }} />

            {/* Line 2: of Karnataka */}
            <span style={{ display:'block', marginTop:2 }}>
              {itLetters('of Karnataka', 2.2)}
            </span>

          </h1>

          <p style={{ color: "#0a0a0a", fontSize: 17, lineHeight: 1.8, marginBottom: 36, maxWidth: 460 }}>
            Pure dairy, delivered fresh. Milk, ghee, paneer & more — straight from our farm to your doorstep every morning at 6AM. Serving all across Karnataka, because every family deserves the best.
          </p>
          <div className="hero-btns" style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 48 }}>
            <Btn variant="gold" onClick={() => { setPage("subscription"); window.scrollTo(0, 0); }} style={{ fontSize: 15, padding: "14px 28px" }}>
              🥛 Subscribe Now →
            </Btn>
            <Btn variant="ghost" onClick={() => { setPage("products"); window.scrollTo(0, 0); }} style={{ fontSize: 15, padding: "14px 28px" }}>
              View Products
            </Btn>
          </div>
          {/* Stats */}
          <div className="hero-stats" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 20 }}>
            {stats.map(s => (
              <div key={s.l}>
                <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 28, fontWeight: 900, background: "linear-gradient(135deg,#f9c74f,#ffaa00)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{s.v}</div>
                <div style={{ fontSize: 11, color: "#0a0a0a", marginTop: 2 }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
/* ─────────────────────────────────────────────
   PRODUCTS PAGE
───────────────────────────────────────────── */
function ProductCard({ p, addToCart }) {
  const [hover, setHover] = useState(false);
  const [added, setAdded] = useState(false);

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        borderRadius: 20,
        overflow: "hidden",
        cursor: "pointer",
        transition: "all .4s cubic-bezier(.25,.46,.45,.94)",
        width: "100%",
        maxWidth: 300,
        display: "flex",
        flexDirection: "column",
        margin: "0 auto",
        background: "#f5f3ff",
        border: "1px solid rgba(255,107,53,0.2)",
      }}
    >
      <div style={{ position: "relative", width: "100%", aspectRatio: "4 / 3", overflow: "hidden" }}>
        <img
          src={p.img}
          alt={p.name}
          className="product-img"
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transition: "transform .5s ease" }}
        />
        <div
          className="shimmer-layer"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "40%",
            height: "100%",
            background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)",
            pointerEvents: "none",
            zIndex: 2,
          }}
        />
        <div
          className="desc-overlay"
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            background: "linear-gradient(to top, rgba(0,0,0,0.85), transparent)",
            transform: "translateY(100%)",
            transition: "transform 0.4s ease",
            padding: "14px 16px",
            zIndex: 3,
          }}
        >
          <p style={{ color: "#fff", fontSize: 12, margin: 0 }}>{p.desc}</p>
        </div>
        <div style={{ position: "absolute", top: 14, left: 14 }}>
          <Badge label={p.badge} color={p.badgeColor} />
        </div>
        <div style={{ position: "absolute", top: 14, right: 14, background: "rgba(0,0,0,0.7)", borderRadius: 8, padding: "4px 10px", fontSize: 12, color: "rgba(255,255,255,0.7)" }}>
          {p.category}
        </div>
      </div>

      <div style={{ padding: "16px 18px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
        <h3 style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: 17, marginBottom: 8, color: "#0a0a0a" }}>{p.name}</h3>
        <p style={{ color: "rgba(11, 11, 11, 0.95)", fontSize: 13, lineHeight: 1.6, marginBottom: 14, minHeight: 42 }}>{p.desc}</p>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
          <Stars n={p.stars} />
          <span style={{ color: "rgba(11,11,11,0.6)", fontSize: 12 }}>({p.reviews})</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto" }}>
          <div>
            <span className="tg-gold price-val" style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, fontWeight: 900 }}>₹{p.price}</span>
            <span style={{ color: "rgba(11,11,11,0.6)", fontSize: 12, marginLeft: 6 }}>/{p.unit}</span>
          </div>
          <Btn
            variant="orange"
            onClick={(e) => {
              addToCart(p);
              const btn = e.currentTarget;
              const rect = btn.getBoundingClientRect();
              spawnParticles(rect.left + rect.width / 2, rect.top + rect.height / 2);
              addRipple(btn, e);
              setAdded(true);
              const priceEl = btn.closest(".glass-product")?.querySelector(".price-val");
              if (priceEl) {
                priceEl.classList.add("pop");
                setTimeout(() => priceEl.classList.remove("pop"), 500);
              }
              setTimeout(() => {
                setAdded(false);
              }, 900);
            }}
            style={{ padding: "9px 18px", fontSize: 13, position: "relative", overflow: "hidden" }}
            className={added ? "success" : ""}
          >
            {added ? "✓ Added!" : "Add +"}
          </Btn>
        </div>
      </div>
    </div>
  );
}
/* ─────────────────────────────────────────────
   PRODUCTS PAGE (full catalog)
   Uses the existing PRODUCTS array already
   defined elsewhere in App.js
───────────────────────────────────────────── */
function ProductsPage({ addToCart, PRODUCTS }) {
  return (
    <div style={{ paddingTop: 100, paddingBottom: 60, background: "#fff" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
        <SectionHead
          badge="Farm Fresh"
          badgeColor="#ff6b35"
          title="Our Products"
          titleClass="tg-gold"
          sub="Pure A2 dairy, ghee & artisan products made with zero additives and maximum love."
        />
        <div
          className="products-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))",
            gap: 24,
            marginTop: 44,
          }}
        >
          {PRODUCTS.map((p) => (
            <ProductCard key={p.id} p={p} addToCart={addToCart} />
          ))}
        </div>
      </div>
    </div>
  );
}
/* ─────────────────────────────────────────────
   FARM PAGE
───────────────────────────────────────────── */
function FarmPage() {
  const teamImages = [
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&q=80",
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&q=80",
    "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&q=80",
  ];
  const teamNames = ["Narasimha Murthy C N", "Tejashwini G M", "Ravi Kumar"];
  const teamRoles = ["Founder & Head Farmer", "Co-Founder", "Delivery Manager"];

  return (
  <div style={{ paddingTop: 100 }}>
    {/* Hero */}
    <div style={{ height: 320, overflow: "hidden", position: "relative" }}>
      <img src="https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=1400&q=80" alt="Farm" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom,rgba(6, 6, 6, 0.2),rgba(5,5,5,0.9))", display: "flex", alignItems: "flex-end", padding: "40px 60px" }}>
        <div>
          <Badge label="Est. 2009" color="#00b4d8" />
          <h1 style={{ fontFamily: "'Playfair Display',serif", fontWeight: 900, fontSize: "clamp(32px,5vw,56px)", marginTop: 12 }}>
            {[
              { word: "Our",   cls: "tg-farm" },
              { word: "Farm",  cls: "tg-farm" },
              { word: "Story", cls: ""        },
            ].map(({ word, cls }, i) => (
              <span
                key={i}
                className="inline-block opacity-0"
                style={{
                  animation: "wordIn 0.5s ease forwards",
                  animationDelay: `${i * 0.13}s`,
                  marginRight: "0.25em",
                }}
              >
                <span className={cls}>{word}</span>
              </span>
            ))}
          </h1>
        </div>
      </div>
    </div>
      {/* page background now plain white, matches other pages */}
      <div style={{ background: "#fff", padding: "70px 24px 100px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          {/* Story */}
          <div className="farm-story-grid" style={{ display: "grid", gap: 60, alignItems: "center", marginBottom: 80 }}>
            <div>
              <SectionHead badge="Our Story" badgeColor="#00b4d8" title="From Karnataka's Heart to Your Home" titleClass="tg-farm" />
              <p style={{ color: "rgba(11, 11, 11, 0.95)", lineHeight: 1.9, fontSize: 15, marginBottom: 20 }}>
CNN Farm Hub is a trusted farm-fresh marketplace rooted in Chinnappanahalli, Karnataka, bringing pure dairy products, organic vegetables, and naturally ripened fruits directly to your doorstep. We eliminate middlemen to ensure every household receives food that is fresh, clean, and honestly priced.              </p>
              <p style={{ color: "rgba(11, 11, 11, 0.95)", lineHeight: 1.9, fontSize: 15, marginBottom: 30 }}>
At CNN Farm Hub, we follow sustainable farming practices that prioritize the health of our customers and the care of our land. We are your trusted farm neighbor, delivering nature's best with integrity and pride.              </p>
              <div className="farm-stats-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {[["8", "Gir Cows"], ["2", "Acres Organic"], ["6AM", "Delivery Time"], ["0", "Preservatives"]].map(([v, l]) => (
  <ScrollReveal key={l}>
    <div style={{ borderRadius: 14, padding: "16px 20px", background: "#f5f3ff", border: "1px solid rgba(0,180,216,0.2)" }}>
      <StatCounter value={v} label={l} color="#00c6d8" />
    </div>
  </ScrollReveal>
))}
              </div>
            </div>
            <div className="farm-story-img" style={{ borderRadius: 24, overflow: "hidden", aspectRatio: "4/3" }}>
              <img src="https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?w=700&q=80" alt="Farm" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          </div>

          {/* Timeline */}
          <div style={{ marginBottom: 80 }}>
            <SectionHead badge="Our Journey" badgeColor="#00b4d8" title="Milestones" titleClass="tg-farm" />
            <div style={{ maxWidth: 620, margin: "0 auto" }}>
              {TIMELINE.map((t, i) => (
                <div key={t.year} style={{ display: "flex", gap: 22, marginBottom: 30 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <div style={{ width: 50, height: 50, borderRadius: "50%", flexShrink: 0, background: `linear-gradient(135deg,${t.color},${t.color}88)`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 11, color: "#000" }}>{t.year}</div>
                    {i < TIMELINE.length - 1 && <div style={{ width: 2, flex: 1, minHeight: 30, background: `linear-gradient(${t.color}55,transparent)`, marginTop: 3 }} />}
                  </div>
                  <div style={{ borderRadius: 16, padding: "18px 22px", flex: 1, background: "#f5f3ff", border: "1px solid rgba(0,180,216,0.2)" }}>
                    <h4 style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: 19, marginBottom: 6, color: "#0a0a0a" }}>{t.title}</h4>
                    <p style={{ color: "rgba(11, 11, 11, 0.95)", lineHeight: 1.7, fontSize: 14 }}>{t.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Team */}
          <SectionHead badge="Meet the Team" badgeColor="#00b4d8" title="The People Behind Your Milk" titleClass="tg-farm" />
          <div className="farm-team-grid" style={{ display: "grid", gap: 28 }}>
            {teamImages.map((img, i) => (
              <div key={i} style={{ borderRadius: 20, overflow: "hidden", textAlign: "center", background: "#f5f3ff", border: "1px solid rgba(0,180,216,0.2)" }}>
                <div style={{ height: 200, overflow: "hidden" }}>
                  <img src={img} alt={teamNames[i]} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
                <div style={{ padding: "22px" }}>
                  <h3 style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: 18, color: "#0a0a0a" }}>{teamNames[i]}</h3>
                  <p style={{ color: "#00b4d8", fontSize: 13, marginTop: 4 }}>{teamRoles[i]}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Farm visit CTA */}
          <div style={{ marginTop: 60, borderRadius: 28, overflow: "hidden", position: "relative" }}>
            <img src="https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=1200&q=80" alt="Farm visit" style={{ width: "100%", height: 280, objectFit: "cover" }} />
            <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 18 }}>
              <h2 style={{ fontFamily: "'Playfair Display',serif", fontWeight: 900, fontSize: 36, textAlign: "center", color: "#fff" }}>Visit Our Farm</h2>
              <p style={{ color: "#fff", textAlign: "center" }}>Open for family visits: Saturday & Sunday, 7AM–11AM</p>
              <Btn variant="farm" style={{ fontSize: 15, padding: "13px 28px" }} onClick={() => {}}>Book Farm Visit →</Btn>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
/* ─────────────────────────────────────────────
   FAMILIES PAGE
───────────────────────────────────────────── */
function FamiliesPage({ setPage }) {
  return (
    <div style={{ paddingTop: 100 }}>
      <div style={{ height: 260, overflow: "hidden", position: "relative" }}>
        <img src="https://images.unsplash.com/photo-1511895426328-dc8714191011?w=1400&q=80" alt="Families" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom,rgba(5,5,5,0.2),rgba(5,5,5,0.9))", display: "flex", alignItems: "flex-end", padding: "clamp(16px,4vw,40px) clamp(16px,5vw,60px)" }}>
          <div>
            <Badge label="Our Community" color="#ff9a9e" />
            <h1 style={{ fontFamily: "'Playfair Display',serif", fontWeight: 900, fontSize: "clamp(28px,5vw,56px)", marginTop: 12 }}>
              <span className="tg-family">Happy Families</span>
            </h1>
          </div>
        </div>
      </div>

      {/* page background now plain white, matches Contact/Sub pages */}
      <div style={{ background: "#fff", padding: "70px 24px 100px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <SectionHead badge="Testimonials" badgeColor="#ff9a9e" title="Loved by 500+ Families" titleClass="tg-family"
            sub="Real stories from families who switched to CNN Farm Hub and never looked back." />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 28, marginBottom: 70 }}>
            {FAMILIES.map((f, i) => (
              <div key={i}
                style={{
                  borderRadius: 22, overflow: "hidden", transition: "transform .4s", cursor: "pointer",
                  background: "#f5f3ff",
                  border: "1px solid rgba(255,154,158,0.25)",
                }}
                onMouseEnter={e => e.currentTarget.style.transform = "translateY(-8px)"}
                onMouseLeave={e => e.currentTarget.style.transform = "none"}>
                <div style={{ height: 180, overflow: "hidden" }}>
                  <img src={f.img} alt={f.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
                <div style={{ padding: "22px 24px" }}>
                  <Stars n={5} />
                  <p style={{ color: "rgba(11, 11, 11, 0.95)", fontSize: 14, lineHeight: 1.75, margin: "12px 0 18px", fontStyle: "italic" }}>"{f.quote}"</p>
                  <div style={{ fontWeight: 700, fontSize: 15, color: "#0a0a0a" }}>{f.name}</div>
                  <div style={{ color: "#ff9a9e", fontSize: 12, marginTop: 3 }}>📍 {f.location}</div>
                  <div style={{ color: "rgba(11, 11, 11, 0.95)", fontSize: 11, marginTop: 2 }}>Member since {f.since}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Join CTA */}
          <div className="families-join-cta" style={{
            borderRadius: 28, padding: "56px", textAlign: "center",
            background: "#f5f3ff",
            border: "1px solid rgba(255,154,158,0.25)",
          }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🤝</div>
            <h2 style={{ fontFamily: "'Playfair Display',serif", fontWeight: 900, fontSize: 38, marginBottom: 14, color: "#0a0a0a" }}>
              Join the <span className="tg-family">Farm Family</span>
            </h2>
            <p style={{ color: "rgba(11, 11, 11, 0.95)", marginBottom: 30, fontSize: 16, maxWidth: 500, margin: "0 auto 30px" }}>
              Become part of 500+ families who trust CNN Farm Hub for pure, fresh dairy every single day.
            </p>
            <div style={{ display: "flex", gap: 14, justifyContent: "center" }}>
              <Btn variant="family" onClick={() => { setPage("subscription"); window.scrollTo(0, 0); }} style={{ fontSize: 15, padding: "14px 28px" }}>Start Subscription →</Btn>
              <Btn variant="ghost" onClick={() => { setPage("contact"); window.scrollTo(0, 0); }} style={{ fontSize: 15, padding: "14px 28px" }}>WhatsApp Us</Btn>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
/* ─────────────────────────────────────────────
   SUBSCRIPTION PAGE
───────────────────────────────────────────── */
function SubPage({ setPage }) {
  const [selected, setSelected] = useState("premium");
  const [freq, setFreq] = useState("monthly");
 
  const handleSubscribe = async () => {
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/payment/create-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: selected }),
      });
      const order = await res.json();
 
      if (!res.ok) {
        alert(order.message || "Could not create order");
        return;
      }
 
      const options = {
        key: process.env.REACT_APP_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        name: "CNN Farm Hub",
        description: `${selected} subscription`,
        order_id: order.id,
        handler: async function (response) {
          const verifyRes = await fetch(`${process.env.REACT_APP_API_URL}/api/payment/verify-payment`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(response),
          });
          const result = await verifyRes.json();
          if (result.verified) {
            alert("Subscription payment successful! 🎉");
          } else {
            alert("Payment verification failed.");
          }
        },
        theme: { color: "#39d353" },
      };
 
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error("Payment error:", err);
      alert("Something went wrong starting the payment.");
    }
  };
 
  return (
    <div style={{ paddingTop: 100 }}>
      <div style={{ height: 260, overflow: "hidden", position: "relative" }}>
        <img src="https://images.unsplash.com/photo-1550583724-b2692b85b150?w=1400&q=80" alt="Milk" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom,rgba(5,5,5,0.2),rgba(5,5,5,0.9))", display: "flex", alignItems: "flex-end", padding: "clamp(16px,4vw,40px) clamp(16px,5vw,60px)" }}>
          <div>
            <Badge label="Daily Fresh" color="#000" />
            <h1 style={{ fontFamily: "'Playfair Display',serif", fontWeight: 900, fontSize: "clamp(28px,5vw,56px)", marginTop: 12 }}>
              <span className="tg-sub">Subscription Plans</span>
            </h1>
          </div>
        </div>
      </div>
 
      {/* page background now plain white, matches Contact page */}
      <div style={{ background: "#fff", padding: "70px 24px 100px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <SectionHead badge="Farm to Doorstep" badgeColor="#39d353" title="Pick Your Plan" titleClass="tg-sub"
            sub="Fresh dairy every morning. Pause or cancel anytime. No hidden charges." />
 
          {/* Frequency */}
          <div style={{
            display: "flex", justifyContent: "center", gap: 0, marginBottom: 48,
            background: "#f5f3ff",
            border: "1px solid rgba(124,58,237,0.15)",
            borderRadius: 14, padding: 5, width: "fit-content", margin: "0 auto 48px"
          }}>
            {["daily", "weekly", "monthly"].map(f => (
              <button key={f} onClick={() => { createSound("nav"); setFreq(f); }} style={{
                padding: "10px 24px", border: "none", cursor: "pointer", fontFamily: "'Syne',sans-serif", fontWeight: 600, fontSize: 13, borderRadius: 10,
                background: freq === f ? "linear-gradient(135deg,#39d353,#00b894)" : "transparent",
                color: freq === f ? "#020f05" : "rgba(11,11,11,0.95)", transition: "all .3s", textTransform: "capitalize",
              }}>{f}</button>
            ))}
          </div>
 
          {/* Plans */}
          <div className="sub-plans-grid" style={{ display: "grid", gap: 24, marginBottom: 70 }}>
            {PLANS.map(pl => (
              <div key={pl.id} onClick={() => { createSound("click"); setSelected(pl.id); }}
                style={{
                  borderRadius: 24, overflow: "hidden", cursor: "pointer",
                  border: selected === pl.id ? `2px solid ${pl.color}` : "2px solid rgba(124,58,237,0.15)",
                  background: selected === pl.id ? `${pl.color}11` : "#f5f3ff",
                  transform: selected === pl.id ? "translateY(-6px)" : "none",
                  boxShadow: selected === pl.id ? `0 24px 50px ${pl.color}33` : "none",
                  transition: "all .35s cubic-bezier(.22,1,.36,1)",
                }}>
                {pl.popular && <div style={{ background: `linear-gradient(135deg,${pl.color},${pl.color}88)`, textAlign: "center", padding: "8px", fontSize: 12, fontWeight: 700, letterSpacing: 1, color: "#020f05" }}>★ MOST POPULAR</div>}
                <div style={{ padding: "30px 28px" }}>
                  <div style={{ fontSize: 13, color: pl.color, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>{pl.name}</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 6 }}>
                    <span style={{ fontFamily: "'Playfair Display',serif", fontWeight: 900, fontSize: 40, color: "#000" }}>₹{pl.price.toLocaleString()}</span>
                    <span style={{ color: "rgba(11,11,11,0.6)", fontSize: 14 }}>/{pl.period}</span>
                  </div>
                  <div style={{ color: "rgba(11,11,11,0.6)", fontSize: 12, marginBottom: 26 }}>Billed {freq}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 28 }}>
                    {pl.items.map(item => (
                      <div key={item} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13, color: "rgba(11, 11, 11, 0.95)" }}>
                        <span style={{ color: pl.color, flexShrink: 0, marginTop: 1 }}>✓</span>{item}
                      </div>
                    ))}
                  </div>
                  <Btn
                    variant={selected === pl.id ? "sub" : "ghost"}
                    onClick={() => setSelected(pl.id)}
                    style={{ width: "100%", justifyContent: "center", fontSize: 14, padding: "12px", background: selected === pl.id ? `linear-gradient(135deg,${pl.color},${pl.color}cc)` : undefined, color: selected === pl.id ? "#020f05" : undefined }}
                  >
                    {selected === pl.id ? "✓ Selected" : "Select Plan"}
                  </Btn>
                </div>
              </div>
            ))}
          </div>
 
          {/* CTA bar */}
          <div style={{
            borderRadius: 24, padding: "36px 40px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 20,
            background: "#f5f3ff",
            border: "1px solid rgba(124,58,237,0.15)",
          }}>
            <div>
              <h3 style={{ fontFamily: "'Playfair Display',serif", fontWeight: 900, fontSize: 26, color: "#0a0a0a" }}>Ready to subscribe?</h3>
              <p style={{ color: "rgba(11, 11, 11, 0.95)", marginTop: 4 }}>Free delivery · Pause anytime · No contract</p>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <Btn variant="sub" onClick={handleSubscribe} style={{ fontSize: 15, padding: "13px 28px" }}>Subscribe Now →</Btn>
<Btn
                variant="ghost"
                onClick={() => {
                  const plan = PLANS.find(p => p.id === selected);
                  const message = encodeURIComponent(
                    `Hi! I'm interested in the ${plan?.name || "subscription"} plan (₹${plan?.price || ""}/${plan?.period || "month"}). Can you help me get started?`
                  );
                  window.open(`https://wa.me/918618854283?text=${message}`, "_blank");
                }}
                style={{ fontSize: 15, padding: "13px 22px" }}
              >
                📱 WhatsApp
              </Btn>            </div>
          </div>
 
          {/* How it works */}
          <div style={{ marginTop: 70 }}>
            <SectionHead badge="How it Works" badgeColor="#39d353" title="Simple as Fresh Milk" titleClass="tg-sub" />
            <div className="farm-stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 24 }}>
              {[["1", "🛒", "Pick a Plan", "Choose daily, weekly or monthly subscription that suits you."],
                ["2", "📍", "Share Address", "Tell us where to deliver — doorstep delivery anywhere in the city."],
                ["3", "💳", "Pay Securely", "Pay via Razorpay — cards, UPI, netbanking all supported."],
                ["4", "🥛", "Fresh Delivery", "Get farm-fresh products at your door every morning at 6AM."]].map(([n, ic, t, d]) => (
                <div key={n} style={{
                  borderRadius: 18, padding: "26px 22px", textAlign: "center",
                  background: "#f5f3ff",
                  border: "1px solid rgba(124,58,237,0.15)",
                }}>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>{ic}</div>
                  <div className="tg-sub" style={{ fontFamily: "'Playfair Display',serif", fontWeight: 900, fontSize: 36, marginBottom: 6 }}>{n}</div>
                  <h4 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8, color: "#0a0a0a" }}>{t}</h4>
                  <p style={{ color: "rgba(11, 11, 11, 0.95)", fontSize: 13, lineHeight: 1.7 }}>{d}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   CONTACT PAGE
───────────────────────────────────────────── */
function ContactPage() {
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", msg: "" });

  const submit = () => {
    if (!form.name || !form.phone) return;
    createSound("success");
    setSent(true);
    setForm({ name: "", phone: "", email: "", msg: "" });
    setTimeout(() => setSent(false), 4000);
  };

  return (
    <div style={{ paddingTop: 100 }}>
      <div style={{ height: 240, overflow: "hidden", position: "relative" }}>
        <img src="https://images.unsplash.com/photo-1605000797499-95a51c5269ae?w=1400&q=80" alt="Farm" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom,rgba(5,5,5,0.2),rgba(5,5,5,0.9))", display: "flex", alignItems: "flex-end", padding: "clamp(16px,4vw,40px) clamp(16px,5vw,60px)" }}>
          <div>
            <Badge label="Get in Touch" color="#7c3aed" />
            <h1 style={{ fontFamily: "'Playfair Display',serif", fontWeight: 900, fontSize: "clamp(28px,5vw,56px)", marginTop: 12 }}>
              <span style={{ background: "linear-gradient(135deg,#7c3aed,#a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Contact Us</span>
            </h1>
          </div>
        </div>
      </div>

      {/* page background now plain white */}
      <div style={{ background: "#fff", padding: "70px 24px 100px" }}>
        <div className="contact-grid" style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gap: 48 }}>
          {/* Info */}
          <div>
            <h2 style={{ fontFamily: "'Playfair Display',serif", fontWeight: 900, fontSize: 38, marginBottom: 16 }}>Let's Talk<br /><span style={{ background: "linear-gradient(135deg,#7c3aed,#a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Farm Fresh</span></h2>
            <p style={{ color: "rgba(11, 11, 11, 0.95)", marginBottom: 40, lineHeight: 1.8 }}>Have a question, want to visit the farm, or ready to place your first order? We're available Monday–Saturday, 6AM–9PM.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {[
                ["📞", "rgba(0,180,216,0.15)", "rgba(0,180,216,0.3)", "#00b4d8", "Phone", "+91 8618854283", "Mon–Sat, 6AM–9PM"],
                ["📧", "rgba(249,199,79,0.15)", "rgba(249,199,79,0.3)", "#f9c74f", "Email", "cnnfarmhub@gmail.com", "Reply within 4 hours"],
                ["📍", "rgba(124,58,237,0.15)", "rgba(124,58,237,0.3)", "#a78bfa", "Location", "Chinnappanahalli, Karnataka", "Farm visits: Sat–Sun 7AM–11AM"],
                ["💬", "rgba(57,211,83,0.15)", "rgba(57,211,83,0.3)", "#39d353", "WhatsApp", "+91 8618854283", "Fastest response channel"],
              ].map(([ic, bg, br, color, label, val, sub]) => (
                <div key={label}
                  style={{
                    borderRadius: 16,
                    padding: "18px 20px",
                    display: "flex",
                    gap: 14,
                    alignItems: "center",
                    cursor: "pointer",
                    background: "#f5f3ff", /* light lavender box */
                    border: "1px solid rgba(124,58,237,0.15)",
                  }}
                  onClick={() => createSound("click")}>
                  <div style={{ width: 46, height: 46, borderRadius: 12, background: bg, border: `1px solid ${br}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{ic}</div>
                  <div>
                    <div style={{ fontSize: 11, color: "rgba(11,11,11,0.95)", marginBottom: 2 }}>{label}</div>
                    <div style={{ fontWeight: 700, fontSize: 15, color }}>{val}</div>
                    <div style={{ fontSize: 12, color: "rgba(11,11,11,0.95)" }}>{sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Form */}
          <div
            style={{
              borderRadius: 28,
              padding: "36px",
              background: "#f5f3ff", /* light lavender box, matches theme accent */
              border: "1px solid rgba(124,58,237,0.15)",
            }}
          >
            <h3 style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: 26, marginBottom: 26, color: "#0a0a0a" }}>Send a Message</h3>
            {sent && (
              <div style={{ background: "rgba(57,211,83,0.12)", border: "1px solid rgba(57,211,83,0.35)", borderRadius: 12, padding: "13px 17px", marginBottom: 20, color: "#1a8a3d", fontWeight: 600 }}>
                ✅ Message sent! We'll respond within 30 minutes.
              </div>
            )}
            <div className="contact-form-fields" style={{ display: "grid", gap: 14, marginBottom: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, color: "rgba(11, 11, 11, 0.95)", marginBottom: 6 }}>Full Name *</label>
                <input
                  placeholder="Your name"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: 10,
                    border: "1px solid rgba(124,58,237,0.2)",
                    background: "#fff",
                    color: "#0a0a0a",
                    fontSize: 14,
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 13, color: "rgba(11,11,11,0.95)", marginBottom: 6 }}>Phone *</label>
                <input
                  placeholder="+91 XXXXX XXXXX"
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: 10,
                    border: "1px solid rgba(124,58,237,0.2)",
                    background: "#fff",
                    color: "#0a0a0a",
                    fontSize: 14,
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 13, color: "rgba(11,11,11,0.95)", marginBottom: 6 }}>Email</label>
              <input
                type="email"
                placeholder="your@email.com"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 10,
                  border: "1px solid rgba(124,58,237,0.2)",
                  background: "#fff",
                  color: "#0a0a0a",
                  fontSize: 14,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div style={{ marginBottom: 28 }}>
              <label style={{ display: "block", fontSize: 13, color: "rgba(11,11,11,0.95)", marginBottom: 6 }}>Message</label>
              <textarea
                placeholder="I'd like to order..."
                rows={4}
                value={form.msg}
                onChange={e => setForm(f => ({ ...f, msg: e.target.value }))}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 10,
                  border: "1px solid rgba(124,58,237,0.2)",
                  background: "#fff",
                  color: "#0a0a0a",
                  fontSize: 14,
                  outline: "none",
                  resize: "vertical",
                  boxSizing: "border-box",
                  fontFamily: "inherit",
                }}
              />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <Btn variant="gold" onClick={submit} style={{ flex: 1, justifyContent: "center", fontSize: 15, padding: "13px" }}>Send Message →</Btn>
              <a href="https://wa.me/918618854283" target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
                <Btn variant="sub" onClick={() => createSound("add")} style={{ fontSize: 15, padding: "13px 18px" }}>📱</Btn>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
/* ─────────────────────────────────────────────
   CART PAGE — synced with backend cart + real Razorpay checkout
───────────────────────────────────────────── */
const RAZORPAY_KEY_ID = "rzp_live_THLzFx4ZDzwudX"; // <-- replace with your actual key_id
 
function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}
 
function CartPage({ setPage, deliveryAddress, deliverySlot }) {
  const { user } = useAuth();
  const token = localStorage.getItem("token"); // NOTE: confirm your login flow actually sets this - see note below
  const [cart, setCartState] = useState(null); // null = loading
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState(null);
 
  // Fetch cart from backend on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/cart`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!cancelled) setCartState((data.items || []).filter(i => i.productId));
      } catch (err) {
        console.error("Failed to load cart:", err);
        if (!cancelled) setError("Couldn't load your cart. Please refresh.");
      }
    })();
    return () => { cancelled = true; };
  }, [token]); 
  const items = (cart || []).filter(i => i.productId);
  const total = items.reduce((s, i) => s + (i.productId?.price || 0) * i.quantity, 0);
 
  // Set an exact quantity (backend handles removal if it drops to 0)
  const update = async (productId, newQty) => {
    createSound("click");
    // optimistic UI update
    setCartState(prev =>
      newQty <= 0
        ? prev.filter(i => i.productId._id !== productId)
        : prev.map(i => i.productId._id === productId ? { ...i, quantity: newQty } : i)
    );
    try {
      const res = await fetch(`${API_URL}/api/cart/update`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ productId, quantity: newQty }),
      });
      const data = await res.json();
      setCartState((data.items || []).filter(i => i.productId));
    } catch (err) {
      console.error("Failed to update cart:", err);
      setError("Couldn't update your cart. Please try again.");
    }
  };
 
  const handleCheckout = async () => {
    setPaying(true);
    setError(null);
    try {
      const scriptOk = await loadRazorpayScript();
      if (!scriptOk) {
        setError("Couldn't load the payment gateway. Check your internet connection and try again.");
        setPaying(false);
        return;
      }
 
      // 1. Create the order in our DB (status: pending), from the synced cart
      const orderRes = await fetch(`${API_URL}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          items: items.map(i => ({
            productId: i.productId._id,
            name: i.productId.name,
            quantity: i.quantity,
            price: i.productId.price,
          })),
          totalAmount: total,
          deliveryAddress,
          deliverySlot,
        }),
      });
      if (!orderRes.ok) throw new Error("Could not create order");
      const order = await orderRes.json();
 
      // 2. Create matching Razorpay order
      const rpOrderRes = await fetch(`${API_URL}/api/orders/create-razorpay-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount: total, orderId: order._id }),
      });
      if (!rpOrderRes.ok) throw new Error("Could not initiate payment");
      const rpOrder = await rpOrderRes.json();
 
      // 3. Open real Razorpay checkout popup
      const options = {
        key: RAZORPAY_KEY_ID,
        amount: rpOrder.amount,
        currency: rpOrder.currency,
        name: "CNN Organic Fresh Farm",
        description: "Order Payment",
        order_id: rpOrder.id,
        prefill: { name: user?.name, email: user?.email, contact: user?.phone },
        theme: { color: "#7c3aed" },
        handler: async function (response) {
          try {
            const verifyRes = await fetch(`${API_URL}/api/orders/verify-payment`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                orderId: order._id,
              }),
            });
            const verifyData = await verifyRes.json();
 
            if (verifyData.success) {
              createSound("success");
              setCartState([]); // cart is cleared server-side on order creation already
              setPage("orderSuccess");
            } else {
              setError("We couldn't verify your payment. If money was deducted, contact support with order ID " + order._id);
            }
          } catch (err) {
            console.error("Verification failed:", err);
            setError("Payment made, but verification failed. Please contact support with order ID " + order._id);
          } finally {
            setPaying(false);
          }
        },
        modal: { ondismiss: () => setPaying(false) },
      };
 
      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", function (response) {
        console.error("Payment failed:", response.error);
        setError("Payment failed: " + response.error.description);
        setPaying(false);
      });
      rzp.open();
    } catch (err) {
      console.error("Checkout failed:", err);
      setError("Something went wrong starting checkout. Please try again.");
      setPaying(false);
    }
  };
 
  if (cart === null) {
    return (
      <div style={{ paddingTop: 100, minHeight: "100vh", background: "#fff", padding: "100px 24px", textAlign: "center" }}>
        <div style={{ color: "rgba(11,11,11,0.5)" }}>Loading your cart…</div>
      </div>
    );
  }
 
  return (
    <div style={{ paddingTop: 100, minHeight: "100vh", background: "#fff", padding: "100px 24px 100px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <h1 style={{ fontFamily: "'Playfair Display',serif", fontWeight: 900, fontSize: 48, marginBottom: 40 }}>
          Your{" "}
          <span style={{ background: "linear-gradient(135deg,#7c3aed,#a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Cart
          </span>
        </h1>
 
        {error && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", borderRadius: 12, padding: "12px 16px", marginBottom: 20, fontSize: 14 }}>
            {error}
          </div>
        )}
 
        {items.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <div style={{ fontSize: 80, marginBottom: 20 }}>🛒</div>
            <h3 style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: 28, color: "rgba(11,11,11,0.95)", marginBottom: 12 }}>Your cart is empty</h3>
            <Btn variant="gold" onClick={() => setPage("products")} style={{ fontSize: 15, padding: "13px 28px", marginTop: 10 }}>Browse Products →</Btn>
          </div>
        ) : (
          <div className="cart-grid" style={{ display: "grid", gap: 30 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {items.map(item => (
                <div
                  key={item.productId._id}
                  style={{
                    borderRadius: 18,
                    padding: "20px 22px",
                    display: "flex",
                    gap: 16,
                    alignItems: "center",
                    background: "#f5f3ff",
                    border: "1px solid rgba(124,58,237,0.15)",
                  }}
                >
                  <img src={item.productId.image} alt={item.productId.name} style={{ width: 70, height: 70, objectFit: "cover", borderRadius: 12 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4, color: "#0a0a0a" }}>{item.productId.name}</div>
                    <div style={{ color: "rgba(11,11,11,0.6)", fontSize: 13 }}>₹{item.productId.price}/{item.productId.unit}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <button
                      onClick={() => update(item.productId._id, item.quantity - 1)}
                      style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid rgba(124,58,237,0.25)", background: "#fff", color: "#0a0a0a", cursor: "pointer", fontSize: 18 }}
                    >
                      −
                    </button>
                    <span style={{ fontWeight: 700, width: 24, textAlign: "center", color: "#0a0a0a" }}>{item.quantity}</span>
                    <button
                      onClick={() => update(item.productId._id, item.quantity + 1)}
                      style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid rgba(124,58,237,0.25)", background: "#fff", color: "#0a0a0a", cursor: "pointer", fontSize: 18 }}
                    >
                      +
                    </button>
                  </div>
                  <div
                    style={{
                      fontFamily: "'Playfair Display',serif",
                      fontWeight: 900,
                      fontSize: 20,
                      width: 70,
                      textAlign: "right",
                      background: "linear-gradient(135deg,#7c3aed,#a78bfa)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                    }}
                  >
                    ₹{item.productId.price * item.quantity}
                  </div>
                </div>
              ))}
            </div>
 
            <div>
              <div
                className="cart-summary"
                style={{
                  borderRadius: 22,
                  padding: "26px",
                  position: "sticky",
                  top: 100,
                  background: "#f5f3ff",
                  border: "1px solid rgba(124,58,237,0.15)",
                }}
              >
                <h3 style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: 22, marginBottom: 22, color: "#0a0a0a" }}>Order Summary</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 18 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", color: "rgba(11,11,11,0.7)", fontSize: 14 }}>
                    <span>Subtotal</span><span>₹{total}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", color: "rgba(11,11,11,0.7)", fontSize: 14 }}>
                    <span>Delivery</span><span style={{ color: "#16a34a" }}>Free</span>
                  </div>
                  <div style={{ height: 1, background: "linear-gradient(90deg,transparent,rgba(124,58,237,0.3),transparent)" }} />
                  <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 22, color: "#0a0a0a" }}>
                    <span>Total</span>
                    <span style={{ background: "linear-gradient(135deg,#7c3aed,#a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>₹{total}</span>
                  </div>
                </div>
                <Btn
                  variant="gold"
                  onClick={handleCheckout}
                  disabled={paying}
                  style={{ width: "100%", fontSize: 16, padding: "14px", display: "block", textAlign: "center", opacity: paying ? 0.7 : 1 }}
                >
                  {paying ? "Processing…" : "Checkout →"}
                </Btn>
                <div
                  style={{
                    borderRadius: 9,
                    padding: "10px 13px",
                    marginTop: 14,
                    textAlign: "center",
                    fontSize: 12,
                    color: "rgba(11,11,11,0.55)",
                    background: "#fff",
                    border: "1px solid rgba(124,58,237,0.15)",
                  }}
                >
                  🔒 Secured by Razorpay · SSL Encrypted
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
/* ─────────────────────────────────────────────
   LOGIN PAGE
───────────────────────────────────────────── */
function LoginPage({ setPage }) {
  const [mode, setMode] = useState("login");
  const { login } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");

  // ── Phone OTP state ──
  const [showOtp, setShowOtp] = useState(false);
  const [otpStep, setOtpStep] = useState("phone"); // "phone" | "code"
  const [otpPhone, setOtpPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState("");
  const confirmationResultRef = useRef(null);
  const recaptchaVerifierRef = useRef(null);

  const handleSubmit = async () => {
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const url = mode === "login"
        ? `${API_URL}/api/auth/login`
        : `${API_URL}/api/auth/signup`;

      const body = mode === "login"
        ? { email, password }
        : { name, email, phone, password };

      const res = await axios.post(url, body, { withCredentials: true });

      login(res.data.user, res.data.token);
      if (mode === "signup") {
        setSuccess("🎉 Registered successfully! Redirecting...");
        await new Promise(r => setTimeout(r, 1500));
      }

      createSound("success");
      setPage("home");
      window.scrollTo(0, 0);

    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    setOtpError("");
    if (!otpPhone || otpPhone.replace(/\D/g, "").length < 10) {
      setOtpError("Please enter a valid phone number");
      return;
    }
    setOtpLoading(true);
    try {
      const formattedPhone = otpPhone.startsWith("+") ? otpPhone : `+91${otpPhone.replace(/\D/g, "")}`;

      if (!recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current = new RecaptchaVerifier(auth, "recaptcha-container", {
          size: "invisible",
        });
      }

      const confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, recaptchaVerifierRef.current);
      confirmationResultRef.current = confirmationResult;
      setOtpStep("code");
    } catch (err) {
      console.error("Send OTP failed:", err);
      setOtpError(err.message || "Couldn't send OTP. Please try again.");
      if (recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current.clear();
        recaptchaVerifierRef.current = null;
      }
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setOtpError("");
    if (!otpCode || otpCode.length < 6) {
      setOtpError("Please enter the 6-digit code");
      return;
    }
    setOtpLoading(true);
    try {
      const result = await confirmationResultRef.current.confirm(otpCode);
      const idToken = await result.user.getIdToken();

      const res = await axios.post(`${API_URL}/api/auth/phone-login`, { idToken }, { withCredentials: true });

      login(res.data.user, res.data.token);
      createSound("success");
      setPage("home");
      window.scrollTo(0, 0);
    } catch (err) {
      console.error("Verify OTP failed:", err);
      setOtpError(err.response?.data?.message || err.message || "Invalid or expired code");
    } finally {
      setOtpLoading(false);
    }
  };

  const inputStyle = {
    width: "100%", padding: "12px 14px", borderRadius: 10,
    border: "1px solid rgba(124,58,237,0.2)", background: "#fff",
    color: "#0a0a0a", fontSize: 14, outline: "none", boxSizing: "border-box",
  };

  return (
    <div style={{ paddingTop: 100, minHeight: "100vh", background: "#fff" }}>
      <style>{`
        @keyframes wordFloat { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-10px); } }
        @keyframes writeIn { 0% { opacity: 0; transform: translateY(10px) scale(0.8); } 100% { opacity: 1; transform: translateY(0px) scale(1); } }
      `}</style>

      <div style={{ height: 240, overflow: "hidden", position: "relative" }}>
        <img src="https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=1400&q=80" alt="Dairy farm" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom,rgba(5,5,5,0.2),rgba(5,5,5,0.9))", display: "flex", alignItems: "flex-end", padding: "clamp(16px,4vw,40px) clamp(16px,5vw,60px)" }}>
          <div>
            <Badge label={mode === "login" ? "Welcome Back" : "Join Us"} color="#f9c74f" />
            <h1 style={{ fontFamily: "'Playfair Display',serif", fontWeight: 900, fontSize: "clamp(28px,5vw,56px)", marginTop: 12 }}>
              {(mode === "login" ? "Welcome Back" : "Join the Farm").split(" ").map((word, i) => (
                <span key={`line1-${i}`} style={{ display: "inline-block", marginRight: "0.3em", opacity: 0, color: "#fff", animation: `writeIn 0.5s ease-out ${i * 0.2}s forwards, wordFloat 2.5s ease-in-out ${i * 0.15 + 1}s infinite` }}>{word}</span>
              ))}
              <br />
              {(mode === "login" ? "CNN Family" : "Family").split(" ").map((word, i) => (
                <span key={`line2-${i}`} style={{ display: "inline-block", marginRight: "0.3em", opacity: 0, background: "linear-gradient(135deg,#f9c74f,#facc15)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", animation: `writeIn 0.5s ease-out ${(i + 2) * 0.2}s forwards, wordFloat 2.5s ease-in-out ${(i + 4) * 0.15 + 1}s infinite` }}>{word}</span>
              ))}
            </h1>
          </div>
        </div>
      </div>

      <div style={{ background: "#fff", padding: "70px 24px 100px" }}>
        <div className="login-grid" style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gap: 48, alignItems: "center" }}>
          <div>
            <h2 style={{ fontFamily: "'Playfair Display',serif", fontWeight: 900, fontSize: 38, marginBottom: 16 }}>
              {mode === "login" ? "Good to" : "Happy to"}<br />
              <span style={{ background: "linear-gradient(135deg,#7c3aed,#a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                {mode === "login" ? "See You" : "Have You"}
              </span>
            </h2>
            <p style={{ color: "rgba(11, 11, 11, 0.95)", marginBottom: 40, lineHeight: 1.8 }}>
              {mode === "login" ? "Log in to manage your subscriptions, track orders, and enjoy member benefits." : "Create your account to start receiving fresh dairy every morning."}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {[
                ["🥛", "rgba(0,180,216,0.15)", "rgba(0,180,216,0.3)", "#00b4d8", "Member Perks", "Exclusive discounts", "On every subscription"],
                ["🚚", "rgba(249,199,79,0.15)", "rgba(249,199,79,0.3)", "#f9c74f", "Delivery", "Priority delivery slots", "Choose your preferred time"],
                ["📊", "rgba(124,58,237,0.15)", "rgba(124,58,237,0.3)", "#a78bfa", "Tracking", "Order history & tracking", "Everything in one place"],
                ["🔔", "rgba(57,211,83,0.15)", "rgba(57,211,83,0.3)", "#39d353", "Alerts", "Restock notifications", "Never run out of milk"],
              ].map(([ic, bg, br, color, label, val, sub]) => (
                <div key={label} style={{ borderRadius: 16, padding: "18px 20px", display: "flex", gap: 14, alignItems: "center", background: "#f5f3ff", border: "1px solid rgba(124,58,237,0.15)" }}>
                  <div style={{ width: 46, height: 46, borderRadius: 12, background: bg, border: `1px solid ${br}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{ic}</div>
                  <div>
                    <div style={{ fontSize: 11, color: "rgba(11,11,11,0.95)", marginBottom: 2 }}>{label}</div>
                    <div style={{ fontWeight: 700, fontSize: 15, color }}>{val}</div>
                    <div style={{ fontSize: 12, color: "rgba(11,11,11,0.95)" }}>{sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ borderRadius: 28, padding: "36px", background: "#f5f3ff", border: "1px solid rgba(124,58,237,0.15)" }}>
            {!showOtp ? (
              <>
                <div style={{ display: "flex", gap: 0, marginBottom: 30, background: "#fff", borderRadius: 12, padding: 4, border: "1px solid rgba(124,58,237,0.15)" }}>
                  {["login", "signup"].map(m => (
                    <button key={m} onClick={() => { createSound("nav"); setMode(m); setError(""); }} style={{ flex: 1, padding: "10px", border: "none", cursor: "pointer", borderRadius: 9, fontSize: 14, fontWeight: 600, fontFamily: "'Syne',sans-serif", background: mode === m ? "linear-gradient(135deg,#7c3aed,#a78bfa)" : "transparent", color: mode === m ? "#fff" : "rgba(11,11,11,0.95)", transition: "all .3s" }}>
                      {m === "login" ? "Log In" : "Sign Up"}
                    </button>
                  ))}
                </div>

                {success && <div style={{ background: "rgba(57,211,83,0.12)", border: "1px solid rgba(57,211,83,0.35)", borderRadius: 12, padding: "13px 17px", marginBottom: 20, color: "#1a8a3d", fontWeight: 600 }}>{success}</div>}

                {mode === "signup" && (
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ display: "block", fontSize: 13, color: "rgba(11,11,11,0.95)", marginBottom: 6 }}>Full Name</label>
                    <input placeholder="Your full name" value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
                  </div>
                )}

                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: "block", fontSize: 13, color: "rgba(11,11,11,0.95)", marginBottom: 6 }}>Email Address</label>
                  <input type="email" placeholder="you@email.com" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} />
                </div>

                {mode === "signup" && (
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ display: "block", fontSize: 13, color: "rgba(11,11,11,0.95)", marginBottom: 6 }}>Phone</label>
                    <input type="tel" placeholder="+91 XXXXX XXXXX" value={phone} onChange={e => setPhone(e.target.value)} style={inputStyle} />
                  </div>
                )}

                <div style={{ marginBottom: 22 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <label style={{ fontSize: 13, color: "rgba(11,11,11,0.95)" }}>Password</label>
                    {mode === "login" && <span style={{ fontSize: 12, color: "#7c3aed", cursor: "pointer" }}>Forgot password?</span>}
                  </div>
                  <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} style={inputStyle} />
                </div>

                {error && <div style={{ color: "#dc2626", fontSize: 13, marginBottom: 14, textAlign: "center" }}>{error}</div>}

                <Btn variant="gold" onClick={handleSubmit} style={{ width: "100%", fontSize: 16, padding: "14px", display: "block", textAlign: "center" }}>
                  {loading ? "Please wait..." : mode === "login" ? "Log In →" : "Create Account →"}
                </Btn>

                <div style={{ height: 1, background: "linear-gradient(90deg,transparent,rgba(124,58,237,0.3),transparent)", margin: "22px 0" }} />

                <Btn variant="ghost" onClick={() => { setShowOtp(true); setOtpStep("phone"); setOtpError(""); }} style={{ width: "100%", fontSize: 14, padding: "12px", display: "block", textAlign: "center" }}>
                  📱 Continue with Phone OTP
                </Btn>
              </>
            ) : (
              <>
                <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, marginBottom: 20, textAlign: "center" }}>
                  {otpStep === "phone" ? "Log in with Phone" : "Enter the Code"}
                </h3>

                {otpStep === "phone" ? (
                  <>
                    <div style={{ marginBottom: 18 }}>
                      <label style={{ display: "block", fontSize: 13, color: "rgba(11,11,11,0.95)", marginBottom: 6 }}>Phone Number</label>
                      <input type="tel" placeholder="+91 XXXXX XXXXX" value={otpPhone} onChange={e => setOtpPhone(e.target.value)} style={inputStyle} />
                    </div>
                    {otpError && <div style={{ color: "#dc2626", fontSize: 13, marginBottom: 14, textAlign: "center" }}>{otpError}</div>}
                    <Btn variant="gold" onClick={handleSendOtp} style={{ width: "100%", fontSize: 16, padding: "14px", display: "block", textAlign: "center" }}>
                      {otpLoading ? "Sending..." : "Send Code →"}
                    </Btn>
                  </>
                ) : (
                  <>
                    <p style={{ fontSize: 13, color: "rgba(11,11,11,0.7)", marginBottom: 18, textAlign: "center" }}>We sent a 6-digit code to {otpPhone}</p>
                    <div style={{ marginBottom: 18 }}>
                      <label style={{ display: "block", fontSize: 13, color: "rgba(11,11,11,0.95)", marginBottom: 6 }}>Verification Code</label>
                      <input type="text" inputMode="numeric" maxLength={6} placeholder="123456" value={otpCode} onChange={e => setOtpCode(e.target.value.replace(/\D/g, ""))} style={{ ...inputStyle, letterSpacing: 4, textAlign: "center", fontSize: 20 }} />
                    </div>
                    {otpError && <div style={{ color: "#dc2626", fontSize: 13, marginBottom: 14, textAlign: "center" }}>{otpError}</div>}
                    <Btn variant="gold" onClick={handleVerifyOtp} style={{ width: "100%", fontSize: 16, padding: "14px", display: "block", textAlign: "center" }}>
                      {otpLoading ? "Verifying..." : "Verify & Log In →"}
                    </Btn>
                  </>
                )}

                <div style={{ height: 1, background: "linear-gradient(90deg,transparent,rgba(124,58,237,0.3),transparent)", margin: "22px 0" }} />

                <Btn variant="ghost" onClick={() => { setShowOtp(false); setOtpStep("phone"); setOtpPhone(""); setOtpCode(""); setOtpError(""); }} style={{ width: "100%", fontSize: 14, padding: "12px", display: "block", textAlign: "center" }}>
                  ← Back to Email Login
                </Btn>
              </>
            )}

            <div id="recaptcha-container"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
/* ─────────────────────────────────────────────
   HOME SECTIONS (Products preview + Families preview)
───────────────────────────────────────────── */
function HomeSections({ setPage, addToCart, PRODUCTS }) {
  return (
    <>
    <MarqueeBand />
      {/* Products preview */}
      <section className="section-pad" style={{ background: "#fff", padding: "90px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <SectionHead badge="Farm Fresh" badgeColor="#ff6b35" title="Our Products" titleClass="tg-gold"
            sub="Pure A2 dairy, ghee & artisan products made with zero additives and maximum love." />
          <div className="products-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 24, marginBottom: 44 }}>
            {PRODUCTS.slice(0, 3).map(p => <ProductCard key={p.id} p={p} addToCart={addToCart} />)}
          </div>
          <div style={{ textAlign: "center" }}>
            <Btn variant="orange" onClick={() => { setPage("products"); window.scrollTo(0, 0); }} style={{ fontSize: 15, padding: "13px 30px" }}>View All Products →</Btn>
          </div>
        </div>
      </section>

     {/* Farm strip */}
<section style={{ position: "relative", height: 440, overflow: "hidden" }}>
  <div
    style={{
      width: "90%",
      height: "100%",
      margin: "0 auto",
      position: "relative",
      borderRadius: 24,
      overflow: "hidden",
      boxShadow: "0 20px 50px rgba(0,0,0,0.35)",
      border: "1px solid rgba(255,255,255,0.08)",
    }}
  >
    <img
      src="https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=1400&q=80"
      alt="Farm"
      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
    />
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(0,0,0,0.65)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 16px",
      }}
    >
      <div style={{ textAlign: "center", maxWidth: 500 }}>
        <Badge label="Est. 2009 · Karnataka" color="#00b4d8" />
        <h2
          style={{
            fontFamily: "'Playfair Display',serif",
            fontWeight: 900,
            fontSize: "clamp(22px,5vw,48px)",
            margin: "20px 0 16px",
            color: "#fff",
          }}
        >
          <span className="tg-farm">15 Years of Pure</span>
          <br />
          Farming Tradition
        </h2>
        <p
          style={{
            color: "rgba(255,255,255,0.8)",
            marginBottom: 30,
            lineHeight: 1.8,
            fontSize: "clamp(13px,3vw,16px)",
          }}
        >
          80+ Gir cows. 45 acres of organic land. Vedic farming methods. Every drop tells a story.
        </p>
        <Btn
          variant="farm"
          onClick={() => {
            setPage("farm");
            window.scrollTo(0, 0);
          }}
          style={{ fontSize: 15, padding: "13px 28px" }}
        >
          Discover Our Farm →
        </Btn>
      </div>
    </div>
  </div>
</section>
      {/* Subscription preview */}
<section className="section-pad" style={{ background: "#fff", padding: "90px 24px", position: "relative", overflow: "hidden" }}>
  <div style={{ maxWidth: 1100, margin: "0 auto", position: "relative" }}>
    <SectionHead badge="Daily Delivery" badgeColor="#39d353" title="Subscribe & Save" titleClass="tg-sub"
      sub="Fresh dairy at your doorstep every morning. No trips, no compromise." />

    <div className="sub-plans-grid" style={{ display: "grid", gap: 28, marginBottom: 44, alignItems: "start" }}>
      {PLANS.map((pl, i) => (
        <div
          key={pl.id}
          className="plan-card-animated"
          style={{
            position: "relative",
            borderRadius: 24,
            overflow: "hidden",
            cursor: "pointer",
            background: "#f5f3ff",
            border: pl.popular ? `2px solid ${pl.color}` : "1px solid rgba(124,58,237,0.15)",
            transform: pl.popular ? "translateY(-10px)" : "none",
            boxShadow: pl.popular ? `0 24px 60px ${pl.color}44` : "none",
            transition: "transform .45s cubic-bezier(.22,1,.36,1), box-shadow .45s ease",
            animation: `floatCard 5s ease-in-out ${i * 0.4}s infinite`,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = `translateY(${pl.popular ? -14 : -8}px)`;
            e.currentTarget.style.boxShadow = `0 30px 60px ${pl.color}44`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = pl.popular ? "translateY(-10px)" : "none";
            e.currentTarget.style.boxShadow = pl.popular ? `0 24px 60px ${pl.color}44` : "none";
          }}
        >
          {/* Popular banner */}
          {pl.popular && (
            <div style={{
              background: `linear-gradient(135deg,${pl.color},${pl.color}88)`,
              textAlign: "center",
              padding: "10px",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: 1,
              color: "#020f05",
            }}>
              ★ MOST POPULAR
            </div>
          )}

          {/* Glowing blob behind price */}
          <div style={{
            position: "absolute",
            top: pl.popular ? 40 : 10,
            left: "50%",
            transform: "translateX(-50%)",
            width: 200,
            height: 200,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${pl.color}22 0%, transparent 70%)`,
            filter: "blur(10px)",
            pointerEvents: "none",
            animation: "pulseBlob 4s ease-in-out infinite",
          }} />

          <div style={{ padding: "30px 28px", position: "relative" }}>
            <div style={{ fontSize: 13, color: pl.color, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>
              {pl.name}
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 6 }}>
              <span style={{ fontFamily: "'Playfair Display',serif", fontWeight: 900, fontSize: 40, color: "#000" }}>
                ₹{pl.price.toLocaleString()}
              </span>
              <span style={{ color: "rgba(11,11,11,0.6)", fontSize: 14 }}>/{pl.period}</span>
            </div>
            <div style={{ color: "rgba(11,11,11,0.6)", fontSize: 12, marginBottom: 26 }}>Billed monthly</div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 28 }}>
              {pl.items.map(item => (
                <div key={item} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13, color: "rgba(11, 11, 11, 0.95)" }}>
                  <span style={{ color: pl.color, flexShrink: 0, marginTop: 1 }}>✓</span>{item}
                </div>
              ))}
            </div>

            <Btn
              variant={pl.popular ? "sub" : "ghost"}
              onClick={() => { setPage("subscription"); window.scrollTo(0, 0); }}
              style={{
                width: "100%",
                justifyContent: "center",
                fontSize: 14,
                padding: "13px",
                background: pl.popular ? `linear-gradient(135deg,${pl.color},${pl.color}cc)` : undefined,
                color: pl.popular ? "#020f05" : undefined,
              }}
            >
              {pl.popular ? "✓ Selected" : "Select Plan"}
            </Btn>
          </div>
        </div>
      ))}
    </div>

    <div style={{ textAlign: "center" }}>
      <Btn variant="sub" onClick={() => { setPage("subscription"); window.scrollTo(0, 0); }} style={{ fontSize: 15, padding: "13px 30px" }}>See All Plans →</Btn>
    </div>
  </div>
</section>
{/* Families preview */}
      <section className="section-pad" style={{ background: "#fff", padding: "90px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <SectionHead badge="Real Stories" badgeColor="#ff9a9e" title="Loved by Families" titleClass="tg-family" />
          <div className="families-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 24, marginBottom: 44 }}>
            {FAMILIES.slice(0, 3).map((f, i) => (
              <div key={i} style={{ borderRadius: 20, overflow: "hidden", background: "#f5f3ff", border: "1px solid rgba(255,154,158,0.25)" }}>
                <div style={{ height: 160, overflow: "hidden" }}>
                  <img src={f.img} alt={f.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
                <div style={{ padding: "18px 20px" }}>
                  <Stars n={5} />
                  <p style={{ color: "rgba(11, 11, 11, 0.95)", fontSize: 13, fontStyle: "italic", margin: "10px 0 12px", lineHeight: 1.7 }}>"{f.quote.slice(0, 80)}…"</p>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#0a0a0a" }}>{f.name}</div>
                  <div style={{ color: "#ff9a9e", fontSize: 12 }}>Member since {f.since}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ textAlign: "center" }}>
            <Btn variant="family" onClick={() => { setPage("families"); window.scrollTo(0, 0); }} style={{ fontSize: 15, padding: "13px 30px" }}>Meet All Families →</Btn>
          </div>
        </div>
      </section>
    </>
  );
}

/* ─────────────────────────────────────────────
   FOOTER
───────────────────────────────────────────── */
function Footer({ setPage }) {
  const go = (p) => { createSound("nav"); setPage(p); window.scrollTo(0, 0); };
  return (
    <footer style={{ background: "#060b1f", borderTop: "1px solid rgba(124,58,237,0.2)", padding: "60px 24px 30px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div className="footer-grid" style={{ display: "grid", gap: 40, marginBottom: 50 }}>
          {/* Brand */}
          <div className="footer-brand">
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <div style={{ width: 38, height: 38, borderRadius: 9, background: "linear-gradient(135deg,#f9c74f,#f3722c)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🌿</div>
              <span style={{ fontFamily: "'Playfair Display',serif", fontWeight: 900, fontSize: 17 }}><span className="tg-gold">CNN</span> Farm Hub</span>
            </div>
            <p style={{ color: "rgba(101, 15, 15, 0.45)", fontSize: 14, lineHeight: 1.8, marginBottom: 20 }}>Farm-fresh A2 dairy delivered to your doorstep every morning. Pure. Natural. Trusted since 2009.</p>
            <div style={{ display: "flex", gap: 10 }}>
              {["📘", "📷", "🐦", "📱"].map((ic, i) => (
                <button key={i} onClick={() => createSound("click")} style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(124,58,237,0.2)", border: "1px solid rgba(124,58,237,0.35)", color: "#000", cursor: "pointer", fontSize: 16 }}>{ic}</button>
              ))}
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h4 style={{ fontWeight: 700, fontSize: 14, color: "#7c3aed", marginBottom: 18, letterSpacing: 1, textTransform: "uppercase" }}>Quick Links</h4>
            {["home", "products", "farm", "families", "subscription", "contact"].map(l => (
              <div key={l} onClick={() => go(l)} style={{ color: "rgba(194, 55, 55, 0.5)", fontSize: 14, marginBottom: 10, cursor: "pointer", textTransform: "capitalize", transition: "color .25s" }}
                onMouseEnter={e => e.target.style.color = "#a78bfa"}
                onMouseLeave={e => e.target.style.color = "rgba(255,255,255,0.5)"}>{l === "farm" ? "Our Farm" : l}</div>
            ))}
          </div>

          {/* Products */}
          <div>
            <h4 style={{ fontWeight: 700, fontSize: 14, color: "#f9c74f", marginBottom: 18, letterSpacing: 1, textTransform: "uppercase" }}>Products</h4>
            {["A2 Desi Milk", "Bilona Ghee", "Fresh Paneer", "Cultured Dahi", "White Butter", "Farm Lassi"].map(p => (
              <div key={p} style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, marginBottom: 10 }}>{p}</div>
            ))}
          </div>

          {/* Contact */}
          <div>
            <h4 style={{ fontWeight: 700, fontSize: 14, color: "#39d353", marginBottom: 18, letterSpacing: 1, textTransform: "uppercase" }}>Contact</h4>
            {[["📞", "+91 8618854283"], ["📧", "cnnfarmhub@gmail.com"], ["📍", "Chinnappanahalli, Karnataka"], ["🕐", "Mon–Sat 6AM–9PM"]].map(([ic, v]) => (
              <div key={v} style={{ display: "flex", gap: 8, color: "rgba(255,255,255,0.5)", fontSize: 13, marginBottom: 10 }}><span>{ic}</span><span>{v}</span></div>
            ))}
            <div style={{ marginTop: 18 }}>
<Btn
                variant="sub"
                onClick={() => {
                  const message = encodeURIComponent("Hi! I'd like to place an order with CNN Farm Hub.");
                  window.open(`https://wa.me/918618854283?text=${message}`, "_blank");
                }}
                style={{ fontSize: 13, padding: "10px 18px" }}
              >
                📱 WhatsApp Order
              </Btn>            </div>
          </div>
        </div>

        <div style={{ height: 1, background: "linear-gradient(90deg,transparent,rgba(124,58,237,0.4),rgba(57,211,83,0.3),transparent)", marginBottom: 26 }} />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 13 }}>© 2025 CNN Farm Hub · Chinnappanahalli, Karnataka · All rights reserved</div>
          <div style={{ display: "flex", gap: 20 }}>
            {["Privacy Policy", "Terms of Service", "Refund Policy"].map(l => (
              <span key={l} style={{ color: "rgba(255,255,255,0.35)", fontSize: 12, cursor: "pointer" }} onClick={() => createSound("click")}>{l}</span>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 12 }}>Payments via</span>
            <span style={{ background: "rgba(255,255,255,0.08)", borderRadius: 6, padding: "3px 10px", fontSize: 12, fontWeight: 700, color: "#00b4d8" }}>Razorpay</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ─────────────────────────────────────────────
   PAGE TRANSITION WRAPPER
───────────────────────────────────────────── */
function PageWrapper({ children, page }) {
  const [key, setKey] = useState(page);
  useEffect(() => { setKey(page); }, [page]);
  return (
    <div key={key} style={{ animation: "pageSlide .5s cubic-bezier(.22,1,.36,1) forwards" }}>
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────
   BOTTOM SWITCHER (floating nav)
───────────────────────────────────────────── */
function BottomSwitcher({ page, setPage }) {
  const tabs = [
    { id: "home", icon: "🏠", label: "Home" },
    { id: "products", icon: "🥛", label: "Products" },
    { id: "farm", icon: "🌿", label: "Farm" },
    { id: "families", icon: "👨‍👩‍👧", label: "Families" },
    { id: "subscription", icon: "📦", label: "Subscribe" },
    { id: "contact", icon: "💬", label: "Contact" },
  ];
  return (
    <div style={{
      position: "fixed", bottom: 22, left: "50%", transform: "translateX(-50%)",
      zIndex: 1001, display: "flex", gap: 4,
      background: "rgba(10,10,10,0.92)", backdropFilter: "blur(24px)",
      border: "1px solid rgba(255,255,255,0.1)", borderRadius: 100, padding: "7px 14px",
    }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => { createSound("nav"); setPage(t.id); window.scrollTo(0, 0); }} style={{
          padding: "6px 14px", borderRadius: 100, border: "none", cursor: "pointer",
          fontFamily: "'Syne',sans-serif", fontWeight: 600, fontSize: 11,
          background: page === t.id ? "linear-gradient(135deg,#f9c74f,#f3722c)" : "transparent",
          color: page === t.id ? "#0a0000" : "rgba(255,255,255,0.45)",
          transition: "all .25s", textTransform: "capitalize", display: "flex", alignItems: "center", gap: 5,
        }}>
          <span style={{ fontSize: 14 }}>{t.icon}</span>
          <span style={{ display: page === t.id ? "inline" : "none" }}>{t.label}</span>
        </button>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   TOAST NOTIFICATION
───────────────────────────────────────────── */
function Toast({ msg, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 2500); return () => clearTimeout(t); }, []);
  return (
    <div style={{
      position: "fixed", top: 88, right: 24, zIndex: 2000,
      background: "linear-gradient(135deg,#39d353,#00b894)", color: "#020f05",
      borderRadius: 14, padding: "14px 22px", fontWeight: 700, fontSize: 14,
      animation: "slideDown .35s ease forwards", boxShadow: "0 8px 32px rgba(57,211,83,0.4)",
    }}>
      {msg}
    </div>
  );
}
/* ─────────────────────────────────────────────
   <FloatingParticles />
───────────────────────────────────────────── */
function Particles() {
  const particles = Array(18).fill(0).map((_, i) => ({
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 15}s`,
    dur: `${12 + Math.random() * 10}s`,
    size: `${3 + Math.random() * 4}px`,
    color: ["#f9c74f", "#39d353", "#00b4d8", "#ff6b35", "#a78bfa"][i % 5],
  }));
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
      {particles.map((p, i) => (
        <div key={i} style={{
          position: "absolute", bottom: "-10px", left: p.left,
          width: p.size, height: p.size, borderRadius: "50%", background: p.color,
          animation: `particle ${p.dur} ${p.delay} ease-in-out infinite`,
          opacity: 0.6,
        }} />
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   ROOT APP
───────────────────────────────────────────── */
export default function App() {
  const [page, setPage] = useState("home");
  const [cart, setCart] = useState([]);
  const [PRODUCTS, setPRODUCTS] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
 
 useEffect(() => {
    let cancelled = false;

    const loadProducts = async (attempt = 1) => {
      try {
        const res = await fetch(`${API_URL}/api/products`);
        if (!res.ok) throw new Error(`Failed to load products (${res.status})`);
        const data = await res.json();
        const normalized = data.map(p => ({ ...p, id: p._id, img: p.image }));
        if (!cancelled) {
          setPRODUCTS(normalized);
          setProductsLoading(false);
        }
      } catch (err) {
        console.error(`Failed to load products (attempt ${attempt}):`, err);
        // Render free tier can take 30-60s to wake up from sleep — retry a few times
        // with increasing delay instead of giving up after one failed attempt.
        if (attempt < 5 && !cancelled) {
          setTimeout(() => loadProducts(attempt + 1), attempt * 4000);
        } else if (!cancelled) {
          setProductsLoading(false);
        }
      }
    };

    loadProducts();
    return () => { cancelled = true; };
  }, []);
  const [toast, setToast] = useState(null);

  // Inject CSS once
  useEffect(() => {
    if (!document.getElementById("cnn-styles")) {
      const s = document.createElement("style");
      s.id = "cnn-styles";
      s.textContent = CSS + `
        @keyframes particle{0%{transform:translateY(0);opacity:.7}100%{transform:translateY(-100vh);opacity:0}}
        @media(max-width:768px){
          .nav-desktop{display:none!important}
          .ham{display:block!important}
        }
      `;
      document.head.appendChild(s);
    }
  }, []);

  const addToCart = useCallback(async (product) => {
  const token = localStorage.getItem("token");
  if (!token) {
    setToast("Please log in to add items to your cart");
    setPage("login"); // adjust if your login route is named differently
    return;
  }
 
  const productId = product._id || product.id;

  try {
    const res = await fetch(`${API_URL}/api/cart/add`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ productId, quantity: 1 }),
    });
 
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || `Request failed (${res.status})`);
    }
 
    const updatedCart = await res.json();
    createSound("add");
 
    // Keep the local `cart` array (drives your nav badge) in sync with
   setCart(
      updatedCart.items
        .filter(i => i.productId) // skip items whose product was deleted
        .map(i => ({
          id: i.productId._id,
          name: i.productId.name,
          price: i.productId.price,
          img: i.productId.image,
          unit: i.productId.unit,
          qty: i.quantity,
        }))
    );
 
    setToast(`🥛 ${product.name} added to cart!`);
  } catch (err) {
    console.error("Add to cart failed:", err);
    setToast(`Couldn't add to cart: ${err.message}`);
  }
}, []);
  const navigate = (p) => { setPage(p); window.scrollTo(0, 0); };

  const renderPage = () => {
    switch (page) {
      case "home": return (
        <>
          <Hero setPage={navigate} />
          <HomeSections setPage={navigate} addToCart={addToCart} PRODUCTS={PRODUCTS} />
        </>
      );
      case "products": return productsLoading
        ? <div style={{ paddingTop: 140, textAlign: "center", color: "rgba(11,11,11,0.5)" }}>Loading products…</div>
        : <ProductsPage addToCart={addToCart} PRODUCTS={PRODUCTS} />;
      case "farm": return <FarmPage />;
      case "families": return <FamiliesPage setPage={navigate} />;
      case "subscription": return <SubPage setPage={navigate} />;
      case "contact": return <ContactPage />;
      case "cart": return <CartPage cart={cart} setCart={setCart} setPage={navigate} />;
      case "login": return <LoginPage setPage={navigate} />;
      case "admin": return <AdminPage />;
      default: return <Hero setPage={navigate} />;
    }
  };

  return (
  <div style={{ background: "#fbf3f3", minHeight: "100vh" }}>
    <Particles />
    <GrainOverlay opacity={0.04} />

      {/* Ambient blobs */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        <div className="blob" style={{ position: "absolute", top: "-10%", left: "-6%", width: 480, height: 480, background: "radial-gradient(circle,rgba(249,199,79,0.07) 0%,transparent 70%)" }} />
        <div className="blob" style={{ position: "absolute", bottom: "-15%", right: "-8%", width: 520, height: 520, background: "radial-gradient(circle,rgba(57,211,83,0.07) 0%,transparent 70%)", animationDelay: "-4s" }} />
        <div className="blob" style={{ position: "absolute", top: "40%", left: "55%", width: 300, height: 300, background: "radial-gradient(circle,rgba(0,180,216,0.05) 0%,transparent 70%)", animationDelay: "-8s" }} />
      </div>

      <Nav page={page} setPage={navigate} cart={cart} />

      <div style={{ position: "relative", zIndex: 1 }}>
        <PageWrapper page={page}>
          {renderPage()}
        </PageWrapper>
      </div>

      {!["cart", "login"].includes(page) && <Footer setPage={navigate} />}
      <BottomSwitcher page={page} setPage={navigate} />

      {toast && <Toast msg={toast} onDone={() => setToast(null)} />}

      {/* Spacer for bottom switcher */}
      <div style={{ height: 80 }} />
    </div>
  );
}