
let exercises = [];
let currentExerciseIndex = 0;
let timerInterval;
let elapsedTime = 0;
let isRunning = false;

function formatTime(ms) {
const minutes = Math.floor(ms / 60000);
const seconds = Math.floor((ms % 60000) / 1000);
const milliseconds = Math.floor((ms % 1000) / 100);
return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${milliseconds}`;
}

function startTimer() {
if (!isRunning) {
const startTime = Date.now() - elapsedTime;
timerInterval = setInterval(() => {
  elapsedTime = Date.now() - startTime;
  document.getElementById('timer-display').textContent = formatTime(elapsedTime);
}, 100);
isRunning = true;
}
}

function stopTimer() {
if (isRunning) {
clearInterval(timerInterval);
isRunning = false;
}
}

function resetTimer() {
clearInterval(timerInterval);
elapsedTime = 0;
isRunning = false;
document.getElementById('timer-display').textContent = formatTime(elapsedTime);
}

document.getElementById('start-button').addEventListener('click', startTimer);
document.getElementById('stop-button').addEventListener('click', stopTimer);
document.getElementById('reset-button').addEventListener('click', resetTimer);

resetTimer(); // Imposta il timer inizialmente a 00:00.0

async function loadExercises() {
  try {
    const response = await fetch('/allenamentoDelGiorno');
    const data = await response.json();

    if (Array.isArray(data) && data.length > 0) {
      exercises = data;
      currentExerciseIndex = 0;
      showExercise();
    } else {
      exercises = [{ esercizio: 'Nessun allenamento per oggi', serie: '', ripetizioni: '', note: '' }];
      showExercise();
    }
  } catch (error) {
    console.error('Errore nel caricamento degli esercizi:', error);
  }
}

function showExercise() {
  const exerciseName = document.getElementById('exercise-name');
  const exerciseDetails = document.getElementById('exercise-details');
  
  if (currentExerciseIndex >= exercises.length) {
    // Mostra messaggio "Allenamento finito"
    exerciseName.textContent = "Allenamento finito!";
    exerciseDetails.innerHTML = "<div class='exercise-item'>Complimenti! Hai completato tutti gli esercizi per oggi.</div>";
    document.getElementById('next-exercise').disabled = true; // Disabilita il pulsante "Next"
  } else {
    // Mostra l'esercizio corrente
    const exercise = exercises[currentExerciseIndex];
    exerciseName.textContent = exercise.esercizio || "Nessun esercizio";
    exerciseDetails.innerHTML = `
      <div class="exercise-item"><strong>Serie:</strong> ${exercise.serie || '-'}</div>
      <div class="exercise-item"><strong>Ripetizioni:</strong> ${exercise.ripetizioni || '-'}</div>
      <div class="exercise-item"><strong>Note:</strong> ${exercise.note || 'Nessuna nota'}</div>
    `;
    document.getElementById('next-exercise').disabled = false; // Riabilita il pulsante "Next"
  }
}

// Passa all'esercizio successivo
document.getElementById('next-exercise').addEventListener('click', () => {
  currentExerciseIndex++;
  showExercise();
});

// Passa all'esercizio precedente
document.getElementById('prev-exercise').addEventListener('click', () => {
  if (currentExerciseIndex > 0) {
    currentExerciseIndex--;
    showExercise();
  }
});

loadExercises();
  // Funzione per caricare i dati dell'utente selezionato
  async function viewUser(userName) {
    try {
      const response = await fetch(`/user-data?user=${userName}`);
      const data = await response.json();

      // Mostra i dati nella pagina
      const mainContent = document.querySelector('.main-content');
      mainContent.innerHTML = `
        <h2>Dati Utente: ${userName}</h2>
        <pre>${JSON.stringify(data, null, 2)}</pre>
      `;
    } catch (error) {
      console.error('Errore nel caricamento dei dati:', error);
    }
  }

  function toggleMenu() {
    const menu = document.getElementById('dropdown-menu');
    const overlay = document.getElementById('overlay');
    const isOpen = menu.classList.contains('open');

    if (isOpen) {
      menu.classList.remove('open');
      overlay.classList.remove('show');
    } else {
      menu.classList.add('open');
      overlay.classList.add('show');
    }
  }

  // Chiude il menu laterale
  function closeMenu() {
    const menu = document.getElementById('dropdown-menu');
    const overlay = document.getElementById('overlay');
    menu.classList.remove('open');
    overlay.classList.remove('show');
  }

  // Reindirizza alla pagina utenti.html con il parametro utente
  function redirectToUser(userName) {
    window.location.href = `utenti.html?user=${encodeURIComponent(userName)}`;
  }