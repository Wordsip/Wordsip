(() => {
  'use strict';
  const $=id=>document.getElementById(id),canvas=$('arena'),ctx=canvas.getContext('2d');
  const W=canvas.width=Math.min(900,Math.max(320,Math.floor(canvas.parentElement.clientWidth))),H=canvas.height=Math.min(480,Math.max(340,Math.floor(window.innerHeight*.48)));
  const params=new URLSearchParams(location.search),guest=params.get('guest')==='true';
  const names={en:'Anglais',es:'Espagnol',it:'Italien',ja:'Japonais',zh:'Chinois'};
  let words=[],running=false,paused=false,score=0,lives=3,remaining=90,roundIndex=0,targets=[],bullets=[],player=W/2,last=0,elapsed=0,shotAt=-1,hits=0,errors=0,missed=0;
  const keys=new Set();let mission=null;
  $('back').href='/mot-du-jour'+location.search;$('grammar').href='/grammaire'+location.search;
  function feedback(text,bad=false){$('feedback').textContent=text;$('feedback').className='feedback '+(bad?'bad':'good');}
  function hud(){$('score').textContent=score;$('lives').textContent=lives;$('time').textContent=Math.max(0,Math.ceil(remaining))+' s';}
  function nextRound(){
    mission=WordSipGame.round(words,roundIndex++);
    $('direction').textContent=mission.reverse?'Retrouvez le mot dans la langue étudiée':'Retrouvez la traduction française';$('prompt').textContent=mission.prompt;
    const count=mission.options.length,columns=W<600?Math.min(2,count):count,width=Math.min(205,(W-40)/columns-12);
    targets=mission.options.map((o,i)=>({...o,x:20+(W-40)/columns*(i%columns+.5)-width/2,y:25+Math.floor(i/columns)*95,w:width,h:82,baseX:20+(W-40)/columns*(i%columns+.5)-width/2}));bullets=[];
    $('targets').replaceChildren();targets.forEach(t=>{const b=document.createElement('button');b.type='button';b.textContent=t.label;b.setAttribute('aria-label','Tirer sur '+t.label);b.onclick=()=>{if(running&&!paused)hit(t);};t.button=b;$('targets').append(b);});
  }
  function begin(){
    if(paused&&running){resume();return;}
    if(!words.length)return;
    score=0;lives=3;remaining=90;roundIndex=0;hits=0;errors=0;missed=0;elapsed=0;shotAt=-1;player=W/2;keys.clear();running=true;paused=false;
    $('review').open=false;$('review').hidden=true;$('overlay').hidden=true;$('pause').disabled=false;$('pause').textContent='Pause';feedback('Visez une cible, puis tirez.');nextRound();hud();canvas.focus();
  }
  function hit(target){
    if(!targets.includes(target)||!running||paused)return;
    score=WordSipGame.scoreHit(score,target.correct);
    if(target.correct){hits++;feedback('Bien joué ! '+mission.pair.word+' = '+mission.pair.translation+' · +10');nextRound();}
    else{errors++;feedback('Mauvaise cible : '+target.label+' · −5. Cherchez encore la traduction de « '+mission.prompt+' ».',true);targets=targets.filter(t=>t!==target);target.button.disabled=true;}
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
    ctx.fillStyle='#071323';ctx.fillRect(0,0,W,H);
    ctx.fillStyle='#5d799955';for(let i=0;i<55;i++){const x=(i*157+59)%W,y=(i*79+elapsed*8)%H;ctx.fillRect(x,y,2,2);}
    ctx.strokeStyle='#1f526066';ctx.beginPath();ctx.moveTo(0,H-85);ctx.lineTo(W,H-85);ctx.stroke();
    for(const target of targets){ctx.fillStyle='#173854';ctx.strokeStyle='#70cfc9';ctx.lineWidth=2;ctx.fillRect(target.x,target.y,target.w,target.h);ctx.strokeRect(target.x,target.y,target.w,target.h);const font='600 17px Segoe UI, Arial, sans-serif',lines=wrap(target.label,target.w-18,font);ctx.fillStyle='#eefbff';ctx.textAlign='center';ctx.textBaseline='middle';lines.forEach((line,i)=>ctx.fillText(line,target.x+target.w/2,target.y+target.h/2+(i-(lines.length-1)/2)*20,target.w-16));}
    ctx.fillStyle='#ffba81';for(const b of bullets)ctx.fillRect(b.x-2,b.y,4,18);
    ctx.fillStyle='#83e5ce';ctx.beginPath();ctx.moveTo(player,H-57);ctx.lineTo(player-23,H-23);ctx.lineTo(player,H-31);ctx.lineTo(player+23,H-23);ctx.closePath();ctx.fill();
    ctx.fillStyle='#faaf79';ctx.fillRect(player-5,H-25,10,14);
  }
  function frame(time){
    const dt=Math.min(.05,(time-last)/1000||0);last=time;
    if(running&&!paused){
      elapsed+=dt;remaining-=dt;
      if(keys.has('ArrowLeft')||keys.has('a'))player-=430*dt;if(keys.has('ArrowRight')||keys.has('d'))player+=430*dt;player=Math.max(26,Math.min(W-26,player));if(keys.has(' '))fire();
      for(const t of targets){t.y+=(22+Math.min(25,roundIndex*1.4))*dt;t.x=t.baseX+Math.sin(elapsed*1.4)*12;}
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
      let language=params.get('lang')||'en',level=params.get('level')||'niveau1',profile='guest';
      if(!guest){
        let email=params.get('email');if(!email){const r=await fetch('/api/session'),s=await r.json();email=s.email;}
        if(!email)throw new Error('Connectez-vous ou revenez depuis votre mode invité.');
        profile=email;const r=await fetch('/api/week-game?email='+encodeURIComponent(email));const data=await r.json();if(!r.ok)throw new Error(data.error||'Chargement impossible.');
        language=data.language;level=data.level;words=data.words;
      }else words=WordSipHistory.week(profile,language,level);
      $('language').textContent=(names[language]||language)+' · mots consultés depuis lundi';$('word-count').textContent=words.length+' mot(s)';
      for(const word of words){const li=document.createElement('li');li.textContent=word.word+' — '+word.translation;$('word-list').append(li);}
      if(!words.length){$('overlay-title').textContent='Votre semaine commence ici';$('overlay-text').textContent='Consultez votre mot du jour, puis revenez jouer. Seuls les mots réellement vus depuis lundi sont ajoutés.';$('start').hidden=true;return;}
      $('prompt').textContent='Prêt à viser ?';$('start').disabled=false;
    }catch(error){$('loading-error').textContent=error.message;$('overlay-title').textContent='Les mots ne sont pas encore disponibles';$('overlay-text').textContent='Retournez à Mon mot du jour, puis réessayez.';$('start').hidden=true;}
  }
  requestAnimationFrame(frame);load();
})();
