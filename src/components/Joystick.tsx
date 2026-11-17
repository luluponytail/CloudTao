import { useRef, useState } from 'react';

const emit = (x: number, y: number) => window.dispatchEvent(new CustomEvent('cloud-tao-joystick', { detail: { x, y } }));

export function Joystick() {
  const pad = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const move = (clientX: number, clientY: number) => {
    if (!pad.current) return;
    const r = pad.current.getBoundingClientRect();
    let x = clientX - (r.left+r.width/2), y = clientY-(r.top+r.height/2);
    const len = Math.hypot(x,y), max = 38;
    if (len > max) { x=x/len*max; y=y/len*max; }
    setKnob({x,y}); emit(x/max,y/max);
  };
  const stop = () => { setKnob({x:0,y:0}); emit(0,0); };
  return <div ref={pad} className="joystick" aria-label="Movement joystick"
    onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); move(e.clientX,e.clientY); }}
    onPointerMove={e => { if(e.currentTarget.hasPointerCapture(e.pointerId)) move(e.clientX,e.clientY); }}
    onPointerUp={stop} onPointerCancel={stop}>
    <span style={{ transform:`translate(${knob.x}px,${knob.y}px)` }} />
  </div>;
}
