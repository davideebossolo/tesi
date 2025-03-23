async function fetchUserInfo() {
    const userInfoDiv = document.getElementById('user-info');
    const userImage = document.getElementById('user-image');
    const userName = document.getElementById('user-name');
    const userRole = document.getElementById('user-role');
    const patientListContainer = document.getElementById('patient-list-container');
    const calendarContainer = document.getElementById('calendar-container');
    const calendar = document.getElementById('calendar');
    const menuCreateExercise = document.getElementById('menu-create-exercise');
    const menuCalendar = document.getElementById('menu-calendar');

    try {
        const response = await fetch('/api/utente');
        if (!response.ok) throw new Error('Effettua il login');

        const user = await response.json();

        // Mostra informazioni utente
        userImage.src = user.profileImage || 'utente.jpg';
        userName.textContent = user.username;
        userRole.textContent = user.role;

        

    } catch (error) {
        console.error("❌ Errore durante il caricamento dei dati utente:", error.message);
        userInfoDiv.innerHTML = '<p>Errore nel caricamento utente.</p>';
    }
}

// ✅ Avvia il caricamento delle informazioni utente quando la pagina è pronta
document.addEventListener('DOMContentLoaded', fetchUserInfo);
