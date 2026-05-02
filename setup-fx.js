const fs = require("fs");
const path = require("path");
const base = path.join(__dirname, "src", "fx-components");
if (!fs.existsSync(base)) fs.mkdirSync(base, { recursive: true });
 
const files = {
 
"CustomCursor.jsx": `import { useEffect, useRef } from 'react';
export default function CustomCursor({ color='#4ade80', dotSize=8, ringSize=40, lag=0.12 }) {
  const dotRef=useRef(null), ringRef=useRef(null);
  const mouse=useRef({x:-100,y:-100}), pos=useRef({x:-100,y:-100});
  const rafRef=useRef(null), scaled=useRef(false);
  useEffect(()=>{
    const SEL='a,button,input,textarea,select,label,[data-cursor-scale]';
    const onMove=e=>{
      mouse.current={x:e.clientX,y:e.clientY};
      if(dotRef.current) dotRef.current.style.transform=\`translate(\${e.clientX-dotSize/2}px,\${e.clientY-dotSize/2}px)\`;
    };
    const onOver=e=>{
      if(e.target.closest(SEL)&&!scaled.current){
        scaled.current=true;
        if(dotRef.current) dotRef.current.dataset.scaled='true';
        if(ringRef.current) ringRef.current.dataset.scaled='true';
      }
    };
    const onOut=e=>{
      if(scaled.current&&!e.relatedTarget?.closest(SEL)){
        scaled.current=false;
        if(dotRef.current) delete dotRef.current.dataset.scaled;
        if(ringRef.current) delete ringRef.current.dataset.scaled;
      }
    };
    const loop=()=>{
      pos.current.x+=(mouse.current.x-pos.current.x)*lag;
      pos.current.y+=(mouse.current.y-pos.current.y)*lag;
      if(ringRef.current) ringRef.current.style.transform=\`translate(\${pos.current.x-ringSize/2}px,\${pos.current.y-ringSize/2}px)\`;
      rafRef.current=requestAnimationFrame(loop);
    };
    window.addEventListener('mousemove',onMove);
    document.addEventListener('mouseover',onOver);
    document.addEventListener('mouseout',onOut);
    rafRef.current=requestAnimationFrame(loop);
    return()=>{
      window.removeEventListener('mousemove',onMove);
      document.removeEventListener('mouseover',onOver);
      document.removeEventListener('mouseout',onOut);
      cancelAnimationFrame(rafRef.current);
    };
  },[dotSize,ringSize,lag]);
  const sd=dotSize*1.8, sr=ringSize*1.6;
  return(<>
    <style>{\`
      *,*::before,*::after{cursor:none!important}
      .fx-cursor-dot{position:fixed;top:0;left:0;width:\${dotSize}px;height:\${dotSize}px;background:#fff;border-radius:50%;pointer-events:none;z-index:99999;will-change:transform;mix-blend-mode:difference;transition:width .2s,height .2s,background .2s}
      .fx-cursor-dot[data-scaled]{width:\${sd}px;height:\${sd}px;background:\${color}}
      .fx-cursor-ring{position:fixed;top:0;left:0;width:\${ringSize}px;height:\${ringSize}px;border:1.5px solid rgba(255,255,255,0.45);border-radius:50%;pointer-events:none;z-index:99998;will-change:transform;transition:width .35s,height .35s,border-color .35s}
      .fx-cursor-ring[data-scaled]{width:\${sr}px;height:\${sr}px;border-color:\${color}99}
    \`}</style>
    <div ref={dotRef} className="fx-cursor-dot"/>
    <div ref={ringRef} className="fx-cursor-ring"/>
  </>);
}`,
 
"GrainOverlay.jsx": `export default function GrainOverlay({ opacity=0.04, blend='overlay' }) {
  return(<>
    <style>{\`
      @keyframes fx-grain{0%,100%{transform:translate(0,0)}10%{transform:translate(-2%,-3%)}20%{transform:translate(3%,2%)}30%{transform:translate(-1%,4%)}40%{transform:translate(4%,-1%)}50%{transform:translate(-3%,3%)}60%{transform:translate(2%,-4%)}70%{transform:translate(-4%,1%)}80%{transform:translate(1%,3%)}90%{transform:translate(3%,-2%)}}
      .fx-grain-inner{animation:fx-grain .5s steps(1) infinite}
    \`}</style>
    <div aria-hidden="true" style={{position:'fixed',inset:0,width:'100%',height:'100%',pointerEvents:'none',zIndex:9990,overflow:'hidden'}}>
      <div className="fx-grain-inner" style={{width:'110%',height:'110%',marginTop:'-5%',marginLeft:'-5%'}}>
        <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" style={{display:'block',opacity,mixBlendMode:blend}}>
          <filter id="fx-grain-filter">
            <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="4" stitchTiles="stitch"/>
            <feColorMatrix type="saturate" values="0"/>
          </filter>
          <rect width="100%" height="100%" filter="url(#fx-grain-filter)"/>
        </svg>
      </div>
    </div>
  </>);
}`,
 
"WordReveal.jsx": `import { useEffect, useRef, useState } from 'react';
export default function WordReveal({ text='', tag:Tag='h1', className='', startDelay=0, stagger=0.07, threshold=0.3, once=true }) {
  const [triggered,setTriggered]=useState(false);
  const ref=useRef(null);
  useEffect(()=>{
    const el=ref.current; if(!el) return;
    const obs=new IntersectionObserver(([e])=>{
      if(e.isIntersecting){setTriggered(true); if(once) obs.disconnect();}
      else if(!once) setTriggered(false);
    },{threshold});
    obs.observe(el);
    return()=>obs.disconnect();
  },[threshold,once]);
  return(<>
    <style>{\`
      @keyframes fx-word-in{0%{opacity:0;transform:translateY(22px) rotateX(-25deg) scale(.95)}100%{opacity:1;transform:none}}
      .fx-word{display:inline-block;opacity:0;transform-origin:bottom center;will-change:transform,opacity}
      .fx-word.fx-triggered{animation:fx-word-in .55s cubic-bezier(.22,1,.36,1) forwards}
    \`}</style>
    <Tag ref={ref} className={className} style={{perspective:'600px',perspectiveOrigin:'50% 100%'}}>
      {text.split(' ').map((word,i)=>(
        <span key={i} className={\`fx-word\${triggered?' fx-triggered':''}\`} style={{animationDelay:\`\${startDelay+i*stagger}s\`,marginRight:'0.28em'}}>{word}</span>
      ))}
    </Tag>
  </>);
}`,
 
"MarqueeBand.jsx": `export default function MarqueeBand({ items=[], speed=30, bgColor='bg-white', textColor='text-black', separator='  ✦  ', direction='left', pauseOnHover=true, className='' }) {
  const track=[...items,...items];
  const dir=direction==='right'?'reverse':'normal';
  return(<>
    <style>{\`
      @keyframes fx-marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}
      .fx-marquee-track{display:flex;width:max-content;animation:fx-marquee \${speed}s linear infinite;animation-direction:\${dir};will-change:transform}
      .fx-marquee-wrapper:hover .fx-marquee-track{animation-play-state:\${pauseOnHover?'paused':'running'}}
    \`}</style>
    <div className={\`fx-marquee-wrapper overflow-hidden py-3 \${bgColor} \${className}\`} aria-hidden="true">
      <div className="fx-marquee-track">
        {track.map((item,i)=>(
          <span key={i} className={\`whitespace-nowrap text-sm font-semibold tracking-wider uppercase select-none \${textColor}\`}>
            {item}<span className="opacity-50">{separator}</span>
          </span>
        ))}
      </div>
    </div>
  </>);
}`,
 
"ScrollReveal.jsx": `import { useEffect, useRef, useState } from 'react';
export default function ScrollReveal({ children, animation='fade-up', delay=0, duration=0.6, distance=32, threshold=0.15, once=true, tag:Tag='div', className='' }) {
  const [visible,setVisible]=useState(false);
  const ref=useRef(null);
  useEffect(()=>{
    const el=ref.current; if(!el) return;
    const obs=new IntersectionObserver(([e])=>{
      if(e.isIntersecting){setVisible(true); if(once) obs.disconnect();}
      else if(!once) setVisible(false);
    },{threshold});
    obs.observe(el);
    return()=>obs.disconnect();
  },[threshold,once]);
  const presets={'fade-up':\`translateY(\${distance}px)\`,'fade-down':\`translateY(-\${distance}px)\`,'fade-left':\`translateX(\${distance}px)\`,'fade-right':\`translateX(-\${distance}px)\`,'scale':'scale(0.88)','fade':'none'};
  const init=presets[animation]??presets['fade-up'];
  const base=\`opacity \${duration}s ease \${delay}s,transform \${duration}s cubic-bezier(.22,1,.36,1) \${delay}s\`;
  return(
    <Tag ref={ref} className={className} style={visible?{opacity:1,transform:'none',transition:base}:{opacity:0,transform:init!=='none'?init:undefined,transition:base}}>
      {children}
    </Tag>
  );
}`,
 
"StatCounter.jsx": `import { useEffect, useRef, useState } from 'react';
export default function StatCounter({ value=0, prefix='', suffix='', label='', duration=1800, threshold=0.4, valueClass='text-5xl font-extrabold text-white', labelClass='text-sm text-white/50 uppercase tracking-widest mt-1' }) {
  const [count,setCount]=useState(0);
  const [popped,setPopped]=useState(false);
  const [started,setStarted]=useState(false);
  const ref=useRef(null), rafRef=useRef(null);
  useEffect(()=>{
    const obs=new IntersectionObserver(([e])=>{
      if(e.isIntersecting&&!started){setStarted(true);setPopped(true);obs.disconnect();}
    },{threshold});
    ref.current&&obs.observe(ref.current);
    return()=>obs.disconnect();
  },[threshold,started]);
  useEffect(()=>{
    if(!started) return;
    const t0=performance.now();
    const ease=t=>1-Math.pow(1-t,3);
    const step=now=>{const p=Math.min((now-t0)/duration,1);setCount(Math.round(value*ease(p)));if(p<1) rafRef.current=requestAnimationFrame(step);};
    rafRef.current=requestAnimationFrame(step);
    return()=>cancelAnimationFrame(rafRef.current);
  },[started,value,duration]);
  return(<>
    <style>{\`
      @keyframes fx-stat-pop{0%{opacity:0;transform:scale(.7)}60%{transform:scale(1.08)}100%{opacity:1;transform:scale(1)}}
      .fx-stat-popped{animation:fx-stat-pop .55s cubic-bezier(.34,1.56,.64,1) forwards}
      .fx-stat-hidden{opacity:0;transform:scale(.7)}
    \`}</style>
    <div ref={ref} className={\`flex flex-col items-center text-center \${popped?'fx-stat-popped':'fx-stat-hidden'}\`}>
      <span className={valueClass}>{prefix}{count}{suffix}</span>
      {label&&<span className={labelClass}>{label}</span>}
    </div>
  </>);
}`,
 
"FloatingParticles.jsx": `import { useEffect, useRef } from 'react';
export default function FloatingParticles({ count=50, color='#ffffff', opacity=0.35, minSize=1, maxSize=3, speed=1, fixed=false, className='' }) {
  const canvasRef=useRef(null);
  useEffect(()=>{
    const canvas=canvasRef.current; if(!canvas) return;
    const ctx=canvas.getContext('2d');
    const hexToRgb=h=>({r:parseInt(h.slice(1,3),16),g:parseInt(h.slice(3,5),16),b:parseInt(h.slice(5,7),16)});
    const rgb=color.startsWith('#')?hexToRgb(color):{r:255,g:255,b:255};
    const resize=()=>{canvas.width=canvas.offsetWidth;canvas.height=canvas.offsetHeight;};
    resize();
    const ro=new ResizeObserver(resize); ro.observe(canvas);
    const rand=(a,b)=>Math.random()*(b-a)+a;
    const ps=Array.from({length:count},()=>({x:rand(0,canvas.width),y:rand(0,canvas.height),r:rand(minSize,maxSize),vx:rand(-.25,.25),vy:rand(.3,.9)*speed,alpha:rand(.05,opacity),wobble:rand(0,Math.PI*2),ws:rand(.005,.015)}));
    let id;
    const draw=()=>{
      ctx.clearRect(0,0,canvas.width,canvas.height);
      ps.forEach(p=>{
        p.wobble+=p.ws; p.x+=p.vx+Math.sin(p.wobble)*.3; p.y-=p.vy;
        if(p.y+p.r<0){p.y=canvas.height+p.r;p.x=rand(0,canvas.width);}
        if(p.x<-p.r) p.x=canvas.width+p.r;
        if(p.x>canvas.width+p.r) p.x=-p.r;
        ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
        ctx.fillStyle=\`rgba(\${rgb.r},\${rgb.g},\${rgb.b},\${p.alpha})\`;ctx.fill();
      });
      id=requestAnimationFrame(draw);
    };
    draw();
    return()=>{cancelAnimationFrame(id);ro.disconnect();};
  },[count,color,opacity,minSize,maxSize,speed]);
  return <canvas ref={canvasRef} className={\`\${fixed?'fixed':'absolute'} inset-0 w-full h-full pointer-events-none \${className}\`} style={{zIndex:0}}/>;
}`,
 
"index.js": `export { default as CustomCursor } from './CustomCursor';
export { default as GrainOverlay } from './GrainOverlay';
export { default as WordReveal } from './WordReveal';
export { default as MarqueeBand } from './MarqueeBand';
export { default as ScrollReveal } from './ScrollReveal';
export { default as StatCounter } from './StatCounter';
export { default as FloatingParticles } from './FloatingParticles';
`
};
 
Object.entries(files).forEach(([name, content]) => {
  const filePath = path.join(base, name);
  fs.writeFileSync(filePath, content, "utf8");
  console.log("✅ Created: src/fx-components/" + name);
});
 
console.log("\n🎉 All files created! You can delete setup-fx.js now.");