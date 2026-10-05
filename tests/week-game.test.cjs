const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const {selectWeekWords,weekStart}=require(path.join(root,'services/weekGameService'));
const game=require(path.join(root,'public/week-game-core'));
const {getGlossary}=require(path.join(root,'services/vocabularyHelpService'));
const now=new Date(2026,0,1,12),monday=weekStart(now);
assert.equal(monday.getFullYear(),2025);assert.equal(monday.getMonth(),11);assert.equal(monday.getDate(),29);
const row=(word,seenAt,language='en',level='niveau1')=>({word,translation:word+' FR',seenAt,language,level});
const history=[row('seen',new Date(2025,11,29,9)),row('seen',new Date(2025,11,30,9)),row('old',new Date(2025,11,28,23)),row('future',new Date(2026,0,2)),row('otra',now,'es'),row('advanced',now,'en','niveau3'),row('bad','invalid')];
assert.deepEqual(selectWeekWords(history,'en','niveau1',now),[{word:'seen',translation:'seen FR'}]);
assert.deepEqual(selectWeekWords([],'en','niveau1',now),[]);
const pairs=[{word:'Hello',translation:'Bonjour'},{word:'Thanks',translation:'Merci'},{word:'Goodbye',translation:'Au revoir'}];
for(let i=0;i<20;i++){
 const r=game.round(pairs,i);assert.equal(r.reverse,i%2===1);assert.ok(r.options.some(o=>o.correct));assert.equal(new Set(r.options.map(o=>o.label)).size,r.options.length);
 assert.equal(r.prompt,r.reverse?r.pair.translation:r.pair.word);
}
assert.equal(game.round([],0),null);assert.equal(game.round([pairs[0]],0).options.length,2);
for(const bank of [pairs,pairs.slice(0,2)])for(let i=0;i<bank.length;i++){
 assert.equal(game.round(bank,i*2).pair.word,bank[i].word);
 assert.equal(game.round(bank,i*2+1).pair.word,bank[i].word);
}
assert.equal(game.scoreHit(0,true),10);assert.equal(game.scoreHit(10,false),5);assert.equal(game.scoreHit(0,false),-5);
const synonyms=[{word:'Hello',translation:'Bonjour'},{word:'Hi',translation:'Bonjour'}];
assert.equal(game.round(synonyms,1).options.filter(o=>o.correct).length,2);
for(const language of ['en','es','it','ja','zh']){const glossary=getGlossary(language);assert.ok(glossary.length>40);assert.ok(glossary.every(e=>e.term&&e.translation));console.log(language,glossary.length,'définitions');}
assert.throws(()=>getGlossary('xx'));
assert.ok(getGlossary('en').some(e=>e.term.toLowerCase()==='before'&&e.translation.includes('avant')));
console.log('PASS : semaine ISO à cheval sur deux années, vues réelles, niveaux/langues, doublons, futur exclu, jeu bilingue, score et homonymes, cinq glossaires.');
