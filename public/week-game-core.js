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
  // A pair is true when both sides belong together, including alternate translations.
  function pairRound(words,index=0,distractors=words,random=Math.random,reverseOverride){
    const clean=[...new Map(words.filter(w=>w.word&&w.translation).map(w=>[normal(w.word)+'|'+normal(w.translation),w])).values()];
    if(!clean.length)return null;
    const pair=clean[index%clean.length],reverse=typeof reverseOverride==='boolean'?reverseOverride:Math.floor(index/clean.length)%2===1;
    const pool=[...clean,...distractors].filter(w=>w.word&&w.translation);
    const prompt=reverse?pair.word:pair.translation,correct=reverse?pair.translation:pair.word;
    const valid=new Set(pool.filter(w=>normal(reverse?w.word:w.translation)===normal(prompt)).map(w=>normal(reverse?w.translation:w.word)));
    const candidates=[...new Map(pool.map(w=>[normal(reverse?w.translation:w.word),reverse?w.translation:w.word])).values()];
    const tokens=value=>normal(value).split(/[^\p{L}]+/u).filter(t=>t.length>2);
    const related=value=>tokens(value).filter(t=>tokens(correct).includes(t)).length;
    const wrong=shuffle(candidates.filter(v=>!valid.has(normal(v))),random).sort((a,b)=>related(b)-related(a)).slice(0,3);
    const options=shuffle([correct,...wrong],random).map(value=>({left:prompt,right:value,label:prompt+' / '+value,correct:valid.has(normal(value))}));
    return {prompt,correct,reverse,options,pair};
  }
  function scoreHit(score,correct){return score+(correct?10:-5);}
  return {normal,shuffle,round,pairRound,scoreHit};
});
