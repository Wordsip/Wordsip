(() => {
  const $=id=>document.getElementById(id),G=WordSipLearningGames,params=new URLSearchParams(location.search);
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let language=params.get('lang')||'en',lessons=[],active='matching',score=0,selection=null,matched=[],ballRound=0,ballPrompts=[],ballLocation=[320,365],oddRound=0,loadVersion=0,level=params.get('level')||'niveau1',profileEmail=params.get('email'),pathMode=false,pathThemes=[],roundIndex=0,audioOverride=null,pathData=null;
  let difficulty={pairs:4,oddOptions:4,positions:['inside','on','above','below']};
  const names={matching:'Mots à relier',ball:'Où va la balle ?',odd:'Le mot intrus',verbs:'L’atelier des verbes',images:'Images et mots',listening:'Écouter et écrire'};
  let gameGeneration=0,activeAudio=null;
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
  function result(){ $('game-area').innerHTML=`<div class="game-result"><strong>Bravo, la série est terminée !</strong><p>Score : ${score} points. Revenez à la fiche si un mot ou une position reste difficile, puis recommencez sans afficher l’aide.</p></div>`;$('game-next').hidden=true;}
  function updateScore(correct){score=G.points(score,correct);$('learning-score').textContent=score;}
  function currentLesson(){return lessons.find(l=>l.id===$('games-theme').value)||lessons[0];}
  function choose(game){
    if(!lessons.length){feedback('Les fiches ne sont pas encore disponibles.',false);return;}
    gameGeneration++;activeAudio?.pause();activeAudio=null;
    active=game;score=0;selection=null;matched=[];ballRound=0;oddRound=0;roundIndex=0;$('learning-score').textContent=0;$('game-panel').hidden=false;$('game-title').textContent=names[game];$('game-next').hidden=true;feedback('');
    document.querySelectorAll('[data-game]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.game===game)));
    if(game==='matching')startMatching();else if(game==='ball'){ballPrompts=G.shuffle(difficulty.positions);renderBall();}else if(game==='odd')renderOdd();else if(game==='verbs')renderVerbs();else if(game==='images')renderImages();else renderListening();
  }
  function startMatching(){
    const bank=G.shuffle(currentLesson().vocabulary).slice(0,difficulty.pairs).map((v,i)=>({...v,id:String(i)}));
    $('game-instructions').textContent=`Cliquez sur un mot, puis sur sa traduction française. Reliez les ${bank.length} paires ; vous pouvez aussi commencer par la traduction.`;
    $('game-area').innerHTML=`<div class="matching-board"><svg class="matching-lines" aria-hidden="true"></svg><div class="matching-column"><h3>Langue étudiée</h3>${bank.map(v=>`<button class="matching-choice" data-pair="${v.id}" data-side="word">${esc(v.term)}</button>`).join('')}</div><div class="matching-column"><h3>Français</h3>${G.shuffle(bank).map(v=>`<button class="matching-choice" data-pair="${v.id}" data-side="fr">${esc(v.translation)}</button>`).join('')}</div></div>`;
    $('game-area').querySelectorAll('.matching-choice').forEach(b=>b.onclick=()=>{
      if(!selection||selection.dataset.side===b.dataset.side){selection?.classList.remove('selected');selection=b;b.classList.add('selected');return;}
      const correct=G.matches(selection.dataset.pair,b.dataset.pair);updateScore(correct);
      if(correct){selection.disabled=b.disabled=true;selection.classList.add('matched');b.classList.add('matched');matched.push(b.dataset.pair);feedback('Bonne association ! +10 points.');}
      else feedback('Ces deux mots ne correspondent pas. −5 points. Essayez une autre traduction.',false);
      selection.classList.remove('selected');selection=null;drawLinks();
      if(matched.length===bank.length){feedback('Toutes les traductions sont retrouvées. Changez de thème ou recommencez pour une autre sélection.');}
    });
  }
  function drawLinks(){
    const board=$('game-area').querySelector('.matching-board');if(!board)return;
    const rect=board.getBoundingClientRect(),svg=board.querySelector('svg');svg.setAttribute('viewBox',`0 0 ${rect.width} ${rect.height}`);svg.replaceChildren();
    for(const id of matched){const a=board.querySelector(`[data-pair="${id}"][data-side="word"]`).getBoundingClientRect(),b=board.querySelector(`[data-pair="${id}"][data-side="fr"]`).getBoundingClientRect();const line=document.createElementNS('http://www.w3.org/2000/svg','line');for(const[k,v]of Object.entries({x1:a.right-rect.left,y1:a.top+a.height/2-rect.top,x2:b.left-rect.left,y2:b.top+b.height/2-rect.top,stroke:'#217946','stroke-width':3}))line.setAttribute(k,v);svg.append(line);}
  }
  function renderBall(){
    if(ballRound>=ballPrompts.length){result();return;}
    const key=ballPrompts[ballRound],phrase=instructions[language][key];ballLocation=[320,365];
    $('game-instructions').innerHTML=`<span class="ball-progress">Consigne ${ballRound+1}/${ballPrompts.length}</span><br><span class="vocab-word" role="button" tabindex="0" data-vocab-term="${esc(phrase)}" data-vocab-translation="${esc(meanings[key])}">${esc(phrase)}</span>`;
    const drops=Object.entries(G.positions).map(([id,[x,y]],i)=>`<g data-drop="${id}" role="button" tabindex="0" aria-label="Emplacement ${i+1}"><circle class="ball-drop" cx="${x}" cy="${y}" r="24"></circle><text x="${x}" y="${y+5}" text-anchor="middle" font-size="14" fill="#526c70">${i+1}</text></g>`).join('');
    $('game-area').innerHTML=`<svg class="ball-scene" viewBox="0 0 640 400" aria-label="Une boîte au centre, sept emplacements et une balle à déplacer"><rect class="ball-ref" x="250" y="140" width="140" height="120" rx="4"></rect>${drops}<circle id="learning-ball" class="ball-token" cx="320" cy="365" r="18" tabindex="0" role="slider" aria-label="Balle : utiliser les flèches puis Entrée pour vérifier" aria-valuemin="0" aria-valuemax="640" aria-valuenow="320"></circle></svg><div class="ball-controls"><button id="ball-listen" type="button">🔊 Écouter la consigne</button><button id="ball-check" type="button">Vérifier ma position</button></div><p class="ball-progress">Glissez la balle vers un cercle, ou cliquez sur un emplacement puis sur Vérifier. Au clavier : Tab pour choisir un emplacement, Entrée pour y poser la balle ; ou flèches sur la balle, puis Entrée. Les numéros ne donnent pas les traductions.</p>`;
    const svg=$('game-area').querySelector('svg'),ball=$('learning-ball');let dragging=false,checked=false;
    function move(x,y){ballLocation=[Math.max(18,Math.min(622,x)),Math.max(18,Math.min(382,y))];ball.setAttribute('cx',ballLocation[0]);ball.setAttribute('cy',ballLocation[1]);ball.setAttribute('aria-valuenow',Math.round(ballLocation[0]));ball.setAttribute('aria-valuetext',`Position ${Math.round(ballLocation[0])}, ${Math.round(ballLocation[1])}`);}
    function check(){
      if(checked)return;
      const[x,y]=ballLocation;let correct=G.placement(key,x,y);
      updateScore(correct);
      if(correct){checked=true;feedback('Bonne position ! '+meanings[key]+' +10 points.');$('game-next').hidden=false;$('game-next').onclick=()=>{ballRound++;feedback('');$('game-next').hidden=true;renderBall();};}
      else feedback('Pas encore. −5 points. '+meanings[key]+' Replacez la balle puis vérifiez.',false);
    }
    ball.onpointerdown=e=>{if(checked)return;e.preventDefault();dragging=true;ball.setPointerCapture(e.pointerId);};
    ball.onpointermove=e=>{if(!dragging)return;const p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;const at=p.matrixTransform(svg.getScreenCTM().inverse());move(at.x,at.y);};
    ball.onpointerup=()=>{if(dragging){dragging=false;check();}};ball.onpointercancel=()=>dragging=false;
    ball.onkeydown=e=>{if(checked)return;if(e.key==='Enter'){e.preventDefault();check();return;}const step=20;if(e.key==='ArrowLeft')move(ballLocation[0]-step,ballLocation[1]);else if(e.key==='ArrowRight')move(ballLocation[0]+step,ballLocation[1]);else if(e.key==='ArrowUp')move(ballLocation[0],ballLocation[1]-step);else if(e.key==='ArrowDown')move(ballLocation[0],ballLocation[1]+step);else return;e.preventDefault();};
    svg.querySelectorAll('[data-drop]').forEach(g=>{const place=()=>{if(!checked)move(...G.positions[g.dataset.drop]);};g.onclick=place;g.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();place();}};});
    $('ball-check').onclick=check;$('ball-listen').onclick=()=>new Audio('/api/tts?text='+encodeURIComponent(phrase)+'&lang='+language).play().catch(()=>{});
  }
  function renderOdd(){
    if(oddRound>=5){result();return;}
    const safeThemes=(pathMode?pathThemes:lessons).filter(l=>!l.id.includes('heures')&&!l.id.includes('positions'));
    if(safeThemes.length<2){$('game-area').textContent='Consultez deux fiches de vocabulaire de thèmes différents pour ce jeu.';return;}
    const theme=safeThemes[oddRound%safeThemes.length],other=safeThemes[(oddRound+1)%safeThemes.length];
    const ordinary=G.shuffle(theme.vocabulary).slice(0,difficulty.oddOptions-1).map(v=>({...v,odd:false})),intruder={...G.shuffle(other.vocabulary)[0],odd:true};
    const options=G.shuffle([...ordinary,intruder]);
    $('game-instructions').textContent=`Série ${oddRound+1}/5 — Quel mot n’appartient pas au thème « ${theme.title.split(' — ')[0]} » ?`;
    $('game-area').innerHTML=`<div class="odd-choices">${options.map((v,i)=>`<button type="button" data-odd-index="${i}">${esc(v.term)}</button>`).join('')}</div>`;
    $('game-area').querySelectorAll('button').forEach(b=>b.onclick=()=>{const v=options[Number(b.dataset.oddIndex)];updateScore(v.odd);b.classList.add(v.odd?'right':'wrong');$('game-area').querySelectorAll('button').forEach(a=>{a.disabled=true;if(options[Number(a.dataset.oddIndex)].odd)a.classList.add('right');});feedback(`${v.odd?'Bonne réponse ! +10.':'−5 points.'} L’intrus est ${intruder.term} (${intruder.translation}), thème ${other.title.split(' — ')[0].toLowerCase()}.`,v.odd);$('game-next').hidden=false;$('game-next').onclick=()=>{oddRound++;feedback('');$('game-next').hidden=true;renderOdd();};});
  }
  function next(callback){$('game-next').hidden=false;$('game-next').onclick=()=>{gameGeneration++;activeAudio?.pause();activeAudio=null;roundIndex++;feedback('');$('game-next').hidden=true;callback();};}
  const illustrations={vetements:['👔','👕','👖','👗','🧥','👞','🧦','🎩'],cuisine:['🍳','🫕','🍳','🔪','🥄','🍞','💧','🧑‍🍳'],lieux:['🏫','🚉','🛒','🏥','💊','🍽️','🌳','📚']};
  function renderImages(){
    let lesson=currentLesson(),theme=Object.keys(illustrations).find(k=>lesson.id.includes(k));
    if(!theme&&lesson.id.includes('couleurs'))theme='couleurs';
    if(!theme){$('game-area').textContent='Choisissez Couleurs, Lieux, Vêtements ou Cuisine pour jouer avec les images.';return;}
    const bank=G.shuffle(lesson.vocabulary.map((v,i)=>({...v,index:i}))).slice(0,3);let selected=null,done=0;
    $('game-instructions').textContent='Sélectionnez un mot, puis placez-le sous la bonne illustration en cliquant sur son emplacement. Le clavier et le toucher fonctionnent aussi.';
    const picture=v=>theme==='couleurs'?`<svg viewBox="0 0 120 100" role="img" aria-label="${esc(v.translation)}"><circle cx="60" cy="50" r="35" fill="${esc(v.swatch)}" stroke="#526c70" stroke-width="2"/></svg>`:`<svg viewBox="0 0 120 100" role="img" aria-label="${esc(v.translation)}"><rect x="1" y="1" width="118" height="98" rx="14" fill="#eaf6f5"/><text x="60" y="67" font-size="55" text-anchor="middle">${illustrations[theme][v.index]}</text></svg>`;
    // The kitchen room and cooking action are contextual phrases, not distinct object drawings.
    const filtered=bank.filter(v=>!(theme==='cuisine'&&[0,7].includes(v.index)));
    const choices=filtered.length===3?filtered:G.shuffle(lesson.vocabulary.map((v,i)=>({...v,index:i})).filter(v=>theme!=='cuisine'||![0,7].includes(v.index))).slice(0,3);
    const specialPicture=v=>theme==='cuisine'&&v.index===1?'<svg viewBox="0 0 120 100" role="img" aria-label="Casserole"><path d="M30 35H90V75Q60 90 30 75Z" fill="#91b5bb" stroke="#2b7a78" stroke-width="3"/><path d="M30 45H15V62H30M90 45H105V62H90" fill="none" stroke="#2b7a78" stroke-width="5"/></svg>':picture(v);
    $('game-area').innerHTML=`<div class="picture-grid">${choices.map(v=>`<div class="picture-card">${specialPicture(v)}<button class="picture-drop" data-picture-id="${v.index}" aria-label="Placer le mot sous l’illustration : ${esc(v.translation)}">Placer ici</button></div>`).join('')}</div><div class="picture-words">${G.shuffle(choices).map(v=>`<button class="picture-word" data-picture-word="${v.index}">${esc(v.term)}</button>`).join('')}</div>`;
    $('game-area').querySelectorAll('[data-picture-word]').forEach(b=>b.onclick=()=>{$('game-area').querySelectorAll('.selected').forEach(el=>el.classList.remove('selected'));selected=b;b.classList.add('selected');});
    $('game-area').querySelectorAll('[data-picture-id]').forEach(b=>b.onclick=()=>{if(!selected){feedback('Choisissez d’abord un mot.',false);return;}const correct=selected.dataset.pictureWord===b.dataset.pictureId;updateScore(correct);if(correct){b.textContent=selected.textContent;b.disabled=selected.disabled=true;b.classList.add('matched');selected.classList.remove('selected');selected=null;done++;feedback('Le mot est placé sous la bonne image. +10.');if(done===3){feedback('Les trois images sont associées. Recommencez pour découvrir d’autres mots.');}}else{feedback('Ce mot ne désigne pas cette image. −5. Essayez un autre emplacement.',false);}});
  }
  function renderListening(){
    if(roundIndex>=Math.min(5,difficulty.pairs)){result();return;}
    const bank=audioOverride||currentLesson().vocabulary,word=bank[roundIndex%bank.length],text=word.term||word.word;
    $('game-instructions').textContent=`Mot ${roundIndex+1} — Écoutez, puis écrivez ce que vous entendez. Aucun mot ni traduction n’est affiché avant votre réponse.`;
    $('game-area').innerHTML='<div class="sound-game"><button id="sound-play" type="button">🔊 Écouter / réécouter</button><label>Le mot entendu<input id="sound-answer" autocomplete="off" autocapitalize="none" spellcheck="false"></label><button id="sound-check" type="button" disabled>Vérifier</button><p id="sound-status" role="status"></p></div>';
    let checked=false,heard=false;const generation=gameGeneration,status=$('sound-status'),checkButton=$('sound-check');
    $('sound-play').onclick=()=>{activeAudio?.pause();const audio=activeAudio=new Audio('/api/tts?text='+encodeURIComponent(text.split(' / ')[0])+'&lang='+language);audio.onplaying=()=>{if(generation!==gameGeneration){audio.pause();return;}heard=true;checkButton.disabled=false;status.textContent='Écoute en cours…';};audio.onended=()=>{status.textContent='Vous pouvez réécouter.';};audio.onerror=()=>{status.textContent='Le son est indisponible. Réessayez ; aucune réponse n’est comptée sans lecture audio.';};audio.play().catch(()=>{status.textContent='Lecture impossible. Cliquez à nouveau sur Écouter.';});};
    const check=()=>{if(checked||!heard)return;const value=$('sound-answer').value;if(!value.trim()){feedback('Écrivez le mot entendu avant de vérifier.',false);return;}const answers=text.split(' / ');if(level==='niveau1'&&word.reading)answers.push(word.reading);const correct=WordSipVerbs.accepts(value,answers);updateScore(correct);checked=true;$('sound-answer').disabled=true;$('sound-check').disabled=true;feedback(`${correct?'Bonne transcription ! +10.':'−5 points.'} Réponse : ${text} — ${word.translation}${word.reading?' · '+word.reading:''}.`,correct);next(renderListening);};
    $('sound-check').onclick=check;$('sound-answer').onkeydown=e=>{if(e.key==='Enter')check();};
  }
  async function renderVerbs(){
    const generation=gameGeneration;
    if(roundIndex>=(['es','it'].includes(language)?18:language==='en'?12:6)){result();return;}
    if(language==='zh'){$('game-area').textContent='Le chinois ne conjugue pas les verbes selon la personne ou le temps comme l’espagnol ou l’italien. Choisissez les jeux Images ou Écouter et écrire.';return;}
    let question,answers,rule,tiles=null;
    if(['es','it'].includes(language)){
      const offset=level==='niveau1'?roundIndex:roundIndex+18;
      const round=WordSipVerbs.presentRound(language,offset,level);answers=[round.answer];question=`Présent : ${round.person} + ${round.verb.base} (${round.verb.translation})`;
      rule=round.ending?`${round.verb.stem} + ${round.ending} → ${round.answer}.`:`Verbe irrégulier : retenir la forme entière ${round.answer}.`;
      if(round.ending&&level!=='niveau3')tiles=[...new Set(round.verb.endings)];
      if(tiles){$('game-instructions').textContent=question;$('game-area').innerHTML=`<p class="verb-stem">${esc(round.stem)} + <strong>?</strong></p><div class="odd-choices">${G.shuffle(tiles).map(t=>`<button data-ending="${esc(t)}">-${esc(t)}</button>`).join('')}</div><p>Choisissez la terminaison. Les accents font partie de la forme.</p>`;$('game-area').querySelectorAll('[data-ending]').forEach(b=>b.onclick=()=>{const correct=b.dataset.ending===round.ending;updateScore(correct);$('game-area').querySelectorAll('button').forEach(a=>{a.disabled=true;if(a.dataset.ending===round.ending)a.classList.add('right');});if(!correct)b.classList.add('wrong');feedback((correct?'Bonne terminaison ! +10.':'−5 points. ')+rule,correct);next(renderVerbs);});return;}
    }else if(language==='ja'){
      const forms=[['する','します','faire'],['来る','来ます','venir']],row=forms[roundIndex%2];question=`Forme polie au présent/non-passé : ${row[0]} (${row[2]})`;
      answers=[row[1]];if(level==='niveau1')answers.push(roundIndex%2?'kimasu':'shimasu');rule=`${row[0]} → ${row[1]}. Le non-passé japonais couvre le présent et le futur selon le contexte.`;
    }else{
      try{const r=await fetch('/api/irregular-verbs/en');if(!r.ok)throw new Error();const {verbs}=await r.json();const bank=level==='niveau1'?verbs.slice(0,10):verbs,verb=bank[Math.floor(roundIndex/2)%bank.length],form=roundIndex%2?'participle':'past';question=`${form==='past'?'Prétérit':'Participe passé'} : ${verb.base} (${verb.translation})`;answers=String(verb[form]).split('/').map(s=>s.trim());if(verb.base==='get'&&form==='participle')answers=['got','gotten'];rule=`${verb.base} → ${verb.past} → ${verb.participle}${verb.base==='get'?' ; got est aussi un participe passé britannique.':''}`;}catch{if(generation===gameGeneration)$('game-area').textContent='Les verbes ne sont pas disponibles. Réessayez plus tard.';return;}
    }
    if(generation!==gameGeneration)return;
    $('game-instructions').textContent=question;$('game-area').innerHTML='<div class="sound-game"><label>La forme du verbe<input id="verb-answer" autocomplete="off" autocapitalize="none" spellcheck="false"></label><button id="verb-check" type="button">Vérifier</button></div>';let checked=false;
    const check=()=>{if(checked)return;const value=$('verb-answer').value;if(!value.trim())return;checked=true;const correct=WordSipVerbs.accepts(value,answers);updateScore(correct);$('verb-answer').disabled=$('verb-check').disabled=true;feedback(`${correct?'Bonne forme ! +10.':'−5 points. Réponse : '+answers.join(' / ')+'. '}${rule}`,correct);next(renderVerbs);};$('verb-check').onclick=check;$('verb-answer').onkeydown=e=>{if(e.key==='Enter')check();};
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
    try{const r=await fetch('/api/learning-games/'+language);if(!r.ok)throw new Error('Impossible de charger les jeux.');const data=await r.json();if(version!==loadVersion)return;lessons=data.lessons;$('games-theme').replaceChildren();for(const lesson of lessons){const option=document.createElement('option');option.value=lesson.id;option.textContent=lesson.title;$('games-theme').append(option);}if(!lessons.length)throw new Error('Aucune fiche disponible dans cette langue.');await WordSipHelp.setLanguage(language);try{await loadPath();}catch{$('path-status').textContent='Le parcours est indisponible. Les jeux en accès libre restent utilisables.';}}
    catch(error){if(version===loadVersion){lessons=[];$('games-error').textContent=error.message;}}
  }
  document.querySelectorAll('[data-game]').forEach(b=>b.onclick=()=>{pathMode=false;audioOverride=null;choose(b.dataset.game);});$('game-restart').onclick=()=>choose(active);$('games-theme').onchange=()=>{pathMode=false;audioOverride=null;if(!$('game-panel').hidden&&['matching','images','listening'].includes(active))choose(active);};
  $('games-language').onchange=()=>{language=$('games-language').value;load();};window.addEventListener('resize',drawLinks);
  const context=location.search;$('games-back').href='/grammaire'+context;$('games-word').href='/mot-du-jour'+context;$('weekly-game').href='/jeu-semaine'+context;
  (async()=>{
    if(params.get('guest')!=='true')try{let email=params.get('email');if(!email){const r=await fetch('/api/session');email=(await r.json()).email;}if(email){profileEmail=email;const r=await fetch('/api/my-word?email='+encodeURIComponent(email));const user=(await r.json()).user;if(!params.get('lang'))language=user?.language||language;level=user?.level||level;}}catch{}
    if(!instructions[language])language='en';$('games-language').value=language;load();
  })();
})();
