(() => {
  const key='wordsip_lessons_v1';
  function read(){try{const value=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(value)?value:[];}catch{return[];}}
  function record({profile='guest',language,level,lessonId},now=new Date()){
    if(!lessonId)return;const rows=read(),day=now.toISOString().slice(0,10);
    if(rows.some(r=>r.profile===profile&&r.language===language&&r.level===level&&r.lessonId===lessonId&&String(r.seenAt).slice(0,10)===day))return;
    rows.push({profile,language,level,lessonId,seenAt:now.toISOString()});try{localStorage.setItem(key,JSON.stringify(rows.filter(r=>new Date(r.seenAt)>=now.getTime()-90*86400000).slice(-1000)));}catch{}
  }
  function week(profile,language,level,now=new Date()){
    const start=new Date(now);start.setHours(0,0,0,0);start.setDate(start.getDate()-((start.getDay()+6)%7));
    return [...new Set(read().filter(r=>r.profile===profile&&r.language===language&&r.level===level&&new Date(r.seenAt)>=start&&new Date(r.seenAt)<=now).map(r=>r.lessonId))];
  }
  window.WordSipLessonHistory={record,week};
})();
