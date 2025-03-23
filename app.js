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
const { formatISO } = require('date-fns');


const autenticazione = require('./routes/autenticazione');
const utenti = require('./routes/utenti');
const routeSessioni = require('./routes/routeSessioni');


  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));
  const upload = multer({ dest: 'uploads/' });

  // Serve i file statici dalla directory "public"
  app.use(express.static('public'));

  // Configura la sessione
  app.use(
    session({
      secret: 'oceniweibciuwbiecbi8765458', // Cambia con una chiave segreta sicura
      resave: false,
      saveUninitialized: false,
      cookie: { secure: false }, // Imposta su `true` se usi HTTPS
    })
  );


  // Importa le routes modulari



  // Configurazione: URL e token del tuo InfluxDB
  const url = 'http://localhost:8086'; // Cambia con l'URL del tuo server InfluxDB
  const token = 'khWwXXDmNfSQByvRo-reCmDGAa0yNAEa6XJOiiVTm6RbwG0drsA_WQf184UWUVxOFX1ulNSDjCpwhLk0_Te6Lg=='; // Inserisci il tuo token di autenticazione
  const org = 'davide'; // Inserisci il tuo nome organizzazione
  const bucket = 'grafana'; // Nome del bucket

  //mongodb
  const MONGO_URI = 'mongodb+srv://davideebossolo:ce3rKHjSClBxdx7u@cluster1.dgwrk.mongodb.net/?retryWrites=true&w=majority&appName=Cluster1';
  const DATABASE_NAME = 'tesi';
  const COLLECTION_NAME = 'sessione'; 
  const client = new MongoClient(MONGO_URI, { useUnifiedTopology: true });
  let db;

  const influxDB = new InfluxDB({ url, token });
  const queryApi = influxDB.getQueryApi(org);
  let writeApi = influxDB.getWriteApi(org, bucket, 'ns'); // ✅ Ora possiamo ridefinirlo

  let stopStreaming = false;
  let isWriteApiClosing = false;
  let stopStreamingAcc = false;  // ✅ Aggiunta dichiarazione
  

/*
  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
        console.log(`📌 Route registrata: ${Object.keys(middleware.route.methods)} ${middleware.route.path}`);
    } else if (middleware.name === 'router') {
        middleware.handle.stack.forEach((handler) => {
            if (handler.route) {
                console.log(`📌 Route registrata: ${Object.keys(handler.route.methods)} ${handler.route.path}`);
            }
        });
    }
});
*/

async function connectToDatabase() {
  if (!db) {
    try {
      const client = new MongoClient(MONGO_URI, { useUnifiedTopology: true });
      await client.connect();
      db = client.db(DATABASE_NAME);
      console.log("✅ Connesso a MongoDB");

      await aggiornaSessioni(db); // Se necessario, aggiorna le sessioni
    } catch (error) {
      console.error("❌ Errore di connessione a MongoDB:", error);
      process.exit(1); // Esci se non riesci a connetterti
    }
  }
}

  // gestione delle routes

  app.use((req, res, next) => {
    if (!db) {
      return res.status(500).json({ error: "Database non disponibile" });
    }
    req.db = db; // Salviamo la connessione in `req.db`
    next();
  });
  app.use('/api/autenticazione', autenticazione);
  app.use('/api', utenti);
  app.use('/api', routeSessioni);

  function getWriteApi() {
    if (!writeApi || writeApi.closed) { 
      console.log("🔄 Ricreazione di writeApi...");
      const influxDB = new InfluxDB({ url: url, token: token });
      writeApi = influxDB.getWriteApi(org, bucket, "ns"); // 'ns' = precisione nanosecondi
      writeApi.closed = false; // 🔹 Aggiungiamo una proprietà custom per tenere traccia dello stato
    }
    return writeApi;
  }

  function sendToInflux(data) {
    try {
        const writeApi = getWriteApi(); // 🔥 Assicuriamoci che sia sempre attivo!

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

        const point = new Point(measurement)
            .tag('device', device)
            .tag('subject', subject)
            .floatField(field, value) // ✅ Ora field viene usato solo come campo numerico!
            .timestamp(timestamp);

        writeApi.writePoint(point);
        console.log(`✅ [InfluxDB] Dato inviato con successo: ${JSON.stringify(data)}`);
    } catch (error) {
        console.error("❌ Errore nell'invio a InfluxDB:", error);
    }
}


      function saveDataToInflux(data) {
        try {
          const writeApi = getWriteApi(); // 🔥 Assicuriamoci che sia sempre attivo!

          if (!data || typeof data !== "object") {
            console.warn("⚠️ Dati non validi per l'invio a InfluxDB.");
            return;
          }

          const value = parseFloat(data["_value"]);
          const field = data["_field"] ? data["_field"].trim() : "unknown_field";
          const measurement = data["_measurement"] ? data["_measurement"].trim() : "unknown_measurement";
          const device = data["device"] || "unknown_device";
          const exercise = data["exercise"] || "unknown_exercise"; // Default se manca
          const timestamp = data["_time"] ? new Date(data["_time"]) : new Date();

          if (isNaN(value)) {
            console.error(`⚠️ Valore non valido: ${JSON.stringify(data)}`);
            return;
          }

          const point = new Point(measurement)
            .tag("device", device)
            .tag("exercise", exercise)
            .floatField(field, value)
            .timestamp(timestamp);

          writeApi.writePoint(point);
          console.log(`✅ [InfluxDB] Dato inviato con successo: ${JSON.stringify(data)}`);
        } catch (error) {
          console.error("❌ Errore durante l'invio del dato a InfluxDB:", error);
        }
      }




      function generateCsvData() {
        const dataQueue = [];
        const fixedFields = {
            result: '',
            table: 0,
            _start: '2025-01-24T11:07:37.810426705Z',
            _stop: '2025-01-24T12:07:37.810426705Z',
            _measurement: 'four_sensors',
            device: '74:4D:BD:2C:43:D8',
            subject: '2',
            exercise: 'AL'
        };
    
        for (let i = 0; i < 100; i++) {
            // 🔥 Generazione del timestamp corretto (ISO 8601 senza offset)
            const currentTime = new Date();
            const formattedTime = currentTime.toISOString(); // ✅ Formato RFC3339 corretto
    
            // 🔥 Generazione valori casuali per accX, accY, accZ, gyroX, gyroY, gyroZ
            const accX = (Math.random() * 200 - 100).toFixed(2);
            const accY = (Math.random() * 200 - 100).toFixed(2);
            const accZ = (Math.random() * 200 - 100).toFixed(2);
            const gyroX = (Math.random() * 200 - 100).toFixed(2);
            const gyroY = (Math.random() * 200 - 100).toFixed(2);
            const gyroZ = (Math.random() * 200 - 100).toFixed(2);
    
            dataQueue.push(
                { ...fixedFields, _time: formattedTime, _field: "accX", _value: accX },
                { ...fixedFields, _time: formattedTime, _field: "accY", _value: accY },
                { ...fixedFields, _time: formattedTime, _field: "accZ", _value: accZ },
                { ...fixedFields, _time: formattedTime, _field: "gyroX", _value: gyroX },
                { ...fixedFields, _time: formattedTime, _field: "gyroY", _value: gyroY },
                { ...fixedFields, _time: formattedTime, _field: "gyroZ", _value: gyroZ }
            );
        }
    
        return dataQueue;
    }
    
      
    
    function streamGeneratedData(res) {
        const dataQueue = generateCsvData();
        let index = 0;
    
        console.log(`📂 Dati generati, invio in corso...`);
    
        const interval = setInterval(() => {
            if (stopStreamingAcc || index >= dataQueue.length) {
                clearInterval(interval);
                console.log('🛑 Streaming ACC interrotto.');
                res.end();
                return;
            }
    
            const data = dataQueue[index];
    
            // 🔥 Invia il dato a InfluxDB
            sendToInflux(data);
    
            // 🔥 Invia il dato anche come risposta HTTP
            res.write(JSON.stringify(data) + '\n');
    
            index++;
        }, 2000);
    }
    
    app.post('/uploadAcc', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        streamGeneratedData(res);
    });
    
    app.post('/api/submitSurvey', async (req, res) => {
      try {
          // Connessione a MongoDB
          if (!db) {
              console.log("⏳ Connessione a MongoDB in corso...");
              await connectToDatabase();
          }
          const collection = db.collection("sondaggi");
  
          const surveyData = {
            registrazione: req.body.registrazione,
            autenticazione: req.body.autenticazione,
            creazione_esercizio: req.body.creazione_esercizio,
            sessione_allenamento: req.body.sessione_allenamento,
            aggiunta_paziente: req.body.aggiunta_paziente,
            programmazione_allenamenti: req.body.programmazione_allenamenti,
            accesso_dati: req.body.accesso_dati,
            gestione_allenamenti: req.body.gestione_allenamenti,
            difficolta_navigazione: req.body.difficolta_navigazione,
            consiglio: req.body.consiglio,
            bug_anomalie: req.body.bug_anomalie,  // ✅ Nuova domanda
            consigli_miglioramento: req.body.consigli_miglioramento,  // ✅ Nuova domanda
            data_invio: new Date()
        };
        

  
          const result = await collection.insertOne(surveyData);
          console.log("✅ Sondaggio salvato con ID:", result.insertedId);
  
          res.json({ message: "✅ Risposta salvata con successo!" });
      } catch (error) {
          console.error("❌ Errore nel salvataggio del sondaggio:", error);
          res.status(500).json({ error: "Errore nel salvataggio dei dati" });
      }
  });
  
  app.get('/api/survey-stats', async (req, res) => {
    try {
        const collection = db.collection("sondaggi");

        // 📌 Calcolo delle medie
        const pipelineMedia = [
            { $group: {
                _id: null,
                registrazione: { $avg: { $toInt: "$registrazione" } },
                autenticazione: { $avg: { $toInt: "$autenticazione" } },
                creazione_esercizio: { $avg: { $toInt: "$creazione_esercizio" } },
                sessione_allenamento: { $avg: { $toInt: "$sessione_allenamento" } },
                aggiunta_paziente: { $avg: { $toInt: "$aggiunta_paziente" } },
                programmazione_allenamenti: { $avg: { $toInt: "$programmazione_allenamenti" } },
                accesso_dati: { $avg: { $toInt: "$accesso_dati" } },
                gestione_allenamenti: { $avg: { $toInt: "$gestione_allenamenti" } }
            }}
        ];
        const statsMedia = await collection.aggregate(pipelineMedia).toArray();
        const media = statsMedia[0] || {};

        // 📌 Calcolo delle percentuali per ogni risposta
        let percentuali = {};
        const categories = [
            "registrazione", "autenticazione", "creazione_esercizio", "sessione_allenamento",
            "aggiunta_paziente", "programmazione_allenamenti", "accesso_dati", "gestione_allenamenti"
        ];

        for (let category of categories) {
            const pipelinePercentuali = [
                { $match: { [category]: { $exists: true } } },
                { $group: { _id: `$${category}`, count: { $sum: 1 } } },
                { $group: {
                    _id: null,
                    percentuali: {
                        $push: {
                            k: "$_id",
                            v: { $multiply: [{ $divide: ["$count", { $sum: "$count" }] }, 100] }
                        }
                    }
                }},
                { $project: { percentuali: { $arrayToObject: "$percentuali" } } }
            ];
            const statsPercentuali = await collection.aggregate(pipelinePercentuali).toArray();
            percentuali[category] = statsPercentuali[0]?.percentuali || {};
        }

        res.json({ media, percentuali });

    } catch (error) {
        console.error("❌ Errore nel calcolo delle statistiche:", error);
        res.status(500).json({ error: "Errore nel calcolo delle statistiche." });
    }
});



  app.post('/api/uploadBPM/mongodb', async (req, res) => {
    const filePath = path.join(__dirname, 'data.txt'); // 📂 Il file TXT da leggere

    if (!fs.existsSync(filePath)) {
      return res.status(400).json({ error: '❌ File TXT non trovato!' });
    }

    console.log(`📂 Lettura file: ${filePath}`);
    const db = req.db; 
    const collection = db.collection("dataBPM");

    const dataQueue = [];
    
    const lines = fs.readFileSync(filePath, 'utf8').split('\n');
    lines.forEach(line => {
      const columns = line.split(',').map(col => col.trim()); // Divide e pulisce i dati
      
      if (columns.length < 8) return; // Salta righe non valide
      
      // 📌 Mappa i dati nei campi MongoDB
      const bpmData = {
        _start: new Date(columns[3]), 
        _stop: new Date(columns[4]),  
        _time: new Date(columns[5]),  
        _value: parseFloat(columns[6]), 
        _field: columns[7], 
        _measurement: columns[8], 
        device: columns[9], 
        exercise: columns[10]
      };

      if (!isNaN(bpmData._value) && bpmData._field === 'heartRate') {
        dataQueue.push(bpmData);
      }
    });

    if (dataQueue.length === 0) {
      return res.status(400).json({ error: '❌ Nessun dato valido trovato nel file TXT.' });
    }

    console.log(`📥 ${dataQueue.length} dati BPM letti, inserimento in MongoDB...`);

    const result = await collection.insertMany(dataQueue);
    console.log(`✅ ${result.insertedCount} record salvati in "${COLLECTION_NAME}"`);
    res.status(201).json({ message: 'Dati BPM salvati con successo!', insertedCount: result.insertedCount });
  });


  app.post("/api/uploadBPM/influxdb", async (req, res) => {
    console.log("📥 Richiesta ricevuta: avvio streaming BPM...");

    try {
      const db = req.db; 
      const collection = db.collection("dataBPM");
      const cursor = collection.find({ _field: "heartRate" });

      let dataQueue = await cursor.toArray();
      console.log(`📊 [MongoDB] ${dataQueue.length} dati trovati.`);

      if (dataQueue.length === 0) {
        return res.status(400).json({ error: "❌ Nessun dato valido trovato in MongoDB." });
      }

      stopStreaming = false;
      let index = 0;
      let responseSent = false;
      
      console.log("🟢 Avvio dello streaming dati verso InfluxDB...");

      const interval = setInterval(async () => {
        if (stopStreaming || index >= dataQueue.length) {
          console.log("🛑 Streaming in chiusura...");

          clearInterval(interval);

          if (writeApi && !writeApi.closed && !isWriteApiClosing) {
            isWriteApiClosing = true;
            console.log("🟡 Flushing e chiusura di writeApi...");
            try {
              await writeApi.flush();
              await writeApi.close();
              console.log("✅ [InfluxDB] writeApi chiuso con successo.");
            } catch (err) {
              console.error("❌ Errore nella chiusura di writeApi:", err);
            }
            isWriteApiClosing = false;
          }

          if (!responseSent) {
            responseSent = true;
            return res.status(200).json({ message: "🛑 Streaming interrotto con successo." });
          }
        }

        if (!writeApi || writeApi.closed || isWriteApiClosing) {
          console.warn("⚠️ Tentativo di scrittura su un writeApi chiuso.");
          clearInterval(interval);
          return;
        }

        try {
          const dato = { 
            ...dataQueue[index], 
            exercise: dataQueue[index].exercise || "unknown_exercise" 
          };

          console.log(`📤 [Invio] Dato ${index + 1}/${dataQueue.length} -> ${JSON.stringify(dato)}`);
          saveDataToInflux(dato);
        } catch (error) {
          console.error("❌ Errore durante l'invio del dato a InfluxDB:", error);
        }

        index++;
      }, 2000);
    } catch (error) {
      console.error("❌ Errore durante il recupero dei dati da MongoDB:", error);
      res.status(500).json({ error: "❌ Errore nel recupero dei dati da MongoDB." });
    }
  });

  /**
   * 🛑 API per fermare lo streaming BPM
   */
  app.post("/api/stopUpload", async (req, res) => {
    console.log("🛑 Ricevuta richiesta per interrompere lo streaming.");

    // 🔴 Ferma entrambi i flussi
    stopStreaming = true;  // Ferma BPM & ECG
    stopStreamingAcc = true;  // Ferma ACC

    // 🔄 Chiusura sicura di writeApi
    if (writeApi && !writeApi.closed && !isWriteApiClosing) {
      isWriteApiClosing = true;
      try {
        await writeApi.flush();
        await writeApi.close();
        console.log("✅ [InfluxDB] writeApi chiuso con successo.");
      } catch (err) {
        console.error("❌ Errore nella chiusura di writeApi:", err);
      }
      isWriteApiClosing = false;
    }

    res.json({ message: "✅ Streaming BPM & ACC interrotto con successo!" });
  });


  app.post('/api/misurazioniAccellerometro/media', async (req, res) => {
    try {
      const { nomeUtente } = req.body;
      if (!nomeUtente) {
        return res.status(400).json({ error: 'Parametro nomeUtente mancante.' });
      }

      console.log(`📡 Recupero dati per utente: ${nomeUtente}...`);

      const fluxQuery = `
      from(bucket: "grafana")
    |> range(start: time(v: "1970-01-01T00:00:00Z"))
    |> filter(fn: (r) => r["_measurement"] == "four_sensors")
    |> filter(fn: (r) => r["_field"] == "accX" or r["_field"] == "accY" or r["_field"] == "accZ" or r["_field"] == "gyroX" or r["_field"] == "gyroY" or r["_field"] == "gyroZ")
    |> filter(fn: (r) => r["device"] == "74:4D:BD:2C:0D:14" or r["device"] == "74:4D:BD:2C:43:D8" or r["device"] == "84:FC:E6:50:9E:F8" or r["device"] == "84:FC:E6:52:4B:58")
    |> filter(fn: (r) => r["subject"] == "${nomeUtente}")
      `;

      console.log("🟢 Query InfluxDB pronta:", fluxQuery);

      const rows = [];
      await new Promise((resolve, reject) => {
        queryApi.queryRows(fluxQuery, {
          next(row, tableMeta) {
            const data = tableMeta.toObject(row);
            rows.push(data);
          },
          error(error) {
            console.error("❌ Errore durante la query InfluxDB:", error);
            reject(error);
          },
          complete() {
            console.log(`✅ Dati ricevuti: ${rows.length} righe`);
            resolve();
          },
        });
      });

      if (rows.length === 0) {
        console.warn("⚠️ Nessun dato trovato in InfluxDB.");
        return res.status(404).json({ message: 'Nessun dato trovato in InfluxDB.' });
      }

      console.log("🔄 Connessione a MongoDB...");
      const db = await connectToDatabase();
      const collectionName = `DatiAccellerometro_${nomeUtente}`;
      const collection = db.collection(collectionName);

      let insertedCount = 0;
      for (const row of rows) {
        const filter = {
          _time: row._time,
          device: row.device,
          _field: row._field
        };
        const existingDoc = await collection.findOne(filter);
        if (!existingDoc) {
          await collection.insertOne(row);
          insertedCount++;
        }
      }

      console.log(`✅ Inserimento completato! ${insertedCount} nuovi documenti aggiunti.`);
      res.status(201).json({
        message: 'Misurazioni salvate con successo in MongoDB!',
        insertedCount,
        data: rows,
      });
    } catch (error) {
      console.error('❌ Errore durante la gestione delle misurazioni:', error);
      res.status(500).json({ error: 'Errore durante il recupero e salvataggio dei dati.' });
    }
  });

  app.get("/api/misurazioni/:idUtente", async (req, res) => {
    try {
      const idUtente = req.params.idUtente;
      if (!idUtente) {
        return res.status(400).json({ error: "ID utente non fornito." });
      }

      const db = await connectToDatabase();
      const user = await db.collection("utenti").findOne(
        { _id: new ObjectId(idUtente) },
        { projection: { username: 1 } }
      );

      if (!user) {
        return res.status(404).json({ error: "Utente non trovato." });
      }

      const collectionName = `DatiAccellerometro_${user.username}`;
      const collection = db.collection(collectionName);

      // 🔹 Leggi i parametri di query
      const { startDate, endDate, minValue, maxValue } = req.query;
      let filtro = { subject: user.username };

      // 🔹 Applica filtri dinamici se presenti
      if (startDate) filtro._time = { ...filtro._time, $gte: new Date(startDate) };
      if (endDate) filtro._time = { ...filtro._time, $lte: new Date(endDate) };
      if (minValue) filtro._value = { ...filtro._value, $gte: parseFloat(minValue) };
      if (maxValue) filtro._value = { ...filtro._value, $lte: parseFloat(maxValue) };

      // 🔹 Ottieni i dati filtrati
      const misurazioni = await collection.find(filtro).toArray();

      if (!misurazioni.length) {
        return res.status(404).json({ error: "Nessuna misurazione trovata con i filtri applicati." });
      }

      res.status(200).json(misurazioni);
    } catch (error) {
      console.error("❌ Errore durante il recupero delle misurazioni:", error);
      res.status(500).json({ error: "Errore durante il recupero dei dati da MongoDB." });
    }
  });

// Endpoint GET per tabellaInflux
app.get('/tabellaInflux', (req, res) => {
  const { idSessione, idUtente, idEsercizio, tipoVisualizzazione } = req.query;

  if (!idSessione || !idUtente || !idEsercizio || !tipoVisualizzazione) {
      return res.status(400).send("Errore: Parametri mancanti nella richiesta.");
  }

  // Log dei parametri ricevuti (opzionale per debugging)
  console.log(`📊 Parametri ricevuti: idSessione=${idSessione}, idUtente=${idUtente}, idEsercizio=${idEsercizio}, tipoVisualizzazione=${tipoVisualizzazione}`);

  // Serve il file HTML con i parametri inclusi come query string
  res.sendFile(path.join(__dirname, 'public', 'tabellainflux.html'));
});



  app.delete('/api/misurazioni/:id', async (req, res) => {
    try {
      const id = req.params.id.trim(); // Rimuove eventuali spazi

      // Controlla se l'ID è valido
      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'ID non valido' });
      }

      console.log(`🗑️ Eliminazione misurazione con ObjectId: ${id}`);

      const db = await connectToDatabase();
      const collection = db.collection('misurazioniAccellerometro');

      // Elimina il documento usando `_id` convertito in `ObjectId`
      const result = await collection.deleteOne({ _id: new ObjectId(id) });

      if (result.deletedCount === 0) {
        return res.status(404).json({ error: 'Misurazione non trovata' });
      }

      console.log(`✅ Misurazione eliminata con successo: ${id}`);
      res.status(200).json({ message: 'Misurazione eliminata con successo!' });

    } catch (error) {
      console.error('❌ Errore durante l\'eliminazione della misurazione:', error);
      res.status(500).json({ error: 'Errore durante l\'eliminazione della misurazione' });
    }
  });

  // elenco redirect

  app.get('/pazienti', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'pazienti.html'));
  });

  app.get('/avvia-sessione', (req, res) => {
    const sessionId = req.query.id; // Recupera l'ID della sessione dalla query string

    if (!sessionId) {
      return res.status(400).send('ID sessione non fornito.');
    }

    // Restituisci la pagina HTML per la sessione
    res.sendFile(path.join(__dirname, 'public', 'misurazione.html'));
  });

  app.get('/visualizza-dati-utente-sessione', (req, res) => {
    const { idUtente, idSessione } = req.query;

    if (!idUtente || !idSessione) {
      return res.status(400).send('Errore: ID utente o ID sessione mancante.');
    }

    res.sendFile(path.join(__dirname, 'public', 'graficoTabella.html'));
  });

  app.get('/crea-sessione', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'creaSessione.html'));
  });

  app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
  });

  app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'registrazione.html'));
  });

  app.get('/crea-esercizio', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'creaEsercizi.html'));
  });

  app.get('/calendario', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'calendario.html'));
  });

  app.get('/visualizzaDati', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'menuVisualizzazioni.html'));
  });



  app.get('/main', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'main.html'));
  });

  app.get('/', (req, res) => {
    res.redirect('/login'); // Reindirizza alla pagina di login
  });
  app.use(cors());

  app.get("/grafana-dashboard", async (req, res) => {
      const grafanaUrl = "http://localhost:3000/d/dec98fsjktreod/accellerometro-ar-istogramma?orgId=1&from=2024-09-30T15:05:25.000Z&to=2024-09-30T15:05:40.000Z&timezone=browser";

      console.log("✅ Fetching Grafana URL:", grafanaUrl);

      try {
          const response = await fetch(grafanaUrl);
          const data = await response.text(); // Riceve l'HTML di Grafana
          res.send(data); // Lo restituisce direttamente
      } catch (error) {
          console.error("❌ Errore nella richiesta a Grafana:", error);
          res.status(500).json({ error: "Errore nella richiesta a Grafana" });
      }
  });

  // Endpoint per caricare il file Excel e importarlo in MongoDB
  app.post('/upload', upload.single('file'), async (req, res) => {
    const collectionName = req.body.collectionName;
    const filePath = req.file?.path;

    if (!filePath) {
      res.status(400).send('File non trovato. Assicurati di caricare un file.');
      return;
    }

    // Connessione a MongoDB
    const client = new MongoClient(MONGO_URI, { useUnifiedTopology: true });
    try {
      await client.connect();
      console.log('Connesso a MongoDB');
      
      const db = client.db(DATABASE_NAME);
      const collection = db.collection(collectionName);

      // Leggi il file Excel e prendi i dati del primo foglio
      const workbook = xlsx.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: null });

      if (sheetData.length === 0) {
        res.send('Il file Excel è vuoto.');
        return;
      }

      // Inserisci i dati in MongoDB
      await collection.insertMany(sheetData);
      res.send('Dati importati con successo nella collezione: ' + collectionName);
    } catch (error) {
      console.error('Errore durante l\'importazione:', error);
      res.status(500).send('Errore durante l\'importazione.');
    } finally {
      await client.close();
      console.log('Connessione a MongoDB chiusa.');
    }
  });


  async function aggiornaSessioni(db) {
    try {
        const collection = db.collection(COLLECTION_NAME);
        const oggi = new Date();

        const result = await collection.updateMany(
            {
                dataFine: { $ne: null, $lt: oggi },  // Data di fine passata
                eserciziEseguiti: { $not: { $size: 0 } } // Almeno un esercizio eseguito
            },
            { $set: { stato: "Conclusa" } }
        );

        console.log(`✅ ${result.modifiedCount} sessioni aggiornate a "Conclusa".`);
    } catch (error) {
        console.error("❌ Errore durante l'aggiornamento delle sessioni:", error);
    }
  }

  app.get("/data", async (req, res) => {
    const { exercise, subject, device, field } = req.query;

    const fluxQuery = `
        from(bucket: "${bucket}")
        |> range(start: 2024-09-30T17:05:00Z, stop: 2024-09-30T17:11:00Z)
        |> filter(fn: (r) => r["_measurement"] == "four_sensors")
        |> filter(fn: (r) => ${field.split(",").map(f => `r["_field"] == "${f}"`).join(" or ")})
        |> filter(fn: (r) => ${device.split(",").map(d => `r["device"] == "${d}"`).join(" or ")})
        |> filter(fn: (r) => r["exercise"] == "${exercise}")
        |> filter(fn: (r) => r["subject"] == "${subject}")
    `;

    let results = [];
    await queryApi.queryRows(fluxQuery, {
        next(row, tableMeta) {
            const data = tableMeta.toObject(row);
            results.push(data);
        },
        complete() {
            res.json(results);
        },
        error(error) {
            console.error(error);
            res.status(500).json({ error: "Errore nella query" });
        }
    });
});
app.get("/api/influxdata/four_sensor", async (req, res) => {
  const {
      start,
      stop,
      measurement = "four_sensors,test", // Ora include anche "test"
      fields = "accX,accY,accZ,gyroX,gyroY,gyroZ",
      devices = "74:4D:BD:2C:0D:14,74:4D:BD:2C:43:D8,84:FC:E6:50:9E:F8,84:FC:E6:52:4B:58",
      exercise = "AL,AR,BL,BR",
      subject,
      limit = 100
  } = req.query;

  if (!start || !stop || !subject) {
      return res.status(400).json({ error: "Parametri start, stop e subject obbligatori" });
  }

  console.log("🔍 [DEBUG] Richiesta ricevuta con parametri:", { start, stop, measurement, fields, devices, exercise, subject, limit });

  const fluxQuery = `
      from(bucket: "grafana")
      |> range(start: ${start}, stop: ${stop})
      |> filter(fn: (r) => ${measurement.split(",").map(m => `r["_measurement"] == "${m}"`).join(" or ")})
      |> filter(fn: (r) => ${fields.split(",").map(f => `r["_field"] == "${f}"`).join(" or ")})
      |> filter(fn: (r) => ${devices.split(",").map(d => `r["device"] == "${d}"`).join(" or ")})
      |> filter(fn: (r) => ${exercise.split(",").map(e => `r["exercise"] == "${e}"`).join(" or ")})
      |> filter(fn: (r) => r["subject"] == "${subject}")
      |> limit(n: ${limit})
  `;

  console.log("📡 [DEBUG] Query InfluxDB generata:\n", fluxQuery);

  let results = [];
  try {
      await new Promise((resolve, reject) => {
          queryApi.queryRows(fluxQuery, {
              next(row, tableMeta) {
                  const data = tableMeta.toObject(row);
                  results.push(data);
              },
              error(error) {
                  console.error("❌ [DEBUG] Errore query InfluxDB:", error);
                  reject(error);
              },
              complete() {
                  console.log(`✅ [DEBUG] Dati ricevuti da InfluxDB: ${results.length} record`);
                  resolve();
              },
          });
      });

      if (results.length > 0) {
          console.log("📊 [DEBUG] Primo elemento ricevuto:\n", JSON.stringify(results[0], null, 2)); // 🔥 Controlliamo il formato
      } else {
          console.warn("⚠️ [DEBUG] Nessun dato trovato per la query InfluxDB");
      }
      
      res.json(results);
  } catch (error) {
      console.error("❌ [DEBUG] Errore durante il recupero dati:", error);
      res.status(500).json({ error: "Errore nella query" });
  }
});


// 📌 Endpoint per aggiornare un valore in InfluxDB
app.put("/api/update-influxdata", async (req, res) => {
  const { measurement, field, device, subject, timestamp, newValue } = req.body;

  if (!measurement || !field || !device || !subject || !timestamp || newValue === undefined) {
      return res.status(400).json({ error: "Parametri mancanti per l'aggiornamento" });
  }

  try {
      // 📌 Creiamo un nuovo punto dati con lo stesso timestamp
      const point = new Point(measurement)
          .tag("device", device)
          .tag("subject", subject)
          .field(field, parseFloat(newValue)) // Converti il valore in numero
          .timestamp(new Date(timestamp)); // Usa lo stesso timestamp

      // Scrive il punto in InfluxDB (sovrascrive se timestamp e tag coincidono)
      writeApi.writePoint(point);
      await writeApi.flush();

      console.log(`✅ [DEBUG] Valore aggiornato per ${measurement} - ${field} con timestamp ${timestamp}: ${newValue}`);
      res.json({ success: true, message: "Valore aggiornato con successo" });

  } catch (error) {
      console.error("❌ [DEBUG] Errore durante l'aggiornamento:", error);
      res.status(500).json({ error: "Errore nell'aggiornamento dei dati" });
  }
});

// 📌 Funzione per generare timestamp in formato RFC3339Nano
// 📌 Funzione per formattare il timestamp nel formato richiesto da InfluxDB
function getRFC3339NanoDate(date) {
  return new Date(date).toISOString().replace("Z", "000000000Z");
}



// 📌 Endpoint DELETE per cancellare un singolo punto dati
app.delete("/api/delete-influxdata", async (req, res) => {
  const { measurement, device, subject, timestamp } = req.body;

  if (!measurement || !device || !subject || !timestamp) {
      return res.status(400).json({ error: "Parametri mancanti per la cancellazione" });
  }

  try {
      const influxDeleteURL = `${url}/api/v2/delete?org=${org}&bucket=${bucket}`;

      // 🔥 MODIFICA: Includiamo solo measurement, device e subject
      // 🔥 Filtriamo il timestamp specifico usando start=timestamp e stop=timestamp+1ns
      const deleteQuery = {
          start: getRFC3339NanoDate(timestamp), // Inizio: timestamp specifico
          stop: getRFC3339NanoDate(new Date(new Date(timestamp).getTime() + 1)), // Stop: +1 nanosecondo
          predicate: `_measurement="${measurement}" AND device="${device}" AND subject="${subject}"`, 
      };

      const response = await axios.post(influxDeleteURL, deleteQuery, {
          headers: {
              "Authorization": `Token ${token}`,
              "Content-Type": "application/json",
          },
      });

      console.log(`✅ [DEBUG] Punto eliminato con successo: ${measurement} - ${timestamp}`);
      res.json({ success: true, message: "Punto eliminato con successo" });

  } catch (error) {
      console.error("❌ [DEBUG] Errore durante la cancellazione:", error.response?.data || error.message);
      res.status(500).json({ error: "Errore nella cancellazione dei dati" });
  }
});

connectToDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server in esecuzione su http://localhost:${PORT}`);
  });
});



const dispositiviMonitorati = {
  "74:4D:BD:2C:0D:14": "ECG",
  "74:4D:BD:2C:43:D8": "Accelerometro",
  "84:FC:E6:50:9E:F8": "Temperatura",
  "84:FC:E6:52:4B:58": "Pressione",
};

// Endpoint per controllare lo stato dei sensori
app.get("/api/check-sensors", async (req, res) => {
  const filePath = "AL 1.csv"; // Sostituisci con il percorso reale del file CSV
  let sensoriAttivi = {};

  // Inizializza tutti i dispositivi come non attivi
  Object.keys(dispositiviMonitorati).forEach((device) => {
    sensoriAttivi[device] = false;
  });

  // Legge il CSV e verifica la presenza dei dispositivi
  fs.createReadStream(filePath)
    .pipe(csvParser())
    .on("data", (row) => {
      if (dispositiviMonitorati[row.device]) {
        sensoriAttivi[row.device] = true;
      }
    })
    .on("end", () => {
      // Costruisce la risposta JSON con lo stato dei sensori
      const statoSensori = Object.keys(dispositiviMonitorati).map((device) => ({
        nome: dispositiviMonitorati[device],
        id: device,
        stato: sensoriAttivi[device] ? "🟢" : "🔴",
      }));

      res.json({ success: true, sensori: statoSensori });
    })
    .on("error", (error) => {
      console.error("Errore nella lettura del CSV:", error);
      res.status(500).json({ success: false, error: "Errore nel file CSV" });
    });
});
