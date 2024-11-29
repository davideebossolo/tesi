function formattaData(data) {
    const year = data.getFullYear();
    const month = String(data.getMonth() + 1).padStart(2, '0');
    const day = String(data.getDate()).padStart(2, '0');
    const hours = String(data.getHours()).padStart(2, '0');
    const minutes = String(data.getMinutes()).padStart(2, '0');
    const seconds = String(data.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }
class Esercizio {
  constructor(id, nomeEsercizio, nomePaziente) {
    this.id = id;
    this.nomeEsercizio = nomeEsercizio;
    this.nomePaziente = nomePaziente;
    this.checkCorrectValue = false;
    this.checkCorrectExecution = false;
    this.checkSignalInterrupted = false;
    this.misurazione = { tempo: null, valore: null };
    this.soglie = {
      validitaDato: { nomeSoglia: "validitaDato", valoreMin: 0, valoreMax: 1000 },
      correttezzaEsecuzione: {
        nomeSoglia: "correttezzaEsecuzione",
        valoreMin: 50,
        valoreMax: 200,
      },
    };
    this.dataInizio = null;
    this.dataFine = null;
  }
}

class Sessione {
  constructor() {
    this.dataInizio = formattaData(new Date());
    this.dataFine = null;
    this.checkConnection = false;
    this.programmaEsercizi = [];
    this.eserciziEseguiti = [];
    this.esercizioCorrente = null;
    addLog(`Sessione iniziata alle ${this.dataInizio}.`);
  }

  aggiungiEsercizio(esercizio) {
    this.programmaEsercizi.push(esercizio);
    addLog(`Esercizio "${esercizio.nomeEsercizio}" aggiunto al programma.`);
  }

  startExercise(id) {
    const esercizio = this.programmaEsercizi.find((es) => es.id === id);
    if (esercizio) {
      esercizio.dataInizio = formattaData(new Date());
      this.esercizioCorrente = esercizio.nomeEsercizio;
      addLog(
        `Esercizio "${esercizio.nomeEsercizio}" avviato alle ${esercizio.dataInizio}.`
      );
    } else {
      addLog(`Errore: Esercizio con ID ${id} non trovato.`);
    }
  }

  stopExercise() {
    const esercizio = this.programmaEsercizi.find(
      (es) => es.nomeEsercizio === this.esercizioCorrente
    );
    if (esercizio) {
      esercizio.dataFine = formattaData(new Date());
      this.eserciziEseguiti.push(esercizio);
      addLog(
        `Esercizio "${esercizio.nomeEsercizio}" completato alle ${esercizio.dataFine}.`
      );
      this.esercizioCorrente = null;
    } else {
      addLog("Errore: Nessun esercizio attualmente in corso.");
    }
  }

  endSession() {
    this.dataFine = formattaData(new Date());
    addLog(`Sessione completata alle ${this.dataFine}.`);
  }
}

