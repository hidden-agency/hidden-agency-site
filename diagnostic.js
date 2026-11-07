// Diagnostic : questionnaire en étapes (option 1) ou prise de rendez-vous (option 2).
// Lit CONFIG (défini dans main.js) : LEAD_WEBHOOK_URL et BOOKING_URL.

const QUESTIONS = [
  {
    id: 'activite',
    label: 'Quelle est ton activité ?',
    options: [
      ['beaute', 'Beauté · coiffure · barber'],
      ['services', 'Prestation de services'],
      ['artisan', 'Artisan · BTP'],
      ['commerce', 'Commerce · restauration'],
      ['ecommerce', 'E-commerce'],
      ['autre', 'Autre'],
    ],
  },
  {
    id: 'taille',
    label: 'Vous êtes combien dans l\'entreprise ?',
    options: [
      ['seul', 'Je suis seul'],
      ['petite', '2 à 5 personnes'],
      ['equipe', 'Plus de 5'],
    ],
  },
  {
    id: 'objectif',
    label: 'Ton objectif pour les 6 prochains mois ?',
    options: [
      ['clients', 'Avoir plus de clients'],
      ['regularite', 'Des clients plus réguliers'],
      ['temps', 'Gagner du temps au quotidien'],
      ['lancer', 'Lancer ou relancer mon activité'],
      ['panier', 'Vendre plus à chaque client'],
    ],
  },
  {
    id: 'acquisition',
    label: 'Aujourd\'hui, tes clients te trouvent surtout par…',
    options: [
      ['bouche', 'Le bouche-à-oreille'],
      ['google', 'Google'],
      ['reseaux', 'Les réseaux sociaux'],
      ['pub', 'La publicité'],
      ['inconnu', 'Je ne sais pas vraiment'],
    ],
  },
  {
    id: 'site',
    label: 'Ton site et tes réseaux…',
    options: [
      ['aucun', 'Je n\'ai pas de site'],
      ['inutile', 'J\'en ai, mais ça ne m\'apporte rien'],
      ['quelques', 'Ça m\'apporte quelques demandes'],
      ['efficace', 'Ça marche bien'],
    ],
  },
  {
    id: 'demandes',
    label: 'Tes demandes de clients arrivent…',
    options: [
      ['rare', 'Rarement'],
      ['vagues', 'Par vagues, puis plus rien'],
      ['regulier', 'Régulièrement, mais pas assez'],
      ['plein', 'Régulièrement, et j\'en veux plus'],
    ],
  },
  {
    id: 'urgence',
    label: 'Tu veux avancer quand ?',
    options: [
      ['maintenant', 'Le plus vite possible'],
      ['bientot', 'Dans 1 à 3 mois'],
      ['renseigne', 'Je me renseigne'],
    ],
  },
];

const PALIERS = {
  I: {
    title: 'Être trouvé',
    text: 'Tes futurs clients ne te voient pas encore. Avant tout le reste : Google, ta fiche locale et les réponses des IA.',
    cost: 'Chaque jour, des gens cherchent exactement ce que tu fais près de chez eux. Ils réservent chez ceux qu\'ils trouvent en premier.',
    call: ['Ce que voit un client qui te cherche sur Google aujourd\'hui', 'Pourquoi tes concurrents passent devant toi', 'Les 3 actions qui te rendent visible en premier'],
  },
  II: {
    title: 'Convaincre',
    text: 'On te trouve, mais on ne passe pas à l\'action. Ton site et tes réseaux doivent transformer la visite en demande.',
    cost: 'Tu paies déjà pour être vu — en temps ou en argent. Chaque visiteur qui repart sans réserver, c\'est ce travail perdu.',
    call: ['Où les visiteurs décrochent sur ton site ou ton profil', 'Ce qui manque pour qu\'ils te fassent confiance', 'Comment transformer une visite en réservation'],
  },
  III: {
    title: 'Remplir l\'agenda',
    text: 'Tu sais convaincre. Il te faut maintenant un flux régulier de demandes, pas des vagues.',
    cost: 'Les mois creux te coûtent ce que les bons mois t\'ont rapporté. Sans flux régulier, tu ne peux ni prévoir, ni investir, ni souffler.',
    call: ['D\'où viennent vraiment tes clients aujourd\'hui', 'Le canal le plus rentable pour ton activité', 'Comment remplir ton agenda chaque semaine, pas par vagues'],
  },
  IV: {
    title: 'Sortir de l\'opérationnel',
    text: 'La machine tourne, mais elle repose sur toi. Place à l\'automatisation et aux agents IA.',
    cost: 'Chaque heure passée sur un devis, une relance ou un message, c\'est une heure que tu ne passes ni avec tes clients, ni avec tes proches.',
    call: ['Les tâches qui te prennent le plus de temps', 'Ce qui peut tourner sans toi dès ce mois-ci', 'Par quoi commencer pour récupérer tes soirées'],
  },
};

// Premier palier bloquant dans l'ordre du parcours.
function computePalier(answers) {
  if (['bouche', 'inconnu'].includes(answers.acquisition)) return 'I';
  if (['aucun', 'inutile'].includes(answers.site)) return 'II';
  if (['rare', 'vagues'].includes(answers.demandes)) return 'III';
  return 'IV';
}

const AUTO_ADVANCE_MS = 260;
const SUBMIT_TIMEOUT_MS = 10000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_PATTERN = /^[+\d][\d\s.-]{7,18}$/;

function buildStep(question) {
  const fieldset = document.createElement('fieldset');
  fieldset.className = 'quiz-step';
  fieldset.hidden = true;
  const legend = document.createElement('legend');
  legend.className = 'quiz-question';
  legend.textContent = question.label;
  fieldset.append(legend);

  const list = document.createElement('div');
  list.className = 'quiz-options';
  for (const [value, text] of question.options) {
    const label = document.createElement('label');
    label.className = 'quiz-option';
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = question.id;
    input.value = value;
    const span = document.createElement('span');
    span.textContent = text;
    label.append(input, span);
    list.append(label);
  }
  fieldset.append(list);
  return fieldset;
}

function initQuiz() {
  const form = document.querySelector('[data-quiz]');
  if (!form) return;
  const stepsHost = form.querySelector('[data-quiz-steps]');
  const contactStep = form.querySelector('[data-quiz-contact]');
  const bar = form.querySelector('[data-quiz-bar]');
  const count = form.querySelector('[data-quiz-count]');
  const error = form.querySelector('[data-quiz-error]');
  const back = form.querySelector('[data-quiz-back]');
  const next = form.querySelector('[data-quiz-next]');
  const result = document.querySelector('[data-quiz-result]');

  const steps = [...QUESTIONS.map(buildStep), contactStep];
  QUESTIONS.forEach((_, i) => stepsHost.append(steps[i]));
  let current = 0;
  let sending = false;

  const isContactStep = () => current === steps.length - 1;

  const render = () => {
    steps.forEach((step, i) => { step.hidden = i !== current; });
    bar.style.width = `${((current + 1) / steps.length) * 100}%`;
    count.textContent = isContactStep() ? 'Dernière étape' : `Question ${current + 1} sur ${QUESTIONS.length}`;
    back.hidden = current === 0;
    next.textContent = isContactStep() ? 'Voir mon palier' : 'Continuer';
    error.textContent = '';
  };

  const focusStep = () => {
    const target = steps[current].querySelector('input:checked, input:not([tabindex="-1"])');
    if (target) target.focus({ preventScroll: true });
  };

  const goTo = (index) => {
    current = Math.max(0, Math.min(index, steps.length - 1));
    render();
    focusStep();
  };

  const answers = () => Object.fromEntries(QUESTIONS.map((q) => [q.id, form.elements[q.id].value]));

  const validateContact = () => {
    const prenom = form.elements.prenom.value.trim();
    const email = form.elements.email.value.trim();
    const telephone = form.elements.telephone.value.trim();
    if (!prenom) return 'Indique ton prénom.';
    if (!EMAIL_PATTERN.test(email)) return 'Vérifie ton adresse e-mail.';
    if (telephone && !PHONE_PATTERN.test(telephone)) return 'Vérifie ton numéro de téléphone.';
    if (!form.elements.entreprise.value.trim()) return 'Indique le nom de ton entreprise.';
    if (!form.elements.consent.checked) return 'Coche la case pour qu\'on puisse te recontacter.';
    return '';
  };

  const showResult = (palier) => {
    const { title, text, cost, call } = PALIERS[palier];
    result.querySelector('[data-result-numeral]').textContent = palier;
    result.querySelector('[data-result-title]').textContent = `Palier ${palier} — ${title}`;
    result.querySelector('[data-result-text]').textContent = text;
    result.querySelector('[data-result-cost]').textContent = cost;
    result.querySelector('[data-result-call]').replaceChildren(...call.map((point) => {
      const item = document.createElement('li');
      item.textContent = point;
      return item;
    }));
    form.hidden = true;
    result.hidden = false;
    result.focus();
  };

  const sendLead = async (payload) => {
    if (!CONFIG.LEAD_WEBHOOK_URL) {
      console.warn('[diagnostic] LEAD_WEBHOOK_URL vide : réponses non envoyées.', payload);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SUBMIT_TIMEOUT_MS);
    try {
      const response = await fetch(CONFIG.LEAD_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
    } finally {
      clearTimeout(timer);
    }
  };

  const submit = async () => {
    const problem = validateContact();
    if (problem) {
      error.textContent = problem;
      return;
    }
    const given = answers();
    const palier = computePalier(given);
    // Robot détecté (champ piège rempli) : on affiche le résultat sans rien envoyer.
    if (form.elements.site_web.value) {
      showResult(palier);
      return;
    }
    const payload = {
      source: 'site',
      submittedAt: new Date().toISOString(),
      prenom: form.elements.prenom.value.trim(),
      email: form.elements.email.value.trim(),
      telephone: form.elements.telephone.value.trim(),
      entreprise: form.elements.entreprise.value.trim(),
      lien: form.elements.lien.value.trim(),
      blocage: form.elements.blocage.value.trim(),
      ...given,
      palier,
      palierLabel: PALIERS[palier].title,
      page: window.location.href,
    };
    sending = true;
    next.disabled = true;
    next.textContent = 'Envoi…';
    try {
      await sendLead(payload);
      showResult(palier);
    } catch (err) {
      console.error('[diagnostic] envoi impossible', err);
      error.textContent = 'L\'envoi a échoué. Réessaie, ou choisis directement un créneau.';
      next.textContent = 'Voir mon palier';
    } finally {
      sending = false;
      next.disabled = false;
    }
  };

  form.addEventListener('change', (event) => {
    if (event.target.type !== 'radio' || isContactStep()) return;
    setTimeout(() => goTo(current + 1), AUTO_ADVANCE_MS);
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (sending) return;
    if (isContactStep()) {
      submit();
      return;
    }
    if (!form.elements[QUESTIONS[current].id].value) {
      error.textContent = 'Choisis une réponse pour continuer.';
      return;
    }
    goTo(current + 1);
  });

  back.addEventListener('click', () => goTo(current - 1));
  render();
}

function initModes() {
  const tabs = [...document.querySelectorAll('[data-mode]')];
  if (!tabs.length) return;
  // L'agenda Calendly gratuit reste blanc en intégration : on ouvre l'agenda dans un nouvel onglet,
  // depuis une carte aux couleurs du site.
  document.querySelectorAll('[data-agenda-link]').forEach((link) => {
    if (!CONFIG.BOOKING_URL) { link.hidden = true; return; }
    const url = new URL(CONFIG.BOOKING_URL);
    url.searchParams.set('hide_gdpr_banner', '1');
    link.href = url.toString();
  });

  const select = (mode) => {
    tabs.forEach((tab) => {
      const active = tab.dataset.mode === mode;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      document.getElementById(tab.getAttribute('aria-controls')).hidden = !active;
    });
  };

  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => select(tab.dataset.mode));
    tab.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
      const other = tabs[(i + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
      other.focus();
      select(other.dataset.mode);
    });
  });
  document.querySelectorAll('[data-mode-switch]').forEach((button) => {
    button.addEventListener('click', () => {
      select(button.dataset.modeSwitch);
      document.getElementById('tab-slot').focus();
    });
  });
}

initQuiz();
initModes();
