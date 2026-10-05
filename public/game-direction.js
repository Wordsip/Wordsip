(function(root){
  const api={reverse:(mode,index)=>mode==='to-french'||(mode==='mixed'&&index%2===1)};
  if(typeof module==='object'&&module.exports)module.exports=api;else root.WordSipDirection=api;
})(typeof window!=='undefined'?window:globalThis);
