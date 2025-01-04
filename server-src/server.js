require("dotenv").config();

const express = require("express");
const mysql = require("mysql2");
const crypto = require("crypto");
const sanitizeHtml = require("sanitize-html");
const rateLimit = require("express-rate-limit");
const cors = require("cors");

const app = express();
const PORT = process.env.SERVER_PORT || process.env.PORT || 5555;

// Rate limiting to avoid too many requests from a single IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
});

// Middleware setup
app.use(cors());
app.use(limiter);
app.use(express.json());

// Create a MySQL connection pool
const db = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "your_mysql_username",
  password: process.env.DB_PASSWORD || "your_mysql_password",
  database: process.env.DB_NAME || "intercepted_data_db",
  port: process.env.DB_PORT || 3306,
  connectionLimit: 10, // Adjust based on your needs
});

// Test the database connection
db.getConnection((err, connection) => {
  if (err) {
    console.error("Database connection error:", err.message);
    process.exit(1);
  }
  console.log("Connected to MySQL database.");
  connection.release();
});

// Helper function to generate human-readable UUID-like ID
function generateId() {
  const uuid = crypto.randomUUID();
  console.log("Generated UUID:", uuid); // Debugging: Log the UUID
  if (!uuid) {
    throw new Error("UUID generation failed");
  }
  return uuid;
}

// Create tables if they don't exist
const createTables = () => {
  const queries = [
    `CREATE TABLE IF NOT EXISTS intercepted_data (
      id VARCHAR(36) PRIMARY KEY,
      originUrl VARCHAR(255),
      description TEXT,
      emailaddress VARCHAR(255),
      firstname VARCHAR(255),
      lastname VARCHAR(255),
      salutation VARCHAR(255),
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
    ) ENGINE=InnoDB;`,

    `CREATE TABLE IF NOT EXISTS replies (
      id INT AUTO_INCREMENT PRIMARY KEY,
      bbc_ref_number VARCHAR(255) NOT NULL,
      intercept_id VARCHAR(36) NOT NULL,
      bbc_reply TEXT,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (intercept_id) REFERENCES intercepted_data(id) ON DELETE CASCADE
    ) ENGINE=InnoDB;`,

    `CREATE TABLE IF NOT EXISTS problematic_article (
      URL VARCHAR(255) PRIMARY KEY,
      title TEXT,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;`,
  ];

  queries.forEach((query) => {
    db.query(query, (err) => {
      if (err) {
        console.error("Error creating table:", err.message);
      } else {
        console.log("Table created or already exists.");
      }
    });
  });
};

createTables();

// Serve static files for replay endpoint
app.use("/api/replay", express.static("public"));

// POST request to intercept data
app.post("/api/intercept", (req, res) => {
  const { originUrl, interceptedData } = req.body;

  if (!originUrl || !interceptedData) {
    console.error("Invalid request body:", req.body);
    return res.status(400).json({ error: "Invalid request body." });
  }

  // Sanitize each field in interceptedData
  const sanitizedData = {};
  for (const [key, value] of Object.entries(interceptedData)) {
    sanitizedData[key] = sanitizeHtml(value || "");
  }

  // Validate captcha
  if (!sanitizedData.captcha || sanitizedData.captcha.length < 64) {
    console.error("Captcha validation failed:", sanitizedData.captcha);
    return res.status(400).json({ error: "Captcha is required and must be valid." });
  }

  // Remove captcha from data
  delete sanitizedData.captcha;

  const id = generateId();
  const fields = Object.keys(sanitizedData);
  const values = fields.map((field) => sanitizedData[field]);
  const placeholders = fields.map(() => "?").join(", ");
  const insertQuery = `INSERT INTO intercepted_data (id, ${fields.join(", ")}) VALUES (?, ${placeholders});`;

  db.query(insertQuery, [id, ...values], (err) => {
    if (err) {
      console.error("Database insertion error:", {
        message: err.message,
        stack: err.stack,
        query: insertQuery,
        values: [id, ...values],
      });
      return res.status(500).json({ error: "Failed to store data." });
    }

    console.log("Data successfully inserted:", { id, sanitizedData });
    res.status(200).json({ message: "Data stored successfully.", id });
  });
});

// GET request to retrieve problematic articles
app.get("/api/problematic", (req, res) => {
  const fetchQuery = "SELECT * FROM problematic_article ORDER BY timestamp DESC;";
  db.query(fetchQuery, (err, results) => {
    if (err) {
      console.error("Database fetch error:", err.message);
      return res.status(500).json({ error: "Failed to fetch data." });
    }

    res.status(200).json(results);
  });
});

// POST request to store replies
app.post("/api/replies", (req, res) => {
  const { bbc_ref_number, intercept_id, bbc_reply } = req.body;

  // Basic validation for required fields
  if (!bbc_ref_number || !intercept_id || !bbc_reply) {
    return res.status(400).json({ error: "Missing required fields." });
  }

  // Validate BBC Reference Number format
  const bbcRefPattern = /^[A-Z]{3}-\d{7}-[A-Z0-9]{6}$/;
  if (!bbcRefPattern.test(bbc_ref_number)) {
    return res.status(400).json({ error: "Invalid BBC Reference Number format." });
  }

  // Validate intercept_id format (UUID v4)
  const uuidV4Pattern = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89ABab][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
  if (!uuidV4Pattern.test(intercept_id)) {
    return res.status(400).json({ error: "Invalid TACC Record ID format." });
  }

  // Check if intercept_id exists in intercepted_data
  const checkInterceptIdQuery = "SELECT id FROM intercepted_data WHERE id = ? LIMIT 1;";
  db.query(checkInterceptIdQuery, [intercept_id], (err, results) => {
    if (err) {
      console.error("Database error during intercept_id check:", err.message);
      return res.status(500).json({ error: "Internal server error." });
    }

    if (results.length === 0) {
      return res.status(400).json({ error: "Invalid intercept_id. No matching record found." });
    }

    // Proceed to insert the reply since intercept_id is valid
    const sanitizedReply = sanitizeHtml(bbc_reply);
    const insertReplyQuery = `INSERT INTO replies (bbc_ref_number, intercept_id, bbc_reply) VALUES (?, ?, ?);`;

    db.query(insertReplyQuery, [bbc_ref_number, intercept_id, sanitizedReply], (insertErr, insertResult) => {
      if (insertErr) {
        console.error("Error storing reply:", insertErr.message);
        return res.status(500).json({ error: "Failed to store reply.", details: insertErr.message });
      }

      res.status(200).json({ message: "Reply stored successfully.", id: insertResult.insertId });
    });
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
