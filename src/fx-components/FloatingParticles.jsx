import { useEffect, useRef } from 'react';
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
        ctx.fillStyle=`rgba(${rgb.r},${rgb.g},${rgb.b},${p.alpha})`;ctx.fill();
      });
      id=requestAnimationFrame(draw);
    };
    draw();
    return()=>{cancelAnimationFrame(id);ro.disconnect();};
  },[count,color,opacity,minSize,maxSize,speed]);
  return <canvas ref={canvasRef} className={`${fixed?'fixed':'absolute'} inset-0 w-full h-full pointer-events-none ${className}`} style={{zIndex:0}}/>;
}