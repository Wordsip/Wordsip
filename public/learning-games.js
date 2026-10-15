(() => {
  const $=id=>document.getElementById(id),G=WordSipLearningGames,params=new URLSearchParams(location.search);
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let language=params.get('lang')||'en',lessons=[],active='matching',score=0,selection=null,matched=[],ballRound=0,ballPrompts=[],ballLocation=[320,365],oddRound=0,loadVersion=0,level=params.get('level')||'niveau1',profileEmail=params.get('email'),pathMode=false,pathThemes=[],roundIndex=0,audioOverride=null,pathData=null;
  let difficulty={pairs:4,oddOptions:4,positions:['inside','on','above','below']};
  const names={matching:'Mots à relier',ball:'Où va la balle ?',odd:'Le mot intrus',verbs:'L’atelier des verbes',images:'Images et mots',listening:'Écouter et écrire',parking:'Parking des phrases'};
  let gameGeneration=0,activeAudio=null;
  let lives=3,maxLives=3,streak=0,bestStreak=0,answers=0,correctAnswers=0,matchRound=0,parkLevel=0,parkSet=null;
  function links(){const q=new URLSearchParams(location.search);q.set('lang',language);q.delete('lesson');const suffix='?'+q.toString();$('games-back').href='/grammaire'+suffix;$('games-word').href='/mot-du-jour'+suffix;$('weekly-game').href='/jeu-semaine'+suffix;return suffix;}
  const instructions={
    en:{inside:'Put the ball inside the box.',above:'Put the ball above the box.',below:'Put the ball below the box.',left:'Put the ball to the left of the box.',right:'Put the ball to the right of the box.',on:'Put the ball on the box.',next:'Put the ball next to the box.'},
    es:{inside:'Pon la pelota dentro de la caja.',above:'Pon la pelota por encima de la caja, sin tocarla.',below:'Pon la pelota debajo de la caja.',left:'Pon la pelota a la izquierda de la caja.',right:'Pon la pelota a la derecha de la caja.',on:'Pon la pelota sobre la caja, en contacto con ella.',next:'Pon la pelota al lado de la caja.'},
    it:{inside:'Metti la palla dentro la scatola.',above:'Metti la palla sopra la scatola, senza toccarla.',below:'Metti la palla sotto la scatola.',left:'Metti la palla a sinistra della scatola.',right:'Metti la palla a destra della scatola.',on:'Metti la palla sulla scatola, a contatto con essa.',next:'Metti la palla accanto alla scatola.'},
    ja:{inside:'ボールを箱の中に置いてください。',above:'ボールを箱の上のほうに、箱に触れないように置いてください。',below:'ボールを箱の下に置いてください。',left:'ボールを箱の左に置いてください。',right:'ボールを箱の右に置いてください。',on:'ボールを箱の上に、箱に触れるように置いてください。',next:'ボールを箱の隣に置いてください。'},
    zh:{inside:'请把球放在盒子里面。',above:'请把球放在盒子上方，不要碰到盒子。',below:'请把球放在盒子下面。',left:'请把球放在盒子左边。',right:'请把球放在盒子右边。',on:'请把球放在盒子上，球要碰到盒子。',next:'请把球放在盒子旁边。'}
  };
  const meanings={inside:'Place la balle dans la boîte.',above:'Place la balle au-dessus de la boîte, sans la toucher.',below:'Place la balle sous la boîte.',left:'Place la balle à gauche de la boîte.',right:'Place la balle à droite de la boîte.',on:'Place la balle sur la boîte, en contact avec elle.',next:'Place la balle juste à côté de la boîte, à gauche ou à droite.'};
  function feedback(text,correct=true){$('game-feedback').textContent=text;$('game-feedback').className=correct?'games-good':'games-bad';}
  /* ===== Effets, vies, chrono, progression, records ===== */
  const FX=typeof WordSipFX!=='undefined'?WordSipFX:null;
  const fx={
    play:(name,arg)=>{if(FX)FX.play(name,arg);},
    haptic:pattern=>{if(FX)FX.haptic(pattern);},
    float:(target,text,kind)=>{if(FX)FX.floatText(target,text,kind);},
    burst:(el,options)=>{if(FX&&el&&el.getBoundingClientRect){const r=el.getBoundingClientRect();FX.burst(r.left+r.width/2,r.top+r.height/2,options);}},
    confetti:n=>{if(FX)FX.confetti(n);},
    shake:el=>{if(FX&&el)FX.shake(el);},
    pop:el=>{if(FX&&el)FX.pop(el);},
    bump:el=>{if(FX&&el)FX.bump(el);}
  };
  const pace=()=>({niveau1:1.4,niveau2:1,niveau3:.78}[level]||1);
  const lifeMax=()=>({niveau1:5,niveau2:4,niveau3:3}[level]||4);
  function clock(seconds,onTimeout){if(FX)FX.clock($('game-clock'),$('game-clock-bar'),Math.round(seconds*pace()),onTimeout);}
  function stopClock(){if(FX)FX.stopClock($('game-clock'));}
  function progress(total,done){
    const el=$('game-progress');el.replaceChildren();
    for(let i=0;i<total;i++){const dot=document.createElement('i');dot.className=i<done?'done':i===done?'now':'';el.append(dot);}
  }
  function hud(){
    $('game-lives').textContent='❤️'.repeat(Math.max(0,lives))+'🖤'.repeat(Math.max(0,maxLives-lives));
    $('game-lives').setAttribute('aria-label',lives+' vie'+(lives>1?'s':'')+' sur '+maxLives);
    $('game-combo').hidden=streak<2;$('combo-value').textContent='x'+Math.min(streak,9);
  }
  function readBest(game,lang){try{return Number(localStorage.getItem('wordsip-best-'+(game||active)+'-'+(lang||language)))||0;}catch{return 0;}}
  function saveBest(){
    if(score<=readBest())return false;
    try{localStorage.setItem('wordsip-best-'+active+'-'+language,String(score));}catch{return false;}
    return true;
  }
  function paintBest(){
    document.querySelectorAll('[data-best]').forEach(badge=>{
      const game=badge.dataset.best,value=game==='weekly'?readBest('weekly','all'):readBest(game);
      badge.textContent=value>0?'🏅 '+value:'';
    });
  }
  function endSoon(forced){
    const generation=gameGeneration;stopClock();
    setTimeout(()=>{if(generation===gameGeneration)result(forced||true);},900);
  }

  function goHome(){
    gameGeneration++;stopClock();if(activeAudio){activeAudio.pause();activeAudio=null;}
    document.body.classList.remove('playing');$('game-panel').hidden=true;
    document.querySelectorAll('[data-game]').forEach(b=>b.setAttribute('aria-pressed','false'));
    window.scrollTo({top:0,behavior:FX&&FX.reduce?'auto':'smooth'});
  }

  /* ===== Parking des mots : puzzle de voitures à faire glisser ===== */
  const PARK_COLORS=[['#ff6b6b','#c0392b'],['#ffa94d','#d9480f'],['#ffd43b','#e8a100'],['#69db7c','#2b8a3e'],['#38d9a9','#0b7285'],['#4dabf7','#1864ab'],['#9775fa','#5f3dc4'],['#f783ac','#a61e4d'],['#adb5bd','#495057'],['#ced4da','#6c757d']];
  function parkCarSvg(c){
    const W=c.len*100,w=c.h?W:100,h=c.h?100:W,angle=c.h?(c.face>0?0:180):(c.face>0?90:-90),[c1,c2]=c.color,g='pg'+c.id;
    return `<svg class="park-svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="${g}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs><g transform="translate(${w/2} ${h/2}) rotate(${angle}) translate(${-W/2} -50)"><rect x="8" y="16" width="${W-14}" height="78" rx="26" fill="#0003"/><rect x="26" y="3" width="34" height="17" rx="6" fill="#1b1f2a"/><rect x="${W-62}" y="3" width="34" height="17" rx="6" fill="#1b1f2a"/><rect x="26" y="80" width="34" height="17" rx="6" fill="#1b1f2a"/><rect x="${W-62}" y="80" width="34" height="17" rx="6" fill="#1b1f2a"/><rect x="6" y="10" width="${W-12}" height="80" rx="26" fill="url(#${g})" stroke="#0005" stroke-width="3"/><rect x="${W*.27}" y="22" width="${W*.44}" height="56" rx="16" fill="#ffffff30"/><path d="M${W*.64} 27L${W*.73} 36L${W*.73} 64L${W*.64} 73Z" fill="#1e3a5f" opacity=".92"/><path d="M${W*.3} 29L${W*.25} 37L${W*.25} 63L${W*.3} 71Z" fill="#1e3a5f" opacity=".8"/><rect x="${W-22}" y="18" width="11" height="15" rx="5" fill="#fff8b0"/><rect x="${W-22}" y="67" width="11" height="15" rx="5" fill="#fff8b0"/><rect x="11" y="18" width="8" height="15" rx="4" fill="#ff3b3b"/><rect x="11" y="67" width="8" height="15" rx="4" fill="#ff3b3b"/></g></svg>`;
  }
  function parkObstacleSvg(c){
    const W=c.len*100,w=c.h?W:100,h=c.h?100:W,angle=c.h?0:90;
    const art=c.len===1
      ?'<ellipse cx="50" cy="86" rx="38" ry="9" fill="#0004"/><path d="M50 10L80 80H20Z" fill="#ff7a1a" stroke="#b34700" stroke-width="3"/><path d="M41 38H59L63 50H37Z" fill="#fff"/><path d="M33 60H67L70 70H30Z" fill="#fff"/><rect x="14" y="78" width="72" height="12" rx="4" fill="#ff7a1a" stroke="#b34700" stroke-width="3"/>'
      :`<ellipse cx="${W/2}" cy="86" rx="${W/2-10}" ry="8" fill="#0004"/><rect x="14" y="62" width="14" height="26" rx="4" fill="#374151"/><rect x="${W-28}" y="62" width="14" height="26" rx="4" fill="#374151"/><clipPath id="bc${c.id}"><rect x="6" y="26" width="${W-12}" height="44" rx="10"/></clipPath><rect x="6" y="26" width="${W-12}" height="44" rx="10" fill="#facc15"/><g clip-path="url(#bc${c.id})">${Array.from({length:Math.ceil(W/36)+1},(_,i)=>`<path d="M${i*36-20} 70L${i*36} 26H${i*36+18}L${i*36-2} 70Z" fill="#1f2937"/>`).join('')}</g><rect x="6" y="26" width="${W-12}" height="44" rx="10" fill="none" stroke="#1f2937" stroke-width="3"/>`;
    return `<svg class="park-svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><g transform="translate(${w/2} ${h/2}) rotate(${angle}) translate(${-W/2} -50)">${art}</g></svg>`;
  }
  const parkKey=s=>String(s).normalize('NFC').toLocaleLowerCase();
  function parkTokens(text){
    if((language==='ja'||language==='zh')&&typeof Intl!=='undefined'&&Intl.Segmenter)return [...new Intl.Segmenter(language,{granularity:'word'}).segment(text)].filter(s=>s.isWordLike).map(s=>s.segment);
    return text.split(/\s+/).map(w=>w.replace(/^[\p{P}\p{S}]+|[\p{P}\p{S}]+$/gu,'')).filter(Boolean);
  }
  function parkSentences(){
    const target={niveau1:4,niveau2:5,niveau3:6}[level]||5,current=currentLesson();
    const score=s=>(current&&s.theme===current.id?0:4)+Math.abs(s.tokens.length-target)+Math.random()*2.5;
    return lessons.flatMap(l=>(l.examples||[]).map(e=>({text:e.text,translation:e.translation,reading:e.reading||'',theme:l.id,tokens:parkTokens(e.text)}))).filter(s=>s.tokens.length>=3&&s.tokens.length<=7).sort((a,b)=>score(a)-score(b));
  }
  function parkIntruders(sentence,count){
    const used=new Set(sentence.tokens.map(parkKey)),words=new Map();
    for(const l of lessons){
      for(const e of l.examples||[])for(const t of parkTokens(e.text))words.set(parkKey(t),t);
      for(const v of l.vocabulary||[])if(!/\s/.test(v.term))words.set(parkKey(v.term),v.term);
    }
    return G.shuffle([...words].filter(([k,t])=>!used.has(k)&&Array.from(t).length<=12).map(([,t])=>t)).slice(0,count);
  }
  function renderParking(){
    if(parkLevel>=3){result();return;}
    const P=WordSipParking,n=6,generation=gameGeneration;
    if(!parkSet||parkSet.length<3)parkSet=parkSentences().slice(0,3);
    const sentence=parkSet[parkLevel];
    if(!sentence){$('game-area').textContent='Aucune phrase d’exemple n’est disponible pour ce jeu.';return;}
    const baseIntruders=({niveau1:2,niveau2:3,niveau3:4}[level]||3)+(parkLevel>=2?1:0),baseObstacles=({niveau1:1,niveau2:2,niveau3:3}[level]||2);
    let first=null,intruderCount=baseIntruders,obstacleCount=baseObstacles,tokens=sentence.tokens;
    while(!first&&intruderCount>=0){
      first=P.makeSentenceLevel({n,tokens,intruders:parkIntruders(sentence,intruderCount),obstacles:obstacleCount,minPar:tokens.length+2,maxPar:40,keyOf:parkKey});
      if(!first){if(obstacleCount>1)obstacleCount--;else intruderCount--;}
    }
    if(!first){$('game-area').textContent='Impossible de préparer ce parking, essayez une autre fiche.';return;}
    let cars=first.cars.map((c,i)=>({...c,color:PARK_COLORS[i%PARK_COLORS.length]})),par=first.par,idx=0,moves=0,exits=0,locked=false,drag=null;
    const total=tokens.length;
    progress(3,parkLevel);
    $('game-instructions').textContent=`Phrase ${parkLevel+1}/3 — Faites glisser les voitures pour sortir les mots de la phrase dans l’ordre. Les voitures intruses et les obstacles bloquent la route : sortir un mauvais mot coûte une vie.`;
    const fontSize=c=>{const cell=100/n,chars=Math.max(3,Array.from(c.text).length);return Math.max(2.4,Math.min(cell*.3,c.len*cell*.78/(chars*.56))).toFixed(2);};
    const carHtml=c=>c.fixed
      ?`<div class="park-car park-obstacle" data-id="${c.id}" data-len="${c.len}" data-h="${c.h?1:0}" data-fixed="1" aria-hidden="true">${parkObstacleSvg(c)}</div>`
      :`<button type="button" class="park-car" data-id="${c.id}" data-len="${c.len}" data-h="${c.h?1:0}" aria-label="Voiture avec le mot ${esc(c.text)}">${parkCarSvg(c)}<span class="park-plate${c.h?'':' vertical'}" style="--fs:${fontSize(c)}">${esc(c.text)}</span></button>`;
    $('game-area').innerHTML=`<div class="park-wrap"><div class="park-top"><div class="park-mission" id="park-mission" aria-live="polite"></div><div class="park-side"><span class="park-chip">Mot <b id="park-count">1/${total}</b></span><span class="park-chip">Coups <b id="park-moves">0</b></span><button type="button" class="btn alt" id="park-hint">💡 Indice (−3)</button><button type="button" class="btn alt" id="park-listen">🔊 Écouter</button></div></div><div class="park-board" id="park-board" style="--n:${n}">${cars.map(carHtml).join('')}</div><p class="park-help">Glissez une voiture avec la souris ou le doigt, ou choisissez-la avec Tab et utilisez les flèches. Pour la faire sortir, poussez-la au-delà du bord quand sa voie est libre. Les plots et barrières ne bougent pas.</p></div>`;
    const board=$('park-board'),els=new Map([...board.querySelectorAll('.park-car')].map(el=>[Number(el.dataset.id),el]));
    function put(c){
      const el=els.get(c.id),x=c.h?c.p:c.lane,y=c.h?c.lane:c.p;
      el.style.left=(x/n*100)+'%';el.style.top=(y/n*100)+'%';el.style.width=((c.h?c.len:1)/n*100)+'%';el.style.height=((c.h?1:c.len)/n*100)+'%';
      el.dataset.p=String(c.p);el.dataset.lane=String(c.lane);
    }
    cars.forEach(put);
    const movesLabel=()=>{$('park-moves').textContent=String(moves+exits);};
    function banner(){
      $('park-mission').innerHTML=`<small>Construisez la phrase en sortant les mots dans l’ordre :</small><strong>« ${esc(sentence.translation)} »</strong><div class="park-slots" role="img" aria-label="Phrase en construction">${tokens.map((t,i)=>`<span class="park-slot${i<idx?' filled':i===idx?' next':''}">${i<idx?esc(t):'…'}</span>`).join('')}</div>`;
      $('park-count').textContent=`${Math.min(idx+1,total)}/${total}`;movesLabel();
    }
    function clearHints(){els.forEach(el=>{el.classList.remove('hint','hint-exit','pulse');delete el.dataset.hintTo;delete el.dataset.hintExit;});}
    function nextSentence(delay){
      setTimeout(()=>{
        if(generation!==gameGeneration)return;
        parkLevel++;progress(3,parkLevel);
        if(parkLevel>=3){result();return;}
        feedback('');renderParking();
      },delay);
    }
    function complete(){
      locked=true;stopClock();drag=null;
      const used=moves+exits,bonus=used<=par?5:0;
      if(bonus){score+=bonus;$('learning-score').textContent=score;fx.float($('learning-score'),'⚡ Optimal +5','combo');}
      fx.confetti(1);fx.play('win');
      feedback(`Phrase construite : ${sentence.text}${sentence.reading?' ('+sentence.reading+')':''} — ${sentence.translation}. ${bonus?'Coups optimaux : +5.':`Résolu en ${used} coups (optimal : ${par}).`}`);
      nextSentence(2200);
    }
    function exitCar(c,el,dir){
      drag=null;exits++;idx++;
      updateScore(true,el);fx.play('vroom');
      el.classList.remove('drag','ghost');el.classList.add('snap','leaving');
      c.p=dir<0?-c.len-.3:n+.3;put(c);cars=cars.filter(o=>o!==c);clearHints();banner();
      setTimeout(()=>{el.remove();},480);
      if(idx>=total){locked=true;setTimeout(()=>{if(generation===gameGeneration)complete();},350);}
      else feedback(`Bien ! « ${c.text} » est placé. Quel est le mot suivant ?`);
    }
    function wrongCar(c,el){
      updateScore(false,el);fx.play('honk');
      feedback(c.role==='intruder'?`Intrus ! « ${c.text} » ne fait pas partie de la phrase. −5 points.`:'Pas dans le bon ordre : ce mot vient plus tard dans la phrase. −5 points.',false);
      el.classList.add('snap');c.p=Math.round(Math.min(Math.max(c.p,0),n-c.len));put(c);
      if(lives<=0){locked=true;stopClock();endSoon();}
    }
    const isNext=c=>c.role==='token'&&c.key===parkKey(tokens[idx]);
    function release(){
      const d=drag;if(!d)return;drag=null;
      const c=d.car,el=d.el;el.classList.remove('drag','ghost');board.classList.remove('exiting');
      const centre=c.p+c.len/2;
      if(centre<0||centre>n){if(isNext(c))exitCar(c,el,centre<0?-1:1);else wrongCar(c,el);return;}
      const target=Math.min(Math.max(Math.round(c.p),Math.max(d.lo,0)),Math.min(d.hi,n-c.len));
      el.classList.add('snap');c.p=target;put(c);
      if(target!==d.startP){moves++;movesLabel();fx.play('click');}
    }
    function attemptStep(c,el,delta){
      if(locked)return;
      const r=P.range(c,cars,n),np=c.p+delta;
      if(np<0||np+c.len>n){
        if((delta<0&&r.lo<=-c.len)||(delta>0&&r.hi>=n)){if(isNext(c))exitCar(c,el,delta);else wrongCar(c,el);}
        else fx.play('bad');
        return;
      }
      if(np<r.lo||np>r.hi){fx.play('bad');fx.shake(el);return;}
      el.classList.add('snap');c.p=np;put(c);moves++;movesLabel();fx.play('click');
    }
    cars.filter(c=>!c.fixed).forEach(c=>{
      const el=els.get(c.id);
      el.addEventListener('pointerdown',e=>{
        if(locked||(e.button!==undefined&&e.button>0))return;
        e.preventDefault();
        const r=P.range(c,cars,n);
        drag={car:c,el,startP:c.p,lo:r.lo,hi:r.hi,from:c.h?e.clientX:e.clientY,cell:board.clientWidth/n,id:e.pointerId};
        try{el.setPointerCapture(e.pointerId);}catch{}
        el.classList.remove('snap');el.classList.add('drag');fx.play('pick');
      });
      el.addEventListener('pointermove',e=>{
        if(!drag||drag.id!==e.pointerId||drag.car!==c)return;
        c.p=Math.min(Math.max(drag.startP+((c.h?e.clientX:e.clientY)-drag.from)/drag.cell,drag.lo),drag.hi);put(c);
        const out=c.p+c.len/2<0||c.p+c.len/2>n;el.classList.toggle('ghost',out);board.classList.toggle('exiting',out);
      });
      el.addEventListener('pointerup',e=>{if(drag&&drag.id===e.pointerId)release();});
      el.addEventListener('pointercancel',e=>{if(drag&&drag.id===e.pointerId){c.p=drag.startP;put(c);drag=null;el.classList.remove('drag','ghost');board.classList.remove('exiting');}});
      el.addEventListener('keydown',e=>{
        const keys=c.h?{ArrowLeft:-1,ArrowRight:1}:{ArrowUp:-1,ArrowDown:1};
        if(!(e.key in keys))return;
        e.preventDefault();attemptStep(c,el,keys[e.key]);
      });
    });
    $('park-hint').onclick=()=>{
      if(locked)return;
      const h=P.hintStage(cars,n,parkKey(tokens[idx]));if(!h)return;
      score-=3;$('learning-score').textContent=score;fx.float($('learning-score'),'−3','bad');fx.play('pick');
      clearHints();
      const el=els.get(h.id);
      if(h.exit){el.classList.add('hint-exit');el.dataset.hintExit=String(h.dir);feedback('Voie libre : poussez cette voiture hors du parking !');}
      else{el.classList.add('hint');el.dataset.hintTo=String(h.to);feedback('Indice : déplacez la voiture en surbrillance pour dégager le prochain mot.');}
    };
    $('park-listen').onclick=()=>{new Audio('/api/tts?text='+encodeURIComponent(sentence.text)+'&lang='+language).play().catch(()=>{});};
    banner();
    clock(15+par*6,()=>{
      if(locked||generation!==gameGeneration)return;
      locked=true;drag=null;updateScore(false,board);
      feedback(`⏱️ Temps écoulé ! La phrase était : ${sentence.text} — ${sentence.translation}.`,false);
      if(lives<=0){endSoon();return;}
      nextSentence(2600);
    });
  }

  function result(forced){
    stopClock();if(activeAudio){activeAudio.pause();activeAudio=null;}
    const accuracy=answers?correctAnswers/answers:0,lost=Boolean(forced)||lives<=0;
    const stars=!answers?0:lost?(accuracy>=.7?1:0):accuracy>=.9?3:accuracy>=.7?2:accuracy>=.4?1:0;
    const record=saveBest();paintBest();feedback('');
    const title=forced==='time'?'⏱️ Temps écoulé !':lost?'💥 Plus de vies !':stars===3?'🏆 Parfait !':'🎉 Bravo, la série est terminée !';
    const advice=lost
      ?'Pas de panique : revenez à la fiche pour revoir les mots difficiles, puis retentez votre chance.'
      :'Revenez à la fiche si un mot ou une position reste difficile, puis recommencez sans afficher l’aide.';
    $('game-area').innerHTML=`<div class="game-result${lost?' over':''}"><h3>${title}</h3><div class="result-stars" role="img" aria-label="${stars} étoile${stars>1?'s':''} sur 3">${[0,1,2].map(i=>`<span class="${i<stars?'on':''}" style="--i:${i}">⭐</span>`).join('')}</div><div class="result-score">${score}</div><p>points</p>${record&&score>0?'<span class="record">🏅 Nouveau record !</span>':''}<div class="result-stats"><div><b>${correctAnswers}/${answers}</b>bonnes réponses</div><div><b>x${bestStreak}</b>meilleur combo</div><div><b>${Math.round(accuracy*100)} %</b>précision</div></div><p>${advice}</p><div class="result-actions"><button class="btn" id="result-replay" type="button">↻ Rejouer</button><button class="btn alt" id="result-other" type="button">🎮 Autres jeux</button></div></div>`;
    $('game-next').hidden=true;$('game-progress').replaceChildren();$('game-instructions').textContent='';
    $('result-replay').onclick=()=>choose(active);
    $('result-other').onclick=()=>document.querySelector('.game-cards').scrollIntoView({behavior:FX&&FX.reduce?'auto':'smooth',block:'start'});
    if(!lost&&stars>=2){fx.play('win');fx.confetti(stars===3?4:2);}else fx.play(lost?'lose':'click');
  }

  function updateScore(correct,anchor){
    score=G.points(score,correct);answers++;
    const at=anchor&&anchor.getBoundingClientRect?anchor:$('learning-score');
    if(correct){
      correctAnswers++;streak++;bestStreak=Math.max(bestStreak,streak);
      const bonus=streak>=3?Math.min(10,(streak-2)*2):0;score+=bonus;
      fx.play(streak>=3?'combo':'ok',streak);fx.haptic(15);
      fx.float(at,'+'+(10+bonus)+(bonus?' 🔥':''),bonus?'combo':'good');
      if(anchor)fx.burst(anchor,{count:bonus?30:16});
    }else{
      streak=0;lives=Math.max(0,lives-1);
      fx.play('bad');fx.haptic([40,40,40]);fx.float(at,'−5','bad');fx.shake(anchor&&anchor.getBoundingClientRect?anchor:$('game-area'));
    }
    $('learning-score').textContent=score;fx.bump($('learning-score'));hud();
  }

  function currentLesson(){return lessons.find(l=>l.id===$('games-theme').value)||lessons[0];}

  function choose(game){
    if(!lessons.length){feedback('Les fiches ne sont pas encore disponibles.',false);return;}
    gameGeneration++;if(activeAudio){activeAudio.pause();activeAudio=null;}stopClock();
    active=game;score=0;selection=null;matched=[];ballRound=0;oddRound=0;roundIndex=0;matchRound=0;parkLevel=0;parkSet=null;
    maxLives=lives=lifeMax();streak=0;bestStreak=0;answers=0;correctAnswers=0;
    $('learning-score').textContent=0;$('game-panel').hidden=false;$('game-title').textContent=names[game];$('game-next').hidden=true;feedback('');hud();$('game-progress').replaceChildren();
    document.querySelectorAll('[data-game]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.game===game)));
    if(game==='matching')startMatching();else if(game==='ball'){ballPrompts=G.shuffle(difficulty.positions);renderBall();}else if(game==='odd')renderOdd();else if(game==='verbs')renderVerbs();else if(game==='images')renderImages();else if(game==='parking')renderParking();else renderListening();
    document.body.classList.add('playing');fx.play('click');
    $('game-panel').scrollIntoView({behavior:FX&&FX.reduce?'auto':'smooth',block:'start'});
  }

  /* ===== Mots à relier : 2 plateaux, chrono ===== */
  function startMatching(){
    const generation=gameGeneration,pool=G.shuffle(currentLesson().vocabulary),pairs=Math.min(difficulty.pairs,pool.length);
    const bank=pool.slice(0,pairs).map((v,i)=>({...v,id:String(i)}));matched=[];selection=null;
    progress(2,matchRound);
    $('game-instructions').textContent=`Plateau ${matchRound+1}/2 — Reliez les ${bank.length} paires avant la fin du temps. Cliquez sur un mot, puis sur sa traduction française (ou l’inverse).`;
    $('game-area').innerHTML=`<div class="matching-board"><svg class="matching-lines" aria-hidden="true"></svg><div class="matching-column"><h3>Langue étudiée</h3>${bank.map(v=>`<button class="matching-choice" data-pair="${v.id}" data-side="word">${esc(v.term)}</button>`).join('')}</div><div class="matching-column"><h3>Français</h3>${G.shuffle(bank).map(v=>`<button class="matching-choice" data-pair="${v.id}" data-side="fr">${esc(v.translation)}</button>`).join('')}</div></div>`;
    clock(bank.length*9,()=>{if(generation!==gameGeneration)return;feedback('⏱️ Temps écoulé ! Certaines paires n’ont pas été reliées.',false);result('time');});
    $('game-area').querySelectorAll('.matching-choice').forEach(b=>b.onclick=()=>{
      if(!selection||selection.dataset.side===b.dataset.side){
        if(selection)selection.classList.remove('selected');
        selection=b;b.classList.add('selected');fx.play('pick');return;
      }
      const first=selection,correct=G.matches(first.dataset.pair,b.dataset.pair);
      updateScore(correct,b);first.classList.remove('selected');selection=null;
      if(correct){
        first.disabled=b.disabled=true;first.classList.add('matched');b.classList.add('matched');matched.push(b.dataset.pair);
        feedback('Bonne association ! +10 points.');drawLinks(b.dataset.pair);
        if(matched.length===bank.length)boardDone();
      }else{
        feedback('Ces deux mots ne correspondent pas. −5 points. Essayez une autre traduction.',false);
        fx.shake(first);fx.shake(b);
        if(lives<=0)endSoon();
      }
    });
  }
  function boardDone(){
    const generation=gameGeneration;stopClock();matchRound++;progress(2,matchRound);
    if(matchRound<2){
      feedback('Plateau réussi ! Voici le suivant…');fx.confetti(1);fx.play('win');
      setTimeout(()=>{if(generation===gameGeneration){feedback('');startMatching();}},1300);
    }else setTimeout(()=>{if(generation===gameGeneration)result();},900);
  }
  function drawLinks(fresh){
    const board=$('game-area').querySelector('.matching-board');if(!board)return;
    const rect=board.getBoundingClientRect(),svg=board.querySelector('svg');
    svg.setAttribute('viewBox',`0 0 ${rect.width} ${rect.height}`);svg.replaceChildren();
    for(const id of matched){
      const a=board.querySelector(`[data-pair="${id}"][data-side="word"]`).getBoundingClientRect(),b=board.querySelector(`[data-pair="${id}"][data-side="fr"]`).getBoundingClientRect();
      const x1=a.right-rect.left,y1=a.top+a.height/2-rect.top,x2=b.left-rect.left,y2=b.top+b.height/2-rect.top;
      const line=document.createElementNS('http://www.w3.org/2000/svg','line');
      for(const[k,v]of Object.entries({x1,y1,x2,y2,class:'match-line'}))line.setAttribute(k,v);
      line.style.setProperty('--len',String(Math.hypot(x2-x1,y2-y1)));
      if(id!==fresh){line.style.animation='none';line.style.strokeDashoffset='0';}
      svg.append(line);
    }
  }

  /* ===== Où va la balle ? : scène illustrée, chrono ===== */
  function renderBall(){
    if(ballRound>=ballPrompts.length){result();return;}
    const generation=gameGeneration,key=ballPrompts[ballRound],phrase=instructions[language][key];ballLocation=[320,365];
    progress(ballPrompts.length,ballRound);
    $('game-instructions').innerHTML=`<span class="ball-progress">Consigne ${ballRound+1}/${ballPrompts.length}</span><br><span class="vocab-word" role="button" tabindex="0" data-vocab-term="${esc(phrase)}" data-vocab-translation="${esc(meanings[key])}">${esc(phrase)}</span>`;
    const drops=Object.entries(G.positions).map(([id,[x,y]],i)=>`<g data-drop="${id}" role="button" tabindex="0" aria-label="Emplacement ${i+1}"><circle class="ball-drop" cx="${x}" cy="${y}" r="24"></circle><text class="ball-num" x="${x}" y="${y+5}" text-anchor="middle">${i+1}</text></g>`).join('');
    $('game-area').innerHTML=`<svg class="ball-scene" viewBox="0 0 640 400" aria-label="Une caisse au centre, sept emplacements et une balle à déplacer">
      <defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b9e6ff"/><stop offset="1" stop-color="#eefcff"/></linearGradient>
      <radialGradient id="ballg" cx=".35" cy=".3" r=".85"><stop offset="0" stop-color="#ffc2ab"/><stop offset=".5" stop-color="#ff5b3d"/><stop offset="1" stop-color="#b81d08"/></radialGradient>
      <linearGradient id="crate" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f9d58a"/><stop offset="1" stop-color="#dc9a34"/></linearGradient></defs>
      <rect width="640" height="400" fill="url(#sky)"/>
      <g fill="#fff" opacity=".9"><ellipse cx="90" cy="58" rx="46" ry="15"/><ellipse cx="122" cy="48" rx="30" ry="15"/><ellipse cx="540" cy="86" rx="52" ry="16"/><ellipse cx="505" cy="76" rx="30" ry="14"/></g>
      <rect y="352" width="640" height="48" fill="#8fdc9a"/><rect y="352" width="640" height="7" fill="#62c277"/>
      <rect x="250" y="140" width="140" height="120" rx="4" fill="#9a5f17"/>
      ${drops}
      <g id="learning-ball" style="transform:translate(320px,365px)" tabindex="0" role="slider" aria-label="Balle : utiliser les flèches puis Entrée pour vérifier" aria-valuemin="0" aria-valuemax="640" aria-valuenow="320"><ellipse class="ball-shadow" cx="0" cy="20" rx="15" ry="4.5" fill="#0003"/><g class="ball-inner"><circle class="ball-body" r="18" fill="url(#ballg)" stroke="#7a1d0a" stroke-width="2"/><ellipse cx="-6" cy="-7" rx="5.5" ry="3.4" fill="#fff" opacity=".75"/></g></g>
      <g pointer-events="none"><rect class="ball-ref" x="250" y="140" width="140" height="120" rx="4" fill="url(#crate)" fill-opacity=".62" stroke="#8a5a14" stroke-width="4"/><path d="M250 180H390M250 220H390" stroke="#8a5a14" stroke-opacity=".35" stroke-width="3"/><rect x="244" y="132" width="152" height="12" rx="4" fill="#c98324" stroke="#8a5a14" stroke-width="3"/></g>
    </svg><div class="ball-controls"><button id="ball-listen" type="button">🔊 Écouter la consigne</button><button id="ball-check" type="button">Vérifier ma position</button></div><p class="ball-progress">Glissez la balle vers un cercle, ou cliquez sur un emplacement puis sur Vérifier. Au clavier : Tab pour choisir un emplacement, Entrée pour y poser la balle ; ou flèches sur la balle, puis Entrée. Les numéros ne donnent pas les traductions.</p>`;
    const svg=$('game-area').querySelector('svg'),ball=$('learning-ball');let dragging=false,checked=false;
    function move(x,y,smooth){
      ballLocation=[Math.max(18,Math.min(622,x)),Math.max(18,Math.min(382,y))];
      ball.classList.toggle('snap',Boolean(smooth));
      ball.style.transform=`translate(${ballLocation[0]}px,${ballLocation[1]}px)`;
      ball.setAttribute('aria-valuenow',Math.round(ballLocation[0]));ball.setAttribute('aria-valuetext',`Position ${Math.round(ballLocation[0])}, ${Math.round(ballLocation[1])}`);
    }
    function lock(){checked=true;stopClock();$('game-next').onclick=null;next(()=>{ballRound++;renderBall();});}
    function showTarget(){const target=svg.querySelector(`[data-drop="${key}"] .ball-drop`);if(target)target.classList.add('hint');}
    function check(){
      if(checked)return;
      const[x,y]=ballLocation,correct=G.placement(key,x,y);
      updateScore(correct,ball);
      if(correct){
        feedback('Bonne position ! '+meanings[key]+' +10 points.');
        ball.classList.add('bounce');lock();
      }else if(lives<=0){
        feedback('Pas encore. '+meanings[key],false);showTarget();lock();
      }else feedback('Pas encore. −5 points. '+meanings[key]+' Replacez la balle puis vérifiez.',false);
    }
    clock(22,()=>{
      if(checked||generation!==gameGeneration)return;
      updateScore(false,ball);feedback('⏱️ Temps écoulé ! '+meanings[key],false);showTarget();lock();
    });
    ball.onpointerdown=e=>{if(checked)return;e.preventDefault();dragging=true;ball.classList.add('drag');ball.setPointerCapture(e.pointerId);fx.play('pick');};
    ball.onpointermove=e=>{if(!dragging)return;const p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;const at=p.matrixTransform(svg.getScreenCTM().inverse());move(at.x,at.y,false);};
    ball.onpointerup=()=>{ball.classList.remove('drag');if(dragging){dragging=false;check();}};ball.onpointercancel=()=>{dragging=false;ball.classList.remove('drag');};
    ball.onkeydown=e=>{
      if(checked)return;
      if(e.key==='Enter'){e.preventDefault();check();return;}
      const step=20;
      if(e.key==='ArrowLeft')move(ballLocation[0]-step,ballLocation[1],true);else if(e.key==='ArrowRight')move(ballLocation[0]+step,ballLocation[1],true);else if(e.key==='ArrowUp')move(ballLocation[0],ballLocation[1]-step,true);else if(e.key==='ArrowDown')move(ballLocation[0],ballLocation[1]+step,true);else return;
      e.preventDefault();
    };
    svg.querySelectorAll('[data-drop]').forEach(g=>{
      const place=()=>{if(!checked){move(...G.positions[g.dataset.drop],true);fx.play('pick');}};
      g.onclick=place;g.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();place();}};
    });
    $('ball-check').onclick=check;
    $('ball-listen').onclick=()=>new Audio('/api/tts?text='+encodeURIComponent(phrase)+'&lang='+language).play().catch(()=>{});
  }

  /* ===== Le mot intrus : 8 manches, chrono ===== */
  function renderOdd(){
    const rounds=8;
    if(oddRound>=rounds){result();return;}
    const safeThemes=(pathMode?pathThemes:lessons).filter(l=>!l.id.includes('heures')&&!l.id.includes('positions'));
    if(safeThemes.length<2){$('game-area').textContent='Consultez deux fiches de vocabulaire de thèmes différents pour ce jeu.';return;}
    const generation=gameGeneration,theme=safeThemes[oddRound%safeThemes.length],other=safeThemes[(oddRound+1)%safeThemes.length];
    const ordinary=G.shuffle(theme.vocabulary).slice(0,difficulty.oddOptions-1).map(v=>({...v,odd:false})),intruder={...G.shuffle(other.vocabulary)[0],odd:true};
    const options=G.shuffle([...ordinary,intruder]);
    progress(rounds,oddRound);
    $('game-instructions').textContent=`Manche ${oddRound+1}/${rounds} — Quel mot n’appartient pas au thème « ${theme.title.split(' — ')[0]} » ?`;
    $('game-area').innerHTML=`<div class="odd-choices">${options.map((v,i)=>`<button type="button" data-odd-index="${i}">${esc(v.term)}</button>`).join('')}</div>`;
    const buttons=[...$('game-area').querySelectorAll('button')];let answered=false;
    const reveal=()=>buttons.forEach(a=>{a.disabled=true;if(options[Number(a.dataset.oddIndex)].odd)a.classList.add('right');});
    const where=`L’intrus est ${intruder.term} (${intruder.translation}), thème ${other.title.split(' — ')[0].toLowerCase()}.`;
    const again=()=>next(()=>{oddRound++;renderOdd();});
    clock(14,()=>{
      if(answered||generation!==gameGeneration)return;
      answered=true;updateScore(false,$('game-area'));reveal();feedback('⏱️ Temps écoulé ! '+where,false);again();
    });
    buttons.forEach(b=>b.onclick=()=>{
      if(answered)return;answered=true;
      const v=options[Number(b.dataset.oddIndex)];
      updateScore(v.odd,b);b.classList.add(v.odd?'right':'wrong');reveal();
      feedback(`${v.odd?'Bonne réponse ! +10.':'−5 points.'} ${where}`,v.odd);again();
    });
  }

  function next(callback){
    stopClock();
    const over=lives<=0,button=$('game-next');
    button.hidden=false;button.textContent=over?'Voir le résultat ▶':'Continuer ▶';
    button.onclick=()=>{
      gameGeneration++;if(activeAudio){activeAudio.pause();activeAudio=null;}
      roundIndex++;feedback('');button.hidden=true;
      if(lives<=0){result(true);return;}
      callback();
    };
    setTimeout(()=>{if(!button.hidden){try{button.focus({preventScroll:true});}catch{}}},200);
  }

  /* ===== Images et mots : glisser-déposer, 2 tableaux de 4 ===== */
  function enableDrag(chip,drop){
    let startX=0,startY=0,ghost=null,moved=false,pointer=null,over=null;
    const target=e=>{const el=document.elementFromPoint(e.clientX,e.clientY),card=el&&el.closest?el.closest('.picture-card'):null;return card;};
    chip.addEventListener('pointerdown',e=>{
      if(chip.disabled||(e.button!==undefined&&e.button>0))return;
      startX=e.clientX;startY=e.clientY;moved=false;pointer=e.pointerId;
      try{chip.setPointerCapture(pointer);}catch{}
    });
    chip.addEventListener('pointermove',e=>{
      if(pointer!==e.pointerId)return;
      if(!moved&&Math.hypot(e.clientX-startX,e.clientY-startY)>8){
        moved=true;ghost=document.createElement('div');ghost.className='drag-ghost';ghost.textContent=chip.textContent;document.body.append(ghost);chip.style.opacity='.35';fx.play('pick');
      }
      if(!ghost)return;
      ghost.style.left=e.clientX+'px';ghost.style.top=e.clientY+'px';
      const card=target(e);if(over!==card){if(over)over.classList.remove('over');over=card;if(over)over.classList.add('over');}
    });
    const finish=e=>{
      if(pointer!==e.pointerId)return;pointer=null;
      if(over)over.classList.remove('over');
      if(ghost){ghost.remove();ghost=null;}
      chip.style.opacity='';
      if(moved){
        const card=e.type==='pointerup'?target(e):null;chip._dragged=true;setTimeout(()=>{chip._dragged=false;},60);
        if(card)drop(chip,card.querySelector('[data-picture-id]'));
      }
      over=null;
    };
    chip.addEventListener('pointerup',finish);chip.addEventListener('pointercancel',finish);
  }
  function renderImages(){
    if(roundIndex>=2){result();return;}
    const lesson=currentLesson();let theme=Object.keys(illustrations).find(k=>lesson.id.includes(k));
    if(!theme&&lesson.id.includes('couleurs'))theme='couleurs';
    if(!theme){$('game-area').textContent='Choisissez Couleurs, Lieux, Vêtements ou Cuisine pour jouer avec les images.';return;}
    const generation=gameGeneration;
    // La salle « cuisine » et l’action « cuisiner » ne sont pas des objets dessinables.
    const candidates=lesson.vocabulary.map((v,i)=>({...v,index:i})).filter(v=>!(theme==='cuisine'&&[0,7].includes(v.index)));
    const choices=G.shuffle(candidates).slice(0,Math.min(4,candidates.length));let selected=null,done=0;
    progress(2,roundIndex);
    $('game-instructions').textContent=`Tableau ${roundIndex+1}/2 — Glissez chaque mot sous la bonne illustration (ou touchez un mot, puis son emplacement). Le clavier fonctionne aussi.`;
    const picture=v=>theme==='couleurs'
      ?`<svg viewBox="0 0 120 100" role="img" aria-label="${esc(v.translation)}"><circle cx="60" cy="50" r="38" fill="${esc(v.swatch)}" stroke="#2b6c70" stroke-width="3"/><ellipse cx="46" cy="36" rx="12" ry="7" fill="#fff" opacity=".35"/></svg>`
      :`<svg viewBox="0 0 120 100" role="img" aria-label="${esc(v.translation)}"><rect x="1" y="1" width="118" height="98" rx="18" fill="#e6f8f6"/><text x="60" y="70" font-size="58" text-anchor="middle">${illustrations[theme][v.index]}</text></svg>`;
    const specialPicture=v=>theme==='cuisine'&&v.index===1?'<svg viewBox="0 0 120 100" role="img" aria-label="Casserole"><path d="M30 35H90V75Q60 90 30 75Z" fill="#91b5bb" stroke="#2b7a78" stroke-width="3"/><path d="M30 45H15V62H30M90 45H105V62H90" fill="none" stroke="#2b7a78" stroke-width="5"/></svg>':picture(v);
    $('game-area').innerHTML=`<div class="picture-grid">${choices.map(v=>`<div class="picture-card">${specialPicture(v)}<button class="picture-drop" data-picture-id="${v.index}" aria-label="Placer le mot sous l’illustration : ${esc(v.translation)}">Placer ici</button></div>`).join('')}</div><div class="picture-words">${G.shuffle(choices).map(v=>`<button class="picture-word" data-picture-word="${v.index}">${esc(v.term)}</button>`).join('')}</div>`;
    const finishBoard=()=>{
      stopClock();feedback('Toutes les images sont associées ! Bien joué.');fx.confetti(1);fx.play('win');
      next(renderImages);
    };
    function place(chip,dropButton){
      if(!chip||!dropButton||chip.disabled||dropButton.disabled)return;
      const correct=chip.dataset.pictureWord===dropButton.dataset.pictureId;
      updateScore(correct,dropButton);
      if(correct){
        dropButton.textContent=chip.textContent;dropButton.disabled=chip.disabled=true;dropButton.classList.add('matched');chip.classList.remove('selected');
        if(selected===chip)selected=null;done++;feedback('Le mot est placé sous la bonne image. +10.');
        if(done===choices.length)finishBoard();
      }else{
        feedback('Ce mot ne désigne pas cette image. −5. Essayez un autre emplacement.',false);fx.shake(dropButton);
        if(lives<=0){stopClock();feedback('Ce mot ne désigne pas cette image. Plus de vies !',false);next(renderImages);}
      }
    }
    $('game-area').querySelectorAll('[data-picture-word]').forEach(b=>{
      b.onclick=()=>{if(b._dragged)return;$('game-area').querySelectorAll('.selected').forEach(el=>el.classList.remove('selected'));selected=b;b.classList.add('selected');fx.play('pick');};
      enableDrag(b,place);
    });
    $('game-area').querySelectorAll('[data-picture-id]').forEach(b=>b.onclick=()=>{
      if(!selected){feedback('Choisissez d’abord un mot.',false);return;}
      place(selected,b);
    });
    clock(choices.length*10,()=>{
      if(generation!==gameGeneration||done===choices.length)return;
      feedback('⏱️ Temps écoulé ! Certaines images n’ont pas reçu leur mot.',false);result('time');
    });
  }
  const illustrations={vetements:['👔','👕','👖','👗','🧥','👞','🧦','🎩'],cuisine:['🍳','🫕','🍳','🔪','🥄','🍞','💧','🧑‍🍳'],lieux:['🏫','🚉','🛒','🏥','💊','🍽️','🌳','📚']};
  function renderListening(){
    const bank=audioOverride||currentLesson().vocabulary,totalWords=Math.min(bank.length,difficulty.pairs+2);
    if(roundIndex>=totalWords){result();return;}
    const word=bank[roundIndex%bank.length],text=word.term||word.word;
    if(typeof progress==='function')progress(totalWords,roundIndex);
    $('game-instructions').textContent=`Mot ${roundIndex+1}/${totalWords} — Écoutez, puis écrivez ce que vous entendez. Aucun mot ni traduction n’est affiché avant votre réponse.`;
    $('game-area').innerHTML='<div class="sound-game"><div class="wave" id="sound-wave" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div><button id="sound-play" type="button">🔊 Écouter / réécouter</button><label>Le mot entendu<input id="sound-answer" autocomplete="off" autocapitalize="none" spellcheck="false"></label><button id="sound-check" type="button" disabled>Vérifier</button><p id="sound-status" role="status"></p></div>';
    let checked=false,heard=false,started=false;const wave=typeof document!=='undefined'?document.getElementById('sound-wave'):null;
    const timeUp=()=>{if(checked)return;checked=true;$('sound-answer').disabled=true;$('sound-check').disabled=true;updateScore(false);feedback(`⏱️ Temps écoulé ! Réponse : ${text} — ${word.translation}${word.reading?' · '+word.reading:''}.`,false);next(renderListening);};const generation=gameGeneration,status=$('sound-status'),checkButton=$('sound-check');
    $('sound-play').onclick=()=>{activeAudio?.pause();const audio=activeAudio=new Audio('/api/tts?text='+encodeURIComponent(text.split(' / ')[0])+'&lang='+language);audio.onplaying=()=>{if(generation!==gameGeneration){audio.pause();return;}heard=true;checkButton.disabled=false;status.textContent='Écoute en cours…';if(wave)wave.classList.add('playing');if(!started&&typeof clock==='function'){started=true;clock(30,timeUp);}};audio.onended=()=>{if(wave)wave.classList.remove('playing');status.textContent='Vous pouvez réécouter.';};audio.onerror=()=>{if(wave)wave.classList.remove('playing');status.textContent='Le son est indisponible. Réessayez ; aucune réponse n’est comptée sans lecture audio.';};audio.play().catch(()=>{status.textContent='Lecture impossible. Cliquez à nouveau sur Écouter.';});};
    const check=()=>{if(checked||!heard)return;const value=$('sound-answer').value;if(!value.trim()){feedback('Écrivez le mot entendu avant de vérifier.',false);return;}const answers=text.split(' / ');if(level==='niveau1'&&word.reading)answers.push(word.reading);const correct=WordSipVerbs.accepts(value,answers);updateScore(correct);checked=true;if(wave)wave.classList.remove('playing');$('sound-answer').disabled=true;$('sound-check').disabled=true;feedback(`${correct?'Bonne transcription ! +10.':'−5 points.'} Réponse : ${text} — ${word.translation}${word.reading?' · '+word.reading:''}.`,correct);next(renderListening);};
    $('sound-check').onclick=check;$('sound-answer').onkeydown=e=>{if(e.key==='Enter')check();};
  }
  async function renderVerbs(){
    const generation=gameGeneration;
    const totalRounds=['es','it'].includes(language)?18:language==='en'?12:6;
    if(roundIndex>=totalRounds){result();return;}
    progress(totalRounds,roundIndex);
    if(language==='zh'){$('game-area').textContent='Le chinois ne conjugue pas les verbes selon la personne ou le temps comme l’espagnol ou l’italien. Choisissez les jeux Images ou Écouter et écrire.';return;}
    let question,answers,rule,tiles=null,answered=false;
    if(['es','it'].includes(language)){
      const offset=level==='niveau1'?roundIndex:roundIndex+18;
      const round=WordSipVerbs.presentRound(language,offset,level);answers=[round.answer];question=`Présent : ${round.person} + ${round.verb.base} (${round.verb.translation})`;
      rule=round.ending?`${round.verb.stem} + ${round.ending} → ${round.answer}.`:`Verbe irrégulier : retenir la forme entière ${round.answer}.`;
      if(round.ending&&level!=='niveau3')tiles=[...new Set(round.verb.endings)];
      if(tiles){$('game-instructions').textContent=question;$('game-area').innerHTML=`<p class="verb-stem">${esc(round.stem)} + <strong>?</strong></p><div class="odd-choices">${G.shuffle(tiles).map(t=>`<button data-ending="${esc(t)}">-${esc(t)}</button>`).join('')}</div><p>Choisissez la terminaison. Les accents font partie de la forme.</p>`;$('game-area').querySelectorAll('[data-ending]').forEach(b=>b.onclick=()=>{if(answered)return;answered=true;const correct=b.dataset.ending===round.ending;updateScore(correct,b);$('game-area').querySelectorAll('button').forEach(a=>{a.disabled=true;if(a.dataset.ending===round.ending)a.classList.add('right');});if(!correct)b.classList.add('wrong');feedback((correct?'Bonne terminaison ! +10.':'−5 points. ')+rule,correct);next(renderVerbs);});clock(14,()=>{if(answered||generation!==gameGeneration)return;answered=true;updateScore(false);$('game-area').querySelectorAll('button').forEach(a=>{a.disabled=true;if(a.dataset.ending===round.ending)a.classList.add('right');});feedback('⏱️ Temps écoulé ! '+rule,false);next(renderVerbs);});return;}
    }else if(language==='ja'){
      const forms=[['する','します','faire'],['来る','来ます','venir']],row=forms[roundIndex%2];question=`Forme polie au présent/non-passé : ${row[0]} (${row[2]})`;
      answers=[row[1]];if(level==='niveau1')answers.push(roundIndex%2?'kimasu':'shimasu');rule=`${row[0]} → ${row[1]}. Le non-passé japonais couvre le présent et le futur selon le contexte.`;
    }else{
      try{const r=await fetch('/api/irregular-verbs/en');if(!r.ok)throw new Error();const {verbs}=await r.json();const bank=level==='niveau1'?verbs.slice(0,10):verbs,verb=bank[Math.floor(roundIndex/2)%bank.length],form=roundIndex%2?'participle':'past';question=`${form==='past'?'Prétérit':'Participe passé'} : ${verb.base} (${verb.translation})`;answers=String(verb[form]).split('/').map(s=>s.trim());if(verb.base==='get'&&form==='participle')answers=['got','gotten'];rule=`${verb.base} → ${verb.past} → ${verb.participle}${verb.base==='get'?' ; got est aussi un participe passé britannique.':''}`;}catch{if(generation===gameGeneration)$('game-area').textContent='Les verbes ne sont pas disponibles. Réessayez plus tard.';return;}
    }
    if(generation!==gameGeneration)return;
    $('game-instructions').textContent=question;$('game-area').innerHTML='<div class="sound-game"><label>La forme du verbe<input id="verb-answer" autocomplete="off" autocapitalize="none" spellcheck="false"></label><button id="verb-check" type="button">Vérifier</button></div>';let checked=false;
    const check=()=>{if(checked)return;const value=$('verb-answer').value;if(!value.trim())return;checked=true;const correct=WordSipVerbs.accepts(value,answers);updateScore(correct,$('verb-check'));$('verb-answer').disabled=$('verb-check').disabled=true;feedback(`${correct?'Bonne forme ! +10.':'−5 points. Réponse : '+answers.join(' / ')+'. '}${rule}`,correct);next(renderVerbs);};$('verb-check').onclick=check;$('verb-answer').onkeydown=e=>{if(e.key==='Enter')check();};$('verb-answer').focus({preventScroll:true});clock(20,()=>{if(checked||generation!==gameGeneration)return;checked=true;$('verb-answer').disabled=$('verb-check').disabled=true;updateScore(false);feedback('⏱️ Temps écoulé ! Réponse : '+answers.join(' / ')+'. '+rule,false);next(renderVerbs);});
  }
  async function loadPath(){
    const pathLanguage=language,pathVersion=loadVersion;
    let path;
    if(params.get('guest')==='true'||!profileEmail){
      const ids=WordSipLessonHistory.week('guest',language,level),studied=lessons.filter(l=>ids.includes(l.id)),vocab=studied.filter(l=>!l.id.includes('positions'));
      const recommendations=vocab.map(l=>({game:'matching',lessonId:l.id,title:'Relier les mots : '+l.title.split(' — ')[0],reason:'Après la fiche consultée cette semaine.'}));
      for(const l of vocab){recommendations.push({game:'listening',lessonId:l.id,title:'Écouter et écrire : '+l.title.split(' — ')[0],reason:'Réutiliser le vocabulaire de cette fiche.'});if(!l.id.includes('heures'))recommendations.push({game:'images',lessonId:l.id,title:'Images : '+l.title.split(' — ')[0],reason:'Associer les mots étudiés aux images.'});}
      if(ids.some(id=>['prepositions-place','preposiciones-lugar','preposizioni-luogo','quotidien-positions'].includes(id)))recommendations.push({game:'ball',title:'Placer la balle',reason:'Après votre fiche sur les positions.'});
      if(ids.includes('__irregular_verbs__')||ids.some(id=>['presente','present-simple'].includes(id)))recommendations.push({game:'verbs',title:'L’atelier des verbes',reason:'Après votre fiche de conjugaison.'});
      if(vocab.filter(l=>!l.id.includes('heures')).length>=2)recommendations.push({game:'odd',lessonIds:vocab.map(l=>l.id),title:'Le mot intrus',reason:'Comparer vos thèmes étudiés cette semaine.'});
      const words=WordSipHistory.week('guest',language,level);if(words.length)recommendations.push({game:'weekly',title:'Mission de la semaine',reason:'Les mots du jour consultés depuis lundi.'});
      path={level,studied:ids,recommendations,words};
    }else{
      const r=await fetch('/api/learning-path?email='+encodeURIComponent(profileEmail));if(!r.ok)throw new Error('Parcours indisponible.');path=await r.json();
      if(pathVersion!==loadVersion||pathLanguage!==language)return;
      if(path.language!==language){$('path-status').textContent='Le parcours suit la langue active de votre compte. Les jeux ci-dessous permettent d’explorer cette autre langue.';$('path-games').replaceChildren();return;}
      level=path.level;
    }
    difficulty=path.difficulty||{pairs:level==='niveau3'?8:level==='niveau2'?6:4,oddOptions:level==='niveau3'?8:level==='niveau2'?6:4,positions:level==='niveau1'?['inside','on','above','below']:Object.keys(instructions[language])};pathData=path;
    $('path-status').textContent=`Depuis lundi · ${level.replace('niveau','Niveau ')} · ${path.studied.length} fiche(s) consultée(s). ${path.recommendations.length?'Choisissez une activité liée à vos fiches.':'Consultez une fiche, puis revenez : les activités correspondantes apparaîtront ici.'}`;
    $('path-games').replaceChildren();
    for(const rec of path.recommendations){const b=document.createElement(rec.game==='weekly'?'a':'button');b.className='path-game';b.textContent=rec.title+' — '+rec.reason;if(rec.game==='weekly')b.href='/jeu-semaine'+links();else b.onclick=()=>{pathMode=true;pathThemes=lessons.filter(l=>(rec.lessonIds||[]).includes(l.id));audioOverride=rec.source==='daily'?path.words:null;if(rec.lessonId)$('games-theme').value=rec.lessonId;choose(rec.game);};$('path-games').append(b);}
    const link=document.createElement('a');link.href='/grammaire'+links();link.className='path-study';link.textContent='📖 Étudier une fiche puis débloquer ses jeux';$('path-games').append(link);
  }
  async function load(){
    const version=++loadVersion;gameGeneration++;activeAudio?.pause();activeAudio=null;links();$('games-error').textContent='';$('game-panel').hidden=true;
    try{const r=await fetch('/api/learning-games/'+language);if(!r.ok)throw new Error('Impossible de charger les jeux.');const data=await r.json();if(version!==loadVersion)return;lessons=data.lessons;paintBest();$('games-theme').replaceChildren();for(const lesson of lessons){const option=document.createElement('option');option.value=lesson.id;option.textContent=lesson.title;$('games-theme').append(option);}if(!lessons.length)throw new Error('Aucune fiche disponible dans cette langue.');await WordSipHelp.setLanguage(language);try{await loadPath();}catch{$('path-status').textContent='Le parcours est indisponible. Les jeux en accès libre restent utilisables.';}}
    catch(error){if(version===loadVersion){lessons=[];$('games-error').textContent=error.message;}}
  }
  document.querySelectorAll('[data-game]').forEach(b=>b.onclick=()=>{pathMode=false;audioOverride=null;choose(b.dataset.game);});$('game-restart').onclick=()=>choose(active);$('games-home').onclick=goHome;$('games-theme').onchange=()=>{pathMode=false;audioOverride=null;if(!$('game-panel').hidden&&['matching','images','listening'].includes(active))choose(active);};
  $('games-language').onchange=()=>{language=$('games-language').value;load();};window.addEventListener('resize',drawLinks);if(FX)FX.bindMute($('sound-toggle'));else $('sound-toggle').hidden=true;paintBest();
  const context=location.search;$('games-back').href='/grammaire'+context;$('games-word').href='/mot-du-jour'+context;$('weekly-game').href='/jeu-semaine'+context;
  (async()=>{
    if(params.get('guest')!=='true')try{let email=params.get('email');if(!email){const r=await fetch('/api/session');email=(await r.json()).email;}if(email){profileEmail=email;const r=await fetch('/api/my-word?email='+encodeURIComponent(email));const user=(await r.json()).user;if(!params.get('lang'))language=user?.language||language;level=user?.level||level;}}catch{}
    if(!instructions[language])language='en';$('games-language').value=language;load();
  })();
})();
