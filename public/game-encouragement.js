(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.WordSipEncouragement=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
  function create(){
    let successes=0,streak=0,errors=0,retry=false;
    return {answer(correct){
      if(!correct){streak=0;errors++;retry=true;return errors>=2?'Prenez votre temps : chaque essai vous aide à apprendre.':'Vous pouvez réessayer. Observez la consigne et continuez.';}
      successes++;streak++;errors=0;
      if(retry){retry=false;return 'Bonne reprise ! Vous avez trouvé après avoir réessayé.';}
      if(streak===2)return 'Deux bonnes réponses de suite : bien joué !';
      if(streak===4)return 'Belle série : quatre réponses justes !';
      if(successes===6)return 'Six réponses retrouvées : vous avancez !';
      if(streak>4&&streak%3===0)return 'Vous enchaînez les bonnes réponses, continuez !';
      return ['Bien joué, continuez !','Encore une bonne réponse !','Vous progressez dans cette série !'][(successes-1)%3];
    },stats(){return {successes,streak,errors};}};
  }
  return {create};
});
