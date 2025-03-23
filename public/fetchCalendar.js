async function fetchCalendar() {
    console.log("ℹ️ Inizio caricamento calendario...");
    const calendarEl = document.getElementById('calendar');
    const popup = document.getElementById('popup');
    const popupList = document.getElementById('popup-list');
    const closePopupButton = document.getElementById('close-popup');

    if (!calendarEl) {
        console.error("❌ Errore: Elemento #calendar non trovato!");
        return;
    }

    try {
        // 1️⃣ Recupero l'utente autenticato
        console.log("🔍 Recupero dati utente...");
        const userResponse = await fetch('/api/users/me');
        if (!userResponse.ok) throw new Error('Errore nel recupero dell\'utente.');
        const currentUser = await userResponse.json();
        const userId = currentUser.id;

        if (!userId) throw new Error("❌ Errore: ID utente non trovato!");

        console.log(`🔍 Recupero sessioni per l'utente ${userId}...`);
        const sessionResponse = await fetch(`/api/sessioniPerUtente/${userId}`);
        if (!sessionResponse.ok) throw new Error('Errore durante il recupero delle sessioni.');

        let sessions = await sessionResponse.json();
        console.log("✅ Sessioni recuperate:", sessions);

        if (!sessions.length) {
            console.warn("⚠️ Nessuna sessione trovata.");
        }

        // 2️⃣ Creazione di una mappa delle sessioni per data (solo sessioni senza dataFine)
        const sessionMap = {};
        sessions.forEach(session => {
            if (session.dataFine) return; // ❌ Escludiamo le sessioni con dataFine
            
            const dateKey = new Date(session.dataInizio).toISOString().split('T')[0]; // Estrai solo la data (YYYY-MM-DD)
            if (!sessionMap[dateKey]) sessionMap[dateKey] = [];
            sessionMap[dateKey].push(session);
        });

        // 3️⃣ Formattazione delle sessioni in eventi per il calendario
        const events = sessions
            .filter(session => !session.dataFine) // ❌ Escludiamo le sessioni con dataFine
            .map(session => {
                if (!session.dataInizio) {
                    console.error(`❌ Sessione ${session._id} senza dataInizio!`, session);
                    return null;
                }

                return {
                    id: session._id, // Manteniamo l'ID per la gestione del click
                    title: "Avvia Sessione", // 🔹 Mostra la scritta invece del nome dell'esercizio
                    start: new Date(session.dataInizio).toISOString(),
                    backgroundColor: '#4CAF50',
                    borderColor: '#388E3C'
                };
            })
            .filter(event => event !== null);

        console.log("✅ Eventi formattati (senza dataFine):", events);

        // 4️⃣ Inizializzazione del calendario con gestione del click sulla data
        console.log("🛠️ Inizializzazione FullCalendar...");
        const calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: 'dayGridMonth',
            locale: 'it',
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay'
            },
            height: 'auto',
            contentHeight: 'auto',
            aspectRatio: 1.8,
            events: events,
            buttonText: {
                today: 'Oggi',
                month: 'Mese',
                week: 'Settimana',
                day: 'Giorno',
                list: 'Lista',
                prev: 'Prec',  // Pulsante per il mese precedente
                next: 'Succ'   // Pulsante per il mese successivo
            },
            views: {
                dayGridMonth: { titleFormat: { year: 'numeric', month: 'long' } },
                timeGridWeek: { titleFormat: { year: 'numeric', month: 'long', day: 'numeric' } },
                timeGridDay: { titleFormat: { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' } }
            },
            dateClick: function(info) {
                const selectedDate = info.dateStr; // Formato YYYY-MM-DD
                console.log(`📅 Click sulla data: ${selectedDate}`);

                if (sessionMap[selectedDate] && sessionMap[selectedDate].length > 0) {
                    // 5️⃣ Mostra il pop-up con le sessioni di quel giorno
                    popup.style.display = 'block';
                    popupList.innerHTML = ''; // Svuota la lista

                    sessionMap[selectedDate].forEach(session => {
                        const sessionTime = new Date(session.dataInizio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        const listItem = document.createElement('li');
                        listItem.innerHTML = `
                            <span>Utente: ${session.utente.username}, Inizio: ${sessionTime}</span>
                            <button data-id="${session._id}" class="start-session-btn">Avvia</button>
                        `;
                        popupList.appendChild(listItem);
                    });

                    document.querySelectorAll('.start-session-btn').forEach(button => {
                        button.addEventListener('click', function () {
                            const sessionId = this.getAttribute('data-id');
                            if (sessionId) window.location.href = `/avvia-sessione?id=${sessionId}`;
                        });
                    });
                } else {
                    console.warn("⚠️ Nessuna sessione per questa data.");
                }
            },
            eventClick: function(info) {
                const sessionId = info.event.id; // Prendi l'ID della sessione dall'evento cliccato
                if (sessionId) {
                    window.location.href = `/avvia-sessione?id=${sessionId}`; // Reindirizza alla sessione
                }
            }
        });

        calendar.render();
        console.log("✅ Calendario renderizzato con successo!");

        // 6️⃣ Chiusura del pop-up
        if (closePopupButton) {
            closePopupButton.addEventListener("click", function () {
                popup.style.display = "none";
            });
        }

    } catch (error) {
        console.error("❌ Errore nel caricamento del calendario:", error.message);
    }
}

// Avvio della funzione quando il DOM è pronto
document.addEventListener('DOMContentLoaded', () => {
    console.log("📢 DOM completamente caricato. Avvio fetchCalendar...");
    fetchCalendar();
});
