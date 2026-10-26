/* Read-only summary of the active history filters. Clearing uses existing controls. */
const HistoryTools = (() => {
  const byId=id=>document.getElementById(id),dock=byId('historyDock'),sentinel=byId('historyDockSentinel');
  const labels={duck:'ダック',forward:'前振り',back:'後振り',none:'スタンス未設定'};
  let queued=false;
  function position(){
    queued=false;const style=getComputedStyle(dock),top=sentinel.getBoundingClientRect().top,offset=parseFloat(style.top)||0,visible=sentinel.getClientRects().length>0;
    dock.classList.toggle('is-stuck',visible&&top<offset);dock.classList.toggle('is-near-top',visible&&top<offset+54);
    if(visible){const surround=parseFloat(style.getPropertyValue('--history-dock-surround'))||10,gap=parseFloat(style.getPropertyValue('--history-card-gap'))||16;document.documentElement.style.setProperty('--history-dock-height',`${Math.max(0,offset)+dock.getBoundingClientRect().height+surround+gap}px`);}
  }
  function schedule(){if(!queued){queued=true;requestAnimationFrame(position);}}
  function sync(value){
    const filters=[];
    if(value.board!=='__ALL__')filters.push({kind:'board',label:value.board||'板名未入力'});
    if(value.stance)filters.push({kind:'stance',label:labels[value.stance]||value.stance});
    if(value.angle.left!==null||value.angle.right!==null)filters.push({kind:'angle',label:[value.angle.left!==null?`左 ${value.angle.left}°`:'',value.angle.right!==null?`右 ${value.angle.right}°`:'',`±${value.angle.tol}°`].filter(Boolean).join(' ')});
    if(document.documentElement.dataset.inputMode==='detail')for(const key of ['shape','nose','bend']){const select=byId(`filter-${key}`);if(select?.value)filters.push({kind:'shape',key,label:select.options[select.selectedIndex].textContent});}
    if(typeof RecordSearch!=='undefined')for(const filter of RecordSearch.active())filters.push({kind:'search',...filter});
    byId('historyResultCount').textContent=`${value.shown} / ${value.total}件`;
    byId('historyFilterState').textContent=(filters.length?'絞り込み中':'すべての履歴')+(value.savedOutsideFilter?'・保存した1件を一時表示':'');
    byId('clearHistoryFilters').hidden=filters.length===0;
    const chips=byId('historyFilterChips');chips.replaceChildren();
    for(const filter of filters){const button=document.createElement('button');button.type='button';button.className='history-filter-chip';button.textContent=filter.label+' ×';button.setAttribute('aria-label',filter.label+'の絞り込みを解除');button.addEventListener('click',()=>clear(filter));chips.appendChild(button);}
    chips.hidden=filters.length===0;schedule();
  }
  function clear(filter){
    if(filter.kind==='search'){RecordSearch.clear(filter.key);byId('historyFiltersButton').focus({preventScroll:true});return;}
    if(filter.kind==='board'){selectedBoard='__ALL__';saveUI();}
    if(filter.kind==='stance'){stanceFilter='';saveUI();}
    if(filter.kind==='angle'){byId('angleClear').click();byId('historyFiltersButton').focus({preventScroll:true});return;}
    if(filter.kind==='shape'){const select=byId(`filter-${filter.key}`);select.value='';select.dispatchEvent(new Event('change',{bubbles:true}));byId('historyFiltersButton').focus({preventScroll:true});return;}
    render();byId('historyFiltersButton').focus({preventScroll:true});
  }
  byId('clearHistoryFilters').addEventListener('click',()=>{
    if(typeof RecordSearch!=='undefined')RecordSearch.clearAll(false);
    selectedBoard='__ALL__';stanceFilter='';angleFilter={left:null,right:null,tol:angleFilter.tol};
    byId('angleLeft').value='';byId('angleRight').value='';
    for(const key of ['shape','nose','bend']){const select=byId(`filter-${key}`);select.value='';select.dispatchEvent(new Event('change',{bubbles:true}));}
    saveUI();render();byId('historyFiltersButton').focus({preventScroll:true});
  });
  byId('historyFiltersButton').addEventListener('click',()=>{byId('menuBtn').click();MenuPresentation.choose('find');});
  byId('historyStorageRetry').addEventListener('click',()=>render());
  byId('exportUnreadableHistory').addEventListener('click',()=>{
    try{const raw=localStorage.getItem(KEY);if(raw===null){showToast('退避する履歴がありません。','info');return;}const url=URL.createObjectURL(new Blob([raw],{type:'text/plain;charset=utf-8'})),link=document.createElement('a');link.href=url;link.download='stance-history-recovery.txt';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch{showToast('元データを取り出せませんでした。','error');}
  });
  window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',schedule);
  new MutationObserver(schedule).observe(byId('historyView'),{attributes:true,attributeFilter:['hidden']});
  return {sync,position};
})();
render();
