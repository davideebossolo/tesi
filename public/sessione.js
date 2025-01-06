
const exerciseListContainer = document.getElementById("exercise-list-container");
const startSessionButton = document.getElementById("start-session-button");

const logContainer = document.getElementById("log-container");
const currentExerciseContainer = document.getElementById("current-exercise-details");

const sessione = {
  dataInizio: null,
  dataFine: null,
  checkConnection: false,
  programmaEsercizi: [],
  eserciziEseguiti: [],
  esercizioCorrente: null,
};

document.getElementById("start-session-button").addEventListener("click", function () {
  document.getElementById("content").classList.remove("hidden");
  this.classList.add("hidden");
});

// Funzione per aggiungere un log al contenitore del log
function addLog(message) {
  const logLine = document.createElement("div");
  logLine.textContent = `> ${message}`;
  logLine.style.marginBottom = "5px";
  logLine.style.opacity = "0";
  logLine.style.transition = "opacity 0.5s";
  logContainer.appendChild(logLine);

  // Aggiungi un breve ritardo per il fade-in
  setTimeout(() => {
    logLine.style.opacity = "1";
  }, 50);

  // Scorri automaticamente verso il basso
  logContainer.scrollTop = logContainer.scrollHeight;
}

// Funzione per aggiornare la `div` dell'esercizio corrente
function aggiornaEsercizioCorrente() {
  currentExerciseContainer.innerHTML = ""; // Svuota il contenitore

  if (sessione.esercizioCorrente) {
    const esercizio = sessione.programmaEsercizi.find(
      (es) => es.nomeEsercizio === sessione.esercizioCorrente
    );

    if (esercizio) {
      currentExerciseContainer.innerHTML = `
        <strong>Nome: </strong>${esercizio.nomeEsercizio}<br>
        <strong>Paziente: </strong>${esercizio.nomePaziente}<br>
        <strong>Inizio: </strong>${esercizio.dataInizio || "N/A"}<br>
      `;
    }
  } else {
    currentExerciseContainer.innerHTML = "Nessun esercizio in corso.";
  }
}

// Funzione per aggiornare l'intestazione della sessione



async function caricaSessioneDaApi() {
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get("id");

  console.log("Debug - URL completo:", window.location.href);
  console.log("Debug - sessionId trovato:", sessionId);

  if (!sessionId) {
    addLog("Errore: ID della sessione mancante.");
    return;
  }

  try {
    const response = await fetch(`/api/sessioni/${sessionId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Errore nella risposta dell'API: ${response.statusText}`);
    }

    const datiSessione = await response.json();
    console.log("Debug - Dati sessione caricati:", datiSessione);

    // Popola l'oggetto sessione
    sessione.dataInizio = datiSessione.dataInizio || null;
    sessione.dataFine = datiSessione.dataFine || null;
    sessione.checkConnection = datiSessione.checkConnection || false;
    sessione.programmaEsercizi = datiSessione.programmaEsercizi.map((esercizio) => ({
      id: esercizio.id,
      nomeEsercizio: esercizio.nomeEsercizio,
      nomePaziente: datiSessione.utente.username,
      dataInizio: esercizio.dataInizio || null,
      dataFine: esercizio.dataFine || null,
    }));
    sessione.eserciziEseguiti = datiSessione.eserciziEseguiti || [];
    sessione.esercizioCorrente = datiSessione.esercizioCorrente || null;


    aggiornaSessionHeader();
    aggiornaListaEsercizi();
    aggiornaDettagliSessione();
    addLog("Sessione caricata con successo.");
  } catch (error) {
    console.error("Errore nel caricamento della sessione:", error);
    addLog("Errore nel caricamento della sessione. Riprova.");
  }
}





// Esegui la funzione al caricamento della pagina
document.addEventListener("DOMContentLoaded", () => {
  caricaSessioneDaApi();
});



// Funzione per avviare la sessione
function avviaSessione() {
  if (!sessione.checkConnection) {
    sessione.checkConnection = true;
    addLog("Sessione avviata.");
    aggiornaListaEsercizi();
    startSessionButton.disabled = true; // Disabilita il pulsante dopo l'avvio
  } else {
    addLog("La sessione è già avviata.");
  }
}

function avviaConCountdown(callback) {
  const countdownOverlay = document.getElementById("countdown-overlay");
  let countdown = 3;

  // Mostra il countdown overlay
  countdownOverlay.style.visibility = "visible";
  countdownOverlay.style.opacity = "1";
  countdownOverlay.textContent = countdown;

  // Funzione per aggiornare il countdown
  const interval = setInterval(() => {
    countdown--;
    if (countdown > 0) {
      countdownOverlay.textContent = countdown;
    } else {
      // Nascondi l'overlay e avvia il callback
      clearInterval(interval);
      countdownOverlay.style.opacity = "0";
      countdownOverlay.style.visibility = "hidden";
      callback(); // Avvia l'azione successiva (esercizio e timer)
    }
  }, 1000); // Aggiorna ogni secondo
}

// Funzione per avviare un esercizio con il countdown
function avviaEsercizio(id) {
  if (sessione.checkConnection) {
    if (sessione.esercizioCorrente) {
      // Stoppa l'esercizio corrente se uno è già in corso
      fermaTimer(); // Ferma il timer dell'esercizio corrente
      sessione.stopExercise();
      addLog(
        `Esercizio "${sessione.esercizioCorrente}" completato. Ora avvio il nuovo esercizio.`
      );
    }

    // Countdown prima dell'avvio del nuovo esercizio
    avviaConCountdown(() => {
      // Avvia il nuovo esercizio
      sessione.startExercise(id);
      addLog(
        `Esercizio con ID ${id} avviato. Esercizio corrente: ${sessione.esercizioCorrente}`
      );

      // Avvia il timer per il nuovo esercizio
      avviaTimer();

      // Aggiorna la lista degli esercizi e i dettagli dell'esercizio corrente
      aggiornaListaEsercizi();
      aggiornaEsercizioCorrente();
    });
  } else {
    addLog("Errore: la sessione non è ancora stata avviata.");
  }
}

function aggiornaSessionHeader() {
  const userNameSpan = document.getElementById("user-name");
  const startDateSpan = document.getElementById("start-date");

  userNameSpan.textContent = sessione.utente.username || "Nome Utente";
  startDateSpan.textContent = sessione.dataInizio || "Data Non Disponibile";
}
// Funzione per creare dinamicamente la lista degli esercizi
function aggiornaListaEsercizi() {
  exerciseListContainer.innerHTML = ""; // Svuota il contenitore

  sessione.programmaEsercizi.forEach((esercizio) => {
    // Crea un contenitore per ogni esercizio
    const esercizioDiv = document.createElement("div");
    esercizioDiv.className = "exercise-item";

    // Aggiungi dettagli dell'esercizio
    const dettagli = document.createElement("div");
    dettagli.innerHTML = `
      <strong>${esercizio.nomeEsercizio}</strong><br>
      Paziente: ${esercizio.nomePaziente}<br>
      Stato: ${esercizio.dataInizio ? "Iniziato" : "Non iniziato"}
    `;

    // Crea un pulsante per avviare l'esercizio
    const pulsanteAvvia = document.createElement("button");
    pulsanteAvvia.textContent = esercizio.dataInizio ? "In Corso" : "Avvia";
    pulsanteAvvia.disabled = !!esercizio.dataInizio || !sessione.checkConnection; // Disabilita se già avviato o sessione non avviata
    pulsanteAvvia.onclick = () => avviaEsercizio(esercizio.id);

    // Assembla il contenitore
    esercizioDiv.appendChild(dettagli);
    esercizioDiv.appendChild(pulsanteAvvia);
    exerciseListContainer.appendChild(esercizioDiv);
  });
}
// Riferimento al contenitore dei dettagli della sessione
const sessionDetailsContainer = document.getElementById("session-details-container");

// Funzione per aggiornare i dettagli della sessione
function aggiornaDettagliSessione() {
  // Svuota il contenitore
  sessionDetailsContainer.innerHTML = "";

  // Aggiungi un titolo
  const title = document.createElement("h3");
  title.textContent = "Dettagli della Sessione";
  sessionDetailsContainer.appendChild(title);

  // Crea una lista dei dettagli
  const listaDettagli = document.createElement("ul");

  // Aggiungi i dettagli della sessione
  listaDettagli.innerHTML = `
    <li><strong>Data Inizio:</strong> ${sessione.dataInizio || "N/A"}</li>
    <li><strong>Data Fine:</strong> ${sessione.dataFine || "N/A"}</li>
    <li><strong>Connessione Attiva:</strong> ${sessione.checkConnection ? "Sì" : "No"}</li>
    <li><strong>Esercizio Corrente:</strong> ${sessione.esercizioCorrente || "Nessuno"}</li>
    <li><strong>Programma Esercizi:</strong>
      <ul>
        ${sessione.programmaEsercizi.map(
          (es) =>
            `<li>${es.nomeEsercizio} (Paziente: ${es.nomePaziente}, Stato: ${
              es.dataInizio ? "Iniziato" : "Non Iniziato"
            })</li>`
        ).join("")}
      </ul>
    </li>
    <li><strong>Esercizi Eseguiti:</strong>
      <ul>
        ${sessione.eserciziEseguiti.map(
          (es) =>
            `<li>${es.nomeEsercizio} (Iniziato: ${es.dataInizio}, Terminato: ${es.dataFine})</li>`
        ).join("")}
      </ul>
    </li>
  `;

  // Aggiungi la lista al contenitore
  sessionDetailsContainer.appendChild(listaDettagli);
}

// Chiamare aggiornaDettagliSessione ogni volta che ci sono cambiamenti nella sessione
startSessionButton.onclick = () => {
  avviaSessione();
  aggiornaDettagliSessione();
};

sessione.startExercise = function (id) {
  const esercizio = this.programmaEsercizi.find((es) => es.id === id);
  if (esercizio) {
    if (this.esercizioCorrente) {
      this.stopExercise();
    }
    esercizio.dataInizio = formattaData(new Date());
    this.esercizioCorrente = esercizio.nomeEsercizio;
    addLog(`Esercizio "${esercizio.nomeEsercizio}" avviato.`);
    aggiornaDettagliSessione();
  }
};

sessione.stopExercise = function () {
  const esercizio = this.programmaEsercizi.find(
    (es) => es.nomeEsercizio === this.esercizioCorrente
  );
  if (esercizio) {
    esercizio.dataFine = formattaData(new Date());
    this.eserciziEseguiti.push(esercizio);
    this.esercizioCorrente = null;
    addLog(`Esercizio "${esercizio.nomeEsercizio}" completato.`);
    aggiornaDettagliSessione();
  }
};
// Riferimento al pulsante Play
const playButton = document.querySelector(".menu-item svg");
let selectedExerciseId = null; // Variabile per tracciare l'ID dell'esercizio selezionato

// Funzione per selezionare un esercizio
function selezionaEsercizio(id) {
  selectedExerciseId = id; // Memorizza l'ID dell'esercizio selezionato
  aggiornaListaEsercizi(); // Aggiorna la lista per evidenziare l'esercizio selezionato
  addLog(`Esercizio con ID ${id} selezionato.`);
}

// Funzione per avviare l'esercizio selezionato
playButton.addEventListener("click", () => {
  if (selectedExerciseId !== null) {
    avviaEsercizio(selectedExerciseId);
    addLog(`Esercizio con ID ${selectedExerciseId} avviato tramite Play.`);
  } else {
    addLog("Errore: Nessun esercizio selezionato.");
  }
});

// Aggiornamento dinamico della lista degli esercizi
function aggiornaListaEsercizi() {
  exerciseListContainer.innerHTML = ""; // Svuota il contenitore

  sessione.programmaEsercizi.forEach((esercizio) => {
    // Crea un contenitore per ogni esercizio
    const esercizioDiv = document.createElement("div");
    esercizioDiv.className = "exercise-item";

    // Evidenzia l'esercizio selezionato
    if (esercizio.id === selectedExerciseId) {
      esercizioDiv.style.border = "2px solid #ff33cc"; // Bordo viola per esercizio selezionato
      esercizioDiv.style.boxShadow = "0 0 20px rgba(255, 51, 204, 0.8)";
    }

    // Dettagli dell'esercizio
    const dettagli = document.createElement("div");
    dettagli.innerHTML = `
      <strong>${esercizio.nomeEsercizio}</strong><br>
      Paziente: ${esercizio.nomePaziente}<br>
      Stato: ${esercizio.dataInizio ? "Iniziato" : "Non iniziato"}
    `;

    // Pulsante di selezione
    const pulsanteSeleziona = document.createElement("button");
    pulsanteSeleziona.textContent = "Seleziona";
    pulsanteSeleziona.style.marginTop = "15px";
    pulsanteSeleziona.onclick = () => selezionaEsercizio(esercizio.id);

    // Assembla l'esercizio
    esercizioDiv.appendChild(dettagli);
    esercizioDiv.appendChild(pulsanteSeleziona);
    exerciseListContainer.appendChild(esercizioDiv);
  });
}

// Caricamento iniziale
aggiornaListaEsercizi();

let timerInterval; // Variabile per memorizzare l'intervallo del timer
let elapsedTime = 0; // Tempo trascorso in millisecondi

// Funzione per avviare il timer
function avviaTimer() {
  if (timerInterval) {
    clearInterval(timerInterval); // Resetta il timer se già attivo
  }
  elapsedTime = 0; // Resetta il tempo trascorso
  aggiornaTimer(); // Aggiorna la visualizzazione iniziale
  timerInterval = setInterval(() => {
    elapsedTime += 10; // Incrementa di 10 millisecondi
    aggiornaTimer();
  }, 10); // Aggiorna ogni 10 millisecondi
}

// Funzione per fermare il timer
function fermaTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
    addLog("Timer fermato.");
  }
}

// Funzione per aggiornare la visualizzazione del timer
function aggiornaTimer() {
  const timerContainer = document.getElementById("timer-container");
  if (!timerContainer) return; // Evita errori se l'elemento non esiste
  const minuti = Math.floor(elapsedTime / 60000);
  const secondi = Math.floor((elapsedTime % 60000) / 1000);
  const centesimi = Math.floor((elapsedTime % 1000) / 10);
  timerContainer.textContent = `Tempo trascorso: ${minuti}m ${secondi}s ${centesimi}cs`;
}

// Funzione per fermare l'esercizio e il timer
function stopExerciseWithTimer() {
  if (sessione.esercizioCorrente) {
    fermaTimer();
    sessione.stopExercise();
    addLog("Esercizio corrente fermato.");
    aggiornaTimer(); // Reset del timer nella visualizzazione
    aggiornaEsercizioCorrente(); // Aggiorna la sezione dell'esercizio corrente
  } else {
    addLog("Errore: Nessun esercizio corrente da fermare.");
  }
}

// Event Listener per il pulsante Stop (quadrato)
document.querySelector(".menu-item:nth-child(2)").addEventListener("click", () => {
  stopExerciseWithTimer();
});

// Aggiungiamo il timer all'interno della flex-container
document.addEventListener("DOMContentLoaded", () => {
  const flexContainer = document.querySelector(".flex-container");
  if (flexContainer) {
    const timerDiv = document.createElement("div");
    timerDiv.id = "timer-container";
    timerDiv.style.fontSize = "1.5rem";
    timerDiv.style.color = "#00ff99";
    timerDiv.textContent = "Tempo trascorso: 0m 0s 0cs";
    flexContainer.appendChild(timerDiv);
  }
});




// Collega il pulsante di avvio della sessione
startSessionButton.onclick = avviaSessione;

// Aggiorna la lista al caricamento della pagina
aggiornaListaEsercizi();
aggiornaEsercizioCorrente();
