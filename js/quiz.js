/**
 * quiz.js — NutriDoc · Quiz "idées reçues" nutrition
 * Auto-play : apparaît après 8s sur le dashboard patient, sans clic
 * Peut aussi être injecté manuellement avec renderQuiz(containerId)
 */

const QUIZ_QUESTIONS = [
  {
    question: "Pour maigrir, il faut supprimer totalement les glucides.",
    reponse: false,
    explication: "Faux ! Les glucides sont la principale source d'énergie du cerveau et des muscles. En supprimer complètement provoque fatigue, irritabilité et effet yoyo. L'important est de choisir des glucides complexes (céréales complètes, légumineuses) et de les doser correctement.",
    source: "ANSES — Recommandations nutritionnelles 2024"
  },
  {
    question: "Manger gras fait grossir.",
    reponse: false,
    explication: "Pas automatiquement. Les lipides sont essentiels : ils transportent les vitamines A, D, E, K, constituent les membranes cellulaires et les hormones. Ce qui fait grossir c'est un excès calorique global, pas les lipides en eux-mêmes. Les bonnes graisses (oméga-3, huile d'olive) sont même protectrices.",
    source: "Table CIQUAL 2020 — ANSES"
  },
  {
    question: "Il faut boire au minimum 2 litres d'eau par jour.",
    reponse: false,
    explication: "Ni tout à fait vrai, ni faux. Les besoins varient selon l'activité physique, la chaleur, l'alimentation et le poids. Une personne sédentaire en hiver n'a pas les mêmes besoins qu'un sportif en été. Environ 1,5L est une bonne base, mais une partie de vos besoins est couverte par les aliments.",
    source: "EFSA — Apports de référence en eau, 2022"
  },
  {
    question: "Sauter le petit déjeuner fait grossir.",
    reponse: false,
    explication: "C'est un mythe ! Aucune étude de haute qualité ne prouve que sauter le petit déjeuner cause une prise de poids. Le jeûne intermittent — qui consiste souvent à ne pas déjeuner le matin — est même associé à des bénéfices métaboliques chez certaines personnes. Ce qui compte c'est l'apport calorique total sur la journée.",
    source: "British Medical Journal, méta-analyse 2023"
  },
  {
    question: "Les protéines végétales sont moins efficaces que les protéines animales.",
    reponse: false,
    explication: "Une idée reçue persistante. Les protéines végétales (légumineuses, tofu, quinoa) peuvent couvrir tous les besoins à condition d'en varier les sources. L'association légumineuses + céréales complètes au cours d'une même journée fournit tous les acides aminés essentiels.",
    source: "INSERM — Protéines végétales, 2023"
  },
  {
    question: "Les fruits sont trop sucrés et doivent être limités.",
    reponse: false,
    explication: "Faux pour la majorité des gens. Les fruits contiennent certes du fructose, mais aussi des fibres qui ralentissent l'absorption du sucre, des vitamines, des antioxydants et de l'eau. Aucune étude ne lie la consommation de fruits entiers à l'obésité. À ne pas confondre avec les jus de fruits.",
    source: "Harvard School of Public Health, 2023"
  },
  {
    question: "Manger après 20h fait stocker davantage de graisses.",
    reponse: false,
    explication: "Faux. Votre métabolisme ne connaît pas l'heure. Un aliment consommé à 20h ne se transforme pas différemment d'un aliment pris à 12h. Ce qui peut jouer, c'est que les repas tardifs tendent à être plus caloriques et moins bien équilibrés, mais ce n'est pas l'heure en elle-même.",
    source: "ANSES — Recommandations nutritionnelles"
  },
  {
    question: "Les compléments alimentaires peuvent compenser une alimentation déséquilibrée.",
    reponse: false,
    explication: "Non. Les compléments isolent des nutriments, mais les aliments contiennent des milliers de composés qui agissent en synergie. La matrice alimentaire — la façon dont les nutriments sont combinés dans un aliment — est irremplaçable. Les compléments ne compensent pas l'effet protecteur d'une vraie alimentation variée.",
    source: "EFSA — Avis sur les compléments alimentaires, 2022"
  },
];

let quizState = {
  idx: 0,
  score: 0,
  answered: false,
  answers: [],
  autoAdvance: null,
  containerId: null
};

function renderQuiz(containerId) {
  quizState.containerId = containerId;
  quizState.idx = 0;
  quizState.score = 0;
  quizState.answered = false;
  quizState.answers = [];
  _renderQuestion();
}

function _renderQuestion() {
  const el = document.getElementById(quizState.containerId);
  if (!el) return;
  const q   = QUIZ_QUESTIONS[quizState.idx];
  const num = quizState.idx + 1;
  const tot = QUIZ_QUESTIONS.length;
  const pct = ((num-1) / tot) * 100;

  el.innerHTML = `
    <div class="quiz-card">
      <div class="quiz-header">
        <div class="quiz-tag">Quiz · Idées reçues</div>
        <div class="quiz-count">${num} / ${tot}</div>
      </div>
      <div class="quiz-progress-bar">
        <div class="quiz-progress-fill" style="width:${pct}%"></div>
      </div>
      <div class="quiz-question" id="quizQ">${q.question}</div>
      <div class="quiz-choices">
        <button class="quiz-btn quiz-btn-true"  onclick="quizAnswer(true)"  id="btnTrue">
          <span class="quiz-btn-icon">✓</span> Vrai
        </button>
        <button class="quiz-btn quiz-btn-false" onclick="quizAnswer(false)" id="btnFalse">
          <span class="quiz-btn-icon">✗</span> Faux
        </button>
      </div>
      <div class="quiz-feedback hidden" id="quizFeedback"></div>
      <div class="quiz-nav hidden" id="quizNav">
        <button class="quiz-next-btn" onclick="quizNext()">
          ${quizState.idx < tot - 1 ? 'Question suivante →' : 'Voir mes résultats →'}
        </button>
      </div>
    </div>`;
}

function quizAnswer(userAnswer) {
  if (quizState.answered) return;
  quizState.answered = true;

  const q        = QUIZ_QUESTIONS[quizState.idx];
  const correct  = userAnswer === q.reponse;
  if (correct) quizState.score++;
  quizState.answers.push({ correct, userAnswer });

  const feedback = document.getElementById('quizFeedback');
  const nav      = document.getElementById('quizNav');
  const btnTrue  = document.getElementById('btnTrue');
  const btnFalse = document.getElementById('btnFalse');

  // Désactiver les boutons
  btnTrue.disabled  = true;
  btnFalse.disabled = true;

  // Colorer selon réponse correcte
  const correctBtn  = q.reponse ? btnTrue : btnFalse;
  const incorrectBtn = q.reponse ? btnFalse : btnTrue;
  correctBtn.classList.add('correct');
  if (!correct) incorrectBtn.classList.add('wrong');

  // Feedback
  feedback.innerHTML = `
    <div class="quiz-feedback-inner ${correct ? 'correct' : 'incorrect'}">
      <div class="quiz-feedback-verdict">${correct ? '✓ Bonne réponse !' : '✗ Pas tout à fait…'}</div>
      <div class="quiz-feedback-text">${q.explication}</div>
      <div class="quiz-feedback-source">Source : ${q.source}</div>
    </div>`;
  feedback.classList.remove('hidden');
  nav.classList.remove('hidden');

  // Auto-avance après 6s
  clearTimeout(quizState.autoAdvance);
  quizState.autoAdvance = setTimeout(() => quizNext(), 6000);
}

function quizNext() {
  clearTimeout(quizState.autoAdvance);
  quizState.idx++;
  quizState.answered = false;

  if (quizState.idx >= QUIZ_QUESTIONS.length) {
    _renderResults();
  } else {
    _renderQuestion();
  }
}

function _renderResults() {
  const el    = document.getElementById(quizState.containerId);
  if (!el) return;
  const score = quizState.score;
  const tot   = QUIZ_QUESTIONS.length;
  const pct   = Math.round((score / tot) * 100);
  const msgs  = [
    { min:0,  max:40, icon:'🌱', msg:'De bonnes bases à construire ! NutriDoc va vous aider à démêler le vrai du faux.' },
    { min:40, max:70, icon:'📚', msg:'Pas mal ! Quelques croyances à revisiter — c\'est normal, la nutrition est pleine d\'idées reçues.' },
    { min:70, max:90, icon:'⭐', msg:'Très bien ! Vous avez de solides connaissances nutritionnelles.' },
    { min:90, max:101,icon:'🏆', msg:'Expert(e) ! Vous maîtrisez parfaitement les bases de la nutrition.' },
  ];
  const msg = msgs.find(m => pct >= m.min && pct < m.max);

  el.innerHTML = `
    <div class="quiz-card quiz-results">
      <div class="quiz-header">
        <div class="quiz-tag">Quiz terminé !</div>
      </div>
      <div class="quiz-score-circle">
        <svg viewBox="0 0 100 100" width="100" height="100">
          <circle cx="50" cy="50" r="42" fill="none" stroke="#e5e7eb" stroke-width="8"/>
          <circle cx="50" cy="50" r="42" fill="none" stroke="#1D9E75" stroke-width="8"
            stroke-dasharray="${pct * 2.64} ${264}"
            stroke-dashoffset="66" stroke-linecap="round"
            style="transform:rotate(-90deg);transform-origin:50% 50%;transition:stroke-dasharray .8s ease;"/>
          <text x="50" y="54" text-anchor="middle" font-size="22" font-weight="600" fill="#0d2018">${score}/${tot}</text>
        </svg>
      </div>
      <div class="quiz-result-icon">${msg.icon}</div>
      <div class="quiz-result-msg">${msg.msg}</div>
      <div class="quiz-result-answers">
        ${quizState.answers.map((a, i) => `
          <div class="quiz-mini-row ${a.correct ? 'ok' : 'ko'}">
            ${a.correct ? '✓' : '✗'} ${QUIZ_QUESTIONS[i].question.substring(0,55)}…
          </div>`).join('')}
      </div>
      <div style="display:flex;gap:.75rem;justify-content:center;margin-top:1.25rem;flex-wrap:wrap;">
        <button class="quiz-next-btn" onclick="renderQuiz('${quizState.containerId}')">Rejouer ↺</button>
        <a href="bilan.html" class="quiz-next-btn" style="text-decoration:none;">Faire mon bilan →</a>
      </div>
    </div>`;
}

// Auto-lancement sur le dashboard patient après 8s
function autoLaunchQuiz(containerId) {
  if (localStorage.getItem('nutridoc_quiz_seen') === 'done') return;
  setTimeout(() => {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.classList.remove('quiz-autolaunch-hidden');
    el.style.animation = 'quizSlideIn .5s ease forwards';
    renderQuiz(containerId);
    // Marquer comme vu après fin du quiz (dans _renderResults)
    const orig = window._renderResults;
  }, 8000);
}
