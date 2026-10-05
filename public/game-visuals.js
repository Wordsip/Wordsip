/* Local SVG scenes: no downloaded assets, tracking or extra graphics library. */
(() => {
  let serial=0;
  function ballScene(position='start',interactive=false){
    const id='scene'+serial++,points={inside:[320,200],above:[320,70],below:[320,315],left:[155,200],right:[485,200],on:[320,122],next:[450,200],start:[570,365]};
    const[x,y]=points[position]||points.start;
    const ball=`<circle ${interactive?`id="learning-ball" tabindex="0" role="slider" aria-label="Balle : flèches pour déplacer, Entrée pour vérifier" aria-valuemin="0" aria-valuemax="640" aria-valuenow="${x}"`:''} class="ball-token" cx="${x}" cy="${y}" r="18" fill="url(#${id}-ball)" stroke="#942942" stroke-width="1.5"/>`;
    return `<svg class="ball-scene ${interactive?'interactive-scene':'mini-scene'}" viewBox="0 0 640 400" ${interactive?'aria-label="Une boîte transparente surélevée et une balle à placer" role="group"':'aria-hidden="true"'}>
    <defs><linearGradient id="${id}-wall" x2="0" y2="1"><stop stop-color="#edf7ff"/><stop offset="1" stop-color="#d3e6f5"/></linearGradient><linearGradient id="${id}-glass" x2="1" y2="1"><stop stop-color="#d7eeff" stop-opacity=".35"/><stop offset="1" stop-color="#76b4e4" stop-opacity=".2"/></linearGradient><radialGradient id="${id}-ball" cx=".3" cy=".25" r=".8"><stop stop-color="#ffe1cf"/><stop offset=".25" stop-color="#ff786e"/><stop offset=".8" stop-color="#df365b"/><stop offset="1" stop-color="#a12751"/></radialGradient></defs>
    <rect width="640" height="400" rx="20" fill="url(#${id}-wall)"/><path d="M0 280L640 280V400H0Z" fill="#c7ddeb"/><path d="M0 280H640M60 400L240 280M210 400L300 280M430 400L360 280M580 400L420 280" stroke="#adc9dd" stroke-width="2"/>
    <ellipse cx="345" cy="330" rx="115" ry="18" fill="#7196af" opacity=".2"/>
    <path d="M250 260V300M390 260V300M430 230V274" stroke="#709fb9" stroke-width="8"/>
    <path d="M250 140L290 110H430V230L390 260H250Z" fill="url(#${id}-glass)" stroke="#437f9e" stroke-width="3"/>
    <path d="M250 140L290 110H430L390 140ZM390 140L430 110V230L390 260" fill="#b6d8ee" fill-opacity=".55" stroke="#437f9e" stroke-width="3"/>
    <path d="M290 110V230H430M290 230L250 260" fill="none" stroke="#76a6c0" stroke-dasharray="6 6" stroke-width="2"/>
    ${position==='inside'?ball:''}
    <rect data-ball-front="true" x="250" y="140" width="140" height="120" fill="url(#${id}-glass)" stroke="#437f9e" stroke-width="3"/>
    <path d="M263 155L278 145M265 173L298 147" stroke="white" stroke-opacity=".8" stroke-width="5"/>
    ${position==='on'?'<ellipse cx="320" cy="143" rx="16" ry="4" fill="#466980" opacity=".4"/>':''}
    ${position==='above'?'<path d="M320 93V107" stroke="#527c98" stroke-dasharray="3 3" stroke-width="2"/>':''}
    ${position==='inside'?'':ball}
    ${interactive?'<g id="ball-zones"></g>':''}</svg>`;
  }
  function picture(theme,index,swatch,label){
    const id='object'+serial++,safe=String(label).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const garments=[
      '<path d="M42 24L26 30 13 59 30 66 37 51V99H83V51L90 66 107 59 94 30 78 24 60 32Z"/><path d="M42 24L60 44 78 24M60 44V99" fill="none" stroke="white"/><path d="M56 45H64L62 52 68 86 60 96 52 86 58 52Z" fill="#4166a1"/>',
      '<path d="M42 28L27 32 11 54 31 67 39 55V98H81V55L89 67 109 54 93 32 78 28Q60 47 42 28Z"/><path d="M44 28Q60 45 76 28" fill="none" stroke="white" stroke-width="3"/>',
      '<path d="M34 25H86L92 103H65L60 59 55 103H28Z"/><path d="M34 37H86M60 25V59" fill="none" stroke="white" stroke-width="2"/>',
      '<path d="M45 21L40 24 45 53 25 104H95L75 53 80 24 75 21 66 37H54Z"/><path d="M45 54H75" fill="none" stroke="white" stroke-width="4"/>',
      '<path d="M42 23L25 31 15 66 32 72 38 49 30 105H90L82 49 88 72 105 66 95 31 78 23 60 40Z"/><path d="M42 23L54 52 60 40 66 52 78 23M60 40V104" fill="none" stroke="white" stroke-width="2"/><circle cx="65" cy="65" r="2" fill="white"/><circle cx="65" cy="79" r="2" fill="white"/>',
      '<path d="M25 46H55L66 65 94 75Q110 80 105 92H20Q11 76 25 46Z"/><path d="M18 92H104V99H18Z" fill="#344e70"/><path d="M53 60L65 66M48 68L60 74" fill="none" stroke="white" stroke-width="3"/>',
      '<path d="M43 21H78V67L100 81Q113 94 98 104H68L43 82Z"/><path d="M43 35H78M43 42H78" fill="none" stroke="white" stroke-width="4"/>',
      '<ellipse cx="60" cy="88" rx="50" ry="12"/><path d="M30 84L37 39Q60 28 83 39L90 84Z"/><path d="M32 74Q60 84 88 74V84Q60 94 30 84Z" fill="#374e6d"/>'
    ];
    const kitchen={
      1:'<path d="M29 45H91V89Q60 108 29 89Z"/><ellipse cx="60" cy="45" rx="31" ry="9" fill="#ddebf3"/><path d="M29 58H16V75H29M91 58H104V75H91" fill="none" stroke="#476480" stroke-width="6"/><path d="M36 58V88" fill="none" stroke="white" stroke-width="3"/>',
      2:'<path d="M50 50L24 26 16 32 43 60" fill="#365472"/><ellipse cx="72" cy="74" rx="37" ry="23"/><ellipse cx="72" cy="68" rx="37" ry="23" fill="#527087"/><ellipse cx="72" cy="68" rx="29" ry="16" fill="#253e52"/><path d="M47 55Q69 45 94 57" fill="none" stroke="#becddb" stroke-width="3"/>',
      3:'<path d="M19 97L62 54 73 65 34 109Z" fill="#476480"/><path d="M62 54L103 18Q111 64 73 65Z" fill="#cfdae6"/><path d="M73 65L104 32" stroke="white"/>',
      4:'<path d="M54 56H66L70 104Q60 113 50 104Z"/><ellipse cx="60" cy="40" rx="22" ry="30" fill="#b9d2e4"/><ellipse cx="59" cy="38" rx="16" ry="24" fill="#8eafc6"/><path d="M45 32Q44 19 55 15" fill="none" stroke="white" stroke-width="3"/>',
      5:'<path d="M21 55Q18 27 60 26Q104 26 101 55V94H21Z" fill="#b77b4e"/><path d="M28 59Q25 35 60 34Q96 34 93 59V94H28Z" fill="#f5cb91"/><path d="M40 47L42 62M57 43L59 58M74 47L76 62" stroke="#e3a46d" stroke-width="3"/>',
      6:'<path d="M60 18Q28 59 30 77A30 30 0 0 0 90 77Q92 59 60 18Z"/><path d="M44 62Q33 82 49 94" fill="none" stroke="white" stroke-width="5"/>'
    };
    const building=(symbol,roof)=>`<path d="M23 48L35 39H99V101H23Z" fill="#bed1e5"/><path d="M23 48H88V101H23Z"/><path d="M88 48L99 39V93L88 101Z" fill="#5179a1"/>${roof||''}<path d="M32 61H45V72H32ZM63 61H76V72H63ZM49 80H62V101H49Z" fill="#f2f9ff"/>${symbol}`;
    const places=[
      building('<path d="M51 14V36M51 14H72L66 23H51" stroke="#48678e" fill="#f6b35c"/>','<path d="M17 48L55 25 94 48Z" fill="#4c729a"/>'),
      '<path d="M32 29Q60 19 88 29V91H32Z"/><rect x="40" y="36" width="40" height="32" rx="4" fill="#d9f1ff"/><path d="M43 103L48 90M77 103L72 90" stroke="#3f5975" stroke-width="5"/><circle cx="44" cy="81" r="5" fill="white"/><circle cx="76" cy="81" r="5" fill="white"/>',
      building('<path d="M22 45H88V60H22Z" fill="#fff0cb"/><path d="M26 45V60M40 45V60M54 45V60M68 45V60M82 45V60" stroke="#ee9a7b" stroke-width="8"/>'),
      building('<path d="M51 23H63V32H72V44H63V53H51V44H42V32H51Z" fill="#c65666"/>'),
      building('<path d="M51 23H63V32H72V44H63V53H51V44H42V32H51Z" fill="#208879"/>'),
      '<ellipse cx="60" cy="65" rx="32" ry="36" fill="#e9f3fb"/><ellipse cx="60" cy="65" rx="24" ry="28" fill="#c7dfef"/><path d="M15 31V57M10 31V48Q15 57 20 48V31M15 57V103M101 31V103M101 31Q112 41 101 62" fill="none" stroke="#4f7294" stroke-width="5"/>',
      '<path d="M55 64H65V103H55Z" fill="#9c7358"/><circle cx="43" cy="52" r="24" fill="#4e9982"/><circle cx="72" cy="51" r="26" fill="#267b72"/><circle cx="59" cy="31" r="25" fill="#66b197"/>',
      '<path d="M20 37L58 28 61 101 22 110Z" fill="#e5a478"/><path d="M61 28L101 37 99 110 61 101Z" fill="#7194bd"/><path d="M28 44L54 38 57 93 29 100Z" fill="#fff3dc"/><path d="M66 38L94 44 93 100 64 93Z" fill="#eef4ff"/><path d="M60 28V102" stroke="#506783" stroke-width="3"/>'
    ];
    let object=theme==='vetements'?garments[index]:theme==='cuisine'?kitchen[index]:theme==='lieux'?places[index]:null;
    if(theme==='couleurs')object=`<circle cx="60" cy="62" r="36" fill="${String(swatch).replace(/[^#a-zA-Z0-9(),.% ]/g,'')}"/><ellipse cx="48" cy="47" rx="16" ry="10" fill="white" opacity=".45"/><path d="M90 64A30 30 0 0 1 44 90" fill="none" stroke="#17283d" stroke-width="7" opacity=".2"/>`;
    return `<svg viewBox="0 0 120 125" role="img" aria-label="${safe}"><defs><linearGradient id="${id}" x2="1" y2="1"><stop stop-color="#92c7db"/><stop offset="1" stop-color="#427eac"/></linearGradient></defs><ellipse cx="64" cy="115" rx="44" ry="7" fill="#547899" opacity=".18"/><g fill="url(#${id})" stroke="#446b8a" stroke-width="1.5" stroke-linejoin="round">${object||''}</g></svg>`;
  }
  window.WordSipVisuals={ballScene,picture};
})();
