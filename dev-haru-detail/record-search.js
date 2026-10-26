/* Optional search criteria: preferences only; saved records are never rewritten. */
const RecordSearchData = (() => {
  const diskTypes={holes:'穴位置式',slots:'長穴スライド式',mixed:'穴と長穴の併用',other:'その他・不明'};
  const sides={either:'左右どちらか',both:'左右とも',left:'左足',right:'右足'};
  const text=value=>typeof value==='string'?value.trim().slice(0,128):'';
  const key=value=>text(value).normalize('NFKC').toLocaleLowerCase('ja');
  const width=value=>['string','number'].includes(typeof value)&&String(value).trim()!==''&&Number.isFinite(Number(value))&&Number(value)>0?String(Number(value)):'';
  const normalize=value=>{const f=value&&typeof value==='object'?value:{},out={bindingName:text(f.bindingName),widthMin:width(f.widthMin),widthMax:width(f.widthMax),diskType:f.diskType==='__unset__'||Object.hasOwn(diskTypes,f.diskType)?f.diskType:'',diskSide:Object.hasOwn(sides,f.diskSide)?f.diskSide:'either'};if(out.widthMin&&out.widthMax&&Number(out.widthMin)>Number(out.widthMax)){out.widthMin='';out.widthMax='';}return out;};
  function matches(item,value,mode){
    const f=normalize(value),n=width(item?.stanceWidth);
    if((f.widthMin||f.widthMax)&&(!n||(f.widthMin&&Number(n)<Number(f.widthMin))||(f.widthMax&&Number(n)>Number(f.widthMax))))return false;
    if(mode!=='detail')return true;
    const d=item?.detail&&typeof item.detail==='object'?item.detail:{};
    if(f.bindingName&&!key(d.bindingName).includes(key(f.bindingName)))return false;
    if(f.diskType){
      const foot=side=>{const raw=d.diskShift?.[side]?.type,type=Object.hasOwn(diskTypes,raw)?raw:'';return f.diskType==='__unset__'?!type:type===f.diskType;};
      if(f.diskSide==='both'?!foot('left')||!foot('right'):f.diskSide==='either'?!foot('left')&&!foot('right'):!foot(f.diskSide))return false;
    }
    return true;
  }
  function active(value,mode){
    const f=normalize(value),out=[];
    if(f.widthMin||f.widthMax)out.push({key:'width',label:`幅 ${f.widthMin||'下限なし'}〜${f.widthMax||'上限なし'} cm`});
    if(mode==='detail'&&f.bindingName)out.push({key:'bindingName',label:'ビンディング：'+f.bindingName});
    if(mode==='detail'&&f.diskType)out.push({key:'diskType',label:'ディスク：'+(f.diskType==='__unset__'?'未設定':diskTypes[f.diskType])+'（'+sides[f.diskSide]+'）'});
    return out;
  }
  function suggestions(items){const seen=new Set(),out=[];for(const item of Array.isArray(items)?items:[]){const name=text(item?.detail?.bindingName),id=key(name);if(name&&!seen.has(id)){seen.add(id);out.push(name);}}return out.sort((a,b)=>a.localeCompare(b,'ja')).slice(0,30);}
  return {diskTypes,sides,normalize,matches,active,suggestions};
})();

const RecordSearch = (() => {
  const byId=id=>document.getElementById(id),storageKey='haru-detail:record-filters-v1',mode=()=>document.documentElement.dataset.inputMode;
  let state=RecordSearchData.normalize({}),timer=null,candidateSignature='';
  try{state=RecordSearchData.normalize(JSON.parse(localStorage.getItem(storageKey)||'{}'));}catch{}
  const width=document.createElement('div');width.className='record-width-filter';
  width.innerHTML='<label class="record-search-heading">スタンス幅（cm）</label><div class="record-width-range"><label>下限<input id="filter-width-min" type="number" min="0" step="any" inputmode="decimal" placeholder="下限なし" aria-label="スタンス幅の下限（cm）"></label><span aria-hidden="true">〜</span><label>上限<input id="filter-width-max" type="number" min="0" step="any" inputmode="decimal" placeholder="上限なし" aria-label="スタンス幅の上限（cm）"></label></div><p id="recordSearchError" class="record-search-error" role="alert" hidden></p>';
  byId('filtersPanel').appendChild(width);
  const gear=document.createElement('section');gear.className='record-gear-filters';gear.id='recordGearFilters';gear.setAttribute('aria-labelledby','recordGearHeading');
  const options=Object.entries(RecordSearchData.diskTypes).map(([value,label])=>`<option value="${value}">${label}</option>`).join('');
  gear.innerHTML=`<h3 id="recordGearHeading">ビンディング・ディスク</h3><label>ビンディング名<input id="filter-binding-name" type="search" maxlength="128" list="filter-binding-names" placeholder="名前の一部でも探せます" aria-label="ビンディング名で絞り込み"><datalist id="filter-binding-names"></datalist></label><div class="record-disk-filter"><label>ディスク形式<select id="filter-disk-type"><option value="">すべて</option><option value="__unset__">未設定</option>${options}</select></label><label>対象の足<select id="filter-disk-side"><option value="either">左右どちらか</option><option value="both">左右とも</option><option value="left">左足</option><option value="right">右足</option></select></label></div><p class="menu-note">名前は部分一致。ほかの条件と同時に指定すると、すべてに合う履歴を表示します。</p>`;
  const filters=byId('menuFilters'),shapes=filters.querySelector('.menu-shape-filter');if(shapes)filters.insertBefore(gear,shapes);else filters.appendChild(gear);
  filters.appendChild(byId('btnFilterClear'));
  const ids={bindingName:'filter-binding-name',widthMin:'filter-width-min',widthMax:'filter-width-max',diskType:'filter-disk-type',diskSide:'filter-disk-side'};
  function fill(){for(const [key,id]of Object.entries(ids))byId(id).value=state[key];byId('filter-disk-side').disabled=!state.diskType;}
  function persist(){try{localStorage.setItem(storageKey,JSON.stringify(state));}catch{}}
  function syncMode(){gear.hidden=mode()!=='detail';byId('filter-disk-side').disabled=!state.diskType;}
  function apply(){
    clearTimeout(timer);timer=null;
    const raw=Object.fromEntries(Object.entries(ids).map(([key,id])=>[key,byId(id).value]));
    let error='';
    for(const field of ['widthMin','widthMax']){const el=byId(ids[field]);if(el.validity?.badInput||(raw[field]!==''&&(!Number.isFinite(Number(raw[field]))||Number(raw[field])<=0)))error='スタンス幅は0より大きい数値で入力してください。';}
    if(!error&&raw.widthMin!==''&&raw.widthMax!==''&&Number(raw.widthMin)>Number(raw.widthMax))error='下限は上限以下にしてください。';
    const notice=byId('recordSearchError');notice.hidden=!error;notice.textContent=error?error+' 直前の有効な条件で表示しています。':'';
    if(error)return false;
    state=RecordSearchData.normalize(raw);persist();syncMode();render();return true;
  }
  for(const [key,id]of Object.entries(ids)){
    const el=byId(id);el.addEventListener('change',apply);
    if(key==='bindingName')el.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(apply,180);});
  }
  function clear(key,rerender=true){
    clearTimeout(timer);timer=null;
    if(key==='width'){state.widthMin='';state.widthMax='';}
    else if(key==='diskType'){state.diskType='';state.diskSide='either';}
    else if(Object.hasOwn(state,key))state[key]='';
    fill();byId('recordSearchError').hidden=true;persist();if(rerender)render();
  }
  function clearAll(rerender=true){clearTimeout(timer);timer=null;state=RecordSearchData.normalize({});fill();byId('recordSearchError').hidden=true;persist();if(rerender)render();}
  function refreshSuggestions(items){const names=RecordSearchData.suggestions(items),signature=JSON.stringify(names);if(signature===candidateSignature)return;candidateSignature=signature;const list=byId('filter-binding-names');list.replaceChildren();for(const name of names){const option=document.createElement('option');option.value=name;list.appendChild(option);}}
  fill();syncMode();
  return {start(){refreshSuggestions(loadList());render();},syncMode,refreshSuggestions,clear,clearAll,matches:item=>RecordSearchData.matches(item,state,mode()),active:()=>RecordSearchData.active(state,mode()),signature:()=>JSON.stringify(RecordSearchData.active(state,mode()))};
})();
RecordSearch.start();
