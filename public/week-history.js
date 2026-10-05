(() => {
  const KEY='wordsip_views_v1';
  function read(){try{const value=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(value)?value:[];}catch{return [];}}
  function record({profile='guest',language,level,word,translation},now=new Date()){
    if(!word||!translation)return;
    const rows=read(),day=now.toISOString().slice(0,10);
    if(rows.some(r=>r.profile===profile&&r.language===language&&r.level===level&&r.word===word&&String(r.seenAt).slice(0,10)===day))return;
    rows.push({profile,language,level,word,translation,seenAt:now.toISOString()});
    try{localStorage.setItem(KEY,JSON.stringify(rows.filter(r=>new Date(r.seenAt).getTime()>=now.getTime()-90*86400000).slice(-1000)));}catch{}
  }
  function week(profile,language,level,now=new Date()){
    const monday=new Date(now);monday.setHours(0,0,0,0);monday.setDate(monday.getDate()-((monday.getDay()+6)%7));
    const seen=new Map();
    for(const r of read())if(r.profile===profile&&r.language===language&&r.level===level&&new Date(r.seenAt)>=monday&&new Date(r.seenAt)<=now)seen.set(r.word,{word:r.word,translation:r.translation});
    return [...seen.values()];
  }
  window.WordSipHistory={record,week};
})();
