import { useEffect, useRef, useState } from "react";
import { composeAvatar, loadAvatarSources } from "./farm-avatar";
import type { Appearance } from "./farm-world";

export default function FarmCharacterPreview({ appearance }: { appearance: Appearance }) {
  const canvas = useRef<HTMLCanvasElement>(null), sheet = useRef<HTMLCanvasElement | null>(null);
  const [walking,setWalking] = useState(true), [error,setError] = useState(false);
  useEffect(() => {
    let cancelled=false;
    void loadAvatarSources().then(({base,hair}) => { if (!cancelled) { sheet.current=composeAvatar(appearance,base,hair); setError(false); } }).catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled=true; };
  },[appearance]);
  useEffect(() => {
    let request=0;
    const paint = (time: number) => {
      const ctx=canvas.current?.getContext("2d");
      if (ctx && sheet.current) {
        ctx.imageSmoothingEnabled=false; ctx.clearRect(0,0,320,144);
        // Passing poses interpolate via the neutral pose in this rough first rig.
        const frame=walking ? [1,2,3,4][Math.floor(time/150)%4]! : 0;
        for (let row=0;row<4;row++) ctx.drawImage(sheet.current,frame*64,row*128,64,128,row*80+8,4,64,128);
      }
      request=requestAnimationFrame(paint);
    };
    request=requestAnimationFrame(paint); return () => cancelAnimationFrame(request);
  },[walking]);
  return <div className="farm-character-preview">
    {error ? <p role="status">Character artwork could not load. Reload to try again.</p> : <canvas ref={canvas} width={320} height={144} role="img" aria-label="Your character preview, facing front, left, right and back" data-testid="farm-character-preview" />}
    <div className="farm-preview-facings"><span>Front</span><span>Left</span><span>Right</span><span>Back</span></div>
    <button type="button" aria-pressed={walking} onClick={() => setWalking(v=>!v)}>{walking ? "Show idle" : "Show walking"}</button>
  </div>;
}
