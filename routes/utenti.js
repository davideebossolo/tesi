const express = require('express');
const bodyParser = require('body-parser');
const { MongoClient } = require('mongodb');
const multer = require('multer');
const path = require('path');
const xlsx = require('xlsx'); // Importa il modulo xlsx
const fs = require('fs');
const csv = require('csv-parser');
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

router.get('/users/me', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Utente non autenticato' });
    }
    res.json(req.session.user);
  });

  router.get('/users', async (req, res) => {
    try {
      const usersCollection = req.db.collection('utenti'); // Usa la connessione globale
      const users = await usersCollection.find({}).toArray();
      res.json(users);
    } catch (error) {
      console.error('❌ Errore nel recupero degli utenti:', error);
      res.status(500).json({ error: 'Errore interno del server.' });
    }
  });

  router.get('/utente', (req, res) => {
    // Verifica se l'utente è autenticato
    if (!req.session.user) {
      return res.status(401).json({ error: 'Non autenticato' });
    }

    // Restituisci i dati dell'utente salvati nella sessione
    res.json({
      id: req.session.user.id,
      username: req.session.user.username,
      role: req.session.user.role,
    });
  });

  router.get('/utente/:idUtente', async (req, res) => {
    try {
        const { idUtente } = req.params;
        
        if (!ObjectId.isValid(idUtente)) {
            return res.status(400).json({ error: "ID utente non valido" });
        }

        const usersCollection = req.db.collection("utenti");
        const utente = await usersCollection.findOne({ _id: new ObjectId(idUtente) });

        if (!utente) {
            return res.status(404).json({ error: "Utente non trovato" });
        }

        console.log(`✅ [DEBUG] Utente trovato: ${utente.username}, Soggetto: ${utente.subject}`);
        
        res.json({ username: utente.username, subject: utente.subject });

    } catch (error) {
        console.error("❌ [DEBUG] Errore nel recupero dell'utente:", error);
        res.status(500).json({ error: "Errore interno del server" });
    }
});

  router.delete('/users/:id', async (req, res) => {
    const userId = req.params.id;

    try {
      const result = await db.collection('utenti').deleteOne({ _id: new ObjectId(userId) });

      if (result.deletedCount === 0) {
        return res.status(404).json({ error: `Nessun utente trovato con ID ${userId}.` });
      }

      res.json({ message: 'Utente eliminato con successo!' });
    } catch (error) {
      console.error('Errore durante l\'eliminazione dell\'utente:', error);
      res.status(500).json({ error: 'Errore interno del server.' });
    }
  });

 // ✅ Route per ottenere tutti i pazienti
router.get('/pazienti', async (req, res) => {
    try {
      const usersCollection = req.db.collection('utenti');
      const pazienti = await usersCollection.find({ role: 'paziente' }).toArray();
  
      if (!pazienti.length) {
        return res.status(404).json({ message: "Nessun paziente trovato." });
      }
  
      res.status(200).json(pazienti);
    } catch (error) {
      console.error("❌ Errore nel recupero dei pazienti:", error);
      res.status(500).json({ error: "Errore interno del server." });
    }
  });
  
// ✅ Route per ottenere la lista pazienti di un fisioterapista
  router.get('/listaPazienti/:idFisioterapista', async (req, res) => {
    try {
      console.log("🔵 [LOG] Richiesta per ottenere la lista pazienti del fisioterapista.");
  
      const { idFisioterapista } = req.params;
  
      if (!ObjectId.isValid(idFisioterapista)) {
        console.error("❌ [ERRORE] ID fisioterapista non valido.");
        return res.status(400).json({ error: "ID fisioterapista non valido" });
      }
  
      const usersCollection = req.db.collection("utenti");
      console.log("✅ [LOG] Connessione al database riuscita.");
  
      const fisioterapista = await usersCollection.findOne(
        { _id: new ObjectId(idFisioterapista), role: "fisioterapista" }
      );
  
      if (!fisioterapista) {
        console.error("❌ [ERRORE] Fisioterapista non trovato.");
        return res.status(404).json({ error: "Fisioterapista non trovato." });
      }
  
      console.log(`✅ [LOG] Fisioterapista trovato: ${fisioterapista.username}`);
  
      const pazientiIds = fisioterapista.pazienti || [];
  
      if (pazientiIds.length === 0) {
        console.log("⚠️ [LOG] Nessun paziente associato a questo fisioterapista.");
        return res.status(200).json({ pazienti: [] });
      }
  
      console.log(`🔄 [LOG] Recupero dettagli di ${pazientiIds.length} pazienti...`);
      const pazienti = await usersCollection.find({ _id: { $in: pazientiIds.map(id => new ObjectId(id)) } }).toArray();
  
      console.log("✅ [LOG] Lista pazienti recuperata con successo.");
      res.status(200).json(pazienti);
  
    } catch (error) {
      console.error("❌ [ERRORE] Errore nel recupero della lista pazienti:", error);
      res.status(500).json({ error: "Errore interno del server." });
    }
  });
  
  router.delete('/listaPazienti/:idFisioterapista/:idPaziente', async (req, res) => {
    try {
        console.log("🔵 [LOG] Richiesta per rimuovere un paziente dalla lista del fisioterapista.");

        const { idFisioterapista, idPaziente } = req.params;

        if (!ObjectId.isValid(idFisioterapista) || !ObjectId.isValid(idPaziente)) {
            console.error("❌ [ERRORE] ID non valido per fisioterapista o paziente.");
            return res.status(400).json({ error: "ID non valido." });
        }

        const usersCollection = req.db.collection("utenti");
        console.log("✅ [LOG] Connessione al database riuscita.");

        const fisioterapista = await usersCollection.findOne({
            _id: new ObjectId(idFisioterapista),
            role: "fisioterapista"
        });

        if (!fisioterapista) {
            console.error("❌ [ERRORE] Fisioterapista non trovato.");
            return res.status(404).json({ error: "Fisioterapista non trovato." });
        }

        console.log(`✅ [LOG] Fisioterapista trovato: ${fisioterapista.username}`);

        if (!fisioterapista.pazienti || !fisioterapista.pazienti.some(p => p.toString() === idPaziente)) {
            console.warn("⚠️ [LOG] Il paziente non è presente nella lista del fisioterapista.");
            return res.status(404).json({ error: "Il paziente non è presente nella lista." });
        }

        console.log(`🔄 [LOG] Rimozione del paziente ID: ${idPaziente} dalla lista del fisioterapista ID: ${idFisioterapista}...`);

        const updateResult = await usersCollection.updateOne(
            { _id: new ObjectId(idFisioterapista) },
            { $pull: { pazienti: new ObjectId(idPaziente) } }
        );

        if (updateResult.modifiedCount === 0) {
            console.error("❌ [ERRORE] Nessuna modifica applicata. Verificare i dati.");
            return res.status(500).json({ error: "Errore durante la rimozione del paziente dalla lista." });
        }

        console.log("✅ [LOG] Paziente rimosso con successo.");
        res.status(200).json({ message: "Paziente rimosso con successo." });
    } catch (error) {
        console.error("❌ [ERRORE] Errore nella rimozione del paziente:", error);
        res.status(500).json({ error: "Errore interno del server." });
    }
});



router.post('/listaPazienti/:idFisioterapista', async (req, res) => {
    try {
      console.log("🔵 [LOG] Richiesta per aggiungere un paziente alla lista del fisioterapista.");
  
      const { idFisioterapista } = req.params;
      const { idPaziente } = req.body;
  
      console.log(`📌 [LOG] Parametri ricevuti - Fisioterapista ID: ${idFisioterapista}, Paziente ID: ${idPaziente}`);
  
      if (!ObjectId.isValid(idFisioterapista) || !ObjectId.isValid(idPaziente)) {
        console.error("❌ [ERRORE] ID non valido per fisioterapista o paziente.");
        return res.status(400).json({ error: "ID non valido." });
      }
  
      const usersCollection = req.db.collection("utenti");
      console.log("✅ [LOG] Connessione al database riuscita.");
  
      const fisioterapista = await usersCollection.findOne({ 
        _id: new ObjectId(idFisioterapista), 
        role: "fisioterapista" 
      });
  
      if (!fisioterapista) {
        console.error("❌ [ERRORE] Fisioterapista non trovato.");
        return res.status(404).json({ error: "Fisioterapista non trovato." });
      }
  
      console.log(`✅ [LOG] Fisioterapista trovato: ${fisioterapista.username}`);
  
      if (fisioterapista.pazienti && fisioterapista.pazienti.some(p => p.toString() === idPaziente)) {
        console.warn("⚠️ [LOG] Il paziente è già presente nella lista del fisioterapista.");
        return res.status(409).json({ error: "Il paziente è già presente nella lista." });
      }
  
      console.log(`🔄 [LOG] Aggiunta del paziente ID: ${idPaziente} alla lista del fisioterapista ID: ${idFisioterapista}...`);
  
      const updateResult = await usersCollection.updateOne(
        { _id: new ObjectId(idFisioterapista) },
        { $push: { pazienti: new ObjectId(idPaziente) } }
      );
  
      if (updateResult.modifiedCount === 0) {
        console.error("❌ [ERRORE] Nessuna modifica applicata. Verificare i dati.");
        return res.status(500).json({ error: "Errore durante l'aggiornamento della lista pazienti." });
      }
  
      console.log("✅ [LOG] Paziente aggiunto con successo.");
      res.status(200).json({ message: "Paziente aggiunto con successo." });
  
    } catch (error) {
      console.error("❌ [ERRORE] Errore nell'aggiunta del paziente:", error);
      res.status(500).json({ error: "Errore interno del server." });
    }
  });
  

module.exports = router;
