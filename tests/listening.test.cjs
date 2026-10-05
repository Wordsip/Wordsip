const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(path.join(__dirname,'../public/learning-games.js'),'utf8');
const code=source.slice(source.indexOf('  function renderListening(){'),source.indexOf('  async function renderVerbs(){'));
const verbs=require('../public/verb-games-core.js');
function fixture(level='niveau1',word={term:'blue',translation:'bleu'}){
 const elements={};for(const id of ['game-area','game-instructions','sound-status','sound-check','sound-play','sound-answer'])elements[id]={textContent:'',innerHTML:'',value:'',disabled:id==='sound-check'};
 const scores=[],messages=[],audios=[];
 const sandbox={roundIndex:0,difficulty:{pairs:4},audioOverride:null,language:'en',level,gameGeneration:1,activeAudio:null,WordSipVerbs:verbs,
  $:id=>elements[id],currentLesson:()=>({vocabulary:[word]}),result:()=>{},updateScore:x=>scores.push(x),feedback:(s,c)=>messages.push({s,c}),next:()=>{},encodeURIComponent,
  Audio:function(url){this.url=url;this.pause=()=>{};this.play=()=>Promise.resolve();audios.push(this);}};
 vm.createContext(sandbox);vm.runInContext(code+'\nrenderListening();',sandbox);return{elements,scores,messages,audios,sandbox};
}
const f=fixture();assert(!f.elements['game-area'].innerHTML.includes('blue'));assert(!f.elements['game-area'].innerHTML.includes('bleu'));assert.equal(f.elements['sound-check'].disabled,true);
f.elements['sound-answer'].value='blue';f.elements['sound-check'].onclick();assert.equal(f.scores.length,0);
f.elements['sound-play'].onclick();assert.equal(f.audios.length,1);assert(f.audios[0].url.includes('text=blue&lang=en'));
f.audios[0].onplaying();assert.equal(f.elements['sound-check'].disabled,false);
f.elements['sound-check'].onclick();assert.deepEqual(f.scores,[true]);assert(f.messages[0].s.includes('blue — bleu'));assert(f.elements['sound-answer'].disabled);
f.elements['sound-check'].onclick();assert.equal(f.scores.length,1);
const wrong=fixture();wrong.elements['sound-play'].onclick();wrong.audios[0].onplaying();wrong.elements['sound-answer'].value='red';wrong.elements['sound-check'].onclick();assert.deepEqual(wrong.scores,[false]);
const fail=fixture();fail.elements['sound-play'].onclick();fail.audios[0].onerror();assert.equal(fail.elements['sound-check'].disabled,true);assert.equal(fail.scores.length,0);
const stale=fixture();stale.elements['sound-play'].onclick();stale.sandbox.gameGeneration++;stale.audios[0].onplaying();assert.equal(stale.elements['sound-check'].disabled,true);
for(const level of ['niveau1','niveau2']){const j=fixture(level,{term:'赤',translation:'rouge',reading:'aka'});j.elements['sound-play'].onclick();j.audios[0].onplaying();j.elements['sound-answer'].value='aka';j.elements['sound-check'].onclick();assert.equal(j.scores[0],level==='niveau1');}
console.log('PASS : jeu audio, mot caché, lecture préalable, bonne/mauvaise réponse, panne sans pénalité, événements périmés et écriture adaptée au niveau (audio simulé).');
