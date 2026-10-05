(() => {
  'use strict';
  let language = 'en', entries = new Map(), expression = null, revision = 0, timer;
  const normalize = (text) => String(text).normalize('NFC').toLocaleLowerCase().trim();
  const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const scopes = '.prep-word,.prep-ex,.q-sentence,.memo td,.fiche-usage [data-text],.fiche-sheet tbody td,#word-main,#examples-list p,#slang-expression,#dictee-correct-text,.story-sentence,.story-text,[data-vocab-term]';
  const dialog = document.createElement('dialog');
  dialog.className = 'vocab-dialog';dialog.setAttribute('aria-labelledby', 'vocab-title');
  dialog.innerHTML = '<h2 id="vocab-title"></h2><p id="vocab-translation"></p><p id="vocab-definition"></p><div class="vocab-actions"><button type="button" id="vocab-audio">Écouter</button><button type="button" id="vocab-close">Fermer</button></div>';
  let activeTerm = '', returnFocus;
  function register(term, translation, definition = '') {
    if (term && translation) entries.set(normalize(term), {term:String(term),translation:String(translation),definition:String(definition)});
  }
  function rebuild() {
    const terms = [...entries.keys()].filter(term=>term&&!entries.get(term).definition?.startsWith('Caractère de référence.')).sort((a,b) => b.length-a.length).map(escapeRegex);
    const pattern = terms.join('|');
    expression = terms.length ? new RegExp(['ja','zh'].includes(language) ? pattern : `(?<![\\p{L}\\p{N}_])(?:${pattern})(?![\\p{L}\\p{N}_])`, 'giu') : null;
  }
  function show(term, supplied) {
    const entry = supplied || entries.get(normalize(term));if (!entry) return;
    activeTerm = term;returnFocus = document.activeElement;
    dialog.querySelector('#vocab-title').textContent = term;
    dialog.querySelector('#vocab-translation').textContent = entry.translation;
    dialog.querySelector('#vocab-definition').textContent = entry.definition || 'Sens courant ; la traduction dépend du contexte.';
    if (!dialog.open) dialog.showModal();
  }
  function scan() {
    if (!expression) return;
    // The existing French hints are retained as popup data, hidden only on screen.
    document.querySelectorAll('.prep-card').forEach((card) => {
      const term = card.querySelector('.prep-word'), fr = card.querySelector('.fr');
      if (term && fr) {
        const text = term.textContent.replace('🔊','').trim();
        register(text, fr.textContent.trim(), 'Sens sur cette fiche.');
        fr.classList.add('vocab-on-demand');
        term.dataset.vocabTerm = text;term.dataset.vocabTranslation = fr.textContent.trim();
      }
    });
    rebuild();
    document.querySelectorAll(scopes).forEach((root) => {
      if (root.closest('button,.vocab-dialog,.fr,.vocab-on-demand,.exercise-card,.exercise-options,.opt,.lesson-menu-item')) return;
      if (root.dataset.vocabTerm) {
        root.classList.add('vocab-word');root.setAttribute('role','button');root.tabIndex=0;
        root.setAttribute('aria-label',`Définition de ${root.dataset.vocabTerm}`);return;
      }
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {acceptNode(node) {
        return node.parentElement.closest('.vocab-word,.fr,button,script,style,.vocab-on-demand') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      }});
      const nodes=[];while(walker.nextNode()) nodes.push(walker.currentNode);
      for (const node of nodes) {
        const text=node.textContent, matches=[...text.matchAll(expression)];if (!matches.length) continue;
        const fragment=document.createDocumentFragment();let offset=0;
        for (const m of matches) {
          fragment.append(document.createTextNode(text.slice(offset,m.index)));
          const span=document.createElement('span');span.className='vocab-word';span.dataset.vocabTerm=m[0];span.tabIndex=0;span.setAttribute('role','button');span.setAttribute('aria-label',`Définition de ${m[0]}`);span.textContent=m[0];
          if(language==='en'&&/^(AM|PM)$/.test(m[0]))span.dataset.vocabTranslation=m[0]==='AM'?'du matin (avant midi)':'de l’après-midi ou du soir (après midi)';
          fragment.append(span);offset=m.index+m[0].length;
        }
        fragment.append(document.createTextNode(text.slice(offset)));node.replaceWith(fragment);
      }
    });
  }
  async function setLanguage(code) {
    if (!['en','es','it','ja','zh'].includes(code)) return;
    const token=++revision;language=code;
    try {
      const res=await fetch(`/api/vocabulary-help/${code}`);if (!res.ok) throw new Error('Glossaire indisponible');
      const data=await res.json();if(token!==revision)return;
      entries=new Map(data.entries.map(e=>[normalize(e.term),e]));rebuild();scan();
    } catch { /* Existing explicit definitions remain usable. */ }
  }
  window.WordSipHelp={setLanguage,register,refresh(){rebuild();scan();},show};
  function openFromEvent(event) {
    const target=event.target.closest('.vocab-word');if (!target) return;
    if(event.type==='keydown'&&!['Enter',' '].includes(event.key))return;
    event.preventDefault();event.stopImmediatePropagation();
    show(target.dataset.vocabTerm, target.dataset.vocabTranslation ? {translation:target.dataset.vocabTranslation,definition:target.dataset.vocabDefinition||''} : undefined);
  }
  document.addEventListener('click',openFromEvent,true);document.addEventListener('keydown',openFromEvent,true);
  function init() {
    document.body.append(dialog);
    const nav=document.querySelector('nav,.toolbar');
    if(nav&&!nav.querySelector('[data-week-game]')){
      const link=document.createElement('a');link.dataset.weekGame='true';link.href='/jeux'+location.search;link.textContent='🎮 Jeux';link.style.color=nav.classList.contains('toolbar')?'#fff':'#2b7a78';link.style.fontWeight='700';nav.style.flexWrap='wrap';nav.append(link);
    }
    dialog.querySelector('#vocab-close').onclick=()=>dialog.close();
    dialog.addEventListener('close',()=>returnFocus?.focus());
    dialog.addEventListener('click',event=>{if(event.target===dialog){const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close();}});
    dialog.querySelector('#vocab-audio').onclick=()=>new Audio(`/api/tts?text=${encodeURIComponent(activeTerm)}&lang=${language}`).play().catch(()=>{});
    const hint=document.createElement('p');hint.className='vocab-hint';hint.textContent='Un mot souligné vous échappe ? Cliquez dessus pour afficher son sens, puis fermez la définition pour continuer.';
    const anchor=document.querySelector('.prep-grid,.fiche-sheet,#lessons-tab,#examples-list');if(anchor)anchor.before(hint);
    const params=new URLSearchParams(location.search);const fileLang=location.pathname.match(/-(en|es|it|ja|zh)\.html$/)?.[1];
    setLanguage(fileLang||params.get('lang')||'en');
    const observer=new MutationObserver((mutations)=>{
      if(mutations.every(m=>m.target.closest?.('.vocab-dialog,.vocab-word')))return;
      clearTimeout(timer);timer=setTimeout(scan,80);
    });observer.observe(document.body,{childList:true,subtree:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
