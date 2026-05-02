export default function GrainOverlay({ opacity=0.04, blend='overlay' }) {
  return(<>
    <style>{`
      @keyframes fx-grain{0%,100%{transform:translate(0,0)}10%{transform:translate(-2%,-3%)}20%{transform:translate(3%,2%)}30%{transform:translate(-1%,4%)}40%{transform:translate(4%,-1%)}50%{transform:translate(-3%,3%)}60%{transform:translate(2%,-4%)}70%{transform:translate(-4%,1%)}80%{transform:translate(1%,3%)}90%{transform:translate(3%,-2%)}}
      .fx-grain-inner{animation:fx-grain .5s steps(1) infinite}
    `}</style>
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
}