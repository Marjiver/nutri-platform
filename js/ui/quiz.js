/**
 * quiz.js — NutriDoc · Quiz nutrition sportive
 * Version complète - Sans dépendances CSS externes
 */

const NUTRI_QUIZ = [
  { q: "Pour maigrir, il faut supprimer totalement les glucides.", a: false, exp: "Faux ! Les glucides sont la principale source d'énergie du cerveau et des muscles. L'important est de choisir des glucides complexes (comme les céréales complètes, les légumineuses) et d'éviter les sucres rapides." },
  { q: "Manger gras fait grossir.", a: false, exp: "Pas automatiquement. Les lipides sont essentiels pour les hormones et les vitamines. Ce qui fait grossir c'est l'excès calorique global, pas le gras en lui-même." },
  { q: "Il faut boire au minimum 2 litres d'eau par jour.", a: false, exp: "Ni vrai ni faux. Les besoins varient selon l'activité, la chaleur, le poids et l'alimentation. 1,5L est une bonne base, mais écoutez votre soif." },
  { q: "Sauter le petit déjeuner fait grossir.", a: false, exp: "C'est un mythe ! Aucune étude ne prouve que sauter le petit déjeuner cause une prise de poids. L'important est la qualité et la répartition des repas sur la journée." },
  { q: "Les protéines végétales sont moins efficaces que les protéines animales.", a: false, exp: "Faux. En variant les sources (légumineuses + céréales complètes), on obtient tous les acides aminés essentiels. Les protéines végétales ont l'avantage d'apporter plus de fibres." },
  { q: "Les fruits sont trop sucrés et doivent être limités.", a: false, exp: "Faux. Les fruits contiennent des fibres qui ralentissent l'absorption du sucre, plus des vitamines, minéraux et antioxydants. 2 à 3 fruits par jour c'est parfait." },
  { q: "Manger après 20h fait stocker davantage de graisses.", a: false, exp: "Faux. Le métabolisme ne connaît pas l'heure. C'est le contenu du repas et le total calorique de la journée qui comptent, pas l'heure à laquelle vous mangez." },
  { q: "Les compléments alimentaires peuvent compenser une alimentation déséquilibrée.", a: false, exp: "Non. La matrice alimentaire (l'association des nutriments dans les aliments) est irremplaçable. Les compléments ne remplacent pas une alimentation variée et équilibrée." },
  { q: "Le régime végétarien ne permet pas de faire du sport de haut niveau.", a: false, exp: "Faux. De nombreux athlètes de haut niveau sont végétariens ou végétaliens (comme Novak Djokovic, Carl Lewis), à condition de bien planifier leurs apports en protéines, fer et vitamines." },
  { q: "Boire pendant l'effort ralentit la performance.", a: false, exp: "Faux ! Une perte hydrique de seulement 2% du poids corporel réduit les performances de 10 à 15%. Il est essentiel de boire avant, pendant et après l'effort." }
];

let quizSession = { idx: 0, score: 0, answered: false, answers: [] };

function renderNutriQuiz(containerId) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.warn(`Container #${containerId} non trouvé pour le quiz`);
    return;
  }
  
  // Si le quiz est terminé
  if (quizSession.idx >= NUTRI_QUIZ.length) {
    const score = quizSession.answers.filter(a => a.correct).length;
    const percentage = Math.round((score / NUTRI_QUIZ.length) * 100);
    let message = '';
    if (percentage >= 80) message = '🏆 Excellent ! Vous maîtrisez parfaitement les bases de la nutrition sportive.';
    else if (percentage >= 60) message = '👍 Très bien ! Encore quelques petits ajustements et vous serez incollable.';
    else if (percentage >= 40) message = '📚 Bon début ! Consultez nos ressources pour approfondir vos connaissances.';
    else message = '💪 Chaque début est une opportunité ! Nos articles vous aideront à progresser.';
    
    container.innerHTML = `
      <div style="text-align:center; padding:1.5rem;">
        <div style="font-size:3rem; margin-bottom:0.5rem;">🏆</div>
        <div style="font-weight:700; font-size:1.2rem; margin-bottom:0.5rem;">Score : ${score}/${NUTRI_QUIZ.length}</div>
        <div style="font-size:0.85rem; color:#6b7b74; margin-bottom:1rem;">${message}</div>
        <button onclick="resetNutriQuiz()" style="background:transparent; border:1px solid #1D9E75; color:#1D9E75; padding:0.5rem 1rem; border-radius:999px; cursor:pointer; font-size:0.8rem; transition:all 0.2s;">
          🔄 Recommencer le quiz
        </button>
      </div>`;
    return;
  }
  
  const q = NUTRI_QUIZ[quizSession.idx];
  const progressPercent = (quizSession.idx / NUTRI_QUIZ.length) * 100;
  
  container.innerHTML = `
    <div style="margin-bottom:1.5rem;">
      <div style="display:flex;justify-content:space-between;font-size:0.7rem; color:#6b7b74; margin-bottom:0.3rem;">
        <span>Question ${quizSession.idx+1}/${NUTRI_QUIZ.length}</span>
        <span>${Math.round(progressPercent)}%</span>
      </div>
      <div style="height:4px; background:#eef4ee; border-radius:2px; overflow:hidden;">
        <div style="width:${progressPercent}%; height:100%; background:#1D9E75; transition:width 0.3s;"></div>
      </div>
    </div>
    <div class="quiz-question" style="margin-bottom:1rem;">
      <h4 style="font-size:1rem; font-weight:500; color:#0d2018; margin-bottom:1rem;">${q.q}</h4>
      <div class="quiz-options" style="display:flex; gap:1rem; margin-top:0.5rem; flex-wrap:wrap;">
        <button class="quiz-btn" data-answer="true" onclick="answerQuiz(true)" style="background:#e1f5ee; border:none; padding:0.6rem 1.2rem; border-radius:999px; cursor:pointer; font-size:0.85rem; font-weight:500; color:#0f6e56; transition:all 0.2s;">
          ✅ Vrai
        </button>
        <button class="quiz-btn" data-answer="false" onclick="answerQuiz(false)" style="background:#fef2f2; border:none; padding:0.6rem 1.2rem; border-radius:999px; cursor:pointer; font-size:0.85rem; font-weight:500; color:#b91c1c; transition:all 0.2s;">
          ❌ Faux
        </button>
      </div>
      <div id="quizFeedback" class="quiz-feedback" style="margin-top:1rem;"></div>
    </div>
  `;
}

function answerQuiz(answer) {
  // Éviter les réponses multiples
  if (quizSession.answered) return;
  
  const q = NUTRI_QUIZ[quizSession.idx];
  const correct = (answer === q.a);
  
  // Enregistrer la réponse
  quizSession.answers.push({ 
    question: q.q,
    userAnswer: answer,
    correct: correct,
    explanation: q.exp
  });
  
  if (correct) quizSession.score++;
  quizSession.answered = true;
  
  // Afficher le feedback
  const feedback = document.getElementById('quizFeedback');
  if (feedback) {
    feedback.style.background = correct ? '#e1f5ee' : '#fef2f2';
    feedback.style.padding = '1rem';
    feedback.style.borderRadius = '12px';
    feedback.style.marginTop = '1rem';
    feedback.style.borderLeft = correct ? '4px solid #1D9E75' : '4px solid #ef4444';
    feedback.innerHTML = `
      <strong style="color:${correct ? '#0f6e56' : '#b91c1c'};">${correct ? '✓ Bonne réponse !' : '✗ Pas tout à fait...'}</strong>
      <p style="margin-top:0.5rem; margin-bottom:0; font-size:0.85rem; line-height:1.4;">${q.exp}</p>
    `;
  }
  
  // Désactiver les boutons
  const btns = document.querySelectorAll('.quiz-btn');
  btns.forEach(btn => {
    btn.disabled = true;
    btn.style.opacity = '0.6';
    btn.style.cursor = 'not-allowed';
  });
  
  // Passer à la question suivante après un délai
  setTimeout(() => {
    quizSession.idx++;
    quizSession.answered = false;
    renderNutriQuiz('quizContainer');
  }, 2500);
}

function resetNutriQuiz() {
  quizSession = { idx: 0, score: 0, answered: false, answers: [] };
  renderNutriQuiz('quizContainer');
}

// Version alternative avec réponses détaillées (pour affichage des résultats complets)
function getQuizResults() {
  return {
    completed: quizSession.idx >= NUTRI_QUIZ.length,
    score: quizSession.answers.filter(a => a.correct).length,
    total: NUTRI_QUIZ.length,
    answers: quizSession.answers,
    percentage: Math.round((quizSession.answers.filter(a => a.correct).length / NUTRI_QUIZ.length) * 100)
  };
}

function renderQuizResults(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  const results = getQuizResults();
  if (!results.completed) {
    container.innerHTML = '<p>Terminez le quiz pour voir vos résultats détaillés.</p>';
    return;
  }
  
  let html = `
    <div style="margin-top:1.5rem;">
      <h4 style="font-size:1rem; margin-bottom:1rem;">📊 Vos résultats détaillés</h4>
      <div style="display:flex; gap:1rem; flex-wrap:wrap; margin-bottom:1.5rem;">
        <div style="background:#e1f5ee; padding:0.75rem 1rem; border-radius:12px; flex:1; text-align:center;">
          <div style="font-size:1.5rem; font-weight:700; color:#0f6e56;">${results.score}/${results.total}</div>
          <div style="font-size:0.7rem; color:#6b7b74;">Score final</div>
        </div>
        <div style="background:#e1f5ee; padding:0.75rem 1rem; border-radius:12px; flex:1; text-align:center;">
          <div style="font-size:1.5rem; font-weight:700; color:#0f6e56;">${results.percentage}%</div>
          <div style="font-size:0.7rem; color:#6b7b74;">Taux de réussite</div>
        </div>
      </div>
      <div style="display:flex; flex-direction:column; gap:0.75rem;">
  `;
  
  results.answers.forEach((a, i) => {
    html += `
      <div style="background:${a.correct ? '#e1f5ee' : '#fef2f2'}; padding:0.75rem; border-radius:8px;">
        <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.5rem;">
          <span style="font-size:1rem;">${a.correct ? '✅' : '❌'}</span>
          <span style="font-weight:500; font-size:0.85rem;">Question ${i+1}</span>
        </div>
        <p style="font-size:0.8rem; margin-bottom:0.25rem;">${a.question}</p>
        <p style="font-size:0.75rem; color:#6b7b74; margin-top:0.5rem;">${a.explanation}</p>
      </div>
    `;
  });
  
  html += `</div><button onclick="resetNutriQuiz()" style="margin-top:1rem; background:#1D9E75; color:#fff; border:none; padding:0.5rem 1rem; border-radius:999px; cursor:pointer;">🔄 Recommencer le quiz</button></div>`;
  
  container.innerHTML = html;
}

// Exports globaux
window.renderNutriQuiz = renderNutriQuiz;
window.answerQuiz = answerQuiz;
window.resetNutriQuiz = resetNutriQuiz;
window.getQuizResults = getQuizResults;
window.renderQuizResults = renderQuizResults;