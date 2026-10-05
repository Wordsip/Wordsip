(() => {
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let stop=()=>{};
  const shuffle=a=>WordSipLearningGames.shuffle(a);
  function bodyScene(){
    const zones=[['head',146,36,110,112],['torso',150,160,100,140],['arms',80,170,45,110],['arms',275,170,45,110],['hands',55,280,40,40],['hands',305,280,40,40],['legs',145,310,45,130],['legs',210,310,45,130],['feet',120,440,75,40],['feet',205,440,75,40],['eyes',160,73,80,25],['nose',185,99,30,24],['mouth',170,125,60,22],['ears',126,75,24,50],['ears',250,75,24,50]];
    return `<svg class="body-drawing" viewBox="0 0 400 510" role="group" aria-label="Corps humain : glissez les étiquettes sur les parties du dessin"><defs><linearGradient id="body-skin" x2="1" y2="1"><stop stop-color="#ffdfba"/><stop offset="1" stop-color="#d49575"/></linearGradient></defs><ellipse cx="200" cy="485" rx="96" ry="14" fill="#465e7b22"/><path d="M160 289L149 446H184L198 315 213 446H248L238 289Z" fill="#668ab6" stroke="#3c608d" stroke-width="3"/><path d="M125 170L78 288 100 303 153 200M275 170L322 288 300 303 247 200" fill="url(#body-skin)" stroke="#b7856d" stroke-width="3"/><ellipse cx="76" cy="304" rx="19" ry="21" fill="url(#body-skin)"/><ellipse cx="324" cy="304" rx="19" ry="21" fill="url(#body-skin)"/><path d="M153 155Q200 135 247 155L276 171 251 220 239 305H161L149 220 124 171Z" fill="#68b8ad" stroke="#438981" stroke-width="3"/><rect x="184" y="135" width="32" height="30" rx="10" fill="url(#body-skin)"/><ellipse cx="139" cy="101" rx="14" ry="22" fill="url(#body-skin)"/><ellipse cx="261" cy="101" rx="14" ry="22" fill="url(#body-skin)"/><ellipse cx="200" cy="93" rx="56" ry="62" fill="url(#body-skin)" stroke="#b7856d" stroke-width="2"/><path d="M145 78Q141 20 200 25Q259 20 256 75Q231 63 217 47Q189 73 145 78" fill="#715846"/><ellipse cx="178" cy="85" rx="10" ry="8" fill="white"/><ellipse cx="222" cy="85" rx="10" ry="8" fill="white"/><circle cx="178" cy="85" r="4" fill="#31445a"/><circle cx="222" cy="85" r="4" fill="#31445a"/><path d="M200 97L194 116H205M183 133Q200 143 218 131" fill="none" stroke="#ab705a" stroke-width="3"/><path d="M149 443L129 458Q120 475 156 475H184V443M213 443H248L271 458Q280 475 244 475H213Z" fill="#547d9e"/>${zones.map(([id,x,y,w,h])=>`<rect class="body-hit" data-zone="${id}" x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="transparent" tabindex="0" role="button" aria-label="Emplacement du corps : ${esc(id)}"/>`).join('')}</svg>`;
  }
  function objectImage(o){
    const shapes={
      bed:'<path d="M8 29H70V52H8Z" fill="#81a9c4"/><path d="M10 20H22V44H10Z" fill="#5a799d"/><path d="M22 30H68V43H22Z" fill="#b6d7d2"/><path d="M12 49V60M66 49V60" stroke="#476480" stroke-width="5"/>',
      sofa:'<rect x="11" y="18" width="58" height="33" rx="9" fill="#9ab9a1"/><rect x="7" y="34" width="66" height="23" rx="7" fill="#6b9e8d"/><path d="M22 23V44M41 23V44M60 23V44" stroke="#d3e6d4" stroke-width="3"/><path d="M18 56V61M62 56V61" stroke="#476480" stroke-width="4"/>',
      fridge:'<path d="M23 5H62V61H23Z" fill="#c2d8e5" stroke="#6b93af"/><path d="M23 26H62" stroke="#6b93af"/><path d="M30 12V20M30 34V48" stroke="#476480" stroke-width="4"/><path d="M62 5L69 11V59L62 61" fill="#90adc5"/>',
      shower:'<path d="M27 57V20Q27 6 47 10" fill="none" stroke="#7596ae" stroke-width="6"/><path d="M40 14Q50 4 61 14Z" fill="#789fb4"/><path d="M43 22L39 48M51 22V51M59 22L63 48" stroke="#82b9d7" stroke-width="3" stroke-dasharray="4 3"/><ellipse cx="45" cy="60" rx="30" ry="5" fill="#bad9e6"/>',
      table:'<path d="M11 28L25 16H70L60 29Z" fill="#e1b68e"/><path d="M11 28H60V35H11Z" fill="#c79368"/><path d="M16 34V59M55 34V59M66 24V49" stroke="#916e56" stroke-width="5"/>',
      lamp:'<path d="M39 27V56" stroke="#567a98" stroke-width="4"/><ellipse cx="39" cy="58" rx="18" ry="4" fill="#7394af"/><path d="M25 7H53L62 30H16Z" fill="#eed096"/><ellipse cx="39" cy="30" rx="23" ry="4" fill="#dab370"/>',
      stove:'<path d="M16 17H67V59H16Z" fill="#aec6d7"/><path d="M16 17L23 10H73L67 17Z" fill="#d3e2e9"/><rect x="23" y="31" width="36" height="20" rx="3" fill="#45647d"/><path d="M25 14H34M48 14H57" stroke="#45647d" stroke-width="4"/><circle cx="25" cy="24" r="2" fill="#45647d"/><circle cx="39" cy="24" r="2" fill="#45647d"/>',
      basin:'<path d="M14 30H69L60 49H25Z" fill="#c5e1e9" stroke="#7ea9ba"/><path d="M28 49V61H57V49" fill="#a9c5d8"/><path d="M41 28V16Q41 7 50 12V17" fill="none" stroke="#648fa8" stroke-width="5"/>'
    };
    return shapes[o.id]?`<svg viewBox="0 0 80 68" aria-hidden="true">${shapes[o.id]}</svg>`:o.icon;
  }
  async function mount(game,options){
    stop();let alive=true,audio=null,frame=0,ghost=null;
    const root=document.getElementById('game-area');
    stop=()=>{alive=false;audio?.pause();cancelAnimationFrame(frame);ghost?.remove();};
    root.innerHTML='<p>Préparation du jeu…</p>';
    const data=await fetch('/adventure-vocabulary.json').then(r=>{if(!r.ok)throw Error('Vocabulaire indisponible.');return r.json();});
    if(!alive||!options.isActive())return;
    const bank=data[options.language]||data.en;const reverseAt=i=>WordSipDirection.reverse(options.direction||'to-language',i);
    if(game==='kart'){kart();root.closest('#game-panel').scrollIntoView({block:'start',behavior:'instant'});return;}
    if(game==='parking'){parking();root.closest('#game-panel').scrollIntoView({block:'start',behavior:'instant'});return;}
    placement();root.closest('#game-panel').scrollIntoView({block:'start',behavior:'instant'});
    function parking(){
      const french=[['J’ai','une','voiture'],['J’ai','dix-huit','ans'],['Mon','nom','est','Alex'],['J’habite','à','Paris'],['J’aime','cette','voiture','rouge']];const rounds=bank.parking.map((q,i)=>reverseAt(i)?{prompt:q.words.join(['ja','zh'].includes(options.language)?'':' '),words:options.language==='zh'&&i===1?['Cette','année,','j’ai','dix-huit','ans']:french[i],extras:['train','demain'],note:'Reconstituez la traduction française complète.'}:q);let index=0,selected=[],passed=false,tiles=[];
      document.getElementById('game-instructions').textContent='Faites sortir les bus dans le bon ordre pour construire la phrase demandée. Un bus choisi ajoute son mot à votre phrase.';
      function prepare(){
        const question=rounds[index];selected=[];passed=false;tiles=shuffle([...question.words,...(options.level==='niveau1'?[]:question.extras)]);
        root.innerHTML=`<div class="parking-request"><span>Phrase ${index+1} / ${rounds.length}</span><h3>${esc(question.prompt)}</h3><p>${question.words.length} mots ou blocs · ${esc(question.note)}</p></div><div class="parking-lot"><div class="parking-exit" aria-hidden="true">SORTIE ↑</div><div class="parked-buses">${tiles.map((word,i)=>`<button class="word-bus bus-tone-${i%4}" type="button" data-bus="${i}" aria-label="Faire sortir le bus ${esc(word)}"><span class="bus-windows" aria-hidden="true">▱ ▱ ▱</span><strong>${esc(word)}</strong><span class="bus-wheels" aria-hidden="true"></span></button>`).join('')}</div></div><div class="sentence-slots" role="group" aria-label="Votre phrase"></div><div class="ball-controls"><button id="parking-check" type="button" disabled>Vérifier la phrase</button><button id="parking-reset" type="button">Rentrer tous les bus</button><button id="parking-next" type="button" hidden>Phrase suivante</button></div><p class="adventure-access">Cliquez sur un bus pour le faire sortir. Cliquez sur un mot de votre phrase pour annuler ce choix et remettre son bus au parking.</p>`;
        root.querySelectorAll('[data-bus]').forEach(button=>button.onclick=()=>{if(passed||button.disabled)return;button.disabled=true;button.classList.add('departed');selected.push(Number(button.dataset.bus));drawSentence();});
        root.querySelector('#parking-reset').onclick=()=>{if(!passed)prepare();};
        root.querySelector('#parking-check').onclick=()=>{
          if(passed)return;const answer=selected.map(i=>tiles[i]);
          const norm=x=>x.normalize('NFC').trim().toLocaleLowerCase();
          const correct=answer.length===question.words.length&&answer.every((w,i)=>norm(w)===norm(question.words[i]));options.onAnswer(correct);
          if(correct){passed=true;root.querySelector('#parking-check').disabled=true;root.querySelector('#parking-reset').disabled=true;root.querySelector('#parking-next').hidden=false;options.feedback('Phrase correcte ! +10. '+question.words.join(['ja','zh'].includes(options.language)?'':' ')+' — '+question.prompt);}
          else options.feedback('−5 points. Vérifiez l’ordre des mots. Vous pouvez annuler des mots ou rentrer tous les bus. Réponse : '+question.words.join(['ja','zh'].includes(options.language)?'':' ')+'.',false);
        };
        root.querySelector('#parking-next').onclick=()=>{if(++index>=rounds.length){root.innerHTML='<div class="game-result"><strong>Parking libéré !</strong><p>Cinq phrases ont été reconstruites. Recommencez dans cette langue ou choisissez une autre langue.</p></div>';}else{options.feedback('');prepare();}};
        drawSentence();
      }
      function drawSentence(){
        const area=root.querySelector('.sentence-slots');area.innerHTML=selected.map((id,i)=>`<button type="button" data-undo="${i}" aria-label="Annuler le mot ${esc(tiles[id])}">${esc(tiles[id])} <small>×</small></button>`).join('')||'<span>Votre phrase se construit ici…</span>';
        area.querySelectorAll('[data-undo]').forEach(button=>button.onclick=()=>{if(passed)return;const [id]=selected.splice(Number(button.dataset.undo),1),bus=root.querySelector(`[data-bus="${id}"]`);bus.disabled=false;bus.classList.remove('departed');drawSentence();});
        root.querySelector('#parking-check').disabled=selected.length!==rounds[index].words.length;
      }
      prepare();
    }
    function placement(){
      const objects=shuffle(bank[game==='house'?'house':'body']).slice(0,options.level==='niveau1'?6:10).map((o,i)=>({...o,label:reverseAt(i)?o.translation:o.word}));let selected=null,done=0,dragging=null;const suppressed=new Set();
      document.getElementById('game-instructions').textContent=game==='house'?'Glissez les objets dans les pièces où ils peuvent se trouver. Certains objets ont plusieurs emplacements valides.':'Glissez chaque étiquette sur la partie du corps correspondante.';
      const rooms=bank.rooms.map(room=>`<button class="house-room room-${room.id}" data-zone="${room.id}" type="button"><span class="room-wall"></span><strong>${esc(room.word)}</strong><div class="room-objects"></div></button>`).join('');
      root.innerHTML=`<div class="game-steps"><span>1 · Saisissez un objet</span><span>2 · Glissez vers son emplacement</span><span>3 · Relâchez</span></div><div class="placement-workbench ${game}"><div class="placement-board ${game}">${game==='house'?'<div class="house-plan">'+rooms+'</div>':bodyScene()}</div><div class="object-tray">${objects.map((o,i)=>`<button type="button" class="object-token" data-object="${i}" aria-label="Déplacer ${esc(o.label)}"><span aria-hidden="true">${objectImage(o)}</span><strong>${esc(o.label)}</strong></button>`).join('')}</div></div><p class="placement-progress" role="status">0 / ${objects.length} placés</p><details class="adventure-help"><summary>Afficher le vocabulaire français pour réviser</summary><p>${(game==='house'?[...bank.rooms,...objects]:objects).map(o=>esc(o.word)+' — '+esc(o.translation)).join(' · ')}</p></details><p class="adventure-access">Souris ou doigt : glissez un objet. Au clavier : sélectionnez une étiquette, puis activez son emplacement avec Entrée.</p>`;
      const tokens=[...root.querySelectorAll('[data-object]')];
      function drop(token,zone){
        if(!zone||token.disabled)return;const o=objects[Number(token.dataset.object)];const correct=o.zones.includes(zone.dataset.zone);options.onAnswer(correct);
        if(correct){token.disabled=true;token.classList.remove('selected');selected=null;done++;zone.classList.add('zone-success');
          if(game==='body'){const locations={head:[200,19],eyes:[312,60],ears:[312,94],nose:[312,128],mouth:[312,155],torso:[60,140],arms:[40,216],hands:[337,343],legs:[294,392],feet:[200,500]};const [lx,ly]=locations[o.id];const ns='http://www.w3.org/2000/svg',g=document.createElementNS(ns,'g'),line=document.createElementNS(ns,'line'),label=document.createElementNS(ns,'text');g.setAttribute('class','body-label');for(const[k,v]of Object.entries({x1:Number(zone.getAttribute('x'))+Number(zone.getAttribute('width'))/2,y1:Number(zone.getAttribute('y'))+Number(zone.getAttribute('height'))/2,x2:lx,y2:ly}))line.setAttribute(k,v);label.setAttribute('x',lx);label.setAttribute('y',ly);label.setAttribute('text-anchor','middle');label.textContent=o.word;g.append(line,label);root.querySelector('svg').append(g);}
          if(game==='house'){const badge=document.createElement('span');badge.className='placed-object';badge.textContent=o.icon+' '+o.word;zone.querySelector('.room-objects').append(badge);}
          root.querySelector('.placement-progress').textContent=done+' / '+objects.length+' placés';options.feedback('Bien placé ! '+o.word+' — '+o.translation+' · +10.');
          if(done===objects.length)options.feedback('Tous les éléments sont placés ! Changez de langue ou recommencez pour réviser.');
        }else options.feedback('Cet emplacement ne convient pas. −5. Reprenez l’objet et essayez ailleurs.',false);
      }
      for(const token of tokens){
        token.onclick=()=>{if(suppressed.has(token)){suppressed.delete(token);return;}if(token.disabled)return;tokens.forEach(t=>t.classList.remove('selected'));selected=token;token.classList.add('selected');options.feedback('Étiquette sélectionnée : choisissez son emplacement.');};
        token.onpointerdown=e=>{if(token.disabled||e.button>0)return;e.preventDefault();dragging={token,x:e.clientX,y:e.clientY,moved:false};token.setPointerCapture(e.pointerId);};
        token.onpointermove=e=>{if(!dragging||dragging.token!==token)return;if(!dragging.moved&&Math.hypot(e.clientX-dragging.x,e.clientY-dragging.y)<6)return;dragging.moved=true;
          if(!ghost){ghost=token.cloneNode(true);ghost.removeAttribute('data-object');ghost.className='object-ghost';ghost.setAttribute('aria-hidden','true');document.body.append(ghost);root.classList.add('placing');}
          if(e.clientY<65)window.scrollBy(0,-12);else if(e.clientY>innerHeight-65)window.scrollBy(0,12);
          ghost.style.left=e.clientX+'px';ghost.style.top=e.clientY+'px';};
        token.onpointerup=e=>{if(!dragging)return;const moved=dragging.moved;dragging=null;if(token.hasPointerCapture(e.pointerId))token.releasePointerCapture(e.pointerId);ghost?.remove();ghost=null;root.classList.remove('placing');if(moved){suppressed.add(token);const zone=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-zone]');if(zone&&root.contains(zone))drop(token,zone);}};
        token.onpointercancel=e=>{dragging=null;ghost?.remove();ghost=null;root.classList.remove('placing');if(token.hasPointerCapture(e.pointerId))token.releasePointerCapture(e.pointerId);};
      }
      root.querySelectorAll('[data-zone]').forEach(zone=>{zone.onclick=()=>{if(selected)drop(selected,zone);};zone.onkeydown=e=>{if((e.key==='Enter'||e.key===' ')&&selected){e.preventDefault();drop(selected,zone);}};});
    }
    function kart(){
      const vocabulary=options.vocabulary?.length>=3?options.vocabulary.map(v=>({word:(v.term||v.word).split(' / ')[0],translation:v.translation})):bank.house;
      const words=[...new Map(vocabulary.map(w=>[w.word,w])).values()];let round=0,lane=1,progress=0,moving=false,last=0,choice=[],answer=null,heard=false,finished=false;
      document.getElementById('game-instructions').textContent='Écoutez le mot, puis conduisez le kart sur la voie qui porte ce mot. Les flèches ou les trois boutons changent de voie.';
      root.innerHTML='<div class="kart-hud"><strong id="kart-round">Étape 1 / 8</strong><span id="kart-status" role="status">Écoutez avant de conduire.</span></div><svg id="kart-road" viewBox="0 0 720 430" tabindex="0" role="group" aria-label="Route du kart, flèches gauche et droite pour changer de voie"><defs><linearGradient id="kart-sky" x2="0" y2="1"><stop stop-color="#b9dff4"/><stop offset="1" stop-color="#eff5ed"/></linearGradient></defs><rect width="720" height="430" rx="18" fill="url(#kart-sky)"/><circle cx="590" cy="65" r="27" fill="#ffdd87"/><path d="M0 130L90 52 190 130 310 66 440 130 566 61 720 130V430H0Z" fill="#a5c8b3"/><path d="M0 170H720V430H0Z" fill="#70a18c"/><path d="M305 120H415L650 430H70Z" fill="#496375"/><path d="M305 120L70 430M415 120L650 430" stroke="#f2d9b2" stroke-width="8"/><path d="M340 120L263 430M380 120L457 430" stroke="#ecf0d8" stroke-width="4" stroke-dasharray="18 15"/><g id="kart-signs"></g><g id="kart-car"><ellipse cx="0" cy="17" rx="32" ry="8" fill="#1c2d4244"/><rect x="-28" y="-18" width="12" height="38" rx="5" fill="#26394b"/><rect x="16" y="-18" width="12" height="38" rx="5" fill="#26394b"/><path d="M-22 20L-18-26Q0-41 18-26L22 20Z" fill="#db695d" stroke="#8d443f" stroke-width="2"/><path d="M-12-14Q0-24 12-14L14 2H-14Z" fill="#a9d9e9"/><rect x="-19" y="10" width="38" height="8" rx="3" fill="#ffcc7f"/></g></svg><div class="kart-controls"><button id="kart-left" type="button">← Gauche</button><button id="kart-center" type="button">Centre</button><button id="kart-right" type="button">Droite →</button></div><div class="ball-controls"><button id="kart-sound" type="button">🔊 Écouter et démarrer</button><button id="kart-next" type="button" hidden>Prochain mot</button></div>';
      const road=root.querySelector('#kart-road'),car=root.querySelector('#kart-car'),status=root.querySelector('#kart-status'),sound=root.querySelector('#kart-sound'),next=root.querySelector('#kart-next');
      function draw(){
        car.setAttribute('transform',`translate(${360+(lane-1)*164},365)`);
        const y=140+progress*240,spread=65+progress*170,scale=.55+progress*.55;
        root.querySelector('#kart-signs').innerHTML=choice.map((w,i)=>`<g transform="translate(${360+(i-1)*spread},${y}) scale(${scale})"><rect x="-73" y="-35" width="146" height="65" rx="14" fill="${['#eed6ac','#c4e4d3','#d5c8ee'][i]}" stroke="#496375" stroke-width="2"/><text x="0" y="0" text-anchor="middle" dominant-baseline="middle" fill="#263b56" font-size="16" font-weight="700" ${(reverseAt(round)?w.translation:w.word).length>15?'textLength="125"':''} lengthAdjust="spacingAndGlyphs">${esc(reverseAt(round)?w.translation:w.word)}</text></g>`).join('');
      }
      function prepare(){
        moving=false;heard=false;progress=0;answer=words[round%words.length];choice=shuffle([answer,...shuffle(words.filter(w=>w.word!==answer.word)).slice(0,2)]);finished=false;
        root.querySelector('#kart-round').textContent='Étape '+(round+1)+' / 8';status.textContent=reverseAt(round)?'Écoutez dans la langue apprise ; trouvez le sens français.':'Écoutez en français ; trouvez le mot dans la langue apprise.';sound.disabled=false;sound.textContent='🔊 Écouter et démarrer';next.hidden=true;draw();
      }
      function play(){
        if(finished)return;audio?.pause();audio=new Audio('/api/tts?text='+encodeURIComponent(reverseAt(round)?answer.word:answer.translation)+'&lang='+(reverseAt(round)?options.language:'fr'));
        audio.onplaying=()=>{if(!alive||!options.isActive()){audio.pause();return;}heard=true;moving=true;last=performance.now();status.textContent='À vous : choisissez la bonne voie.';sound.textContent='🔊 Réécouter';road.focus();};
        const failed=()=>{if(!alive)return;moving=false;status.textContent='Son indisponible. Réessayez : aucun point perdu.';sound.disabled=false;};audio.onerror=failed;audio.play().catch(failed);
      }
      function tick(time){
        if(!alive||!options.isActive())return;
        const dt=Math.min(.05,(time-last)/1000||0);last=time;
        if(moving&&heard){progress+=dt/(options.level==='niveau1'?10:options.level==='niveau2'?8:6);if(progress>=.9){moving=false;finished=true;const correct=choice[lane].word===answer.word;options.onAnswer(correct);options.feedback((correct?'Bonne voie ! +10. ':'Mauvaise voie : −5. ')+answer.word+' — '+answer.translation,correct);status.textContent=correct?'Mot retrouvé !':'Regardez la correction puis poursuivez.';sound.disabled=true;next.hidden=false;}}
        draw();frame=requestAnimationFrame(tick);
      }
      for(const[id,value]of [['kart-left',0],['kart-center',1],['kart-right',2]])root.querySelector('#'+id).onclick=()=>{lane=value;draw();};
      road.onkeydown=e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();lane=Math.max(0,Math.min(2,lane+(e.key==='ArrowLeft'?-1:1)));draw();}};
      sound.onclick=play;next.onclick=()=>{if(++round>=8){moving=false;finished=true;cancelAnimationFrame(frame);root.innerHTML='<div class="game-result"><strong>Parcours terminé !</strong><p>Huit mots ont été écoutés. Recommencez ou choisissez un autre thème.</p></div>';alive=false;audio?.pause();}else prepare();};
      prepare();frame=requestAnimationFrame(tick);
      document.addEventListener('visibilitychange',visibility);
      function visibility(){if(document.hidden&&alive){moving=false;audio?.pause();status.textContent='Jeu en pause : cliquez sur Réécouter pour reprendre.';}}
      const clean=stop;stop=()=>{document.removeEventListener('visibilitychange',visibility);clean();};
    }
  }
  window.WordSipAdventures={mount,dispose:()=>stop()};
})();
