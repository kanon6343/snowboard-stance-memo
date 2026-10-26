/* Presentation only: an opaque surround appears only while the foot tabs stick. */
const FootDock = (() => {
  const dock=document.getElementById('footDock'),sentinel=document.getElementById('footDockSentinel'),input=document.getElementById('inputView');
  if(!dock||!sentinel)return;
  let queued=false;
  function sync(){
    queued=false;
    const offset=parseFloat(getComputedStyle(dock).top)||0;
    const visible=sentinel.getClientRects().length>0,top=sentinel.getBoundingClientRect().top;
    dock.classList.toggle('is-stuck',visible&&top<offset);
    // Reserve icon space before the tabs reach the fixed menu button.
    dock.classList.toggle('is-near-top',visible&&top<offset+54);
  }
  function schedule(){if(!queued){queued=true;requestAnimationFrame(sync);}}
  window.addEventListener('scroll',schedule,{passive:true});
  window.addEventListener('resize',schedule);
  if(input&&typeof MutationObserver==='function')new MutationObserver(schedule).observe(input,{attributes:true,subtree:true,attributeFilter:['hidden']});
  sync();
  return {sync};
})();
