async function authHandler() {
    console.log("📡 [DEBUG] Avvio authHandler...");

    // Selezione degli elementi del DOM
    const elements = {
        createExerciseBtn: document.getElementById('menu-create-exercise'),
        calendarBtn: document.getElementById('menu-calendar'),
        patientListBtn: document.getElementById('menu-patient-list'),
        visualizzaDatiBtn: document.getElementById('menu-visualizza-dati'), // Aggiunto il pulsante da nascondere
        calendarContainer: document.getElementById('calendar-container'),
        physioMenu: document.getElementById('physio-menu'),
    };

    // 🔍 Debug: Verifichiamo quali elementi sono null
    console.log("📋 [DEBUG] Stato degli elementi nel DOM:");
    Object.keys(elements).forEach(key => {
        if (elements[key]) {
            console.log(`✅ ${key}: TROVATO`);
        } else {
            console.error(`❌ ${key}: NON TROVATO!`);
        }
    });

    try {
        console.log("📡 [DEBUG] Fetch dati utente...");
        const userResponse = await fetch('/api/utente', { cache: "no-store" });

        if (!userResponse.ok) throw new Error(`Errore HTTP: ${userResponse.status}`);

        const user = await userResponse.json();
        console.log("✅ [DEBUG] Utente autenticato:", user);

        function toggleElementVisibility(element, isVisible) {
            if (element) {
                console.log(`🔹 [DEBUG] Cambiamo visibilità di ${element.id}: ${isVisible ? "VISIBILE" : "NASCOSTO"}`);
                element.style.display = isVisible ? "block" : "none";
            } else {
                console.warn(`⚠️ [DEBUG] Tentativo di mostrare un elemento non trovato.`);
            }
        }

        if (user.role === 'fisioterapista') {
            console.log("✅ [DEBUG] Utente è fisioterapista, attivazione permessi...");

            toggleElementVisibility(elements.createExerciseBtn, true);
            toggleElementVisibility(elements.calendarBtn, true);
            toggleElementVisibility(elements.patientListBtn, true);
            toggleElementVisibility(elements.visualizzaDatiBtn, false); // Nascondi "Visualizza dati"

            if (elements.calendarContainer) elements.calendarContainer.style.display = "none";

            if (elements.physioMenu) {
                console.log("✅ [DEBUG] Attivazione del physioMenu...");
                elements.physioMenu.classList.remove('hidden');
                elements.physioMenu.style.display = "flex"; // Forza la visibilità se necessario
            } else {
                console.error("❌ [DEBUG] physioMenu non trovato nel DOM!");
            }

        } else {
            console.log("🔒 [DEBUG] Utente NON fisioterapista, limitazione accesso...");

            toggleElementVisibility(elements.createExerciseBtn, false);
            toggleElementVisibility(elements.calendarBtn, false);
            toggleElementVisibility(elements.patientListBtn, false);
            toggleElementVisibility(elements.visualizzaDatiBtn, true); // Mostra "Visualizza dati"

            if (elements.calendarContainer) elements.calendarContainer.style.display = "block";

            if (elements.physioMenu) {
                console.log("🔒 [DEBUG] Nascondiamo il physioMenu...");
                elements.physioMenu.classList.add('hidden');
                elements.physioMenu.style.display = "none"; // Assicura che venga nascosto
            }
        }

    } catch (error) {
        console.error("❌ [DEBUG] Errore autenticazione:", error);
    }
}

// Avvia l'autenticazione quando il DOM è pronto
document.addEventListener('DOMContentLoaded', authHandler);
