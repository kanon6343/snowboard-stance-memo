/* Presentation only: categories keep controls mounted; empty select labels are not values. */
const MenuPresentation = (() => {
  const byId=id=>document.getElementById(id),panel=byId('menuPanel'),body=panel?.querySelector('.menu-body');
  const entries=[['data','menuTabData','menuPageData'],['display','menuTabDisplay','menuPageDisplay'],['find','menuTabFind','menuPageFind']];
  const ordered=()=>document.body.dataset.menuSide==='right'?[...entries].reverse():entries;
  let page='find';
  const isUnset=select=>select.value===''&&['未設定','選択'].includes(select.options?.[select.selectedIndex]?.textContent.trim());
  const applyHints=()=>byId('setupCard')?.querySelectorAll('select').forEach(select=>select.classList.toggle('is-unset-select',isUnset(select)));
  let hintPending=false;
  function syncHints(){
    applyHints();
    // Loading/clearing a record updates some basic fields after detail.write().
    if(!hintPending){hintPending=true;const later=typeof queueMicrotask==='function'?queueMicrotask:fn=>Promise.resolve().then(fn);later(()=>{hintPending=false;applyHints();});}
  }
  function choose(next,focus=false,persist=true){
    if(!entries.some(([value])=>value===next))return;
    page=next;
    for(const [value,tabId,pageId]of entries){const tab=byId(tabId),content=byId(pageId),on=value===page;if(!tab||!content)continue;tab.setAttribute('aria-selected',String(on));tab.tabIndex=on?0:-1;content.hidden=!on;}
    if(body)body.scrollTop=0;
    if(focus)byId(entries.find(([value])=>value===page)[1])?.focus({preventScroll:true});
  }
  for(const [value,tabId]of entries){const tab=byId(tabId);tab?.addEventListener('click',()=>choose(value));tab?.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const order=ordered(),i=order.findIndex(([v])=>v===page);choose(order[event.key==='Home'?0:event.key==='End'?2:(i+(event.key==='ArrowRight'?1:-1)+3)%3][0],true);});}
  for(const event of ['input','change'])byId('setupCard')?.addEventListener(event,syncHints);
  const ready=byId('appUpdateReady'),badge=byId('menuUpdateBadge');
  function syncUpdateBadge(){if(badge&&ready)badge.hidden=ready.hidden;}
  if(ready&&typeof MutationObserver==='function')new MutationObserver(syncUpdateBadge).observe(ready,{attributes:true,attributeFilter:['hidden']});
  choose(page,false,false);syncHints();syncUpdateBadge();
  return {syncHints,isUnset,choose,syncUpdateBadge};
})();
