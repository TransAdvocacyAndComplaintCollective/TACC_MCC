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
  connectionLimit: 10,
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

// Helper function to generate a UUID
function generateId() {
  const uuid = crypto.randomUUID();
  console.log("Generated UUID:", uuid);
  if (!uuid) {
    throw new Error("UUID generation failed");
  }
  return uuid;
}

// Create or update tables

// Create intercepted_data table (legacy table updated)
// Note: The ipso_contact_* columns have been removed. Use emailaddress, firstname, and lastname instead.
const createComplaintsTable = `
CREATE TABLE IF NOT EXISTS intercepted_data (
  id VARCHAR(36) PRIMARY KEY,
  source ENUM('BBC', 'IPSO') NOT NULL DEFAULT 'BBC',
  originUrl VARCHAR(255),
  title VARCHAR(255),
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
  transmissiondate VARCHAR(50),
  transmissiontime VARCHAR(50),
  under18 VARCHAR(10),
  verifyform VARCHAR(255),
  complaint_nature VARCHAR(255),
  complaint_nature_sounds VARCHAR(255),
  ipso_terms BOOLEAN,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;
`;

db.query(createComplaintsTable, (err) => {
  if (err) {
    console.error("Error creating intercepted_data table:", err.message);
  } else {
    console.log("Table 'intercepted_data' created or already exists.");
  }
});

// Function to drop a column if it exists
function dropColumnIfExists(columnName, callback) {
  const dbName = process.env.DB_NAME || "intercepted_data_db";
  const checkQuery = `
    SELECT COUNT(*) AS count 
    FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'intercepted_data' 
      AND COLUMN_NAME = ?;
  `;
  db.query(checkQuery, [dbName, columnName], (err, results) => {
    if (err) {
      console.error(`Error checking column ${columnName}:`, err.message);
      return callback(err);
    }
    if (results[0].count > 0) {
      const alterQuery = `ALTER TABLE intercepted_data DROP COLUMN ${columnName};`;
      db.query(alterQuery, (err2) => {
        if (err2) {
          console.error(`Error dropping column ${columnName}:`, err2.message);
          return callback(err2);
        } else {
          console.log(`Dropped column ${columnName} from intercepted_data.`);
          callback(null);
        }
      });
    } else {
      console.log(`Column ${columnName} does not exist in intercepted_data.`);
      callback(null);
    }
  });
}

// Drop redundant columns sequentially
dropColumnIfExists("ipso_contact_email", (err) => {
  if (!err) {
    dropColumnIfExists("ipso_contact_first_name", (err) => {
      if (!err) {
        dropColumnIfExists("ipso_contact_last_name", (err) => {
          if (err) {
            console.error("Error dropping ipso_contact_last_name:", err.message);
          }
        });
      } else {
        console.error("Error dropping ipso_contact_first_name:", err.message);
      }
    });
  } else {
    console.error("Error dropping ipso_contact_email:", err.message);
  }
});

// Table for IPSO complaint fields (deconstruct complaintDetails.fields)
const createIPSOFieldsTable = `
CREATE TABLE IF NOT EXISTS ipso_complaint_fields (
  id INT AUTO_INCREMENT PRIMARY KEY,
  complaint_id VARCHAR(36),
  field_order INT,
  field_value TEXT,
  FOREIGN KEY (complaint_id) REFERENCES intercepted_data(id) ON DELETE CASCADE
) ENGINE=InnoDB;
`;

db.query(createIPSOFieldsTable, (err) => {
  if (err) {
    console.error("Error creating ipso_complaint_fields table:", err.message);
  } else {
    console.log("Table 'ipso_complaint_fields' created or already exists.");
  }
});

// Table for IPSO code breaches
const createIPSOBreachesTable = `
CREATE TABLE IF NOT EXISTS ipso_code_breaches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  complaint_id VARCHAR(36),
  clause VARCHAR(255),
  details TEXT,
  FOREIGN KEY (complaint_id) REFERENCES intercepted_data(id) ON DELETE CASCADE
) ENGINE=InnoDB;
`;

db.query(createIPSOBreachesTable, (err) => {
  if (err) {
    console.error("Error creating ipso_code_breaches table:", err.message);
  } else {
    console.log("Table 'ipso_code_breaches' created or already exists.");
  }
});

// Replies table (unchanged except minor fixes)
const createRepliesTable = `
CREATE TABLE IF NOT EXISTS replies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  bbc_ref_number VARCHAR(255) NOT NULL,
  intercept_id VARCHAR(36) NOT NULL,
  bbc_reply TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (intercept_id) REFERENCES intercepted_data(id) ON DELETE CASCADE
) ENGINE=InnoDB;
`;

db.query(createRepliesTable, (err) => {
  if (err) {
    console.error("Error creating replies table:", err.message);
  } else {
    console.log("Table 'replies' created or already exists.");
  }
});

// Problematic article table (unchanged)
const createProblematicTable = `
CREATE TABLE IF NOT EXISTS problematic_article (
  URL VARCHAR(255) PRIMARY KEY,
  title TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;
`;

db.query(createProblematicTable, (err) => {
  if (err) {
    console.error("Error creating problematic_article table:", err.message);
  } else {
    console.log("Table 'problematic_article' created or already exists.");
  }
});

// Middleware to validate UUID format for GET endpoints
function validateUUID(req, res, next) {
  const { uuid } = req.params;
  const uuidV4Pattern = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[4][0-9a-fA-F]{3}-[89ABab][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
  if (!uuidV4Pattern.test(uuid)) {
    return res.status(400).json({ error: "Invalid UUID format." });
  }
  next();
}

// GET /api/complaint/:uuid endpoint
app.get("/api/complaint/:uuid", validateUUID, async (req, res) => {
  const { uuid } = req.params;
  // Include the 'source' field in the query to know if the complaint is IPSO
  const query = `
    SELECT 
      id,
      originUrl,
      title,
      description,
      programme,
      transmissiondate,
      transmissiontime,
      sourceurl,
      timestamp,
      source
    FROM intercepted_data 
    WHERE id = ? 
    LIMIT 1;
  `;
  try {
    const [results] = await db.promise().query(query, [uuid]);
    if (results.length === 0) {
      return res.status(404).json({ error: "No data found for the provided UUID." });
    }
    const complaintData = results[0];
    // Build the base response object
    const responseData = {
      complaint: {
        id: complaintData.id,
        originUrl: complaintData.originUrl ? "[REDACTED]" : null,
        title: complaintData.title || null,
        description: complaintData.description || null,
        programme: complaintData.programme || null,
        transmissiondate: complaintData.transmissiondate || null,
        transmissiontime: complaintData.transmissiontime || null,
        sourceurl: complaintData.sourceurl || null,
        timestamp: complaintData.timestamp || null,
        source: complaintData.source || "BBC",
      },
    };

    // If the complaint is from IPSO, fetch additional IPSO-specific data
    if (complaintData.source === "IPSO") {
      const ipsoFieldsQuery = `
        SELECT field_order, field_value
        FROM ipso_complaint_fields
        WHERE complaint_id = ?
        ORDER BY field_order ASC;
      `;
      const ipsoCodeBreachesQuery = `
        SELECT clause, details
        FROM ipso_code_breaches
        WHERE complaint_id = ?;
      `;
      // Execute both queries concurrently
      const [fieldsResult, breachesResult] = await Promise.all([
        db.promise().query(ipsoFieldsQuery, [uuid]),
        db.promise().query(ipsoCodeBreachesQuery, [uuid])
      ]);
      responseData.complaint.ipsoFields = fieldsResult[0];
      responseData.complaint.ipsoCodeBreaches = breachesResult[0];
    }

    console.log(`Complaint data accessed for ID: ${uuid}`);
    res.status(200).json(responseData);
  } catch (err) {
    console.error("Database fetch error:", err.message);
    res.status(500).json({ error: "Failed to fetch complaint data." });
  }
});


// GET /api/replies/:uuid endpoint
app.get("/api/replies/:uuid", validateUUID, (req, res) => {
  const { uuid } = req.params;
  const query = "SELECT * FROM replies WHERE intercept_id = ? ORDER BY timestamp ASC;";
  console.log(`Executing Query: ${query} with UUID: ${uuid}`);
  db.query(query, [uuid], (err, results) => {
    if (err) {
      console.error("Database fetch error:", err.message);
      return res.status(500).json({ error: "Failed to fetch replies." });
    }
    res.status(200).json(results);
  });
});

// Serve static files for replay endpoint
app.use("/api/replay", express.static("public"));

/**
 * Common handler for POST /api/intercept and /api/intercept/v2.
 * It checks that privacyPolicyAccepted is true and then inserts data
 * differently based on the complaint source ("BBC" or "IPSO").
 */
function handleIntercept(req, res) {
  const { originUrl, interceptedData, privacyPolicyAccepted } = req.body;

  if (!privacyPolicyAccepted || privacyPolicyAccepted !== true) {
    return res.status(400).json({ error: "Privacy policy must be accepted." });
  }
  if (!originUrl || !interceptedData) {
    console.error("Invalid request body:", req.body);
    return res.status(400).json({ error: "Invalid request body." });
  }

  // Sanitize all incoming data values (for simplicity, we sanitize strings below)
  const sanitizedOriginUrl = sanitizeHtml(originUrl);
  const complaintSource = (req.body.where || "BBC").toUpperCase(); // default to BBC if not provided
  const id = generateId();

  // Prepare common data for insertion into intercepted_data
  let title = "";
  let description = "";
  // For BBC, interceptedData has flat fields; for IPSO, structure is different.
  if (complaintSource === "IPSO") {
    // Expect interceptedData to contain complaintDetails, codeBreaches, and contactDetails.
    if (!interceptedData.complaintDetails || !interceptedData.contactDetails) {
      return res.status(400).json({ error: "Missing required IPSO data." });
    }
    title = sanitizeHtml(interceptedData.complaintDetails.title || "");
    // Optionally, you could join the complaintDetails.fields array into one text field
    if (Array.isArray(interceptedData.complaintDetails.fields)) {
      description = interceptedData.complaintDetails.fields
        .map((s) => sanitizeHtml(s))
        .join("\n");
    }
  } else {
    // BBC data – use provided flat fields
    title = sanitizeHtml(interceptedData.title || "");
    description = sanitizeHtml(interceptedData.description || "");
  }

  // Build the insert query for intercepted_data.
  // For legacy BBC data, we insert the existing columns.
  // For IPSO, we insert common fields plus IPSO-specific terms, using emailaddress, firstname, and lastname.
  let insertQuery = "";
  let values = [];
  if (complaintSource === "IPSO") {
    insertQuery = `
      INSERT INTO intercepted_data (
        id, source, originUrl, title, description,
        emailaddress, firstname, lastname, ipso_terms
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
    `;
    const contact = interceptedData.contactDetails;
    values = [
      id,
      complaintSource,
      sanitizedOriginUrl,
      title,
      description,
      sanitizeHtml(contact.email_address || ""),
      sanitizeHtml(contact.first_name || ""),
      sanitizeHtml(contact.last_name || ""),
      contact["terms-and-conditions"] === true ? 1 : 0,
    ];
  } else {
    // BBC – assume interceptedData has fields matching the legacy schema.
    // Only a subset is shown here for brevity; add other fields as needed.
    insertQuery = `
      INSERT INTO intercepted_data (
        id, source, originUrl, title, description,
        emailaddress, firstname, lastname, salutation, generalissue1,
        intro_text, iswelsh, liveorondemand, localradio, make,
        moderation_text, network, outside_the_uk, platform, programme,
        programmeid, reception_text, redbuttonfault, region, responserequired,
        servicetv, sounds_text, sourceurl, subject, transmissiondate,
        transmissiontime, under18, verifyform, complaint_nature, complaint_nature_sounds
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `;
    values = [
      id,
      complaintSource,
      sanitizedOriginUrl,
      sanitizeHtml(interceptedData.title || ""),
      sanitizeHtml(interceptedData.description || ""),
      sanitizeHtml(interceptedData.emailaddress || ""),
      sanitizeHtml(interceptedData.firstname || ""),
      sanitizeHtml(interceptedData.lastname || ""),
      sanitizeHtml(interceptedData.salutation || ""),
      sanitizeHtml(interceptedData.generalissue1 || ""),
      sanitizeHtml(interceptedData.intro_text || ""),
      sanitizeHtml(interceptedData.iswelsh || ""),
      sanitizeHtml(interceptedData.liveorondemand || ""),
      sanitizeHtml(interceptedData.localradio || ""),
      sanitizeHtml(interceptedData.make || ""),
      sanitizeHtml(interceptedData.moderation_text || ""),
      sanitizeHtml(interceptedData.network || ""),
      sanitizeHtml(interceptedData.outside_the_uk || ""),
      sanitizeHtml(interceptedData.platform || ""),
      sanitizeHtml(interceptedData.programme || ""),
      sanitizeHtml(interceptedData.programmeid || ""),
      sanitizeHtml(interceptedData.reception_text || ""),
      sanitizeHtml(interceptedData.redbuttonfault || ""),
      sanitizeHtml(interceptedData.region || ""),
      sanitizeHtml(interceptedData.responserequired || ""),
      sanitizeHtml(interceptedData.servicetv || ""),
      sanitizeHtml(interceptedData.sounds_text || ""),
      sanitizeHtml(interceptedData.sourceurl || ""),
      sanitizeHtml(interceptedData.subject || ""),
      sanitizeHtml(interceptedData.transmissiondate || ""),
      sanitizeHtml(interceptedData.transmissiontime || ""),
      sanitizeHtml(interceptedData.under18 || ""),
      sanitizeHtml(interceptedData.verifyform || ""),
      sanitizeHtml(interceptedData.complaint_nature || ""),
      sanitizeHtml(interceptedData.complaint_nature_sounds || "")
    ];
  }

  db.query(insertQuery, values, (err) => {
    if (err) {
      console.error("Database insertion error:", err.message, { query: insertQuery, values });
      return res.status(500).json({ error: "Failed to store data." });
    }

    // If the complaint is IPSO, also insert the decomposed arrays into separate tables.
    if (complaintSource === "IPSO") {
      // Insert each complaint field (if provided)
      if (Array.isArray(interceptedData.complaintDetails.fields)) {
        interceptedData.complaintDetails.fields.forEach((fieldValue, index) => {
          const fieldInsert = `
            INSERT INTO ipso_complaint_fields (complaint_id, field_order, field_value)
            VALUES (?, ?, ?);
          `;
          db.query(fieldInsert, [id, index, sanitizeHtml(fieldValue)], (err) => {
            if (err) {
              console.error("Error inserting IPSO complaint field:", err.message);
            }
          });
        });
      }

      // Insert each code breach entry
      if (Array.isArray(interceptedData.codeBreaches)) {
        interceptedData.codeBreaches.forEach((breach) => {
          const clause = sanitizeHtml(breach.clause || "");
          const details = sanitizeHtml(breach.details || "");
          const breachInsert = `
            INSERT INTO ipso_code_breaches (complaint_id, clause, details)
            VALUES (?, ?, ?);
          `;
          db.query(breachInsert, [id, clause, details], (err) => {
            if (err) {
              console.error("Error inserting IPSO code breach:", err.message);
            }
          });
        });
      }
    }

    console.log("Data successfully inserted with ID:", id);
    res.status(200).json({ message: "Data stored successfully.", id });
  });
}

// POST endpoint for legacy compatibility
app.post("/api/intercept", handleIntercept);

// New endpoint for IPSO/BBC (forwarding and backwards compatibility)
app.post("/api/intercept/v2", handleIntercept);

// GET endpoint for problematic articles
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

// POST endpoint to store replies
app.post("/api/replies", (req, res) => {
  const { bbc_ref_number, intercept_id, bbc_reply } = req.body;
  if (!intercept_id || !bbc_reply) {
    return res.status(400).json({ error: "Missing required fields." });
  }
  const uuidV4Pattern = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89ABab][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
  if (!uuidV4Pattern.test(intercept_id)) {
    return res.status(400).json({ error: "Invalid TACC Record ID format." });
  }
  const checkInterceptIdQuery = "SELECT id FROM intercepted_data WHERE id = ? LIMIT 1;";
  db.query(checkInterceptIdQuery, [intercept_id], (err, results) => {
    if (err) {
      console.error("Database error during intercept_id check:", err.message);
      return res.status(500).json({ error: "Internal server error." });
    }
    if (results.length === 0) {
      return res.status(400).json({ error: "Invalid intercept_id. No matching record found." });
    }
    const sanitizedReply = sanitizeHtml(bbc_reply);
    const insertReplyQuery = `
      INSERT INTO replies (bbc_ref_number, intercept_id, bbc_reply)
      VALUES (?, ?, ?);
    `;
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
