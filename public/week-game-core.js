(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.WordSipGame=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const normal=text=>String(text).normalize('NFC').trim().toLocaleLowerCase();
  function shuffle(values,random=Math.random){const a=values.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
  function round(words,index=0,random=Math.random){
    const clean=[...new Map(words.filter(w=>w.word&&w.translation).map(w=>[normal(w.word),w])).values()];
    if(!clean.length)return null;
    const pair=clean[Math.floor(index/2)%clean.length],reverse=index%2===1;
    const prompt=reverse?pair.translation:pair.word;
    const correct=reverse?pair.word:pair.translation;
    const labels=[...new Set(clean.map(w=>reverse?w.word:w.translation))];
    const wrong=shuffle(labels.filter(label=>normal(label)!==normal(correct)),random).slice(0,3);
    if(!wrong.length)wrong.push(prompt);
    const options=shuffle([correct,...wrong],random).map(label=>({label,correct:reverse?clean.some(w=>normal(w.word)===normal(label)&&normal(w.translation)===normal(prompt)):normal(label)===normal(correct)}));
    return {prompt,correct,reverse,options,pair};
  }
  function scoreHit(score,correct){return score+(correct?10:-5);}
  /* ----- Paquet de mots : aucun mot ne revient avant que tous soient sortis ----- */
  const pairKey=w=>normal(w.word)+'|'+normal(w.translation);
  function createDeck(weekWords,poolWords,random=Math.random){
    const seen=new Set(),uniq=(list,fromWeek)=>(list||[]).filter(w=>w&&w.word&&w.translation&&!seen.has(pairKey(w))&&seen.add(pairKey(w))).map(w=>({...w,fromWeek}));
    const week=uniq(weekWords,true),pool=uniq(poolWords,false);let bag=[],last=null;
    const refill=()=>{
      const a=shuffle(week,random),b=shuffle(pool,random),out=[];
      while(a.length||b.length){if(a.length)out.push(a.shift());if(b.length&&(!a.length||random()<.65))out.push(b.shift());}
      if(last&&out.length>1&&pairKey(out[0])===pairKey(last))out.push(out.shift());
      bag=out;
    };
    return {all:[...week,...pool],weekSize:week.length,size:week.length+pool.length,next(){if(!bag.length)refill();last=bag.shift();return last;}};
  }
  /* Une manche : mot à traduire, bonne réponse et intrus (mots proches du même thème d'abord). */
  function buildRound(deck,index=0,options={}){
    const random=options.random||Math.random,decoys=Math.max(1,options.decoys||3);
    if(!deck||!deck.size)return null;
    const pair=deck.next(),reverse=index%2===1,prompt=reverse?pair.translation:pair.word,correct=reverse?pair.word:pair.translation;
    const labelOf=w=>reverse?w.word:w.translation,isCorrect=label=>deck.all.some(w=>reverse?normal(w.word)===normal(label)&&normal(w.translation)===normal(prompt):normal(w.word)===normal(prompt)&&normal(w.translation)===normal(label));
    const others=deck.all.filter(w=>pairKey(w)!==pairKey(pair)),near=others.filter(w=>w.theme&&w.theme===pair.theme),far=others.filter(w=>!(w.theme&&w.theme===pair.theme));
    const used=new Set([normal(correct)]),wrong=[];
    for(const w of [...shuffle(near,random),...shuffle(far,random)]){
      const label=labelOf(w);if(used.has(normal(label))||isCorrect(label))continue;
      used.add(normal(label));wrong.push({label,theme:w.theme||''});if(wrong.length>=decoys)break;
    }
    if(!wrong.length)wrong.push({label:prompt,theme:''});
    const list=shuffle([{label:correct,correct:true},...wrong.map(w=>({label:w.label,correct:isCorrect(w.label),intruder:true}))],random);
    return {prompt,correct,reverse,options:list,pair,example:pair.example||null};
  }
  return {normal,shuffle,round,scoreHit,createDeck,buildRound};
});
