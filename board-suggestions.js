/* Saved gear names only: no separate history, network requests or storage writes. */
function getBoardNameSuggestions(items, query = '') {
  if (!Array.isArray(items)) return [];
  const searchKey = value => value.normalize('NFKC').toLocaleLowerCase('ja');
  const needle = searchKey(String(query).trim());
  const recent = items.map((item, order) => {
    const name = typeof item?.board === 'string' ? item.board.trim() : '';
    const date = typeof item?.dateTime === 'string' ? item.dateTime : '';
    const time = /T.*(?:Z|[+-]\d{2}:\d{2})$/i.test(date) ? Date.parse(date) : NaN;
    return {name, order, time: Number.isFinite(time) ? time : -Infinity};
  }).filter(item => item.name).sort((a, b) => b.time - a.time || a.order - b.order);
  const seen = new Set();
  return recent.filter(item => {
    if (seen.has(item.name)) return false;
    seen.add(item.name);
    return searchKey(item.name).includes(needle);
  }).map(item => item.name);
}

function getBindingNameSuggestions(items, query = '') {
  if (!Array.isArray(items)) return [];
  return getBoardNameSuggestions(items.map(item => ({board:item?.detail?.bindingName,dateTime:item?.dateTime})), query);
}

(() => {
  const connect = ({inputId, listId, optionPrefix, suggestions, emptyMessage, onChoose}) => {
  const input = document.getElementById(inputId);
  const list = document.getElementById(listId);
  if (!input || !list) return;
  const field = input.closest('.board-field');
  let matches = [], active = -1, composing = false;
  const close = () => {
    list.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    active = -1;
  };
  const highlight = index => {
    active = index;
    Array.from(list.children).forEach((option, i) => option.setAttribute('aria-selected', String(i === active)));
    if (active >= 0) {
      input.setAttribute('aria-activedescendant', list.children[active].id);
      list.children[active].scrollIntoView({block: 'nearest'});
    } else input.removeAttribute('aria-activedescendant');
  };
  const refresh = () => {
    const items = loadList();
    const saved = suggestions(items);
    matches = suggestions(items, input.value).slice(0, 20);
    list.replaceChildren();
    active = -1;
    input.removeAttribute('aria-activedescendant');
    if (!saved.length) { close(); return; }
    matches.forEach((name, index) => {
      const option = document.createElement('li');
      option.id = `${optionPrefix}-${index}`;
      option.setAttribute('role', 'option');
      option.setAttribute('aria-selected', 'false');
      option.dataset.index = String(index);
      option.textContent = name;
      list.appendChild(option);
    });
    if (!matches.length) {
      const hint = document.createElement('li');
      hint.className = 'board-suggestion-empty';
      hint.setAttribute('role', 'presentation');
      hint.textContent = emptyMessage;
      list.appendChild(hint);
    }
    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  };
  const choose = index => {
    if (index < 0 || index >= matches.length) return;
    input.value = matches[index];
    input.dispatchEvent(new Event('input', {bubbles: true}));
    input.dispatchEvent(new Event('change', {bubbles: true}));
    if(onChoose)onChoose(matches[index]);
    input.focus();
    close();
  };
  input.addEventListener('focus', refresh);
  input.addEventListener('click', refresh);
  input.addEventListener('input', () => { if (!composing) refresh(); });
  input.addEventListener('compositionstart', () => { composing = true; });
  input.addEventListener('compositionend', () => { composing = false; refresh(); });
  input.addEventListener('keydown', event => {
    if (composing || event.isComposing || event.keyCode === 229) return;
    if (event.key === 'Escape' || event.key === 'Tab') { close(); return; }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (list.hidden) refresh();
      if (!matches.length) return;
      const next = active < 0 ? (event.key === 'ArrowDown' ? 0 : matches.length - 1)
        : (active + (event.key === 'ArrowDown' ? 1 : -1) + matches.length) % matches.length;
      highlight(next);
    } else if (event.key === 'Enter' && !list.hidden && active >= 0) {
      event.preventDefault(); choose(active);
    }
  });
  list.addEventListener('pointerdown', event => {
    // Keep mouse focus on the combobox. Touch scrolling remains native.
    if (event.pointerType === 'mouse') event.preventDefault();
  });
  list.addEventListener('click', event => {
    const option = event.target.closest('[role="option"]');
    if (option && list.contains(option)) choose(Number(option.dataset.index));
  });
  document.addEventListener('pointerdown', event => { if (!field.contains(event.target)) close(); });
  document.addEventListener('focusin', event => { if (!field.contains(event.target)) close(); });
  window.addEventListener('blur', close);
  window.addEventListener('storage', event => {
    if ((event.key === KEY || event.key === null) && !list.hidden) refresh();
  });
  };
  connect({inputId:'board',listId:'boardSuggestions',optionPrefix:'boardSuggestion',suggestions:getBoardNameSuggestions,emptyMessage:'候補なし。このまま新しい板名を入力できます。'});
  connect({inputId:'detailBindingName',listId:'bindingSuggestions',optionPrefix:'bindingSuggestion',suggestions:getBindingNameSuggestions,emptyMessage:'候補なし。このまま新しいビンディング名を入力できます。',onChoose:name=>DetailEditor.applyBindingProfile(name)});
})();
