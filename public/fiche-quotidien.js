(() => {
  const params=new URLSearchParams(location.search),language=params.get('lang')||'en',id=params.get('lesson');
  document.getElementById('learning-back').href='/grammaire?guest=true&lang='+encodeURIComponent(language)+'&lesson='+encodeURIComponent(id||'');
  document.getElementById('learning-print').onclick=()=>window.print();
  (async()=>{
    const page=document.getElementById('learning-page');
    try{
      const response=await fetch('/api/lessons/'+encodeURIComponent(language));if(!response.ok)throw new Error('Chargement impossible.');
      const {lessons}=await response.json(),lesson=lessons.find(l=>l.id===id&&l.type==='vocabulary');if(!lesson)throw new Error('Fiche introuvable. Revenez aux fiches de cours.');
      document.title=lesson.title+' — WordSip';page.innerHTML=WordSipSheets.render(lesson,language);
      // Screen meanings stay on demand; paper needs the French without a click.
      page.querySelectorAll('[data-vocab-translation]').forEach(term=>{const meaning=document.createElement('span');meaning.className='learning-print-meaning';meaning.textContent=term.dataset.vocabTranslation;term.after(meaning);});
      await WordSipHelp.setLanguage(language);
    }catch(error){page.textContent=error.message;}
  })();
})();
