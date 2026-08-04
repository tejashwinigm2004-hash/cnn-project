import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { auth } from "./firebaseConfig";
import AdminPage from './AdminPage';
import axios from 'axios';
import API_URL from './config';
import logo from './logo.png';
import farmRangeBanner from './banner.jpeg';
import { useState, useEffect, useRef, useCallback } from "react";
import { CustomCursor, GrainOverlay, WordReveal, MarqueeBand, ScrollReveal, StatCounter, FloatingParticles } from './fx-components';
import { useAuth } from "./context/AuthContext";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// Fix Leaflet's default marker icon paths, which break under webpack/CRA bundling
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

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
  { id: "basic", name: "Starter", prices: { monthly: 1500, weekly: 1000, daily: 800 }, color: "#00b4d8", items: ["500ml A2 Milk Daily", "250g Curd Weekly", "Free Delivery", "WhatsApp Updates"], popular: false, maxItems: 2 },
  { id: "premium", name: "Premium", prices: { monthly: 3500, weekly: 3000, daily: 2500 }, color: "#39d353", items: ["1L A2 Milk Daily", "500g Ghee Monthly", "400g Paneer Weekly", "400g Dahi Weekly", "Free Priority Delivery", "Dedicated Manager"], popular: true, maxItems: 4 },
  { id: "family", name: "Family", prices: { monthly: 2000, weekly: 1500, daily: 1200 }, color: "#f9c74f", items: ["2L A2 Milk Daily", "1Kg Ghee Monthly", "500g Paneer Twice/Week", "Seasonal Products", "Doorstep Delivery 5AM", "WhatsApp Bot Ordering", "Monthly Farm Visit"], popular: false, maxItems: 6 },
];
/* Each plan now carries its own explicit price per billing frequency (set directly,
   not derived from a monthly/30 or /7 conversion) — see PLANS[].prices above. */
function getFreqPrice(plan, freq) {
  return plan?.prices?.[freq] ?? plan?.prices?.monthly ?? 0;
}

const FAMILIES = [
  { name: "Raghavendra Family", location: "Indiranagar, Bangalore", since: "2021", img: "https://images.unsplash.com/photo-1542644416-2289c587843e?w=400&q=80&crop=faces&fit=crop", quote: "Our kids love the A2 milk! We can taste the difference from store-bought dairy. Worth every rupee." },
  { name: "Priya & Suresh Kumar", location: "HSR Layout, Bangalore", since: "2022", img: "https://images.unsplash.com/photo-1533777419517-3e4017e2e15a?w=400&q=80&crop=faces&fit=crop", quote: "The ghee is absolutely divine. We use it for everything — pooja, cooking, even skin care!" },
  { name: "Meenakshi Iyer", location: "Koramangala, Bangalore", since: "2023", img: "https://images.unsplash.com/photo-1589169011402-8b2cbd1ee593?w=400&q=80&crop=faces&fit=crop", quote: "Fresh paneer every week without stepping out. The subscription model changed our kitchen routine." },
  { name: "Arjun & Deepa Nair", location: "Whitefield, Bangalore", since: "2020", img: "https://images.unsplash.com/photo-1659352790654-058e9077a4f4?w=400&q=80&crop=faces&fit=crop", quote: "Been with CNN Farm Hub for 4 years! They feel like family. Best decision we ever made." },
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
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,400&family=Syne:wght@400;600;700;800&family=Inter:wght@400;500;600;700;800&display=swap');
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
html{scroll-behavior:smooth;overflow-x:hidden;width:100%}
body{font-family:'Syne',sans-serif;background:var(--bg);color:#000;overflow-x:hidden}
::-webkit-scrollbar{width:4px}
::-webkit-scrollbar-track{background:var(--bg)}
::-webkit-scrollbar-thumb{background:linear-gradient(var(--gold1),var(--gold2));border-radius:3px}

@keyframes chatGreetingFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}@keyframes morphBlob{0%,100%{border-radius:60% 40% 30% 70%/60% 30% 70% 40%}50%{border-radius:30% 60% 70% 40%/50% 60% 30% 60%}}
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
  .cart-grid{grid-template-columns:minmax(0,1fr)!important}
  .cart-summary{position:static!important;min-width:0!important}
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
function SectionHead({ badge, badgeColor = "#f9c74f", title, titleClass = "tg-gold", sub, subColor = "rgba(255,255,255,0.5)" }) {
  return (
    <div style={{ textAlign: "center", marginBottom: 56 }}>
      <Badge label={badge} color={badgeColor} />
      <h2 style={{ fontFamily: "'Playfair Display',serif", fontWeight: 900, fontSize: "clamp(32px,5vw,52px)", lineHeight: 1.15, margin: "16px 0 14px" }}>
        <span className={titleClass}>{title}</span>
      </h2>
      {sub && <p style={{ color: subColor, fontSize: 16, maxWidth: 540, margin: "0 auto", lineHeight: 1.75 }}>{sub}</p>}
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
  const [accountOpen, setAccountOpen] = useState(false); // NEW: account icon dropdown
 
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
      if (!e.target.closest(".account-wrap")) setAccountOpen(false);
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
        maxWidth: 1280, margin: "0 auto", padding: isMobile ? "0 14px" : "0 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: isMobile ? 6 : 0,
      }}>
 
        {/* Logo */}
        <div onClick={() => go("home")} style={{ display: "flex", alignItems: "center", gap: isMobile ? 6 : 10, cursor: "pointer", minWidth: 0, flexShrink: 1 }}>
          <div style={{ width: isMobile ? 32 : 40, height: isMobile ? 32 : 40, borderRadius: 10, overflow: "hidden", flexShrink: 0 }}>
            <img src={logo} alt="logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          </div>
          <span style={{ display: "flex", flexDirection: "column", lineHeight: "1.1", minWidth: 0 }}>
            <span style={{ fontSize: isMobile ? 12 : 16, fontWeight: 700, color: "#f9c74f", whiteSpace: "nowrap" }}>CNN Organic</span>
            <span style={{ fontSize: isMobile ? 11 : 15, fontWeight: 600, color: "#2e7d32", whiteSpace: "nowrap" }}>Fresh Farm</span>
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
        <div style={{ display: "flex", gap: isMobile ? 6 : 10, alignItems: "center", flexShrink: 0 }}>
          {!user && (
            <Btn variant="ghost" onClick={() => go("login")} style={{ padding: isMobile ? "6px 10px" : "8px 16px", fontSize: isMobile ? 12 : 13 }}>
              Login
            </Btn>
          )}

          <Btn variant="gold" onClick={() => go("cart")} style={{ padding: isMobile ? "6px 10px" : "8px 16px", fontSize: isMobile ? 12 : 13 }}>
            🛒{!isMobile && " Cart"} {cart.length > 0 && (
              <span style={{ background: "#ff3b30", borderRadius: "50%", padding: "1px 6px", fontSize: 11, marginLeft: 4 }}>
                {cart.length}
              </span>
            )}
          </Btn>

          {user && (
            <div className="account-wrap" style={{ position: "relative" }}>
              <button
                onClick={() => { createSound("nav"); setAccountOpen(v => !v); }}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  border: "none", cursor: "pointer", background: "transparent",
                  padding: "4px 6px 4px 4px", borderRadius: 20,
                  boxShadow: accountOpen ? "0 0 0 2px rgba(249,199,79,0.5)" : "none",
                }}
                aria-label="Account menu"
              >
                <span style={{
                  width: isMobile ? 28 : 34, height: isMobile ? 28 : 34, borderRadius: "50%",
                  background: "linear-gradient(135deg,#f9c74f,#f3722c)",
                  color: "#0b0b0b", fontWeight: 700, fontSize: isMobile ? 12 : 14,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  {(user.name?.[0] || "U").toUpperCase()}
                </span>
              </button>

              {accountOpen && (
                <div className="glass" style={{
                  position: "absolute", top: "calc(100% + 10px)", right: 0,
                  minWidth: 200, borderRadius: 12, padding: "10px 0",
                  background: "rgba(252,249,249,0.98)",
                  boxShadow: "0 12px 30px rgba(0,0,0,0.15)",
                  border: "1px solid rgba(0,0,0,0.06)",
                  animation: "slideDown .2s ease", zIndex: 1100,
                }}>
                  <div style={{ padding: "6px 16px 10px", borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "#0b0b0b" }}>
                      {user.name || "there"}
                    </div>
                    {user.email && (
                      <div style={{ fontSize: 12, color: "rgba(11,11,11,0.6)", marginTop: 2 }}>
                        {user.email}
                      </div>
                    )}
                  </div>
                  <div
                    onClick={() => { setAccountOpen(false); go("account"); }}
                    style={{
                      padding: "10px 16px", cursor: "pointer", fontSize: 13, fontWeight: 600,
                      color: "#0b0b0b",
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "rgba(0,0,0,0.04)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                  >
                    Profile
                  </div>
                  <div
                    onClick={() => { setAccountOpen(false); handleLogout(); }}
                    style={{
                      padding: "10px 16px", cursor: "pointer", fontSize: 13, fontWeight: 600,
                      color: "#c0392b",
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "rgba(0,0,0,0.04)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                  >
                    Logout
                  </div>
                </div>
              )}
            </div>
          )}

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
          <img
            src={farmRangeBanner}
            alt="Explore our farm range: pure dairy, fresh vegetables & fruits"
            onClick={() => setPage("products")}
            style={{
              width: "100%",
              maxWidth: 620,
              borderRadius: 18,
              cursor: "pointer",
              display: "block",
            }}
          />

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
  const [added, setAdded] = useState(false);

  return (
    <div
      style={{
        borderRadius: 24,
        overflow: "hidden",
        width: "100%",
        maxWidth: 340,
        display: "flex",
        flexDirection: "column",
        margin: "0 auto",
        background: "#fff",
        border: "1px solid rgba(0,0,0,0.06)",
        boxShadow: "0 6px 20px rgba(0,0,0,0.06)",
        transition: "transform .3s ease, box-shadow .3s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-4px)";
        e.currentTarget.style.boxShadow = "0 14px 30px rgba(0,0,0,0.1)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "none";
        e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.06)";
      }}
    >
      <div style={{ position: "relative", width: "100%", aspectRatio: "1 / 1", overflow: "hidden", background: "#f5f3ff" }}>
        <img
          src={p.img}
          alt={p.name}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
        <div style={{ position: "absolute", top: 16, left: 16 }}>
          <Badge label={p.badge} color={p.badgeColor} />
        </div>
      </div>

      <div style={{ padding: "16px 16px 18px", display: "flex", flexDirection: "column", flex: 1 }}>
        <h3 style={{ fontFamily: "'Playfair Display',serif", fontWeight: 800, fontSize: 15, marginBottom: 4, color: "#0a0a0a", lineHeight: 1.25 }}>
          {p.name}
        </h3>
        <span style={{ color: "rgba(11,11,11,0.55)", fontSize: 11, marginBottom: 12 }}>{p.category}</span>

        <div style={{ marginTop: "auto" }}>
          <div style={{ marginBottom: 10 }}>
            <span className="tg-gold price-val" style={{ fontFamily: "'Playfair Display',serif", fontSize: 17, fontWeight: 900 }}>₹{p.price}</span>
            <span style={{ color: "rgba(11,11,11,0.6)", fontSize: 11, marginLeft: 4 }}>/{p.unit}</span>
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
              setTimeout(() => setAdded(false), 900);
            }}
            style={{ padding: "9px 14px", fontSize: 12.5, position: "relative", overflow: "hidden", width: "100%" }}
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
      <div style={{ maxWidth: 1600, margin: "0 auto", padding: "0 24px" }}>
        <SectionHead
          badge="Farm Fresh"
          badgeColor="#ff6b35"
          title="Our Products"
          titleClass="tg-gold"
          sub="Pure A2 dairy, ghee & artisan products made with zero additives and maximum love."
        />
        <style>{`
          .products-grid {
            display: grid;
            grid-template-columns: repeat(8, 1fr);
            gap: 18px;
            margin-top: 44px;
          }
          @media (max-width: 1400px) {
            .products-grid { grid-template-columns: repeat(6, 1fr); }
          }
          @media (max-width: 1100px) {
            .products-grid { grid-template-columns: repeat(4, 1fr); }
          }
          @media (max-width: 700px) {
            .products-grid { grid-template-columns: repeat(2, 1fr); }
          }
        `}</style>
        <div className="products-grid">
          {PRODUCTS.map((p) => (
            <ProductCard key={p.id} p={p} addToCart={addToCart} />
          ))}
        </div>
      </div>
    </div>
  );
}
/* ─────────────────────────────────────────────
   PROFILE PAGE (full account settings — web)
───────────────────────────────────────────── */
const genAddrId = () => Math.random().toString(36).slice(2, 10);

const LANGUAGES_WEB = [
  { code: "en", label: "English" },
  { code: "kn", label: "ಕನ್ನಡ (Kannada)" },
  { code: "hi", label: "हिन्दी (Hindi)" },
];

const DELIVERY_TIME_OPTIONS_WEB = [
  { value: "morning", label: "☀️ Morning" },
  { value: "evening", label: "🌙 Evening" },
];

function ToggleSwitch({ checked, onChange }) {
  return (
    <div
      onClick={() => onChange(!checked)}
      style={{
        width: 46, height: 26, borderRadius: 20, cursor: "pointer",
        background: checked ? "#f3722c" : "#ddd",
        position: "relative", transition: "background .2s ease", flexShrink: 0,
      }}
    >
      <div style={{
        width: 20, height: 20, borderRadius: "50%", background: "#fff",
        position: "absolute", top: 3, left: checked ? 23 : 3,
        transition: "left .2s ease", boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
      }} />
    </div>
  );
}

function ProfileSectionCard({ children, style = {} }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 16, padding: "20px 22px",
      border: "1px solid rgba(0,0,0,0.07)", marginBottom: 16,
      boxShadow: "0 2px 10px rgba(0,0,0,0.03)", ...style,
    }}>
      {children}
    </div>
  );
}

function ProfilePage({ setPage }) {
  const { user, logout, token } = useAuth();

  const profileInputStyle = {
    width: "100%", padding: "11px 14px", borderRadius: 10,
    border: "1px solid rgba(0,0,0,0.12)", background: "#faf9f9",
    color: "#0a0a0a", fontSize: 14, outline: "none", boxSizing: "border-box",
    marginBottom: 10,
  };

  // Profile edit
  const [editingProfile, setEditingProfile] = useState(false);
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [savingProfile, setSavingProfile] = useState(false);

  // Phone
  const [editingPhone, setEditingPhone] = useState(false);
  const [phone, setPhone] = useState(user?.phone || "");
  const [newPhone, setNewPhone] = useState("");
  const [savingPhone, setSavingPhone] = useState(false);

  // Avatar photo (local preview only — TODO: wire to real upload endpoint)
  const [photoUrl, setPhotoUrl] = useState(user?.photoUrl || null);

  // Addresses
  const [addresses, setAddresses] = useState(user?.addresses || []);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [addressLabel, setAddressLabel] = useState("");
  const [addressText, setAddressText] = useState("");
  const [addressInstructions, setAddressInstructions] = useState("");
  const [savingAddress, setSavingAddress] = useState(false);

  // Delivery time
  const [deliveryTime, setDeliveryTime] = useState(user?.deliveryTime || "morning");
  const [showDeliveryTimePicker, setShowDeliveryTimePicker] = useState(false);

  // Notifications
  const [notificationsEnabled, setNotificationsEnabled] = useState(user?.notificationsEnabled ?? true);

  // Language
  const [language, setLanguage] = useState(user?.language || "en");
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);

  // Password
  const [editingPassword, setEditingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  // Payment methods (real Razorpay saved cards — see routes/paymentMethods.js)
  const [savedCards, setSavedCards] = useState([]);
  const [cardsLoading, setCardsLoading] = useState(true);
  const [removingCardId, setRemovingCardId] = useState(null);

  useEffect(() => {
    if (!user || !token) { setCardsLoading(false); return; }
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/payment-methods`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setSavedCards(data.cards || []);
      } catch (err) {
        console.error("Failed to load payment methods:", err);
      } finally {
        setCardsLoading(false);
      }
    })();
  }, [user, token]);

  const handleRemoveCard = async (tokenId) => {
    if (!window.confirm("Remove this saved card?")) return;
    setRemovingCardId(tokenId);
    try {
      const res = await fetch(`${API_URL}/api/payment-methods/${tokenId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setSavedCards(prev => prev.filter(c => c.tokenId !== tokenId));
      } else {
        alert("Couldn't remove this card. Please try again.");
      }
    } catch (err) {
      console.error("Failed to remove card:", err);
      alert("Couldn't remove this card. Please try again.");
    } finally {
      setRemovingCardId(null);
    }
  };

  if (!user) {
    return (
      <div style={{ paddingTop: 140, textAlign: "center", paddingBottom: 80 }}>
        <p style={{ marginBottom: 20 }}>Please log in to view your account.</p>
        <Btn variant="orange" onClick={() => setPage("login")}>Go to Login</Btn>
      </div>
    );
  }

  const isAdmin = user.role === "admin";
  const currentLanguageLabel = LANGUAGES_WEB.find(l => l.code === language)?.label || "English";
  const currentDeliveryTimeLabel = DELIVERY_TIME_OPTIONS_WEB.find(o => o.value === deliveryTime)?.label || "☀️ Morning";

  const handleSaveProfile = async () => {
    if (!name.trim() || !email.trim()) {
      alert("Name and email are required.");
      return;
    }
    setSavingProfile(true);
    try {
      // TODO: connect to API — e.g. axios.put(`${API_URL}/api/auth/profile`, { name, email })
      setEditingProfile(false);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSavePhone = async () => {
    if (!newPhone.trim() || newPhone.trim().length < 10) {
      alert("Please enter a valid phone number.");
      return;
    }
    setSavingPhone(true);
    try {
      // TODO: connect to API — typically needs OTP verification
      setPhone(newPhone.trim());
      setEditingPhone(false);
      setNewPhone("");
    } finally {
      setSavingPhone(false);
    }
  };

  const handlePickPhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPhotoUrl(reader.result);
      // TODO: connect to API — upload `file` and store the returned public URL
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setPhotoUrl(null);
    // TODO: connect to API — e.g. axios.delete(`${API_URL}/api/auth/avatar`)
  };

  const startAddAddress = () => {
    setEditingAddressId("new");
    setAddressLabel(""); setAddressText(""); setAddressInstructions("");
  };
  const startEditAddress = (addr) => {
    setEditingAddressId(addr.id);
    setAddressLabel(addr.label); setAddressText(addr.address); setAddressInstructions(addr.instructions || "");
  };
  const cancelAddressEdit = () => {
    setEditingAddressId(null);
    setAddressLabel(""); setAddressText(""); setAddressInstructions("");
  };

  const handleSaveAddress = async () => {
    if (!addressLabel.trim() || !addressText.trim()) {
      alert("Please add a label (e.g. Home) and the address.");
      return;
    }
    setSavingAddress(true);
    try {
      let updated;
      if (editingAddressId === "new") {
        updated = [...addresses, {
          id: genAddrId(), label: addressLabel.trim(), address: addressText.trim(),
          instructions: addressInstructions.trim(), isDefault: addresses.length === 0,
        }];
      } else {
        updated = addresses.map(a => a.id === editingAddressId
          ? { ...a, label: addressLabel.trim(), address: addressText.trim(), instructions: addressInstructions.trim() }
          : a);
      }
      // TODO: connect to API — e.g. axios.put(`${API_URL}/api/auth/addresses`, { addresses: updated })
      setAddresses(updated);
      cancelAddressEdit();
    } finally {
      setSavingAddress(false);
    }
  };

  const handleDeleteAddress = (id) => {
    if (!window.confirm("Remove this address?")) return;
    let updated = addresses.filter(a => a.id !== id);
    if (updated.length > 0 && !updated.some(a => a.isDefault)) {
      updated = updated.map((a, i) => i === 0 ? { ...a, isDefault: true } : a);
    }
    // TODO: connect to API
    setAddresses(updated);
  };

  const handleSetDefaultAddress = (id) => {
    setAddresses(addresses.map(a => ({ ...a, isDefault: a.id === id })));
    // TODO: connect to API
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      alert("Please fill in all password fields.");
      return;
    }
    if (newPassword !== confirmPassword) {
      alert("New password and confirmation do not match.");
      return;
    }
    setSavingPassword(true);
    try {
      // TODO: connect to API — e.g. axios.post(`${API_URL}/api/auth/change-password`, { currentPassword, newPassword })
      alert("Password updated.");
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      setEditingPassword(false);
    } finally {
      setSavingPassword(false);
    }
  };

  const handleReferFriend = () => {
    const referralCode = user.email ? user.email.split("@")[0].toUpperCase() : "FRIEND";
    const message = `Join CNN Farm Hub and get fresh dairy delivered daily! Use my code ${referralCode} to sign up: https://cnnfarmhub.shop`;
    if (navigator.share) {
      navigator.share({ text: message }).catch(() => {});
    } else {
      navigator.clipboard.writeText(message);
      alert("Referral message copied to clipboard!");
    }
  };

  const handleDeleteAccount = () => {
    if (!window.confirm("This will permanently delete your account and all associated data. This cannot be undone. Continue?")) return;
    if (!window.confirm("Are you absolutely sure? This is your final confirmation.")) return;
    // TODO: connect to API — e.g. axios.delete(`${API_URL}/api/auth/account`)
    logout();
    setPage("home");
  };

  const labelStyle = { fontSize: 12, color: "rgba(11,11,11,0.55)", marginBottom: 4, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.03em" };
  const sectionTitleStyle = { fontSize: 15, fontWeight: 800, color: "#0a0a0a" };
  const linkStyle = { color: "#f3722c", fontWeight: 700, fontSize: 13, cursor: "pointer", background: "none", border: "none" };
  const groupTitleStyle = { fontSize: 12.5, fontWeight: 800, color: "rgba(11,11,11,0.5)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "28px 0 12px" };
  const menuItemStyle = { display: "flex", alignItems: "center", gap: 14, padding: "15px 18px", cursor: "pointer", borderBottom: "1px solid rgba(0,0,0,0.06)" };

  return (
    <div style={{ paddingTop: 110, paddingBottom: 80, background: "#fbf3f3", minHeight: "100vh", fontFamily: "'Inter', sans-serif" }}>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "0 24px" }}>
        <SectionHead
          badge="Your Account" badgeColor="#ff6b35" title="My Profile" titleClass="tg-gold"
          sub="Manage your details, delivery preferences, and account settings."
          subColor="rgba(10,10,10,0.55)"
        />

        {/* PROFILE CARD */}
        <div style={{
          marginTop: 36, background: "#fff", borderRadius: 20,
          border: "1px solid rgba(255,107,53,0.15)", padding: "32px 28px",
          textAlign: "center", marginBottom: 16,
        }}>
          <div style={{ position: "relative", width: 84, height: 84, margin: "0 auto 8px" }}>
            {photoUrl ? (
              <img src={photoUrl} alt="Profile" style={{ width: 84, height: 84, borderRadius: "50%", objectFit: "cover", border: "1px solid rgba(243,114,44,0.3)" }} />
            ) : (
              <div style={{
                width: 84, height: 84, borderRadius: "50%",
                background: "linear-gradient(135deg,#f9c74f,#f3722c)",
                color: "#0b0b0b", fontWeight: 800, fontSize: 30,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {(user.name?.[0] || "U").toUpperCase()}
              </div>
            )}
            <label style={{
              position: "absolute", bottom: -2, right: -2, width: 28, height: 28, borderRadius: "50%",
              background: "#f3722c", display: "flex", alignItems: "center", justifyContent: "center",
              border: "2px solid #fff", cursor: "pointer", fontSize: 13,
            }}>
              ✎
              <input type="file" accept="image/*" onChange={handlePickPhoto} style={{ display: "none" }} />
            </label>
          </div>
          {photoUrl && (
            <div onClick={handleRemovePhoto} style={{ ...linkStyle, color: "#c0392b", marginBottom: 10, fontSize: 12 }}>
              Remove photo
            </div>
          )}

          {!editingProfile ? (
            <>
              <div style={{ fontWeight: 800, fontSize: 20, marginTop: 6 }}>{user.name || "Friend"}</div>
              <div style={{ color: "rgba(11,11,11,0.6)", fontSize: 14, marginTop: 2 }}>{user.email}</div>
              {!!phone && <div style={{ color: "rgba(11,11,11,0.6)", fontSize: 14 }}>{phone}</div>}
              {isAdmin && (
                <span style={{
                  display: "inline-block", marginTop: 10, background: "rgba(243,114,44,0.12)",
                  border: "1px solid rgba(243,114,44,0.3)", borderRadius: 20, padding: "4px 12px",
                  fontSize: 11, fontWeight: 800, letterSpacing: "0.04em", color: "#f3722c",
                }}>ADMIN</span>
              )}
              <div style={{ marginTop: 14 }}>
                <button onClick={() => setEditingProfile(true)} style={linkStyle}>Edit Profile</button>
              </div>
            </>
          ) : (
            <div style={{ textAlign: "left", marginTop: 16 }}>
              <input style={profileInputStyle} placeholder="Full Name" value={name} onChange={e => setName(e.target.value)} />
              <input style={profileInputStyle} placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
                <button onClick={() => { setEditingProfile(false); setName(user.name || ""); setEmail(user.email || ""); }} style={{ ...linkStyle, color: "rgba(11,11,11,0.6)" }}>Cancel</button>
                <Btn variant="orange" onClick={handleSaveProfile} disabled={savingProfile} style={{ padding: "9px 18px", fontSize: 13 }}>
                  {savingProfile ? "Saving…" : "Save"}
                </Btn>
              </div>
            </div>
          )}
        </div>

        {/* PHONE */}
        <ProfileSectionCard>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={sectionTitleStyle}>📱 Phone Number</span>
            {!editingPhone && <button onClick={() => { setEditingPhone(true); setNewPhone(phone); }} style={linkStyle}>Change</button>}
          </div>
          {!editingPhone ? (
            <div style={{ color: "rgba(11,11,11,0.65)", fontSize: 14, marginTop: 8 }}>{phone || "No phone number saved"}</div>
          ) : (
            <div style={{ marginTop: 12 }}>
              <input style={profileInputStyle} placeholder="New Phone Number" value={newPhone} onChange={e => setNewPhone(e.target.value)} />
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button onClick={() => { setEditingPhone(false); setNewPhone(""); }} style={{ ...linkStyle, color: "rgba(11,11,11,0.6)" }}>Cancel</button>
                <Btn variant="orange" onClick={handleSavePhone} disabled={savingPhone} style={{ padding: "9px 18px", fontSize: 13 }}>
                  {savingPhone ? "Saving…" : "Save"}
                </Btn>
              </div>
            </div>
          )}
        </ProfileSectionCard>

        {/* ADDRESSES */}
        <ProfileSectionCard>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={sectionTitleStyle}>📍 Delivery Addresses</span>
            {editingAddressId === null && <button onClick={startAddAddress} style={linkStyle}>+ Add</button>}
          </div>

          {addresses.length === 0 && editingAddressId === null && (
            <div style={{ fontSize: 13, color: "rgba(11,11,11,0.5)", marginTop: 8 }}>No addresses saved yet.</div>
          )}

          {addresses.map(addr => editingAddressId === addr.id ? (
            <div key={addr.id} style={{ marginTop: 14 }}>
              <input style={profileInputStyle} placeholder="Label (e.g. Home, Work)" value={addressLabel} onChange={e => setAddressLabel(e.target.value)} />
              <textarea style={{ ...profileInputStyle, minHeight: 60, resize: "vertical" }} placeholder="Full Address" value={addressText} onChange={e => setAddressText(e.target.value)} />
              <input style={profileInputStyle} placeholder="Delivery instructions (optional)" value={addressInstructions} onChange={e => setAddressInstructions(e.target.value)} />
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button onClick={cancelAddressEdit} style={{ ...linkStyle, color: "rgba(11,11,11,0.6)" }}>Cancel</button>
                <Btn variant="orange" onClick={handleSaveAddress} disabled={savingAddress} style={{ padding: "9px 18px", fontSize: 13 }}>
                  {savingAddress ? "Saving…" : "Save"}
                </Btn>
              </div>
            </div>
          ) : (
            <div key={addr.id} style={{ borderTop: "1px solid rgba(0,0,0,0.07)", paddingTop: 14, marginTop: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                <span style={{ fontWeight: 800, fontSize: 14 }}>{addr.label}</span>
                {addr.isDefault && (
                  <span style={{ background: "rgba(243,114,44,0.12)", borderRadius: 8, padding: "2px 8px", fontSize: 9, fontWeight: 800, color: "#f3722c", letterSpacing: "0.03em" }}>DEFAULT</span>
                )}
              </div>
              <div style={{ fontSize: 14, color: "rgba(11,11,11,0.65)" }}>{addr.address}</div>
              {addr.instructions && <div style={{ fontSize: 12.5, color: "rgba(11,11,11,0.45)", marginTop: 2 }}>Note: {addr.instructions}</div>}
              <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
                {!addr.isDefault && <button onClick={() => handleSetDefaultAddress(addr.id)} style={linkStyle}>Set as default</button>}
                <button onClick={() => startEditAddress(addr)} style={linkStyle}>Edit</button>
                <button onClick={() => handleDeleteAddress(addr.id)} style={{ ...linkStyle, color: "#c0392b" }}>Delete</button>
              </div>
            </div>
          ))}

          {editingAddressId === "new" && (
            <div style={{ marginTop: 14 }}>
              <input style={profileInputStyle} placeholder="Label (e.g. Home, Work)" value={addressLabel} onChange={e => setAddressLabel(e.target.value)} />
              <textarea style={{ ...profileInputStyle, minHeight: 60, resize: "vertical" }} placeholder="Full Address" value={addressText} onChange={e => setAddressText(e.target.value)} />
              <input style={profileInputStyle} placeholder="Delivery instructions (optional)" value={addressInstructions} onChange={e => setAddressInstructions(e.target.value)} />
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button onClick={cancelAddressEdit} style={{ ...linkStyle, color: "rgba(11,11,11,0.6)" }}>Cancel</button>
                <Btn variant="orange" onClick={handleSaveAddress} disabled={savingAddress} style={{ padding: "9px 18px", fontSize: 13 }}>
                  {savingAddress ? "Saving…" : "Save"}
                </Btn>
              </div>
            </div>
          )}
        </ProfileSectionCard>

        {/* DELIVERY TIME */}
        <ProfileSectionCard>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }} onClick={() => setShowDeliveryTimePicker(v => !v)}>
            <span style={sectionTitleStyle}>🕐 Delivery Time Preference</span>
            <span style={{ fontSize: 13, color: "rgba(11,11,11,0.6)" }}>{currentDeliveryTimeLabel} {showDeliveryTimePicker ? "▲" : "▼"}</span>
          </div>
          {showDeliveryTimePicker && (
            <div style={{ marginTop: 10 }}>
              {DELIVERY_TIME_OPTIONS_WEB.map(opt => (
                <div key={opt.value} onClick={() => { setDeliveryTime(opt.value); setShowDeliveryTimePicker(false); }}
                  style={{ display: "flex", justifyContent: "space-between", padding: "11px 4px", borderTop: "1px solid rgba(0,0,0,0.06)", cursor: "pointer", fontSize: 14, fontWeight: 600 }}>
                  {opt.label}
                  {deliveryTime === opt.value && <span style={{ color: "#f3722c", fontWeight: 800 }}>✓</span>}
                </div>
              ))}
            </div>
          )}
        </ProfileSectionCard>

        {/* SETTINGS */}
        <div style={groupTitleStyle}>Settings</div>

        <ProfileSectionCard>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }} onClick={() => setShowLanguagePicker(v => !v)}>
            <span style={sectionTitleStyle}>🌐 App Language</span>
            <span style={{ fontSize: 13, color: "rgba(11,11,11,0.6)" }}>{currentLanguageLabel} {showLanguagePicker ? "▲" : "▼"}</span>
          </div>
          {showLanguagePicker && (
            <div style={{ marginTop: 10 }}>
              {LANGUAGES_WEB.map(lang => (
                <div key={lang.code} onClick={() => { setLanguage(lang.code); setShowLanguagePicker(false); }}
                  style={{ display: "flex", justifyContent: "space-between", padding: "11px 4px", borderTop: "1px solid rgba(0,0,0,0.06)", cursor: "pointer", fontSize: 14, fontWeight: 600 }}>
                  {lang.label}
                  {language === lang.code && <span style={{ color: "#f3722c", fontWeight: 800 }}>✓</span>}
                </div>
              ))}
            </div>
          )}
        </ProfileSectionCard>

        <ProfileSectionCard>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={sectionTitleStyle}>🔔 Push Notifications</span>
            <ToggleSwitch checked={notificationsEnabled} onChange={setNotificationsEnabled} />
          </div>
          <div style={{ fontSize: 13, color: "rgba(11,11,11,0.5)", marginTop: 6 }}>Get updates on orders, delivery, and offers.</div>
        </ProfileSectionCard>

        {/* PAYMENT METHODS */}
        <ProfileSectionCard>
          <span style={sectionTitleStyle}>💳 Payment Methods</span>

          {cardsLoading ? (
            <div style={{ fontSize: 13, color: "rgba(11,11,11,0.5)", marginTop: 6 }}>Loading…</div>
          ) : savedCards.length === 0 ? (
            <div style={{ fontSize: 13, color: "rgba(11,11,11,0.5)", marginTop: 6 }}>No payment methods saved yet.</div>
          ) : (
            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
              {savedCards.map(card => (
                <div key={card.tokenId} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "10px 12px", borderRadius: 10, background: "#faf9f9", border: "1px solid rgba(0,0,0,0.08)",
                }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: "#0a0a0a" }}>
                    {card.network || "Card"} •••• {card.last4}
                    <span style={{ fontWeight: 400, color: "rgba(11,11,11,0.5)", marginLeft: 6, textTransform: "capitalize" }}>
                      ({card.type})
                    </span>
                  </div>
                  <button
                    onClick={() => handleRemoveCard(card.tokenId)}
                    disabled={removingCardId === card.tokenId}
                    style={{ ...linkStyle, color: "#dc2626", fontSize: 13 }}
                  >
                    {removingCardId === card.tokenId ? "Removing…" : "Remove"}
                  </button>
                </div>
              ))}
            </div>
          )}

          <div style={{ fontSize: 12.5, color: "rgba(11,11,11,0.45)", marginTop: 10 }}>
            Cards are saved securely by Razorpay during checkout — tick "Save this card" the next time you pay, and it'll show up here.
          </div>
        </ProfileSectionCard>

        {/* PASSWORD */}
        <ProfileSectionCard>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={sectionTitleStyle}>🔒 Password</span>
            {!editingPassword && <button onClick={() => setEditingPassword(true)} style={linkStyle}>Change</button>}
          </div>
          {editingPassword && (
            <div style={{ marginTop: 12 }}>
              <input type="password" style={profileInputStyle} placeholder="Current Password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
              <input type="password" style={profileInputStyle} placeholder="New Password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
              <input type="password" style={profileInputStyle} placeholder="Confirm New Password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button onClick={() => { setEditingPassword(false); setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); }} style={{ ...linkStyle, color: "rgba(11,11,11,0.6)" }}>Cancel</button>
                <Btn variant="orange" onClick={handleChangePassword} disabled={savingPassword} style={{ padding: "9px 18px", fontSize: 13 }}>
                  {savingPassword ? "Saving…" : "Update"}
                </Btn>
              </div>
            </div>
          )}
        </ProfileSectionCard>

        {/* GENERAL MENU */}
        <div style={groupTitleStyle}>General</div>
        <div style={{ background: "#fff", borderRadius: 16, overflow: "hidden", border: "1px solid rgba(0,0,0,0.07)", marginBottom: 16 }}>
          <div style={menuItemStyle} onClick={() => setPage("orders")}>
            <span>📦</span><span style={{ flex: 1, fontWeight: 700, fontSize: 14.5 }}>My Orders</span><span style={{ color: "rgba(0,0,0,0.3)" }}>›</span>
          </div>
          <div style={menuItemStyle} onClick={() => setPage("subscription")}>
            <span>🔄</span><span style={{ flex: 1, fontWeight: 700, fontSize: 14.5 }}>Manage Subscription</span><span style={{ color: "rgba(0,0,0,0.3)" }}>›</span>
          </div>
          <div style={menuItemStyle} onClick={() => setPage("contact")}>
            <span>💬</span><span style={{ flex: 1, fontWeight: 700, fontSize: 14.5 }}>Contact Us</span><span style={{ color: "rgba(0,0,0,0.3)" }}>›</span>
          </div>
          <div style={menuItemStyle} onClick={() => setPage("contact")}>
            <span>❓</span><span style={{ flex: 1, fontWeight: 700, fontSize: 14.5 }}>Help</span><span style={{ color: "rgba(0,0,0,0.3)" }}>›</span>
          </div>
          <div style={{ ...menuItemStyle, borderBottom: "none" }} onClick={handleReferFriend}>
            <span>🎁</span><span style={{ flex: 1, fontWeight: 700, fontSize: 14.5 }}>Refer a Friend</span><span style={{ color: "rgba(0,0,0,0.3)" }}>›</span>
          </div>
        </div>

        {/* LEGAL */}
        <div style={groupTitleStyle}>Legal</div>
        <div style={{ background: "#fff", borderRadius: 16, overflow: "hidden", border: "1px solid rgba(0,0,0,0.07)", marginBottom: 16 }}>
          <div style={menuItemStyle} onClick={() => window.open("https://cnnfarmhub.shop/terms", "_blank")}>
            <span>📄</span><span style={{ flex: 1, fontWeight: 700, fontSize: 14.5 }}>Terms and Conditions</span><span style={{ color: "rgba(0,0,0,0.3)" }}>›</span>
          </div>
          <div style={{ ...menuItemStyle, borderBottom: "none" }} onClick={() => window.open("https://cnnfarmhub.shop/privacy", "_blank")}>
            <span>🔐</span><span style={{ flex: 1, fontWeight: 700, fontSize: 14.5 }}>Privacy Policy</span><span style={{ color: "rgba(0,0,0,0.3)" }}>›</span>
          </div>
        </div>

        {isAdmin && (
          <div style={{ background: "#fff", borderRadius: 16, overflow: "hidden", border: "1px solid rgba(0,0,0,0.07)", marginBottom: 16 }}>
            <div style={{ ...menuItemStyle, borderBottom: "none" }} onClick={() => setPage("admin")}>
              <span>🛡️</span><span style={{ flex: 1, fontWeight: 700, fontSize: 14.5 }}>Admin Dashboard</span><span style={{ color: "rgba(0,0,0,0.3)" }}>›</span>
            </div>
          </div>
        )}

        <Btn
          variant="ghost"
          onClick={() => { logout(); setPage("home"); }}
          style={{ width: "100%", padding: "14px", fontSize: 14, background: "rgba(255,68,68,0.08)", border: "1px solid rgba(255,68,68,0.25)", color: "#c0392b", marginBottom: 24 }}
        >
          🚪 Logout
        </Btn>

        {/* DANGER ZONE */}
        <div style={groupTitleStyle}>Danger Zone</div>
        <button
          onClick={handleDeleteAccount}
          style={{
            width: "100%", padding: "14px", borderRadius: 14, background: "#fbf3f3",
            border: "1px solid #c0392b", color: "#c0392b", fontWeight: 800, fontSize: 13.5, cursor: "pointer",
          }}
        >
          Delete My Account
        </button>
      </div>
    </div>
  );
}
/* ─────────────────────────────────────────────
   FARM PAGE
───────────────────────────────────────────── */
/* ─────────────────────────────────────────────
   FARM VISIT BOOKING PAGE — flat ₹150 per booking
───────────────────────────────────────────── */
function FarmVisitBookingPage({ setPage }) {
  const { user } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [contact, setContact] = useState(user?.phone || "");
  const [visitDate, setVisitDate] = useState("");
  const [visitors, setVisitors] = useState(1);
  const [error, setError] = useState(null);
  const [booking, setBooking] = useState(false);

  const VISIT_PRICE = 200; // flat fee per booking, validated server-side too

  // Farm is only open Sat & Sun — block any other day from being picked
  const isWeekend = (dateStr) => {
    if (!dateStr) return false;
    const day = new Date(dateStr + "T00:00:00").getDay();
    return day === 0 || day === 6;
  };

  const handleBookVisit = async () => {
    if (!name.trim() || !contact.trim() || !visitDate) {
      setError("Please fill in your name, contact number, and preferred visit date.");
      return;
    }
    if (!/^[0-9]{10}$/.test(contact.trim())) {
      setError("Please enter a valid 10-digit contact number.");
      return;
    }
    if (!isWeekend(visitDate)) {
      setError("Farm visits are only available on Saturdays and Sundays, 7AM–11AM. Please pick a weekend date.");
      return;
    }
    if (!visitors || visitors < 1) {
      setError("Please enter at least 1 visitor.");
      return;
    }

    setError(null);
    setBooking(true);
    try {
      const scriptOk = await loadRazorpayScript();
      if (!scriptOk) {
        setError("Couldn't load the payment gateway. Check your internet connection and try again.");
        setBooking(false);
        return;
      }

      const res = await fetch(`${API_URL}/api/payment/create-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: "farm_visit",
          name: name.trim(),
          contact: contact.trim(),
          visitDate,
          visitors,
        }),
      });
      const order = await res.json();

      if (!res.ok) {
        setError(order.message || "Could not start the booking. Please try again.");
        setBooking(false);
        return;
      }

      const options = {
        key: RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        name: "CNN Farm Hub",
        description: `Farm visit booking — ${visitors} visitor(s) on ${visitDate}`,
        order_id: order.id,
        handler: async function (response) {
          try {
            const verifyRes = await fetch(`${API_URL}/api/payment/verify-payment`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...response, planId: "farm_visit", name: name.trim(), contact: contact.trim(), visitDate, visitors }),
            });
            const result = await verifyRes.json();
            if (result.verified) {
              alert(`Farm visit booked for ${visitDate}! We'll see you there. 🐄`);
              setPage("farm");
            } else {
              setError("Payment succeeded but verification failed. Please contact support with this reference: " + response.razorpay_payment_id);
            }
          } catch {
            setError("Payment succeeded but we couldn't confirm it. Please contact support with reference: " + response.razorpay_payment_id);
          } finally {
            setBooking(false);
          }
        },
        modal: { ondismiss: () => setBooking(false) },
        theme: { color: "#39d353" },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error("Farm visit booking error:", err);
      setError("Something went wrong starting the booking. Please try again.");
      setBooking(false);
    }
  };

  const inputStyle = {
    width: "100%", padding: "12px 14px", borderRadius: 10,
    border: "1px solid rgba(0,0,0,0.12)", background: "#faf9f9",
    color: "#0a0a0a", fontSize: 14, outline: "none", boxSizing: "border-box",
    marginBottom: 14,
  };
  const labelStyle = { fontSize: 13, fontWeight: 700, color: "rgba(11,11,11,0.6)", marginBottom: 6, display: "block" };

  return (
    <div style={{ paddingTop: 100, minHeight: "100vh", background: "#fff", padding: "100px 24px 100px" }}>
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <h1 style={{ fontFamily: "'Playfair Display',serif", fontWeight: 900, fontSize: 40, marginBottom: 10 }}>
          Book a{" "}
          <span style={{ background: "linear-gradient(135deg,#2e7d32,#66bb6a)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Farm Visit
          </span>
        </h1>
        <p style={{ color: "rgba(11,11,11,0.6)", fontSize: 14, marginBottom: 8 }}>
          Saturdays & Sundays, 7AM–11AM. Flat ₹{VISIT_PRICE} per booking.
        </p>

        {error && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", borderRadius: 12, padding: "12px 16px", marginBottom: 20, fontSize: 14 }}>
            {error}
          </div>
        )}

        <label style={labelStyle}>Full Name</label>
        <input style={inputStyle} placeholder="e.g. Tejashwini G M" value={name} onChange={e => { setName(e.target.value); setError(null); }} />

        <label style={labelStyle}>Contact Number</label>
        <input
          style={inputStyle}
          placeholder="10-digit mobile number"
          value={contact}
          maxLength={10}
          inputMode="numeric"
          onChange={e => { setContact(e.target.value.replace(/[^0-9]/g, "")); setError(null); }}
        />

        <label style={labelStyle}>Visit Date (Sat or Sun only)</label>
        <input
          type="date"
          style={inputStyle}
          value={visitDate}
          min={new Date().toISOString().split("T")[0]}
          onChange={e => { setVisitDate(e.target.value); setError(null); }}
        />

        <label style={labelStyle}>Number of Visitors</label>
        <input
          type="number"
          min={1}
          max={10}
          style={inputStyle}
          value={visitors}
          onChange={e => { setVisitors(Number(e.target.value)); setError(null); }}
        />

        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          borderRadius: 12, padding: "14px 16px", marginBottom: 20, background: "#f5f3ff",
          border: "1px solid rgba(46,125,50,0.15)",
        }}>
          <span style={{ fontWeight: 700, fontSize: 14, color: "#0a0a0a" }}>Booking Fee</span>
          <span style={{ fontWeight: 800, fontSize: 18, color: "#2e7d32" }}>₹{VISIT_PRICE}</span>
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={() => setPage("farm")}
            style={{ flex: 1, padding: "13px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.15)", background: "#fff", color: "rgba(11,11,11,0.7)", fontWeight: 700, fontSize: 14, cursor: "pointer" }}
          >
            Back
          </button>
          <Btn variant="farm" onClick={handleBookVisit} disabled={booking} style={{ flex: 2, fontSize: 15, padding: "13px", textAlign: "center", opacity: booking ? 0.7 : 1 }}>
            {booking ? "Processing…" : `Pay ₹${VISIT_PRICE} & Book →`}
          </Btn>
        </div>
      </div>
    </div>
  );
}

function BookCallPage({ setPage }) {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [bookedSlots, setBookedSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [email, setEmail] = useState(user?.email || "");
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const ALL_SLOTS = [
    "10:00 AM - 10:30 AM", "10:30 AM - 11:00 AM",
    "11:00 AM - 11:30 AM", "11:30 AM - 12:00 PM",
    "12:00 PM - 12:30 PM", "12:30 PM - 1:00 PM",
    "1:00 PM - 1:30 PM", "1:30 PM - 2:00 PM",
    "2:00 PM - 2:30 PM", "2:30 PM - 3:00 PM",
    "3:00 PM - 3:30 PM", "3:30 PM - 4:00 PM",
    "4:00 PM - 4:30 PM", "4:30 PM - 5:00 PM",
    "5:00 PM - 5:30 PM", "5:30 PM - 6:00 PM",
  ];

  const fetchAvailability = async (date) => {
    setLoadingSlots(true);
    setSelectedSlot(null);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/bookings/availability/${date}`);
      const data = await res.json();
      setBookedSlots(data.bookedSlots || []);
    } catch (err) {
      console.error("Availability error:", err);
      setError("Couldn't load available slots. Please try again.");
      setBookedSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleDateChange = (date) => {
    setSelectedDate(date);
    setError(null);
    if (date) fetchAvailability(date);
  };

  const handleSubmit = async () => {
    if (!selectedDate || !selectedSlot) {
      setError("Please select a date and time slot.");
      return;
    }
    if (!name.trim() || !phone.trim() || !email.trim()) {
      setError("Please fill in your name, phone, and email.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/bookings/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          date: selectedDate,
          timeSlot: selectedSlot,
        }),
      });

      if (res.status === 409) {
        setError("This slot was just booked. Please choose another.");
        fetchAvailability(selectedDate);
        setSelectedSlot(null);
        return;
      }
      if (!res.ok) throw new Error("Booking failed");

      createSound("success");
      setSuccess(true);
    } catch (err) {
      console.error("Booking error:", err);
      setError("Failed to book your call. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const bcInputStyle = {
    width: "100%", padding: "12px 14px", borderRadius: 10,
    border: "1px solid rgba(0,0,0,0.12)", background: "#faf9f9",
    color: "#0a0a0a", fontSize: 14, outline: "none", boxSizing: "border-box",
    marginBottom: 14,
  };
  const bcLabelStyle = { fontSize: 13, fontWeight: 700, color: "rgba(11,11,11,0.6)", marginBottom: 6, display: "block" };

  if (success) {
    return (
      <div style={{ paddingTop: 140, minHeight: "100vh", background: "#fff", textAlign: "center", padding: "140px 24px 100px" }}>
        <div style={{ fontSize: 60, marginBottom: 16 }}>📞</div>
        <h1 style={{ fontFamily: "'Playfair Display',serif", fontWeight: 900, fontSize: 32, marginBottom: 12 }}>Call Booked!</h1>
        <p style={{ color: "rgba(11,11,11,0.6)", fontSize: 15, marginBottom: 28 }}>
          We'll call you on {selectedDate} at {selectedSlot}.
        </p>
        <Btn variant="gold" onClick={() => setPage("home")} style={{ fontSize: 15, padding: "13px 28px" }}>Back to Home →</Btn>
      </div>
    );
  }

  return (
    <div style={{ paddingTop: 100, minHeight: "100vh", background: "#fff", padding: "100px 24px 100px" }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <h1 style={{ fontFamily: "'Playfair Display',serif", fontWeight: 900, fontSize: 40, marginBottom: 10 }}>
          Book a{" "}
          <span style={{ background: "linear-gradient(135deg,#39d353,#00b894)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Discovery Call
          </span>
        </h1>
        <p style={{ color: "rgba(11,11,11,0.6)", fontSize: 14, marginBottom: 24 }}>
          Pick a date and time that works for you — we'll give you a call.
        </p>

        {error && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", borderRadius: 12, padding: "12px 16px", marginBottom: 20, fontSize: 14 }}>
            {error}
          </div>
        )}

        <label style={bcLabelStyle}>Select a Date</label>
        <input
          type="date"
          style={bcInputStyle}
          value={selectedDate}
          min={new Date().toISOString().split("T")[0]}
          onChange={e => handleDateChange(e.target.value)}
        />

        {selectedDate && (
          <>
            <label style={bcLabelStyle}>Available Slots</label>
            {loadingSlots ? (
              <p style={{ fontSize: 13, color: "rgba(11,11,11,0.5)", marginBottom: 20 }}>Loading…</p>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 10, marginBottom: 20 }}>
                {ALL_SLOTS.map(slot => {
                  const isBooked = bookedSlots.includes(slot);
                  const isSelected = selectedSlot === slot;
                  return (
                    <button
                      key={slot}
                      disabled={isBooked}
                      onClick={() => setSelectedSlot(slot)}
                      style={{
                        padding: "10px 12px", borderRadius: 10, fontSize: 12.5, fontWeight: 600,
                        cursor: isBooked ? "not-allowed" : "pointer",
                        opacity: isBooked ? 0.4 : 1,
                        background: isSelected ? "rgba(57,211,83,0.15)" : "#faf9f9",
                        border: `1px solid ${isSelected ? "#39d353" : "rgba(0,0,0,0.1)"}`,
                        color: "#0a0a0a",
                      }}
                    >
                      {slot}
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}

        {selectedDate && selectedSlot && (
          <>
            <label style={bcLabelStyle}>Your Details</label>
            <input style={bcInputStyle} placeholder="Full Name" value={name} onChange={e => { setName(e.target.value); setError(null); }} />
            <input style={bcInputStyle} placeholder="Phone Number" value={phone} onChange={e => { setPhone(e.target.value); setError(null); }} />
            <input style={bcInputStyle} placeholder="Email Address" value={email} onChange={e => { setEmail(e.target.value); setError(null); }} />
          </>
        )}

        <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
          <button
            onClick={() => setPage("home")}
            style={{ flex: 1, padding: "13px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.15)", background: "#fff", color: "rgba(11,11,11,0.7)", fontWeight: 700, fontSize: 14, cursor: "pointer" }}
          >
            Back
          </button>
          {selectedDate && selectedSlot && (
            <Btn variant="farm" onClick={handleSubmit} disabled={submitting} style={{ flex: 2, fontSize: 15, padding: "13px", textAlign: "center", opacity: submitting ? 0.7 : 1 }}>
              {submitting ? "Booking…" : "Confirm Booking →"}
            </Btn>
          )}
        </div>
      </div>
    </div>
  );
}

function FarmPage({ setPage }) {

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
              <Btn variant="farm" style={{ fontSize: 15, padding: "13px 28px" }} onClick={() => setPage("farm-visit")}>Book Farm Visit →</Btn>
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
function SubPage({ setPage, PRODUCTS, addToCart, setActiveSubscriptionPlan }) {
  const [selected, setSelected] = useState("premium");
  const [freq, setFreq] = useState("monthly");
  const [selectedItems, setSelectedItems] = useState([]); // array of product ids
  const [adding, setAdding] = useState(false);

  const currentPlan = PLANS.find(p => p.id === selected);
  const maxItems = currentPlan?.maxItems ?? 0;

  // Whenever the plan changes, drop any picks that exceed the new plan's cap
  // (switching to a smaller plan shouldn't silently keep an over-limit selection).
  useEffect(() => {
    setSelectedItems(prev => prev.slice(0, maxItems));
  }, [selected]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedProducts = (PRODUCTS || []).filter(p => selectedItems.includes(p.id));
  // Real, recalculated amount — the actual sum of the selected products' live
  // prices, not the plan's flat headline price.
  const selectedTotal = selectedProducts.reduce((sum, p) => sum + (Number(p.price) || 0), 0);

  const toggleItem = (productId) => {
    setSelectedItems(prev => {
      if (prev.includes(productId)) {
        return prev.filter(id => id !== productId);
      }
      if (prev.length >= maxItems) {
        alert(`Your ${currentPlan?.name || "selected"} plan allows up to ${maxItems} item${maxItems === 1 ? "" : "s"}. Remove one before adding another, or switch to a bigger plan.`);
        return prev;
      }
      createSound("click");
      return [...prev, productId];
    });
  };

  // Adds every selected product to the real cart (same endpoint/flow as the
  // Products page), then sends the user to the Cart page where checkout and
  // Razorpay payment already work.
  const handleAddSelectedToCart = async () => {
    setAdding(true);
    try {
      for (const product of selectedProducts) {
        await addToCart(product);
      }
      setActiveSubscriptionPlan?.({
        id: currentPlan.id,
        name: currentPlan.name,
        price: getFreqPrice(currentPlan, freq),
        freq, // raw "daily" | "weekly" | "monthly" — sent to backend for price validation
        period: freq === "monthly" ? "month" : freq === "weekly" ? "week" : "day",
        color: currentPlan.color,
        maxItems: currentPlan.maxItems,
        planItems: currentPlan.items, // the plan's own included-features list
        selectedItems: selectedProducts.map(p => ({ id: p.id, name: p.name, price: p.price, unit: p.unit })),
        selectedTotal,
      });
      setPage("cart");
      window.scrollTo(0, 0);
    } finally {
      setAdding(false);
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
                    <span style={{ fontFamily: "'Playfair Display',serif", fontWeight: 900, fontSize: 40, color: "#000" }}>₹{getFreqPrice(pl, freq).toLocaleString()}</span>
                    <span style={{ color: "rgba(11,11,11,0.6)", fontSize: 14 }}>/{freq === "monthly" ? "month" : freq === "weekly" ? "week" : "day"}</span>
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
                    disabled={selected === pl.id && adding}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (selected === pl.id) {
                        handleAddSelectedToCart();
                      } else {
                        setSelected(pl.id);
                      }
                    }}
                    style={{ width: "100%", justifyContent: "center", fontSize: 14, padding: "12px", background: selected === pl.id ? `linear-gradient(135deg,${pl.color},${pl.color}cc)` : undefined, color: selected === pl.id ? "#020f05" : undefined }}
                  >
                    {selected === pl.id ? (adding ? "Adding…" : "Subscribe Now →") : "Select Plan"}
                  </Btn>
                </div>
              </div>

            ))}
          </div>
 
          {/* Item picker — capped by the selected plan's maxItems, using real products */}
          <div style={{
            borderRadius: 24, padding: "30px 28px", marginBottom: 40,
            background: "#f5f3ff", border: "1px solid rgba(124,58,237,0.15)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 18 }}>
              <h3 style={{ fontFamily: "'Playfair Display',serif", fontWeight: 900, fontSize: 20, color: "#0a0a0a" }}>
                Choose your items <span style={{ color: currentPlan?.color }}>({currentPlan?.name}, optional)</span>
              </h3>
              <span style={{
                fontSize: 13, fontWeight: 700, padding: "6px 14px", borderRadius: 20,
                background: selectedItems.length >= maxItems ? "#000" : "#fff",
                color: selectedItems.length >= maxItems ? "#fff" : "#0a0a0a",
                border: `1px solid ${currentPlan?.color || "#000"}`,
              }}>
                {selectedItems.length}/{maxItems} selected
              </span>
            </div>

            {(!PRODUCTS || PRODUCTS.length === 0) ? (
              <p style={{ fontSize: 13, color: "rgba(11,11,11,0.5)" }}>Loading products…</p>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 12 }}>
                {PRODUCTS.map(p => {
                  const isSelected = selectedItems.includes(p.id);
                  const isDisabled = !isSelected && selectedItems.length >= maxItems;
                  return (
                    <div
                      key={p.id}
                      onClick={() => !isDisabled && toggleItem(p.id)}
                      style={{
                        display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 12,
                        cursor: isDisabled ? "not-allowed" : "pointer",
                        opacity: isDisabled ? 0.4 : 1,
                        background: isSelected ? `${currentPlan?.color}22` : "#fff",
                        border: `2px solid ${isSelected ? currentPlan?.color : "rgba(124,58,237,0.15)"}`,
                        transition: "all .2s",
                      }}
                    >
                      <span style={{
                        width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                        border: `2px solid ${isSelected ? currentPlan?.color : "rgba(0,0,0,0.25)"}`,
                        background: isSelected ? currentPlan?.color : "transparent",
                        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#020f05",
                      }}>{isSelected ? "✓" : ""}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 600, color: "#0a0a0a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
                        <div style={{ fontSize: 12, color: "rgba(11,11,11,0.55)" }}>₹{p.price}/{p.unit}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 20, paddingTop: 16, borderTop: "1px solid rgba(124,58,237,0.15)" }}>
              <p style={{ fontSize: 12, color: "rgba(11,11,11,0.5)" }}>
                Your {currentPlan?.name} plan lets you pick up to {maxItems} item{maxItems === 1 ? "" : "s"} — totally optional, add if you'd like.
              </p>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 12, color: "rgba(11,11,11,0.5)" }}>Real total for selected items</div>
                <div style={{ fontFamily: "'Playfair Display',serif", fontWeight: 900, fontSize: 22, color: "#0a0a0a" }}>₹{selectedTotal.toLocaleString()}</div>
              </div>
            </div>
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
              <Btn variant="sub" onClick={handleAddSelectedToCart} disabled={adding} style={{ fontSize: 15, padding: "13px 28px" }}>
                {adding ? "Adding…" : "Subscribe Now →"}
              </Btn>
<Btn
                variant="ghost"
                onClick={() => {
                  const plan = PLANS.find(p => p.id === selected);
                  const message = encodeURIComponent(
                    `Hi! I'm interested in the ${plan?.name || "subscription"} plan (₹${plan ? getFreqPrice(plan, freq) : ""}/${freq === "monthly" ? "month" : freq === "weekly" ? "week" : "day"}). Can you help me get started?`
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
 
function OrdersPage({ setPage }) {
  const { user, token } = useAuth();
  const [orders, setOrders] = useState(null); // null = loading
  const [error, setError] = useState(null);
 
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user?.id) {
        if (!cancelled) setError("Please log in to see your orders.");
        return;
      }
      try {
        const res = await fetch(`${API_URL}/api/orders/my-orders`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Request failed");
        const data = await res.json();
        if (!cancelled) setOrders(data);
      } catch (err) {
        console.error("Failed to load orders:", err);
        if (!cancelled) setError("Couldn't load your orders. Please refresh.");
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id, token]);
 
  const statusColor = (status) => {
    if (status === "delivered") return "#2e7d32";
    if (status === "cancelled" || status === "failed") return "#c0392b";
    if (status === "shipped" || status === "out_for_delivery") return "#f3722c";
    return "rgba(11,11,11,0.55)"; // pending / processing
  };
 
  return (
    <div style={{ paddingTop: 110, paddingBottom: 80, background: "#fbf3f3", minHeight: "100vh" }}>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "0 24px" }}>
        <SectionHead
          badge="Order History" badgeColor="#ff6b35" title="My Orders" titleClass="tg-gold"
          sub="Everything you've ordered from CNN Farm Hub, most recent first."
        />
 
        {error && (
          <div style={{ marginTop: 24, textAlign: "center", color: "#c0392b", fontSize: 14 }}>{error}</div>
        )}
 
        {!error && orders === null && (
          <div style={{ marginTop: 40, textAlign: "center", color: "rgba(11,11,11,0.5)" }}>Loading your orders…</div>
        )}
 
        {!error && orders && orders.length === 0 && (
          <div style={{ marginTop: 40, textAlign: "center" }}>
            <div style={{ fontSize: 15, color: "rgba(11,11,11,0.6)", marginBottom: 16 }}>You haven't placed any orders yet.</div>
            <Btn variant="orange" onClick={() => setPage("products")} style={{ padding: "12px 28px" }}>Start Shopping</Btn>
          </div>
        )}
 
        {!error && orders && orders.length > 0 && (
          <div style={{ marginTop: 24 }}>
            {orders.map(order => (
              <div key={order._id} style={{
                background: "#fff", borderRadius: 16, padding: "18px 20px",
                border: "1px solid rgba(0,0,0,0.07)", marginBottom: 16,
                boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 14.5 }}>Order #{order._id.slice(-8).toUpperCase()}</div>
                    <div style={{ fontSize: 12.5, color: "rgba(11,11,11,0.5)", marginTop: 2 }}>
                      {order.createdAt ? new Date(order.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : ""}
                    </div>
                  </div>
                  <span style={{
                    fontSize: 11.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.04em",
                    color: statusColor(order.status || order.paymentStatus),
                  }}>
                    {(order.status || order.paymentStatus || "pending").replace(/_/g, " ")}
                  </span>
                </div>
 
                <div style={{ borderTop: "1px solid rgba(0,0,0,0.06)", paddingTop: 10 }}>
                  {(order.items || []).map((item, idx) => (
                    <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, marginBottom: 4 }}>
                      <span style={{ color: "rgba(11,11,11,0.8)" }}>
                        {item.productId?.name || "Product"} × {item.quantity}
                      </span>
                      <span style={{ color: "rgba(11,11,11,0.6)" }}>
                        ₹{((item.productId?.price || 0) * item.quantity).toFixed(0)}
                      </span>
                    </div>
                  ))}
                </div>
 
                <div style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  borderTop: "1px solid rgba(0,0,0,0.06)", marginTop: 10, paddingTop: 10,
                }}>
                  <span style={{ fontSize: 13.5, fontWeight: 700 }}>Total</span>
                  <span style={{ fontSize: 15, fontWeight: 800, color: "#f3722c" }}>₹{(order.totalAmount || 0).toFixed(0)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
/* ─────────────────────────────────────────────
   CHATBOT — FAQ DATA (same content as mobile app)
───────────────────────────────────────────── */
const FAQS = [
  {
    q: "What time does delivery happen?",
    a: "We deliver fresh dairy products every morning by 6 AM, straight from our farm to your doorstep.",
    keywords: ["delivery", "time", "when", "morning", "deliver"],
  },
  {
    q: "How do I track my order?",
    a: 'Open "My Orders" from your Profile menu to see the status of all your past and current orders.',
    keywords: ["track", "order", "status", "where"],
  },
  {
    q: "Can I cancel or change my order?",
    a: "You can remove items from your cart before placing the order. For changes after placing an order, please contact us via call or WhatsApp.",
    keywords: ["cancel", "change", "modify", "edit"],
  },
  {
    q: "What payment methods are accepted?",
    a: "We accept secure online payments via Razorpay — cards, UPI, netbanking, and wallets are all supported.",
    keywords: ["payment", "pay", "cash", "card", "upi", "money"],
  },
  {
    q: "How do I add items to my cart?",
    a: 'Browse our Products page and tap "Add to Cart" on any item you\'d like to order.',
    keywords: ["cart", "add", "buy", "shop", "order"],
  },
  {
    q: "Is the milk and dairy organic?",
    a: "Yes! All our products are 100% organic, fresh, and free from preservatives — delivered directly from our farm.",
    keywords: ["organic", "fresh", "quality", "preservative", "natural"],
  },
  {
    q: "Do you deliver on Sundays or holidays?",
    a: "Yes, we deliver every day including Sundays and most holidays, so your fresh dairy never skips a beat!",
    keywords: ["sunday", "holiday", "everyday", "weekend"],
  },
  {
    q: "How do I contact support directly?",
    a: "You can reach us anytime via Call, WhatsApp, or Email from the Contact Us page — we usually respond quickly!",
    keywords: ["contact", "support", "help", "call", "whatsapp", "email", "reach"],
  },
  {
    q: "What if I'm not home for delivery?",
    a: "No worries! Our delivery partner will try to leave your order safely at your doorstep, or you can coordinate a different time by contacting support.",
    keywords: ["home", "absent", "miss", "not there", "away"],
  },
  {
    q: "Do you offer discounts for bulk orders?",
    a: "We're working on bulk order discounts! For large or recurring orders, contact us directly via WhatsApp or email and we'll be happy to help.",
    keywords: ["discount", "bulk", "wholesale", "large order", "offer"],
  },
  {
    q: "How do I book a discovery call?",
    a: 'Head to the Contact page and use "Book a Call", then pick a date and time slot that works for you — we\'ll call you then!',
    keywords: ["book", "call", "discovery", "schedule", "appointment"],
  },
  {
    q: "Do you offer subscriptions?",
    a: 'Yes! Check out the Subscribe page for our Family plans, with fresh dairy delivered on a recurring schedule.',
    keywords: ["subscribe", "subscription", "recurring", "plan"],
  },
];
 
const WELCOME_MESSAGE = {
  id: "welcome",
  fromBot: true,
  text: "Hi! I'm here to help with questions about CNN Farm Hub. Tap a question below or type your own! 🌿",
};
 
const FALLBACK_TEXT =
  "I'm not quite sure about that one. Try asking about delivery, orders, payments, or booking a call — or reach our team directly via Contact Us!";
 
function findBestMatch(userText) {
  const lowerText = userText.toLowerCase();
  let bestMatch = null;
  let bestScore = 0;
 
  FAQS.forEach((faq) => {
    let score = 0;
    faq.keywords.forEach((kw) => {
      if (lowerText.includes(kw)) score += 1;
    });
    if (score > bestScore) {
      bestScore = score;
      bestMatch = faq;
    }
  });
 
  return bestScore > 0 ? bestMatch : null;
}
 
/* ─────────────────────────────────────────────
   FLOATING CHAT BUBBLE — shows on every page
   except the chatbot page itself
───────────────────────────────────────────── */
function ChatBubble({ page, setPage }) {
  if (page === "chatbot") return null;

  return (
    <div style={{ position: "fixed", bottom: 100, right: 24, zIndex: 1002, display: "flex", alignItems: "center", gap: 10 }}>
      <div
        onClick={() => setPage("chatbot")}
        style={{
          background: "#fff",
          border: "1px solid rgba(124,58,237,0.15)",
          borderRadius: 16,
          borderBottomRightRadius: 4,
          padding: "10px 16px",
          fontSize: 13.5,
          fontWeight: 700,
          color: "#0a0a0a",
          boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
          cursor: "pointer",
          whiteSpace: "nowrap",
          animation: "chatGreetingFloat 2.4s ease-in-out infinite",
        }}
      >
        Hi, need help? 👋
      </div>
      <button
        onClick={() => setPage("chatbot")}
        aria-label="Open CNN Assistant chat"
        style={{
          width: 58,
          height: 58,
          borderRadius: "50%",
          border: "none",
          cursor: "pointer",
          background: "linear-gradient(135deg,#f9c74f,#f3722c)",
          boxShadow: "0 8px 24px rgba(243,114,44,0.4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 26,
          flexShrink: 0,
        }}
      >
        💬
      </button>
    </div>
  );
}
/* ─────────────────────────────────────────────
   CHATBOT PAGE
───────────────────────────────────────────── */
function ChatbotPage({ setPage }) {
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [suggestedFaqs] = useState(FAQS.slice(0, 6));
  const scrollRef = useRef(null);
 
  const scrollToEnd = () => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, 100);
  };
 
  const sendUserMessage = (text) => {
    if (!text.trim()) return;
 
    const userMsg = { id: `u-${Date.now()}`, fromBot: false, text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    scrollToEnd();
 
    const match = findBestMatch(text);
    const botText = match ? match.a : FALLBACK_TEXT;
 
    setTimeout(() => {
      const botMsg = { id: `b-${Date.now()}`, fromBot: true, text: botText };
      setMessages((prev) => [...prev, botMsg]);
      scrollToEnd();
    }, 400);
  };
 
  const handleChipPress = (faq) => sendUserMessage(faq.q);
 
  return (
    <div style={{ paddingTop: 100, minHeight: "100vh", background: "#fff", padding: "100px 24px 120px" }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28 }}>
          <button
            onClick={() => setPage("home")}
            style={{
              width: 40, height: 40, borderRadius: "50%", border: "1px solid rgba(124,58,237,0.2)",
              background: "#f5f3ff", cursor: "pointer", fontSize: 18, color: "#0a0a0a",
            }}
          >
            ←
          </button>
          <h1 style={{ fontFamily: "'Playfair Display',serif", fontWeight: 900, fontSize: 32 }}>
            CNN{" "}
            <span style={{ background: "linear-gradient(135deg,#7c3aed,#a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Assistant
            </span>{" "}
            🤖
          </h1>
        </div>
 
        <div
          ref={scrollRef}
          style={{
            background: "#f5f3ff",
            border: "1px solid rgba(124,58,237,0.15)",
            borderRadius: 20,
            padding: 20,
            maxHeight: 480,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 10,
            marginBottom: 18,
          }}
        >
          {messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                maxWidth: "85%",
                alignSelf: msg.fromBot ? "flex-start" : "flex-end",
                background: msg.fromBot ? "#fff" : "linear-gradient(135deg,#f9c74f,#f3722c)",
                color: msg.fromBot ? "#0a0a0a" : "#0a0000",
                borderRadius: 16,
                borderTopLeftRadius: msg.fromBot ? 4 : 16,
                borderTopRightRadius: msg.fromBot ? 16 : 4,
                padding: "12px 16px",
                fontSize: 14,
                lineHeight: 1.5,
                border: msg.fromBot ? "1px solid rgba(124,58,237,0.1)" : "none",
              }}
            >
              {msg.text}
            </div>
          ))}
 
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
            {suggestedFaqs.map((faq, idx) => (
              <button
                key={idx}
                onClick={() => handleChipPress(faq)}
                style={{
                  background: "#fff",
                  border: "1px solid rgba(243,114,44,0.3)",
                  borderRadius: 20,
                  padding: "8px 14px",
                  fontSize: 12.5,
                  fontWeight: 700,
                  color: "#f3722c",
                  cursor: "pointer",
                }}
              >
                {faq.q}
              </button>
            ))}
          </div>
        </div>
 
        <div style={{ display: "flex", gap: 10 }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendUserMessage(input)}
            placeholder="Type your question..."
            style={{
              flex: 1,
              borderRadius: 24,
              border: "1px solid rgba(124,58,237,0.2)",
              padding: "14px 20px",
              fontSize: 14,
              outline: "none",
            }}
          />
          <button
            onClick={() => sendUserMessage(input)}
            style={{
              width: 48, height: 48, borderRadius: "50%", border: "none", cursor: "pointer",
              background: "linear-gradient(135deg,#f9c74f,#f3722c)", color: "#0a0000",
              fontSize: 20, fontWeight: 700,
            }}
          >
            →
          </button>
        </div>
      </div>
    </div>
  );
}

 
function DeliveryDetailsPage({ setPage, deliveryInfo, setDeliveryInfo }) {
  const { user } = useAuth();

  const [name, setName] = useState(deliveryInfo?.name || user?.name || "");
  const [contact, setContact] = useState(deliveryInfo?.contact || user?.phone || "");
  const [house, setHouse] = useState(deliveryInfo?.house || "");
  const [room, setRoom] = useState(deliveryInfo?.room || "");
  const [address, setAddress] = useState(deliveryInfo?.address || "");
  const [slot, setSlot] = useState(deliveryInfo?.slot || "morning");
  const [error, setError] = useState(null);

  // --- Map picker state ---
  const DEFAULT_CENTER = [12.9716, 77.5946]; // Bengaluru, KA — fallback center
  const [coords, setCoords] = useState(deliveryInfo?.coords || null);
  const [geoStatus, setGeoStatus] = useState(null); // null | "locating" | "geocoding" | "error"
  const mapDivRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  // Reverse-geocode lat/lng -> address text using OpenStreetMap's free Nominatim API
  const reverseGeocode = async (lat, lng) => {
    setGeoStatus("geocoding");
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`
      );
      const data = await res.json();
      if (data?.display_name) {
        setAddress(data.display_name);
      }
    } catch {
      // Silently ignore — user can still type the address manually
    } finally {
      setGeoStatus(null);
    }
  };

  const placeMarker = (lat, lng, { pan } = { pan: false }) => {
    setCoords({ lat, lng });
    if (mapRef.current) {
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else {
        markerRef.current = L.marker([lat, lng], { draggable: true }).addTo(mapRef.current);
        markerRef.current.on("dragend", (e) => {
          const { lat: dLat, lng: dLng } = e.target.getLatLng();
          setCoords({ lat: dLat, lng: dLng });
          reverseGeocode(dLat, dLng);
        });
      }
      if (pan) mapRef.current.setView([lat, lng], 16);
    }
  };

  // Initialize the Leaflet map once on mount
  useEffect(() => {
    if (mapRef.current || !mapDivRef.current) return;
    const startCenter = coords ? [coords.lat, coords.lng] : DEFAULT_CENTER;
    const map = L.map(mapDivRef.current).setView(startCenter, coords ? 16 : 12);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);
    mapRef.current = map;

    if (coords) {
      placeMarker(coords.lat, coords.lng);
    }

    map.on("click", (e) => {
      placeMarker(e.latlng.lat, e.latlng.lng);
      reverseGeocode(e.latlng.lat, e.latlng.lng);
    });

    // Leaflet sometimes mis-measures its container size if it was hidden/animated on mount
    const invalidateTimer = setTimeout(() => {
      if (mapRef.current === map) map.invalidateSize();
    }, 200);

    return () => {
      clearTimeout(invalidateTimer);
      map.remove();
      if (mapRef.current === map) mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setError("Location access isn't supported on this browser.");
      return;
    }
    setGeoStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        placeMarker(latitude, longitude, { pan: true });
        reverseGeocode(latitude, longitude);
        setGeoStatus(null);
      },
      () => {
        setGeoStatus(null);
        setError("Couldn't get your location. Please allow location access or drop a pin manually.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSaveAndContinue = () => {
    if (!name.trim() || !contact.trim() || !house.trim() || !address.trim()) {
      setError("Please fill in Name, Contact, House/Apartment, and Address before continuing.");
      return;
    }
    if (!/^[0-9]{10}$/.test(contact.trim())) {
      setError("Please enter a valid 10-digit contact number.");
      return;
    }
    setDeliveryInfo({
      name: name.trim(),
      contact: contact.trim(),
      house: house.trim(),
      room: room.trim(),
      address: address.trim(),
      slot,
      coords,
    });
    setPage("cart");
  };

  const inputStyle = {
    width: "100%", padding: "12px 14px", borderRadius: 10,
    border: "1px solid rgba(0,0,0,0.12)", background: "#faf9f9",
    color: "#0a0a0a", fontSize: 14, outline: "none", boxSizing: "border-box",
    marginBottom: 14,
  };

  const labelStyle = { fontSize: 13, fontWeight: 700, color: "rgba(11,11,11,0.6)", marginBottom: 6, display: "block" };

  return (
    <div style={{ paddingTop: 100, minHeight: "100vh", background: "#fff", padding: "100px 24px 100px" }}>
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        <h1 style={{ fontFamily: "'Playfair Display',serif", fontWeight: 900, fontSize: 40, marginBottom: 10 }}>
          Delivery{" "}
          <span style={{ background: "linear-gradient(135deg,#7c3aed,#a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Details
          </span>
        </h1>
        <p style={{ color: "rgba(11,11,11,0.6)", fontSize: 14, marginBottom: 30 }}>
          Tell us where and when to deliver your order.
        </p>

        {error && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", borderRadius: 12, padding: "12px 16px", marginBottom: 20, fontSize: 14 }}>
            {error}
          </div>
        )}

        <label style={labelStyle}>Full Name</label>
        <input
          style={inputStyle}
          placeholder="e.g. Tejashwini G M"
          value={name}
          onChange={e => { setName(e.target.value); setError(null); }}
        />

        <label style={labelStyle}>Contact Number</label>
        <input
          style={inputStyle}
          placeholder="10-digit mobile number"
          value={contact}
          maxLength={10}
          inputMode="numeric"
          onChange={e => { setContact(e.target.value.replace(/[^0-9]/g, "")); setError(null); }}
        />

        <label style={labelStyle}>Pin your location on the map</label>
        <div style={{ marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "rgba(11,11,11,0.5)" }}>
            Tap the map or drag the pin — we'll fill in the address for you.
          </span>
          <button
            type="button"
            onClick={handleUseMyLocation}
            disabled={geoStatus === "locating"}
            style={{
              background: "none", border: "1px solid #7c3aed", color: "#7c3aed",
              borderRadius: 8, padding: "6px 10px", fontSize: 12, fontWeight: 700,
              cursor: "pointer", whiteSpace: "nowrap", marginLeft: 8,
              opacity: geoStatus === "locating" ? 0.6 : 1,
            }}
          >
            {geoStatus === "locating" ? "Locating…" : "📍 Use my location"}
          </button>
        </div>
        <div
          ref={mapDivRef}
          style={{
            width: "100%", height: 260, borderRadius: 12, marginBottom: 8,
            border: "1px solid rgba(0,0,0,0.12)", overflow: "hidden",
          }}
        />
        {geoStatus === "geocoding" && (
          <div style={{ fontSize: 12, color: "rgba(11,11,11,0.5)", marginBottom: 10 }}>Finding address for this location…</div>
        )}
        {!geoStatus && <div style={{ marginBottom: 10 }} />}

        <label style={labelStyle}>House Name / Apartment</label>
        <input
          style={inputStyle}
          placeholder="e.g. Green Valley Apartments"
          value={house}
          onChange={e => { setHouse(e.target.value); setError(null); }}
        />

        <label style={labelStyle}>Room / Flat No.</label>
        <input
          style={inputStyle}
          placeholder="e.g. 204, Block B"
          value={room}
          onChange={e => { setRoom(e.target.value); setError(null); }}
        />

        <label style={labelStyle}>Address</label>
        <textarea
          style={{ ...inputStyle, minHeight: 80, resize: "vertical" }}
          placeholder="Street, area, city, pincode (auto-filled from the map, editable)"
          value={address}
          onChange={e => { setAddress(e.target.value); setError(null); }}
        />

        <label style={labelStyle}>Delivery slot</label>
        <div style={{ display: "flex", gap: 10, marginBottom: 26 }}>
          {[{ value: "morning", label: "☀️ Morning" }, { value: "evening", label: "🌙 Evening" }].map(opt => (
            <div
              key={opt.value}
              onClick={() => setSlot(opt.value)}
              style={{
                flex: 1, textAlign: "center", padding: "12px", borderRadius: 10, cursor: "pointer",
                border: slot === opt.value ? "2px solid #7c3aed" : "1px solid rgba(0,0,0,0.1)",
                background: slot === opt.value ? "#f5f3ff" : "#fff",
                fontWeight: 700, fontSize: 14, color: "#0a0a0a",
              }}
            >
              {opt.label}
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={() => setPage("cart")}
            style={{ flex: 1, padding: "13px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.15)", background: "#fff", color: "rgba(11,11,11,0.7)", fontWeight: 700, fontSize: 14, cursor: "pointer" }}
          >
            Back to Cart
          </button>
          <Btn variant="gold" onClick={handleSaveAndContinue} style={{ flex: 2, fontSize: 15, padding: "13px", textAlign: "center" }}>
            Save & Continue →
          </Btn>
        </div>
      </div>
    </div>
  );
}

function CartPage({ setPage, deliveryAddress, deliverySlot, activeSubscriptionPlan }) {
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
  const itemsTotal = items.reduce((s, i) => s + (i.productId?.price || 0) * i.quantity, 0);
  const planFee = activeSubscriptionPlan?.price || 0;
  // The real payable amount: the plan's own monthly/weekly/daily fee PLUS whatever
  // extra items were added to the cart (from the Subscription page or Products page).
  const total = itemsTotal + planFee;
 
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
          // Plan fee isn't a cart product, so it's sent separately — the backend
          // recomputes the real fee itself from planId + freq (see Orders.js).
          subscriptionPlanId: activeSubscriptionPlan?.id || null,
          subscriptionPlanFreq: activeSubscriptionPlan?.freq || null,
          subscriptionPlanFee: planFee, // sent for reference only — backend ignores this and recomputes
        }),
      });
      if (!orderRes.ok) throw new Error("Could not create order");
      const order = await orderRes.json();
 
      // 2. Create matching Razorpay order — the backend now looks up the
      // saved order's own totalAmount rather than trusting a client-sent amount.
      const rpOrderRes = await fetch(`${API_URL}/api/orders/create-razorpay-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ orderId: order._id }),
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
        customer_id: rpOrder.customerId, // links this checkout to the user's Razorpay Customer — enables "Save this card"
        prefill: {
          name: user?.name,
          email: rpOrder.prefillEmail || user?.email,
          contact: rpOrder.prefillContact || user?.phone,
        },
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

        {activeSubscriptionPlan && (
          <div style={{
            borderRadius: 16, padding: "20px 24px", marginBottom: 24,
            background: `${activeSubscriptionPlan.color}15`,
            border: `1px solid ${activeSubscriptionPlan.color}55`,
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 20 }}>📦</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: "#0a0a0a" }}>
                    {activeSubscriptionPlan.name} Plan Subscription
                  </div>
                  <div style={{ fontSize: 12.5, color: "rgba(11,11,11,0.6)" }}>
                    ₹{activeSubscriptionPlan.price?.toLocaleString()}/{activeSubscriptionPlan.period} base plan · Billed {activeSubscriptionPlan.period}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setPage("subscription")}
                style={{ background: "none", border: "none", color: activeSubscriptionPlan.color, fontWeight: 700, fontSize: 13, cursor: "pointer" }}
              >
                Change Plan
              </button>
            </div>

            {activeSubscriptionPlan.planItems?.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", color: "rgba(11,11,11,0.5)", marginBottom: 8 }}>
                  Plan Includes
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {activeSubscriptionPlan.planItems.map(item => (
                    <span key={item} style={{ fontSize: 12, padding: "5px 10px", borderRadius: 20, background: "#fff", border: `1px solid ${activeSubscriptionPlan.color}44`, color: "#0a0a0a" }}>
                      ✓ {item}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {activeSubscriptionPlan.selectedItems?.length > 0 && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", color: "rgba(11,11,11,0.5)" }}>
                    Your Selected Items ({activeSubscriptionPlan.selectedItems.length}/{activeSubscriptionPlan.maxItems})
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#0a0a0a" }}>
                    ₹{activeSubscriptionPlan.selectedTotal?.toLocaleString()} total
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {activeSubscriptionPlan.selectedItems.map(item => (
                    <div key={item.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "rgba(11,11,11,0.85)", background: "#fff", borderRadius: 8, padding: "8px 12px" }}>
                      <span>{item.name}</span>
                      <span>₹{item.price}/{item.unit}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {error && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", borderRadius: 12, padding: "12px 16px", marginBottom: 20, fontSize: 14 }}>
            {error}
          </div>
        )}
 
        {items.length === 0 && !activeSubscriptionPlan ? (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <div style={{ fontSize: 80, marginBottom: 20 }}>🛒</div>
            <h3 style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: 28, color: "rgba(11,11,11,0.95)", marginBottom: 12 }}>Your cart is empty</h3>
            <Btn variant="gold" onClick={() => setPage("products")} style={{ fontSize: 15, padding: "13px 28px", marginTop: 10 }}>Browse Products →</Btn>
          </div>
        ) : (
          <div className="cart-grid" style={{ display: "grid", gap: 30 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {items.length === 0 ? (
                <div style={{
                  borderRadius: 18, padding: "26px 22px", textAlign: "center",
                  background: "#f5f3ff", border: "1px dashed rgba(124,58,237,0.25)",
                  color: "rgba(11,11,11,0.55)", fontSize: 13.5,
                }}>
                  No extra items added yet. <button onClick={() => setPage("products")} style={{ background: "none", border: "none", color: "#7c3aed", fontWeight: 700, cursor: "pointer", fontSize: 13.5 }}>Browse products →</button>
                </div>
              ) : items.map(item => (
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
                    <span>Items Subtotal</span><span>₹{itemsTotal}</span>
                  </div>
                  {activeSubscriptionPlan && (
                    <div style={{ display: "flex", justifyContent: "space-between", color: "rgba(11,11,11,0.7)", fontSize: 14 }}>
                      <span>{activeSubscriptionPlan.name} Plan Fee</span><span>₹{planFee.toLocaleString()}</span>
                    </div>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", color: "rgba(11,11,11,0.7)", fontSize: 14 }}>
                    <span>Delivery</span><span style={{ color: "#16a34a" }}>Free</span>
                  </div>
                  <div style={{ height: 1, background: "linear-gradient(90deg,transparent,rgba(124,58,237,0.3),transparent)" }} />
                  <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 22, color: "#0a0a0a" }}>
                    <span>Total</span>
                    <span style={{ background: "linear-gradient(135deg,#7c3aed,#a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>₹{total.toLocaleString()}</span>
                  </div>
                </div>

                <div
                  style={{
                    borderRadius: 12,
                    padding: "12px 14px",
                    marginBottom: 16,
                    background: "#fff",
                    border: "1px solid rgba(124,58,237,0.15)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(11,11,11,0.5)", textTransform: "uppercase", marginBottom: 4 }}>
                        Deliver to
                      </div>
                      {deliveryAddress ? (
                        <>
                          <div style={{ fontSize: 14, fontWeight: 600, color: "#0a0a0a" }}>{deliveryAddress}</div>
                          <div style={{ fontSize: 12, color: "rgba(11,11,11,0.55)", marginTop: 2 }}>
                            {deliverySlot === "evening" ? "🌙 Evening" : "☀️ Morning"} delivery
                          </div>
                        </>
                      ) : (
                        <div style={{ fontSize: 13, color: "rgba(11,11,11,0.5)" }}>No address selected yet</div>
                      )}
                    </div>
                    <button
                      onClick={() => setPage("delivery-details")}
                      style={{ background: "none", border: "none", color: "#7c3aed", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
                    >
                      {deliveryAddress ? "Change" : "Add"}
                    </button>
                  </div>
                </div>

                <Btn
                  variant="gold"
                  onClick={() => {
                    if (!deliveryAddress) {
                      setPage("delivery-details");
                      return;
                    }
                    handleCheckout();
                  }}
                  disabled={paying}
                  style={{ width: "100%", fontSize: 16, padding: "14px", display: "block", textAlign: "center", opacity: paying ? 0.7 : 1 }}
                >
                  {paying ? "Processing…" : deliveryAddress ? `💳 Pay ₹${total} Now →` : "Add Delivery Address →"}
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
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMsg, setForgotMsg] = useState("");
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

  const handleForgotSubmit = async () => {
    setForgotMsg("");
    if (!forgotEmail) {
      setForgotMsg("Please enter your email address");
      return;
    }
    setForgotLoading(true);
    try {
      const res = await axios.post(`${API_URL}/api/auth/forgot-password`, { email: forgotEmail });
      setForgotMsg(res.data.message || "If that email exists, a reset link has been sent.");
    } catch (err) {
      setForgotMsg(err.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setForgotLoading(false);
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
            {showForgot ? (
              <>
                <h3 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 20, marginBottom: 10 }}>Reset your password</h3>
                <p style={{ fontSize: 13, color: "rgba(11,11,11,0.7)", marginBottom: 20 }}>Enter your account email and we'll send you a link to reset your password.</p>
                <div style={{ marginBottom: 18 }}>
                  <label style={{ display: "block", fontSize: 13, color: "rgba(11,11,11,0.95)", marginBottom: 6 }}>Email Address</label>
                  <input type="email" placeholder="you@email.com" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} style={inputStyle} />
                </div>
                {forgotMsg && <div style={{ fontSize: 13, marginBottom: 16, textAlign: "center", color: forgotMsg.toLowerCase().includes("sent") ? "#1a8a3d" : "#dc2626" }}>{forgotMsg}</div>}
                <Btn variant="gold" onClick={handleForgotSubmit} style={{ width: "100%", fontSize: 16, padding: "14px", display: "block", textAlign: "center" }}>
                  {forgotLoading ? "Sending..." : "Send Reset Link →"}
                </Btn>
                <div style={{ textAlign: "center", marginTop: 18 }}>
                  <span onClick={() => { setShowForgot(false); setForgotMsg(""); }} style={{ fontSize: 13, color: "#7c3aed", cursor: "pointer" }}>← Back to Log In</span>
                </div>
              </>
            ) : !showOtp ? (
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
{mode === "login" && <span onClick={() => { setShowForgot(true); setForgotEmail(email); setForgotMsg(""); }} style={{ fontSize: 12, color: "#7c3aed", cursor: "pointer" }}>Forgot password?</span>}                  </div>
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

      {/* Book a Call banner — right before Products */}
      <div style={{ padding: "24px 24px 0" }}>
        <div style={{
          maxWidth: 900, margin: "0 auto", borderRadius: 18, padding: "18px 26px",
          display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14,
          background: "linear-gradient(135deg,#f5f3ff,#ede9fe)", border: "1px solid rgba(124,58,237,0.15)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 26 }}>📞</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#0a0a0a" }}>Not sure what to order?</div>
              <div style={{ fontSize: 13, color: "rgba(11,11,11,0.6)" }}>Book a free call and we'll help you pick.</div>
            </div>
          </div>
          <Btn variant="sub" onClick={() => { setPage("bookcall"); window.scrollTo(0, 0); }} style={{ fontSize: 14, padding: "11px 22px" }}>
            Book a Call →
          </Btn>
        </div>
      </div>

      {/* Products preview */}
      <section className="section-pad" style={{ background: "#fff", padding: "90px 24px" }}>
        <div style={{ maxWidth: 1600, margin: "0 auto" }}>
          <SectionHead badge="Farm Fresh" badgeColor="#ff6b35" title="Our Products" titleClass="tg-gold"
            sub="Pure A2 dairy, ghee & artisan products made with zero additives and maximum love." />
          <style>{`
            .home-products-grid {
              display: grid;
              grid-template-columns: repeat(8, 1fr);
              gap: 18px;
              margin-bottom: 44px;
            }
            @media (max-width: 1400px) {
              .home-products-grid { grid-template-columns: repeat(6, 1fr); }
            }
            @media (max-width: 1100px) {
              .home-products-grid { grid-template-columns: repeat(4, 1fr); }
            }
            @media (max-width: 700px) {
              .home-products-grid { grid-template-columns: repeat(2, 1fr); }
            }
          `}</style>
          <div className="home-products-grid">
            {PRODUCTS.slice(0, 8).map(p => <ProductCard key={p.id} p={p} addToCart={addToCart} />)}
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
                ₹{pl.prices.monthly.toLocaleString()}
              </span>
              <span style={{ color: "rgba(11,11,11,0.6)", fontSize: 14 }}>/month</span>
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

      {/* Book a Discovery Call */}
      <section className="section-pad" style={{ background: "#f5f3ff", padding: "70px 24px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", textAlign: "center" }}>
          <div style={{ fontSize: 46, marginBottom: 12 }}>📞</div>
          <h2 style={{ fontFamily: "'Playfair Display',serif", fontWeight: 900, fontSize: 30, marginBottom: 10, color: "#0a0a0a" }}>
            Not sure where to start?
          </h2>
          <p style={{ color: "rgba(11,11,11,0.6)", fontSize: 15, marginBottom: 26, lineHeight: 1.7 }}>
            Book a free discovery call — pick a date and time that works for you, and we'll walk you through plans, products, and what fits your family best.
          </p>
          <Btn variant="sub" onClick={() => { setPage("bookcall"); window.scrollTo(0, 0); }} style={{ fontSize: 15, padding: "13px 30px" }}>
            Book a Discovery Call →
          </Btn>
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
              <span style={{ fontFamily: "'Playfair Display',serif", fontWeight: 900, fontSize: 17, color: "#fff" }}><span className="tg-gold">CNN</span> Farm Hub</span>
            </div>
            <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 14, lineHeight: 1.8, marginBottom: 20 }}>Farm-fresh A2 dairy delivered to your doorstep every morning. Pure. Natural. Trusted since 2009.</p>
            <div style={{ display: "flex", gap: 10 }}>
              {["📘", "📷", "🐦", "📱"].map((ic, i) => (
                <button key={i} onClick={() => createSound("click")} style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(124,58,237,0.2)", border: "1px solid rgba(124,58,237,0.35)", color: "#000", cursor: "pointer", fontSize: 16 }}>{ic}</button>
              ))}
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h4 style={{ fontWeight: 700, fontSize: 14, color: "#fff", marginBottom: 18, letterSpacing: 1, textTransform: "uppercase" }}>Quick Links</h4>
            {["home", "products", "farm", "families", "subscription", "contact"].map(l => (
              <div key={l} onClick={() => go(l)} style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, marginBottom: 10, cursor: "pointer", textTransform: "capitalize", transition: "color .25s" }}
                onMouseEnter={e => e.target.style.color = "#fff"}
                onMouseLeave={e => e.target.style.color = "rgba(255,255,255,0.6)"}>{l === "farm" ? "Our Farm" : l}</div>
            ))}
          </div>

          {/* Products */}
          <div>
            <h4 style={{ fontWeight: 700, fontSize: 14, color: "#fff", marginBottom: 18, letterSpacing: 1, textTransform: "uppercase" }}>Products</h4>
            {["A2 Desi Milk", "Bilona Ghee", "Fresh Paneer", "Cultured Dahi", "White Butter", "Farm Lassi"].map(p => (
              <div key={p} style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, marginBottom: 10 }}>{p}</div>
            ))}
          </div>

          {/* Contact */}
          <div>
            <h4 style={{ fontWeight: 700, fontSize: 14, color: "#fff", marginBottom: 18, letterSpacing: 1, textTransform: "uppercase" }}>Contact</h4>
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
            <span style={{ background: "rgba(255,255,255,0.08)", borderRadius: 6, padding: "3px 10px", fontSize: 12, fontWeight: 700, color: "#fff" }}>Razorpay</span>
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
function ResetPasswordPage({ token, setPage }) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const inputStyle = {
    width: "100%", padding: "12px 14px", borderRadius: 10,
    border: "1px solid rgba(124,58,237,0.2)", background: "#fff",
    color: "#0a0a0a", fontSize: 14, outline: "none", boxSizing: "border-box",
  };

  const handleReset = async () => {
    setError("");
    setSuccess("");

    if (!token) {
      setError("This reset link is invalid or missing a token.");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/api/auth/reset-password`, { token, newPassword });
      setSuccess(res.data.message || "Password reset successful. You can now log in.");
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ paddingTop: 140, minHeight: "100vh", background: "#fff", display: "flex", justifyContent: "center" }}>
      <div style={{ maxWidth: 420, width: "100%", padding: "0 24px" }}>
        <h2 style={{ fontFamily: "'Playfair Display',serif", fontWeight: 900, fontSize: 32, marginBottom: 10 }}>
          Set a new password
        </h2>

        {!success ? (
          <>
            <p style={{ fontSize: 13, color: "rgba(11,11,11,0.7)", marginBottom: 24 }}>
              Enter a new password for your account below.
            </p>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 13, color: "rgba(11,11,11,0.95)", marginBottom: 6 }}>New Password</label>
              <input type="password" placeholder="••••••••" value={newPassword} onChange={e => setNewPassword(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 13, color: "rgba(11,11,11,0.95)", marginBottom: 6 }}>Confirm Password</label>
              <input type="password" placeholder="••••••••" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} style={inputStyle} />
            </div>
            {error && <div style={{ fontSize: 13, marginBottom: 16, textAlign: "center", color: "#dc2626" }}>{error}</div>}
            <Btn variant="gold" onClick={handleReset} style={{ width: "100%", fontSize: 16, padding: "14px", display: "block", textAlign: "center" }}>
              {loading ? "Resetting..." : "Reset Password →"}
            </Btn>
          </>
        ) : (
          <>
            <div style={{ fontSize: 14, marginBottom: 20, textAlign: "center", color: "#1a8a3d" }}>{success}</div>
            <Btn variant="gold" onClick={() => setPage("login")} style={{ width: "100%", fontSize: 16, padding: "14px", display: "block", textAlign: "center" }}>
              Go to Login →
            </Btn>
          </>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState("home");
  const [resetToken, setResetToken] = useState(null);
  const [cart, setCart] = useState([]);
  const [PRODUCTS, setPRODUCTS] = useState([]);
  const [activeSubscriptionPlan, setActiveSubscriptionPlan] = useState(null); // { id, name, price, period, color } | null
  const [productsLoading, setProductsLoading] = useState(true);
  const [deliveryInfo, setDeliveryInfo] = useState(null);

  // Formatted single-line address string for display and for the order payload —
  // keeps CartPage/backend unchanged while the form itself captures structured fields.
  const deliveryAddress = deliveryInfo
    ? [
        deliveryInfo.house + (deliveryInfo.room ? `, ${deliveryInfo.room}` : ""),
        deliveryInfo.address,
        `${deliveryInfo.name} (${deliveryInfo.contact})`,
      ].join(" — ")
    : null;
  const deliverySlot = deliveryInfo?.slot || "morning";

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get("resetToken");
    if (tokenFromUrl) {
      setResetToken(tokenFromUrl);
      setPage("resetPassword");
    }
  }, []);

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
      case "farm": return <FarmPage setPage={navigate} />;
      case "farm-visit": return <FarmVisitBookingPage setPage={navigate} />;
      case "bookcall": return <BookCallPage setPage={navigate} />;
      case "families": return <FamiliesPage setPage={navigate} />;
      case "subscription": return <SubPage setPage={navigate} PRODUCTS={PRODUCTS} addToCart={addToCart} setActiveSubscriptionPlan={setActiveSubscriptionPlan} />;
      case "contact": return <ContactPage />;
      case "cart": return (
        <CartPage
          cart={cart}
          setCart={setCart}
          setPage={navigate}
          deliveryAddress={deliveryAddress}
          deliverySlot={deliverySlot}
          activeSubscriptionPlan={activeSubscriptionPlan}
        />
      );
      case "delivery-details": return (
        <DeliveryDetailsPage
          setPage={navigate}
          deliveryInfo={deliveryInfo}
          setDeliveryInfo={setDeliveryInfo}
        />
      );
      case "orders": return <OrdersPage setPage={navigate} />;
      case "chatbot": return <ChatbotPage setPage={navigate} />;      case "login": return <LoginPage setPage={navigate} />;
      case "resetPassword": return <ResetPasswordPage token={resetToken} setPage={navigate} />;
      case "admin": return <AdminPage />;
      case "account": return <ProfilePage setPage={navigate} />;
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

      {!["cart", "login", "resetPassword"].includes(page) && <Footer setPage={navigate} />}
<BottomSwitcher page={page} setPage={navigate} />
<ChatBubble page={page} setPage={navigate} />
      {toast && <Toast msg={toast} onDone={() => setToast(null)} />}

      {/* Spacer for bottom switcher */}
      <div style={{ height: 80 }} />
    </div>
  );
}