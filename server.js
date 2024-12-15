const express = require("express");
const sqlite3 = require("sqlite3").verbose();

const app = express();
const PORT = 8082;

// Middleware to parse JSON request body
app.use(express.json());

// CORS Middleware
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  next();
});

// Initialize SQLite database
const db = new sqlite3.Database("./intercepted_data.db", (err) => {
  if (err) {
    console.error("Database connection error:", err.message);
  } else {
    console.log("Connected to SQLite database.");
  }
});

// Create table for 'intercepted_data' without address-related fields
const createInterceptedTableQuery = `
CREATE TABLE IF NOT EXISTS intercepted_data (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  originUrl TEXT,
  previous_complaint TEXT,
  captcha TEXT,
  dateproblemstarted TEXT,
  description TEXT,
  emailaddress TEXT,
  firstname TEXT,          -- Made optional by default
  lastname TEXT,           -- Made optional by default
  salutation TEXT,         -- Made optional by default
  generalissue1 TEXT,
  intro_text TEXT,
  iswelsh TEXT,
  liveorondemand TEXT,
  localradio TEXT,
  make TEXT,
  moderation_text TEXT,
  network TEXT,
  outside_the_uk TEXT,
  platform TEXT,
  programme TEXT,
  programmeid TEXT,
  reception_text TEXT,
  redbuttonfault TEXT,
  region TEXT,
  responserequired TEXT,
  servicetv TEXT,
  sounds_text TEXT,
  sourceurl TEXT,
  subject TEXT,
  title TEXT,
  transmissiondate TEXT,
  transmissiontime TEXT,
  under18 TEXT,
  verifyform TEXT,
  complaint_nature TEXT,
  complaint_nature_sounds TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
`;

// Create table for 'problematic_stories' (unchanged)
const createProblematicTableQuery = `
CREATE TABLE IF NOT EXISTS problematic_stories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  url TEXT,
  previous_complaint TEXT,
  dateproblemstarted TEXT,
  description TEXT,
  intro_text TEXT,
  lang TEXT,
  liveorondemand TEXT,
  localradio TEXT,
  moderation_text TEXT,
  network TEXT,
  programme TEXT,
  programmeid TEXT,
  responserequired TEXT,
  salutation TEXT,
  servicetv TEXT,
  complaint_nature TEXT,
  complaint_nature_sounds TEXT,
  issue_severity TEXT,
  flagged_by TEXT,
  review_status TEXT,
  issue_category TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
`;

// Initialize database tables
db.serialize(() => {
  db.run(createInterceptedTableQuery, (err) => {
    if (err) console.error("Error creating 'intercepted_data' table:", err.message);
    else console.log("Table 'intercepted_data' is ready.");
  });

  db.run(createProblematicTableQuery, (err) => {
    if (err) console.error("Error creating 'problematic_stories' table:", err.message);
    else console.log("Table 'problematic_stories' is ready.");
  });
});

// POST /intercept - Store intercepted data
app.post("/intercept", (req, res) => {
  const { originUrl, interceptedData } = req.body;

  if (!originUrl || !interceptedData || !interceptedData.formData) {
    return res.status(400).json({ error: "Invalid request body." });
  }

  const formData = interceptedData.formData;
  formData.previous_complaint = formData["are_you_contacting_us_about_a_previous_complaint_"] || null;

  // Removed address-related fields
  const fields = [
    "originUrl",
    "previous_complaint",
    "captcha",
    "dateproblemstarted",
    "description",
    "emailaddress",
    "firstname",          // Optional
    "lastname",           // Optional
    "salutation",         // Optional
    "generalissue1",
    "intro_text",
    "iswelsh",
    "liveorondemand",
    "localradio",
    "make",
    "moderation_text",
    "network",
    "outside_the_uk",
    "platform",
    "programme",
    "programmeid",
    "reception_text",
    "redbuttonfault",
    "region",
    "responserequired",
    "servicetv",
    "sounds_text",
    "sourceurl",
    "subject",
    "title",
    "transmissiondate",
    "transmissiontime",
    "under18",
    "verifyform",
    "complaint_nature",
    "complaint_nature_sounds",
  ];

  const values = fields.map((field) => formData[field] || null);
  console.log("Received data:", values);
  const placeholders = fields.map(() => "?").join(", ");
  const insertQuery = `
    INSERT INTO intercepted_data (${fields.join(", ")})
    VALUES (${placeholders});
  `;
  db.run(insertQuery, values, function (err) {
    if (err) {
      console.error("Database insertion error:", err.message);
      return res.status(500).json({ error: "Failed to store data." });
    }

    res.status(200).json({ message: "Data stored successfully.", id: this.lastID });
  });
});

// GET /problematic - Retrieve problematic stories
app.get("/problematic", (req, res) => {
  const selectQuery = `SELECT * FROM problematic_stories ORDER BY timestamp DESC;`;

  db.all(selectQuery, [], (err, rows) => {
    if (err) {
      console.error("Database fetch error:", err.message);
      return res.status(500).json({ error: "Failed to fetch problematic stories." });
    }

    res.status(200).json(rows);
  });
});

// Graceful shutdown
process.on("SIGINT", () => {
  db.close((err) => {
    if (err) console.error("Error closing database:", err.message);
    else console.log("Database connection closed.");
    process.exit(0);
  });
});

// Start the Express server
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
