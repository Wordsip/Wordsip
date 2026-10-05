(() => {
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const colors=['#edb94c','#5eb5a1','#a491d0','#63abd1','#ea8d77','#93b95e','#d894b4'];
  let dispose=()=>{};
  function mount(root,options){
    dispose();let alive=true,frame=0,index=0,tiles=[],selected=[],passed=false,busy=false,board=null,drag=null;
    const french=[['J’ai','une','voiture'],['J’ai','dix-huit','ans'],['Mon','nom','est','Alex'],['J’habite','à','Paris'],['Cette','voiture','est','super']];
    const reversed=i=>WordSipDirection.reverse(options.direction||'mixed',i);
    const rounds=options.bank.parking.map((q,i)=>reversed(i)?{prompt:q.words.join(['ja','zh'].includes(options.language)?'':' '),words:options.language==='zh'&&i===1?['Cette','année,','j’ai','dix-huit','ans']:french[i],extras:['train','demain'],note:'Construisez sa traduction française.'+(q.register?' '+q.note:'')}:q);
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    const observer=new ResizeObserver(()=>{const host=root.querySelector('.parking-drive-board');if(alive&&!busy&&!drag&&host&&board&&(host.clientWidth<520)!==(board.width<500))drawLot();});
    dispose=()=>{alive=false;cancelAnimationFrame(frame);observer.disconnect();};
    document.getElementById('game-instructions').textContent='Glissez un bus vers l’avant (↑) pour le faire sortir. Il roule jusqu’à la sortie, puis son mot rejoint votre phrase. Faites sortir les mots dans le bon ordre.';
    function busMarkup(word,i){
      const c=colors[i%colors.length],size=board.width<500?16:20;
      return `<g class="moving-bus" data-bus="${i}" role="button" tabindex="0" aria-label="Faire sortir le bus ${esc(word)}" aria-disabled="${selected.includes(i)}"><rect class="bus-hit" x="-63" y="-51" width="126" height="102" rx="12" fill="transparent" pointer-events="all"/><g class="bus-vehicle"><ellipse cx="0" cy="9" rx="49" ry="25" fill="#17354255"/><rect x="-35" y="-27" width="18" height="9" rx="4" fill="#203747"/><rect x="18" y="-27" width="18" height="9" rx="4" fill="#203747"/><rect x="-35" y="18" width="18" height="9" rx="4" fill="#203747"/><rect x="18" y="18" width="18" height="9" rx="4" fill="#203747"/><rect x="-47" y="-21" width="94" height="42" rx="12" fill="${c}" stroke="#365363" stroke-width="2"/><rect x="-35" y="-15" width="56" height="30" rx="5" fill="#ffffff22"/><path d="M27-16H38Q43 0 38 16H27Z" fill="#284e67"/><path d="M-38-15V15M-23-15V15M-8-15V15M7-15V15" stroke="#c7e7ed" stroke-width="4"/><rect x="39" y="-18" width="5" height="7" rx="2" fill="#fff3ba"/><rect x="39" y="11" width="5" height="7" rx="2" fill="#fff3ba"/><path class="bus-exhaust" d="M-52-6L-66-6M-52 6L-73 6" stroke="#d9f1df" stroke-width="3" stroke-linecap="round"/></g><g class="bus-word"><rect x="${board.width<500?-63:-88}" y="-13" width="${board.width<500?126:176}" height="27" rx="9" fill="#fff9eb" stroke="#c8b78e"/><text x="0" y="1" font-size="${size}" text-anchor="middle" dominant-baseline="middle" fill="#294655" font-weight="700" ${word.length>13?'textLength="'+(board.width<500?115:162)+'" lengthAdjust="spacingAndGlyphs"':''}>${esc(word)}</text></g></g>`;
    }
    function prepare(){
      selected=[];passed=false;busy=false;drag=null;tiles=WordSipLearningGames.shuffle([...rounds[index].words,...(options.level==='niveau1'?[]:rounds[index].extras)]);
      const q=rounds[index];root.innerHTML=`<div class="parking-request"><span>Phrase ${index+1} / ${rounds.length} · ${reversed(index)?'Vers le français':'Vers la langue apprise'}</span><h3>${esc(q.prompt)}</h3><p>${q.words.length} mots ou blocs · ${esc(q.note)}</p></div><p id="parking-motion-status" role="status">Choisissez le premier mot et faites avancer son bus.</p><div class="parking-drive-board"></div><div class="sentence-slots" role="group" aria-label="Votre phrase"></div><div class="ball-controls"><button id="parking-check" type="button" disabled>Vérifier la phrase</button><button id="parking-reset" type="button">Rentrer tous les bus</button><button id="parking-next" type="button" hidden>Phrase suivante</button></div><p class="adventure-access">Souris ou doigt : glissez vers le haut. Un clic fait aussi sortir le bus. Au clavier : Entrée ou flèche ↑. Cliquez sur un mot de la phrase pour voir son bus revenir à sa place.</p>`;
      drawLot();drawSentence();observer.disconnect();observer.observe(root.querySelector('.parking-drive-board'));
      root.querySelector('#parking-reset').onclick=()=>{if(!busy&&!passed)prepare();};
      root.querySelector('#parking-check').onclick=()=>{
        if(!WordSipParkingMotion.canValidate(selected,rounds[index].words.length,busy,passed))return;
        const norm=w=>w.normalize('NFC').trim().toLocaleLowerCase(),answer=selected.map(i=>tiles[i]),q=rounds[index];
        const correct=answer.every((w,i)=>norm(w)===norm(q.words[i]));options.onAnswer(correct);
        if(correct){passed=true;root.querySelector('#parking-next').hidden=false;options.feedback('Phrase correcte ! +10. '+q.words.join(reversed(index)||!['ja','zh'].includes(options.language)?'':' ')+' — '+q.prompt);}
        else options.feedback('−5. Vérifiez l’ordre des mots. Vous pouvez faire revenir un bus et réessayer. Réponse : '+q.words.join(reversed(index)||!['ja','zh'].includes(options.language)?'':' ')+'.',false);
        controls();
      };
      root.querySelector('#parking-next').onclick=()=>{if(busy)return;if(++index===rounds.length){observer.disconnect();root.innerHTML='<div class="game-result"><strong>Parking libéré !</strong><p>Vous avez reconstruit les cinq phrases. Recommencez ou essayez une autre langue.</p></div>';}else{options.feedback('');prepare();}};
    }
    function drawLot(){
      const host=root.querySelector('.parking-drive-board');if(!host)return;
      board=WordSipParkingMotion.layout(tiles.length,host.clientWidth<520);
      const rows=Math.ceil(tiles.length/2),laneWidth=board.width<500?48:65;
      host.innerHTML=`<svg class="parking-motion-scene" viewBox="0 0 ${board.width} ${board.height}" role="group" aria-label="Parking : avancez les bus vers la sortie"><defs><linearGradient id="parking-ground" x2="1" y2="1"><stop stop-color="#dcece1"/><stop offset="1" stop-color="#b8d6c8"/></linearGradient></defs><rect width="${board.width}" height="${board.height}" rx="24" fill="url(#parking-ground)"/><rect x="${board.lane-laneWidth/2}" y="0" width="${laneWidth}" height="${board.height}" fill="#596e7b"/>${Array.from({length:rows},(_,i)=>`<path d="M20 ${60+i*130}H${board.lane}" stroke="#596e7b" stroke-width="43"/><path d="M30 ${60+i*130}H${board.lane-35}" stroke="#e6e9d1" stroke-width="2" stroke-dasharray="14 12"/>`).join('')}<path d="M${board.lane} 25V${board.height-20}" stroke="#e8efd5" stroke-width="2" stroke-dasharray="15 15"/><rect x="${board.lane-36}" y="6" width="72" height="27" rx="7" fill="#f4d796"/><text x="${board.lane}" y="24" text-anchor="middle" font-size="14" font-weight="700" fill="#425f68">SORTIE ↑</text>${board.homes.map(h=>`<path d="M${h.x-50} ${h.y-39}V${h.y+46}H${h.x+50}V${h.y-39}" fill="none" stroke="#fcf5d8" stroke-width="3"/><text x="${h.x}" y="${h.y+69}" text-anchor="middle" font-size="16" fill="#4a7866">↑</text>`).join('')}<g class="moving-buses">${tiles.map(busMarkup).join('')}</g></svg>`;
      root.querySelectorAll('[data-bus]').forEach(bus=>{
        const id=Number(bus.dataset.bus);place(bus,0,id);if(selected.includes(id)){bus.setAttribute('visibility','hidden');bus.setAttribute('tabindex','-1');}
        bus.onclick=()=>depart(id);
        bus.onkeydown=e=>{if(['Enter',' ','ArrowUp'].includes(e.key)){e.preventDefault();depart(id);}};
        bus.onpointerdown=e=>{if(busy||passed||selected.includes(id)||e.button>0)return;e.preventDefault();drag={id,pointer:e.pointerId,y:e.clientY,moved:false};bus.setPointerCapture(e.pointerId);bus.classList.add('dragging');};
        bus.onpointermove=e=>{if(!drag||drag.id!==id)return;const delta=e.clientY-drag.y;drag.moved=Math.abs(delta)>5;const rect=host.getBoundingClientRect(),dy=Math.max(-28,Math.min(18,delta*board.height/rect.height));const home=board.homes[id];place(bus,0,id,dy);};
        bus.onpointerup=e=>{if(!drag||drag.id!==id)return;const d=drag;drag=null;if(bus.hasPointerCapture(e.pointerId))bus.releasePointerCapture(e.pointerId);bus.classList.remove('dragging');place(bus,0,id);if(e.clientY-d.y<-14)depart(id);else if(d.moved){bus.dataset.suppressClick='yes';options.feedback('Faites glisser le bus vers l’avant : ↑. Aucun point retiré.');}};
        bus.onpointercancel=e=>{drag=null;if(bus.hasPointerCapture(e.pointerId))bus.releasePointerCapture(e.pointerId);bus.classList.remove('dragging');place(bus,0,id);};
      });
    }
    function place(bus,t,id,dy=0){const p=WordSipParkingMotion.pose(t,board.homes[id],board);bus.setAttribute('transform',`translate(${p.x},${p.y+dy})`);bus.querySelector('.bus-vehicle').setAttribute('transform',`rotate(${p.angle})`);}
    function controls(){
      root.querySelector('#parking-check').disabled=!WordSipParkingMotion.canValidate(selected,rounds[index].words.length,busy,passed);
      root.querySelector('#parking-reset').disabled=busy||passed;
      root.querySelectorAll('[data-bus]').forEach(b=>b.setAttribute('aria-disabled',String(busy||passed||selected.includes(Number(b.dataset.bus)))));
      root.querySelectorAll('[data-undo]').forEach(b=>b.disabled=busy||passed);
    }
    function animate(id,returning,complete){
      const bus=root.querySelector(`[data-bus="${id}"]`);busy=true;controls();bus.removeAttribute('visibility');bus.classList.add('driving');
      const status=root.querySelector('#parking-motion-status');status.textContent=returning?'Le bus « '+tiles[id]+' » revient à sa place…':'Le bus « '+tiles[id]+' » rejoint la sortie…';
      let elapsed=0,last=null;const duration=reduced?1:1900;
      const step=now=>{if(!alive||!options.isActive())return;if(last!==null)elapsed+=Math.min(40,Math.max(0,now-last));last=now;const progress=Math.min(1,elapsed/duration);place(bus,returning?1-progress:progress,id);
        if(progress<1){frame=requestAnimationFrame(step);return;}
        frame=0;bus.classList.remove('driving');busy=false;complete();controls();status.textContent=returning?'Le bus est revenu. Vous pouvez changer l’ordre des mots.':'Bus sorti : le mot a rejoint votre phrase.';
      };frame=requestAnimationFrame(step);
    }
    function depart(id){
      const bus=root.querySelector(`[data-bus="${id}"]`);if(bus?.dataset.suppressClick){delete bus.dataset.suppressClick;return;}
      if(!alive||busy||passed||selected.includes(id)||selected.length>=rounds[index].words.length)return;
      animate(id,false,()=>{selected.push(id);bus.setAttribute('visibility','hidden');bus.setAttribute('tabindex','-1');drawSentence();});
    }
    function drawSentence(){
      const area=root.querySelector('.sentence-slots');area.innerHTML=selected.map((id,i)=>`<button type="button" data-undo="${i}" aria-label="Faire revenir le bus ${esc(tiles[id])}">${esc(tiles[id])} <small>↩</small></button>`).join('')||'<span>Les mots arrivent ici après la sortie de leur bus…</span>';
      area.querySelectorAll('[data-undo]').forEach(button=>button.onclick=()=>{if(busy||passed)return;const position=Number(button.dataset.undo),id=selected[position];animate(id,true,()=>{selected.splice(position,1);root.querySelector(`[data-bus="${id}"]`).setAttribute('tabindex','0');drawSentence();});});controls();
    }
    prepare();
  }
  window.WordSipParking={mount,dispose:()=>dispose()};
})();
