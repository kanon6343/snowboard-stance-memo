const ThumbMenuGesture = (() => {
  const order=side=>side==='right'?['find','display','data']:['data','display','find'];
  const committed=(dx,width,speed=0)=>Math.abs(dx)>=Math.min(48,width*.18)||(Math.abs(dx)>=22&&Math.abs(speed)>=.35);
  const outward=(dx,side)=>side==='right'?dx>0:dx<0;
  function intent(dx,dy){
    if(Math.max(Math.abs(dx),Math.abs(dy))<10)return 'pending';
    return Math.abs(dx)>=10&&Math.abs(dx)>=Math.abs(dy)*1.5?'horizontal':'vertical';
  }
  function resolve(page,dx,width,speed=0,side='left'){
    const keys=order(side),index=keys.indexOf(page);
    if(index<0||!committed(dx,width,speed))return {kind:'stay',page};
    if(page==='find'&&outward(dx,side))return {kind:'close',page};
    const next=Math.max(0,Math.min(2,index+(dx<0?1:-1)));
    return {kind:next===index?'stay':'choose',page:keys[next]};
  }
  return {order,committed,outward,intent,resolve};
})();

const ThumbMenu = (() => {
  const byId=id=>document.getElementById(id),panel=byId('menuPanel'),body=panel?.querySelector('.menu-body');
  if(!panel||!body)return {};
  const tabs=panel.querySelector('.menu-page-tabs'),mount=byId('thumbTabsMount'),overlay=byId('menuOverlay');
  if(tabs&&mount)mount.appendChild(tabs);
  const suffix={find:'Find',display:'Display',data:'Data'},names={find:'探す',display:'表示',data:'データ'};
  const side=()=>document.body.dataset.menuSide==='right'?'right':'left';
  const activePage=()=>['data','display','find'].find(key=>byId('menuTab'+suffix[key])?.getAttribute('aria-selected')==='true');
  let gesture=null,suppressUntil=0,animation=null;
  const touchEvents='ontouchstart' in window;
  const editing=target=>target.closest('input,select,textarea,[contenteditable],[role="slider"],canvas');
  const isOpen=()=>panel.classList.contains('open');
  const blocked=()=>!isOpen()||document.documentElement.dataset.tutorialActive==='true'||!!document.querySelector?.('dialog[open]');
  function syncStatus(){
    const page=activePage();
    byId('thumbSwipeStatus').textContent=page==='find'?`探す · ${side()==='right'?'右':'左'}へスワイプで閉じる`:`${names[page]||''} · 左右にスワイプで切り替え`;
  }
  function updateLayout(){
    for(const key of ThumbMenuGesture.order(side()))tabs.appendChild(byId('menuTab'+suffix[key]));
    byId('menuGestureHelp').textContent=`画面の端寄りの余白か☰からメニューを引き出せます。本文の左右スワイプで切り替えます。「探す」では画面全体から${side()==='right'?'右':'左'}へ払うと閉じます。入力欄は入力を優先します。見出しや背景からも閉じられます。縦はスクロール。通常は探すから開きます。`;
    syncStatus();
  }
  function cleanup(){
    const previous=gesture;gesture=null;
    if(previous?.locked)suppressUntil=performance.now()+400;
    body.classList.remove('thumb-page-dragging');body.style.removeProperty('--thumb-drag-x');
    panel.classList.remove('is-dragging');document.body.classList.remove('menu-dragging');
    panel.style.removeProperty('transform');overlay?.style.removeProperty('opacity');
    if(previous?.kind==='pointer'&&body.hasPointerCapture?.(previous.id))try{body.releasePointerCapture(previous.id);}catch{}
    return previous;
  }
  function switchPage(page,direction){
    MenuPresentation.choose(page);syncStatus();animation?.cancel();
    const el=byId('menuPage'+suffix[page]);
    if(!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches&&el?.animate)animation=el.animate([{opacity:.65,transform:`translateX(${direction*24}px)`},{opacity:1,transform:'translateX(0)'}],{duration:170,easing:'ease-out'});
  }
  MenuControls.prepareOpen=(options={})=>{
    cleanup();
    if(!options.preservePage)MenuPresentation.choose('find',false,false);
    syncStatus();
  };
  function begin(event,point,kind){
    cleanup();suppressUntil=0;
    if(blocked()||editing(event.target)||window.getSelection?.()?.toString())return;
    if(typeof getComputedStyle==='function')for(let node=event.target;node&&node!==document.body;node=node.parentElement){
      if(node.scrollWidth>node.clientWidth+2&&/auto|scroll/.test(getComputedStyle(node).overflowX))return;
    }
    const page=activePage();if(!page)return;
    gesture={kind,id:kind==='touch'?point.identifier:event.pointerId,x:point.clientX,y:point.clientY,lastX:point.clientX,time:event.timeStamp,speed:0,page,side:side(),closeOnly:!body.contains(event.target),locked:false};animation?.cancel();
  }
  function move(event,point){
    const start=gesture;if(!start)return;
    if(blocked()||activePage()!==start.page||(start.kind==='touch'&&!event.cancelable)){cleanup();syncStatus();return;}
    const dx=point.clientX-start.x,dy=point.clientY-start.y;
    if(!start.locked){
      const intent=ThumbMenuGesture.intent(dx,dy);if(intent==='pending')return;
      if(intent==='vertical'){cleanup();return;}
      if(start.closeOnly&&!ThumbMenuGesture.outward(dx,start.side)){cleanup();return;}
      start.locked=true;body.classList.add('thumb-page-dragging');
      if(start.kind==='pointer')try{body.setPointerCapture(start.id);}catch{}
    }
    if(event.cancelable)event.preventDefault();
    start.speed=(point.clientX-start.lastX)/Math.max(1,event.timeStamp-start.time);start.lastX=point.clientX;start.time=event.timeStamp;
    if((start.page==='find'||start.closeOnly)&&ThumbMenuGesture.outward(dx,start.side)){
      const width=panel.getBoundingClientRect().width,shift=Math.max(-width,Math.min(width,dx));
      panel.classList.add('is-dragging');document.body.classList.add('menu-dragging');
      panel.style.transform=`translateX(${shift}px)`;if(overlay)overlay.style.opacity=String(1-Math.abs(shift)/width);
      byId('thumbSwipeStatus').textContent=ThumbMenuGesture.committed(dx,width)?'離すとメニューを閉じます':'探す · さらに引くと閉じる';
    }else{
      panel.classList.remove('is-dragging');document.body.classList.remove('menu-dragging');panel.style.removeProperty('transform');overlay?.style.removeProperty('opacity');
      body.style.setProperty('--thumb-drag-x',Math.max(-56,Math.min(56,dx*.32))+'px');syncStatus();
    }
  }
  function finish(event,point){
    const start=cleanup();if(!start?.locked)return;
    if(event.cancelable)event.preventDefault();
    if(blocked()||activePage()!==start.page){syncStatus();return;}
    const dx=point.clientX-start.x,dy=point.clientY-start.y,speed=event.timeStamp-start.time<100?start.speed:0;
    if(Math.abs(dx)<Math.abs(dy)*1.5){syncStatus();return;}
    const width=body.getBoundingClientRect().width;
    const action=start.closeOnly
      ?{kind:ThumbMenuGesture.outward(dx,start.side)&&ThumbMenuGesture.committed(dx,width,speed)?'close':'stay'}
      :ThumbMenuGesture.resolve(start.page,dx,width,speed,start.side);
    if(action.kind==='close'){MenuControls.close();return;}
    if(action.kind==='choose')switchPage(action.page,dx<0?1:-1);else syncStatus();
  }
  document.addEventListener('pointerdown',event=>{
    if(touchEvents&&event.pointerType==='touch')return;
    if(!event.isPrimary){cleanup();return;}
    if(event.button===0)begin(event,event,'pointer');
  });
  document.addEventListener('pointermove',event=>{if(gesture?.kind==='pointer'&&gesture.id===event.pointerId)move(event,event);},{passive:false});
  document.addEventListener('pointerup',event=>{if(gesture?.kind==='pointer'&&gesture.id===event.pointerId)finish(event,event);},{passive:false});
  document.addEventListener('pointercancel',event=>{if(gesture?.kind==='pointer'&&gesture.id===event.pointerId){cleanup();syncStatus();}});
  body.addEventListener('lostpointercapture',event=>{if(event.target===body&&gesture?.kind==='pointer'&&gesture.id===event.pointerId){cleanup();syncStatus();}});
  if(touchEvents){
    document.addEventListener('touchstart',event=>{
      if(event.touches.length!==1){cleanup();syncStatus();return;}
      begin(event,event.touches[0],'touch');
    },{passive:true});
    document.addEventListener('touchmove',event=>{
      if(gesture?.kind!=='touch')return;
      if(event.touches.length!==1){cleanup();syncStatus();return;}
      const point=Array.from(event.touches).find(point=>point.identifier===gesture.id);if(point)move(event,point);
    },{passive:false});
    document.addEventListener('touchend',event=>{
      if(gesture?.kind!=='touch')return;
      if(event.touches.length){cleanup();syncStatus();return;}
      const point=Array.from(event.changedTouches).find(point=>point.identifier===gesture.id);if(point)finish(event,point);
    },{passive:false});
    document.addEventListener('touchcancel',()=>{cleanup();syncStatus();},{passive:true});
  }
  document.addEventListener('click',event=>{if(event.detail===0||performance.now()>=suppressUntil)return;event.preventDefault();event.stopImmediatePropagation();},true);
  for(const event of ['blur','resize'])window.addEventListener(event,()=>{cleanup();syncStatus();});
  for(const event of ['click','keydown'])tabs?.addEventListener(event,syncStatus);
  byId('menuSide')?.addEventListener('change',()=>{cleanup();updateLayout();});
  panel.addEventListener('transitionend',()=>{if(!isOpen())cleanup();});
  updateLayout();
  return {cleanup,switchPage};
})();
