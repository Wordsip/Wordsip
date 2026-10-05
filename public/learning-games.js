(() => {
  const $=id=>document.getElementById(id),G=WordSipLearningGames,params=new URLSearchParams(location.search);
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let language=params.get('lang')||'en',lessons=[],active='matching',score=0,selection=null,matched=[],ballRound=0,ballPrompts=[],ballLocation=[320,365],oddRound=0,loadVersion=0,level=params.get('level')||'niveau1',profileEmail=params.get('email'),pathMode=false,pathThemes=[],roundIndex=0,audioOverride=null,pathData=null;
  let difficulty={pairs:4,oddOptions:4,positions:['inside','on','above','below']};
  const names={matching:'Mots à relier',ball:'Où va la balle ?',odd:'Le mot intrus',verbs:'L’atelier des verbes',images:'Images et mots',listening:'Écouter et écrire',kart:'Le kart des mots',house:'À la maison',body:'Le corps humain',parking:'Le parking des phrases',billiards:'Le billard des mots'};
  let directionSeries=-1;let gameGeneration=0,activeAudio=null,encouragement=WordSipEncouragement.create();
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
  function updateScore(correct){$('game-encouragement').textContent=encouragement.answer(correct);score=G.points(score,correct);$('learning-score').textContent=score;}
  function currentLesson(){return lessons.find(l=>l.id===$('games-theme').value)||lessons[0];}
  function choose(game){
    if(!lessons.length){feedback('Les fiches ne sont pas encore disponibles.',false);return;}
    gameGeneration++;WordSipAdventures.dispose();WordSipBilliards.dispose();activeAudio?.pause();activeAudio=null;
    active=game;directionSeries++;encouragement=WordSipEncouragement.create();$('game-encouragement').textContent='À vous de jouer. Prenez votre temps.';score=0;selection=null;matched=[];ballRound=0;oddRound=0;roundIndex=0;$('learning-score').textContent=0;$('game-panel').hidden=false;$('game-title').textContent=names[game];$('game-next').hidden=true;feedback('');
    document.querySelectorAll('[data-game]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.game===game)));
    if(game==='billiards'){const generation=gameGeneration;WordSipBilliards.mount({language,level,direction:$('games-direction').value,isActive:()=>gameGeneration===generation,onAnswer:updateScore,feedback}).catch(error=>{if(gameGeneration===generation)feedback(error.message,false);});}else if(['kart','house','body','parking'].includes(game)){const generation=gameGeneration;WordSipAdventures.mount(game,{language,level,direction:$('games-direction').value,vocabulary:currentLesson().vocabulary,isActive:()=>gameGeneration===generation,onAnswer:updateScore,feedback}).catch(error=>{if(gameGeneration===generation)feedback(error.message,false);});}else if(game==='matching')startMatching();else if(game==='ball'){ballPrompts=G.shuffle(difficulty.positions);renderBall();}else if(game==='odd')renderOdd();else if(game==='verbs')renderVerbs();else if(game==='images')renderImages();else renderListening();
    $('game-panel').scrollIntoView({block:'start',behavior:'instant'});
  }
  function startMatching(){
    const reverse=WordSipDirection.reverse($('games-direction').value,directionSeries),bank=G.shuffle(currentLesson().vocabulary).slice(0,difficulty.pairs).map((v,i)=>({...v,id:String(i)}));
    $('game-instructions').textContent=`Cliquez sur un mot, puis sur sa traduction française. Reliez les ${bank.length} paires ; vous pouvez aussi commencer par la traduction.`;
    $('game-area').innerHTML=`<div class="game-steps"><span>1 · Sélectionnez un mot</span><span>2 · Touchez sa traduction</span><span>3 · La liaison apparaît</span></div><div class="matching-board"><svg class="matching-lines" aria-hidden="true"></svg><div class="matching-column" style="order:${reverse?2:0}"><h3>Langue étudiée</h3>${bank.map(v=>`<button class="matching-choice" data-pair="${v.id}" data-side="word">${esc(v.term)}</button>`).join('')}</div><div class="matching-column" style="order:${reverse?0:2}"><h3>Français</h3>${G.shuffle(bank).map(v=>`<button class="matching-choice" data-pair="${v.id}" data-side="fr">${esc(v.translation)}</button>`).join('')}</div></div>`;
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
    for(const id of matched){const a=board.querySelector(`[data-pair="${id}"][data-side="word"]`).getBoundingClientRect(),b=board.querySelector(`[data-pair="${id}"][data-side="fr"]`).getBoundingClientRect();const wordOnLeft=a.left<b.left;const line=document.createElementNS('http://www.w3.org/2000/svg','line');for(const[k,v]of Object.entries({x1:(wordOnLeft?a.right:a.left)-rect.left,y1:a.top+a.height/2-rect.top,x2:(wordOnLeft?b.left:b.right)-rect.left,y2:b.top+b.height/2-rect.top,stroke:'#217946','stroke-width':3}))line.setAttribute(k,v);svg.append(line);}
  }
  function renderBall(){
    if(ballRound>=ballPrompts.length){result();return;}
    const key=ballPrompts[ballRound],reverse=WordSipDirection.reverse($('games-direction').value,ballRound),phrase=reverse?meanings[key]:instructions[language][key];ballLocation=[570,365];
    $('game-instructions').innerHTML=`<span class="ball-progress">Consigne ${ballRound+1}/${ballPrompts.length}</span><br><span class="vocab-word" role="button" tabindex="0" data-vocab-term="${esc(phrase)}" data-vocab-translation="${esc(reverse?instructions[language][key]:meanings[key])}">${esc(phrase)}</span>`;
    $('game-area').innerHTML=`<div class="game-steps"><span>1 · Lisez ou écoutez</span><span>2 · Saisissez la balle</span><span>3 · Déplacez et relâchez</span></div><div class="ball-free-board">${WordSipVisuals.ballScene('start',true)}</div><div class="ball-controls"><button id="ball-listen" type="button">🔊 Écouter la consigne</button><button id="ball-check" type="button" disabled>Vérifier ma position</button></div><p class="ball-progress">Maintenez le bouton de la souris sur la balle, déplacez-la, puis relâchez : votre position est vérifiée. Sur écran tactile, glissez avec le doigt. Au clavier : flèches sur la balle, puis Entrée.</p>`;
    const svg=$('game-area').querySelector('.interactive-scene'),ball=$('learning-ball'),front=svg.querySelector('[data-ball-front]');
    let dragging=false,checked=false,moved=false,dragStart=null,offset=[0,0];
    const point=e=>{const p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;return p.matrixTransform(svg.getScreenCTM().inverse());};
    function layers(){
      // Reparent only AFTER pointer release: reparenting during a drag loses pointer capture.
      if(G.freePlacement('inside',...ballLocation))svg.insertBefore(ball,front);else svg.append(ball);
    }
    function move(x,y){
      if(checked)return;
      ballLocation=[Math.max(18,Math.min(622,x)),Math.max(18,Math.min(382,y))];
      ball.setAttribute('cx',ballLocation[0]);ball.setAttribute('cy',ballLocation[1]);ball.setAttribute('aria-valuenow',Math.round(ballLocation[0]));
      ball.setAttribute('aria-valuetext',`Balle déplacée, coordonnées ${Math.round(ballLocation[0])}, ${Math.round(ballLocation[1])}`);
      moved=true;$('ball-check').disabled=false;
    }
    function check(){
      if(checked||!moved)return;
      const correct=G.freePlacement(key,...ballLocation);updateScore(correct);
      if(correct){checked=true;ball.classList.add('placed');$('ball-check').disabled=true;feedback('Bonne position ! '+meanings[key]+' +10 points.');$('game-next').hidden=false;$('game-next').onclick=()=>{gameGeneration++;WordSipAdventures.dispose();WordSipBilliards.dispose();activeAudio?.pause();activeAudio=null;ballRound++;feedback('');$('game-next').hidden=true;renderBall();};}
      else {moved=false;$('ball-check').disabled=true;feedback('Ce placement ne correspond pas encore à la consigne. −5 points. Reprenez la balle pour la déplacer ; cliquez sur la consigne si vous souhaitez sa traduction.',false);}
    }
    ball.onpointerdown=e=>{
      if(checked||e.button>0)return;e.preventDefault();const at=point(e);offset=[at.x-ballLocation[0],at.y-ballLocation[1]];dragStart=ballLocation.slice();dragging=true;ball.setPointerCapture(e.pointerId);ball.classList.add('dragging');
    };
    ball.onpointermove=e=>{if(!dragging)return;const at=point(e);const x=at.x-offset[0],y=at.y-offset[1];if(Math.hypot(x-dragStart[0],y-dragStart[1])<6&&!moved)return;move(x,y);};
    ball.onpointerup=e=>{
      if(!dragging)return;dragging=false;ball.classList.remove('dragging');if(ball.hasPointerCapture(e.pointerId))ball.releasePointerCapture(e.pointerId);layers();check();
    };
    ball.onpointercancel=e=>{dragging=false;ball.classList.remove('dragging');if(ball.hasPointerCapture(e.pointerId))ball.releasePointerCapture(e.pointerId);if(dragStart)move(...dragStart);moved=false;$('ball-check').disabled=true;layers();};
    ball.onkeydown=e=>{if(checked)return;if(e.key==='Enter'){e.preventDefault();layers();check();return;}const delta={ArrowLeft:[-10,0],ArrowRight:[10,0],ArrowUp:[0,-10],ArrowDown:[0,10]}[e.key];if(delta){e.preventDefault();move(ballLocation[0]+delta[0],ballLocation[1]+delta[1]);layers();}};
    $('ball-check').onclick=()=>{layers();check();};
    $('ball-listen').onclick=()=>{const generation=gameGeneration;activeAudio?.pause();activeAudio=new Audio('/api/tts?text='+encodeURIComponent(phrase)+'&lang='+(reverse?'fr':language));activeAudio.play().catch(()=>{if(generation===gameGeneration)feedback('Audio indisponible. La consigne écrite reste utilisable.',false);});};
  }
  function renderOdd(){
    const reverse=WordSipDirection.reverse($('games-direction').value,oddRound);
    if(oddRound>=5){result();return;}
    const safeThemes=(pathMode?pathThemes:lessons).filter(l=>!l.id.includes('heures')&&!l.id.includes('positions'));
    if(safeThemes.length<2){$('game-area').textContent='Consultez deux fiches de vocabulaire de thèmes différents pour ce jeu.';return;}
    const theme=safeThemes[oddRound%safeThemes.length],other=safeThemes[(oddRound+1)%safeThemes.length];
    const ordinary=G.shuffle(theme.vocabulary).slice(0,difficulty.oddOptions-1).map(v=>({...v,odd:false})),intruder={...G.shuffle(other.vocabulary)[0],odd:true};
    const options=G.shuffle([...ordinary,intruder]);
    $('game-instructions').textContent=`Série ${oddRound+1}/5 — Quel mot n’appartient pas au thème « ${theme.title.split(' — ')[0]} » ?`;
    $('game-area').innerHTML=`<div class="game-steps"><span>1 · Repérez le thème</span><span>2 · Écartez le mot différent</span></div><div class="odd-choices">${options.map((v,i)=>`<button type="button" data-odd-index="${i}">${esc(reverse?v.translation:v.term)}</button>`).join('')}</div>`;
    $('game-area').querySelectorAll('button').forEach(b=>b.onclick=()=>{const v=options[Number(b.dataset.oddIndex)];updateScore(v.odd);b.classList.add(v.odd?'right':'wrong');$('game-area').querySelectorAll('button').forEach(a=>{a.disabled=true;if(options[Number(a.dataset.oddIndex)].odd)a.classList.add('right');});feedback(`${v.odd?'Bonne réponse ! +10.':'−5 points.'} L’intrus est ${intruder.term} (${intruder.translation}), thème ${other.title.split(' — ')[0].toLowerCase()}.`,v.odd);$('game-next').hidden=false;$('game-next').onclick=()=>{oddRound++;feedback('');$('game-next').hidden=true;renderOdd();};});
  }
  function next(callback){$('game-next').hidden=false;$('game-next').onclick=()=>{gameGeneration++;WordSipAdventures.dispose();WordSipBilliards.dispose();activeAudio?.pause();activeAudio=null;roundIndex++;feedback('');$('game-next').hidden=true;callback();};}
  const illustrations={vetements:['👔','👕','👖','👗','🧥','👞','🧦','🎩'],cuisine:['🍳','🫕','🍳','🔪','🥄','🍞','💧','🧑‍🍳'],lieux:['🏫','🚉','🛒','🏥','💊','🍽️','🌳','📚']};
  function renderImages(){
    const reverse=WordSipDirection.reverse($('games-direction').value,directionSeries);let lesson=currentLesson(),theme=Object.keys(illustrations).find(k=>lesson.id.includes(k));
    if(!theme&&lesson.id.includes('couleurs'))theme='couleurs';
    if(!theme){$('game-area').textContent='Choisissez Couleurs, Lieux, Vêtements ou Cuisine pour jouer avec les images.';return;}
    const bank=G.shuffle(lesson.vocabulary.map((v,i)=>({...v,index:i}))).slice(0,3);let selected=null,done=0;
    $('game-instructions').textContent='Sélectionnez un mot, puis placez-le sous la bonne illustration en cliquant sur son emplacement. Le clavier et le toucher fonctionnent aussi.';
    const picture=v=>WordSipVisuals.picture(theme,v.index,v.swatch,v.translation);
    // The kitchen room and cooking action are contextual phrases, not distinct object drawings.
    const filtered=bank.filter(v=>!(theme==='cuisine'&&[0,7].includes(v.index)));
    const choices=filtered.length===3?filtered:G.shuffle(lesson.vocabulary.map((v,i)=>({...v,index:i})).filter(v=>theme!=='cuisine'||![0,7].includes(v.index))).slice(0,3);
    const specialPicture=picture;
    $('game-area').innerHTML=`<div class="game-steps"><span>1 · Choisissez une étiquette</span><span>2 · Placez-la sous l’image</span></div><div class="picture-grid">${choices.map(v=>`<div class="picture-card">${specialPicture(v)}<button class="picture-drop" data-picture-id="${v.index}" aria-label="Placer le mot sous l’illustration : ${esc(v.translation)}">Placer ici</button></div>`).join('')}</div><div class="picture-words">${G.shuffle(choices).map(v=>`<button class="picture-word" data-picture-word="${v.index}">${esc(reverse?v.translation:v.term)}</button>`).join('')}</div>`;
    $('game-area').querySelectorAll('[data-picture-word]').forEach(b=>b.onclick=()=>{$('game-area').querySelectorAll('.selected').forEach(el=>el.classList.remove('selected'));selected=b;b.classList.add('selected');});
    $('game-area').querySelectorAll('[data-picture-id]').forEach(b=>b.onclick=()=>{if(!selected){feedback('Choisissez d’abord un mot.',false);return;}const correct=selected.dataset.pictureWord===b.dataset.pictureId;updateScore(correct);if(correct){b.textContent=selected.textContent;b.disabled=selected.disabled=true;b.classList.add('matched');selected.classList.remove('selected');selected=null;done++;feedback('Le mot est placé sous la bonne image. +10.');if(done===3){feedback('Les trois images sont associées. Recommencez pour découvrir d’autres mots.');}}else{feedback('Ce mot ne désigne pas cette image. −5. Essayez un autre emplacement.',false);}});
  }
  function renderListening(){
    if(roundIndex>=Math.min(5,difficulty.pairs)){result();return;}
    const reverse=WordSipDirection.reverse($('games-direction').value,roundIndex),bank=audioOverride||currentLesson().vocabulary,word=bank[roundIndex%bank.length],text=reverse?word.translation:(word.term||word.word);const audioLang=reverse?'fr':language;
    $('game-instructions').textContent=`Mot ${roundIndex+1} — Écoutez, puis écrivez ce que vous entendez. Aucun mot ni traduction n’est affiché avant votre réponse.`;
    $('game-area').innerHTML='<div class="game-steps"><span>1 · Écoutez</span><span>2 · Écrivez</span><span>3 · Vérifiez</span></div><div class="sound-game"><div class="sound-orb" aria-hidden="true">♫</div><button id="sound-play" type="button">🔊 Écouter / réécouter</button><label>Le mot entendu<input id="sound-answer" autocomplete="off" autocapitalize="none" spellcheck="false"></label><button id="sound-check" type="button" disabled>Vérifier</button><p id="sound-status" role="status"></p></div>';
    let checked=false,heard=false;const generation=gameGeneration,status=$('sound-status'),checkButton=$('sound-check');
    $('sound-play').onclick=()=>{activeAudio?.pause();const audio=activeAudio=new Audio('/api/tts?text='+encodeURIComponent(text.split(' / ')[0])+'&lang='+audioLang);audio.onplaying=()=>{if(generation!==gameGeneration){audio.pause();return;}heard=true;checkButton.disabled=false;status.textContent='Écoute en cours…';};audio.onended=()=>{status.textContent='Vous pouvez réécouter.';};audio.onerror=()=>{status.textContent='Le son est indisponible. Réessayez ; aucune réponse n’est comptée sans lecture audio.';};audio.play().catch(()=>{status.textContent='Lecture impossible. Cliquez à nouveau sur Écouter.';});};
    const check=()=>{if(checked||!heard)return;const value=$('sound-answer').value;if(!value.trim()){feedback('Écrivez le mot entendu avant de vérifier.',false);return;}const answers=text.split(' / ');if(!reverse&&level==='niveau1'&&word.reading)answers.push(word.reading);const correct=WordSipVerbs.accepts(value,answers);updateScore(correct);checked=true;$('sound-answer').disabled=true;$('sound-check').disabled=true;feedback(`${correct?'Bonne transcription ! +10.':'−5 points.'} Réponse : ${text} — ${reverse?(word.term||word.word):word.translation}${word.reading?' · '+word.reading:''}.`,correct);next(renderListening);};
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
      if(tiles){$('game-instructions').textContent=question;$('game-area').innerHTML=`<div class="game-steps"><span>1 · Repérez la personne</span><span>2 · Assemblez la terminaison</span></div><p class="verb-stem">${esc(round.stem)} + <strong>?</strong></p><div class="odd-choices">${G.shuffle(tiles).map(t=>`<button data-ending="${esc(t)}">-${esc(t)}</button>`).join('')}</div><p>Choisissez la terminaison. Les accents font partie de la forme.</p>`;$('game-area').querySelectorAll('[data-ending]').forEach(b=>b.onclick=()=>{const correct=b.dataset.ending===round.ending;updateScore(correct);$('game-area').querySelectorAll('button').forEach(a=>{a.disabled=true;if(a.dataset.ending===round.ending)a.classList.add('right');});if(!correct)b.classList.add('wrong');feedback((correct?'Bonne terminaison ! +10.':'−5 points. ')+rule,correct);next(renderVerbs);});return;}
    }else if(language==='ja'){
      const forms=[['する','します','faire'],['来る','来ます','venir']],row=forms[roundIndex%2];question=`Forme polie au présent/non-passé : ${row[0]} (${row[2]})`;
      answers=[row[1]];if(level==='niveau1')answers.push(roundIndex%2?'kimasu':'shimasu');rule=`${row[0]} → ${row[1]}. Le non-passé japonais couvre le présent et le futur selon le contexte.`;
    }else{
      try{const r=await fetch('/api/irregular-verbs/en');if(!r.ok)throw new Error();const {verbs}=await r.json();const bank=level==='niveau1'?verbs.slice(0,10):verbs,verb=bank[Math.floor(roundIndex/2)%bank.length],form=roundIndex%2?'participle':'past';question=`${form==='past'?'Prétérit':'Participe passé'} : ${verb.base} (${verb.translation})`;answers=String(verb[form]).split('/').map(s=>s.trim());if(verb.base==='get'&&form==='participle')answers=['got','gotten'];rule=`${verb.base} → ${verb.past} → ${verb.participle}${verb.base==='get'?' ; got est aussi un participe passé britannique.':''}`;}catch{if(generation===gameGeneration)$('game-area').textContent='Les verbes ne sont pas disponibles. Réessayez plus tard.';return;}
    }
    if(generation!==gameGeneration)return;
    $('game-instructions').textContent=question;$('game-area').innerHTML='<div class="game-steps"><span>1 · Identifiez la forme demandée</span><span>2 · Écrivez le verbe</span><span>3 · Vérifiez</span></div><div class="sound-game"><div class="verb-orb" aria-hidden="true">Aa</div><label>La forme du verbe<input id="verb-answer" autocomplete="off" autocapitalize="none" spellcheck="false"></label><button id="verb-check" type="button">Vérifier</button></div>';let checked=false;
    const check=()=>{if(checked)return;const value=$('verb-answer').value;if(!value.trim())return;checked=true;const correct=WordSipVerbs.accepts(value,answers);updateScore(correct);$('verb-answer').disabled=$('verb-check').disabled=true;feedback(`${correct?'Bonne forme ! +10.':'−5 points. Réponse : '+answers.join(' / ')+'. '}${rule}`,correct);next(renderVerbs);};$('verb-check').onclick=check;$('verb-answer').onkeydown=e=>{if(e.key==='Enter')check();};
  }
  async function loadPath(){
    const pathLanguage=language,pathVersion=loadVersion;
    let path;
    if(params.get('guest')==='true'||!profileEmail){
      const ids=WordSipLessonHistory.week('guest',language,level),studied=lessons.filter(l=>ids.includes(l.id)),vocab=studied.filter(l=>!l.id.includes('positions'));
      const recommendations=vocab.map(l=>({game:'matching',lessonId:l.id,title:'Relier les mots : '+l.title.split(' — ')[0],reason:'Après la fiche consultée cette semaine.'}));
      for(const l of vocab){recommendations.push({game:'kart',lessonId:l.id,title:'Kart : '+l.title.split(' — ')[0],reason:'Reconnaître à l’oreille les mots de cette fiche.'});recommendations.push({game:'listening',lessonId:l.id,title:'Écouter et écrire : '+l.title.split(' — ')[0],reason:'Réutiliser le vocabulaire de cette fiche.'});if(!l.id.includes('heures'))recommendations.push({game:'images',lessonId:l.id,title:'Images : '+l.title.split(' — ')[0],reason:'Associer les mots étudiés aux images.'});}
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
    const version=++loadVersion;gameGeneration++;WordSipAdventures.dispose();WordSipBilliards.dispose();activeAudio?.pause();activeAudio=null;links();$('games-error').textContent='';$('game-panel').hidden=true;
    try{const r=await fetch('/api/learning-games/'+language);if(!r.ok)throw new Error('Impossible de charger les jeux.');const data=await r.json();if(version!==loadVersion)return;lessons=data.lessons;$('games-theme').replaceChildren();for(const lesson of lessons){const option=document.createElement('option');option.value=lesson.id;option.textContent=lesson.title;$('games-theme').append(option);}if(!lessons.length)throw new Error('Aucune fiche disponible dans cette langue.');await WordSipHelp.setLanguage(language);try{await loadPath();}catch{$('path-status').textContent='Le parcours est indisponible. Les jeux en accès libre restent utilisables.';}}
    catch(error){if(version===loadVersion){lessons=[];$('games-error').textContent=error.message;}}
  }
  document.querySelectorAll('[data-game]').forEach(b=>b.onclick=()=>{pathMode=false;audioOverride=null;choose(b.dataset.game);});$('game-restart').onclick=()=>choose(active);$('games-theme').onchange=()=>{pathMode=false;audioOverride=null;if(!$('game-panel').hidden&&['matching','images','listening','kart'].includes(active))choose(active);};
  $('games-direction').onchange=()=>{if(!$('game-panel').hidden)choose(active);};$('games-language').onchange=()=>{language=$('games-language').value;load();};window.addEventListener('resize',drawLinks);
  const context=location.search;$('games-back').href='/grammaire'+context;$('games-word').href='/mot-du-jour'+context;$('weekly-game').href='/jeu-semaine'+context;
  (async()=>{
    if(params.get('guest')!=='true')try{let email=params.get('email');if(!email){const r=await fetch('/api/session');email=(await r.json()).email;}if(email){profileEmail=email;const r=await fetch('/api/my-word?email='+encodeURIComponent(email));const user=(await r.json()).user;if(!params.get('lang'))language=user?.language||language;level=user?.level||level;}}catch{}
    if(!instructions[language])language='en';$('games-language').value=language;load();
  })();
})();
