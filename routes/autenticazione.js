const express = require("express");
const router = express.Router();

// ✅ Route per il login
router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  console.log(`🔍 Tentativo di login per utente: ${username}`);

  try {
    const db = req.db; // ✅ Usa la connessione dal middleware di `server.js`
    const usersCollection = db.collection("utenti");
    const user = await usersCollection.findOne({ username, password });

    if (!user) {
      console.log("❌ Credenziali non valide.");
      return res.status(401).json({ error: "Credenziali non valide." });
    }

    req.session.user = { id: user._id, username: user.username, role: user.role };
    console.log(`✅ Login riuscito per ${user.username} (${user.role})`);
    res.json({ message: "Login riuscito!", user: req.session.user });

  } catch (error) {
    console.error("❌ Errore nel login:", error);
    res.status(500).json({ error: "Errore interno del server." });
  }
});

// ✅ Route per la registrazione
router.post("/register", async (req, res) => {
  console.log("📩 Dati ricevuti per la registrazione:", req.body);
  const { username, email, phone, password, role } = req.body;

  if (!username || !email || !phone || !password || !role) {
    return res.status(400).json({ error: "Tutti i campi sono obbligatori." });
  }

  try {
    const db = req.db; // ✅ Usa il database dal middleware
    const usersCollection = db.collection("utenti");

    // Controlla se l'utente esiste già
    const existingUser = await usersCollection.findOne({ username });
    if (existingUser) {
      return res.status(409).json({ error: "Username già in uso." });
    }

    // Se l'utente è un fisioterapista, inizializza la lista pazienti
    const newUser = {
      username,
      email,
      phone,
      password,
      role,
      pazienti: role === "fisioterapista" ? [] : undefined,
    };

    const result = await usersCollection.insertOne(newUser);
    res.status(201).json({ message: "Registrazione completata con successo.", id: result.insertedId });

  } catch (error) {
    console.error("❌ Errore durante la registrazione:", error);
    res.status(500).json({ error: "Errore interno del server." });
  }
});

router.post('/logout', (req, res) => {
  console.log("🔴 Logout richiesto");

  if (!req.session) {
    console.log("⚠️ Nessuna sessione attiva da distruggere.");
    res.clearCookie('connect.sid'); // Prova a rimuovere esplicitamente il cookie della sessione
    return res.status(200).json({ message: 'Nessuna sessione attiva.' });
  }

  req.session.destroy(err => {
    if (err) {
      console.error("❌ Errore nella distruzione della sessione:", err);
      return res.status(500).json({ message: 'Errore durante il logout.' });
    }

    console.log("✅ Sessione distrutta con successo");

    // 🔹 Rimuove il cookie della sessione
    res.clearCookie('connect.sid', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax'
    });

    console.log("🧹 Cookie di sessione eliminato");

    // 🔹 Controlla se la richiesta è da browser o API
    if (req.xhr || req.headers.accept.includes('json')) {
      console.log("📡 API call - Risposta JSON inviata");
      return res.json({ message: 'Logout effettuato con successo.' });
    } else {
      console.log("🌍 Browser request - Redirezione a login");
      return res.redirect('/login');
    }
  });
});


module.exports = router;
