(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.WordSipVerbs=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const tables={
    es:[
      {base:'hablar',translation:'parler',stem:'habl',endings:['o','as','a','amos','áis','an'],forms:['hablo','hablas','habla','hablamos','habláis','hablan']},
      {base:'comer',translation:'manger',stem:'com',endings:['o','es','e','emos','éis','en'],forms:['como','comes','come','comemos','coméis','comen']},
      {base:'vivir',translation:'vivre',stem:'viv',endings:['o','es','e','imos','ís','en'],forms:['vivo','vives','vive','vivimos','vivís','viven']},
      {base:'ser',translation:'être',forms:['soy','eres','es','somos','sois','son']},
      {base:'tener',translation:'avoir',forms:['tengo','tienes','tiene','tenemos','tenéis','tienen']},
      {base:'ir',translation:'aller',forms:['voy','vas','va','vamos','vais','van']}
    ],
    it:[
      {base:'parlare',translation:'parler',stem:'parl',endings:['o','i','a','iamo','ate','ano'],forms:['parlo','parli','parla','parliamo','parlate','parlano']},
      {base:'prendere',translation:'prendre',stem:'prend',endings:['o','i','e','iamo','ete','ono'],forms:['prendo','prendi','prende','prendiamo','prendete','prendono']},
      {base:'dormire',translation:'dormir',stem:'dorm',endings:['o','i','e','iamo','ite','ono'],forms:['dormo','dormi','dorme','dormiamo','dormite','dormono']},
      {base:'essere',translation:'être',forms:['sono','sei','è','siamo','siete','sono']},
      {base:'avere',translation:'avoir',forms:['ho','hai','ha','abbiamo','avete','hanno']},
      {base:'andare',translation:'aller',forms:['vado','vai','va','andiamo','andate','vanno']}
    ]
  };
  const persons={es:['yo','tú','él / ella / usted','nosotros / nosotras','vosotros / vosotras','ellos / ellas / ustedes'],it:['io','tu','lui / lei','noi','voi','loro']};
  function normalize(text){return String(text).normalize('NFC').trim().toLocaleLowerCase().replace(/[.!?。！？]+$/u,'').replace(/\s+/g,' ');}
  function accepts(value,answers){return answers.some(answer=>normalize(value)===normalize(answer));}
  function presentRound(language,index,level='niveau1'){
    const bank=tables[language];if(!bank)return null;
    const verbs=level==='niveau1'?bank.slice(0,3):bank,verb=verbs[Math.floor(index/6)%verbs.length],person=index%6;
    return{verb,person:persons[language][person],answer:verb.forms[person],ending:verb.endings?.[person],stem:verb.stem};
  }
  return{tables,persons,normalize,accepts,presentRound};
});
