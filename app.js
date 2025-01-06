const express = require('express');
const bodyParser = require('body-parser');
const { MongoClient } = require('mongodb');
const multer = require('multer');
const path = require('path');
const xlsx = require('xlsx'); // Importa il modulo xlsx
const mongoose = require('mongoose');
const PORT = 8080;
const app = express();

const session = require('express-session');

// Configura la sessione
app.use(
  session({
    secret: 'oceniweibciuwbiecbi8765458', // Cambia con una chiave segreta sicura
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }, // Imposta su `true` se usi HTTPS
  })
);

const { InfluxDB } = require('@influxdata/influxdb-client');

// Configurazione: URL e token del tuo InfluxDB
const url = 'http://localhost:8086'; // Cambia con l'URL del tuo server InfluxDB
const token = 'khWwXXDmNfSQByvRo-reCmDGAa0yNAEa6XJOiiVTm6RbwG0drsA_WQf184UWUVxOFX1ulNSDjCpwhLk0_Te6Lg=='; // Inserisci il tuo token di autenticazione
const org = 'davide'; // Inserisci il tuo nome organizzazione
const bucket = 'grafana'; // Nome del bucket

const MONGO_URI = 'mongodb+srv://davideebossolo:ce3rKHjSClBxdx7u@cluster1.dgwrk.mongodb.net/?retryWrites=true&w=majority&appName=Cluster1';
const DATABASE_NAME = 'tesi';
const COLLECTION_NAME = 'sessione'; 
// Connessione globale a MongoDB

const client = new MongoClient(MONGO_URI, { useUnifiedTopology: true });
let db;
// Connessione globale a MongoDB
async function connectToDatabase() {
  if (!db) {
    try {
      await client.connect();
      db = client.db(DATABASE_NAME);
      console.log('Connesso a MongoDB');
    } catch (error) {
      console.error('Errore di connessione a MongoDB:', error);
      process.exit(1); // Esci se non riesci a connetterti
    }
  }
  return db;
}

// Crea un client
const influxDB = new InfluxDB({ url, token });
const queryApi = influxDB.getQueryApi(org);



app.get('/api/misurazioni', async (req, res) => {

  try {
    // Query Flux per filtrare i dati in base all'ID utente
    const fluxQuery = `
  from(bucket: "grafana")
    |> range(start: 0) // Include tutti i dati
    |> filter(fn: (r) => r["_measurement"] == "four_sensors")
    |> filter(fn: (r) => r["_field"] == "accX" or r["_field"] == "accY" or r["_field"] == "accZ" or r["_field"] == "gyroX" or r["_field"] == "gyroY" or r["_field"] == "gyroZ")
    |> filter(fn: (r) => r["device"] == "74:4D:BD:2C:0D:14")
    |> filter(fn: (r) => r["exercise"] == "AL")
    |> aggregateWindow(every: 1m, fn: mean, createEmpty: false)
    |> yield(name: "mean")
`;



    // Array per raccogliere i risultati
    const rows = [];
    await new Promise((resolve, reject) => {
      queryApi.queryRows(fluxQuery, {
        next(row, tableMeta) {
          const data = tableMeta.toObject(row);
          rows.push(data);
        },
        error(error) {
          reject(error);
        },
        complete() {
          resolve();
        },
      });
    });


    res.json(rows); // Restituisce i dati in formato JSON
  } catch (error) {
    console.error('Errore nella query InfluxDB:', error);
    res.status(500).json({ error: 'Errore durante il recupero dei dati.' });
  }
});


// Configura `multer` per salvare i file caricati nella cartella "uploads"
const upload = multer({ dest: 'uploads/' });

// Nome della collezione



app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve i file statici dalla directory "public"
app.use(express.static('public'));

app.post('/api/sessioni', async (req, res) => {
  const nuovaSessione = req.body; // Dati della sessione dal corpo della richiesta

  if (!nuovaSessione.utente || !nuovaSessione.dataInizio) {
    return res.status(400).json({ error: 'Dati incompleti. Assicurati di includere utente e dataInizio.' });
  }

  const client = new MongoClient(MONGO_URI, { useUnifiedTopology: true });

  try {
    await client.connect();
    const db = client.db(DATABASE_NAME);
    const collection = db.collection(COLLECTION_NAME);

    const risultato = await collection.insertOne(nuovaSessione);
    res.status(201).json({ message: 'Sessione creata con successo!', id: risultato.insertedId });
  } catch (error) {
    console.error('Errore durante l\'inserimento della sessione:', error);
    res.status(500).json({ error: 'Errore interno del server.' });
  } finally {
    await client.close();
  }
});

app.get('/api/sessioni', async (req, res) => {
  try {
    // Connettiti al database
    const db = await connectToDatabase();

    // Recupera tutte le sessioni dalla collezione
    const sessioni = await db.collection('sessione').find({}).toArray();

    if (!sessioni || sessioni.length === 0) {
      return res.status(404).json({ error: 'Nessuna sessione trovata.' });
    }

    res.json(sessioni); // Restituisci tutte le sessioni
  } catch (error) {
    console.error('Errore durante il recupero delle sessioni:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});


const { ObjectId } = require("mongodb");

app.get('/api/sessioni/:id', async (req, res) => {
    const sessionId = req.params.id;

    if (!sessionId) {
        return res.status(400).json({ error: 'ID della sessione mancante' });
    }

    try {
        const db = await connectToDatabase();
        const sessione = await db.collection('sessione').findOne({ _id: new ObjectId(sessionId) });

        if (!sessione) {
            return res.status(404).json({ error: 'Sessione non trovata' });
        }

        // Rimuovi eventuali dati sensibili
        res.json({
            _id: sessione._id,
            utente: sessione.utente,
            dataInizio: sessione.dataInizio,
            dataFine: sessione.dataFine,
            checkConnection: sessione.checkConnection,
            programmaEsercizi: sessione.programmaEsercizi,
            eserciziEseguiti: sessione.eserciziEseguiti,
            esercizioCorrente: sessione.esercizioCorrente,
        });
    } catch (error) {
        console.error('Errore durante il recupero della sessione:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});


app.get('/api/users', async (req, res) => {
  const client = new MongoClient(MONGO_URI, { useUnifiedTopology: true });
  try {
    await client.connect();
    const db = client.db(DATABASE_NAME);
    const usersCollection = db.collection('users');

    const users = await usersCollection.find({}).toArray();
    res.json(users);
  } catch (error) {
    console.error('Errore nel recupero degli utenti:', error);
    res.status(500).json({ error: 'Errore interno del server.' });
  } finally {
    await client.close();
  }
});


app.get('/api/esercizi', async (req, res) => {
  const client = new MongoClient(MONGO_URI, { useUnifiedTopology: true });
  try {
    await client.connect();
    const db = client.db(DATABASE_NAME);
    const eserciziCollection = db.collection('esercizi'); // Assicurati di avere questa collezione

    const esercizi = await eserciziCollection.find({}).toArray();
    res.json(esercizi);
  } catch (error) {
    console.error('Errore nel recupero degli esercizi:', error);
    res.status(500).json({ error: 'Errore interno del server.' });
  } finally {
    await client.close();
  }
});


app.post('/api/crea-esercizio', async (req, res) => {
  const { id, nomeEsercizio, nomePaziente, soglie } = req.body;

  // Validazione dei dati richiesti
  if (!id || !nomeEsercizio || !nomePaziente) {
    return res.status(400).json({ error: 'Tutti i campi obbligatori devono essere compilati.' });
  }

  const nuovoEsercizio = {
    id,
    nomeEsercizio,
    nomePaziente,
    soglie: soglie || {
      validitaDato: { valoreMin: 0, valoreMax: 1000 },
      correttezzaEsecuzione: { valoreMin: 50, valoreMax: 200 },
    },
    dataCreazione: new Date(),
  };

  const client = new MongoClient(MONGO_URI, { useUnifiedTopology: true });
  try {
    await client.connect();
    const db = client.db(DATABASE_NAME);
    const eserciziCollection = db.collection('esercizi');

    // Inserisce il nuovo esercizio nel database
    const risultato = await eserciziCollection.insertOne(nuovoEsercizio);
    res.status(201).json({ message: 'Esercizio creato con successo!', id: risultato.insertedId });
  } catch (error) {
    console.error('Errore durante la creazione dell\'esercizio:', error);
    res.status(500).json({ error: 'Errore interno del server.' });
  } finally {
    await client.close();
  }
});

// Endpoint per aggiornare le soglie di un esercizio
app.put('/api/set-soglie/:id', async (req, res) => {
  const esercizioId = req.params.id;
  const { soglie } = req.body;

  // Validazione dei dati richiesti
  if (!soglie || !soglie.validitaDato || !soglie.correttezzaEsecuzione) {
    return res.status(400).json({
      error: 'Le soglie devono includere validitaDato e correttezzaEsecuzione con valori min e max.',
    });
  }

  const { validitaDato, correttezzaEsecuzione } = soglie;

  // Validazione dei valori min e max
  if (
    validitaDato.valoreMin >= validitaDato.valoreMax ||
    correttezzaEsecuzione.valoreMin >= correttezzaEsecuzione.valoreMax
  ) {
    return res.status(400).json({
      error: 'I valori minimi devono essere inferiori ai valori massimi.',
    });
  }

  const client = new MongoClient(MONGO_URI, { useUnifiedTopology: true });
  try {
    await client.connect();
    const db = client.db(DATABASE_NAME);
    const eserciziCollection = db.collection('esercizi');

    // Trova e aggiorna l'esercizio con i nuovi parametri
    const result = await eserciziCollection.updateOne(
      { id: esercizioId },
      {
        $set: {
          'soglie.validitaDato': validitaDato,
          'soglie.correttezzaEsecuzione': correttezzaEsecuzione,
        },
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: `Nessun esercizio trovato con ID ${esercizioId}.` });
    }

    res.json({ message: 'Soglie aggiornate con successo!', updated: result.modifiedCount });
  } catch (error) {
    console.error('Errore durante l\'aggiornamento delle soglie:', error);
    res.status(500).json({ error: 'Errore interno del server.' });
  } finally {
    await client.close();
  }
});
app.get('/user-data', async (req, res) => {
  const client = new MongoClient(MONGO_URI);
  try {
    await client.connect();
    const db = client.db(DATABASE_NAME);
    const collection = db.collection('misurazioniEs1');

    // Recupera tutti i dati dalla collezione
    const allData = await collection.find({}).toArray();

    if (!allData || allData.length === 0) {
      return res.status(404).json({ error: 'Nessun dato trovato.' });
    }

    res.json(allData);
  } catch (error) {
    console.error('Errore nel recupero dei dati:', error);
    res.status(500).json({ error: 'Errore interno del server.' });
  } finally {
    await client.close();
  }
});

app.get('/avvia-sessione', (req, res) => {
  const sessionId = req.query.id; // Recupera l'ID della sessione dalla query string

  if (!sessionId) {
    return res.status(400).send('ID sessione non fornito.');
  }

  // Restituisci la pagina HTML per la sessione
  res.sendFile(path.join(__dirname, 'public', 'misurazione.html'));
});


app.get('/visualizza-dati-utente', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'utenti.html'));
});

app.get('/api/events', (req, res) => {
  const events = [
    { title: 'Allenamento Cardio', start: '2024-12-10', end: '2024-12-10' },
    { title: 'Sessione Yoga', start: '2024-12-12', allDay: true },
    { title: 'Riscaldamento', start: '2024-12-15T10:00:00', end: '2024-12-15T11:00:00' }
  ];
  res.json(events);
});





app.get('/crea-sessione', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'creaSessione.html'));
});


app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/', (req, res) => {
  res.redirect('/login');
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'registrazione.html'));
});

app.get('/crea-esercizio', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'creaEsercizi.html'));
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  const client = new MongoClient(MONGO_URI);
  try {
    await client.connect();
    const db = client.db(DATABASE_NAME);
    const usersCollection = db.collection('users'); // Assicurati di avere questa collezione.

    // Cerca l'utente nel database
    const user = await usersCollection.findOne({ username, password });

    if (!user) {
      return res.status(401).send('Credenziali non valide.');
    }

    // Salva i dati dell'utente nella sessione
    req.session.user = {
      id: user.id,
      username: user.username,
    };

    // Reindirizza a index.html
    res.redirect('/index.html');
  } catch (error) {
    console.error('Errore durante il login:', error);
    res.status(500).send('Errore interno del server.');
  } finally {
    await client.close();
  }
});




app.post('/register', async (req, res) => {
  const { id, username, password, role } = req.body;

  if (!id || !username || !password) {
    return res.status(400).json({ error: 'Tutti i campi sono obbligatori.' });
  }

  const client = new MongoClient(MONGO_URI);
  try {
    await client.connect();
    const db = client.db(DATABASE_NAME);
    const usersCollection = db.collection('users'); // Assicurati di avere questa collezione.

    // Controlla se l'utente esiste già
    const existingUser = await usersCollection.findOne({ username });
    if (existingUser) {
      return res.status(409).json({ error: 'Username già in uso.' });
    }

    // Crea un nuovo utente
    const newUser = { id, username, password, role };
    await usersCollection.insertOne(newUser);

    res.json({ message: 'Registrazione completata con successo.', user: newUser });
  } catch (error) {
    console.error('Errore durante la registrazione:', error);
    res.status(500).json({ error: 'Errore interno del server.' });
  } finally {
    await client.close();
  }
});


app.get('/calendario', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'calendario.html'));
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

// Avvia il server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
