document.addEventListener("DOMContentLoaded", async () => {
    const ctx = document.getElementById("chart").getContext("2d");

    try {
        const response = await fetch("/api/misurazioni");
        if (!response.ok) {
            throw new Error(`Errore nel caricamento: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log("Dati ricevuti per il grafico:", data);

        if (data.length === 0) {
            alert("Nessun dato disponibile per il grafico.");
            return;
        }

        const labels = data.map(entry => new Date(entry._time).toLocaleTimeString());
        const values = data.map(entry => entry._value);

        new Chart(ctx, {
            type: "line",
            data: {
                labels: labels,
                datasets: [{
                    label: "Misurazioni",
                    data: values,
                    borderColor: "blue",
                    borderWidth: 2,
                    pointRadius: 3,
                    fill: false
                }]
            },
            options: {
                responsive: true,
                scales: {
                    x: {
                        type: "category",
                        title: { display: true, text: "Tempo" }
                    },
                    y: {
                        title: { display: true, text: "Valore" }
                    }
                },
                plugins: {
                    zoom: {
                        pan: { enabled: true, mode: "x" },
                        zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: "x" }
                    }
                }
            }
        });

    } catch (error) {
        console.error("Errore durante il caricamento del grafico:", error);
        alert("Errore nel caricamento del grafico. Controlla la console.");
    }
});
