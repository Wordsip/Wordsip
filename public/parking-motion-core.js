(function(root){
  function layout(count,mobile=false){return {width:mobile?430:720,height:100+Math.ceil(count/2)*130,lane:mobile?390:645,homes:Array.from({length:count},(_,i)=>({x:(mobile?[95,245]:[160,390])[i%2],y:120+Math.floor(i/2)*130}))};}
  function pose(progress,home,board){
    const keys=[[0,home.x,home.y,-90],[.18,home.x,home.y-60,-90],[.29,home.x,home.y-60,0],[.66,board.lane,home.y-60,0],[.77,board.lane,home.y-60,-90],[1,board.lane,-100,-90]];
    const t=Math.max(0,Math.min(1,progress));let a=keys[0],b=keys[1];for(let i=1;i<keys.length;i++)if(t<=keys[i][0]){a=keys[i-1];b=keys[i];break;}
    const u=(t-a[0])/(b[0]-a[0]),s=u*u*(3-2*u);return {x:a[1]+(b[1]-a[1])*s,y:a[2]+(b[2]-a[2])*s,angle:a[3]+(b[3]-a[3])*s};
  }
  function canValidate(selected,count,busy,passed){return !busy&&!passed&&selected.length===count;}
  function obstaclePose(t,home,board){t=Math.max(0,Math.min(1,t));const smooth=u=>u*u*(3-2*u);if(t<.5)return {x:home.x+(board.lane-home.x)*smooth(t*2),y:home.y,angle:0};if(t<.65)return {x:board.lane,y:home.y,angle:-90*smooth((t-.5)/.15)};return {x:board.lane,y:home.y+(-100-home.y)*smooth((t-.65)/.35),angle:-90};}
  const api={layout,pose,canValidate,obstaclePose};if(typeof module==='object'&&module.exports)module.exports=api;else root.WordSipParkingMotion=api;
})(typeof window!=='undefined'?window:globalThis);
