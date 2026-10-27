/* Main views share one horizontal gesture; history layouts remain tap controls. */
const ViewNavigation = (() => {
  const byId=id=>document.getElementById(id),panes={input:byId('inputView'),history:byId('historyView')},tabs=document.querySelector('.view-tabs');
  const current=()=>panes.history.hidden?'input':'history',touchEvents='ontouchstart' in window;
  const positions={input:0,history:0};let gesture=null,suppressUntil=0,animation=null;
  const blocked=()=>byId('menuPanel').classList.contains('open')||document.body.classList.contains('menu-dragging')||document.documentElement.dataset.tutorialActive==='true'||!!document.querySelector('dialog[open]')||!byId('draftRecovery').hidden;
  function nativeControl(target){
    if(target.closest('.view-tabs'))return false;
    if(target.closest('input,select,textarea,button,a,summary,[contenteditable],[role="slider"],[role="button"],[role="checkbox"],[role="switch"],[role="tab"],canvas,.hole,.ref-slot,.foot-tabs,#detailHistoryControls'))return true;
    for(let node=target;node&&node!==document.body;node=node.parentElement){
      if(node.scrollWidth>node.clientWidth+2&&/auto|scroll/.test(getComputedStyle(node).overflowX))return true;
    }
    return false;
  }
  function cleanup(){
    const previous=gesture;gesture=null;
    if(previous){previous.surface.classList.remove('is-view-swiping');previous.surface.style.removeProperty('--view-swipe-x');
      if(previous.kind==='pointer'&&previous.surface.hasPointerCapture?.(previous.id))try{previous.surface.releasePointerCapture(previous.id);}catch{}
      if(previous.locked)suppressUntil=performance.now()+450;
    }
    return previous;
  }
  function begin(event,point,kind){
    cleanup();suppressUntil=0;
    if(blocked()||point.clientX<=32||point.clientX>=window.innerWidth-32||nativeControl(event.target)||window.getSelection?.()?.toString())return;
    // Mouse text selection stays native; blank surfaces can still be dragged.
    if(kind==='pointer'&&event.pointerType==='mouse'&&event.target.closest('p,span,strong,h1,h2,h3,h4,label'))return;
    const view=current();animation?.cancel();
    const side=document.body.dataset.menuSide==='right'?'right':'left',edge=typeof MenuControls==='undefined'?0:MenuControls.openingEdgeWidth?.()||0;
    const menuDirection=(side==='left'?point.clientX<=edge:point.clientX>=window.innerWidth-edge)?(side==='left'?1:-1):0;
    gesture={kind,menuDirection,id:kind==='touch'?point.identifier:event.pointerId,view,surface:panes[view],x:point.clientX,y:point.clientY,lastX:point.clientX,time:event.timeStamp,speed:0,scroll:window.scrollY,locked:false};
  }
  function move(event,point){
    const start=gesture;if(!start)return;
    if(start.kind==='touch'&&!event.cancelable){cleanup();return;}
    if(blocked()||current()!==start.view){cleanup();return;}
    const dx=point.clientX-start.x,dy=point.clientY-start.y;
    if(!start.locked){
      if(Math.max(Math.abs(dx),Math.abs(dy))<12)return;
      if(Math.abs(dx)<Math.abs(dy)*1.6){cleanup();return;}
      if(start.menuDirection&&dx*start.menuDirection>0){cleanup();return;}
      start.locked=true;start.surface.classList.add('is-view-swiping');
      if(start.kind==='pointer')try{start.surface.setPointerCapture(start.id);}catch{}
    }
    if(event.cancelable)event.preventDefault();
    start.speed=(point.clientX-start.lastX)/Math.max(1,event.timeStamp-start.time);start.lastX=point.clientX;start.time=event.timeStamp;
    const allowed=start.view==='input'?dx<0:dx>0;
    start.surface.style.setProperty('--view-swipe-x',Math.max(-32,Math.min(32,dx*(allowed ? .22 : .06)))+'px');
  }
  function finish(event,point){
    const start=cleanup();if(!start?.locked)return;
    if(event.cancelable)event.preventDefault();
    if(blocked()||current()!==start.view)return;
    const dx=point.clientX-start.x,dy=point.clientY-start.y,speed=event.timeStamp-start.time<100?start.speed:0;
    if(Math.abs(dx)<Math.abs(dy)*1.6||(start.view==='input'?dx>=0:dx<=0))return;
    const distance=Math.abs(dx),fast=distance>=24&&Math.abs(speed)>=.4&&Math.sign(speed)===Math.sign(dx);
    if(distance<Math.min(40,window.innerWidth*.12)&&!fast)return;
    const next=start.view==='input'?'history':'input';positions[start.view]=start.scroll;
    showView(next);window.scrollTo({top:positions[next],left:0,behavior:'auto'});
    byId(next==='input'?'inputTab':'historyTab').focus({preventScroll:true});
    if(!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches&&panes[next].animate)animation=panes[next].animate([{opacity:.65,transform:`translateX(${dx<0?24:-24}px)`},{opacity:1,transform:'translateX(0)'}],{duration:160,easing:'ease-out'});
  }
  for(const surface of [...Object.values(panes),tabs].filter(Boolean)){
    surface.addEventListener('pointerdown',event=>{if(event.isPrimary&&event.button===0&&!(touchEvents&&event.pointerType==='touch'))begin(event,event,'pointer');});
    if(touchEvents)surface.addEventListener('touchstart',event=>{if(event.touches.length===1)begin(event,event.touches[0],'touch');},{passive:true});
  }
  document.addEventListener('pointerdown',event=>{if(!event.isPrimary)cleanup();else suppressUntil=0;},true);
  document.addEventListener('pointermove',event=>{if(gesture?.kind==='pointer'&&event.pointerId===gesture.id)move(event,event);},{passive:false});
  document.addEventListener('pointerup',event=>{if(gesture?.kind==='pointer'&&event.pointerId===gesture.id)finish(event,event);},{passive:false});
  document.addEventListener('pointercancel',event=>{if(gesture?.kind==='pointer'&&event.pointerId===gesture.id)cleanup();});
  document.addEventListener('lostpointercapture',event=>{if(gesture?.kind==='pointer'&&event.target===gesture.surface&&event.pointerId===gesture.id)cleanup();});
  if(touchEvents){
    document.addEventListener('touchstart',event=>{if(event.touches.length!==1)cleanup();else suppressUntil=0;},{passive:true,capture:true});
    document.addEventListener('touchmove',event=>{if(gesture?.kind!=='touch')return;if(event.touches.length!==1){cleanup();return;}const point=[...event.touches].find(touch=>touch.identifier===gesture.id);if(point)move(event,point);},{passive:false});
    document.addEventListener('touchend',event=>{if(gesture?.kind!=='touch')return;if(event.touches.length){cleanup();return;}const point=[...event.changedTouches].find(touch=>touch.identifier===gesture.id);if(point)finish(event,point);},{passive:false});
    document.addEventListener('touchcancel',()=>cleanup(),{passive:true});
  }
  document.addEventListener('click',event=>{if(event.detail===0||performance.now()>=suppressUntil)return;event.preventDefault();event.stopImmediatePropagation();},true);
  tabs?.addEventListener('click',event=>{if(event.target.closest('[data-view]'))positions[current()]=window.scrollY;},true);
  for(const name of ['blur','resize'])window.addEventListener(name,cleanup);
  document.addEventListener('contextmenu',cleanup);
  return {cancel:cleanup};
})();
