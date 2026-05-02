export default function MarqueeBand({ items=[], speed=30, bgColor='bg-white', textColor='text-black', separator='  ✦  ', direction='left', pauseOnHover=true, className='' }) {
  const track=[...items,...items];
  const dir=direction==='right'?'reverse':'normal';
  return(<>
    <style>{`
      @keyframes fx-marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}
      .fx-marquee-track{display:flex;width:max-content;animation:fx-marquee ${speed}s linear infinite;animation-direction:${dir};will-change:transform}
      .fx-marquee-wrapper:hover .fx-marquee-track{animation-play-state:${pauseOnHover?'paused':'running'}}
    `}</style>
    <div className={`fx-marquee-wrapper overflow-hidden py-3 ${bgColor} ${className}`} aria-hidden="true">
      <div className="fx-marquee-track">
        {track.map((item,i)=>(
          <span key={i} className={`whitespace-nowrap text-sm font-semibold tracking-wider uppercase select-none ${textColor}`}>
            {item}<span className="opacity-50">{separator}</span>
          </span>
        ))}
      </div>
    </div>
  </>);
}