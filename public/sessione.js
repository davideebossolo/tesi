
const exerciseListContainer = document.getElementById("exercise-list-container");
const startSessionButton = document.getElementById("start-session-button");

const logContainer = document.getElementById("log-container");
const currentExerciseContainer = document.getElementById("current-exercise-details");


// Esegui la funzione al caricamento della pagina
document.addEventListener("DOMContentLoaded", async () => {
  await caricaSessioneDaApi(); // Aspetta il caricamento della sessione
  aggiornaListaEsercizi();
  aggiornaEsercizioCorrente();
  aggiornaDettagliSessione(); // Ora sarà eseguita con i dati corretti
});


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

  let esercizioDaMostrare = sessione.programmaEsercizi.find(
    (es) => es.nomeEsercizio === sessione.esercizioCorrente
  );

  // Se non c'è un esercizio corrente, mostra l'ultimo esercizio terminato
  if (!esercizioDaMostrare && sessione.ultimoEsercizioTerminato) {
    esercizioDaMostrare = sessione.ultimoEsercizioTerminato;
  }

  if (esercizioDaMostrare) {
    // Determina lo stato corretto
    let stato = "⏳ Non avviato";
    let statoColor = "red";

    if (esercizioDaMostrare.dataInizio && !esercizioDaMostrare.dataFine) {
      stato = "✅ Avviato";
      statoColor = "green";
    } else if (esercizioDaMostrare.dataFine) {
      stato = "🔴 Terminato";
      statoColor = "gray";
    }

    // Crea la struttura dell'esercizio corrente o terminato
    currentExerciseContainer.innerHTML = `
      <div class="exercise-current">
        <img src="img/${esercizioDaMostrare.nomeImmagine || "placeholder.jpg"}" 
            alt="${esercizioDaMostrare.nomeEsercizio}" 
            class="exercise-img">
        <div class="exercise-info">
          <strong>Nome: </strong> ${esercizioDaMostrare.nomeEsercizio} <br>
          <strong>Paziente: </strong> ${esercizioDaMostrare.nomePaziente} <br>
          <strong>Stato: </strong> <span class="exercise-status" style="color: ${statoColor};">${stato}</span>
        </div>
      </div>
    `;
  } else {
    currentExerciseContainer.innerHTML = `<p class="text-gray-500">Nessun esercizio in corso.</p>`;
  }
}




// Funzione per aggiornare l'intestazione della sessione
document.addEventListener('DOMContentLoaded', function () {
  const startButton = document.getElementById('start-session-button');
  const endButton = document.getElementById('end-session-button');

  startButton.addEventListener('click', function () {
    startButton.style.display = 'none'; // Nasconde il pulsante "Avvia Sessione"
    endButton.style.display = 'inline-block'; // Mostra il pulsante "Termina Sessione"
    // Logica per avviare la sessione
  });

  endButton.addEventListener('click', function () {
    endButton.style.display = 'none'; // Nasconde il pulsante "Termina Sessione"
    startButton.style.display = 'inline-block'; // Mostra il pulsante "Avvia Sessione"
    // Logica per terminare la sessione
    alert('Sessione terminata!'); // Sostituisci con la tua logica per terminare la sessione
  });
});

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
    const response = await fetch(`/api/sessioni/${sessionId}`, { method: "GET" });

    if (!response.ok) {
      throw new Error(`Errore nella risposta dell'API: ${response.statusText}`);
    }

    const datiSessione = await response.json();
    console.log("Debug - Dati sessione caricati:", datiSessione);  // 👈 Log per controllare la risposta

    if (!datiSessione.programmaEsercizi || datiSessione.programmaEsercizi.length === 0) {
      console.log("⚠️ Nessun esercizio trovato!");
    }

    sessione.dataInizio = datiSessione.dataInizio || null;
    sessione.dataFine = datiSessione.dataFine || null;
    sessione.checkConnection = datiSessione.checkConnection || false;
    sessione.programmaEsercizi = datiSessione.programmaEsercizi.map((esercizio) => ({
      id: esercizio._id,
      nomeEsercizio: esercizio.nomeEsercizio,
      nomePaziente: datiSessione.utente ? datiSessione.utente.username : "Sconosciuto",
      dataInizio: esercizio.dataInizio || null,
      dataFine: esercizio.dataFine || null,
    }));

    sessione.eserciziEseguiti = datiSessione.eserciziEseguiti || [];
    sessione.esercizioCorrente = datiSessione.esercizioCorrente || null;

    aggiornaSessionHeader();
    aggiornaListaEsercizi();  // 👈 Assicuriamoci che venga chiamata
    aggiornaDettagliSessione();
    addLog("Sessione caricata con successo.");
  } catch (error) {
    console.error("❌ Errore nel caricamento della sessione:", error);
    addLog("Errore nel caricamento della sessione. Riprova.");
  }
}

// Funzione per avviare la sessione
function avviaSessione() {
  if (!sessione.checkConnection) {
    sessione.checkConnection = true; // ✅ Ora la sessione è avviata
    addLog("🚀 Sessione avviata con successo.");
    aggiornaListaEsercizi();
    aggiornaDettagliSessione();
    mostraPopupSelezioneEsercizio();
    
    // Disabilita il pulsante dopo l'avvio
    startSessionButton.disabled = true;
    startSessionButton.classList.add("hidden");
    document.getElementById("content").classList.remove("hidden");
    
  } else {
    addLog("⚠️ La sessione è già attiva.");
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
    // Se c'è un esercizio in corso, prima lo fermiamo

    avviaConCountdown(() => {
      const esercizio = sessione.programmaEsercizi.find((es) => es.id === id);
      if (esercizio) {
        esercizio.dataInizio = formattaData(new Date());
        sessione.esercizioCorrente = esercizio.nomeEsercizio;
        sessione.ultimoEsercizioTerminato = null;
        addLog(`✅ Esercizio "${esercizio.nomeEsercizio}" avviato.`);

        // Avvia il refresh automatico degli iframe
        startGraficiRefresh();
        // 🔥 Avvia invio dati ECG
        fetch("/api/uploadBPM/influxdb", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ esercizioId: esercizio.id })
        })
        .then(response => {
          if (!response.ok) {
            throw new Error(`Errore nell'invio dati ECG: ${response.statusText}`);
          }
          addLog(`📡 Streaming ECG avviato per "${esercizio.nomeEsercizio}".`);
        })
        .catch(error => {
          console.error("❌ Errore nello streaming ECG:", error);
          addLog("⚠️ Errore nell'invio dei dati ECG.");
        });

        // 🔥 Avvia invio dati Accelerometro
        fetch("/uploadAcc", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ esercizioId: esercizio.id })
        })
        .then(response => {
          if (!response.ok) {
            throw new Error(`Errore nell'invio dati ACC: ${response.statusText}`);
          }
          addLog(`📡 Streaming dati accelerometro avviato per "${esercizio.nomeEsercizio}".`);
        })
        .catch(error => {
          console.error("❌ Errore nello streaming ACC:", error);
          addLog("⚠️ Errore nell'invio dei dati accelerometro.");
        });
      }

      aggiornaEsercizioCorrente();
      avviaTimer();
      startGraficiRefresh();
    });
  } else {
    addLog("⚠️ Errore: la sessione non è ancora stata avviata.");
  }
}


document.addEventListener("DOMContentLoaded", function () {
  const startSessionButton = document.getElementById("start-session-button");
  const sessionDetailsContainer = document.getElementById("session-details-container");
  
  function mostraDettagliSessione() {
      sessionDetailsContainer.classList.add("expanded");
      sessionDetailsContainer.style.display = "block";
  }
  
  function nascondiDettagliSessione() {
      sessionDetailsContainer.classList.remove("expanded");
      sessionDetailsContainer.style.display = "none";
  }

  // Mostra i dettagli all'inizio
  mostraDettagliSessione();

  startSessionButton.addEventListener("click", function () {
      nascondiDettagliSessione(); // Nasconde i dettagli quando si avvia la sessione
      startSessionButton.style.display = "none"; // Nasconde il pulsante avvia sessione
      document.getElementById("content").classList.remove("hidden");
  });
});


function aggiornaSessionHeader() {
  const userNameSpan = document.getElementById("user-name");
  const startDateSpan = document.getElementById("start-date");

  userNameSpan.textContent = sessione.utente.username || "Nome Utente";
  startDateSpan.textContent = sessione.dataInizio || "Data Non Disponibile";
}
// Funzione per creare dinamicamente la lista degli esercizi
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
    const response = await fetch(`/api/sessioni/${sessionId}`, { method: "GET" });

    if (!response.ok) {
      throw new Error(`Errore nella risposta dell'API: ${response.statusText}`);
    }

    const datiSessione = await response.json();
    console.log("Debug - Dati sessione caricati:", datiSessione);  // 👈 Log per controllare la risposta

    if (!datiSessione.programmaEsercizi || datiSessione.programmaEsercizi.length === 0) {
      console.log("⚠️ Nessun esercizio trovato!");
    }

    sessione.dataInizio = datiSessione.dataInizio || null;
    sessione.dataFine = datiSessione.dataFine || null;
    sessione.checkConnection = datiSessione.checkConnection || false;

    sessione.programmaEsercizi = datiSessione.programmaEsercizi.map((esercizio) => ({
      id: esercizio._id,
      nomeEsercizio: esercizio.nomeEsercizio,
      nomePaziente: datiSessione.utente ? datiSessione.utente.username : "Sconosciuto",
      dataInizio: esercizio.dataInizio || null,
      dataFine: esercizio.dataFine || null,
      nomeImmagine: esercizio.nomeImmagine || "placeholder.jpg" // 👈 Aggiunto il campo immagine con fallback
    }));

    sessione.eserciziEseguiti = datiSessione.eserciziEseguiti || [];
    sessione.esercizioCorrente = datiSessione.esercizioCorrente || null;

    aggiornaSessionHeader();
    aggiornaListaEsercizi();  // 👈 Assicuriamoci che venga chiamata
    aggiornaDettagliSessione();
    addLog("Sessione caricata con successo.");
  } catch (error) {
    console.error("❌ Errore nel caricamento della sessione:", error);
    addLog("Errore nel caricamento della sessione. Riprova.");
  }
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
        (es) => `
          <li>
            <img src="img/${es.nomeImmagine}" alt="${es.nomeEsercizio}" 
                 style="width: 50px; height: 50px; border-radius: 8px; margin-right: 10px;">
            <strong>${es.nomeEsercizio}</strong> 
            (Paziente: ${es.nomePaziente}, Stato: ${es.dataInizio ? "Iniziato" : "Non Iniziato"})
          </li>`
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

function selezionaEsercizio(id) {
  selectedExerciseId = id; // ✅ Memorizza l'ID selezionato

  // 🔥 Evidenzia l'esercizio selezionato nella lista
  aggiornaListaEsercizi(); 

  // ✅ Aggiorna il log con il nome dell'esercizio selezionato
  const esercizio = sessione.programmaEsercizi.find(es => es.id === id);
  if (esercizio) {
      addLog(`✅ Hai selezionato: ${esercizio.nomeEsercizio}`);
      sessione.esercizioCorrente = esercizio.nomeEsercizio; // ✅ Memorizza l'esercizio in corso
      aggiornaEsercizioCorrente(); // 🔥 Aggiorna la visualizzazione dell'esercizio corrente
  }

  // ✅ Chiudi il popup
  document.getElementById("exercise-modal").classList.add("hidden");
}

document.addEventListener("DOMContentLoaded", () => {
  const toggleButton = document.getElementById("toggle-exercise-list");
  const exerciseListWrapper = document.getElementById("exercise-list-wrapper");

  toggleButton.addEventListener("click", () => {
      if (exerciseListWrapper.classList.contains("show")) {
          // 🔽 Nasconde la lista
          exerciseListWrapper.classList.remove("show");
          exerciseListWrapper.style.maxHeight = "0";
          toggleButton.textContent = "Cambia Esercizio";
      } else {
          // 🔼 Mostra la lista e aggiorna gli esercizi
          exerciseListWrapper.classList.add("show");
          exerciseListWrapper.style.maxHeight = "500px";
          toggleButton.textContent = "Chiudi Lista";

          // 🔥 Assicura che gli esercizi siano aggiornati quando si apre la lista
          aggiornaListaEsercizi();
      }
  });
});



// Aggiornamento dinamico della lista degli esercizi
function aggiornaListaEsercizi() {
  exerciseListContainer.innerHTML = ""; // Svuota il contenitore

  // 🔥 Filtra solo gli esercizi NON ANCORA COMPLETATI
  const eserciziNonCompletati = sessione.programmaEsercizi.filter(es => !es.dataFine);

  if (eserciziNonCompletati.length === 0) {
    exerciseListContainer.innerHTML = `<p class="text-gray-500">✅ Tutti gli esercizi sono stati completati!</p>`;
    return;
  }

  eserciziNonCompletati.forEach((esercizio) => {
    const esercizioDiv = document.createElement("div");
    esercizioDiv.className = "exercise-item";
    esercizioDiv.style.width = "100%";
    esercizioDiv.style.display = "block";
    esercizioDiv.style.padding = "20px";
    esercizioDiv.style.border = "1px solid #ddd";
    esercizioDiv.style.borderRadius = "10px";
    esercizioDiv.style.marginBottom = "20px";
    esercizioDiv.style.backgroundColor = "#f9f9f9";
    esercizioDiv.style.boxSizing = "border-box";
    esercizioDiv.style.minHeight = "180px";
    esercizioDiv.style.textAlign = "center";

    const immagineEsercizio = document.createElement("img");
    immagineEsercizio.src = `img/${esercizio.nomeImmagine || "placeholder.jpg"}`;
    immagineEsercizio.alt = esercizio.nomeEsercizio;
    immagineEsercizio.style.width = "150px";
    immagineEsercizio.style.height = "150px";
    immagineEsercizio.style.borderRadius = "8px";
    immagineEsercizio.style.marginBottom = "15px";

    const dettagli = document.createElement("div");
    dettagli.style.width = "100%";
    dettagli.innerHTML = `
      <strong>${esercizio.nomeEsercizio}</strong><br>
      Paziente: ${esercizio.nomePaziente || "Sconosciuto"}<br>
      Stato: ${esercizio.dataInizio ? "🟡 Iniziato" : "🔴 Non iniziato"}
    `;
    dettagli.style.marginBottom = "15px";

    const pulsanteSeleziona = document.createElement("button");
    pulsanteSeleziona.textContent = "Seleziona";
    pulsanteSeleziona.style.width = "100%";
    pulsanteSeleziona.style.padding = "10px";
    pulsanteSeleziona.style.border = "none";
    pulsanteSeleziona.style.borderRadius = "5px";
    pulsanteSeleziona.style.cursor = "pointer";
    pulsanteSeleziona.style.backgroundColor = "#003366";
    pulsanteSeleziona.style.color = "white";
    pulsanteSeleziona.style.fontSize = "16px";
    pulsanteSeleziona.style.fontWeight = "bold";
    pulsanteSeleziona.style.transition = "background-color 0.3s";
    pulsanteSeleziona.onmouseover = () => pulsanteSeleziona.style.backgroundColor = "#002244";
    pulsanteSeleziona.onmouseout = () => pulsanteSeleziona.style.backgroundColor = "#003366";
    pulsanteSeleziona.onclick = () => selezionaEsercizio(esercizio.id);

    esercizioDiv.appendChild(immagineEsercizio);
    esercizioDiv.appendChild(dettagli);
    esercizioDiv.appendChild(pulsanteSeleziona);

    exerciseListContainer.appendChild(esercizioDiv);
  });
}


// Caricamento iniziale


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
  timerContainer.textContent = `${minuti}m ${secondi}s ${centesimi}cs`;
}

// Funzione per fermare l'esercizio e il timer
function stopExerciseWithTimer() {
  if (sessione.esercizioCorrente) {
    fermaTimer();

    const esercizio = sessione.programmaEsercizi.find(
      (es) => es.nomeEsercizio === sessione.esercizioCorrente
    );

    if (esercizio) {
      esercizio.dataFine = formattaData(new Date()); // ✅ Registra la fine dell'esercizio
      sessione.eserciziEseguiti.push(esercizio); // ✅ Salviamo l'esercizio completato
      sessione.ultimoEsercizioTerminato = { ...esercizio }; // ✅ Manteniamo il riferimento corretto
      
      // ✅ Log conferma che l'esercizio è stato completato
      addLog(`✅ Esercizio "${esercizio.nomeEsercizio}" aggiunto alla lista degli esercizi completati.`);
    }

    sessione.esercizioCorrente = null;
    addLog(`🔴 Esercizio "${esercizio.nomeEsercizio}" terminato.`);

    aggiornaTimer();
    aggiornaEsercizioCorrente();

    // 🛑 Interrompe lo streaming BPM
    fetch("/api/stopUpload", { method: "POST" })
      .then(response => {
        if (!response.ok) {
          throw new Error(`Errore nell'interruzione dello streaming BPM: ${response.statusText}`);
        }
        addLog(`🛑 Streaming BPM interrotto per "${esercizio.nomeEsercizio}".`);
      })
      .catch(error => {
        console.error("❌ Errore nello stop BPM:", error);
        addLog("⚠️ Errore nell'interruzione dello streaming BPM.");
      });

    // 🛑 Ferma l'aggiornamento dei grafici
    stopGraficiRefresh();
    aggiornaListaEsercizi();

    const tuttiCompletati = sessione.programmaEsercizi.every(es => es.dataFine);
    if (tuttiCompletati) {
      mostraPopupSessioneCompleta();
      document.getElementById("end-session-button").style.display = "inline-block"; // ✅ Mostra il pulsante "Termina Sessione"
    }
    // ✅ Log: Mostra il programma degli esercizi aggiornato dopo la modifica
    logProgrammaEsercizi();
  } else {
    addLog("⚠️ Errore: Nessun esercizio corrente da fermare.");
  }
}
function mostraPopupSessioneCompleta() {
  const popup = document.createElement("div");
  popup.id = "popup-completato";
  popup.classList.add("popup-overlay");

  popup.innerHTML = `
    <div class="popup-content">
      <h3 class="popup-title">🎉 Complimenti! 🎉</h3>
      <p class="popup-text">Hai completato tutti gli esercizi della sessione.</p>
      <button id="termina-sessione" class="popup-button bg-red-600">Termina Sessione</button>
      <button id="chiudi-popup-completato" class="popup-button">Chiudi</button>
    </div>
  `;

  document.body.appendChild(popup);

  // ✅ Evento per chiudere il popup
  document.getElementById("chiudi-popup-completato").addEventListener("click", () => {
    document.body.removeChild(popup);
  });

  // ✅ Evento per terminare la sessione e mostrare il popup dei dettagli
  document.getElementById("termina-sessione").addEventListener("click", async () => {
    const now = new Date(); // 📌 Data attuale
    sessione.dataFine = formattaData(now); // ⏳ Imposta la data di fine sessione

    // 🔥 Recupera l'ID della sessione dai parametri URL
    const urlParams = new URLSearchParams(window.location.search);
    sessione.id = urlParams.get("id");

    // 📌 Assicura che tutti gli esercizi completati siano registrati
    sessione.eserciziEseguiti = sessione.programmaEsercizi.filter(es => es.dataFine);

    // ✅ Controlla che l'ID della sessione sia valido
    if (!sessione.id) {
        addLog("⚠️ Errore: ID della sessione mancante.");
        alert("⚠️ Errore: ID della sessione non trovato. Contatta il supporto.");
        return;
    }

    // ✅ Log per debugging
    addLog("📤 Invio dati della sessione al server...");
    addLog(`⏳ Sessione terminata il ${sessione.dataFine}`);
    
    // 📡 **Invio dati al backend**
    try {
        const response = await fetch(`/api/sessioni/${sessione.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                dataFine: sessione.dataFine, // ⏳ Data di fine della sessione
                eserciziEseguiti: sessione.eserciziEseguiti.map(es => es.id), // ✅ Invia solo gli ID
            }),
        });

        const responseData = await response.json();
        console.log("✅ Risposta API:", responseData);  // 🔥 Debug risposta

        if (!response.ok) {
            throw new Error(`Errore API: ${responseData.error || response.statusText}`);
        }

        addLog("✅ Dati sessione inviati con successo!");
        alert("✅ Sessione terminata e dati aggiornati!");

        // ✅ Chiudi il popup attuale
        document.body.removeChild(popup);

        // ✅ Mostra automaticamente il popup dei dettagli della sessione
        mostraPopupDettagliSessione();

    } catch (error) {
        console.error("❌ Errore nell'invio dati sessione:", error);
        addLog(`⚠️ Errore API: ${error.message}`);
        alert("⚠️ Errore nel salvataggio dei dati. Contatta il supporto.");
    }
  });
}




// 🔹 Funzione per calcolare la durata della sessione
function calcolaDurataSessione() {
  if (!sessione.dataInizio || !sessione.dataFine) return "N/A";
  const inizio = new Date(sessione.dataInizio);
  const fine = new Date(sessione.dataFine);
  const diffMs = fine - inizio;
  const minuti = Math.floor(diffMs / 60000);
  const secondi = Math.floor((diffMs % 60000) / 1000);
  return `${minuti} min ${secondi} sec`;
}
async function scaricaReportExcel() {
  const sessionId = new URLSearchParams(window.location.search).get("id");

  if (!sessionId) {
    alert("❌ Errore: ID sessione mancante.");
    return;
  }

  try {
    const response = await fetch(`/api/sessioni/${sessionId}/report`);

    if (!response.ok) {
      throw new Error("Errore durante la generazione del report.");
    }

    // 📌 Scarica il file
    const blob = await response.blob();
    const link = document.createElement("a");
    link.href = window.URL.createObjectURL(blob);
    link.download = `Report_Sessione_${sessionId}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    alert("✅ Report scaricato con successo!");
  } catch (error) {
    console.error("❌ Errore nel download del report:", error);
    alert("❌ Errore durante il download del report Excel.");
  }
}



// 🔹 Funzione per calcolare la durata di un esercizio
function calcolaDurataEsercizio(esercizio) {
  if (!esercizio.dataInizio || !esercizio.dataFine) return "N/A";
  const inizio = new Date(esercizio.dataInizio);
  const fine = new Date(esercizio.dataFine);
  return Math.floor((fine - inizio) / 60000); // Restituisce la durata in minuti
}



/**
 * 🔥 Funzione che stampa il programma esercizi nei log
 */
function logProgrammaEsercizi() {
  let logMessaggio = "📋 **Programma Esercizi Aggiornato:**\n";

  sessione.programmaEsercizi.forEach((es, index) => {
    let stato = es.dataFine ? "✅ COMPLETATO" : es.dataInizio ? "🟡 IN CORSO" : "🔴 NON AVVIATO";
    logMessaggio += `${index + 1}. ${es.nomeEsercizio} - Stato: ${stato}\n`;
  });

  addLog(logMessaggio);
}




let refreshInterval = null; // Variabile per controllare l'intervallo di aggiornamento

function refreshGrafici() {
  if (!sessione.esercizioCorrente) {
    return; // Se non c'è un esercizio in corso, non aggiorniamo
  }

  const iframes = document.querySelectorAll(".rounded-iframe"); // Seleziona tutti gli iframe dei grafici
  iframes.forEach((iframe) => {
    let url = new URL(iframe.src);
    url.searchParams.set("t", Date.now()); // Aggiunge un timestamp senza perdere parametri
    iframe.src = url.toString();
  });
}

// Funzione per avviare l'aggiornamento dei grafici solo se non è già attivo
function startGraficiRefresh() {
  if (!refreshInterval) {
    refreshInterval = setInterval(refreshGrafici, 2000); // Aggiorna ogni 2 secondi
    console.log("🔄 Aggiornamento dei grafici avviato.");
  }
}

// Funzione per fermare l'aggiornamento dei grafici
function stopGraficiRefresh() {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
    console.log("⏹️ Aggiornamento dei grafici interrotto.");
  }
}

// Aggiungiamo il timer all'interno della flex-container
document.addEventListener("DOMContentLoaded", () => {
  const flexContainer = document.querySelector(".flex-container");
});

document.getElementById("start-exercise-button").addEventListener("click", () => {
  if (!sessione.checkConnection) {
    console.log("⚠ Nessuna sessione attiva! Avvio sessione automaticamente...");
    avviaSessione();
  }

  if (selectedExerciseId === null) {
    console.log("⚠ Nessun esercizio selezionato! Mostro il popup.");
    mostraPopupSelezioneEsercizio();
    alert("⚠️ Devi selezionare prima un esercizio.");
  } else {
    console.log(`▶ Avvio esercizio con ID: ${selectedExerciseId}`);
    avviaEsercizio(selectedExerciseId);
    addLog(`Esercizio con ID ${selectedExerciseId} avviato tramite Play.`);
  }
});


document.getElementById("stop-exercise-button").addEventListener("click", () => {
  stopExerciseWithTimer();
});

function mostraPopupSelezioneEsercizio() {
  const modal = document.getElementById("exercise-modal");
  const exerciseList = document.getElementById("exercise-modal-list");

  // Svuota la lista prima di aggiungere nuovi elementi
  exerciseList.innerHTML = "";

  // 🔥 Filtra solo gli esercizi NON ANCORA COMPLETATI
  const eserciziNonCompletati = sessione.programmaEsercizi.filter(es => !es.dataFine);

  // Verifica se ci sono esercizi disponibili
  if (eserciziNonCompletati.length === 0) {
    addLog("⚠️ Nessun esercizio disponibile da eseguire.");
    alert("⚠️ Tutti gli esercizi sono stati completati!");
    return;
  }

  // Popola il popup con gli esercizi della sessione NON COMPLETATI
  eserciziNonCompletati.forEach((esercizio) => {
    const listItem = document.createElement("li");
    listItem.classList.add("flex", "justify-between", "items-center", "border-b", "py-2");

    listItem.innerHTML = `
      <img src="img/${esercizio.nomeImmagine || 'placeholder.jpg'}" alt="${esercizio.nomeEsercizio}" 
          class="w-16 h-16 rounded-lg shadow-md object-cover">
      <span class="font-semibold flex-1">${esercizio.nomeEsercizio}</span>
      <button class="bg-blue-500 text-white px-3 py-1 rounded" onclick="selezionaEsercizio('${esercizio.id}')">
          Seleziona
      </button>
    `;

    exerciseList.appendChild(listItem);
  });

  modal.classList.remove("hidden"); // Mostra il popup
}

function mostraPopupDettagliSessione() {
  const popup = document.createElement("div");
  popup.id = "popup-dettagli-sessione";
  popup.classList.add("popup-overlay");

  let dettagliSessione = `
    <ul class="popup-list">
      <li><strong>Data Inizio:</strong> ${sessione.dataInizio || "N/A"}</li>
      <li><strong>Data Fine:</strong> ${sessione.dataFine || "N/A"}</li>
      <li><strong>Connessione Attiva:</strong> ${sessione.checkConnection ? "Sì" : "No"}</li>
      <li><strong>Esercizi Completati:</strong> ${sessione.eserciziEseguiti.length}/${sessione.programmaEsercizi.length}</li>
      <li><strong>Tempo Totale:</strong> ${calcolaDurataSessione()}</li>
    </ul>
    <h4 class="popup-subtitle">📋 Esercizi:</h4>
    <ul class="popup-list">
      ${sessione.programmaEsercizi.map(es => `
        <li>
          <img src="img/${es.nomeImmagine || 'placeholder.jpg'}" style="width: 50px; height: 50px; border-radius: 8px; margin-right: 10px;">
          <strong>${es.nomeEsercizio}</strong> 
          (${es.dataFine ? " Completato" : " Non terminato"})
        </li>
      `).join('')}
    </ul>
  `;

  popup.innerHTML = `
    <div class="popup-content">
      <h3 class="popup-title"> Dettagli della Sessione</h3>
      ${dettagliSessione}
      <button id="scarica-report" class="popup-button"> Scarica Report Excel</button>
      <button id="chiudi-popup-dettagli" class="popup-button"> Chiudi</button>
    </div>
  `;

  document.body.appendChild(popup);

  // Eventi pulsanti
  document.getElementById("chiudi-popup-dettagli").addEventListener("click", () => {
    document.body.removeChild(popup);
  });

  document.getElementById("scarica-report").addEventListener("click", scaricaReportExcel);
}

// Funzione per chiudere il popup
document.getElementById("close-modal").addEventListener("click", () => {
  document.getElementById("exercise-modal").classList.add("hidden");
});

document.addEventListener("DOMContentLoaded", () => {
  const exerciseListWrapper = document.getElementById("exercise-list-wrapper");
  const sessionDetailsContainer = document.getElementById("session-details-container");

  const toggleExerciseButton = document.getElementById("toggle-exercise-program");
  const toggleSessionDetailsButton = document.getElementById("toggle-session-details");

  // Funzione per alternare visibilità del programma di esercizi
  toggleExerciseButton.addEventListener("click", () => {
    if (exerciseListWrapper.classList.contains("hidden-section")) {
      exerciseListWrapper.classList.remove("hidden-section");
      exerciseListWrapper.classList.add("expanded");
      toggleExerciseButton.textContent = "Nascondi Programma Esercizi";
    } else {
      exerciseListWrapper.classList.remove("expanded");
      exerciseListWrapper.classList.add("hidden-section");
      toggleExerciseButton.textContent = "Mostra Programma Esercizi";
    }
  });

  // Funzione per alternare visibilità dei dettagli della sessione
  toggleSessionDetailsButton.addEventListener("click", () => {
    if (sessionDetailsContainer.classList.contains("hidden-section")) {
      sessionDetailsContainer.classList.remove("hidden-section");
      sessionDetailsContainer.classList.add("expanded");
      toggleSessionDetailsButton.textContent = "Nascondi Dettagli Sessione";
    } else {
      sessionDetailsContainer.classList.remove("expanded");
      sessionDetailsContainer.classList.add("hidden-section");
      toggleSessionDetailsButton.textContent = "Mostra Dettagli Sessione";
    }
  });
});



// Collega il pulsante di avvio della sessione
startSessionButton.onclick = avviaSessione;

// Aggiorna la lista al caricamento della pagina
aggiornaListaEsercizi();
aggiornaEsercizioCorrente();





document.getElementById("start-session-button").addEventListener("click", function () {
  document.getElementById("content").classList.remove("hidden");
  this.classList.add("hidden");
});

// Funzione per applicare il colore ai pulsanti
function styleButton(button) {
  button.style.backgroundColor = "#003366";
  button.style.color = "white";
  button.style.border = "none";
  button.style.padding = "10px 15px";
  button.style.borderRadius = "5px";
  button.style.cursor = "pointer";
  button.style.transition = "background-color 0.3s";
  button.onmouseover = () => button.style.backgroundColor = "#002244";
  button.onmouseout = () => button.style.backgroundColor = "#003366";
}

// Funzione per aggiungere un log al contenitore del log
function addLog(message) {
  const logLine = document.createElement("div");
  logLine.textContent = `> ${message}`;
  logLine.style.marginBottom = "5px";
  logLine.style.color = "#003366";
  logLine.style.opacity = "0";
  logLine.style.transition = "opacity 0.5s";
  logContainer.appendChild(logLine);

  setTimeout(() => {
    logLine.style.opacity = "1";
  }, 50);

  logContainer.scrollTop = logContainer.scrollHeight;
}

document.addEventListener("DOMContentLoaded", function () {
  const startButton = document.getElementById("start-session-button");
  const endButton = document.getElementById("end-session-button");

  if (startButton) {
    styleButton(startButton);
    startButton.addEventListener("click", function () {
      startButton.style.display = "none";
      endButton.style.display = "inline-block";
    });
  }

  if (endButton) {
    styleButton(endButton);
    endButton.addEventListener("click", async function () {
        const now = new Date(); // 📌 Data attuale
        sessione.dataFine = formattaData(now); // ⏳ Imposta la data di fine sessione

        // 🔥 Recupera l'ID della sessione dai parametri URL
        const urlParams = new URLSearchParams(window.location.search);
        sessione.id = urlParams.get("id"); 

        // 📌 Assicura che tutti gli esercizi completati siano registrati
        sessione.eserciziEseguiti = sessione.programmaEsercizi.filter(es => es.dataFine);

        // ✅ Controlla che l'ID della sessione sia valido
        if (!sessione.id) {
            addLog("⚠️ Errore: ID della sessione mancante.");
            alert("⚠️ Errore: ID della sessione non trovato. Contatta il supporto.");
            return;
        }

        // ✅ Log per debugging
        addLog("📤 Invio dati della sessione al server...");
        addLog(`⏳ Sessione terminata il ${sessione.dataFine}`);
        
        // 📡 **Invio dati al backend**
        try {
            const response = await fetch(`/api/sessioni/${sessione.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    dataFine: sessione.dataFine, // ⏳ Data di fine della sessione
                    eserciziEseguiti: sessione.eserciziEseguiti.map(es => es.id), // ✅ Invia solo gli ID
                }),
            });

            const responseData = await response.json();
            console.log("✅ Risposta API:", responseData);  // 🔥 Debug risposta

            if (!response.ok) {
                throw new Error(`Errore API: ${responseData.error || response.statusText}`);
            }

            addLog("✅ Dati sessione inviati con successo!");
            alert("✅ Sessione terminata e dati aggiornati!");

        } catch (error) {
            console.error("❌ Errore nell'invio dati sessione:", error);
            addLog(`⚠️ Errore API: ${error.message}`);
            alert("⚠️ Errore nel salvataggio dei dati. Contatta il supporto.");
        }

        // 🔄 Ripristina il pulsante di avvio sessione
        endButton.style.display = "none";
        startButton.style.display = "inline-block";
    });
}


  
});

// Applicazione dello stile a tutti i pulsanti della pagina
setTimeout(() => {
  document.querySelectorAll("button").forEach(styleButton);
}, 100);

document.addEventListener("DOMContentLoaded", () => {
  const sessionDetailsContainer = document.getElementById("session-details-container");
  const toggleSessionDetailsButton = document.getElementById("toggle-session-details");

  toggleSessionDetailsButton.addEventListener("click", () => {
    if (sessionDetailsContainer.classList.contains("expanded")) {
      sessionDetailsContainer.classList.remove("expanded");
      toggleSessionDetailsButton.textContent = "Mostra Dettagli Sessione";
    } else {
      sessionDetailsContainer.classList.add("expanded");
      toggleSessionDetailsButton.textContent = "Nascondi Dettagli Sessione";
    }
  });
});

async function aggiornaStatoSensori(sessionId) {
  try {
    const response = await fetch(`/api/check-sensors`);
    const data = await response.json();

    if (data.success) {
      data.sensori.forEach((sensore) => {
        const elemento = document.getElementById(`sensor-${sensore.id}`);
        if (elemento) {
          elemento.textContent = sensore.stato;
        }
      });

      // Aggiorna checkConnection nel database se cambia
      if (data.checkConnection) {
        await fetch(`/api/sessioni/${sessionId}/check-connection`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ checkConnection: true }),
        });
      }
    }
  } catch (error) {
    console.error("❌ Errore nel recupero dello stato dei sensori:", error);
  }
}

// Esegui il test dei sensori quando si preme il pulsante
document.getElementById("start-sensor-test").addEventListener("click", () => {
  const sessionId = "ID_DELLA_SESSIONE"; // Sostituisci con l'ID reale
  aggiornaStatoSensori(sessionId);
});


let datiRaccolti = [];

function sendToInflux(data) {
    try {
        const writeApi = getWriteApi();

        if (!data || typeof data !== "object") {
            console.error("⚠️ Errore: Dati non validi per l'invio a InfluxDB.");
            return;
        }

        const timestamp = new Date();
        const value = parseFloat(data['_value']);
        const field = data['_field'] ? data['_field'].trim() : null;
        const measurement = data['_measurement'] ? data['_measurement'].trim() : null;
        const device = data['device'] || "unknown_device";
        const subject = data['subject'] || "unknown_subject";

        if (isNaN(value) || !field || !measurement) {
            console.error(`⚠️ Dati non validi: ${JSON.stringify(data)}`);
            return;
        }

        // Salva i dati nell'array per mostrarli nel popup
        datiRaccolti.push({
            timestamp,
            measurement,
            field,
            value,
            device,
            subject,
        });

        // Aggiorna l'interfaccia utente con i dati in arrivo
        aggiornaUIConDati(data);

        const point = new Point(measurement)
            .tag('device', device)
            .tag('subject', subject)
            .floatField(field, value)
            .timestamp(timestamp);

        writeApi.writePoint(point);
        console.log(`✅ [InfluxDB] Dato inviato con successo: ${JSON.stringify(data)}`);
    } catch (error) {
        console.error("❌ Errore nell'invio a InfluxDB:", error);
    }
}

// Funzione per aggiornare la UI con i dati in tempo reale
function aggiornaUIConDati(data) {
    const container = document.getElementById("dati-in-arrivo");
    const div = document.createElement("div");
    div.innerHTML = `<strong>${data._field}</strong>: ${data._value} (${data.device})`;
    div.style.marginBottom = "5px";
    container.appendChild(div);

    // Mantieni visibili solo gli ultimi 10 elementi
    if (container.childNodes.length > 10) {
        container.removeChild(container.firstChild);
    }
}

// Funzione per mostrare il popup di conferma
function mostraPopupDati() {
  // Controlla se un popup esiste già e lo rimuove prima di crearne uno nuovo
  const existingPopup = document.getElementById("popup-dati");
  if (existingPopup) {
      existingPopup.remove();
  }

  // Creazione del popup con lo stile coerente
  const popup = document.createElement("div");
  popup.id = "popup-dati";
  popup.classList.add("popup-overlay");

  popup.innerHTML = `
      <div class="popup-content">
          <h3 class="popup-title">📡 Dati Raccolti</h3>
          <p class="popup-text">Ecco i dati ricevuti in tempo reale:</p>
          <ul id="lista-dati-popup" class="popup-list">
              ${datiRaccolti.map(dato => `
                  <li class="popup-item">
                      ${dato.timestamp.toLocaleTimeString()} - ${dato.measurement} (${dato.field}): ${dato.value}
                  </li>
              `).join('')}
          </ul>
          <button id="chiudi-popup-dati" class="popup-button">OK</button>
      </div>
  `;

  document.body.appendChild(popup);

  // Aggiungi evento per chiudere il popup al clic sul pulsante OK
  document.getElementById("chiudi-popup-dati").addEventListener("click", () => {
      document.body.removeChild(popup);
  });
}

// Evento per chiudere il popup
document.getElementById("chiudi-popup").addEventListener("click", () => {
    document.getElementById("popup-dati").style.display = "none";
});

// Evento per inviare i dati raccolti
document.getElementById("invia-dati").addEventListener("click", async () => {
    try {
        const response = await fetch("/api/saveCollectedData", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(datiRaccolti),
        });

        if (!response.ok) throw new Error("Errore durante il salvataggio");

        alert("✅ Dati salvati con successo!");
        document.getElementById("popup-dati").style.display = "none";
        datiRaccolti = []; // Svuota la lista dopo l'invio

    } catch (error) {
        console.error("❌ Errore nell'invio dei dati:", error);
        alert("❌ Errore nell'invio dei dati. Riprova.");
    }
});