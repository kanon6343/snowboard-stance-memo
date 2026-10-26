/* Detail-mode history presentation. Reads records; never mutates or persists them. */
const DetailHistoryData = (() => {
  const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const text=value=>typeof value==='string'?value.trim():'';
  const number=value=>(typeof value==='number'||typeof value==='string')&&String(value).trim()!==''&&Number.isFinite(Number(value))?String(value):'';
  const angle=value=>number(value)===''?'未入力':number(value)+'°';
  const width=value=>number(value)!==''&&Number(value)>0?String(value):'';
  const board=item=>text(item.board)||'板名なし';
  const time=item=>typeof item.dateTime==='string'&&item.dateTime.trim()&&Number.isFinite(Date.parse(item.dateTime))?Date.parse(item.dateTime):null;
  const date=item=>time(item)===null?'日時未入力':new Intl.DateTimeFormat('ja-JP',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(time(item)));
  const stance=value=>({duck:'ダック',forward:'前振り',back:'後振り'})[value]||'スタンス未入力';
  const detail=item=>DetailData.normalize(item.detail);
  const signed=axis=>axis.mm===''?'未入力':Number(axis.mm)===0?'0 mm':`${axis.direction==='tail'?'−':axis.direction==='nose'?'＋':''}${axis.mm} mm${axis.direction?'':'（方向未設定）'}`;
  const lateral=axis=>axis.mm===''?'未入力':Number(axis.mm)===0?'0 mm':`${({toe:'つま先',heel:'かかと'})[axis.direction]||'方向未設定'} ${axis.mm} mm`;
  const setback=item=>{const s=detail(item).setback;return s.mm===''?'セットバック未入力':`${({reference:'推奨位置',center:'中心'})[s.basis]||'基準未設定'}から ${signed(s)}`;};
  function rows(item){
    const d=detail(item),row=(label,fn)=>[label,fn('left'),fn('right')];
    return [row('角度',s=>angle(item[s+'Angle'])),row('リーン',s=>d[s==='left'?'forwardLeanLeft':'forwardLeanRight']||'未入力'),row('ディスク形式',s=>DetailData.choices.diskType[d.diskShift[s].type]||'未入力'),row('前後ずらし',s=>signed(d.diskShift[s].longitudinal)),row('横ずらし',s=>lateral(d.diskShift[s].lateral)),row('ヒールカップ\n内側 / 外側',s=>{const h=d.heelcup[s];return `${h.inner||'未入力'} / ${h.outer||'未入力'}${h.recorded&&!h.inner&&!h.outer?'（旧記録・目盛りなし）':''}`;}),row('数える基準',s=>DetailData.choices.heelcupOrigin[d.heelcup[s].origin]||'未入力')];
  }
  function table(item,includeAngle=true){return `<table class="dh-settings"><caption>左右の設定・記録値</caption><thead><tr><th scope="col">項目</th><th scope="col">左足</th><th scope="col">右足</th></tr></thead><tbody>${rows(item).filter((_,i)=>includeAngle||i!==0).map(([label,left,right],i)=>`<tr><th scope="row">${escape(label)}</th><td${includeAngle&&i===0?' class="dh-table-angle"':''}>${escape(left)}</td><td${includeAngle&&i===0?' class="dh-table-angle"':''}>${escape(right)}</td></tr>`).join('')}</tbody></table>`;}
  function mini(item){return `<div class="dh-mini-pair">${['left','right'].map((side,j)=>{
    const candidates=Array.isArray(item.holes)?item.holes.slice(j*12,j*12+12).flatMap((on,i)=>on?[i]:[]):Array.isArray(item.holes?.[side])?item.holes[side]:[];
    const holes=Array.from(new Set(candidates.map(Number).filter(n=>Number.isInteger(n)&&n>=0&&n<12)));
    const raw=item.reference?.[side],ref=raw!==null&&raw!==undefined&&String(raw).trim()!==''&&Number.isInteger(Number(raw))&&Number(raw)>=0&&Number(raw)<6?Number(raw):null;
    const label=j?'右足':'左足',row=start=>`<div class="dh-hole-row" aria-hidden="true">${Array.from({length:6},(_,i)=>`<span class="dh-hole${holes.includes(start+i)?' is-on':''}"></span>`).join('')}</div>`;
    return `<div class="dh-mini" role="img" aria-label="${label}。${holes.length?'選択ビス穴：'+holes.map(i=>`${i<6?'上':'下'}段${i%6+1}`).join('、'):'ビス穴未入力'}。推奨位置${ref===null?'未入力':'：'+(ref+1)}"><span class="dh-mini-label">${label}・ビス穴</span>${row(0)}<div class="dh-refs" aria-hidden="true">${Array.from({length:6},(_,i)=>`<span class="dh-ref${i===ref?' is-on':''}"></span>`).join('')}</div>${row(6)}<span class="dh-mini-note">推奨位置 ${ref===null?'未入力':'記録あり'}</span></div>`;
  }).join('')}</div>`;}
  function favorite(item){const on=!!item.favorite;return `<button type="button" class="dh-favorite" data-fav-id="${escape(item.id)}" aria-pressed="${on}" aria-label="${escape(board(item))} ${escape(date(item))} ${on?'お気に入り解除':'お気に入り登録'}">${on?'★':'☆'}</button>`;}
  function heading(item,card=false){return `<header class="dh-head${card?' dh-card-top':''}"><div class="dh-heading"><p class="dh-date">${escape(date(item))}</p><h3>${escape(board(item))}</h3><p class="dh-meta">${escape(text(item.snow)||'雪質未入力')}</p></div>${favorite(item)}</header>`;}
  function actions(item){const protectedItem=!!item.favorite;return `<div class="dh-actions"><button type="button" class="dh-load" data-load-id="${escape(item.id)}">この設定を使う</button><button type="button" class="dh-edit" data-edit-id="${escape(item.id)}">編集</button><button type="button" class="dh-delete" data-del-id="${escape(item.id)}" data-protected="${protectedItem?'1':'0'}" aria-disabled="${protectedItem}" title="${protectedItem?'お気に入りは削除できません':'削除'}">${protectedItem?'保護中':'削除'}</button></div>`;}
  function shapes(item){const d=detail(item),values=['shape','nose','bend'].map(key=>DetailData.choices[key][d[key]]).filter(Boolean);return values.length?`<div class="dh-shapes">${values.map(v=>`<span>${escape(v)}</span>`).join('')}</div>`:'';}
  function gear(item){return `<div class="dh-gear" role="group" aria-label="ビンディング"><span>${escape(detail(item).bindingName||'未入力')}</span></div>`;}
  function notes(item){return text(item.comment)?`<p class="dh-note"><span>滑走メモ</span>${escape(text(item.comment))}</p>`:'';}
  function detailNotes(item){const d=detail(item);return [['形状の補足',d.boardNote],['ギア調整メモ',d.note]].filter(([,v])=>v).map(([label,v])=>`<p class="dh-note"><span>${label}</span>${escape(v)}</p>`).join('');}
  function metrics(item){return `<div class="dh-metrics" role="group" aria-label="スタンスとスタンス幅"><span class="dh-stance">${escape(stance(item.stance))}</span><span class="dh-width">${width(item.stanceWidth)?'<small>幅 </small>'+escape(width(item.stanceWidth))+'<small> cm</small>':'<small>幅 未入力</small>'}</span></div><p class="dh-setback">${escape(setback(item))}</p>`;}
  function card(item){
    const d=detail(item),stats=['left','right'].map((side,i)=>`<div class="dh-stat"><span>${i?'右足':'左足'}</span><strong class="${number(item[side+'Angle'])===''?'dh-missing':''}">${escape(angle(item[side+'Angle']))}</strong><small>リーン ${escape(d[i?'forwardLeanRight':'forwardLeanLeft']||'未入力')}</small></div>`).join('');
    return `<article class="dh-frame dh-card" data-dh-record="${escape(item.id)}">${heading(item,true)}<div class="dh-card-body">${metrics(item)}${gear(item)}<div class="dh-stats" role="group" aria-label="左右の角度とフォワードリーン">${stats}</div>${notes(item)}</div><div class="dh-card-bottom"><details class="dh-details"><summary>調整の詳細<span>ディスク・ヒールカップなど</span></summary>${shapes(item)}${table(item,false)}${detailNotes(item)}${mini(item)}</details>${actions(item)}</div></article>`;
  }
  function matrix(item){return `<article class="dh-frame dh-matrix" data-dh-record="${escape(item.id)}">${heading(item)}${shapes(item)}${metrics(item)}${gear(item)}${table(item)}${mini(item)}${notes(item)}${detailNotes(item)}${actions(item)}</article>`;}
  function groups(items){const map=new Map();for(const item of items){const key=text(item.board);if(!map.has(key))map.set(key,[]);map.get(key).push(item);}return Array.from(map.values());}
  const chronologicalTime=item=>{const key=recordDateKey(item);return key===null?null:Number(key);};
  function previous(item,items){const now=chronologicalTime(item);if(now===null)return null;return items.filter(r=>chronologicalTime(r)!==null&&chronologicalTime(r)<now).sort((a,b)=>chronologicalTime(b)-chronologicalTime(a))[0]||null;}
  function changes(item,old){if(chronologicalTime(item)===null)return '日時未入力・不明のため変更点は比較しません';if(!old)return '表示中に比較できる過去の記録なし';const values=[['左角度',angle(old.leftAngle),angle(item.leftAngle)],['右角度',angle(old.rightAngle),angle(item.rightAngle)],['幅',width(old.stanceWidth)?width(old.stanceWidth)+' cm':'未入力',width(item.stanceWidth)?width(item.stanceWidth)+' cm':'未入力']].filter(([,a,b])=>a!==b);return values.length?'表示中の過去記録から：'+values.map(([label,a,b])=>`${label} ${a} → ${b}`).join(' / '):'表示中の過去記録と角度・幅は同じ';}
  function grouped(items){return groups(items).map(group=>`<section class="dh-frame dh-board"><header class="dh-board-head"><h3>${escape(board(group[0]))}</h3><p>${group.length}件 · 板内もメニューの並び順</p></header><ol class="dh-timeline">${group.map(item=>`<li data-dh-record="${escape(item.id)}"><div class="dh-timeline-head"><p class="dh-date">${escape(date(item))} · ${escape(text(item.snow)||'雪質未入力')}</p>${favorite(item)}</div><div class="dh-record-overview">${metrics(item)}${gear(item)}<div class="dh-timeline-values"><span><small>左 </small>${escape(angle(item.leftAngle))} <small>右 </small>${escape(angle(item.rightAngle))}</span></div></div><p class="dh-change">${escape(changes(item,previous(item,group)))}</p>${notes(item)}<details class="dh-details"><summary>設定をひらく</summary>${shapes(item)}${table(item)}${mini(item)}${detailNotes(item)}${actions(item)}</details></li>`).join('')}</ol></section>`).join('');}
  function render(items,layout){return layout==='grouped'?grouped(items):items.map(item=>layout==='summary'?card(item):matrix(item)).join('');}
  return {escape,number,angle,width,date,time,rows,mini,heading,actions,groups,previous,changes,card,matrix,grouped,render};
})();

const DetailHistoryView = (() => {
  const key='haru-detail:history-layout-v1',valid=['summary','matrix','grouped'];
  const controls=document.getElementById('detailHistoryControls'),group=document.getElementById('detailHistoryLayout'),status=document.getElementById('detailHistoryStatus'),history=document.getElementById('history');
  let layout='summary';try{const saved=localStorage.getItem(key);if(valid.includes(saved))layout=saved;}catch{}
  const active=()=>document.documentElement.dataset.inputMode==='detail';
  const descriptions={summary:'カード：要点を表示し、調整の詳細は開いて確認します。',matrix:'詳細一覧：左右の詳細設定を常時表示します。',grouped:'板ごとの履歴：板内もメニューの並び順。変更点は表示中の過去記録との比較です。'};
  const buttons=controls?Array.from(controls.querySelectorAll('[data-history-layout]')):[];
  function sync(){if(!controls)return;controls.hidden=!active();history.classList.toggle('dh-history',active());group.dataset.layout=layout;for(const b of buttons){const on=b.dataset.historyLayout===layout;b.setAttribute('aria-pressed',String(on));b.tabIndex=on?0:-1;}status.textContent=descriptions[layout];}
  function choose(next){if(!valid.includes(next)||!active())return;layout=next;let stored=true;try{localStorage.setItem(key,layout);}catch{stored=false;}render();if(!stored)status.textContent+=' 表示設定を保存できませんでした。';buttons.find(b=>b.dataset.historyLayout===layout)?.focus({preventScroll:true});}
  for(const button of buttons){button.addEventListener('click',()=>choose(button.dataset.historyLayout));button.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const i=valid.indexOf(layout);choose(valid[event.key==='Home'?0:event.key==='End'?2:(i+(event.key==='ArrowRight'?1:-1)+3)%3]);});}
  const capture=()=>new Set(Array.from(history.querySelectorAll('details.dh-details[open]')).map(el=>el.closest('[data-dh-record]')?.dataset.dhRecord));
  const restore=opened=>{if(!opened)return;history.querySelectorAll('details.dh-details').forEach(el=>{el.open=opened.has(el.closest('[data-dh-record]')?.dataset.dhRecord);});};
  return {active,sync,capture,restore,currentLayout:()=>layout,previewLayout:(next,redraw=true)=>{if(!valid.includes(next))return false;layout=next;if(redraw)render();else sync();return true;},render:items=>DetailHistoryData.render(items,layout)};
})();
