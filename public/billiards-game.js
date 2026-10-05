(() => {
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const labels={verbe:'Verbe',nom:'Nom',sujet:'Sujet',adjectif:'Adjectif'};
  let dispose=()=>{};
  async function mount(options){
    dispose();let alive=true,index=0,locked=false,drag=null,timer=null,selected=false;
    const root=document.getElementById('game-area');
    dispose=()=>{alive=false;clearTimeout(timer);};
    root.innerHTML='<p>Préparation du billard…</p>';
    const response=await fetch('/billiards-vocabulary.json');if(!response.ok)throw Error('Le vocabulaire du billard est indisponible.');
    const data=await response.json();if(!alive||!options.isActive())return;
    const rounds=WordSipLearningGames.shuffle(data[options.language]||data.en);
    document.getElementById('game-instructions').textContent='Glissez la boule dans le trou correspondant au mot en gras dans la phrase. Au clavier : sélectionnez la boule, puis un trou. La catégorie dépend de la phrase.';
    function prepare(){
      locked=false;selected=false;const q=rounds[index],reverse=false,word=reverse?q.frenchWord:q.word,sentence=reverse?q.frenchSentence:q.sentence;
      const position=sentence.indexOf(word);const context=esc(sentence.slice(0,position))+'<strong>'+esc(word)+'</strong>'+esc(sentence.slice(position+word.length));
      root.innerHTML=`<div class="billiards-context"><span>Boule ${index+1} / ${rounds.length} · ${reverse?'Français':'Langue apprise'}</span><h3>${context}</h3></div><div class="billiards-table"><div class="pool-felt"></div>${Object.entries(labels).map(([key,label],i)=>`<button type="button" class="pool-pocket pocket-${i}" data-pocket="${key}" aria-label="Trou ${label}"><span aria-hidden="true"></span><strong>${label}</strong></button>`).join('')}<button class="pool-ball" type="button" aria-label="Déplacer la boule ${esc(word)}"><span>${esc(word)}</span></button><div class="pool-cue" aria-hidden="true"></div></div><p class="pool-hint">Verbe : action ou état · Nom : personne, animal, objet… · Sujet : ici, le pronom qui indique de qui on parle · Adjectif : caractérise un nom.</p><details class="adventure-help"><summary>Afficher le sens et l’explication</summary><p>${esc(q.word)} — ${esc(q.frenchWord)}. Sujet est une fonction ; nom, verbe et adjectif sont des classes de mots. Dans ce jeu, les boules « sujet » sont des pronoms sujets.${options.language==='ja'?' En japonais, は marque ici le thème de la phrase ; nous le rapprochons du sujet pour ces exemples simples.':''}</p></details><button id="pool-next" type="button" hidden>Boule suivante</button>`;
      const ball=root.querySelector('.pool-ball'),table=root.querySelector('.billiards-table');
      const home=()=>{ball.style.left='50%';ball.style.top='54%';ball.classList.remove('rolling','dragging');};
      function shoot(pocket){
        if(locked||!alive)return;locked=true;selected=false;
        const correct=pocket.dataset.pocket===q.category,pr=pocket.getBoundingClientRect(),tr=table.getBoundingClientRect();
        ball.classList.remove('dragging');ball.classList.add('rolling');ball.style.left=(pr.left+pr.width/2-tr.left)+'px';ball.style.top=(pr.top+pr.height/2-tr.top)+'px';
        timer=setTimeout(()=>{if(!alive||!options.isActive())return;options.onAnswer(correct);
          if(correct){ball.disabled=true;ball.classList.add('sunk');options.feedback('Bonne catégorie ! '+word+' : '+labels[q.category]+'. +10.');root.querySelector('#pool-next').hidden=false;}
          else{home();locked=false;options.feedback('Ce trou ne correspond pas au mot dans cette phrase. −5. Reprenez la boule et essayez un autre trou.',false);}
        },360);
      }
      ball.onclick=()=>{if(!locked){selected=true;ball.classList.add('selected');options.feedback('Boule sélectionnée : choisissez un trou.');}};
      ball.onpointerdown=e=>{if(locked||e.button>0)return;e.preventDefault();drag={id:e.pointerId,x:e.clientX,y:e.clientY,moved:false};ball.setPointerCapture(e.pointerId);};
      ball.onpointermove=e=>{if(!drag||drag.id!==e.pointerId)return;if(!drag.moved&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<6)return;drag.moved=true;const r=table.getBoundingClientRect();ball.classList.add('dragging');ball.style.left=Math.max(0,Math.min(r.width,e.clientX-r.left))+'px';ball.style.top=Math.max(0,Math.min(r.height,e.clientY-r.top))+'px';};
      ball.onpointerup=e=>{if(!drag)return;const moved=drag.moved;drag=null;if(ball.hasPointerCapture(e.pointerId))ball.releasePointerCapture(e.pointerId);if(!moved)return;const pocket=[...root.querySelectorAll('[data-pocket]')].find(p=>{const r=p.getBoundingClientRect();return e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom;});if(pocket)shoot(pocket);else home();};
      ball.onpointercancel=e=>{drag=null;if(ball.hasPointerCapture(e.pointerId))ball.releasePointerCapture(e.pointerId);home();};
      root.querySelectorAll('[data-pocket]').forEach(p=>p.onclick=()=>{if(selected)shoot(p);else options.feedback('Saisissez la boule et glissez-la dans un trou, ou sélectionnez-la d’abord au clavier.');});
      root.querySelector('#pool-next').onclick=()=>{if(++index===rounds.length){root.innerHTML='<div class="game-result"><strong>Table terminée !</strong><p>Vous avez classé les huit mots en tenant compte de leur phrase.</p></div>';}else{options.feedback('');prepare();}};
    }
    prepare();if(!options.pageView)root.closest('#game-panel').scrollIntoView({block:'start',behavior:'instant'});else window.scrollTo(0,0);
  }
  window.WordSipBilliards={mount,dispose:()=>dispose()};
})();
