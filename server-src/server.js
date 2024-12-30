// Load environment variables from .env file
require('dotenv').config();

const express = require("express");
const mysql = require("mysql2");
const path = require("path");

const app = express();
const PORT = process.env.SERVER_PORT || process.env.PORT || 5555;

// Middleware to parse JSON request body
app.use(express.json());

// CORS Middleware
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  next();
});

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Initialize MySQL database connection
const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'your_mysql_username',
  password: process.env.DB_PASSWORD || 'your_mysql_password',
  database: process.env.DB_NAME || 'intercepted_data_db',
  port: process.env.DB_PORT || 3306,
});

// Connect to the database
db.connect((err) => {
  if (err) {
    console.error("Database connection error:", err.message);
    process.exit(1); // Exit the application if connection fails
  } else {
    console.log("Connected to MySQL database.");
  }
});

const createRepliesTableQuery = `
CREATE TABLE IF NOT EXISTS replies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  bbc_ref_number VARCHAR(255) NOT NULL,
  intercept_id INT NOT NULL,
  bbc_reply TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (intercept_id) REFERENCES intercepted_data(id) ON DELETE CASCADE
) ENGINE=InnoDB;
`;

// Create 'intercepted_data' table if it doesn't exist
const createInterceptedTableQuery = `
CREATE TABLE IF NOT EXISTS intercepted_data (
  id INT AUTO_INCREMENT PRIMARY KEY,
  originUrl VARCHAR(255),
  previous_complaint TEXT,
  captcha TEXT,
  dateproblemstarted VARCHAR(255),
  description TEXT,
  emailaddress VARCHAR(255),
  firstname VARCHAR(255),          -- Optional
  lastname VARCHAR(255),           -- Optional
  salutation VARCHAR(255),         -- Optional
  generalissue1 TEXT,
  intro_text TEXT,
  iswelsh VARCHAR(10),
  liveorondemand VARCHAR(50),
  localradio VARCHAR(255),
  make VARCHAR(255),
  moderation_text TEXT,
  network VARCHAR(255),
  outside_the_uk VARCHAR(10),
  platform VARCHAR(255),
  programme VARCHAR(255),
  programmeid VARCHAR(255),
  reception_text TEXT,
  redbuttonfault VARCHAR(255),
  region VARCHAR(255),
  responserequired VARCHAR(255),
  servicetv VARCHAR(255),
  sounds_text TEXT,
  sourceurl VARCHAR(255),
  subject VARCHAR(255),
  title VARCHAR(255),
  transmissiondate VARCHAR(50),
  transmissiontime VARCHAR(50),
  under18 VARCHAR(10),
  verifyform VARCHAR(255),
  complaint_nature TEXT,
  complaint_nature_sounds TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;
`;

// Create 'problematic_stories' table if it doesn't exist
const createProblematicTableQuery = `
CREATE TABLE IF NOT EXISTS problematic_stories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  url VARCHAR(255),
  previous_complaint TEXT,
  dateproblemstarted VARCHAR(255),
  description TEXT,
  intro_text TEXT,
  lang VARCHAR(10),
  liveorondemand VARCHAR(50),
  localradio VARCHAR(255),
  moderation_text TEXT,
  network VARCHAR(255),
  programme VARCHAR(255),
  programmeid VARCHAR(255),
  responserequired VARCHAR(255),
  salutation VARCHAR(255),
  servicetv VARCHAR(255),
  complaint_nature TEXT,
  complaint_nature_sounds TEXT,
  issue_severity VARCHAR(50),
  flagged_by VARCHAR(255),
  review_status VARCHAR(50),
  issue_category VARCHAR(255),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;
`;

// Create 'replies' table
db.query(createRepliesTableQuery, (err) => {
  if (err) {
    console.error("Error creating 'replies' table:", err.message);
  } else {
    console.log("Table 'replies' is ready.");
  }
});

// Initialize database tables
db.query(createInterceptedTableQuery, (err) => {
  if (err) {
    console.error("Error creating 'intercepted_data' table:", err.message);
  } else {
    console.log("Table 'intercepted_data' is ready.");
  }
});

db.query(createProblematicTableQuery, (err) => {
  if (err) {
    console.error("Error creating 'problematic_stories' table:", err.message);
  } else {
    console.log("Table 'problematic_stories' is ready.");
  }
});

// POST /intercept - Store intercepted data
app.post("/api/intercept", (req, res) => {
  const { originUrl, interceptedData } = req.body;
  console.log("Received data from:", req.body);
  
  // Validation
  if (!originUrl || !interceptedData) {
    return res.status(400).json({ error: "Invalid request body." });
  }

  // Use interceptedData directly
  const formData = { ...interceptedData };

  // Handle 'previous_complaint' appropriately
  formData.previous_complaint = formData.previous_complaint || formData["are_you_contacting_us_about_a_previous_complaint_"] || null;

  // Define fields to insert
  const fields = [
    "originUrl",
    "previous_complaint",
    "captcha",
    "dateproblemstarted",
    "description",
    "emailaddress",
    "firstname",
    "lastname",
    "salutation",
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

  // Map fields to their corresponding values, defaulting to null if undefined
  const values = fields.map((field) => {
    if (field === "originUrl") {
      return originUrl || null;
    }
    return formData[field] || null;
  });

  console.log("Received data:", values);

  // Construct the INSERT query with placeholders
  const placeholders = fields.map(() => "?").join(", ");
  const insertQuery = `
    INSERT INTO intercepted_data (${fields.join(", ")})
    VALUES (${placeholders});
  `;

  db.query(insertQuery, values, (err, results) => {
    if (err) {
      console.error("Database insertion error:", err.message);
      return res.status(500).json({ error: "Failed to store data." });
    }

    res.status(200).json({ message: "Data stored successfully.", id: results.insertId });
  });
});

// GET /problematic - Retrieve problematic stories
app.get("/api/problematic", (req, res) => {
  const selectQuery = `SELECT * FROM problematic_stories ORDER BY timestamp DESC;`;

  db.query(selectQuery, (err, results) => {
    if (err) {
      console.error("Database fetch error:", err.message);
      return res.status(500).json({ error: "Failed to fetch problematic stories." });
    }

    res.status(200).json(results);
  });
});

// POST /replies - Store a reply from the user
app.post("/api/replies", (req, res) => {
  const { bbc_ref_number, intercept_id, bbc_reply } = req.body;

  // Validation
  if (!bbc_ref_number || !intercept_id || !bbc_reply) {
    return res.status(400).json({ error: "Missing required fields." });
  }

  const insertReplyQuery = `
    INSERT INTO replies (bbc_ref_number, intercept_id, bbc_reply)
    VALUES (?, ?, ?);
  `;

  db.query(insertReplyQuery, [bbc_ref_number, intercept_id, bbc_reply], (err, results) => {
    if (err) {
      console.error("Error storing reply:", err.message);
      return res.status(500).json({ error: "Failed to store reply." });
    }

    res.status(200).json({ message: "Reply stored successfully.", id: results.insertId });
  });
});

// Serve the static test page
// The static middleware above will automatically serve index.html from the 'public' directory
// You can access it by navigating to http://localhost:PORT/

// Graceful shutdown
process.on("SIGINT", () => {
  db.end((err) => {
    if (err) console.error("Error closing database:", err.message);
    else console.log("Database connection closed.");
    process.exit(0);
  });
});

// Start the Express server
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
