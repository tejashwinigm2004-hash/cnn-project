import { useEffect, useRef, useState } from 'react';
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
  const presets={'fade-up':`translateY(${distance}px)`,'fade-down':`translateY(-${distance}px)`,'fade-left':`translateX(${distance}px)`,'fade-right':`translateX(-${distance}px)`,'scale':'scale(0.88)','fade':'none'};
  const init=presets[animation]??presets['fade-up'];
  const base=`opacity ${duration}s ease ${delay}s,transform ${duration}s cubic-bezier(.22,1,.36,1) ${delay}s`;
  return(
    <Tag ref={ref} className={className} style={visible?{opacity:1,transform:'none',transition:base}:{opacity:0,transform:init!=='none'?init:undefined,transition:base}}>
      {children}
    </Tag>
  );
}