(() => {
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const help=(term,translation,definition='')=>`<span class="vocab-word" role="button" tabindex="0" data-vocab-term="${esc(term)}" data-vocab-translation="${esc(translation)}" data-vocab-definition="${esc(definition)}" aria-label="Définition de ${esc(term)}">${esc(term)}</span>`;
  const audio=(text,language)=>`<button type="button" class="learning-audio" data-learning-audio="${esc(text)}" data-language="${esc(language)}" aria-label="Écouter ${esc(text)}">🔊</button>`;
  function render(lesson,language){
    const vocab=lesson.vocabulary.map(v=>`<div class="learning-word-card">${v.swatch?`<span class="learning-swatch" style="background:${esc(v.swatch)}" aria-hidden="true"></span>`:''}<div>${help(v.term,v.translation,v.definition)}${v.reading?`<div class="learning-reading">${esc(v.reading)}</div>`:''}</div>${audio(v.term,language)}</div>`).join('');
    const examples=lesson.examples.map(e=>`<div class="learning-example"><div>${help(e.text,e.translation,'Phrase utile : '+e.translation)}${e.reading?`<div class="learning-reading">${esc(e.reading)}</div>`:''}</div>${audio(e.text,language)}</div>`).join('');
    const exercises=lesson.exercise.map((q,i)=>`<div class="learning-quiz"><p class="learning-question"><strong>${i+1}.</strong> ${esc(q.sentence)}</p><div class="learning-answers">${q.options.map((o,j)=>`<button type="button" data-learning-answer="${j===q.correctIndex}" data-feedback="${esc(j===q.correctIndex?q.feedbackOk:q.feedbackKo)}">${esc(o)}</button>`).join('')}</div><p class="learning-feedback" aria-live="polite"></p></div>`).join('');
    const print='/fiche-quotidien?lang='+encodeURIComponent(language)+'&lesson='+encodeURIComponent(lesson.id);
    return `<section class="fiche-sheet learning-sheet"><div class="fiche-eyebrow">Parcours quotidien · étape ${lesson.learningOrder}/6 · initiation</div><h1>${esc(lesson.title)}</h1><p class="learning-objective"><strong>À la fin, je sais…</strong> ${esc(lesson.objective)}</p><p class="learning-prerequisite"><strong>Pour commencer :</strong> ${esc(lesson.prerequisites)}</p><h2>1. Je découvre et j’écoute</h2><p class="learning-instruction">Commencez par quatre mots, puis les suivants. Cliquez sur un mot pour voir son sens ; utilisez 🔊 pour l’écouter, puis répétez-le.</p><div class="learning-word-grid">${vocab}</div><h2>2. Je les utilise dans une phrase</h2><p class="learning-instruction">Écoutez une phrase et essayez de la comprendre avant de cliquer pour afficher son sens.</p>${examples}<h2>3. Je retiens le point important</h2><div class="callout learning-note">${esc(lesson.note)}</div><h2>4. Je vérifie sans afficher les traductions</h2>${exercises}<h2>5. À moi de parler</h2><p>${esc(lesson.task)}</p><label class="learning-own-label">Ma phrase (facultatif, pour m’entraîner)<textarea class="learning-own-sentence" rows="2" placeholder="Écrivez votre phrase ici…"></textarea></label><p class="learning-instruction">Cette phrase n’est pas corrigée automatiquement et n’est pas envoyée au serveur.</p><details class="learning-model"><summary>Comparer avec un exemple</summary><p>${help(lesson.examples[0].text,lesson.examples[0].translation,'Exemple possible ; plusieurs réponses sont acceptables.')}</p></details><div class="learning-review"><strong>Je consolide :</strong> ${esc(lesson.review)}</div><a href="${print}" class="fiche-print-link" target="_blank" rel="noopener">🖨️ Ouvrir la fiche imprimable</a></section>`;
  }
  document.addEventListener('click',event=>{
    const listen=event.target.closest('button[data-learning-audio]');
    if(listen){new Audio('/api/tts?text='+encodeURIComponent(listen.dataset.learningAudio)+'&lang='+encodeURIComponent(listen.dataset.language)).play().catch(()=>{});return;}
    const answer=event.target.closest('button[data-learning-answer]');if(!answer)return;
    const quiz=answer.closest('.learning-quiz');if(quiz.dataset.answered)return;
    quiz.dataset.answered='true';const correct=answer.dataset.learningAnswer==='true';
    answer.classList.add(correct?'learning-correct':'learning-incorrect');
    quiz.querySelectorAll('button[data-learning-answer]').forEach(b=>{b.disabled=true;if(b.dataset.learningAnswer==='true')b.classList.add('learning-correct');});
    const feedback=quiz.querySelector('.learning-feedback');feedback.textContent=(correct?'✓ ':'✗ ')+answer.dataset.feedback;feedback.classList.add(correct?'learning-good':'learning-bad');
  });
  window.WordSipSheets={render};
})();
