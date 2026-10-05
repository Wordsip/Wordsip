(() => {
 const games=[['matching','🔗','Mots à relier'],['ball','🔴','La balle'],['odd','🔎','Intrus'],['verbs','🧩','Verbes'],['images','🖼️','Images'],['listening','🎧','Écouter'],['kart','🏎️','Kart'],['house','🏠','Maison'],['body','🧍','Corps'],['billiards','🎱','Billard'],['parking','🚌','Parking'],['weekly','🚀','Mission']];
 const current=location.pathname==='/jeu-semaine'?'weekly':location.pathname.split('/')[2];
 if(!current)return;document.body.classList.add('game-focus');document.body.dataset.game=current;
 const rail=document.createElement('aside');rail.className='games-rail';rail.setAttribute('aria-label','Changer de jeu');
 const update=()=>{const q=new URLSearchParams(location.search);const lang=document.getElementById('games-language');if(lang)q.set('lang',lang.value);const dir=document.getElementById('games-direction');if(dir)q.set('direction',dir.value);const theme=document.getElementById('games-theme');if(theme?.value)q.set('theme',theme.value);
 rail.replaceChildren();for(const [id,icon,title]of games){const a=document.createElement('a');a.href=(id==='weekly'?'/jeu-semaine':'/jeux/'+id)+'?'+q.toString();a.title=title;a.setAttribute('aria-label',title);if(id===current)a.setAttribute('aria-current','page');a.innerHTML='<span>'+icon+'</span><small>'+title+'</small>';rail.append(a);}};
 document.body.prepend(rail);update();document.querySelector('.games-settings')?.addEventListener('change',update);
 let pending=false;const fit=()=>{if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;const scene=document.querySelector('.parking-motion-scene,#kart-road,.ball-scene');if(!scene)return;const h=scene.getBoundingClientRect().height,overhead=(document.querySelector('.games-page')?.getBoundingClientRect().bottom+scrollY||document.documentElement.scrollHeight)-h;const available=Math.max(140,Math.floor(innerHeight-overhead-12));document.body.style.setProperty('--scene-height',available+'px');});};
 new MutationObserver(fit).observe(document.getElementById('game-area')||document.body,{childList:true});window.addEventListener('resize',fit);fit();
 document.title=(games.find(g=>g[0]===current)?.[2]||'Jeux')+' — WordSip';
})();
