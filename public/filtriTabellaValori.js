// File: filters.js

// Funzione per filtrare i dati tramite API
// File: filters.js

// Funzione per filtrare i dati tramite API
async function filtraDati() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const minValue = parseFloat(document.getElementById('minValue').value);
    const maxValue = parseFloat(document.getElementById('maxValue').value);
    
    // Recupera l'ID utente dall'URL
    const params = new URLSearchParams(window.location.search);
    const idUtente = params.get("idUtente");
    if (!idUtente) {
        document.getElementById('error-message').textContent = "❌ Errore: ID utente non trovato nell'URL.";
        return;
    }
    
    // Costruisce la query string con i parametri selezionati
    const queryParams = new URLSearchParams();
    if (startDate) queryParams.append("startDate", startDate);
    if (endDate) queryParams.append("endDate", endDate);
    if (!isNaN(minValue)) queryParams.append("minValue", minValue);
    if (!isNaN(maxValue)) queryParams.append("maxValue", maxValue);
    
    try {
        // Effettua la richiesta GET con i filtri
        const response = await fetch(`/api/misurazioni/${idUtente}?${queryParams.toString()}`);
        if (!response.ok) {
            throw new Error(`Errore HTTP ${response.status}: ${response.statusText}`);
        }
        
        // Ottiene i dati filtrati e aggiorna la tabella
        const datiFiltrati = await response.json();
        popolaTabella(datiFiltrati);
    } catch (error) {
        console.error("❌ Errore durante il filtraggio:", error);
        document.getElementById('error-message').textContent = `❌ Errore: ${error.message}`;
    }
}

// Collega il bottone "Filtra" alla funzione `filtraDati`
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("filterBtn").addEventListener("click", filtraDati);
});

// Collega il bottone "Filtra" alla funzione `filtraDati`
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("filterBtn").addEventListener("click", filtraDati);
});

// Imposta i valori minimi e massimi nei filtri basandosi sui dati ricevuti
function impostaFiltri(misurazioni) {
    if (misurazioni.length === 0) return;
    
    const valori = misurazioni.map(m => m._value);
    document.getElementById('minValue').value = Math.min(...valori);
    document.getElementById('maxValue').value = Math.max(...valori);
}

// Collega il bottone "Filtra" alla funzione `filtraDati`
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("filterBtn").addEventListener("click", filtraDati);
});

function toggleFilters() {
    const filtersDiv = document.getElementById("filters");
    if (filtersDiv.style.display === "flex") {
      filtersDiv.style.display = "none";
    } else {
      filtersDiv.style.display = "flex";
    }
  }
