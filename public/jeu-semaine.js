(() => {
  'use strict';
  const $=id=>document.getElementById(id),canvas=$('arena'),ctx=canvas.getContext('2d');
  const W=canvas.width=Math.min(900,Math.max(320,Math.floor(canvas.parentElement.clientWidth))),H=canvas.height=Math.min(480,Math.max(340,Math.floor(window.innerHeight*.48)));
  const params=new URLSearchParams(location.search),guest=params.get('guest')==='true';
  const names={en:'Anglais',es:'Espagnol',it:'Italien',ja:'Japonais',zh:'Chinois'};
  let words=[],weekWords=[],practice=[],themes=[],language='en',level='niveau1',running=false,paused=false,score=0,lives=3,remaining=90,roundIndex=0,targets=[],bullets=[],player=W/2,last=0,elapsed=0,shotAt=-1,hits=0,errors=0,missed=0;
  let encouragement=WordSipEncouragement.create();
  const keys=new Set();let mission=null,waveFast=false,selectedDistractors=[],familyPool=[];
  $('back').href='/mot-du-jour'+location.search;$('grammar').href='/jeux'+location.search;
  function feedback(text,bad=false){$('feedback').textContent=text;$('feedback').className='feedback '+(bad?'bad':'good');}
  function hud(){$('score').textContent=score;$('lives').textContent=lives;$('time').textContent=Math.max(0,Math.ceil(remaining))+' s';}
  function nextRound(){
    const nextWord=words[roundIndex%words.length];
    const related=familyPool.some(w=>WordSipGame.normal(w.word)===WordSipGame.normal(nextWord.word))?familyPool:selectedDistractors;
    mission=WordSipGame.pairRound(words,roundIndex,related,Math.random,roundIndex%2===1);roundIndex++;
    $('direction').textContent=mission.reverse?'Langue étudiée → français · visez la paire correcte':'Français → langue étudiée · visez la paire correcte';$('prompt').textContent=mission.prompt;
    // Exactly three proposals when a vocabulary theme has enough distractors.
    mission.options=WordSipGame.shuffle([mission.options.find(o=>o.correct),...mission.options.filter(o=>!o.correct).slice(0,2)]);
    waveFast=roundIndex%3===0;
    $('wave-status').textContent=waveFast?'⚡ Vague rapide !':'✦ Vague tranquille';
    $('wave-status').className=waveFast?'wave-fast':'wave-calm';
    const count=mission.options.length,columns=W<600?Math.min(2,count):count,width=Math.min(245,(W-40)/columns-12);
    targets=mission.options.map((o,i)=>{
      const x=W<600&&i===2?W/2-width/2:20+(W-40)/columns*(i%columns+.5)-width/2;
      return {...o,x,y:25+Math.floor(i/columns)*132,w:width,h:112,baseX:x,tone:(i+roundIndex)%4};
    });bullets=[];
    $('targets').replaceChildren();targets.forEach(t=>{const b=document.createElement('button');b.type='button';b.textContent=t.label;b.setAttribute('aria-label','Tirer sur '+t.label);b.onclick=()=>{if(running&&!paused)hit(t);};t.button=b;$('targets').append(b);});
  }
  function begin(){
    if(paused&&running){resume();return;}
    if(!words.length)return;
    encouragement=WordSipEncouragement.create();$('mission-encouragement').textContent='À vous de jouer !';words=WordSipGame.shuffle(words);score=0;lives=3;remaining=90;roundIndex=0;hits=0;errors=0;missed=0;elapsed=0;shotAt=-1;player=W/2;keys.clear();running=true;paused=false;
    $('review').open=false;$('review').hidden=true;$('overlay').hidden=true;$('pause').disabled=false;$('pause').textContent='Pause';feedback('Visez une cible, puis tirez.');nextRound();hud();canvas.focus();
  }
  function hit(target){
    if(!targets.includes(target)||!running||paused)return;
    score=WordSipGame.scoreHit(score,target.correct);$('mission-encouragement').textContent=encouragement.answer(target.correct);
    if(target.correct){hits++;feedback('Bien joué ! '+mission.pair.word+' = '+mission.pair.translation+' · +10');nextRound();}
    else{errors++;feedback('Mauvaise cible : '+target.label+' · −5. Cherchez encore la bonne paire pour « '+mission.prompt+' ».',true);targets=targets.filter(t=>t!==target);target.button.disabled=true;}
    hud();
  }
  function fire(){if(!running||paused||elapsed-shotAt<.24)return;shotAt=elapsed;bullets.push({x:player,y:H-62});}
  function pause(){if(!running||paused)return;paused=true;keys.clear();$('overlay-title').textContent='Mission en pause';$('overlay-text').textContent='Le temps et les cibles sont arrêtés. Reprenez quand vous êtes prêt.';$('start').textContent='Reprendre';$('overlay').hidden=false;$('pause').textContent='Reprendre';}
  function resume(){paused=false;keys.clear();last=performance.now();$('overlay').hidden=true;$('pause').textContent='Pause';canvas.focus();}
  function finish(){
    running=false;paused=false;keys.clear();bullets=[];$('targets').replaceChildren();$('pause').disabled=true;$('review').hidden=false;
    $('overlay-title').textContent='Mission terminée';$('overlay-text').textContent=`${score} points · ${hits} bonnes cibles · ${errors} mauvais tirs · ${missed} cibles échappées. Révisez les mots puis rejouez !`;$('start').textContent='Rejouer';$('overlay').hidden=false;hud();
  }
  function wrap(text,max,font){
    ctx.font=font;const lines=[];let line='';
    for(const part of (text.includes(' ')?text.split(' '):Array.from(text))){const trial=line+(line&&text.includes(' ')?' ':'')+part;if(ctx.measureText(trial).width>max&&line){lines.push(line);line=part;}else line=trial;}if(line)lines.push(line);return lines;
  }
  function draw(){
    const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#282247');sky.addColorStop(1,'#142e43');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
    ctx.fillStyle='#5d799955';for(let i=0;i<55;i++){const x=(i*157+59)%W,y=(i*79+elapsed*8)%H;ctx.fillRect(x,y,2,2);}
    ctx.strokeStyle='#1f526066';ctx.beginPath();ctx.moveTo(0,H-85);ctx.lineTo(W,H-85);ctx.stroke();
    // Perspective deck under the arena.
    ctx.strokeStyle='#31548066';for(let i=-4;i<=4;i++){ctx.beginPath();ctx.moveTo(W/2+i*40,H-85);ctx.lineTo(W/2+i*180,H);ctx.stroke();}
    for(const target of targets){
      const x=target.x,y=target.y,w=target.w,h=target.h;
      const colors=[['#b8e8c9','#479783'],['#f6d99e','#c88757'],['#d7c3fc','#8770bd'],['#a6dce9','#4e92b0']][target.tone];
      // Antennae, eyes and feet turn the label into a little creature.
      ctx.strokeStyle=colors[1];ctx.lineWidth=3;
      for(const side of [-1,1]){ctx.beginPath();ctx.moveTo(x+w/2+side*22,y+12);ctx.lineTo(x+w/2+side*32,y-7);ctx.stroke();ctx.fillStyle=colors[0];ctx.beginPath();ctx.arc(x+w/2+side*32,y-9,5,0,Math.PI*2);ctx.fill();}
      ctx.fillStyle='#080a1b55';ctx.beginPath();ctx.ellipse(x+w/2,y+h+7,w*.4,8,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle=colors[1];for(const side of [-1,1]){ctx.beginPath();ctx.ellipse(x+w/2+side*w*.24,y+h-1,17,8,side*.2,0,Math.PI*2);ctx.fill();}
      const metal=ctx.createLinearGradient(x,y,x,y+h);metal.addColorStop(0,colors[0]);metal.addColorStop(1,colors[1]);
      ctx.fillStyle=metal;ctx.beginPath();ctx.roundRect(x,y,w,h,26);ctx.fill();ctx.strokeStyle=colors[0];ctx.lineWidth=2;ctx.stroke();
      for(const side of [-1,1]){const ex=x+w/2+side*18;ctx.fillStyle='#fff';ctx.beginPath();ctx.ellipse(ex,y+22,11,13,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#273253';ctx.beginPath();ctx.arc(ex+Math.sin(elapsed)*2,y+24,4.5,0,Math.PI*2);ctx.fill();}
      ctx.fillStyle='#18253fdd';ctx.beginPath();ctx.roundRect(x+8,y+43,w-16,h-51,12);ctx.fill();
      let size=17,left,right;
      do {left=wrap(target.left,w-24,`600 ${size-2}px Segoe UI, Arial, sans-serif`);right=wrap(target.right,w-24,`700 ${size}px Segoe UI, Arial, sans-serif`);if((left.length+right.length)*(size+2)<=h-57)break;size--;}while(size>10);
      ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`600 ${size-2}px Segoe UI, Arial, sans-serif`;
      const gap=size+2,top=y+43+(h-51)/2-(left.length+right.length-1)*gap/2;
      left.forEach((line,i)=>{ctx.fillStyle='#e3d8ed';ctx.fillText(line,x+w/2,top+i*gap,w-24);});
      ctx.font=`700 ${size}px Segoe UI, Arial, sans-serif`;right.forEach((line,i)=>{ctx.fillStyle='#fff';ctx.fillText(line,x+w/2,top+(left.length+i)*gap,w-24);});
      ctx.strokeStyle='#70cfc944';ctx.beginPath();ctx.moveTo(x+16,top+left.length*gap-9);ctx.lineTo(x+w-16,top+left.length*gap-9);ctx.stroke();
    }
    ctx.shadowColor='#ffc382';ctx.shadowBlur=12;ctx.fillStyle='#ffcf96';for(const b of bullets)ctx.fillRect(b.x-2,b.y,4,18);ctx.shadowBlur=0;
    ctx.fillStyle='#ff9750';ctx.beginPath();ctx.moveTo(player-7,H-24);ctx.lineTo(player,H-3+Math.sin(elapsed*25)*4);ctx.lineTo(player+7,H-24);ctx.fill();
    ctx.fillStyle='#2b7894';ctx.beginPath();ctx.moveTo(player,H-62);ctx.lineTo(player-30,H-20);ctx.lineTo(player,H-30);ctx.closePath();ctx.fill();
    ctx.fillStyle='#7bdad6';ctx.beginPath();ctx.moveTo(player,H-62);ctx.lineTo(player+30,H-20);ctx.lineTo(player,H-30);ctx.closePath();ctx.fill();
    ctx.fillStyle='#d7f8fb';ctx.beginPath();ctx.moveTo(player,H-55);ctx.lineTo(player-7,H-35);ctx.lineTo(player+7,H-35);ctx.closePath();ctx.fill();

  }
  function frame(time){
    const dt=Math.min(.05,(time-last)/1000||0);last=time;
    if(running&&!paused){
      elapsed+=dt;remaining-=dt;
      if(keys.has('ArrowLeft')||keys.has('a'))player-=430*dt;if(keys.has('ArrowRight')||keys.has('d'))player+=430*dt;player=Math.max(26,Math.min(W-26,player));if(keys.has(' '))fire();
      for(const t of targets){t.y+=(W<600?7+Math.min(3,roundIndex*.2):16+Math.min(10,roundIndex*.5))*(waveFast?1.65:1)*dt;t.x=t.baseX+Math.sin(elapsed*1.4)*12;}
      for(const b of bullets)b.y-=620*dt;
      let targetHit=null;
      for(const b of bullets){targetHit=targets.find(t=>b.x>=t.x&&b.x<=t.x+t.w&&b.y<=t.y+t.h&&b.y+18>=t.y);if(targetHit){b.y=-100;hit(targetHit);break;}}
      bullets=bullets.filter(b=>b.y>-20);
      if(targets.some(t=>t.correct&&t.y+t.h>=H-85)){lives--;missed++;feedback('La bonne cible s’est échappée : '+mission.correct+' · une vie perdue.',true);if(lives>0)nextRound();}
      if(remaining<=0||lives<=0)finish();hud();
    }
    draw();requestAnimationFrame(frame);
  }
  $('start').onclick=begin;$('pause').onclick=()=>paused?resume():pause();$('fire').onclick=fire;
  for(const [id,key] of [['left','ArrowLeft'],['right','ArrowRight']]){
    $(id).onpointerdown=e=>{e.preventDefault();$(id).setPointerCapture(e.pointerId);keys.add(key);};
    $(id).onpointerup=$(id).onpointercancel=()=>keys.delete(key);
  }
  canvas.onpointerdown=e=>{if(!running||paused)return;const rect=canvas.getBoundingClientRect();player=Math.max(26,Math.min(W-26,(e.clientX-rect.left)*W/rect.width));fire();canvas.focus();};
  document.addEventListener('keydown',e=>{if(!running||paused||e.target.closest('button,input,summary'))return;const key=e.key.length===1?e.key.toLowerCase():e.key;if(['ArrowLeft','ArrowRight','a','d',' '].includes(key)){e.preventDefault();keys.add(key);}});
  document.addEventListener('keyup',e=>keys.delete(e.key.length===1?e.key.toLowerCase():e.key));
  window.addEventListener('blur',pause);document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
  async function load(){
    try{
      language=params.get('lang')||'en';level=params.get('level')||'niveau1';let profile='guest';
      if(!guest){
        let email=params.get('email');if(!email){const r=await fetch('/api/session'),s=await r.json();email=s.email;}
        if(!email)throw new Error('Connectez-vous ou revenez depuis votre mode invité.');
        profile=email;const r=await fetch('/api/week-game?email='+encodeURIComponent(email));const data=await r.json();if(!r.ok)throw new Error(data.error||'Chargement impossible.');
        language=data.language;level=data.level;words=data.words;
      }else words=WordSipHistory.week(profile,language,level);
      weekWords=words.slice();
      const bankResponse=await fetch('/game-practice.json');if(!bankResponse.ok)throw new Error('Vocabulaire de révision indisponible.');
      const bank=await bankResponse.json();practice=bank[language]?.[level]||bank[language]?.niveau1||[];familyPool=bank[language]?.family||[];familyPool=bank[language]?.family||[];
      const lessonResponse=await fetch('/api/learning-games/'+language);if(!lessonResponse.ok)throw new Error('Thèmes indisponibles.');
      themes=(await lessonResponse.json()).lessons.filter(l=>l.vocabulary?.length>=4);
      let studied=[];
      if(guest)studied=WordSipLessonHistory.week('guest',language,level);
      else {const r=await fetch('/api/learning-path?email='+encodeURIComponent(profile));if(r.ok){const path=await r.json();if(path.language===language)studied=path.studied||[];}}
      const ids=studied.map(l=>typeof l==='string'?l:l.id||l.lessonId);
      const learned=themes.filter(l=>ids.includes(l.id)).flatMap(l=>l.vocabulary.map(v=>({word:v.term,translation:v.translation})));
      weekWords=[...new Map([...weekWords,...learned].map(w=>[w.word,w])).values()];
      const select=$('mission-pool');
      const opt=document.createElement('option');opt.value='revision';opt.textContent='Révision variée · vocabulaire du niveau';select.append(opt);
      const familyOption=document.createElement('option');familyOption.value='family';familyOption.textContent='La famille · paires proches';
      if(familyPool.length>=4)select.append(familyOption);
      for(const theme of themes){const option=document.createElement('option');option.value=theme.id;option.textContent=theme.title;select.append(option);}
      function selectPool(){
        running=false;paused=false;keys.clear();targets=[];bullets=[];score=0;lives=3;remaining=90;hud();$('pause').disabled=true;$('targets').replaceChildren();$('overlay').hidden=false;$('review').hidden=false;
        const theme=themes.find(t=>t.id===select.value);
        words=select.value==='week'?weekWords.slice():theme?theme.vocabulary.map(v=>({word:v.term,translation:v.translation})):practice.slice();
        // Use every word once before repeating; shuffle the order for each new mission.
        words=WordSipGame.shuffle(words);
        const distractors=theme?words:practice;
        if(select.value==='family')words=familyPool.slice();
        selectedDistractors=distractors;
        feedback('Lisez les deux mots de la cible avant de tirer.');
        $('pool-note').textContent=select.value==='week'?'Mots du jour et vocabulaire des fiches réellement consultés depuis lundi. Les autres mots servent seulement de pièges.':'Entraînement libre : ces mots ne sont pas ajoutés à votre historique de consultation.';
        $('word-count').textContent=words.length+' mots dans la mission';$('word-list').replaceChildren();
        for(const word of words){const li=document.createElement('li');li.textContent=word.word+' — '+word.translation;$('word-list').append(li);}
        $('overlay-title').textContent=words.length?'Visez la bonne paire':'Pas encore de mots cette semaine';
        $('overlay-text').textContent=words.length?'Lisez les deux mots. La bonne association rapporte +10, une fausse paire coûte 5 points.':'Consultez une fiche ou votre mot du jour. Vous pouvez aussi choisir un thème de révision ci-dessus.';
        $('prompt').textContent='Prêt à viser ?';$('start').textContent='Commencer';$('start').hidden=!words.length;$('start').disabled=!words.length;
      }
      select.onchange=selectPool;
      // Sparse weekly history remains available, while free practice avoids a single repeated question.
      if(weekWords.length<4)select.value='revision';
      selectPool();
      $('language').textContent=(names[language]||language)+' · '+level.replace('niveau','niveau ');
    }catch(error){$('loading-error').textContent=error.message;$('overlay-title').textContent='Les mots ne sont pas encore disponibles';$('overlay-text').textContent='Retournez à Mon mot du jour, puis réessayez.';$('start').hidden=true;}
  }
  requestAnimationFrame(frame);load();
})();
