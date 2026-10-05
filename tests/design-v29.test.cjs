const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),core=require('../public/week-game-core.js'),practice=require('../public/game-practice.json');
for(const lang of ['en','es','it','ja','zh']){
 const family=practice[lang].family;assert.ok(family.length>=6,lang);
 for(let i=0;i<family.length*2;i++){
  const r=core.pairRound(family,i,family,()=>.37);
  assert.equal(r.options.length,4);assert.equal(r.options.filter(o=>o.correct).length,1);
  assert.equal(r.pair.word,family[i%family.length].word);assert.equal(r.reverse,i>=family.length);
  assert.ok(r.options.every(o=>o.label===o.left+' / '+o.right));
  assert.equal(new Set(r.options.map(o=>o.label)).size,4);
  for(const o of r.options){const valid=family.some(w=>core.normal(r.reverse?w.word:w.translation)===core.normal(o.left)&&core.normal(r.reverse?w.translation:w.word)===core.normal(o.right));assert.equal(o.correct,valid);}
 }
}
const r=core.pairRound([{word:'Family',translation:'Famille'}],0,practice.en.family,()=>.3);
assert.equal(r.options.length,4);assert.ok(r.options.some(o=>o.label==='Famille / Family'&&o.correct));
const alias=core.pairRound([{word:'Hello',translation:'Bonjour'}],0,[{word:'Hi',translation:'Bonjour'},{word:'Bye',translation:'Au revoir'},{word:'Thanks',translation:'Merci'}],()=>.4);
assert.ok(!alias.options.some(o=>o.right==='Hi'&&!o.correct));
assert.equal(core.pairRound([],0),null);
const window={};vm.runInNewContext(fs.readFileSync(path.join(root,'public/game-visuals.js'),'utf8'),{window});
for(const key of ['inside','above','below','left','right','on','next']){
 const svg=window.WordSipVisuals.ballScene(key);assert.match(svg,/radialGradient/);assert.ok(!svg.includes('undefined'));assert.match(svg,/class="ball-token"/);
}
const inside=window.WordSipVisuals.ballScene('inside'),on=window.WordSipVisuals.ballScene('on'),above=window.WordSipVisuals.ballScene('above');
assert.ok(inside.indexOf('class="ball-token"')<inside.indexOf('<rect x="250"'));assert.ok(on.indexOf('class="ball-token"')>on.indexOf('<rect x="250"'));
assert.match(on,/cy="122"/);assert.match(above,/cy="70"/);
assert.match(window.WordSipVisuals.ballScene('start',true),/id="learning-ball"/);
for(const[theme,indices]of Object.entries({vetements:[0,1,2,3,4,5,6,7],lieux:[0,1,2,3,4,5,6,7],cuisine:[1,2,3,4,5,6],couleurs:[0,1,2,3,4,5,6,7]}))for(const i of indices){
 const picture=window.WordSipVisuals.picture(theme,i,'#e88959','Image de contrôle');assert.match(picture,/aria-label="Image de contrôle"/);assert.ok(!picture.includes('undefined'));assert.ok(picture.includes('<path')||picture.includes('<circle'));
}
console.log('PASS V29 : paires proches et uniques, famille et enfants dans les cinq langues, alternance, synonymes, parcours de tous les mots, scènes en relief et transparence.');
