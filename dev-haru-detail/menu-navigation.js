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
  const editing=target=>target.closest('input,select,textarea,[contenteditable],[role="slider"],canvas');
  const isOpen=()=>panel.classList.contains('open');
  function syncStatus(){
    const page=activePage();
    byId('thumbSwipeStatus').textContent=page==='find'?`探す · ${side()==='right'?'右':'左'}へスワイプで閉じる`:`${names[page]||''} · 左右にスワイプで切り替え`;
  }
  function updateLayout(){
    for(const key of ThumbMenuGesture.order(side()))tabs.appendChild(byId('menuTab'+suffix[key]));
    byId('menuGestureHelp').textContent=`本文の左右スワイプで切り替えます。「探す」で${side()==='right'?'右':'左'}へ払うと閉じます。縦はスクロール。通常は探すから開きます。`;
    syncStatus();
  }
  function cleanup(){
    const previous=gesture;gesture=null;
    if(previous?.locked)suppressUntil=performance.now()+400;
    body.classList.remove('thumb-page-dragging');body.style.removeProperty('--thumb-drag-x');
    panel.classList.remove('is-dragging');document.body.classList.remove('menu-dragging');
    panel.style.removeProperty('transform');overlay?.style.removeProperty('opacity');
    if(previous&&body.hasPointerCapture?.(previous.id))try{body.releasePointerCapture(previous.id);}catch{}
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
  body.addEventListener('pointerdown',event=>{
    cleanup();suppressUntil=0;
    if(!event.isPrimary||event.button!==0||!isOpen()||document.documentElement.dataset.tutorialActive==='true'||editing(event.target))return;
    const page=activePage();if(!page)return;
    gesture={id:event.pointerId,x:event.clientX,y:event.clientY,lastX:event.clientX,time:event.timeStamp,speed:0,page,side:side(),locked:false};animation?.cancel();
  });
  body.addEventListener('pointermove',event=>{
    const start=gesture;if(!start||start.id!==event.pointerId)return;
    if(!isOpen()){cleanup();return;}
    const dx=event.clientX-start.x,dy=event.clientY-start.y;
    if(!start.locked){
      const intent=ThumbMenuGesture.intent(dx,dy);if(intent==='pending')return;
      if(intent==='vertical'){cleanup();return;}
      start.locked=true;body.classList.add('thumb-page-dragging');
      try{body.setPointerCapture(event.pointerId);}catch{}
    }
    if(event.cancelable)event.preventDefault();
    start.speed=(event.clientX-start.lastX)/Math.max(1,event.timeStamp-start.time);start.lastX=event.clientX;start.time=event.timeStamp;
    if(start.page==='find'&&ThumbMenuGesture.outward(dx,start.side)){
      const width=panel.getBoundingClientRect().width,shift=Math.max(-width,Math.min(width,dx));
      panel.classList.add('is-dragging');document.body.classList.add('menu-dragging');
      panel.style.transform=`translateX(${shift}px)`;if(overlay)overlay.style.opacity=String(1-Math.abs(shift)/width);
      byId('thumbSwipeStatus').textContent=ThumbMenuGesture.committed(dx,width)?'離すとメニューを閉じます':'探す · さらに引くと閉じる';
    }else{
      panel.classList.remove('is-dragging');document.body.classList.remove('menu-dragging');panel.style.removeProperty('transform');overlay?.style.removeProperty('opacity');
      body.style.setProperty('--thumb-drag-x',Math.max(-56,Math.min(56,dx*.32))+'px');syncStatus();
    }
  },{passive:false});
  body.addEventListener('pointerup',event=>{
    if(!gesture||gesture.id!==event.pointerId)return;
    const start=cleanup();if(!start?.locked)return;
    if(event.cancelable)event.preventDefault();
    const dx=event.clientX-start.x,speed=event.timeStamp-start.time<100?start.speed:0;
    const action=ThumbMenuGesture.resolve(start.page,dx,body.getBoundingClientRect().width,speed,start.side);
    if(action.kind==='close'){MenuControls.close();return;}
    if(action.kind==='choose')switchPage(action.page,dx<0?1:-1);else syncStatus();
  },{passive:false});
  body.addEventListener('pointercancel',()=>{cleanup();syncStatus();});
  body.addEventListener('lostpointercapture',event=>{if(event.target===body&&gesture?.id===event.pointerId){cleanup();syncStatus();}});
  document.addEventListener('pointerdown',event=>{if(!event.isPrimary)cleanup();if(!body.contains(event.target))suppressUntil=0;},true);
  document.addEventListener('click',event=>{if(event.detail===0||performance.now()>=suppressUntil)return;event.preventDefault();event.stopImmediatePropagation();},true);
  for(const event of ['blur','resize'])window.addEventListener(event,()=>{cleanup();syncStatus();});
  for(const event of ['click','keydown'])tabs?.addEventListener(event,syncStatus);
  byId('menuSide')?.addEventListener('change',()=>{cleanup();updateLayout();});
  panel.addEventListener('transitionend',()=>{if(!isOpen())cleanup();});
  updateLayout();
  return {cleanup,switchPage};
})();
