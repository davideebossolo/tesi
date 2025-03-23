const express = require('express');
const bodyParser = require('body-parser');
const { MongoClient } = require('mongodb');
const multer = require('multer');
const path = require('path');
const xlsx = require('xlsx'); // Importa il modulo xlsx
const fs = require('fs');
const csvParser = require('csv-parser');
const { InfluxDB, Point } = require('@influxdata/influxdb-client'); 
const session = require('express-session');
const PORT = 8080;
const app = express();
const { ObjectId } = require("mongodb");
const cors = require('cors');
const axios = require("axios");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const router = express.Router();

const dispositiviMonitorati = {
    "74:4D:BD:2C:0D:14": "ECG",
    "74:4D:BD:2C:43:D8": "Accelerometro",
    "84:FC:E6:50:9E:F8": "Temperatura",
    "84:FC:E6:52:4B:58": "Pressione",
  };

// 📌 Creazione di una nuova sessione
router.post('/sessioni', async (req, res) => {
    try {
        console.log("📌 [LOG] Creazione di una nuova sessione...");
        const { utenteId, dataInizio, programmaEsercizi } = req.body;

        if (!utenteId || !dataInizio || !Array.isArray(programmaEsercizi)) {
            console.error("❌ [ERRORE] Dati incompleti nella richiesta.");
            return res.status(400).json({ error: 'Dati incompleti. Assicurati di includere utenteId, dataInizio e un array di esercizi.' });
        }

        console.log("✅ [LOG] Dati ricevuti:", { utenteId, dataInizio, programmaEsercizi });

        const usersCollection = req.db.collection('utenti');
        const sessionsCollection = req.db.collection('sessione');

        const utente = await usersCollection.findOne({ _id: new ObjectId(utenteId) });
        if (!utente) {
            console.error(`❌ [ERRORE] Utente con ID ${utenteId} non trovato.`);
            return res.status(404).json({ error: 'Utente non trovato.' });
        }

        console.log(`✅ [LOG] Utente trovato: ${utente.username}`);

        const eserciziIds = programmaEsercizi.map(id => new ObjectId(id));

        const nuovaSessione = {
            utenteId: new ObjectId(utenteId),
            dataInizio,
            dataFine: null,
            checkConnection: false,
            programmaEsercizi: eserciziIds,
            eserciziEseguiti: [],
            esercizioCorrente: null
        };

        console.log("📌 [LOG] Creazione della sessione...", nuovaSessione);
        const risultato = await sessionsCollection.insertOne(nuovaSessione);
        console.log("✅ [LOG] Sessione creata con successo!", risultato.insertedId);

        res.status(201).json({ message: 'Sessione creata con successo!', id: risultato.insertedId });
    } catch (error) {
        console.error("❌ [ERRORE] Errore durante la creazione della sessione:", error);
        res.status(500).json({ error: 'Errore interno del server', details: error.message });
    }
});
// 📌 Recupero di tutte le sessioni
// 📌 Recupero di tutte le sessioni
router.get('/sessioni', async (req, res) => {
    try {
        console.log("📌 [LOG] Recupero di tutte le sessioni...");

        const sessioni = await req.db.collection('sessione').aggregate([
            {
                $lookup: {
                    from: "utenti",
                    localField: "utenteId",
                    foreignField: "_id",
                    as: "utente"
                }
            },
            { $unwind: "$utente" },
            {
                $lookup: {
                    from: "esercizi",
                    localField: "programmaEsercizi",
                    foreignField: "_id",
                    as: "dettagliEsercizi"
                }
            },
            {
                $project: {
                    _id: 1,
                    utenteId: 1,
                    "utente.username": 1,
                    dataInizio: 1,
                    dataFine: 1,
                    stato: {
                        $cond: { 
                            if: { $lt: ["$dataFine", new Date()] }, 
                            then: "Conclusa", 
                            else: "Attiva" 
                        }
                    },
                    dettagliEsercizi: {
                        _id: 1,
                        nomeEsercizio: 1,
                        dataCreazione: 1
                    }
                }
            }
        ]).toArray();

        if (!sessioni.length) {
            return res.status(404).json({ error: 'Nessuna sessione trovata.' });
        }

        console.log("📋 Sessioni caricate:", sessioni.length);
        res.json(sessioni);
    } catch (error) {
        console.error('❌ Errore durante il recupero delle sessioni:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

// 📌 Recupero sessioni per un singolo utente
router.get('/sessioniPerUtente/:idutente', async (req, res) => {
    try {
        const { idutente } = req.params;

        if (!ObjectId.isValid(idutente)) {
            return res.status(400).json({ error: 'ID utente non valido' });
        }

        console.log(`📌 [LOG] Recupero sessioni per utente ID: ${idutente}`);

        const sessioni = await req.db.collection('sessione').aggregate([
            { $match: { utenteId: new ObjectId(idutente) } },
            {
                $lookup: {
                    from: "utenti",
                    localField: "utenteId",
                    foreignField: "_id",
                    as: "utente"
                }
            },
            { $unwind: "$utente" },
            {
                $lookup: {
                    from: "esercizi",
                    localField: "programmaEsercizi",
                    foreignField: "_id",
                    as: "dettagliEsercizi"
                }
            }
        ]).toArray();

        if (!sessioni.length) {
            return res.status(404).json({ error: 'Nessuna sessione trovata per questo utente.' });
        }

        res.json(sessioni);
    } catch (error) {
        console.error('❌ Errore durante il recupero delle sessioni per utente:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

// 📌 Recupero dettagli di una singola sessione
router.get('/sessioni/:id', async (req, res) => {
    try {
        const sessionId = req.params.id;

        if (!ObjectId.isValid(sessionId)) {
            return res.status(400).json({ error: 'ID della sessione non valido' });
        }

        console.log(`📌 [LOG] Recupero dettagli per la sessione ID: ${sessionId}`);

        const sessione = await req.db.collection('sessione').aggregate([
            { $match: { _id: new ObjectId(sessionId) } },
            {
                $lookup: {
                    from: 'esercizi',
                    localField: 'programmaEsercizi',  
                    foreignField: '_id',
                    as: 'dettagliEsercizi'
                }
            },
            {
                $lookup: {
                    from: 'utenti',
                    localField: 'utenteId',  
                    foreignField: '_id',
                    as: 'utente'
                }
            },
            { $unwind: { path: "$utente", preserveNullAndEmptyArrays: true } },
            {
                $addFields: {
                    programmaEsercizi: "$dettagliEsercizi",  
                    utente: { username: "$utente.username" } 
                }
            },
            {
                $project: {
                    _id: 1,
                    utente: 1,
                    dataInizio: 1,
                    dataFine: 1,
                    checkConnection: 1,
                    programmaEsercizi: {
                        _id: 1,                  
                        nomeEsercizio: 1,
                        nomeImmagine: 1,
                        dataCreazione: 1
                    },
                    eserciziEseguiti: 1,
                    esercizioCorrente: 1,
                    stato: 1
                }
            }
        ]).toArray();

        if (!sessione.length) {
            return res.status(404).json({ error: 'Sessione non trovata' });
        }

        res.json(sessione[0]);

    } catch (error) {
        console.error('❌ Errore durante il recupero della sessione:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

// 📌 Recupero di tutti gli esercizi
router.get('/esercizi', async (req, res) => {
    try {
        console.log("📌 [LOG] Recupero esercizi...");
        const esercizi = await req.db.collection('esercizi').find({}).toArray();
        
        if (!esercizi.length) {
            return res.status(404).json({ error: 'Nessun esercizio trovato.' });
        }

        res.json(esercizi);
    } catch (error) {
        console.error('❌ Errore nel recupero degli esercizi:', error);
        res.status(500).json({ error: 'Errore interno del server.' });
    }
});

// 📌 Creazione di un nuovo esercizio
router.post('/crea-esercizio', async (req, res) => {
    try {
        console.log("📌 [LOG] Creazione di un nuovo esercizio...");
        const { nomeEsercizio, nomeImmagine } = req.body;

        if (!nomeEsercizio || !nomeImmagine) {
            return res.status(400).json({ error: 'Nome esercizio, paziente e immagine sono obbligatori.' });
        }

        const eserciziCollection = req.db.collection('esercizi');

        // ✅ Controlla se esiste già un esercizio con lo stesso nome, paziente e immagine
        const esisteGia = await eserciziCollection.findOne({ nomeEsercizio, nomeImmagine });
        if (esisteGia) {
            return res.status(409).json({ error: 'Esercizio già esistente per questo paziente con la stessa immagine.' });
        }

        // ✅ Se non esiste, crea l'esercizio
        const nuovoEsercizio = {
            nomeEsercizio,
            nomeImmagine,
            dataCreazione: new Date(),
        };

        const risultato = await eserciziCollection.insertOne(nuovoEsercizio);
        console.log("✅ [LOG] Esercizio creato con successo!", risultato.insertedId);

        res.status(201).json({ message: 'Esercizio creato con successo!', id: risultato.insertedId });
    } catch (error) {
        console.error('❌ Errore durante la creazione dell\'esercizio:', error);
        res.status(500).json({ error: 'Errore interno del server.' });
    }
});

// 📌 Eliminazione di un esercizio per ID
router.delete('/esercizi/:id', async (req, res) => {
    try {
        console.log("📌 [LOG] Eliminazione esercizio...");
        const esercizioId = req.params.id;

        if (!ObjectId.isValid(esercizioId)) {
            return res.status(400).json({ error: 'ID esercizio non valido' });
        }

        const result = await req.db.collection('esercizi').deleteOne({ _id: new ObjectId(esercizioId) });

        if (result.deletedCount === 0) {
            return res.status(404).json({ error: `Nessun esercizio trovato con ID ${esercizioId}.` });
        }

        console.log(`✅ [LOG] Esercizio ${esercizioId} eliminato con successo.`);
        res.json({ message: 'Esercizio eliminato con successo!' });
    } catch (error) {
        console.error('❌ Errore durante l\'eliminazione dell\'esercizio:', error);
        res.status(500).json({ error: 'Errore interno del server.' });
    }
});

// 📌 Aggiorna una sessione (aggiungere esercizi eseguiti con ObjectId)
router.put('/sessioni/:id', async (req, res) => {
    try {
        const sessionId = req.params.id;
        const { eserciziEseguiti, esercizioCorrente, dataFine } = req.body;

        if (!ObjectId.isValid(sessionId)) {
            return res.status(400).json({ error: 'ID della sessione non valido' });
        }

        console.log(`📌 [LOG] Aggiornamento sessione ID: ${sessionId}`);

        const updateFields = {};

        if (eserciziEseguiti && Array.isArray(eserciziEseguiti)) {
            updateFields.eserciziEseguiti = eserciziEseguiti.map(id => new ObjectId(id));
            console.log("✅ [LOG] Esercizi eseguiti aggiornati (ObjectId):", updateFields.eserciziEseguiti);
        }

        if (esercizioCorrente !== undefined) {
            updateFields.esercizioCorrente = esercizioCorrente ? new ObjectId(esercizioCorrente) : null;
            console.log(`✅ [LOG] Esercizio corrente aggiornato: ${esercizioCorrente}`);
        }

        if (dataFine) {
            updateFields.dataFine = new Date(dataFine);
            console.log("✅ [LOG] Data fine sessione aggiornata:", dataFine);
        }

        const result = await req.db.collection('sessione').updateOne(
            { _id: new ObjectId(sessionId) },
            { $set: updateFields }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ error: 'Sessione non trovata.' });
        }

        console.log("✅ [LOG] Sessione aggiornata con successo.");
        res.json({ message: 'Sessione aggiornata con successo.' });

    } catch (error) {
        console.error('❌ Errore durante l\'aggiornamento della sessione:', error);
        res.status(500).json({ error: 'Errore interno del server.' });
    }
});
router.put("/sessioni/:id/check-connection", async (req, res) => {
    try {
      const sessionId = req.params.id;
      const { checkConnection } = req.body;
  
      if (typeof checkConnection !== "boolean") {
        return res.status(400).json({ error: "Valore di checkConnection non valido" });
      }
  
      const risultato = await db.collection("sessione").updateOne(
        { _id: new ObjectId(sessionId) },
        { $set: { checkConnection } }
      );
  
      if (risultato.modifiedCount === 0) {
        return res.status(404).json({ error: "Sessione non trovata" });
      }
  
      res.json({ success: true, message: "checkConnection aggiornato con successo" });
    } catch (error) {
      console.error("❌ [ERRORE] Errore nell'aggiornamento di checkConnection:", error);
      res.status(500).json({ error: "Errore interno del server" });
    }
  });
  router.get("/check-sensors", async (req, res) => {
    try {
      let sensoriAttivi = {};
      const filePath = "AL 1.csv"; // Percorso reale del file CSV

      // Inizializza tutti i dispositivi come spenti (false)
      Object.keys(dispositiviMonitorati).forEach((device) => {
        sensoriAttivi[device] = false;
      });
  
      // Legge il CSV e verifica la presenza dei dispositivi
      fs.createReadStream(filePath)
        .pipe(csvParser())
        .on("data", (row) => {
          if (dispositiviMonitorati[row.device]) {
            sensoriAttivi[row.device] = true; // Appena troviamo un dispositivo, segniamo come attivo
          }
        })
        .on("end", async () => {
          // Controlla se almeno un sensore è attivo
          const checkConnection = Object.values(sensoriAttivi).includes(true);
  
          // Aggiorna il database se almeno un sensore è attivo
          const sessionId = req.query.sessionId;
          if (checkConnection && sessionId) {
            try {
              await req.db.collection("sessione").updateOne(
                { _id: new ObjectId(sessionId) },
                { $set: { checkConnection: true } }
              );
              console.log(`✅ [LOG] checkConnection aggiornato per la sessione ${sessionId}`);
            } catch (error) {
              console.error("❌ [ERRORE] Impossibile aggiornare la sessione:", error);
            }
          }
  
          // Costruisce la risposta JSON con lo stato dei sensori
          const statoSensori = Object.keys(dispositiviMonitorati).map((device) => ({
            nome: dispositiviMonitorati[device],
            id: device,
            stato: sensoriAttivi[device] // 🔥 Ora otteniamo true o false
          }));
  
          res.json({ success: true, checkConnection, sensori: statoSensori });
        })
        .on("error", (error) => {
          console.error("❌ Errore nella lettura del CSV:", error);
          res.status(500).json({ success: false, error: "Errore nel file CSV" });
        });
    } catch (error) {
      console.error("❌ Errore generale:", error);
      res.status(500).json({ success: false, error: "Errore interno del server" });
    }
  });
  
  // 📌 Aggiornamento sessione con esercizi completati e data di fine
router.put('/sessioni/:id/aggiorna', async (req, res) => {
    try {
        const sessionId = req.params.id;
        const { dataFine, eserciziEseguiti } = req.body;

        // ✅ Controlla che l'ID sia valido
        if (!ObjectId.isValid(sessionId)) {
            return res.status(400).json({ error: 'ID sessione non valido' });
        }

        console.log(`📌 [LOG] Aggiornamento sessione ID: ${sessionId}`);

        // ✅ Costruisce l'oggetto aggiornato
        const updateFields = {};
        
        if (dataFine) {
            updateFields.dataFine = new Date(dataFine);
            console.log("✅ [LOG] Data fine sessione aggiornata:", updateFields.dataFine);
        }

        if (eserciziEseguiti && Array.isArray(eserciziEseguiti)) {
            updateFields.eserciziEseguiti = eserciziEseguiti.map(id => new ObjectId(id));
            console.log("✅ [LOG] Esercizi eseguiti aggiornati:", updateFields.eserciziEseguiti);
        }

        // ✅ Esegui l'aggiornamento nel database
        const result = await req.db.collection('sessione').updateOne(
            { _id: new ObjectId(sessionId) },
            { $set: updateFields }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ error: 'Sessione non trovata' });
        }

        console.log("✅ [LOG] Sessione aggiornata con successo.");
        res.json({ message: 'Sessione aggiornata con successo.' });

    } catch (error) {
        console.error('❌ Errore durante l\'aggiornamento della sessione:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

// 📌 Eliminazione di una sessione per ID
router.delete('/sessioni/:id', async (req, res) => {
    try {
        const sessionId = req.params.id;

        if (!ObjectId.isValid(sessionId)) {
            return res.status(400).json({ error: "ID sessione non valido" });
        }

        console.log(`🗑️ Eliminazione della sessione con ID: ${sessionId}`);

        const result = await req.db.collection("sessione").deleteOne({ _id: new ObjectId(sessionId) });

        if (result.deletedCount === 0) {
            return res.status(404).json({ error: "Sessione non trovata" });
        }

        console.log("✅ Sessione eliminata con successo.");
        res.json({ message: "Sessione eliminata con successo." });

    } catch (error) {
        console.error("❌ Errore durante l'eliminazione della sessione:", error);
        res.status(500).json({ error: "Errore interno del server." });
    }
});

router.get("/sessioni/:id/report", async (req, res) => {
    try {
        const sessionId = req.params.id;

        // 📌 Controlla se l'ID è valido
        if (!ObjectId.isValid(sessionId)) {
            return res.status(400).json({ error: "ID sessione non valido" });
        }

        // 📌 Recupera la sessione direttamente dal database
        const sessione = await req.db.collection("sessione").findOne({ _id: new ObjectId(sessionId) });

        if (!sessione) {
            return res.status(404).json({ error: "Sessione non trovata" });
        }

        if (!sessione.eserciziEseguiti || sessione.eserciziEseguiti.length === 0) {
            return res.status(400).json({ error: "Nessun esercizio completato per questa sessione" });
        }

        // 📌 Prepara i dati per l'Excel
        const dati = sessione.eserciziEseguiti.map(es => ({
            "Nome Esercizio": es.nomeEsercizio,
            "Paziente": es.nomePaziente || "N/A",
            "Data Inizio": es.dataInizio || "N/A",
            "Data Fine": es.dataFine || "N/A",
            "Durata (min)": calcolaDurataEsercizio(es),
        }));

        // 📌 Crea il workbook e il worksheet
        const wb = xlsx.utils.book_new();
        const ws = xlsx.utils.json_to_sheet(dati);
        xlsx.utils.book_append_sheet(wb, ws, "Sessione");

        // 📌 Salva temporaneamente il file nel server
        const filePath = path.join(__dirname, `report_sessione_${sessionId}.xlsx`);
        xlsx.writeFile(wb, filePath);

        // 📌 Invia il file come risposta per il download
        res.download(filePath, `Report_Sessione_${sessionId}.xlsx`, (err) => {
            if (err) console.error("Errore nel download del report:", err);
            fs.unlinkSync(filePath); // Elimina il file dopo il download
        });

    } catch (error) {
        console.error("Errore nel generare il report:", error);
        res.status(500).json({ error: "Errore nel generare il report Excel" });
    }
});

// 📌 Funzione per calcolare la durata di un esercizio
function calcolaDurataEsercizio(esercizio) {
    if (!esercizio.dataInizio || !esercizio.dataFine) return "N/A";
    const inizio = new Date(esercizio.dataInizio);
    const fine = new Date(esercizio.dataFine);
    return Math.floor((fine - inizio) / 60000); // Restituisce la durata in minuti
}


module.exports = router;