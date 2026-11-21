'use client';
import { useEffect } from 'react';

export function ImprimirAlAbrir() {
  useEffect(()=>{
    let vigente=true;
    document.fonts.ready.then(()=>{if(vigente) window.print();});
    return ()=>{vigente=false;};
  },[]);
  return null;
}
