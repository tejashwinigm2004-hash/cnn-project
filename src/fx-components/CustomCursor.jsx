import { useEffect, useRef } from 'react';
export default function CustomCursor({ color='#4ade80', dotSize=8, ringSize=40, lag=0.12 }) {
  const dotRef=useRef(null), ringRef=useRef(null);
  const mouse=useRef({x:-100,y:-100}), pos=useRef({x:-100,y:-100});
  const rafRef=useRef(null), scaled=useRef(false);
  useEffect(()=>{
    const SEL='a,button,input,textarea,select,label,[data-cursor-scale]';
    const onMove=e=>{
      mouse.current={x:e.clientX,y:e.clientY};
      if(dotRef.current) dotRef.current.style.transform=`translate(${e.clientX-dotSize/2}px,${e.clientY-dotSize/2}px)`;
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
      if(ringRef.current) ringRef.current.style.transform=`translate(${pos.current.x-ringSize/2}px,${pos.current.y-ringSize/2}px)`;
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
    <style>{`
      *,*::before,*::after{cursor:none!important}
      .fx-cursor-dot{position:fixed;top:0;left:0;width:${dotSize}px;height:${dotSize}px;background:#fff;border-radius:50%;pointer-events:none;z-index:99999;will-change:transform;mix-blend-mode:difference;transition:width .2s,height .2s,background .2s}
      .fx-cursor-dot[data-scaled]{width:${sd}px;height:${sd}px;background:${color}}
      .fx-cursor-ring{position:fixed;top:0;left:0;width:${ringSize}px;height:${ringSize}px;border:1.5px solid rgba(255,255,255,0.45);border-radius:50%;pointer-events:none;z-index:99998;will-change:transform;transition:width .35s,height .35s,border-color .35s}
      .fx-cursor-ring[data-scaled]{width:${sr}px;height:${sr}px;border-color:${color}99}
    `}</style>
    <div ref={dotRef} className="fx-cursor-dot"/>
    <div ref={ringRef} className="fx-cursor-ring"/>
  </>);
}