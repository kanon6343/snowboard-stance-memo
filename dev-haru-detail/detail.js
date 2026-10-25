/* Prototype-only optional detail schema. No conversion of board-specific measurements. */
const DetailData = (() => {
  const choices = {
    shape: {twin:'ツイン',directionalTwin:'ディレクショナルツイン',directional:'ディレクショナル',other:'その他'},
    nose: {round:'ラウンド',hammer:'ハンマーヘッド',semiHammer:'セミハンマー',other:'その他'},
    bend: {camber:'キャンバー',rocker:'ロッカー',flat:'フラット',hybrid:'ハイブリッド',other:'その他'},
    diskType: {holes:'穴位置式',slots:'長穴スライド式',mixed:'穴と長穴の併用',other:'その他・不明'},
  };
  const object = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const text = (value, max) => typeof value === 'string' ? value.trim().slice(0,max) : '';
  const number = value => {
    if (!['string','number'].includes(typeof value) || String(value).trim()==='') return '';
    const n=Number(value); return Number.isFinite(n)&&n>=0 ? String(n) : '';
  };
  const choice = (value, values) => Object.hasOwn(values,value) ? value : '';
  const axis = (value, directions) => {
    const v=object(value),mm=number(v.mm);
    return {direction:mm===''?'':directions.includes(v.direction)?v.direction:'',mm};
  };
  function normalize(value) {
    const v=object(value),s=object(v.setback),disk=object(v.diskShift);
    const setback=axis(s,['nose','tail']);
    setback.basis=setback.mm===''?'':['reference','center'].includes(s.basis)?s.basis:'';
    const foot = side => {
      const f=object(disk[side]);return {type:choice(f.type,choices.diskType),longitudinal:axis(f.longitudinal,['nose','tail']),lateral:axis(f.lateral,['toe','heel'])};
    };
    return {version:1,shape:choice(v.shape,choices.shape),nose:choice(v.nose,choices.nose),bend:choice(v.bend,choices.bend),
      boardNote:text(v.boardNote,160),forwardLeanLeft:text(v.forwardLeanLeft,64),forwardLeanRight:text(v.forwardLeanRight,64),
      setback,diskShift:{left:foot('left'),right:foot('right')},note:text(v.note,1000)};
  }
  function rows(value) {
    const d=normalize(value),r=[];
    for(const [key,label]of [['shape','シェイプ'],['nose','ノーズ'],['bend','ベンド']])if(d[key])r.push([label,choices[key][d[key]]]);
    if(d.boardNote)r.push(['形状の補足',d.boardNote]);
    for(const [key,label]of [['forwardLeanLeft','左リーン'],['forwardLeanRight','右リーン']])if(d[key])r.push([label,d[key]]);
    if(d.setback.mm!=='')r.push(['セットバック',`${({reference:'推奨位置',center:'板の中心'})[d.setback.basis]||'基準未設定'}から ${({nose:'ノーズ側',tail:'テール側'})[d.setback.direction]||'方向未設定'} ${d.setback.mm} mm`]);
    for(const [side,label]of [['left','左'],['right','右']]){
      if(d.diskShift[side].type)r.push([`${label}ディスク方式`,choices.diskType[d.diskShift[side].type]]);
      for(const [key,axisLabel]of [['longitudinal','前後'],['lateral','横']]){
      const a=d.diskShift[side][key];
      const amount=key==='longitudinal'?(Number(a.mm)===0?'0':`${a.direction==='tail'?'-':'+'}${a.mm}`):a.mm;
      if(a.mm!=='')r.push([`${label}ディスク${axisLabel}`,Number(a.mm)===0?'0 mm（ずらしなし）':`${amount} mm（${({nose:'ノーズ側',tail:'テール側',toe:'つま先側',heel:'かかと側'})[a.direction]||'方向未設定'}）`]);
      }
    }
    if(d.note)r.push(['詳細メモ',d.note]);return r;
  }
  const has = value => rows(value).length>0;
  const matches = (value, filters) => {
    const d=normalize(value);
    return ['shape','nose','bend'].every(key=>!filters[key] || (filters[key]==='__unset__' ? !d[key] : d[key]===filters[key]));
  };
  const escape = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const historyParts = value => {
    const d=normalize(value),r=rows(d);
    const line=([k,v])=>`<div class="history-inline-row"><dt>${escape(k)}</dt><dd>${escape(v)}</dd></div>`;
    const list=items=>items.length?`<dl class="history-inline-details detail-history-inline">${items.map(line).join('')}</dl>`:'';
    const signed=a=>Number(a.mm)===0?'0':!a.direction?`${a.mm}（方向未設定）`:`${a.direction==='tail'?'-':'+'}${a.mm}`;
    const compared=[
      ['フォワードリーン',d.forwardLeanLeft,d.forwardLeanRight],
      ...['ディスク方式','ディスク前後','ディスク横'].map(key=>[key,...['左','右'].map(side=>r.find(([k])=>k===side+key)?.[1]||'')])
    ];
    const feet=compared.filter(([,left,right])=>left||right).map(([label,left,right])=>`<div class="history-compare-row"><dt>${escape(label==='ディスク方式'?'ディスク形式':label)}</dt><dd><span><span class="compare-foot-label">左足 </span>${escape(left||'未入力')}</span><span><span class="compare-foot-label">右足 </span>${escape(right||'未入力')}</span></dd></div>`).join('');
    return {
      board:list(r.filter(([k])=>['シェイプ','ノーズ','ベンド','形状の補足'].includes(k))),
      stance:d.setback.mm!==''?`<span class="stance-width-tag history-setback detail-history-inline">${escape(({reference:'推奨位置',center:'中心'})[d.setback.basis]||'基準未設定')}から ${escape(signed(d.setback))} mm</span>`:'',
      left:list(r.filter(([k])=>k==='左リーン'||k.startsWith('左ディスク'))),
      right:list(r.filter(([k])=>k==='右リーン'||k.startsWith('右ディスク'))),
      feet:feet?`<dl class="history-comparison detail-history-inline">${feet}</dl>`:'',
      note:d.note?`<div class="comment history-gear-note detail-history-inline"><span>ギア調整メモ</span>${escape(d.note)}</div>`:''
    };
  };
  const historyHtml=value=>{const p=historyParts(value);return [p.board,p.stance,p.feet,p.note].join('');};
  function boardProfile(items,board) {
    if(!Array.isArray(items)||typeof board!=='string'||!board.trim())return null;
    const candidates=items.map((item,order)=>({item,order,time:typeof item?.dateTime==='string'?Date.parse(item.dateTime):NaN}))
      .filter(({item})=>typeof item?.board==='string'&&item.board.trim()===board.trim())
      .sort((a,b)=>(Number.isFinite(b.time)?b.time:-Infinity)-(Number.isFinite(a.time)?a.time:-Infinity)||a.order-b.order);
    for(const {item}of candidates){const d=normalize(item.detail);if(d.shape||d.nose||d.bend||d.boardNote)return {shape:d.shape,nose:d.nose,bend:d.bend,boardNote:d.boardNote};}return null;
  }
  return {choices,normalize,rows,has,matches,historyHtml,historyParts,boardProfile};
})();

const DetailEditor = (() => {
  const byId=id=>document.getElementById(id), modeKey='haru-detail:input-mode-v1',filterKey='haru-detail:shape-filter-v1';
  const bindings={shape:'detailShape',nose:'detailNose',bend:'detailBend',boardNote:'detailBoardNote',forwardLeanLeft:'detailLeanLeft',forwardLeanRight:'detailLeanRight',note:'detailNote'};
  for(const side of ['left','right']){
    const foot=byId(`detailDisk-${side}`),label=side==='left'?'左足':'右足';
    foot.innerHTML=`<h3>${label}のディスク</h3><div class="detail-offset-grid"><label>前後（mm）<input id="shift-${side}-longitudinal-mm" type="number" step="any" placeholder="例：-3" aria-label="${label}ディスク前後（mm）" aria-describedby="diskSignHelp-${side}"></label><label>横の方向<select id="shift-${side}-lateral-direction" aria-label="${label}ディスク横の方向"><option value="">選択</option><option value="toe">つま先側</option><option value="heel">かかと側</option></select></label><label>横（mm）<input id="shift-${side}-lateral-mm" type="number" min="0" step="any" inputmode="decimal" placeholder="例：3" aria-label="${label}ディスク横（mm）"></label></div><p id="diskSignHelp-${side}" class="detail-hint">前後は ＋ノーズ／−テール。0はずらしなし、空欄は未入力。</p>`;
  }
  const panel=byId('setupCard'),select=byId('inputMode');
  let setbackSign='tail';
  const syncSign=()=>{
    byId('setbackSignSwitch').dataset.basis=setbackSign;
    byId('setbackNose').setAttribute('aria-pressed',String(setbackSign==='nose'));
    byId('setbackTail').setAttribute('aria-pressed',String(setbackSign==='tail'));
  };
  for(const [id,direction]of [['setbackNose','nose'],['setbackTail','tail']]){
    byId(id).addEventListener('click',()=>{
      setbackSign=direction;
      const input=byId('detailSetbackMm');
      if(input.value!==''&&Number.isFinite(Number(input.value)))input.value=String(Math.abs(Number(input.value))*(direction==='tail'?-1:1));
      input.setCustomValidity('');syncSign();retained();
    });
    byId(id).addEventListener('keydown',event=>{
      const next=event.key==='ArrowDown'||event.key==='End'?'setbackTail':event.key==='ArrowUp'||event.key==='Home'?'setbackNose':null;
      if(next){event.preventDefault();byId(next).focus();byId(next).click();}
    });
  }
  byId('detailSetbackMm').addEventListener('input',()=>{
    const raw=byId('detailSetbackMm').value,n=Number(raw);
    if(raw!==''&&Number.isFinite(n)&&n!==0)setbackSign=n<0?'tail':'nose';
    syncSign();
  });
  const syncBasis=()=>{
    const value=byId('detailSetbackBasis').value;
    byId('setbackBasisSwitch').dataset.basis=value;
    byId('basisReference').setAttribute('aria-pressed',String(value==='reference'));
    byId('basisCenter').setAttribute('aria-pressed',String(value==='center'));
  };
  for(const [id,value]of [['basisReference','reference'],['basisCenter','center']]){
    byId(id).addEventListener('click',()=>{byId('detailSetbackBasis').value=value;syncBasis();retained();});
    byId(id).addEventListener('keydown',event=>{
      const next=event.key==='ArrowRight'||event.key==='End'?'basisCenter':event.key==='ArrowLeft'||event.key==='Home'?'basisReference':null;
      if(next){event.preventDefault();byId(next).focus();byId(next).click();}
    });
  }
  byId('detailSetbackBasis').addEventListener('change',syncBasis);
  const sections=['detailFields','detailSetback','leftFootDetails','rightFootDetails','leftLeanFields','rightLeanFields','detailNoteFields'].map(byId);
  let mode='simple',filters={shape:'',nose:'',bend:''};
  const profileKeys=['shape','nose','bend','boardNote'];let profileBoard='',autoProfile=false,profileDirty=false;
  const profileNotice=(message='',offer=false)=>{byId('boardProfileNotice').hidden=!message;byId('boardProfileStatus').textContent=message;byId('applyBoardProfile').hidden=!offer;};
  for(const side of ['left','right']){
    const foot=byId(`detailDisk-${side}`);
    const picker=document.createElement('div');picker.className='disk-type-picker';picker.innerHTML=`<label for="shift-${side}-type">${side==='left'?'左足':'右足'}ディスクの調整方式</label><select id="shift-${side}-type"><option value="">未設定</option>${Object.entries(DetailData.choices.diskType).map(([v,t])=>`<option value="${v}">${t}</option>`).join('')}</select><span id="disk-preview-${side}" class="disk-preview"></span>`;
    foot.insertBefore(picker,foot.children[1]);
  }
  const drawDisk=side=>{
    const type=byId(`shift-${side}-type`).value,target=byId(`disk-preview-${side}`);
    if(!type||type==='other'){target.textContent=type?'形状の特徴は詳細メモに記録できます。':'';return;}
    const holes=(x)=>[30,42,54,66].map(y=>`<circle cx="${x}" cy="${y}" r="4"/>`).join('');
    const slot=x=>`<rect x="${x-4}" y="26" width="8" height="44" rx="4"/>`;
    target.innerHTML=`<svg viewBox="0 0 96 96" width="80" height="80" role="img" aria-label="${DetailData.choices.diskType[type]}の模式図"><circle cx="48" cy="48" r="44" fill="none" stroke="currentColor" stroke-width="2"/><g fill="none" stroke="currentColor" stroke-width="2">${type==='slots'?slot(34)+slot(62):type==='holes'?holes(34)+holes(62):holes(34)+slot(62)}</g></svg><small>模式図（実物の寸法・可動範囲ではありません）</small>`;
  };
  try {if(localStorage.getItem(modeKey)==='detail')mode='detail';}catch{}
  try {const f=JSON.parse(localStorage.getItem(filterKey)||'{}');for(const key of Object.keys(filters))if(f?.[key]==='__unset__'||Object.hasOwn(DetailData.choices[key],f?.[key]))filters[key]=f[key];}catch{}
  const collect = () => {
    const value={};for(const [key,id]of Object.entries(bindings))value[key]=byId(id).value;
    const rawSetback=byId('detailSetbackMm').value,setbackNumber=Number(rawSetback);
    value.setback={basis:byId('detailSetbackBasis').value,direction:rawSetback===''?'':setbackNumber===0?setbackSign:setbackNumber<0?'tail':'nose',mm:rawSetback===''?'':String(Math.abs(setbackNumber))};
    value.diskShift={};for(const side of ['left','right']){
      const raw=byId(`shift-${side}-longitudinal-mm`).value,n=Number(raw);
      value.diskShift[side]={type:byId(`shift-${side}-type`).value,longitudinal:{direction:raw===''?'':n<0?'tail':'nose',mm:raw===''?'':String(Math.abs(n))},lateral:{direction:byId(`shift-${side}-lateral-direction`).value,mm:byId(`shift-${side}-lateral-mm`).value}};
    }
    return value;
  };
  const retained = () => {byId('detailRetained').hidden=mode==='detail'||!DetailData.has(collect());};
  const persist = (key,value) => {try{localStorage.setItem(key,value);return true;}catch{return false;}};
  const applyMode = (next,save=false) => {
    mode=next==='detail'?'detail':'simple';sections.forEach(section=>section.hidden=mode!=='detail');select.value=mode;document.documentElement.dataset.inputMode=mode;retained();
    const saved=!save||persist(modeKey,mode);
    byId('inputModeStatus').textContent=saved?'シンプルに戻しても詳細データは消えません。':'画面は切り替えましたが、入力モードの設定を保存できませんでした。';
  };
  function write(value) {
    const d=DetailData.normalize(value);for(const [key,id]of Object.entries(bindings))byId(id).value=d[key];
    byId('detailSetbackBasis').value=d.setback.mm===''?'reference':d.setback.basis;
    syncBasis();
    byId('detailSetbackMm').value=d.setback.mm===''?'':d.setback.direction==='tail'?String(-Number(d.setback.mm)):d.setback.mm;
    setbackSign=d.setback.direction||'tail';syncSign();
    for(const side of ['left','right']){byId(`shift-${side}-type`).value=d.diskShift[side].type;drawDisk(side);}
    for(const side of ['left','right'])for(const axis of ['longitudinal','lateral']){
      const a=d.diskShift[side][axis];
      if(axis==='lateral')byId(`shift-${side}-${axis}-direction`).value=a.mm===''?'toe':a.direction;
      byId(`shift-${side}-${axis}-mm`).value=a.mm===''?'':axis==='longitudinal'&&a.direction==='tail'?String(-Number(a.mm)):a.mm;
    }
    panel.querySelectorAll('input').forEach(el=>el.setCustomValidity(''));retained();
    profileBoard=byId('board').value.trim();autoProfile=false;profileDirty=false;profileNotice();
  }
  function read() {
    const checks=[['detailSetbackMm',['detailSetbackBasis']]];
    for(const side of ['left','right'])for(const axis of ['longitudinal','lateral'])checks.push([`shift-${side}-${axis}-mm`,axis==='lateral'?[`shift-${side}-${axis}-direction`]:[]]);
    for(const [id,directions]of checks){
      const el=byId(id);el.setCustomValidity('');
      const signed=id==='detailSetbackMm'||id.includes('longitudinal');
      if(el.validity.badInput||el.value!==''&&(!Number.isFinite(Number(el.value))||!signed&&Number(el.value)<0))el.setCustomValidity(signed?'前後のずらし量を数値で入力するか、空欄にしてください。':'移動量は0以上の数値をmmで入力するか、空欄にしてください。');
      if(el.value!==''&&directions.some(name=>!byId(name).value))el.setCustomValidity('移動量に対応する基準・方向を選んでください。');
      if(!el.checkValidity()){applyMode('detail',true);if(typeof showView==='function')showView('input');const side=el.closest('[data-detail-foot]')?.dataset.detailFoot;if(side&&typeof showFoot==='function')showFoot(side);el.focus();el.reportValidity();return null;}
    }
    return DetailData.normalize(collect());
  }
  const controls=document.createElement('div');controls.className='detail-filters';
  controls.innerHTML=`<h4>板の形状で絞り込み</h4>${Object.entries({shape:'シェイプ',nose:'ノーズ形状',bend:'ベンド'}).map(([key,label])=>`<label>${label}<select id="filter-${key}"><option value="">すべて</option><option value="__unset__">未設定</option>${Object.entries(DetailData.choices[key]).map(([v,t])=>`<option value="${v}">${t}</option>`).join('')}</select></label>`).join('')}<p class="menu-note">複数指定はすべて一致する記録を表示します。未入力の過去データは「未設定」で探せます。</p><p id="detailFilterStatus" class="menu-note" role="status"></p>`;
  byId('menuFilters').appendChild(controls);
  const filterStatus=()=>{const labels=Object.entries({shape:'シェイプ',nose:'ノーズ',bend:'ベンド'}).filter(([k])=>filters[k]).map(([k,label])=>`${label}：${filters[k]==='__unset__'?'未設定':DetailData.choices[k][filters[k]]}`);byId('detailFilterStatus').textContent=labels.length?labels.join(' / '):'形状の絞り込みなし';};
  for(const key of Object.keys(filters)){byId(`filter-${key}`).value=filters[key];byId(`filter-${key}`).addEventListener('change',()=>{filters[key]=byId(`filter-${key}`).value;persist(filterKey,JSON.stringify(filters));filterStatus();render();});}
  byId('btnFilterClear').addEventListener('click',()=>{for(const k of Object.keys(filters)){filters[k]='';byId(`filter-${k}`).value='';}persist(filterKey,JSON.stringify(filters));filterStatus();});
  select.addEventListener('change',()=>applyMode(select.value,true));panel.addEventListener('input',retained);panel.addEventListener('change',retained);
  const applyProfile=profile=>{for(const k of profileKeys)byId(bindings[k]).value=profile[k];autoProfile=true;profileDirty=false;profileBoard=byId('board').value.trim();retained();profileNotice('保存履歴からこの板の形状を入力しました。角度などの設定は変更していません。');};
  const changeBoard=()=>{
    const board=byId('board').value.trim();if(board===profileBoard)return;
    if(autoProfile&&!profileDirty)for(const k of profileKeys)byId(bindings[k]).value='';
    const profile=DetailData.boardProfile(loadList(),board),hasCurrent=profileKeys.some(k=>byId(bindings[k]).value);
    if(profile&&!hasCurrent)applyProfile(profile);
    else{profileBoard=board;autoProfile=false;profileNotice(profile?'この板の保存済み形状があります。入力中の形状は上書きしていません。':hasCurrent?'板名を変更しました。形状も確認してください。':'',!!profile);retained();}
  };
  byId('board').addEventListener('change',changeBoard);
  byId('board').addEventListener('blur',changeBoard);
  byId('applyBoardProfile').addEventListener('click',()=>{const profile=DetailData.boardProfile(loadList(),byId('board').value);if(profile)applyProfile(profile);});
  for(const k of profileKeys)for(const event of ['input','change'])byId(bindings[k]).addEventListener(event,()=>{profileDirty=true;autoProfile=false;profileNotice();});
  for(const side of ['left','right'])byId(`shift-${side}-type`).addEventListener('change',()=>drawDisk(side));
  panel.querySelectorAll('input[type="number"]').forEach(el=>el.addEventListener('input',()=>el.setCustomValidity('')));
  write({});applyMode(mode);filterStatus();
  return {read,write,clear:()=>write({}),matches:value=>DetailData.matches(value,filters),historyHtml:DetailData.historyHtml};
})();
