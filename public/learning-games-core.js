(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.WordSipLearningGames=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const positions={inside:[320,200],above:[320,70],below:[320,315],left:[155,200],right:[485,200],on:[320,122],next:[450,200]};
  function matches(a,b){return String(a)===String(b);}
  function placement(key,x,y){const target=positions[key];if(!target||!Number.isFinite(x)||!Number.isFinite(y))return false;return Math.hypot(x-target[0],y-target[1])<=24||(key==='next'&&Math.hypot(x-210,y-200)<=24);}
  // Coordinates in the 640 × 400 scene. Judge regions relative to the drawn box,
  // not distance from an invisible single answer point.
  function freePlacement(key,x,y){
    if(!Number.isFinite(x)||!Number.isFinite(y)||x<18||x>622||y<18||y>382)return false;
    if(key==='inside')return x>=266&&x<=412&&y>=156&&y<=242;
    if(key==='above')return x>=230&&x<=450&&y+18<107;
    if(key==='below')return x>=235&&x<=445&&y-18>=260;
    if(key==='left')return x<=232&&y>=125&&y<=277;
    if(key==='right')return x>=448&&y>=125&&y<=277;
    if(key==='next')return ((x>=188&&x<=232)||(x>=448&&x<=492))&&y>=150&&y<=260;
    if(key==='on'){
      // The bottom of the sphere must meet the roof polygon, including its edges.
      const px=x,py=y+18,poly=[[250,140],[290,110],[430,110],[390,140]];
      let inside=false,min=Infinity;
      for(let i=0,j=poly.length-1;i<poly.length;j=i++){
        const[a,b]=poly[i],[c,d]=poly[j];
        if((b>py)!==(d>py)&&px<(c-a)*(py-b)/(d-b)+a)inside=!inside;
        const dx=c-a,dy=d-b,t=Math.max(0,Math.min(1,((px-a)*dx+(py-b)*dy)/(dx*dx+dy*dy)));
        min=Math.min(min,Math.hypot(px-a-t*dx,py-b-t*dy));
      }
      return inside||min<=8;
    }
    return false;
  }
  function points(score,correct){return score+(correct?10:-5);}
  function shuffle(array,random=Math.random){const result=array.slice();for(let i=result.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}return result;}
  return{positions,matches,placement,freePlacement,points,shuffle};
});
