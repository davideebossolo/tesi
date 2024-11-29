const express = require('express');
const bodyParser = require('body-parser');
const { MongoClient } = require('mongodb');
const multer = require('multer');
const path = require('path');
const xlsx = require('xlsx'); // Importa il modulo xlsx

const app = express();

// Configura `multer` per salvare i file caricati nella cartella "uploads"
const upload = multer({ dest: 'uploads/' });

const MONGO_URI = 'mongodb+srv://davideebossolo:ce3rKHjSClBxdx7u@cluster1.dgwrk.mongodb.net/?retryWrites=true&w=majority&appName=Cluster1';
const DATABASE_NAME = 'tesi';

const PORT = 8080;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve i file statici dalla directory "public"
app.use(express.static('public'));

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

app.get('/avvia-esercizio', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'misurazione.html'));
});

app.get('/visualizza-dati-utente', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'utenti.html'));
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
