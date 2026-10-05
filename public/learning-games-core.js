(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.WordSipLearningGames=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const positions={inside:[320,200],above:[320,70],below:[320,315],left:[155,200],right:[485,200],on:[320,122],next:[430,200]};
  function matches(a,b){return String(a)===String(b);}
  function placement(key,x,y){const target=positions[key];if(!target||!Number.isFinite(x)||!Number.isFinite(y))return false;return Math.hypot(x-target[0],y-target[1])<=24||(key==='next'&&Math.hypot(x-210,y-200)<=24);}
  function points(score,correct){return score+(correct?10:-5);}
  function shuffle(array,random=Math.random){const result=array.slice();for(let i=result.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}return result;}
  return{positions,matches,placement,points,shuffle};
});
