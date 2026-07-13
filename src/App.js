import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
 
/* ------------------------------------------------------------------ */
/*  CNN Farm Hub — Fresh From Our Farm                                  */
/*  Single-file React conversion of the original static HTML design.   */
/* ------------------------------------------------------------------ */
 
const PRODUCTS = [
  {
    tag: "Dairy Fresh",
    name: "Fresh Cow Milk",
    desc: "Farm-fresh, chilled the same morning it's milked.",
    price: "₹60 / litre",
    swatch: "linear-gradient(150deg,#8A5A2E,#3C2411 75%)",
    icon: (
      <>
        <path d="M18 6h12v6l4 8v20a2 2 0 0 1-2 2H16a2 2 0 0 1-2-2V20l4-8z" />
        <path d="M14 24h20" />
      </>
    ),
  },
  {
    tag: "Bilona Method",
    name: "Pure Desi Ghee",
    desc: "Slow-churned the traditional way for rich aroma.",
    price: "₹950 / kg",
    swatch: "linear-gradient(150deg,#C1440E,#4A1706 75%)",
    icon: (
      <>
        <rect x="12" y="18" width="24" height="18" rx="2" />
        <path d="M16 18v-4a8 8 0 0 1 16 0v4" />
      </>
    ),
  },
  {
    tag: "Handmade",
    name: "Homemade Paneer",
    desc: "Soft, fresh-cut paneer made daily in small batches.",
    price: "₹320 / kg",
    swatch: "linear-gradient(150deg,#E8A33D,#7A5316 75%)",
    icon: (
      <>
        <rect x="10" y="14" width="28" height="20" rx="2" />
        <path d="M10 20h28" />
      </>
    ),
  },
  {
    tag: "Probiotic",
    name: "Fresh Curd / Dahi",
    desc: "Set overnight the old-fashioned way, thick and tangy.",
    price: "₹70 / 500g",
    swatch: "linear-gradient(150deg,#B26B3C,#4A2A16 75%)",
    icon: <path d="M14 20a10 10 0 0 1 20 0c0 6-4 8-4 14H18c0-6-4-8-4-14z" />,
  },
  {
    tag: "Churned Fresh",
    name: "Farm Butter",
    desc: "Unsalted, creamy butter churned from farm-fresh cream.",
    price: "₹450 / kg",
    swatch: "linear-gradient(150deg,#D97F2E,#5C3210 75%)",
    icon: <rect x="10" y="16" width="28" height="16" rx="3" />,
  },
  {
    tag: "A2 Quality",
    name: "A2 Buffalo Milk",
    desc: "Rich and creamy, sourced from our own buffalo herd.",
    price: "₹90 / litre",
    swatch: "linear-gradient(150deg,#9C5A2A,#3D2210 75%)",
    icon: (
      <>
        <path d="M18 6h12v6l4 8v20a2 2 0 0 1-2 2H16a2 2 0 0 1-2-2V20l4-8z" />
        <path d="M14 24h20" />
      </>
    ),
  },
];
 
const HERD = [
  {
    letter: "G",
    bg: "linear-gradient(135deg,var(--gold-light),var(--gold))",
    name: "Ganga",
    breed: "Gir Cow",
    desc: "Our gentlest milker — first in line every morning, rain or shine.",
  },
  {
    letter: "L",
    bg: "linear-gradient(135deg,var(--rust-light),var(--rust))",
    name: "Lakshmi",
    breed: "Sahiwal Cow",
    desc: "The herd's leader — she decides when everyone heads to the shade.",
  },
  {
    letter: "K",
    bg: "linear-gradient(135deg,#B26B3C,#7A4420)",
    name: "Kaveri",
    breed: "HF Cross",
    desc: "Our top milk producer, and famously fond of afternoon naps.",
  },
  {
    letter: "Y",
    bg: "linear-gradient(135deg,#D97F2E,#8A4A18)",
    name: "Yamuna",
    breed: "Buffalo",
    desc: "Source of our A2 buffalo milk — calm, curious, and a little vain.",
  },
];
 
const BADGES = [
  {
    icon: <path d="M24 5l6 12 13 2-9.5 9 2 13L24 34l-11.5 7 2-13L5 19l13-2z" />,
    title: "100% Organic",
    desc: "No chemicals, no shortcuts",
  },
  {
    icon: (
      <>
        <circle cx="24" cy="24" r="18" />
        <path d="M24 14v10l7 5" />
      </>
    ),
    title: "Fresh Daily",
    desc: "Milked and delivered same day",
  },
  {
    icon: (
      <>
        <path d="M8 18h32v18a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2z" />
        <path d="M8 18l4-10h24l4 10" />
      </>
    ),
    title: "No Preservatives",
    desc: "Just milk, the way it should be",
  },
  {
    icon: (
      <>
        <rect x="6" y="16" width="24" height="16" rx="1" />
        <path d="M30 22h6l6 6v4h-12z" />
        <circle cx="15" cy="36" r="3" />
        <circle cx="35" cy="36" r="3" />
      </>
    ),
    title: "Farm Direct",
    desc: "No middlemen, straight to you",
  },
];
 
/* ---------------- Reveal-on-scroll wrapper ---------------- */
function Reveal({ as: Tag = "div", className = "", style, children }) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
 
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setInView(true);
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
 
  return (
    <Tag ref={ref} className={`reveal ${inView ? "in" : ""} ${className}`} style={style}>
      {children}
    </Tag>
  );
}
 
/* ---------------- Letter-split animated heading ---------------- */
function SplitLetters({ text, baseDelay = 0, stepDelay = 0.025, triggerOnView = false, tag: Tag = "span" }) {
  const ref = useRef(null);
  const [started, setStarted] = useState(!triggerOnView);
 
  useEffect(() => {
    if (!triggerOnView) return;
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setStarted(true);
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.4 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [triggerOnView]);
 
  const words = text.split(" ");
  let charCount = 0;
 
  return (
    <Tag ref={ref}>
      {words.map((word, wi) => {
        const wordSpan = (
          <span className="split-word" key={wi}>
            {[...word].map((ch, ci) => {
              const idx = charCount++;
              return (
                <span
                  key={ci}
                  className="letter"
                  style={{
                    animationDelay: started ? `${baseDelay + idx * stepDelay}s` : undefined,
                    animationPlayState: started ? "running" : "paused",
                    opacity: started ? undefined : 0,
                  }}
                >
                  {ch}
                </span>
              );
            })}
          </span>
        );
        return (
          <React.Fragment key={`f-${wi}`}>
            {wordSpan}
            {wi < words.length - 1 && <span className="letter-space" />}
          </React.Fragment>
        );
      })}
    </Tag>
  );
}
 
/* ---------------- Particles ---------------- */
function Particles({ count = 22 }) {
  const particles = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        left: Math.random() * 100 + "%",
        duration: 8 + Math.random() * 10 + "s",
        delay: Math.random() * 10 + "s",
        size: 3 + Math.random() * 4 + "px",
      })),
    [count]
  );
 
  return (
    <div className="particles">
      {particles.map((p, i) => (
        <div
          key={i}
          className="particle"
          style={{
            left: p.left,
            bottom: "-10px",
            animationDuration: p.duration,
            animationDelay: p.delay,
            width: p.size,
            height: p.size,
          }}
        />
      ))}
    </div>
  );
}
 
/* ---------------- Main component ---------------- */
export default function CnnFarmHub() {
  const [navScrolled, setNavScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", msg: "" });
  const [sent, setSent] = useState(false);
 
  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
 
  const closeMenu = useCallback(() => setMenuOpen(false), []);
 
  const handleSubmit = (e) => {
    e.preventDefault();
    setSent(true);
    setTimeout(() => {
      setSent(false);
      setForm({ name: "", phone: "", msg: "" });
    }, 2400);
  };
 
  const line1 = "Fresh From Our Farm";
  const line2 = "To Your Home";
  const line1Len = [...line1].length;
 
  return (
    <div className="cfh-root">
      <style>{`
        .cfh-root{
          --bg:#2B1810;
          --bg2:#3D2417;
          --rust:#C1440E;
          --rust-light:#E86A34;
          --gold:#E8A33D;
          --gold-light:#F4C978;
          --cream:#FBF3E4;
          --ink:#1C1108;
          --shadow:0 24px 55px rgba(0,0,0,0.4);
          background:var(--bg);
          color:var(--cream);
          font-family:'Work Sans',sans-serif;
          font-weight:400;
          overflow-x:hidden;
          position:relative;
        }
        .cfh-root *{box-sizing:border-box;}
        .cfh-root h1,.cfh-root h2,.cfh-root h3,.cfh-root .display{font-family:'Fraunces',serif;font-weight:700;}
        .cfh-root a{color:inherit;text-decoration:none;}
        .cfh-root img{max-width:100%;display:block;}
        .cfh-root .wrap{max-width:1180px;margin:0 auto;padding:0 6vw;}
        @media(min-width:1000px){.cfh-root .wrap{padding:0 4vw;}}
        .cfh-root .eyebrow{font-size:0.72rem;letter-spacing:0.32em;text-transform:uppercase;color:var(--gold-light);font-weight:600;}
        .cfh-root button,.cfh-root .btn{font-family:'Work Sans',sans-serif;cursor:pointer;border:none;outline:none;font-weight:600;}
        .cfh-root .btn{display:inline-flex;align-items:center;gap:10px;padding:16px 32px;font-size:0.85rem;text-transform:uppercase;letter-spacing:0.1em;border-radius:3px;transition:transform .35s ease, box-shadow .35s ease;}
        .cfh-root .btn-rust{background:linear-gradient(135deg,var(--rust-light),var(--rust));color:var(--cream);}
        .cfh-root .btn-rust:hover{transform:translateY(-3px);box-shadow:0 16px 32px rgba(193,68,14,0.4);}
        .cfh-root .btn-outline{border:1px solid rgba(251,243,228,0.4);color:var(--cream);background:transparent;}
        .cfh-root .btn-outline:hover{border-color:var(--gold-light);color:var(--gold-light);transform:translateY(-3px);}
        .cfh-root :focus-visible{outline:2px solid var(--gold-light);outline-offset:3px;}
 
        .cfh-root .split-word{display:inline-block;white-space:nowrap;}
        .cfh-root .letter{display:inline-block;opacity:0;transform:translateY(30px) rotate(5deg);animation:cfhLetterIn .7s cubic-bezier(.2,.8,.2,1) forwards;}
        @keyframes cfhLetterIn{to{opacity:1;transform:translateY(0) rotate(0);}}
        .cfh-root .letter-space{display:inline-block;width:0.3em;}
 
        .cfh-root nav{position:fixed;top:0;left:0;right:0;z-index:100;display:flex;align-items:center;justify-content:space-between;padding:22px 6vw;transition:background .4s ease,padding .4s ease,backdrop-filter .4s ease;}
        .cfh-root nav.scrolled{background:rgba(43,24,16,0.9);backdrop-filter:blur(10px);padding:14px 6vw;box-shadow:0 2px 24px rgba(0,0,0,0.35);}
        .cfh-root .brandmark{font-family:'Fraunces',serif;font-weight:700;font-size:1.3rem;}
        .cfh-root .brandmark span{color:var(--gold-light);}
        .cfh-root .nav-links{display:none;gap:36px;font-size:0.82rem;letter-spacing:0.06em;text-transform:uppercase;}
        .cfh-root .nav-links a{position:relative;padding-bottom:4px;}
        .cfh-root .nav-links a::after{content:"";position:absolute;left:0;bottom:0;width:0;height:1px;background:var(--gold-light);transition:width .3s ease;}
        .cfh-root .nav-links a:hover::after{width:100%;}
        @media(min-width:840px){.cfh-root .nav-links{display:flex;}}
        .cfh-root .nav-cta{display:none;}
        @media(min-width:840px){.cfh-root .nav-cta{display:inline-flex;padding:11px 22px;}}
        .cfh-root .hamburger{display:flex;flex-direction:column;gap:5px;background:none;border:none;padding:6px;}
        .cfh-root .hamburger span{width:24px;height:1.5px;background:var(--cream);display:block;}
        @media(min-width:840px){.cfh-root .hamburger{display:none;}}
        .cfh-root .mobile-menu{position:fixed;inset:0;background:var(--bg);z-index:99;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:34px;opacity:0;pointer-events:none;transition:opacity .35s ease;}
        .cfh-root .mobile-menu.open{opacity:1;pointer-events:auto;}
        .cfh-root .mobile-menu a{font-family:'Fraunces',serif;font-size:1.8rem;}
        .cfh-root .mobile-close{position:absolute;top:24px;right:6vw;background:none;border:none;color:var(--cream);font-size:1.8rem;}
 
        .cfh-root .hero{position:relative;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:120px 6vw 90px;overflow:hidden;}
        .cfh-root .bg-anim{position:absolute;inset:0;z-index:0;background:linear-gradient(160deg,#33190F 0%,#2B1810 55%,#1E0F09 100%);}
        .cfh-root .blob{position:absolute;border-radius:50%;filter:blur(70px);opacity:0.55;}
        .cfh-root .blob1{width:520px;height:520px;background:radial-gradient(circle,var(--rust) 0%, transparent 70%);top:-10%;left:-8%;animation:cfhFloat1 18s ease-in-out infinite;}
        .cfh-root .blob2{width:460px;height:460px;background:radial-gradient(circle,var(--gold) 0%, transparent 70%);bottom:-12%;right:-6%;animation:cfhFloat2 22s ease-in-out infinite;}
        .cfh-root .blob3{width:340px;height:340px;background:radial-gradient(circle,var(--rust-light) 0%, transparent 70%);top:30%;right:18%;animation:cfhFloat3 15s ease-in-out infinite;}
        @keyframes cfhFloat1{0%,100%{transform:translate(0,0) scale(1);}50%{transform:translate(60px,40px) scale(1.15);}}
        @keyframes cfhFloat2{0%,100%{transform:translate(0,0) scale(1);}50%{transform:translate(-50px,-30px) scale(1.1);}}
        @keyframes cfhFloat3{0%,100%{transform:translate(0,0) scale(1);}50%{transform:translate(-30px,50px) scale(0.9);}}
        .cfh-root .rays{position:absolute;inset:-20%;z-index:0;opacity:0.12;background:conic-gradient(from 0deg, transparent 0deg, var(--gold-light) 8deg, transparent 16deg, transparent 40deg, var(--gold-light) 48deg, transparent 56deg, transparent 90deg, var(--gold-light) 98deg, transparent 106deg, transparent 140deg, var(--gold-light) 148deg, transparent 156deg, transparent 190deg, var(--gold-light) 198deg, transparent 206deg, transparent 240deg, var(--gold-light) 248deg, transparent 256deg, transparent 290deg, var(--gold-light) 298deg, transparent 306deg, transparent 340deg, var(--gold-light) 348deg, transparent 356deg);
          animation:cfhRotateRays 60s linear infinite;}
        @keyframes cfhRotateRays{to{transform:rotate(360deg);}}
        .cfh-root .particles{position:absolute;inset:0;z-index:1;pointer-events:none;}
        .cfh-root .particle{position:absolute;border-radius:50%;background:var(--gold-light);opacity:0.5;animation:cfhDrift linear infinite;}
        @keyframes cfhDrift{0%{transform:translateY(0) translateX(0);opacity:0;}10%{opacity:0.6;}90%{opacity:0.4;}100%{transform:translateY(-110vh) translateX(30px);opacity:0;}}
 
        .cfh-root .hero-content{position:relative;z-index:2;max-width:820px;}
        .cfh-root .hero .eyebrow{display:inline-block;margin-bottom:22px;opacity:0;animation:cfhFadeUp .9s ease forwards;animation-delay:.1s;}
        .cfh-root .hero h1{font-size:clamp(2.6rem,8vw,5.4rem);line-height:1.05;color:var(--cream);}
        .cfh-root .hero h1 .accent{background:linear-gradient(135deg,var(--gold-light),var(--rust-light));-webkit-background-clip:text;background-clip:text;color:transparent;}
        .cfh-root .hero p.tagline{margin:28px auto 40px;max-width:520px;font-size:1.08rem;line-height:1.7;color:rgba(251,243,228,0.8);opacity:0;animation:cfhFadeUp 1s ease forwards;animation-delay:1.1s;}
        .cfh-root .hero-ctas{display:flex;gap:18px;flex-wrap:wrap;justify-content:center;opacity:0;animation:cfhFadeUp 1s ease forwards;animation-delay:1.3s;}
        @keyframes cfhFadeUp{from{opacity:0;transform:translateY(24px);}to{opacity:1;transform:translateY(0);}}
        .cfh-root .scroll-cue{position:absolute;bottom:34px;left:50%;transform:translateX(-50%);z-index:2;display:flex;flex-direction:column;align-items:center;gap:8px;opacity:0;animation:cfhFadeUp 1s ease forwards,cfhBob 2.4s ease-in-out infinite;animation-delay:1.6s,2.4s;}
        .cfh-root .scroll-cue .line{width:1px;height:36px;background:linear-gradient(var(--gold-light),transparent);}
        @keyframes cfhBob{0%,100%{transform:translate(-50%,0);}50%{transform:translate(-50%,8px);}}
 
        .cfh-root section{padding:110px 0;position:relative;}
        .cfh-root .section-head{max-width:640px;margin-bottom:56px;}
        .cfh-root .section-head .eyebrow{display:block;margin-bottom:14px;}
        .cfh-root .section-head h2{font-size:clamp(2.1rem,4.5vw,3rem);line-height:1.1;color:var(--cream);}
        .cfh-root .reveal{opacity:0;transform:translateY(36px);transition:opacity .8s ease,transform .8s ease;}
        .cfh-root .reveal.in{opacity:1;transform:translateY(0);}
 
        .cfh-root .badges-band{background:var(--bg2);border-top:1px solid rgba(232,163,61,0.2);border-bottom:1px solid rgba(232,163,61,0.2);padding:44px 0;}
        .cfh-root .badges-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:28px;}
        @media(min-width:760px){.cfh-root .badges-grid{grid-template-columns:repeat(4,1fr);}}
        .cfh-root .badge{display:flex;flex-direction:column;align-items:center;text-align:center;gap:12px;}
        .cfh-root .badge svg{width:38px;height:38px;color:var(--gold-light);}
        .cfh-root .badge h4{font-size:0.95rem;font-weight:600;color:var(--cream);font-family:'Work Sans',sans-serif;}
        .cfh-root .badge p{font-size:0.78rem;color:rgba(251,243,228,0.55);}
 
        .cfh-root .prod-grid{display:grid;grid-template-columns:repeat(1,1fr);gap:30px;}
        @media(min-width:640px){.cfh-root .prod-grid{grid-template-columns:repeat(2,1fr);}}
        @media(min-width:980px){.cfh-root .prod-grid{grid-template-columns:repeat(3,1fr);}}
        .cfh-root .prod-card{background:rgba(255,255,255,0.03);border:1px solid rgba(251,243,228,0.08);border-radius:8px;overflow:hidden;transition:transform .45s ease,box-shadow .45s ease,border-color .45s ease;}
        .cfh-root .prod-card:hover{transform:translateY(-8px);box-shadow:var(--shadow);border-color:rgba(232,163,61,0.4);}
        .cfh-root .prod-img{aspect-ratio:4/3;position:relative;overflow:hidden;display:flex;align-items:center;justify-content:center;}
        .cfh-root .prod-img .swatch{position:absolute;inset:0;transition:transform .7s ease;}
        .cfh-root .prod-card:hover .prod-img .swatch{transform:scale(1.08);}
        .cfh-root .prod-icon{position:relative;z-index:1;width:56px;height:56px;color:rgba(251,243,228,0.9);}
        .cfh-root .prod-body{padding:22px 22px 26px;}
        .cfh-root .prod-tag{font-size:0.68rem;letter-spacing:0.14em;text-transform:uppercase;color:var(--gold-light);}
        .cfh-root .prod-body h3{font-size:1.35rem;margin:8px 0 6px;color:var(--cream);}
        .cfh-root .prod-desc{font-size:0.86rem;color:rgba(251,243,228,0.6);line-height:1.6;margin-bottom:14px;}
        .cfh-root .prod-foot{display:flex;align-items:center;justify-content:space-between;}
        .cfh-root .prod-price{font-family:'Fraunces',serif;font-size:1.25rem;color:var(--gold-light);font-weight:700;}
        .cfh-root .prod-link{font-size:0.75rem;text-transform:uppercase;letter-spacing:0.08em;border-bottom:1px solid var(--gold-light);padding-bottom:2px;}
        .cfh-root .prod-link:hover{color:var(--gold-light);}
 
        .cfh-root .about-grid{display:grid;grid-template-columns:1fr;gap:50px;align-items:center;}
        @media(min-width:900px){.cfh-root .about-grid{grid-template-columns:0.9fr 1.1fr;}}
        .cfh-root .about-visual{position:relative;aspect-ratio:4/5;border-radius:8px;overflow:hidden;background:linear-gradient(150deg,#8A5A2E 0%,#4A2A16 55%,#2B1810 100%);box-shadow:var(--shadow);display:flex;align-items:flex-end;padding:24px;}
        .cfh-root .about-visual .quote{font-family:'Fraunces',serif;font-style:italic;font-size:1.3rem;color:var(--cream);line-height:1.4;}
        .cfh-root .about-copy p{font-size:1rem;line-height:1.85;color:rgba(251,243,228,0.75);margin-bottom:20px;}
        .cfh-root .stat-row{display:flex;gap:44px;margin-top:36px;flex-wrap:wrap;}
        .cfh-root .stat h4{font-family:'Fraunces',serif;font-size:2.1rem;color:var(--gold-light);}
        .cfh-root .stat p{font-size:0.78rem;text-transform:uppercase;letter-spacing:0.1em;color:rgba(251,243,228,0.55);margin:0;}
 
        .cfh-root .herd-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:22px;}
        @media(min-width:760px){.cfh-root .herd-grid{grid-template-columns:repeat(4,1fr);}}
        .cfh-root .cow-card{background:rgba(255,255,255,0.03);border:1px solid rgba(251,243,228,0.08);border-radius:8px;padding:26px 20px;text-align:center;transition:transform .4s ease,border-color .4s ease;}
        .cfh-root .cow-card:hover{transform:translateY(-6px);border-color:rgba(232,163,61,0.4);}
        .cfh-root .cow-avatar{width:72px;height:72px;border-radius:50%;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;font-family:'Fraunces',serif;font-size:1.6rem;font-weight:700;color:var(--ink);}
        .cfh-root .cow-card h3{font-size:1.15rem;color:var(--cream);margin-bottom:4px;}
        .cfh-root .cow-breed{font-size:0.72rem;text-transform:uppercase;letter-spacing:0.1em;color:var(--gold-light);margin-bottom:10px;display:block;}
        .cfh-root .cow-card p{font-size:0.82rem;color:rgba(251,243,228,0.55);line-height:1.5;}
 
        .cfh-root .video-wrap{position:relative;aspect-ratio:16/9;border-radius:10px;overflow:hidden;background:linear-gradient(150deg,#3D2417,#1E0F09);display:flex;align-items:center;justify-content:center;box-shadow:var(--shadow);cursor:pointer;}
        .cfh-root .video-wrap .play-btn{width:88px;height:88px;border-radius:50%;background:rgba(251,243,228,0.12);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;transition:transform .35s ease,background .35s ease;border:1px solid rgba(251,243,228,0.3);}
        .cfh-root .video-wrap:hover .play-btn{transform:scale(1.1);background:rgba(232,163,61,0.25);}
        .cfh-root .video-wrap .play-btn svg{width:28px;height:28px;color:var(--cream);margin-left:4px;}
        .cfh-root .video-caption{position:absolute;left:24px;bottom:20px;font-size:0.85rem;color:rgba(251,243,228,0.7);}
 
        .cfh-root .order-grid{display:grid;grid-template-columns:1fr;gap:40px;}
        @media(min-width:900px){.cfh-root .order-grid{grid-template-columns:1fr 1fr;}}
        .cfh-root .order-card{background:rgba(255,255,255,0.03);border:1px solid rgba(251,243,228,0.08);border-radius:10px;padding:36px;}
        .cfh-root .order-card h3{font-size:1.4rem;color:var(--cream);margin-bottom:18px;}
        .cfh-root .field{margin-bottom:18px;}
        .cfh-root .field label{display:block;font-size:0.78rem;text-transform:uppercase;letter-spacing:0.08em;color:var(--gold-light);margin-bottom:8px;}
        .cfh-root .field input,.cfh-root .field textarea{width:100%;background:rgba(251,243,228,0.05);border:1px solid rgba(251,243,228,0.15);border-radius:4px;padding:12px 14px;color:var(--cream);font-family:'Work Sans',sans-serif;font-size:0.92rem;}
        .cfh-root .field input:focus,.cfh-root .field textarea:focus{outline:none;border-color:var(--gold-light);}
        .cfh-root .map-box{position:relative;border-radius:10px;overflow:hidden;background:linear-gradient(150deg,#3D2417,#1E0F09);min-height:260px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;border:1px solid rgba(251,243,228,0.08);}
        .cfh-root .map-pin{width:44px;height:44px;color:var(--rust-light);}
        .cfh-root .whatsapp-strip{display:flex;align-items:center;gap:16px;padding:20px;background:rgba(232,163,61,0.08);border:1px solid rgba(232,163,61,0.25);border-radius:8px;margin-top:24px;}
        .cfh-root .whatsapp-strip svg{width:34px;height:34px;color:var(--gold-light);flex-shrink:0;}
        .cfh-root .whatsapp-strip p{font-size:0.88rem;color:rgba(251,243,228,0.75);}
 
        .cfh-root footer{background:#1E0F09;padding:70px 6vw 30px;}
        .cfh-root .foot-grid{display:grid;grid-template-columns:1fr;gap:44px;margin-bottom:50px;}
        @media(min-width:800px){.cfh-root .foot-grid{grid-template-columns:1.4fr 1fr 1fr;}}
        .cfh-root .foot-brand h3{font-size:1.5rem;color:var(--cream);margin-bottom:12px;}
        .cfh-root .foot-brand p{font-size:0.9rem;color:rgba(251,243,228,0.5);line-height:1.7;max-width:320px;}
        .cfh-root .foot-col h4{font-size:0.75rem;letter-spacing:0.14em;text-transform:uppercase;color:var(--gold-light);margin-bottom:18px;}
        .cfh-root .foot-col a{display:block;font-size:0.9rem;color:rgba(251,243,228,0.68);margin-bottom:12px;transition:color .25s;}
        .cfh-root .foot-col a:hover{color:var(--gold-light);}
        .cfh-root .foot-bottom{border-top:1px solid rgba(251,243,228,0.08);padding-top:26px;display:flex;flex-direction:column;gap:10px;align-items:center;text-align:center;font-size:0.78rem;color:rgba(251,243,228,0.4);}
        @media(min-width:700px){.cfh-root .foot-bottom{flex-direction:row;justify-content:space-between;text-align:left;}}
 
        @media (prefers-reduced-motion: reduce){
          .cfh-root *{animation-duration:0.01ms !important;animation-iteration-count:1 !important;transition-duration:0.01ms !important;}
        }
      `}</style>
 
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700;9..144,800&family=Work+Sans:wght@300;400;500;600;700&display=swap"
      />
 
      <nav className={navScrolled ? "scrolled" : ""}>
        <div className="brandmark">
          CNN <span>FARM HUB</span>
        </div>
        <div className="nav-links">
          <a href="#products">Products</a>
          <a href="#about">Our Story</a>
          <a href="#herd">Meet the Herd</a>
          <a href="#order">Order</a>
        </div>
        <a href="#order" className="btn btn-outline nav-cta">
          Order Now
        </a>
        <button className="hamburger" aria-label="Open menu" onClick={() => setMenuOpen(true)}>
          <span></span>
          <span></span>
          <span></span>
        </button>
      </nav>
 
      <div className={`mobile-menu ${menuOpen ? "open" : ""}`}>
        <button className="mobile-close" aria-label="Close menu" onClick={closeMenu}>
          &times;
        </button>
        <a href="#products" onClick={closeMenu}>
          Products
        </a>
        <a href="#about" onClick={closeMenu}>
          Our Story
        </a>
        <a href="#herd" onClick={closeMenu}>
          Meet the Herd
        </a>
        <a href="#order" onClick={closeMenu}>
          Order
        </a>
      </div>
 
      <header className="hero">
        <div className="bg-anim"></div>
        <div className="rays"></div>
        <div className="blob blob1"></div>
        <div className="blob blob2"></div>
        <div className="blob blob3"></div>
        <Particles count={22} />
        <div className="hero-content">
          <span className="eyebrow">100% Organic · Farm to Doorstep</span>
          <h1>
            <div>
              <SplitLetters text={line1} baseDelay={0.3} stepDelay={0.035} />
            </div>
            <div className="accent">
              <SplitLetters text={line2} baseDelay={0.3 + line1Len * 0.035} stepDelay={0.035} />
            </div>
          </h1>
          <p className="tagline">
            Fresh cow milk, pure desi ghee, paneer and curd — delivered straight from CNN Farm Hub to your kitchen,
            every single morning.
          </p>
          <div className="hero-ctas">
            <a href="#products" className="btn btn-rust">
              See Our Products
            </a>
            <a href="#order" className="btn btn-outline">
              Order on WhatsApp
            </a>
          </div>
        </div>
        <div className="scroll-cue">
          <span className="eyebrow" style={{ letterSpacing: "0.2em" }}>
            Scroll
          </span>
          <span className="line"></span>
        </div>
      </header>
 
      <div className="badges-band">
        <div className="wrap badges-grid">
          {BADGES.map((b, i) => (
            <Reveal key={i} className="badge">
              <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.4">
                {b.icon}
              </svg>
              <h4>{b.title}</h4>
              <p>{b.desc}</p>
            </Reveal>
          ))}
        </div>
      </div>
 
      <section id="products">
        <div className="wrap">
          <Reveal className="section-head">
            <span className="eyebrow">From the Dairy</span>
            <h2>
              <SplitLetters text="Today's fresh picks" triggerOnView stepDelay={0.025} />
            </h2>
          </Reveal>
          <div className="prod-grid">
            {PRODUCTS.map((p, i) => (
              <Reveal key={i} className="prod-card">
                <div className="prod-img">
                  <div className="swatch" style={{ background: p.swatch }}></div>
                  <svg className="prod-icon" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.3">
                    {p.icon}
                  </svg>
                </div>
                <div className="prod-body">
                  <span className="prod-tag">{p.tag}</span>
                  <h3>{p.name}</h3>
                  <p className="prod-desc">{p.desc}</p>
                  <div className="prod-foot">
                    <span className="prod-price">{p.price}</span>
                    <a href="#order" className="prod-link">
                      Order
                    </a>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
 
      <section id="about" style={{ background: "rgba(255,255,255,0.02)" }}>
        <div className="wrap">
          <div className="about-grid">
            <Reveal className="about-visual">
              <p className="quote">"Real milk, real farm, real people — that's the whole story."</p>
            </Reveal>
            <Reveal className="about-copy">
              <span className="eyebrow">Our Story</span>
              <h2 style={{ margin: "14px 0 22px", fontSize: "clamp(1.9rem,3.5vw,2.6rem)", color: "var(--cream)" }}>
                A small farm with a big promise
              </h2>
              <p>
                CNN Farm Hub started with a handful of cows and a simple idea — deliver milk the way it used to
                taste, before shortcuts and preservatives crept in. Today we're still small enough to know every cow
                by name.
              </p>
              <p>
                Every product here — milk, ghee, paneer, curd — is made fresh, without chemicals, and delivered
                directly to your door within hours, not days.
              </p>
              <div className="stat-row">
                <div className="stat">
                  <h4>40+</h4>
                  <p>Cows &amp; Buffaloes</p>
                </div>
                <div className="stat">
                  <h4>Daily</h4>
                  <p>Fresh Delivery</p>
                </div>
                <div className="stat">
                  <h4>0</h4>
                  <p>Preservatives Used</p>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>
 
      <section id="herd">
        <div className="wrap">
          <Reveal className="section-head">
            <span className="eyebrow">The Faces Behind the Milk</span>
            <h2>Meet the herd</h2>
          </Reveal>
          <div className="herd-grid">
            {HERD.map((c, i) => (
              <Reveal key={i} className="cow-card">
                <div className="cow-avatar" style={{ background: c.bg }}>
                  {c.letter}
                </div>
                <h3>{c.name}</h3>
                <span className="cow-breed">{c.breed}</span>
                <p>{c.desc}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
 
      <section style={{ background: "rgba(255,255,255,0.02)" }}>
        <div className="wrap">
          <Reveal className="section-head">
            <span className="eyebrow">Take a Look Around</span>
            <h2>A video tour of the farm</h2>
          </Reveal>
          <Reveal className="video-wrap">
            <div className="play-btn">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
            <span className="video-caption">Farm walkthrough — coming soon on our YouTube channel</span>
          </Reveal>
        </div>
      </section>
 
      <section id="order">
        <div className="wrap">
          <Reveal className="section-head">
            <span className="eyebrow">Get In Touch</span>
            <h2>Order fresh, straight from the farm</h2>
          </Reveal>
          <div className="order-grid">
            <Reveal className="order-card">
              <h3>Send us a message</h3>
              <form onSubmit={handleSubmit}>
                <div className="field">
                  <label htmlFor="cfh-name">Name</label>
                  <input
                    id="cfh-name"
                    type="text"
                    placeholder="Your full name"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label htmlFor="cfh-phone">Phone</label>
                  <input
                    id="cfh-phone"
                    type="tel"
                    placeholder="Your phone number"
                    required
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label htmlFor="cfh-msg">What would you like to order?</label>
                  <textarea
                    id="cfh-msg"
                    rows={4}
                    placeholder="e.g. 2 litres milk, 1kg ghee, daily delivery"
                    value={form.msg}
                    onChange={(e) => setForm({ ...form, msg: e.target.value })}
                  />
                </div>
                <button type="submit" className="btn btn-rust" style={{ width: "100%", justifyContent: "center" }}>
                  {sent ? "Request Sent ✓" : "Send Request"}
                </button>
              </form>
              <div className="whatsapp-strip">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2zm0 18a8 8 0 0 1-4.1-1.1l-.3-.2-3.1.8.8-3-.2-.3A8 8 0 1 1 12 20zm4.4-5.9c-.2-.1-1.4-.7-1.6-.8-.2-.1-.4-.1-.5.1-.2.2-.6.8-.8 1-.1.2-.3.2-.5.1-.2-.1-1-.4-1.9-1.2-.7-.6-1.2-1.4-1.3-1.6-.1-.2 0-.4.1-.5.1-.1.2-.3.4-.4.1-.1.2-.2.2-.4.1-.1 0-.3 0-.4 0-.1-.5-1.3-.7-1.7-.2-.4-.4-.4-.5-.4h-.5c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 1.9 0 1.1.8 2.2.9 2.4.1.2 1.6 2.5 4 3.5.6.2 1 .4 1.3.5.6.2 1.1.1 1.5.1.5-.1 1.4-.6 1.6-1.1.2-.5.2-1 .1-1.1-.1-.1-.2-.2-.4-.2z" />
                </svg>
                <p>Prefer WhatsApp? Message us directly and we'll confirm your order within minutes.</p>
              </div>
            </Reveal>
            <Reveal className="map-box">
              <svg className="map-pin" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C7.6 2 4 5.6 4 10c0 6 8 12 8 12s8-6 8-12c0-4.4-3.6-8-8-8zm0 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6z" />
              </svg>
              <div style={{ textAlign: "center" }}>
                <h4 style={{ fontFamily: "'Fraunces',serif", fontSize: "1.2rem", color: "var(--cream)", marginBottom: "6px" }}>
                  CNN Farm Hub
                </h4>
                <p style={{ fontSize: "0.85rem", color: "rgba(251,243,228,0.6)" }}>Bengaluru Rural, Karnataka, India</p>
              </div>
              <a href="#" className="btn btn-outline" style={{ marginTop: "6px", padding: "11px 22px" }}>
                Get Directions
              </a>
            </Reveal>
          </div>
        </div>
      </section>
 
      <footer>
        <div className="wrap">
          <div className="foot-grid">
            <div className="foot-brand">
              <h3>CNN Farm Hub</h3>
              <p>Fresh milk, ghee, paneer and curd, delivered straight from our farm to your doorstep — every single day.</p>
            </div>
            <div className="foot-col">
              <h4>Products</h4>
              <a href="#products">Fresh Milk</a>
              <a href="#products">Desi Ghee</a>
              <a href="#products">Paneer &amp; Curd</a>
            </div>
            <div className="foot-col">
              <h4>Get in Touch</h4>
              <a href="#order">WhatsApp Us</a>
              <a href="#order">Bengaluru Rural, India</a>
              <a href="#order">hello@cnnfarmhub.com</a>
            </div>
          </div>
          <div className="foot-bottom">
            <span>© 2026 CNN Farm Hub. All rights reserved.</span>
            <span>Design preview — built to show the look &amp; feel of your future site.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}