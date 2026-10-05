const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),load=name=>JSON.parse(fs.readFileSync(path.join(root,'data',name),'utf8'));
const {mergeLessons}=require(path.join(root,'services/lessonContentService'));
const {selectWeekLessons,buildPath}=require(path.join(root,'services/learningPathService'));
const game=require(path.join(root,'public/learning-games-core')),verbs=require(path.join(root,'public/verb-games-core'));
const seed=load('lessons.seed.json'),additions=load('lessons.v28.json');let total=0;
for(const lang of ['en','es','it','ja','zh']){
 const merged=mergeLessons(lang,seed[lang]);assert.equal(new Set(merged.map(l=>l.id)).size,merged.length);
 assert.equal(merged.filter(l=>l.type==='vocabulary').length,6);
 for(const lesson of additions[lang]){
  assert.ok(lesson.objective&&lesson.prerequisites&&lesson.task&&lesson.note&&lesson.review);
  assert.ok(lesson.vocabulary.length>=7&&lesson.vocabulary.length<=8);assert.equal(lesson.examples.length,2);assert.equal(lesson.exercise.length,3);
  assert.equal(new Set(lesson.vocabulary.map(v=>v.term)).size,lesson.vocabulary.length);
  for(const v of lesson.vocabulary){assert.ok(v.term&&v.translation);if(['ja','zh'].includes(lang))assert.ok(v.reading);}
  for(const q of lesson.exercise){assert.ok(q.correctIndex>=0&&q.correctIndex<q.options.length);assert.equal(new Set(q.options).size,q.options.length);assert.ok(q.feedbackOk&&q.feedbackKo);}
  total++;
 }
 const kept=mergeLessons(lang,[{id:'custom',title:'Contenu personnalisé'}]);assert.equal(kept[0].title,'Contenu personnalisé');
}
assert.equal(total,30);
assert.equal(mergeLessons('en',seed.en).filter(l=>l.id==='couleurs').length,1);
assert.match(mergeLessons('es',seed.es).find(l=>l.id==='plurales').sections[0].rule,/cafés/);
assert.ok(mergeLessons('en',seed.en).find(l=>l.id==='prepositions-place').sections.find(s=>s.title==='next to').rule.includes('sans obligation'));
for(const[key,[x,y]]of Object.entries(game.positions)){
 assert.equal(game.placement(key,x,y),true);assert.equal(game.placement(key,10,10),false);
 for(const[other,[a,b]]of Object.entries(game.positions))if(other!==key)assert.equal(game.placement(key,a,b),false,key+' / '+other);
}
assert.equal(game.placement('next',210,200),true);assert.equal(game.placement('unknown',0,0),false);assert.equal(game.placement('on',NaN,0),false);
assert.equal(game.points(0,false),-5);assert.equal(game.points(-5,true),5);assert.equal(game.matches('a','a'),true);assert.equal(game.matches('a','b'),false);
for(const lang of ['es','it'])for(let i=0;i<36;i++){
 const r=verbs.presentRound(lang,i,'niveau2');assert.ok(r.person&&r.answer);assert.equal(verbs.accepts(r.answer,[r.answer]),true);
 if(r.ending)assert.equal(r.stem+r.ending,r.answer);
}
assert.equal(verbs.accepts(' È ',['è']),true);assert.equal(verbs.accepts('e',['è']),false);
assert.equal(verbs.accepts(' SOY ',['soy']),true);assert.equal(verbs.accepts('went',['gone']),false);
assert.equal(verbs.presentRound('zh',0),null);
const now=new Date(2026,0,1,12),history=[{lessonId:'couleurs',language:'en',level:'niveau1',seenAt:new Date(2025,11,29,9)},{lessonId:'old',language:'en',level:'niveau1',seenAt:new Date(2025,11,28)},{lessonId:'future',language:'en',level:'niveau1',seenAt:new Date(2026,0,2)},{lessonId:'foreign',language:'it',level:'niveau1',seenAt:now},{lessonId:'advanced',language:'en',level:'niveau3',seenAt:now}];
assert.deepEqual(selectWeekLessons(history,'en','niveau1',now),['couleurs']);
const lessons=mergeLessons('en',seed.en),begin=buildPath(lessons,['couleurs'],0,'niveau1');
assert.equal(begin.difficulty.pairs,4);assert.ok(begin.recommendations.some(r=>r.game==='matching'));assert.ok(begin.recommendations.some(r=>r.game==='images'));assert.ok(begin.recommendations.some(r=>r.game==='listening'));assert.ok(!begin.recommendations.some(r=>r.game==='ball'||r.game==='verbs'||r.game==='odd'||r.game==='weekly'));
const advanced=buildPath(lessons,['couleurs','quotidien-vetements','quotidien-positions','__irregular_verbs__'],3,'niveau3');assert.equal(advanced.difficulty.pairs,8);for(const type of ['ball','verbs','odd','weekly'])assert.ok(advanced.recommendations.some(r=>r.game===type));
assert.deepEqual(buildPath(lessons,[],0,'niveau1').recommendations,[]);
let saved='[]';const window={};vm.runInNewContext(fs.readFileSync(path.join(root,'public/learning-history.js'),'utf8'),{window,Date,localStorage:{getItem:()=>saved,setItem:(k,v)=>saved=v}});
window.WordSipLessonHistory.record({language:'en',level:'niveau1',lessonId:'couleurs'},now);window.WordSipLessonHistory.record({language:'en',level:'niveau1',lessonId:'couleurs'},now);assert.equal(JSON.parse(saved).length,1);assert.equal(window.WordSipLessonHistory.week('guest','en','niveau1',now).length,1);assert.equal(window.WordSipLessonHistory.week('guest','it','niveau1',now).length,0);
console.log('PASS : 30 fiches / 5 langues, 90 exercices cohérents, corrections, base conservée, positions distinctes, associations, conjugaisons, accents, parcours réel hebdomadaire selon niveau, dédoublonnage invité.');
