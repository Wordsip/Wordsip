const {weekStart}=require('./weekGameService');
const difficulties={niveau1:{pairs:4,oddOptions:4,positions:['inside','on','above','below']},niveau2:{pairs:6,oddOptions:6,positions:['inside','on','above','below','left','right','next']},niveau3:{pairs:8,oddOptions:8,positions:['inside','on','above','below','left','right','next']}};
function selectWeekLessons(history,language,level,now=new Date()){
  const start=weekStart(now).getTime(),end=now.getTime(),ids=new Set();
  for(const row of history||[]){const date=new Date(row.seenAt).getTime();if(row.language===language&&row.level===level&&date>=start&&date<=end&&row.lessonId)ids.add(row.lessonId);}
  return [...ids];
}
function buildPath(lessons,studiedIds,wordCount,level){
  const studied=lessons.filter(l=>studiedIds.includes(l.id)),vocabulary=studied.filter(l=>l.type==='vocabulary'&&!l.id.includes('positions'));
  const recommendations=vocabulary.map(l=>({game:'matching',lessonId:l.id,title:'Relier les mots : '+l.title.split(' — ')[0],reason:'Après la fiche que vous avez consultée cette semaine.'}));
  for(const l of vocabulary){
    recommendations.push({game:'listening',lessonId:l.id,title:'Écouter et écrire : '+l.title.split(' — ')[0],reason:'Réutiliser le vocabulaire de cette fiche.'});
    if(!l.id.includes('heures'))recommendations.push({game:'images',lessonId:l.id,title:'Images : '+l.title.split(' — ')[0],reason:'Associer vos mots étudiés aux images.'});
  }
  if(studied.some(l=>['prepositions-place','preposiciones-lugar','preposizioni-luogo','quotidien-positions'].includes(l.id)))recommendations.push({game:'ball',title:'Placer la balle',reason:'Après votre fiche sur les positions et prépositions de lieu.'});
  if(vocabulary.filter(l=>!l.id.includes('heures')).length>=2)recommendations.push({game:'odd',lessonIds:vocabulary.map(l=>l.id),title:'Trouver le mot intrus',reason:'Comparer les thèmes déjà consultés cette semaine.'});
  if(studiedIds.includes('__irregular_verbs__')||studied.some(l=>['presente','present-simple'].includes(l.id)))recommendations.push({game:'verbs',title:'L’atelier des verbes',reason:'Après votre fiche de conjugaison ou de verbes irréguliers.'});
  if(wordCount>0)recommendations.push({game:'weekly',title:'Mission de la semaine',reason:`Réviser les ${wordCount} mot(s) du jour réellement consultés cette semaine.`});
  return {level,difficulty:difficulties[level]||difficulties.niveau1,studied:[...studied.map(l=>({id:l.id,title:l.title})),...(studiedIds.includes('__irregular_verbs__')?[{id:'__irregular_verbs__',title:'Verbes irréguliers'}]:[])],recommendations};
}
module.exports={difficulties,selectWeekLessons,buildPath};
