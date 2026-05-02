import { useEffect, useRef, useState } from 'react';
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
    <style>{`
      @keyframes fx-stat-pop{0%{opacity:0;transform:scale(.7)}60%{transform:scale(1.08)}100%{opacity:1;transform:scale(1)}}
      .fx-stat-popped{animation:fx-stat-pop .55s cubic-bezier(.34,1.56,.64,1) forwards}
      .fx-stat-hidden{opacity:0;transform:scale(.7)}
    `}</style>
    <div ref={ref} className={`flex flex-col items-center text-center ${popped?'fx-stat-popped':'fx-stat-hidden'}`}>
      <span className={valueClass}>{prefix}{count}{suffix}</span>
      {label&&<span className={labelClass}>{label}</span>}
    </div>
  </>);
}