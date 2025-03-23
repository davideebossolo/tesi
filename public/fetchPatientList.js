document.addEventListener("DOMContentLoaded", async () => {
    console.log("📢 DOM completamente caricato.");

    // Recupera gli elementi HTML
    const allPatientList = document.getElementById("all-patient-list");
    const personalPatientList = document.getElementById("personal-patient-list");
    const searchPersonalInput = document.getElementById("search-personal-patient");
    const searchAllInput = document.getElementById("search-all-patient");
    const filterPersonalButton = document.getElementById("filter-personal-button");
    const filterAllButton = document.getElementById("filter-all-button");
    const toggleAllPatientListButton = document.getElementById("toggle-all-patient-list");

    // Verifica che gli elementi DOM esistano prima di procedere
    if (!allPatientList || !personalPatientList || !searchPersonalInput || !searchAllInput ||
        !filterPersonalButton || !filterAllButton || !toggleAllPatientListButton) {
        console.error("❌ Errore: Uno o più elementi del DOM non trovati!");
        return;
    }

    console.log("✅ Tutti gli elementi del DOM trovati.");

    let fisioterapistaId = await getUserId();
    if (!fisioterapistaId) {
        console.error("❌ Errore: ID fisioterapista non trovato!");
        return;
    }

    console.log(`✅ ID Fisioterapista: ${fisioterapistaId}`);

    // Nasconde la lista completa dei pazienti all'inizio
    allPatientList.classList.add("hidden");
    searchAllInput.parentElement.classList.add("hidden"); // Nasconde il campo di ricerca per la lista completa

    // Carica le liste
    await caricaListaPersonale(fisioterapistaId);
    await caricaTuttiIPazienti();

    // Aggiungi i filtri
    filterPersonalButton.addEventListener("click", () => {
        filterPatients(searchPersonalInput, personalPatientList);
    });

    filterAllButton.addEventListener("click", () => {
        filterPatients(searchAllInput, allPatientList);
    });

    // Mostra/Nasconde la lista completa con un pulsante
    toggleAllPatientListButton.addEventListener("click", () => {
        allPatientList.classList.toggle("hidden");
        searchAllInput.parentElement.classList.toggle("hidden"); // Mostra/Nasconde il campo di ricerca

        if (allPatientList.classList.contains("hidden")) {
            toggleAllPatientListButton.textContent = "Aggiungi paziente alla tua lista";
        } else {
            toggleAllPatientListButton.textContent = " Nascondi lista completa";
        }
    });

    // Ottieni l'ID dell'utente loggato
    async function getUserId() {
        try {
            const response = await fetch("/api/utente");
            if (!response.ok) throw new Error("Errore nel recupero dell'utente");
            const userData = await response.json();
            return userData.id;
        } catch (error) {
            console.error("Errore nel recupero dell'ID utente:", error);
            return null;
        }
    }

    // Carica tutti i pazienti
    async function caricaTuttiIPazienti() {
        try {
            const response = await fetch("/api/pazienti");
            if (!response.ok) throw new Error("Errore nel recupero dei pazienti");
            const pazienti = await response.json();
            console.log("📋 Lista totale pazienti ricevuta:", pazienti);
            renderUserList(pazienti);
        } catch (error) {
            console.error("❌ Errore nel caricamento dei pazienti:", error);
        }
    }

    // Carica i pazienti assegnati al fisioterapista
    async function caricaListaPersonale(idFisioterapista) {
        try {
            const response = await fetch(`/api/listaPazienti/${idFisioterapista}`);
            if (!response.ok) throw new Error("Errore nel recupero della lista personale");
            const pazienti = await response.json();
            console.log("📋 Lista personale pazienti ricevuta:", pazienti);
            renderPersonalPatientList(pazienti);
        } catch (error) {
            console.error("❌ Errore nel caricamento della lista personale:", error);
        }
    }

    // Funzione per aggiungere un paziente alla lista personale
    async function aggiungiPazienteAllaLista(idPaziente) {
        try {
            const response = await fetch(`/api/listaPazienti/${fisioterapistaId}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ idPaziente }),
            });

            const result = await response.json();
            if (response.ok) {
                alert("✅ Paziente aggiunto con successo!");
                await caricaListaPersonale(fisioterapistaId);
            } else {
                alert(`❌ Errore: ${result.error}`);
            }
        } catch (error) {
            console.error("❌ Errore durante l'aggiunta del paziente:", error);
        }
    }

    // Funzione per renderizzare la lista completa con il pulsante "Aggiungi"
    function renderUserList(users) {
        allPatientList.innerHTML = "";

        if (users.length === 0) {
            allPatientList.innerHTML = "<p class='text-gray-500'>Nessun paziente trovato.</p>";
            return;
        }

        users.forEach(user => {
            const listItem = document.createElement("li");
            listItem.classList.add("flex", "items-center", "p-2", "border-b");

            const img = document.createElement("img");
            img.src = user.profileImage || "utente.jpg";
            img.alt = user.username;
            img.classList.add("w-10", "h-10", "rounded-full");

            const name = document.createElement("span");
            name.innerText = user.username;
            name.classList.add("ml-3", "font-medium", "flex-grow");

            const addButton = document.createElement("button");
            addButton.textContent = "➕";
            addButton.classList.add("bg-blue-500", "text-white", "px-3", "py-1", "rounded");
            addButton.dataset.id = user._id;

            addButton.addEventListener("click", async () => {
                await aggiungiPazienteAllaLista(user._id);
            });

            listItem.appendChild(img);
            listItem.appendChild(name);
            listItem.appendChild(addButton);
            allPatientList.appendChild(listItem);
        });
    }

    // Funzione per renderizzare la lista personale
// Funzione per renderizzare la lista personale con il pulsante "Vai"
function renderPersonalPatientList(patients) {
    personalPatientList.innerHTML = "";

    if (patients.length === 0) {
        personalPatientList.innerHTML = "<p class='text-gray-500'>Nessun paziente assegnato.</p>";
        return;
    }

    patients.forEach(patient => {
        const row = document.createElement("tr");
        row.id = `row-${patient._id}`;

        // Colonna: Nome Paziente
        const nameCell = document.createElement("td");
        nameCell.textContent = patient.username;
        nameCell.classList.add("border", "px-4", "py-2", "text-center");

        // Colonna: Email
        const emailCell = document.createElement("td");
        emailCell.textContent = patient.email || "Non disponibile";
        emailCell.classList.add("border", "px-4", "py-2", "text-center");

        // Colonna: Numero di Telefono
        const phoneCell = document.createElement("td");
        phoneCell.textContent = patient.phone || "Non disponibile";
        phoneCell.classList.add("border", "px-4", "py-2", "text-center");

        // Colonna: Vai agli allenamenti
        const actionCell = document.createElement("td");
        actionCell.classList.add("border", "px-4", "py-2", "text-center");

        const goButton = document.createElement("button");
        goButton.textContent = "Vai";
        goButton.classList.add("bg-gray-900", "text-white", "px-4", "py-2", "rounded-md", "hover:bg-gray-700");
        goButton.addEventListener("click", () => {
            window.location.href = `/visualizzaDati?idUtente=${patient._id}`;
        });
        actionCell.appendChild(goButton);

        // Colonna: Rimuovi paziente
        const removeCell = document.createElement("td");
        removeCell.classList.add("border", "px-4", "py-2", "text-center");

        const removeButton = document.createElement("button");
        removeButton.textContent = "ELIMINA";
        removeButton.classList.add("bg-red-500", "text-white", "px-3", "py-1", "rounded", "hover:bg-red-700");
        removeButton.addEventListener("click", () => removePatient(patient._id, fisioterapistaId));
        removeCell.appendChild(removeButton);

        // Aggiungi tutte le colonne alla riga
        row.appendChild(nameCell);
        row.appendChild(emailCell);
        row.appendChild(phoneCell);
        row.appendChild(actionCell);
        row.appendChild(removeCell);

        // Aggiungi la riga alla tabella
        personalPatientList.appendChild(row);
    });
}


});

// Funzione per filtrare i pazienti in base all'input
function filterPatients(searchInput, patientList) {
    const searchTerm = searchInput.value.toLowerCase().trim();
    const patients = patientList.getElementsByTagName("li");

    Array.from(patients).forEach(patient => {
        const name = patient.querySelector("span, a").textContent.toLowerCase();
        if (name.includes(searchTerm)) {
            patient.style.display = "flex"; // Mostra il paziente se il nome corrisponde
        } else {
            patient.style.display = "none"; // Nasconde il paziente se non corrisponde
        }
    });
}


async function removePatient(patientId, fisioId) {
    if (!fisioId) {
        console.error("❌ Errore: ID fisioterapista non valido!");
        return;
    }

    if (confirm("Sei sicuro di voler rimuovere questo paziente?")) {
        try {
            const response = await fetch(`/api/listaPazienti/${fisioId}/${patientId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error("Errore nella rimozione del paziente");
            }

            // Rimuove la riga della tabella dopo la rimozione
            const rowToRemove = document.getElementById(`row-${patientId}`);
            if (rowToRemove) {
                rowToRemove.remove();
            }

            alert("✅ Paziente rimosso con successo!");
        } catch (error) {
            console.error("❌ Errore nella rimozione del paziente:", error);
            alert(error.message);
        }
    }
}
