import { useEffect, useRef, useState } from 'react';
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
    <style>{`
      @keyframes fx-word-in{0%{opacity:0;transform:translateY(22px) rotateX(-25deg) scale(.95)}100%{opacity:1;transform:none}}
      .fx-word{display:inline-block;opacity:0;transform-origin:bottom center;will-change:transform,opacity}
      .fx-word.fx-triggered{animation:fx-word-in .55s cubic-bezier(.22,1,.36,1) forwards}
    `}</style>
    <Tag ref={ref} className={className} style={{perspective:'600px',perspectiveOrigin:'50% 100%'}}>
      {text.split(' ').map((word,i)=>(
        <span key={i} className={`fx-word${triggered?' fx-triggered':''}`} style={{animationDelay:`${startDelay+i*stagger}s`,marginRight:'0.28em'}}>{word}</span>
      ))}
    </Tag>
  </>);
}