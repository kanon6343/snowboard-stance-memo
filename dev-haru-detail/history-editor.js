/* Explicit editing of one saved record. Loading a setting still creates a copy. */
const HistoryEditor = (() => {
  const fields={board:'板名',snow:'雪質',comment:'コメント',stance:'スタンス',stanceWidth:'スタンス幅',leftAngle:'左足の角度',rightAngle:'右足の角度',disk:'簡易ディスク位置',holes:'ビス穴',reference:'推奨位置',detail:'詳細設定'};
  const object=value=>value&&typeof value==='object'&&!Array.isArray(value);
  const clone=value=>JSON.parse(JSON.stringify(value));
  const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  const idOf=item=>['string','number'].includes(typeof item?.id)?String(item.id):'';
  function merge(base,patch){
    if(!object(patch))return patch;
    const result={...(object(base)?base:{})};
    for(const [key,value] of Object.entries(patch)){
      if(['__proto__','constructor','prototype'].includes(key))continue;
      result[key]=object(value)?merge(result[key],value):value;
    }
    return result;
  }
  function difference(base,next){
    if(equal(base,next))return undefined;
    if(!object(next))return next;
    return Object.fromEntries(Object.entries(next).map(([key,value])=>[key,difference(base?.[key],value)]).filter(([,value])=>value!==undefined));
  }
  function comparable(key,value){
    if(key==='detail')return DetailData.normalize(value);
    if(key==='disk')return {left:value?.left||'',right:value?.right||''};
    if(key==='reference')return Object.fromEntries(['left','right'].map(side=>{const v=value?.[side];return [side,v!=null&&String(v).trim()!==''&&Number.isInteger(Number(v))&&Number(v)>=0&&Number(v)<6?Number(v):null];}));
    if(key==='holes')return Object.fromEntries(['left','right'].map((side,index)=>[side,Array.isArray(value)?value.slice(index*12,index*12+12).flatMap((on,i)=>on?[i]:[]):[...new Set((Array.isArray(value?.[side])?value[side]:[]).map(Number).filter(i=>Number.isInteger(i)&&i>=0&&i<12))].sort((a,b)=>a-b)]));
    if(key==='stanceWidth')return ['string','number'].includes(typeof value)&&String(value).trim()!==''&&Number.isFinite(Number(value))&&Number(value)>0?String(Number(value)):'';
    return ['string','number'].includes(typeof value)?String(value).trim():'';
  }
  function plan(items,original,draft){
    if(!Array.isArray(items)||!object(original)||!object(draft)||!idOf(original))return {error:'invalid'};
    const matches=items.map((item,index)=>({item,index})).filter(({item})=>idOf(item)===idOf(original));
    if(matches.length!==1)return {error:matches.length?'ambiguous':'missing'};
    const {item,index}=matches[0];
    if(!equal(item,original))return {error:'stale'};
    const updated={...item};
    for(const key of Object.keys(fields)){
      if(!Object.hasOwn(draft,key))continue;
      const next=key==='detail'?merge(item.detail,draft.detail):draft[key];
      if(equal(comparable(key,item[key]),comparable(key,next)))continue;
      if(key==='detail'){
        updated.detail=merge(item.detail,difference(DetailData.normalize(item.detail),DetailData.normalize(next)));
        if(!Object.hasOwn(updated.detail,'version'))updated.detail.version=1;
      }else updated[key]=merge(item[key],next);
    }
    if(updated.holes!==item.holes&&Object.hasOwn(draft,'dataVersion'))updated.dataVersion=draft.dataVersion;
    const labels=Object.entries(fields).filter(([key])=>!equal(item[key],updated[key])).map(([,label])=>label);
    return {items:items.map((value,i)=>i===index?updated:value),changed:!equal(item,updated),labels};
  }
  const byId=id=>document.getElementById(id),dialog=byId('historyEditConfirm'),favoriteDialog=byId('favoriteEditConfirm');
  let state=null,pending=null,opening=null;
  const label=item=>`${typeof item.board==='string'&&item.board.trim()||'板名なし'} · ${DetailHistoryData.date(item)}`;
  function snapshot(){const raw=localStorage.getItem(KEY),items=JSON.parse(raw===null?'[]':raw);if(!Array.isArray(items))throw new Error('Invalid history');return {raw,items};}
  function sync(){byId('historyEditBanner').hidden=!state;byId('historyEditTarget').textContent=state?label(state.original):'';byId('saveBtn').textContent=state?'変更を保存':'この設定を保存';byId('clearBtn').hidden=!!state;byId('cancelHistoryEditBottom').hidden=!state;}
  function closeConfirm(){pending=null;if(dialog.open)dialog.close();}
  function closeFavorite(){opening=null;if(favoriteDialog.open)favoriteDialog.close();}
  function reset(){state=null;closeConfirm();closeFavorite();sync();}
  function beforeNew(){
    if(state&&!confirm('編集中の未保存の変更をやめますか？保存済みの履歴は変更しません。'))return false;
    if(!state&&typeof DraftGuard!=='undefined'&&!DraftGuard.beforeReplace())return false;
    if(typeof DraftGuard!=='undefined')DraftGuard.reset();
    reset();return true;
  }
  function begin(id,load){
    if(favoriteDialog.open)return false;
    let item;
    try{const matches=snapshot().items.filter(record=>idOf(record)===String(id));if(!id||matches.length!==1){showToast('この履歴を特定できません。履歴を読み直してください。','error');return false;}item=matches[0];}
    catch{showToast('履歴を読み込めませんでした。編集を開始していません。','error');return false;}
    if(item.favorite){
      opening={original:clone(item),load};
      byId('favoriteEditTarget').textContent=label(item);favoriteDialog.showModal();return false;
    }
    return start(item,load);
  }
  function start(item,load){
    if(!beforeNew())return false;
    // Form controls may mutate reference/disk objects. Keep a separate immutable baseline.
    const original=clone(item);load(clone(item));state={original};sync();
    if(typeof DraftGuard!=='undefined')DraftGuard.changed();
    byId('historyEditBanner').focus({preventScroll:true});
    showToast('履歴の編集を開始しました。保存時に変更を確認できます。','info');return true;
  }
  function enterFavorite(){
    if(!opening)return;
    const request=opening;
    let item;
    try{const matches=snapshot().items.filter(record=>idOf(record)===idOf(request.original));if(matches.length!==1||!equal(matches[0],request.original)){closeFavorite();showToast('確認中に履歴が変わりました。もう一度「編集」を選んでください。','info');return;}item=matches[0];}
    catch{closeFavorite();showToast('履歴を読み込めませんでした。編集を開始していません。','error');return;}
    closeFavorite();start(item,request.load);
  }
  function finish(){
    const id=state?idOf(state.original):'';
    if(typeof DraftGuard!=='undefined')DraftGuard.reset();
    reset();byId('clearBtn').click();render();showView('history');
    const loadButton=Array.from(byId('history').querySelectorAll('button[data-load-id]')).find(button=>button.dataset.loadId===id);
    const card=loadButton?.closest('[data-dh-record], .history-card');
    if(card){card.tabIndex=-1;card.focus({preventScroll:true});card.scrollIntoView({block:'start',inline:'nearest',behavior:'auto'});return true;}
    byId('historyTab').focus();return false;
  }
  const returnMessage=(message,found)=>message+(found?'':' 元の履歴が現在の一覧に見つからないため、一覧へ戻りました。');
  function failure(error){showToast(error==='stale'?'別の画面でこの履歴が変更されました。入力内容を控えて、履歴から読み直してください。':'この履歴を更新できません。削除や重複がないか履歴を確認してください。','error');}
  function save(draft){
    if(!state)return;
    let current,next;
    try{current=snapshot();next=plan(current.items,state.original,draft);}
    catch{showToast('保存履歴を読み込めませんでした。入力内容は残しています。','error');return;}
    if(next.error){failure(next.error);return;}
    if(!next.changed){const found=finish();showToast(returnMessage('変更はありませんでした。',found),'info');return;}
    pending={raw:current.raw,items:next.items};
    byId('historyEditConfirmTarget').textContent=label(state.original);
    byId('historyEditChanges').textContent=next.labels.join('・')||'入力した設定';
    dialog.showModal();
  }
  function apply(){
    if(!state||!pending)return;
    const next=pending;
    try{
      if(localStorage.getItem(KEY)!==next.raw){closeConfirm();showToast('確認中に履歴が変わりました。もう一度保存内容を確認してください。','info');return;}
      localStorage.setItem(KEY,JSON.stringify(next.items));
    }catch{closeConfirm();showToast('保存できませんでした。編集中の入力内容は残しています。','error');return;}
    const found=finish();showToast(returnMessage('履歴の変更を保存しました。',found),'success');
  }
  function cancelEdit(){if(state){const found=finish();showToast(returnMessage('編集をやめました。保存履歴は変更していません。',found),'info');}}
  byId('confirmHistorySave').addEventListener('click',apply);
  byId('cancelHistorySave').addEventListener('click',closeConfirm);
  byId('cancelHistoryEdit').addEventListener('click',cancelEdit);
  byId('cancelHistoryEditBottom').addEventListener('click',cancelEdit);
  byId('confirmFavoriteEdit').addEventListener('click',enterFavorite);
  byId('cancelFavoriteEdit').addEventListener('click',closeFavorite);
  favoriteDialog.addEventListener('close',()=>{opening=null;});
  dialog.addEventListener('close',()=>{pending=null;});
  sync();
  function restoreContext(original){
    reset();
    try{const matches=snapshot().items.filter(item=>idOf(item)===idOf(original));if(matches.length!==1||!equal(matches[0],original))return false;state={original:clone(original)};sync();return true;}catch{return false;}
  }
  return {plan,begin,save,beforeNew,isEditing:()=>!!state,draftContext:()=>state?clone(state.original):null,restoreContext};
})();
