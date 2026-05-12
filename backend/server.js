const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const express = require("express");
const mysql = require("mysql2");
const { AsyncLocalStorage, AsyncResource } = require("async_hooks");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

db.getConnection((err, conn) => {
  if (err) {
    console.error("❌ Database connection failed:");
    console.error("   Host:", process.env.DB_HOST);
    console.error("   Port:", process.env.DB_PORT);
    console.error("   Error:", err.message);
  } else {
    console.log("✅ Connected to MySQL");
    conn.release();
  }
});

// ===========================
// MySQL Pool Transaction Patch
// ===========================
// mysql.createPool() does not expose db.beginTransaction(), db.commit(),
// and db.rollback() directly. Several routes below use those methods.
// This patch keeps the existing route code working by borrowing one
// pool connection per transaction and routing db.query() to that same
// connection while inside the transaction callback chain.
const transactionStorage = new AsyncLocalStorage();
const poolQuery = db.query.bind(db);

db.query = (...args) => {
  const txConn = transactionStorage.getStore();
  
  // Bind the callback to the current async context to prevent context loss
  // inside mysql2's internal queues, which was causing transaction deadlocks.
  const callbackIndex = args.findIndex(arg => typeof arg === 'function');
  if (callbackIndex !== -1) {
    args[callbackIndex] = AsyncResource.bind(args[callbackIndex]);
  }

  if (txConn) return txConn.query(...args);
  return poolQuery(...args);
};

db.beginTransaction = (callback) => {
  db.getConnection((connErr, conn) => {
    if (connErr) return callback(connErr);

    conn.beginTransaction((txErr) => {
      if (txErr) {
        conn.release();
        return callback(txErr);
      }

      transactionStorage.run(conn, () => callback(null));
    });
  });
};

db.commit = (callback) => {
  const txConn = transactionStorage.getStore();

  if (!txConn) {
    return callback(new Error("No active transaction connection found."));
  }

  txConn.commit((err) => {
    txConn.release();
    callback(err);
  });
};

db.rollback = (callback = () => { }) => {
  const txConn = transactionStorage.getStore();

  if (!txConn) {
    return callback();
  }

  txConn.rollback(() => {
    txConn.release();
    callback();
  });
};

// ===========================
// Helpers
// ===========================
const toNullIfEmpty = (v) => (v === "" || v === undefined ? null : v);

const toNumOrNull = (v) => {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const toNumOrZero = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const parseJsonSafe = (raw) => {
  if (!raw) return null;
  if (typeof raw === "object") return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const mapAddressMetaFromBody = (body = {}) => {
  const m = body.addressMeta || {};
  return {
    address_mode: toNullIfEmpty(m.mode),
    address_manual_text: toNullIfEmpty(m.manualText),
    address_province: toNullIfEmpty(m.province),
    address_municipality: toNullIfEmpty(m.municipality),
    address_barangay: toNullIfEmpty(m.barangay),
    address_lat: toNumOrNull(m.lat),
    address_lng: toNumOrNull(m.lng),
  };
};

const mapTacsAddressMeta = (obj) => {
  if (!obj) return null;
  try {
    return JSON.stringify(obj);
  } catch {
    return null;
  }
};

const formatDateOnly = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
};

const pickFirst = (...vals) => {
  for (const v of vals) {
    if (v !== undefined && v !== null) return v;
  }
  return null;
};

const deriveAddressMode = (row = {}) => {
  if (row.address_mode) return row.address_mode;
  if (row.address_manual_text) return "manual";
  if (row.address_municipality || row.address_barangay) return "hierarchical";
  return "";
};

// ===========================
// TECHNOLOGY PROMOTION HELPERS
// ===========================
const TP_DEFAULT_PROJECTS = ["Setup", "CEST", "SSCP"];
const TP_DEFAULT_MODES = [
  "TechnoTransfer Day",
  "Forum",
  "Seminar",
  "Training",
  "Exhibit",
  "Caravan",
  "FGD",
  "Brochure",
  "Walk-in customers",
  "Social Media",
  "Interviews",
];

const ensureTechnologyPromotionDefaults = (callback) => {
  const insertProjects = (index = 0) => {
    if (index >= TP_DEFAULT_PROJECTS.length) return insertModes();

    db.query(
      "INSERT IGNORE INTO tp_projects (name) VALUES (?)",
      [TP_DEFAULT_PROJECTS[index]],
      (err) => {
        if (err) return callback(err);
        insertProjects(index + 1);
      }
    );
  };

  const insertModes = (index = 0) => {
    if (index >= TP_DEFAULT_MODES.length) return callback(null);

    db.query(
      "INSERT IGNORE INTO tp_modes (name) VALUES (?)",
      [TP_DEFAULT_MODES[index]],
      (err) => {
        if (err) return callback(err);
        insertModes(index + 1);
      }
    );
  };

  insertProjects();
};

const normalizeTechnologyPromotionEntry = (row, photos = []) => ({
  id: String(row.id),
  project: row.project_name || "",
  activityDate: row.activity_date ? formatDateOnly(row.activity_date) : "",
  technologyPromoted: row.technology_promoted || "",
  technologyGenerator: row.technology_generator || "",
  modeOfPromotion: row.mode_of_promotion || "",
  activityTitle: row.activity_title || "",
  activityVenueAddress: row.activity_venue_address || "",
  activityVenueMeta: {
    mode: row.venue_mode || null,
    manualText: row.venue_mode === "manual" ? row.venue_display_text || "" : "",
    displayText: row.venue_display_text || row.activity_venue_address || "",
    province: row.venue_province || "",
    municipality: row.venue_municipality || "",
    barangay: row.venue_barangay || "",
    lat:
      row.venue_lat !== null && row.venue_lat !== undefined
        ? Number(row.venue_lat)
        : null,
    lng:
      row.venue_lng !== null && row.venue_lng !== undefined
        ? Number(row.venue_lng)
        : null,
  },
  customerName: row.customer_name || "",
  customerAddress: row.customer_address || "",
  sex: row.sex || "N/A",
  meansOfVerification: row.means_of_verification || "",
  staffName: row.staff_name || "",
  nameOfStaff: row.staff_name || "",
  custom_fields: parseJsonSafe(row.custom_fields) || {},
  customFields: parseJsonSafe(row.custom_fields) || {},
  photos,
  sourceModule: row.source_module || "",
  sourceProjectId:
    row.source_project_id !== null && row.source_project_id !== undefined
      ? Number(row.source_project_id)
      : null,
  sourceInterventionId:
    row.source_intervention_id !== null && row.source_intervention_id !== undefined
      ? Number(row.source_intervention_id)
      : null,
  sourceType: row.source_type || "",
});

const saveTechnologyPromotionPhotos = (entryId, photos, callback) => {
  const list = Array.isArray(photos) ? photos : [];
  if (!list.length) return callback(null);

  let i = 0;

  const next = () => {
    if (i >= list.length) return callback(null);

    const p = list[i++];
    db.query(
      `
      INSERT INTO technology_promotion_photos
      (entry_id, file_name, mime_type, file_data)
      VALUES (?, ?, ?, ?)
      `,
      [
        entryId,
        String(p?.name || "photo"),
        String(p?.type || "image/jpeg"),
        String(p?.dataUrl || ""),
      ],
      (err) => {
        if (err) return callback(err);
        next();
      }
    );
  };

  next();
};


const syncCestTechnologyPromotionEntry = (
  { projectId, interventionId, type, body },
  callback
) => {
  const removeLinkedTechnologyPromotion = () => {
    db.query(
      "SELECT id FROM technology_promotion_entries WHERE source_module = ? AND source_intervention_id = ?",
      ["CEST", interventionId],
      (findErr, rows) => {
        if (findErr) return callback(findErr);

        const ids = (rows || [])
          .map((row) => Number(row.id))
          .filter((id) => Number.isFinite(id) && id > 0);

        const deleteEntryRows = () =>
          db.query(
            "DELETE FROM technology_promotion_entries WHERE source_module = ? AND source_intervention_id = ?",
            ["CEST", interventionId],
            (deleteErr) => {
              if (deleteErr) return callback(deleteErr);
              callback(null);
            }
          );

        if (!ids.length) return deleteEntryRows();

        const placeholders = ids.map(() => "?").join(",");
        db.query(
          `DELETE FROM technology_promotion_photos WHERE entry_id IN (${placeholders})`,
          ids,
          (photoErr) => {
            if (photoErr) return callback(photoErr);
            deleteEntryRows();
          }
        );
      }
    );
  };

  console.log("[CEST TECH PROMO] incoming type:", type);

  if (!isCestTechPromoType(type)) {
    console.log("[CEST TECH PROMO] skipped because type did not match:", type);
    return removeLinkedTechnologyPromotion();
  }

  const promo = mapCestTechPromoPayload(body, type);
  const venueMeta = parseJsonSafe(promo.venue_address_meta) || {};
  const photos = parseJsonSafe(promo.photos) || [];

  const activityDate = toNullIfEmpty(
    pickFirst(
      body.promoActivityDate,
      body.promo_activity_date,
      body.activityDate,
      body.activity_date,
      body.date,
      null
    )
  );
  const activityTitle = toNullIfEmpty(
    pickFirst(
      body.promoActivityTitle,
      body.promo_activity_title,
      body.activityTitle,
      body.activity_title,
      body.title,
      null
    )
  );
  const activityVenueAddress = toNullIfEmpty(
    pickFirst(
      body.promoActivityVenueAddress,
      body.promo_activity_venue_address,
      body.activityVenueAddress,
      body.activity_venue_address,
      body.venue,
      body.venueAddress,
      body.venue_address,
      null
    )
  );

  const payload = {
    project_name: promo.project_name,
    activity_date: activityDate,
    technology_promoted: promo.technology_promoted,
    technology_generator: promo.technology_generator,
    mode_of_promotion: promo.mode_of_promotion,
    activity_title: activityTitle,
    activity_venue_address: activityVenueAddress,
    venue_mode: toNullIfEmpty(venueMeta?.mode),
    venue_display_text: toNullIfEmpty(
      venueMeta?.displayText || venueMeta?.manualText || activityVenueAddress
    ),
    venue_province: toNullIfEmpty(venueMeta?.province),
    venue_municipality: toNullIfEmpty(venueMeta?.municipality),
    venue_barangay: toNullIfEmpty(venueMeta?.barangay),
    venue_lat: toNumOrNull(venueMeta?.lat),
    venue_lng: toNumOrNull(venueMeta?.lng),
    customer_name: promo.customer_name,
    customer_address: promo.customer_address,
    sex: toNullIfEmpty(promo.sex) || "N/A",
    means_of_verification: promo.means_of_verification,
    staff_name: promo.staff_name,
    source_module: "CEST",
    source_project_id: toNumOrNull(projectId),
    source_intervention_id: toNumOrNull(interventionId),
    source_type: String(type || "").trim() || null,
  };

  const hasRequiredFields = Boolean(
    payload.activity_date &&
    payload.technology_promoted &&
    payload.technology_generator &&
    payload.mode_of_promotion &&
    payload.activity_title &&
    payload.activity_venue_address &&
    payload.customer_name &&
    payload.customer_address &&
    payload.staff_name
  );

  console.log("[CEST TECH PROMO] payload:", payload);

  if (!hasRequiredFields) {
    console.log("[CEST TECH PROMO] skipped because required fields are incomplete:", {
      activity_date: payload.activity_date,
      technology_promoted: payload.technology_promoted,
      technology_generator: payload.technology_generator,
      mode_of_promotion: payload.mode_of_promotion,
      activity_title: payload.activity_title,
      activity_venue_address: payload.activity_venue_address,
      customer_name: payload.customer_name,
      customer_address: payload.customer_address,
      staff_name: payload.staff_name,
    });
    return removeLinkedTechnologyPromotion();
  }

  db.query(
    "SELECT id FROM technology_promotion_entries WHERE source_module = ? AND source_intervention_id = ? LIMIT 1",
    ["CEST", interventionId],
    (findErr, rows) => {
      if (findErr) return callback(findErr);

      const existingId = rows?.[0]?.id ? Number(rows[0].id) : null;
      const params = [
        payload.project_name,
        payload.activity_date,
        payload.technology_promoted,
        payload.technology_generator,
        payload.mode_of_promotion,
        payload.activity_title,
        payload.activity_venue_address,
        payload.venue_mode,
        payload.venue_display_text,
        payload.venue_province,
        payload.venue_municipality,
        payload.venue_barangay,
        payload.venue_lat,
        payload.venue_lng,
        payload.customer_name,
        payload.customer_address,
        payload.sex,
        payload.means_of_verification,
        payload.staff_name,
        payload.source_module,
        payload.source_project_id,
        payload.source_intervention_id,
        payload.source_type,
      ];

      const sql = existingId
        ? `
          UPDATE technology_promotion_entries
          SET
            project_name = ?,
            activity_date = ?,
            technology_promoted = ?,
            technology_generator = ?,
            mode_of_promotion = ?,
            activity_title = ?,
            activity_venue_address = ?,
            venue_mode = ?,
            venue_display_text = ?,
            venue_province = ?,
            venue_municipality = ?,
            venue_barangay = ?,
            venue_lat = ?,
            venue_lng = ?,
            customer_name = ?,
            customer_address = ?,
            sex = ?,
            means_of_verification = ?,
            staff_name = ?,
            source_module = ?,
            source_project_id = ?,
            source_intervention_id = ?,
            source_type = ?
          WHERE id = ?
        `
        : `
          INSERT INTO technology_promotion_entries (
            project_name,
            activity_date,
            technology_promoted,
            technology_generator,
            mode_of_promotion,
            activity_title,
            activity_venue_address,
            venue_mode,
            venue_display_text,
            venue_province,
            venue_municipality,
            venue_barangay,
            venue_lat,
            venue_lng,
            customer_name,
            customer_address,
            sex,
            means_of_verification,
            staff_name,
            source_module,
            source_project_id,
            source_intervention_id,
            source_type
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

      db.query(sql, existingId ? [...params, existingId] : params, (saveErr, result) => {
        if (saveErr) {
          console.error("[CEST TECH PROMO] save error:", saveErr);
          return callback(saveErr);
        }

        const entryId = existingId || Number(result.insertId);
        console.log("[CEST TECH PROMO] saved entry id:", entryId);

        db.query(
          "DELETE FROM technology_promotion_photos WHERE entry_id = ?",
          [entryId],
          (deletePhotoErr) => {
            if (deletePhotoErr) return callback(deletePhotoErr);

            saveTechnologyPromotionPhotos(entryId, photos, (photoErr) => {
              if (photoErr) return callback(photoErr);
              callback(null, entryId);
            });
          }
        );
      });
    }
  );
};


const ST_TECH_PROMO_TYPES = ["Tech Promo"];

const isProjectInterventionTechPromoType = (type = "") =>
  ST_TECH_PROMO_TYPES.includes(String(type || "").trim());

const normalizeTechnologyPromotionProjectName = (value = "") => {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const lower = raw.toLowerCase();
  if (lower === "setup") return "Setup";
  if (lower === "cest") return "CEST";
  if (lower === "sscp") return "SSCP";
  return raw;
};

const resolveTechnologyPromotionProjectNameForProject = (projectId, body, callback) => {
  const direct = normalizeTechnologyPromotionProjectName(
    pickFirst(body?.project, body?.project_name, body?.projectName, null)
  );

  if (direct) return callback(null, direct);

  if (!Number.isFinite(Number(projectId)) || Number(projectId) <= 0) {
    return callback(null, null);
  }

  db.query(
    `SELECT phase, stpms_status FROM projects WHERE id = ? LIMIT 1`,
    [projectId],
    (err, rows) => {
      if (err) return callback(err);
      const row = rows?.[0] || {};
      const normalized = normalizeTechnologyPromotionProjectName(
        pickFirst(row.phase, row.stpms_status, null)
      );
      callback(null, normalized || null);
    }
  );
};

const mapProjectInterventionTechPromoPayload = (body = {}, projectName = null) => {
  const notesObj = parseInterventionNotesObject(body.notes);
  const venueMeta =
    pickFirst(
      body.promoActivityVenueMeta,
      body.promo_activity_venue_meta,
      body.activityVenueMeta,
      body.activity_venue_meta,
      body.venueMeta,
      body.venueAddressMeta,
      body.venue_address_meta,
      notesObj.promoActivityVenueMeta,
      notesObj.promo_activity_venue_meta,
      notesObj.activityVenueMeta,
      notesObj.activity_venue_meta,
      notesObj.venueMeta,
      notesObj.venueAddressMeta,
      notesObj.venue_address_meta,
      null
    ) || null;

  const rawPhotos =
    pickFirst(
      body.promoPhotos,
      body.promo_photos,
      body.photos,
      body.techPromoPhotos,
      notesObj.promoPhotos,
      notesObj.promo_photos,
      notesObj.photos,
      notesObj.techPromoPhotos,
      []
    ) || [];

  const photos = (Array.isArray(rawPhotos) ? rawPhotos : [])
    .map((p) => ({
      name: String(p?.name || "photo"),
      type: String(p?.type || "image/jpeg"),
      dataUrl: String(p?.dataUrl || p?.file_data || p?.src || ""),
    }))
    .filter((p) => p.dataUrl);

  const activityDate = toNullIfEmpty(
    pickFirst(
      body.promoActivityDate,
      body.promo_activity_date,
      body.activityDate,
      body.activity_date,
      body.date,
      notesObj.promoActivityDate,
      notesObj.promo_activity_date,
      notesObj.activityDate,
      notesObj.activity_date,
      notesObj.date,
      null
    )
  );

  const activityTitle = toNullIfEmpty(
    pickFirst(
      body.promoActivityTitle,
      body.promo_activity_title,
      body.activityTitle,
      body.activity_title,
      body.title,
      notesObj.promoActivityTitle,
      notesObj.promo_activity_title,
      notesObj.activityTitle,
      notesObj.activity_title,
      notesObj.title,
      null
    )
  );

  const activityVenueAddress = toNullIfEmpty(
    pickFirst(
      body.promoActivityVenueAddress,
      body.promo_activity_venue_address,
      body.activityVenueAddress,
      body.activity_venue_address,
      body.venue,
      body.venueAddress,
      body.venue_address,
      notesObj.promoActivityVenueAddress,
      notesObj.promo_activity_venue_address,
      notesObj.activityVenueAddress,
      notesObj.activity_venue_address,
      notesObj.venue,
      notesObj.venueAddress,
      notesObj.venue_address,
      null
    )
  );

  return {
    project_name: normalizeTechnologyPromotionProjectName(
      pickFirst(
        body.promoProject,
        body.promo_project,
        body.project,
        body.project_name,
        body.projectName,
        notesObj.promoProject,
        notesObj.promo_project,
        notesObj.project,
        notesObj.project_name,
        notesObj.projectName,
        projectName
      )
    ),
    activity_date: activityDate,
    technology_promoted: toNullIfEmpty(
      pickFirst(
        body.promoTechnologyPromoted,
        body.promo_technology_promoted,
        body.technologyPromoted,
        body.technology_promoted,
        notesObj.promoTechnologyPromoted,
        notesObj.promo_technology_promoted,
        notesObj.technologyPromoted,
        notesObj.technology_promoted,
        null
      )
    ),
    technology_generator: toNullIfEmpty(
      pickFirst(
        body.promoTechnologyGenerator,
        body.promo_technology_generator,
        body.technologyGenerator,
        body.technology_generator,
        notesObj.promoTechnologyGenerator,
        notesObj.promo_technology_generator,
        notesObj.technologyGenerator,
        notesObj.technology_generator,
        null
      )
    ),
    mode_of_promotion: toNullIfEmpty(
      pickFirst(
        body.promoModeOfPromotion,
        body.promo_mode_of_promotion,
        body.modeOfPromotion,
        body.mode_of_promotion,
        notesObj.promoModeOfPromotion,
        notesObj.promo_mode_of_promotion,
        notesObj.modeOfPromotion,
        notesObj.mode_of_promotion,
        null
      )
    ),
    activity_title: activityTitle,
    activity_venue_address: activityVenueAddress,
    venue_mode: toNullIfEmpty(venueMeta?.mode),
    venue_display_text: toNullIfEmpty(
      venueMeta?.displayText || venueMeta?.manualText || activityVenueAddress
    ),
    venue_province: toNullIfEmpty(venueMeta?.province),
    venue_municipality: toNullIfEmpty(venueMeta?.municipality),
    venue_barangay: toNullIfEmpty(venueMeta?.barangay),
    venue_lat: toNumOrNull(venueMeta?.lat),
    venue_lng: toNumOrNull(venueMeta?.lng),
    customer_name: toNullIfEmpty(
      pickFirst(
        body.promoCustomerName,
        body.promo_customer_name,
        body.customerName,
        body.customer_name,
        notesObj.promoCustomerName,
        notesObj.promo_customer_name,
        notesObj.customerName,
        notesObj.customer_name,
        null
      )
    ),
    customer_address: toNullIfEmpty(
      pickFirst(
        body.promoCustomerAddress,
        body.promo_customer_address,
        body.customerAddress,
        body.customer_address,
        notesObj.promoCustomerAddress,
        notesObj.promo_customer_address,
        notesObj.customerAddress,
        notesObj.customer_address,
        null
      )
    ),
    sex: toNullIfEmpty(
      pickFirst(
        body.promoSex,
        body.promo_sex,
        body.sex,
        body.customerSex,
        body.customer_sex,
        notesObj.promoSex,
        notesObj.promo_sex,
        notesObj.sex,
        notesObj.customerSex,
        notesObj.customer_sex,
        "N/A"
      )
    ) || "N/A",
    means_of_verification: toNullIfEmpty(
      pickFirst(
        body.promoMeansVerification,
        body.promo_means_verification,
        body.meansOfVerification,
        body.means_of_verification,
        notesObj.promoMeansVerification,
        notesObj.promo_means_verification,
        notesObj.meansOfVerification,
        notesObj.means_of_verification,
        null
      )
    ),
    staff_name: toNullIfEmpty(
      pickFirst(
        body.promoStaffName,
        body.promo_staff_name,
        body.staffName,
        body.staff_name,
        notesObj.promoStaffName,
        notesObj.promo_staff_name,
        notesObj.staffName,
        notesObj.staff_name,
        null
      )
    ),
    photos,
  };
};

const deleteProjectInterventionTechnologyPromotionEntry = (interventionId, callback) => {
  db.query(
    "SELECT id FROM technology_promotion_entries WHERE source_module = ? AND source_intervention_id = ?",
    ["S&T Intervention", interventionId],
    (findErr, rows) => {
      if (findErr) return callback(findErr);

      const ids = (rows || [])
        .map((row) => Number(row.id))
        .filter((id) => Number.isFinite(id) && id > 0);

      const deleteEntries = () =>
        db.query(
          "DELETE FROM technology_promotion_entries WHERE source_module = ? AND source_intervention_id = ?",
          ["S&T Intervention", interventionId],
          (deleteErr) => {
            if (deleteErr) return callback(deleteErr);
            callback(null);
          }
        );

      if (!ids.length) return deleteEntries();

      const placeholders = ids.map(() => "?").join(",");
      db.query(
        `DELETE FROM technology_promotion_photos WHERE entry_id IN (${placeholders})`,
        ids,
        (photoErr) => {
          if (photoErr) return callback(photoErr);
          deleteEntries();
        }
      );
    }
  );
};

const syncProjectInterventionTechnologyPromotionEntry = (
  { projectId, interventionId, type, body },
  callback
) => {
  if (!isProjectInterventionTechPromoType(type)) {
    return deleteProjectInterventionTechnologyPromotionEntry(interventionId, callback);
  }

  resolveTechnologyPromotionProjectNameForProject(projectId, body, (projectErr, projectName) => {
    if (projectErr) return callback(projectErr);

    const payload = mapProjectInterventionTechPromoPayload(body, projectName);

    const hasRequiredFields = Boolean(
      payload.activity_date &&
      payload.technology_promoted &&
      payload.technology_generator &&
      payload.mode_of_promotion &&
      payload.activity_title &&
      payload.activity_venue_address &&
      payload.customer_name &&
      payload.customer_address &&
      payload.staff_name
    );

    if (!hasRequiredFields) {
      return deleteProjectInterventionTechnologyPromotionEntry(interventionId, callback);
    }

    db.query(
      "SELECT id FROM technology_promotion_entries WHERE source_module = ? AND source_intervention_id = ? LIMIT 1",
      ["S&T Intervention", interventionId],
      (findErr, rows) => {
        if (findErr) return callback(findErr);

        const existingId = rows?.[0]?.id ? Number(rows[0].id) : null;
        const params = [
          payload.project_name,
          payload.activity_date,
          payload.technology_promoted,
          payload.technology_generator,
          payload.mode_of_promotion,
          payload.activity_title,
          payload.activity_venue_address,
          payload.venue_mode,
          payload.venue_display_text,
          payload.venue_province,
          payload.venue_municipality,
          payload.venue_barangay,
          payload.venue_lat,
          payload.venue_lng,
          payload.customer_name,
          payload.customer_address,
          payload.sex,
          payload.means_of_verification,
          payload.staff_name,
          "S&T Intervention",
          toNumOrNull(projectId),
          toNumOrNull(interventionId),
          String(type || "").trim() || null,
        ];

        const sql = existingId
          ? `
            UPDATE technology_promotion_entries
            SET
              project_name = ?,
              activity_date = ?,
              technology_promoted = ?,
              technology_generator = ?,
              mode_of_promotion = ?,
              activity_title = ?,
              activity_venue_address = ?,
              venue_mode = ?,
              venue_display_text = ?,
              venue_province = ?,
              venue_municipality = ?,
              venue_barangay = ?,
              venue_lat = ?,
              venue_lng = ?,
              customer_name = ?,
              customer_address = ?,
              sex = ?,
              means_of_verification = ?,
              staff_name = ?,
              source_module = ?,
              source_project_id = ?,
              source_intervention_id = ?,
              source_type = ?
            WHERE id = ?
          `
          : `
            INSERT INTO technology_promotion_entries (
              project_name,
              activity_date,
              technology_promoted,
              technology_generator,
              mode_of_promotion,
              activity_title,
              activity_venue_address,
              venue_mode,
              venue_display_text,
              venue_province,
              venue_municipality,
              venue_barangay,
              venue_lat,
              venue_lng,
              customer_name,
              customer_address,
              sex,
              means_of_verification,
              staff_name,
              source_module,
              source_project_id,
              source_intervention_id,
              source_type
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `;

        db.query(sql, existingId ? [...params, existingId] : params, (saveErr, result) => {
          if (saveErr) return callback(saveErr);

          const entryId = existingId || Number(result.insertId);
          db.query(
            "DELETE FROM technology_promotion_photos WHERE entry_id = ?",
            [entryId],
            (deletePhotoErr) => {
              if (deletePhotoErr) return callback(deletePhotoErr);
              saveTechnologyPromotionPhotos(entryId, payload.photos, callback);
            }
          );
        });
      }
    );
  });
};


// ===========================
// TECHNOLOGY TRAINING HELPERS
// ===========================
const TT_PANGASINAN_DISTRICTS = {
  "District 1": [
    "Agno",
    "Alaminos City",
    "Anda",
    "Bani",
    "Bolinao",
    "Burgos",
    "Dasol",
    "Infanta",
    "Mabini",
    "Sual",
  ],
  "District 2": [
    "Aguilar",
    "Basista",
    "Binmaley",
    "Bugallon",
    "Labrador",
    "Lingayen",
    "Mangatarem",
    "Urbiztondo",
  ],
  "District 3": [
    "Bayambang",
    "Calasiao",
    "Malasiqui",
    "Mapandan",
    "San Carlos City",
    "Santa Barbara",
  ],
  "District 4": [
    "Dagupan City",
    "Manaoag",
    "Mangaldan",
    "San Fabian",
    "San Jacinto",
  ],
  "District 5": [
    "Alcala",
    "Bautista",
    "Binalonan",
    "Laoac",
    "Pozorrubio",
    "Santo Tomas",
    "Sison",
    "Urdaneta City",
    "Villasis",
  ],
  "District 6": [
    "Asingan",
    "Balungao",
    "Natividad",
    "Rosales",
    "San Manuel",
    "San Nicolas",
    "San Quintin",
    "Santa Maria",
    "Tayug",
    "Umingan",
  ],
};

const normalizeTechnologyTrainingDistrictKey = (value = "") => {
  const raw = String(value || "").trim();
  if (!raw || raw.toUpperCase() === "ALL") return "ALL";

  const collapsed = raw.replace(/\s+/g, "").toLowerCase();
  const match = collapsed.match(/^district(\d+)$/);

  if (match) return `District ${match[1]}`;
  return raw.replace(/\s+/g, " ");
};

const buildTechnologyTrainingWhere = (query = {}) => {
  const where = [];
  const params = [];

  const search = String(query.search || "").trim();
  const year = String(query.year || "").trim();
  const district = normalizeTechnologyTrainingDistrictKey(query.district || "ALL");
  const month = String(query.month || "").trim();
  const municipality = String(query.municipality || "").trim();

  const muniExpr =
    "COALESCE(JSON_UNQUOTE(JSON_EXTRACT(venue_meta, '$.municipality')), '')";

  if (search) {
    const like = `%${search}%`;
    where.push(`(
      title LIKE ?
      OR venue_address LIKE ?
      OR program LIKE ?
      OR firms_associations_list LIKE ?
      OR trainor_affiliation LIKE ?
      OR program_project_unit LIKE ?
    )`);
    params.push(like, like, like, like, like, like);
  }

  if (year && year !== "ALL") {
    where.push("YEAR(COALESCE(start_date, created_at)) = ?");
    params.push(Number(year));
  }

  if (month && month !== "ALL") {
    where.push("MONTH(COALESCE(start_date, created_at)) = ?");
    params.push(Number(month));
  }

  if (district && district !== "ALL") {
    const municipalitiesForDistrict = TT_PANGASINAN_DISTRICTS[district] || [];
    if (!municipalitiesForDistrict.length) {
      where.push("1 = 0");
    } else {
      const jsonPlaceholders = municipalitiesForDistrict.map(() => "?").join(",");
      const likeClauses = municipalitiesForDistrict.map(() => "venue_address LIKE ?").join(" OR ");
      where.push(`(
        ${muniExpr} IN (${jsonPlaceholders})
        OR (${likeClauses})
      )`);
      params.push(...municipalitiesForDistrict, ...municipalitiesForDistrict.map((m) => `%${m}%`));
    }
  }

  if (municipality && municipality !== "ALL") {
    where.push(`(
      ${muniExpr} = ?
      OR venue_address LIKE ?
    )`);
    params.push(municipality, `%${municipality}%`);
  }

  return {
    whereSql: where.length ? `WHERE ${where.join(" AND ")}` : "",
    params,
  };
};

const normalizeTechnologyTrainingEntry = (row) => ({
  id: String(row.id),
  projectId:
    row.project_id !== null && row.project_id !== undefined
      ? Number(row.project_id)
      : null,
  interventionId:
    row.intervention_id !== null && row.intervention_id !== undefined
      ? Number(row.intervention_id)
      : null,
  sourceModule: row.source_module || "technology_training",
  sourceLabel: row.source_label || "Manual Technology Training Entry",
  program: row.program || "",
  province: row.province || "PANGASINAN",
  startDate: row.start_date_fmt || (row.start_date ? formatDateOnly(row.start_date) : ""),
  endDate: row.end_date_fmt || (row.end_date ? formatDateOnly(row.end_date) : ""),
  title: row.title || "",
  venueAddress: row.venue_address || "",
  venueMeta: parseJsonSafe(row.venue_meta),
  latitude:
    row.latitude !== null && row.latitude !== undefined
      ? Number(row.latitude)
      : parseJsonSafe(row.venue_meta)?.lat ?? parseJsonSafe(row.venue_meta)?.latitude ?? null,
  longitude:
    row.longitude !== null && row.longitude !== undefined
      ? Number(row.longitude)
      : parseJsonSafe(row.venue_meta)?.lng ?? parseJsonSafe(row.venue_meta)?.longitude ?? null,
  noOfFirms: Number(row.no_of_firms ?? 0),

  participantsFemale: Number(row.participants_female ?? 0),
  participantsMale: Number(row.participants_male ?? 0),

  seniorFemale: Number(row.senior_female ?? 0),
  seniorMale: Number(row.senior_male ?? 0),

  ipFemale: Number(row.ip_female ?? 0),
  ipMale: Number(row.ip_male ?? 0),

  fourPsFemale: Number(row.fourps_female ?? 0),
  fourPsMale: Number(row.fourps_male ?? 0),

  pwdFemale: Number(row.pwd_female ?? 0),
  pwdMale: Number(row.pwd_male ?? 0),

  totalFemale: Number(row.total_female ?? row.participants_female ?? 0),
  totalMale: Number(row.total_male ?? row.participants_male ?? 0),
  totalParticipants: Number(
    row.total_participants ??
    (Number(row.participants_female ?? 0) + Number(row.participants_male ?? 0))
  ),

  firmsSucsHeisLgusCount: Number(row.firms_sucs_heis_lgus_count ?? 0),
  firmsAssociationsList: row.firms_associations_list || "",
  trainorAffiliation: row.trainor_affiliation || "",
  programProjectUnit: row.program_project_unit || "",

  costDost: Number(row.cost_dost ?? 0),
  costPartnerAgency: Number(row.cost_partner_agency ?? 0),
  staffName: row.name_of_staff || row.staff_name || "",
  nameOfStaff: row.name_of_staff || row.staff_name || "",
  name_of_staff: row.name_of_staff || row.staff_name || "",
  custom_fields: parseJsonSafe(row.custom_fields) || {},
  customFields: parseJsonSafe(row.custom_fields) || {},

  created_at: row.created_at,
  updated_at: row.updated_at,
});

const normalizeTechnologyTrainingSource = (raw = "") => {
  const value = String(raw || "").trim().toLowerCase();

  if (value === "setup") {
    return { source_module: "setup", source_label: "SETUP" };
  }
  if (value === "cest") {
    return { source_module: "cest", source_label: "CEST" };
  }
  if (value === "sscp") {
    return { source_module: "sscp", source_label: "SSCP" };
  }

  if (value === "technology_training") {
    return {
      source_module: "technology_training",
      source_label: "Manual Technology Training Entry",
    };
  }

  return {
    source_module: "technology_training",
    source_label: "Manual Technology Training Entry",
  };
};

const getTechnologyTrainingSourceForProject = (
  projectId,
  callback,
  options = {}
) => {
  const forcedSource = normalizeTechnologyTrainingSource(
    options?.source_module || options?.sourceModule || options?.source || ""
  );

  if (
    forcedSource.source_module &&
    forcedSource.source_module !== "technology_training"
  ) {
    return callback(null, forcedSource);
  }

  db.query(
    `
      SELECT
        id,
        phase,
        project_title,
        stpms_status
      FROM projects
      WHERE id = ?
      LIMIT 1
    `,
    [projectId],
    (err, rows) => {
      if (err) return callback(err);

      const row = rows?.[0] || null;
      const rawType = row?.phase || row?.stpms_status || "";
      const normalized = normalizeTechnologyTrainingSource(rawType);

      if (
        normalized.source_module === "technology_training" &&
        Number(projectId) > 0
      ) {
        return callback(null, {
          source_module: "setup",
          source_label: "SETUP",
        });
      }

      callback(null, normalized);
    }
  );
};

const syncTechnologyTrainingEntryForIntervention = (
  { projectId, interventionId, type, body, source_module, source_label, sourceModule, sourceLabel },
  callback
) => {
  if (type !== "Training") {
    return db.query(
      "DELETE FROM technology_training_entries WHERE intervention_id = ?",
      [interventionId],
      (deleteErr) => {
        if (deleteErr) return callback(deleteErr);
        callback(null);
      }
    );
  }

  const notesObj = parseInterventionNotesObject(body?.notes);

  const pickTraining = (...vals) => {
    for (const v of vals) {
      if (v !== undefined && v !== null && v !== "") return v;
    }
    return null;
  };

  const participantsFemale = toNumOrZero(
    pickTraining(
      body.participantsFemale,
      body.participants_female,
      body.female,
      notesObj.participantsFemale,
      notesObj.participants_female,
      notesObj.female,
      0
    )
  );
  const participantsMale = toNumOrZero(
    pickTraining(
      body.participantsMale,
      body.participants_male,
      body.male,
      notesObj.participantsMale,
      notesObj.participants_male,
      notesObj.male,
      0
    )
  );

  const totalFemale = toNumOrZero(
    pickTraining(
      body.totalFemale,
      body.total_female,
      notesObj.totalFemale,
      notesObj.total_female,
      body.female,
      notesObj.female,
      participantsFemale
    )
  );
  const totalMale = toNumOrZero(
    pickTraining(
      body.totalMale,
      body.total_male,
      notesObj.totalMale,
      notesObj.total_male,
      body.male,
      notesObj.male,
      participantsMale
    )
  );
  const totalParticipants = toNumOrZero(
    pickTraining(
      body.totalParticipants,
      body.total_participants,
      body.grandTotal,
      body.total,
      notesObj.totalParticipants,
      notesObj.total_participants,
      notesObj.grandTotal,
      notesObj.total,
      totalFemale + totalMale
    )
  );

  const venueMeta = pickTraining(
    body.venueMeta,
    body.venue_meta,
    body.venueAddressMeta,
    body.venue_address_meta,
    notesObj.venueMeta,
    notesObj.venue_meta,
    notesObj.venueAddressMeta,
    notesObj.venue_address_meta,
    null
  );

  const latitude = toNumOrNull(
    pickTraining(
      body.latitude,
      body.lat,
      venueMeta?.lat,
      venueMeta?.latitude,
      notesObj.latitude,
      notesObj.lat,
      null
    )
  );

  const longitude = toNumOrNull(
    pickTraining(
      body.longitude,
      body.lng,
      venueMeta?.lng,
      venueMeta?.longitude,
      notesObj.longitude,
      notesObj.lng,
      null
    )
  );

  const forcedSourceModule =
    source_module || sourceModule || body.source_module || body.sourceModule || "";
  const forcedSourceLabel =
    source_label || sourceLabel || body.source_label || body.sourceLabel || "";

  getTechnologyTrainingSourceForProject(
    projectId,
    (sourceErr, sourceInfo) => {
      if (sourceErr) return callback(sourceErr);

      const payload = {
        project_id: projectId,
        intervention_id: interventionId,
        source_module: forcedSourceModule || sourceInfo?.source_module || "setup",
        source_label: forcedSourceLabel || sourceInfo?.source_label || "SETUP",
        program: String(
          pickTraining(
            body.program,
            body.program_training,
            body.programProjectUnit,
            body.projectProgramUnit,
            body.project_program_unit,
            notesObj.program,
            notesObj.program_training,
            notesObj.programProjectUnit,
            notesObj.projectProgramUnit,
            notesObj.project_program_unit,
            ""
          ) || ""
        ).trim(),
        province:
          String(
            pickTraining(body.province, notesObj.province, "PANGASINAN") ||
            "PANGASINAN"
          ).trim() || "PANGASINAN",
        start_date: toNullIfEmpty(
          pickTraining(
            body.startDate,
            body.start_date,
            body.date,
            notesObj.startDate,
            notesObj.start_date,
            notesObj.date,
            null
          )
        ),
        end_date: toNullIfEmpty(
          pickTraining(
            body.endDate,
            body.end_date,
            notesObj.endDate,
            notesObj.end_date,
            notesObj.notesEndDate,
            null
          )
        ),
        title: String(pickTraining(body.title, notesObj.title, "") || "").trim(),
        venue_address: String(
          pickTraining(
            body.venueAddress,
            body.venue_address,
            body.venue,
            notesObj.venueAddress,
            notesObj.venue_address,
            notesObj.venue,
            ""
          ) || ""
        ).trim(),
        venue_meta: venueMeta,
        latitude,
        longitude,
        no_of_firms: toNumOrZero(
          pickTraining(
            body.noOfFirms,
            body.no_of_firms,
            notesObj.noOfFirms,
            notesObj.no_of_firms,
            0
          )
        ),
        participants_female: participantsFemale,
        participants_male: participantsMale,
        senior_female: toNumOrZero(
          pickTraining(
            body.seniorFemale,
            body.senior_female,
            notesObj.seniorFemale,
            notesObj.senior_female,
            0
          )
        ),
        senior_male: toNumOrZero(
          pickTraining(
            body.seniorMale,
            body.senior_male,
            notesObj.seniorMale,
            notesObj.senior_male,
            0
          )
        ),
        ip_female: toNumOrZero(
          pickTraining(
            body.ipFemale,
            body.ip_female,
            notesObj.ipFemale,
            notesObj.ip_female,
            0
          )
        ),
        ip_male: toNumOrZero(
          pickTraining(
            body.ipMale,
            body.ip_male,
            notesObj.ipMale,
            notesObj.ip_male,
            0
          )
        ),
        fourps_female: toNumOrZero(
          pickTraining(
            body.fourPsFemale,
            body.fourps_female,
            notesObj.fourPsFemale,
            notesObj.fourps_female,
            0
          )
        ),
        fourps_male: toNumOrZero(
          pickTraining(
            body.fourPsMale,
            body.fourps_male,
            notesObj.fourPsMale,
            notesObj.fourps_male,
            0
          )
        ),
        pwd_female: toNumOrZero(
          pickTraining(
            body.pwdFemale,
            body.pwd_female,
            notesObj.pwdFemale,
            notesObj.pwd_female,
            0
          )
        ),
        pwd_male: toNumOrZero(
          pickTraining(
            body.pwdMale,
            body.pwd_male,
            notesObj.pwdMale,
            notesObj.pwd_male,
            0
          )
        ),
        total_female: totalFemale,
        total_male: totalMale,
        total_participants: totalParticipants,
        firms_sucs_heis_lgus_count: toNumOrZero(
          pickTraining(
            body.firmsSucsHeisLgusCount,
            body.firms_sucs_heis_lgus_count,
            body.noOfFirmsSucsHeisLgus,
            body.no_of_firms_sucs_heis_lgus,
            notesObj.firmsSucsHeisLgusCount,
            notesObj.firms_sucs_heis_lgus_count,
            notesObj.noOfFirmsSucsHeisLgus,
            notesObj.no_of_firms_sucs_heis_lgus,
            0
          )
        ),
        firms_associations_list: String(
          pickTraining(
            body.firmsAssociationsList,
            body.firms_associations_list,
            body.listOfFirmsAssociations,
            body.list_of_firms_associations,
            notesObj.firmsAssociationsList,
            notesObj.firms_associations_list,
            notesObj.listOfFirmsAssociations,
            notesObj.list_of_firms_associations,
            ""
          ) || ""
        ).trim(),
        trainor_affiliation: String(
          pickTraining(
            body.trainorAffiliation,
            body.trainor_affiliation,
            body.nameOfTrainorAffiliation,
            body.name_of_trainor_affiliation,
            notesObj.trainorAffiliation,
            notesObj.trainor_affiliation,
            notesObj.nameOfTrainorAffiliation,
            notesObj.name_of_trainor_affiliation,
            ""
          ) || ""
        ).trim(),
        program_project_unit: String(
          pickTraining(
            body.programProjectUnit,
            body.projectProgramUnit,
            body.project_program_unit,
            body.program_project_unit,
            notesObj.programProjectUnit,
            notesObj.projectProgramUnit,
            notesObj.project_program_unit,
            notesObj.program_project_unit,
            ""
          ) || ""
        ).trim(),
        cost_dost: toNumOrZero(
          pickTraining(
            body.costDost,
            body.cost_dost,
            body.dostCost,
            body.dost_cost,
            notesObj.costDost,
            notesObj.cost_dost,
            notesObj.dostCost,
            notesObj.dost_cost,
            0
          )
        ),
        cost_partner_agency: toNumOrZero(
          pickTraining(
            body.costPartnerAgency,
            body.cost_partner_agency,
            body.partnerAgencyCost,
            body.partner_agency_cost,
            notesObj.costPartnerAgency,
            notesObj.cost_partner_agency,
            notesObj.partnerAgencyCost,
            notesObj.partner_agency_cost,
            0
          )
        ),
      };

      db.query(
        "SELECT id FROM technology_training_entries WHERE intervention_id = ? LIMIT 1",
        [interventionId],
        (findErr, rows) => {
          if (findErr) return callback(findErr);

          const existingId = rows?.[0]?.id ? Number(rows[0].id) : null;
          const params = [
            payload.project_id,
            payload.intervention_id,
            payload.source_module,
            payload.source_label,
            payload.program,
            payload.province,
            payload.start_date,
            payload.end_date,
            payload.title,
            payload.venue_address,
            payload.venue_meta ? JSON.stringify(payload.venue_meta) : null,
            payload.latitude,
            payload.longitude,
            payload.no_of_firms,
            payload.participants_female,
            payload.participants_male,
            payload.senior_female,
            payload.senior_male,
            payload.ip_female,
            payload.ip_male,
            payload.fourps_female,
            payload.fourps_male,
            payload.pwd_female,
            payload.pwd_male,
            payload.total_female,
            payload.total_male,
            payload.total_participants,
            payload.firms_sucs_heis_lgus_count,
            payload.firms_associations_list,
            payload.trainor_affiliation,
            payload.program_project_unit,
            payload.cost_dost,
            payload.cost_partner_agency,
          ];

          const sql = existingId
            ? `
              UPDATE technology_training_entries
              SET
                project_id = ?,
                intervention_id = ?,
                source_module = ?,
                source_label = ?,
                program = ?,
                province = ?,
                start_date = ?,
                end_date = ?,
                title = ?,
                venue_address = ?,
                venue_meta = ?,
                latitude = ?,
                longitude = ?,
                no_of_firms = ?,
                participants_female = ?,
                participants_male = ?,
                senior_female = ?,
                senior_male = ?,
                ip_female = ?,
                ip_male = ?,
                fourps_female = ?,
                fourps_male = ?,
                pwd_female = ?,
                pwd_male = ?,
                total_female = ?,
                total_male = ?,
                total_participants = ?,
                firms_sucs_heis_lgus_count = ?,
                firms_associations_list = ?,
                trainor_affiliation = ?,
                program_project_unit = ?,
                cost_dost = ?,
                cost_partner_agency = ?
              WHERE id = ?
            `
            : `
              INSERT INTO technology_training_entries (
                project_id,
                intervention_id,
                source_module,
                source_label,
                program,
                province,
                start_date,
                end_date,
                title,
                venue_address,
                venue_meta,
                latitude,
                longitude,
                no_of_firms,
                participants_female,
                participants_male,
                senior_female,
                senior_male,
                ip_female,
                ip_male,
                fourps_female,
                fourps_male,
                pwd_female,
                pwd_male,
                total_female,
                total_male,
                total_participants,
                firms_sucs_heis_lgus_count,
                firms_associations_list,
                trainor_affiliation,
                program_project_unit,
                cost_dost,
                cost_partner_agency
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

          db.query(
            sql,
            existingId ? [...params, existingId] : params,
            (saveErr) => {
              if (saveErr) return callback(saveErr);
              callback(null, existingId);
            }
          );
        }
      );
    },
    {
      source_module: forcedSourceModule,
      source_label: forcedSourceLabel,
    }
  );
};

// ===========================
// TARGET SETTINGS HELPERS
// ===========================
const normalizeTargetSettingRows = (rows = []) =>
  (rows || []).map((r) => ({
    id: Number(r.id),
    moduleName: r.module_name,
    kpiKey: r.kpi_key,
    kpiLabel: r.kpi_label,
    kpi: r.kpi_label,
    annualTarget:
      r.annual_target === null || r.annual_target === undefined
        ? ""
        : String(Number(r.annual_target)),
    t1:
      r.q1_target === null || r.q1_target === undefined
        ? ""
        : String(Number(r.q1_target)),
    t2:
      r.q2_target === null || r.q2_target === undefined
        ? ""
        : String(Number(r.q2_target)),
    t3:
      r.q3_target === null || r.q3_target === undefined
        ? ""
        : String(Number(r.q3_target)),
    t4:
      r.q4_target === null || r.q4_target === undefined
        ? ""
        : String(Number(r.q4_target)),
  }));

const TARGET_SETTINGS_DEFAULTS = {
  st_promo: [
    {
      kpi_key: "peopleReachedSocialMedia",
      kpi_label:
        "KPI No. 1: No. of Reach (People Reached) of IEC Materials and Information on Social Media",
    },
    {
      kpi_key: "promotionalActivitiesOnsite",
      kpi_label:
        "KPI No. 2: Total No. of S&T Promotional Activities Conducted (Onsite)",
    },
    {
      kpi_key: "engagements",
      kpi_label: "KPI No. 3: No. of Engagements",
    },
  ],
};

const ensureTargetSettingsDefaults = (moduleName, callback) => {
  const normalizedModuleName = String(moduleName || "").trim().toLowerCase();
  const defaults = TARGET_SETTINGS_DEFAULTS[normalizedModuleName] || [];

  if (!normalizedModuleName || !defaults.length) {
    return callback(null);
  }

  let index = 0;

  const insertNext = () => {
    if (index >= defaults.length) {
      return callback(null);
    }

    const row = defaults[index++];

    db.query(
      `
        INSERT INTO target_settings (
          module_name,
          kpi_key,
          kpi_label,
          annual_target,
          q1_target,
          q2_target,
          q3_target,
          q4_target
        ) VALUES (?, ?, ?, 0, 0, 0, 0, 0)
        ON DUPLICATE KEY UPDATE
          kpi_label = VALUES(kpi_label)
      `,
      [normalizedModuleName, row.kpi_key, row.kpi_label],
      (err) => {
        if (err) return callback(err);
        insertNext();
      }
    );
  };

  insertNext();
};

// ===========================
// ROOT
// ===========================
app.get("/", (req, res) => {
  res.send("Backend is running");
});

// ===========================
// CEST TECH PROMO HELPERS
// ===========================
const CEST_TECH_PROMO_TYPES = [
  "tech promo",
  "tech promotion",
  "technology promotion",
];

const isCestTechPromoType = (type = "") => {
  const normalized = String(type || "").trim().toLowerCase();
  return CEST_TECH_PROMO_TYPES.includes(normalized);
};

const mapCestTechPromoPayload = (body = {}, type = "") => {
  const isPromo = isCestTechPromoType(type || body.type || "");
  const notesObj = parseInterventionNotesObject(body.notes);

  const venueMeta =
    pickFirst(
      body.promoActivityVenueMeta,
      body.promo_activity_venue_meta,
      body.activityVenueMeta,
      body.activity_venue_meta,
      body.venueAddressMeta,
      body.venue_address_meta,
      notesObj.promoActivityVenueMeta,
      notesObj.promo_activity_venue_meta,
      notesObj.activityVenueMeta,
      notesObj.activity_venue_meta,
      notesObj.venueAddressMeta,
      notesObj.venue_address_meta,
      null
    ) || null;

  const photosRaw = Array.isArray(body.promoPhotos)
    ? body.promoPhotos
    : Array.isArray(body.promo_photos)
      ? body.promo_photos
      : Array.isArray(body.photos)
        ? body.photos
        : Array.isArray(body.techPromoPhotos)
          ? body.techPromoPhotos
          : Array.isArray(body.tech_promo_photos)
            ? body.tech_promo_photos
            : Array.isArray(body.activityPhotos)
              ? body.activityPhotos
              : Array.isArray(body.activity_photos)
                ? body.activity_photos
                : Array.isArray(body.photoFiles)
                  ? body.photoFiles
                  : Array.isArray(body.photo_files)
                    ? body.photo_files
                    : Array.isArray(notesObj.promoPhotos)
                      ? notesObj.promoPhotos
                      : Array.isArray(notesObj.promo_photos)
                        ? notesObj.promo_photos
                        : Array.isArray(notesObj.photos)
                          ? notesObj.photos
                          : Array.isArray(notesObj.techPromoPhotos)
                            ? notesObj.techPromoPhotos
                            : Array.isArray(notesObj.tech_promo_photos)
                              ? notesObj.tech_promo_photos
                              : Array.isArray(notesObj.activityPhotos)
                                ? notesObj.activityPhotos
                                : Array.isArray(notesObj.activity_photos)
                                  ? notesObj.activity_photos
                                  : Array.isArray(notesObj.photoFiles)
                                    ? notesObj.photoFiles
                                    : Array.isArray(notesObj.photo_files)
                                      ? notesObj.photo_files
                                      : [];

  const photos = photosRaw
    .map((p) => {
      if (typeof p === "string") {
        return {
          name: "photo",
          type: p.startsWith("data:") ? "image/jpeg" : "image/jpeg",
          dataUrl: String(p || ""),
        };
      }

      return {
        name: String(
          p?.name ||
          p?.original_name ||
          p?.originalName ||
          p?.file_name ||
          "photo"
        ),
        type: String(
          p?.type ||
          p?.mime_type ||
          p?.mimeType ||
          p?.content_type ||
          "image/jpeg"
        ),
        dataUrl: String(
          p?.dataUrl ||
          p?.data_url ||
          p?.file_data ||
          p?.src ||
          p?.url ||
          p?.photo_url ||
          p?.photoUrl ||
          ""
        ),
      };
    })
    .filter((p) => p.dataUrl);

  return {
    project_name: isPromo
      ? toNullIfEmpty(
        pickFirst(
          body.promoProject,
          body.promo_project,
          body.project,
          body.project_name,
          notesObj.promoProject,
          notesObj.promo_project,
          notesObj.project,
          notesObj.project_name,
          "CEST"
        )
      )
      : null,

    technology_promoted: isPromo
      ? toNullIfEmpty(
        pickFirst(
          body.promoTechnologyPromoted,
          body.promo_technology_promoted,
          body.technologyPromoted,
          body.technology_promoted,
          notesObj.promoTechnologyPromoted,
          notesObj.promo_technology_promoted,
          notesObj.technologyPromoted,
          notesObj.technology_promoted,
          null
        )
      )
      : null,

    technology_generator: isPromo
      ? toNullIfEmpty(
        pickFirst(
          body.promoTechnologyGenerator,
          body.promo_technology_generator,
          body.technologyGenerator,
          body.technology_generator,
          notesObj.promoTechnologyGenerator,
          notesObj.promo_technology_generator,
          notesObj.technologyGenerator,
          notesObj.technology_generator,
          null
        )
      )
      : null,

    mode_of_promotion: isPromo
      ? toNullIfEmpty(
        pickFirst(
          body.promoModeOfPromotion,
          body.promo_mode_of_promotion,
          body.modeOfPromotion,
          body.mode_of_promotion,
          notesObj.promoModeOfPromotion,
          notesObj.promo_mode_of_promotion,
          notesObj.modeOfPromotion,
          notesObj.mode_of_promotion,
          null
        )
      )
      : null,

    customer_name: isPromo
      ? toNullIfEmpty(
        pickFirst(
          body.promoCustomerName,
          body.promo_customer_name,
          body.customerName,
          body.customer_name,
          body.customerParticipantName,
          body.customer_participant_name,
          notesObj.promoCustomerName,
          notesObj.promo_customer_name,
          notesObj.customerName,
          notesObj.customer_name,
          notesObj.customerParticipantName,
          notesObj.customer_participant_name,
          null
        )
      )
      : null,

    customer_address: isPromo
      ? toNullIfEmpty(
        pickFirst(
          body.promoCustomerAddress,
          body.promo_customer_address,
          body.customerAddress,
          body.customer_address,
          body.customerParticipantAddress,
          body.customer_participant_address,
          notesObj.promoCustomerAddress,
          notesObj.promo_customer_address,
          notesObj.customerAddress,
          notesObj.customer_address,
          notesObj.customerParticipantAddress,
          notesObj.customer_participant_address,
          null
        )
      )
      : null,

    sex: isPromo
      ? toNullIfEmpty(
        pickFirst(
          body.promoSex,
          body.promo_sex,
          body.sex,
          body.customerSex,
          body.customer_sex,
          notesObj.promoSex,
          notesObj.promo_sex,
          notesObj.sex,
          notesObj.customerSex,
          notesObj.customer_sex,
          "N/A"
        )
      )
      : null,

    staff_name: isPromo
      ? toNullIfEmpty(
        pickFirst(
          body.promoStaffName,
          body.promo_staff_name,
          body.staffName,
          body.staff_name,
          notesObj.promoStaffName,
          notesObj.promo_staff_name,
          notesObj.staffName,
          notesObj.staff_name,
          null
        )
      )
      : null,

    means_of_verification: isPromo
      ? toNullIfEmpty(
        pickFirst(
          body.promoMeansVerification,
          body.promo_means_of_verification,
          body.meansOfVerification,
          body.means_of_verification,
          notesObj.promoMeansVerification,
          notesObj.promo_means_of_verification,
          notesObj.meansOfVerification,
          notesObj.means_of_verification,
          null
        )
      )
      : null,

    venue_address_meta: isPromo && venueMeta ? JSON.stringify(venueMeta) : null,
    photos: isPromo ? JSON.stringify(photos) : null,
  };
};

const mapCestTechPromoResponse = (row = {}) => ({
  project: row.intervention_project_name ?? row.project_name ?? "",
  activityDate: formatDateOnly(
    row.intervention_activity_date ?? row.intervention_date ?? row.date
  ),
  technologyPromoted:
    row.intervention_technology_promoted ?? row.technology_promoted ?? "",
  technologyGenerator:
    row.intervention_technology_generator ?? row.technology_generator ?? "",
  modeOfPromotion:
    row.intervention_mode_of_promotion ?? row.mode_of_promotion ?? "",
  activityTitle: row.intervention_activity_title ?? row.intervention_title ?? row.title ?? "",
  activityVenueAddress:
    row.intervention_activity_venue_address ?? row.intervention_venue ?? row.venue ?? "",
  activityVenueMeta: parseJsonSafe(
    row.intervention_activity_venue_meta ?? row.intervention_venue_address_meta ?? row.venue_address_meta
  ),
  customerName: row.intervention_customer_name ?? row.customer_name ?? "",
  customerAddress:
    row.intervention_customer_address ?? row.customer_address ?? "",
  sex: row.intervention_promo_sex ?? row.sex ?? "N/A",
  meansOfVerification:
    row.intervention_means_of_verification ?? row.means_of_verification ?? "",
  staffName: row.intervention_staff_name ?? row.staff_name ?? "",
  photos: parseJsonSafe(row.intervention_photos ?? row.photos) || [],
});

// ===========================
// CEST TECH ROLL OUT HELPERS
// ===========================
const parseCestTechRolloutAddressMeta = (raw) => {
  const parsed = parseJsonSafe(raw);
  if (!parsed || typeof parsed !== "object") {
    return {
      mode: null,
      manualText: "",
      displayText: "",
      province: "",
      municipality: "",
      barangay: "",
      lat: null,
      lng: null,
    };
  }

  return {
    mode: parsed.mode || null,
    manualText: parsed.manualText || "",
    displayText: parsed.displayText || "",
    province: parsed.province || "",
    municipality: parsed.municipality || "",
    barangay: parsed.barangay || "",
    lat:
      parsed.lat !== null && parsed.lat !== undefined
        ? Number(parsed.lat)
        : null,
    lng:
      parsed.lng !== null && parsed.lng !== undefined
        ? Number(parsed.lng)
        : null,
  };
};

const mapCestTechRolloutPayload = (body = {}) => {
  const institutionAddressMeta =
    body.techrolloutInstitutionAddressMeta ||
    body.techrollout_institution_address_meta ||
    body.institutionAddressMeta ||
    body.institution_address_meta ||
    null;

  return {
    techrollout_quarter: toNullIfEmpty(
      pickFirst(body.techrolloutQuarter, body.techrollout_quarter, body.quarter, null)
    ),
    techrollout_unit_center: toNullIfEmpty(
      pickFirst(body.techrolloutUnitCenter, body.techrollout_unit_center, body.unitCenter, "DOST-PANGASINAN")
    ),
    techrollout_name_of_technology_transferred: toNullIfEmpty(
      pickFirst(
        body.techrolloutNameOfTechnologyTransferred,
        body.techrollout_name_of_technology_transferred,
        body.nameOfTechnologyTransferred,
        body.name_of_technology_transferred,
        null
      )
    ),
    techrollout_technology_generator: toNullIfEmpty(
      pickFirst(
        body.techrolloutTechnologyGenerator,
        body.techrollout_technology_generator,
        body.technologyGenerator,
        body.technology_generator,
        null
      )
    ),
    techrollout_mode_of_transfer: toNullIfEmpty(
      pickFirst(
        body.techrolloutModeOfTransfer,
        body.techrollout_mode_of_transfer,
        body.modeOfTransfer,
        body.mode_of_transfer,
        null
      )
    ),
    techrollout_is_dost_developed_funded:
      pickFirst(
        body.techrolloutIsDostDevelopedFunded,
        body.techrollout_is_dost_developed_funded,
        body.isDostDevelopedFunded,
        body.is_dost_developed_funded,
        false
      )
        ? 1
        : 0,
    techrollout_date_transferred: toNullIfEmpty(
      pickFirst(
        body.techrolloutDateTransferred,
        body.techrollout_date_transferred,
        body.dateTransferred,
        body.date_transferred,
        null
      )
    ),
    techrollout_activity_title: toNullIfEmpty(
      pickFirst(
        body.techrolloutActivityTitle,
        body.techrollout_activity_title,
        body.activityTitle,
        body.activity_title,
        null
      )
    ),
    techrollout_activity_date: toNullIfEmpty(
      pickFirst(
        body.techrolloutActivityDate,
        body.techrollout_activity_date,
        body.activityDate,
        body.activity_date,
        null
      )
    ),
    techrollout_activity_venue: toNullIfEmpty(
      pickFirst(
        body.techrolloutActivityVenue,
        body.techrollout_activity_venue,
        body.activityVenue,
        body.activity_venue,
        null
      )
    ),
    techrollout_institution_name: toNullIfEmpty(
      pickFirst(
        body.techrolloutInstitutionName,
        body.techrollout_institution_name,
        body.institutionName,
        body.institution_name,
        null
      )
    ),
    techrollout_institution_address: toNullIfEmpty(
      pickFirst(
        body.techrolloutInstitutionAddress,
        body.techrollout_institution_address,
        body.institutionAddress,
        body.institution_address,
        null
      )
    ),
    techrollout_institution_address_meta: institutionAddressMeta
      ? JSON.stringify(institutionAddressMeta)
      : null,
    techrollout_classification: toNullIfEmpty(
      pickFirst(body.techrolloutClassification, body.techrollout_classification, body.classification, null)
    ),
    techrollout_representative_name: toNullIfEmpty(
      pickFirst(
        body.techrolloutRepresentativeName,
        body.techrollout_representative_name,
        body.representativeName,
        body.representative_name,
        null
      )
    ),
    techrollout_representative_designation: toNullIfEmpty(
      pickFirst(
        body.techrolloutRepresentativeDesignation,
        body.techrollout_representative_designation,
        body.representativeDesignation,
        body.representative_designation,
        null
      )
    ),
    techrollout_sex: toNullIfEmpty(
      pickFirst(body.techrolloutSex, body.techrollout_sex, body.sex, null)
    ),
  };
};

const mapCestPackagingPayload = (body = {}) => {
  const packaging = parsePackagingInterventionPayload(body || {});
  const photos = normalizePhotoList(packaging.photos);

  return {
    packaging_quarter: toNullIfEmpty(packaging.quarter),
    packaging_province: toNullIfEmpty(packaging.province) || "Pangasinan",
    packaging_date_completed: toNullIfEmpty(packaging.date_completed),
    packaging_type_of_intervention: toNullIfEmpty(packaging.type_of_intervention),
    packaging_product_name: toNullIfEmpty(packaging.product_name),
    packaging_size_variant: toNullIfEmpty(packaging.size_variant),
    packaging_materials_provided: toNullIfEmpty(packaging.packaging_materials_provided),
    packaging_customer_name: toNullIfEmpty(packaging.customer_name),
    packaging_sex: toNullIfEmpty(packaging.sex),
    packaging_firm_institution: toNullIfEmpty(packaging.firm_name),
    packaging_address: toNullIfEmpty(packaging.address),
    packaging_address_meta: packaging.addressMeta ? JSON.stringify(packaging.addressMeta) : null,
    packaging_means_of_verification: toNullIfEmpty(packaging.means_of_verification),
    packaging_photos: JSON.stringify(photos),
    packaging_remarks: toNullIfEmpty(packaging.remarks),
  };
};

const mapCestTechRolloutResponse = (row = {}) => ({
  techrolloutQuarter: row.intervention_techrollout_quarter ?? row.techrollout_quarter ?? "",
  techrolloutUnitCenter:
    row.intervention_techrollout_unit_center ?? row.techrollout_unit_center ?? "DOST-PANGASINAN",
  techrolloutNameOfTechnologyTransferred:
    row.intervention_techrollout_name_of_technology_transferred ??
    row.techrollout_name_of_technology_transferred ??
    "",
  techrolloutTechnologyGenerator:
    row.intervention_techrollout_technology_generator ?? row.techrollout_technology_generator ?? "",
  techrolloutModeOfTransfer:
    row.intervention_techrollout_mode_of_transfer ?? row.techrollout_mode_of_transfer ?? "",
  techrolloutIsDostDevelopedFunded: Boolean(
    row.intervention_techrollout_is_dost_developed_funded ??
    row.techrollout_is_dost_developed_funded ??
    0
  ),
  techrolloutDateTransferred: formatDateOnly(
    row.intervention_techrollout_date_transferred ?? row.techrollout_date_transferred
  ),
  techrolloutActivityTitle:
    row.intervention_techrollout_activity_title ?? row.techrollout_activity_title ?? "",
  techrolloutActivityDate: formatDateOnly(
    row.intervention_techrollout_activity_date ?? row.techrollout_activity_date
  ),
  techrolloutActivityVenue:
    row.intervention_techrollout_activity_venue ?? row.techrollout_activity_venue ?? "",
  techrolloutInstitutionName:
    row.intervention_techrollout_institution_name ?? row.techrollout_institution_name ?? "",
  techrolloutInstitutionAddress:
    row.intervention_techrollout_institution_address ?? row.techrollout_institution_address ?? "",
  techrolloutInstitutionAddressMeta: parseCestTechRolloutAddressMeta(
    row.intervention_techrollout_institution_address_meta ??
    row.techrollout_institution_address_meta
  ),
  techrolloutClassification:
    row.intervention_techrollout_classification ?? row.techrollout_classification ?? "",
  techrolloutRepresentativeName:
    row.intervention_techrollout_representative_name ?? row.techrollout_representative_name ?? "",
  techrolloutRepresentativeDesignation:
    row.intervention_techrollout_representative_designation ??
    row.techrollout_representative_designation ??
    "",
  techrolloutSex: row.intervention_techrollout_sex ?? row.techrollout_sex ?? "",
});

const mapCestPackagingPayloadForDb = (body = {}) => {
  const packaging = parsePackagingInterventionPayload(body || {});
  return {
    packaging_quarter: toNullIfEmpty(packaging.quarter),
    packaging_province: toNullIfEmpty(packaging.province),
    packaging_date_completed: toNullIfEmpty(packaging.date_completed),
    packaging_type_of_intervention: toNullIfEmpty(packaging.type_of_intervention),
    packaging_product_name: toNullIfEmpty(packaging.product_name),
    packaging_size_variant: toNullIfEmpty(packaging.size_variant),
    packaging_materials_provided: toNullIfEmpty(packaging.packaging_materials_provided),
    packaging_customer_name: toNullIfEmpty(packaging.customer_name),
    packaging_sex: toNullIfEmpty(packaging.sex),
    packaging_firm_institution: toNullIfEmpty(packaging.firm_name),
    packaging_address: toNullIfEmpty(packaging.address),
    packaging_address_meta: packaging.addressMeta ? JSON.stringify(packaging.addressMeta) : null,
    packaging_means_of_verification: toNullIfEmpty(packaging.means_of_verification),
    packaging_photos: Array.isArray(packaging.photos) ? JSON.stringify(packaging.photos) : null,
    packaging_remarks: toNullIfEmpty(packaging.remarks),
  };
};

const mapCestPackagingResponse = (row = {}) => ({
  packagingQuarter: row.intervention_packaging_quarter ?? row.packaging_quarter ?? "",
  packagingProvince: row.intervention_packaging_province ?? row.packaging_province ?? "",
  packagingDateCompleted: formatDateOnly(
    row.intervention_packaging_date_completed ?? row.packaging_date_completed
  ),
  packagingTypeOfIntervention:
    row.intervention_packaging_type_of_intervention ??
    row.packaging_type_of_intervention ??
    "",
  packagingProductName:
    row.intervention_packaging_product_name ?? row.packaging_product_name ?? "",
  packagingSizeVariant:
    row.intervention_packaging_size_variant ?? row.packaging_size_variant ?? "",
  packagingMaterialsProvided:
    row.intervention_packaging_materials_provided ??
    row.packaging_materials_provided ??
    "",
  packagingCustomerName:
    row.intervention_packaging_customer_name ?? row.packaging_customer_name ?? "",
  packagingSex: row.intervention_packaging_sex ?? row.packaging_sex ?? "",
  packagingFirmInstitution:
    row.intervention_packaging_firm_institution ??
    row.packaging_firm_institution ??
    "",
  packagingAddress:
    row.intervention_packaging_address ?? row.packaging_address ?? "",
  packagingAddressMeta: parseJsonSafe(
    row.intervention_packaging_address_meta ?? row.packaging_address_meta
  ),
  packagingMeansOfVerification:
    row.intervention_packaging_means_of_verification ??
    row.packaging_means_of_verification ??
    "",
  packagingPhotos:
    parseJsonSafe(
      row.intervention_packaging_photos ?? row.packaging_photos
    ) || [],
  packagingRemarks:
    row.intervention_packaging_remarks ?? row.packaging_remarks ?? "",
});


const syncCestTechnologyRolloutToTable = ({
  projectId,
  interventionId,
  type,
  title,
  techrollout,
}, callback) => {
  const removeLinkedTechRollout = () =>
    db.query(
      "DELETE FROM technology_rollout WHERE intervention_id = ? AND source_module = ?",
      [interventionId, "cest_interventions"],
      (deleteErr) => {
        if (deleteErr) return callback(deleteErr);
        callback(null);
      }
    );

  if (String(type || "").trim() !== "Tech Roll Out") {
    return removeLinkedTechRollout();
  }

  const meta = parseCestTechRolloutAddressMeta(
    techrollout?.techrollout_institution_address_meta
  );

  const normalized = {
    quarter: toNumOrNull(techrollout?.techrollout_quarter),
    unit_center:
      String(techrollout?.techrollout_unit_center || "DOST-PANGASINAN").trim() ||
      "DOST-PANGASINAN",
    name_of_technology_transferred: String(
      techrollout?.techrollout_name_of_technology_transferred || ""
    ).trim(),
    technology_generator: String(
      techrollout?.techrollout_technology_generator || ""
    ).trim(),
    mode_of_transfer: String(
      techrollout?.techrollout_mode_of_transfer || ""
    ).trim(),
    is_dost_developed_funded: techrollout?.techrollout_is_dost_developed_funded ? 1 : 0,
    date_transferred: toNullIfEmpty(techrollout?.techrollout_date_transferred),
    activity_title: String(techrollout?.techrollout_activity_title || title || "").trim(),
    activity_date: toNullIfEmpty(techrollout?.techrollout_activity_date),
    activity_venue: toNullIfEmpty(techrollout?.techrollout_activity_venue),
    institution_name: String(techrollout?.techrollout_institution_name || "").trim(),
    institution_address: String(techrollout?.techrollout_institution_address || "").trim(),
    address_mode: toNullIfEmpty(meta?.mode),
    address_manual_text: toNullIfEmpty(meta?.manualText),
    address_display_text: toNullIfEmpty(
      meta?.displayText || techrollout?.techrollout_institution_address || null
    ),
    address_province: toNullIfEmpty(meta?.province),
    address_municipality: toNullIfEmpty(meta?.municipality),
    address_barangay: toNullIfEmpty(meta?.barangay),
    address_lat: toNumOrNull(meta?.lat),
    address_lng: toNumOrNull(meta?.lng),
    classification: String(techrollout?.techrollout_classification || "").trim(),
    representative_name: String(techrollout?.techrollout_representative_name || "").trim(),
    representative_designation: toNullIfEmpty(
      techrollout?.techrollout_representative_designation
    ),
    sex: toNullIfEmpty(techrollout?.techrollout_sex),
    project_id: toNumOrNull(projectId),
    intervention_id: toNumOrNull(interventionId),
    source_module: "cest_interventions",
    source_label: toNullIfEmpty(title),
  };

  const hasRequiredFields = Boolean(
    normalized.quarter &&
    normalized.name_of_technology_transferred &&
    normalized.technology_generator &&
    normalized.mode_of_transfer &&
    normalized.date_transferred &&
    normalized.activity_title &&
    normalized.activity_date &&
    normalized.institution_name &&
    normalized.institution_address &&
    normalized.classification &&
    normalized.representative_name
  );

  if (!hasRequiredFields) {
    return removeLinkedTechRollout();
  }

  const params = [
    normalized.quarter,
    normalized.unit_center,
    normalized.name_of_technology_transferred,
    normalized.technology_generator,
    normalized.mode_of_transfer,
    normalized.is_dost_developed_funded,
    normalized.date_transferred,
    normalized.activity_title,
    normalized.activity_date,
    normalized.activity_venue,
    normalized.institution_name,
    normalized.institution_address,
    normalized.address_mode,
    normalized.address_manual_text,
    normalized.address_display_text,
    normalized.address_province,
    normalized.address_municipality,
    normalized.address_barangay,
    normalized.address_lat,
    normalized.address_lng,
    normalized.classification,
    normalized.representative_name,
    normalized.representative_designation,
    normalized.sex,
    normalized.project_id,
    normalized.intervention_id,
    normalized.source_module,
    normalized.source_label,
  ];

  db.query(
    "SELECT id FROM technology_rollout WHERE intervention_id = ? AND source_module = ? LIMIT 1",
    [interventionId, "cest_interventions"],
    (findErr, rows) => {
      if (findErr) return callback(findErr);

      const existingId = rows?.[0]?.id ? Number(rows[0].id) : null;
      const sql = existingId
        ? `
          UPDATE technology_rollout
          SET
            quarter = ?,
            unit_center = ?,
            name_of_technology_transferred = ?,
            technology_generator = ?,
            mode_of_transfer = ?,
            is_dost_developed_funded = ?,
            date_transferred = ?,
            activity_title = ?,
            activity_date = ?,
            activity_venue = ?,
            institution_name = ?,
            institution_address = ?,
            address_mode = ?,
            address_manual_text = ?,
            address_display_text = ?,
            address_province = ?,
            address_municipality = ?,
            address_barangay = ?,
            address_lat = ?,
            address_lng = ?,
            classification = ?,
            representative_name = ?,
            representative_designation = ?,
            sex = ?,
            project_id = ?,
            intervention_id = ?,
            source_module = ?,
            source_label = ?
          WHERE id = ?
        `
        : `
          INSERT INTO technology_rollout (
            quarter,
            unit_center,
            name_of_technology_transferred,
            technology_generator,
            mode_of_transfer,
            is_dost_developed_funded,
            date_transferred,
            activity_title,
            activity_date,
            activity_venue,
            institution_name,
            institution_address,
            address_mode,
            address_manual_text,
            address_display_text,
            address_province,
            address_municipality,
            address_barangay,
            address_lat,
            address_lng,
            classification,
            representative_name,
            representative_designation,
            sex,
            project_id,
            intervention_id,
            source_module,
            source_label
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

      db.query(sql, existingId ? [...params, existingId] : params, (saveErr) => {
        if (saveErr) return callback(saveErr);
        callback(null, existingId || interventionId);
      });
    }
  );
};


// ============================================================

// ===========================
// CEST ROUTES
// ===========================


const CEST_PANGASINAN_DISTRICTS = {
  "District 1": [
    "Agno",
    "Alaminos City",
    "Anda",
    "Bani",
    "Bolinao",
    "Burgos",
    "Dasol",
    "Infanta",
    "Mabini",
    "Sual",
  ],
  "District 2": [
    "Aguilar",
    "Basista",
    "Binmaley",
    "Bugallon",
    "Labrador",
    "Lingayen",
    "Mangatarem",
    "Urbiztondo",
  ],
  "District 3": [
    "Bayambang",
    "Calasiao",
    "Malasiqui",
    "Mapandan",
    "San Carlos City",
    "Santa Barbara",
  ],
  "District 4": [
    "Dagupan City",
    "Manaoag",
    "Mangaldan",
    "San Fabian",
    "San Jacinto",
  ],
  "District 5": [
    "Alcala",
    "Bautista",
    "Binalonan",
    "Laoac",
    "Pozorrubio",
    "Santo Tomas",
    "Sison",
    "Urdaneta City",
    "Villasis",
  ],
  "District 6": [
    "Asingan",
    "Balungao",
    "Natividad",
    "Rosales",
    "San Manuel",
    "San Nicolas",
    "San Quintin",
    "Santa Maria",
    "Tayug",
    "Umingan",
  ],
};

const normalizeCestDistrictKey = (value = "") => {
  const raw = String(value || "").trim();
  if (!raw || raw.toUpperCase() === "ALL") return "ALL";

  const collapsed = raw.replace(/\s+/g, "").toLowerCase();
  const match = collapsed.match(/^district(\d+)$/);

  if (match) {
    return `District ${match[1]}`;
  }

  return raw.replace(/\s+/g, " ");
};


const mapCestJoinedRowsToProjects = (rows = []) => {
  const projects = {};

  (rows || []).forEach((row) => {
    if (!projects[row.id]) {
      const typeVal = pickFirst(row.type, "New Communities");
      const titleVal = pickFirst(row.projectTitle, row.project_title, "");
      const dateApprovedVal = formatDateOnly(
        pickFirst(
          row.dateProjectApproval,
          row.date_project_approval,
          row.date_approved
        )
      );
      const amountVal = Number(
        pickFirst(
          row.approvedProjectCost,
          row.approved_project_cost,
          row.amount,
          0
        )
      );
      const assocVal = pickFirst(
        row.associationName,
        row.association_name,
        row.firm_name,
        row.firmName,
        ""
      );

      projects[row.id] = {
        id: row.id,
        quarter: String(pickFirst(row.quarter, "1")),
        type: typeVal,
        projectTitle: titleVal,
        project_title: titleVal,

        dateProjectApproval: dateApprovedVal,
        date_approved: dateApprovedVal,

        approvedProjectCost: amountVal,
        amount: amountVal,

        dateFundRelease: formatDateOnly(
          pickFirst(row.dateFundRelease, row.date_fund_release)
        ),

        associationName: assocVal,
        firmName: assocVal,
        firm_name: assocVal,

        address: pickFirst(row.address, ""),
        addressMeta: {
          mode: pickFirst(row.address_mode, ""),
          manualText: pickFirst(row.address_manual_text, ""),
          province: pickFirst(row.address_province, ""),
          municipality: pickFirst(row.address_municipality, ""),
          barangay: pickFirst(row.address_barangay, ""),
          lat:
            pickFirst(row.address_lat, null) !== null
              ? Number(row.address_lat)
              : null,
          lng:
            pickFirst(row.address_lng, null) !== null
              ? Number(row.address_lng)
              : null,
        },

        projectProponent: pickFirst(
          row.projectProponent,
          row.project_proponent,
          ""
        ),
        sex: pickFirst(row.sex, ""),
        processSystem: pickFirst(row.processSystem, row.process_system, ""),
        pressRelease: Number(
          pickFirst(row.pressRelease, row.press_release, 0)
        ),

        communitiesAssisted: Number(
          pickFirst(row.communitiesAssisted, row.communities_assisted, 0)
        ),
        technologiesDeployed: Number(
          pickFirst(row.technologiesDeployed, row.technologies_deployed, 0)
        ),
        beneficiaries: Number(pickFirst(row.beneficiaries, 0)),
        lguNumbersOfCommunities: pickFirst(
          row.lguNumbersOfCommunities,
          row.lgu_numbers_of_communities,
          ""
        ),
        numberOfMoa: Number(
          pickFirst(row.numberOfMoa, row.number_of_moa, 0)
        ),
        startupsAssisted: String(
          pickFirst(row.startupsAssisted, row.startups_assisted, "")
        ),
        jobsGenerated: Number(
          pickFirst(row.jobsGenerated, row.jobs_generated, 0)
        ),
        created_at: row.created_at,
        custom_fields: parseJsonSafe(row.custom_fields) || {},
        customFields: parseJsonSafe(row.custom_fields) || {},
        interventions: [],
      };
    }

    if (row.intervention_id) {
      projects[row.id].interventions.push({
        id: row.intervention_id,
        project_id: row.intervention_project_id,
        type: row.intervention_type ?? "",
        title: row.intervention_title ?? "",
        date: formatDateOnly(row.intervention_date),
        venue: row.intervention_venue || "",
        noOfFirms: row.intervention_no_of_firms ?? "",
        male: row.intervention_male ?? "",
        female: row.intervention_female ?? "",
        total: row.intervention_total ?? "",
        notes: row.intervention_notes || "",

        ...mapCestTechPromoResponse({
          intervention_project_name: row.intervention_project_name,
          intervention_activity_date: row.intervention_date,
          intervention_technology_promoted: row.intervention_technology_promoted,
          intervention_technology_generator: row.intervention_technology_generator,
          intervention_mode_of_promotion: row.intervention_mode_of_promotion,
          intervention_activity_title: row.intervention_title,
          intervention_activity_venue_address: row.intervention_venue,
          intervention_activity_venue_meta: row.intervention_venue_address_meta,
          intervention_customer_name: row.intervention_customer_name,
          intervention_customer_address: row.intervention_customer_address,
          intervention_promo_sex: row.intervention_promo_sex,
          intervention_means_of_verification: row.intervention_means_of_verification,
          intervention_staff_name: row.intervention_staff_name,
          intervention_photos: row.intervention_photos,
        }),
        packagingQuarter: row.intervention_packaging_quarter ?? "",
        packagingProvince: row.intervention_packaging_province ?? "Pangasinan",
        packagingDateCompleted: formatDateOnly(row.intervention_packaging_date_completed),
        packagingTypeOfIntervention:
          row.intervention_packaging_type_of_intervention ?? "",
        packagingProductName: row.intervention_packaging_product_name ?? "",
        packagingSizeVariant: row.intervention_packaging_size_variant ?? "",
        packagingMaterialsProvided:
          row.intervention_packaging_materials_provided ?? "",
        packagingCustomerName: row.intervention_packaging_customer_name ?? "",
        packagingSex: row.intervention_packaging_sex ?? "",
        packagingFirmInstitution:
          row.intervention_packaging_firm_institution ?? "",
        packagingAddress: row.intervention_packaging_address ?? "",
        packagingAddressMeta: parseJsonSafe(
          row.intervention_packaging_address_meta
        ),
        packagingMeansVerification:
          row.intervention_packaging_means_of_verification ?? "",
        packagingPhotos: parseJsonSafe(row.intervention_packaging_photos) || [],
        packagingRemarks: row.intervention_packaging_remarks ?? "",
        technologiesPromotedTotal:
          row.intervention_technologies_promoted_total ?? 0,
        promotionalActivitiesPressRelease:
          row.intervention_promotional_activities_press_release ?? 0,

        tacsConsultancyType: row.intervention_tacs_consultancy_type ?? "",
        tacsDateEngagement: formatDateOnly(
          row.intervention_tacs_date_engagement
        ),
        tacsExpertInstitution: row.intervention_tacs_expert_institution ?? "",
        tacsCustomerName: row.intervention_tacs_customer_name ?? "",
        tacsCustomerSex: row.intervention_tacs_customer_sex ?? "",
        tacsCustomerAddress: row.intervention_tacs_customer_address ?? "",
        tacsCustomerAddressMeta: parseJsonSafe(
          row.intervention_tacs_customer_address_meta
        ),
        tacsMeansVerification:
          row.intervention_tacs_means_verification ?? "",
        tacsNoOfAdvice: row.intervention_tacs_no_of_advice ?? "",
        tacsRemarks: row.intervention_tacs_remarks ?? "",
        tacsPhotos: parseJsonSafe(row.intervention_tacs_photos) || [],

        programTraining: row.intervention_program_training ?? "",
        startDate: formatDateOnly(row.intervention_start_date),
        endDate: formatDateOnly(row.intervention_end_date),
        province: row.intervention_province ?? "",
        venueAddressMeta: parseJsonSafe(row.intervention_venue_address_meta),
        noOfFirmsSucsHeisLgus:
          row.intervention_no_of_firms_sucs_heis_lgus ?? 0,
        participantsFemale: row.intervention_participants_female ?? 0,
        participantsMale: row.intervention_participants_male ?? 0,
        seniorFemale: row.intervention_senior_female ?? 0,
        seniorMale: row.intervention_senior_male ?? 0,
        ipFemale: row.intervention_ip_female ?? 0,
        ipMale: row.intervention_ip_male ?? 0,
        fourPsFemale: row.intervention_fourps_female ?? 0,
        fourPsMale: row.intervention_fourps_male ?? 0,
        pwdFemale: row.intervention_pwd_female ?? 0,
        pwdMale: row.intervention_pwd_male ?? 0,
        totalFemale: row.intervention_total_female ?? 0,
        totalMale: row.intervention_total_male ?? 0,
        totalParticipants: row.intervention_total_participants ?? 0,
        listOfFirmsAssociations:
          row.intervention_list_of_firms_associations ?? "",
        nameOfTrainorAffiliation:
          row.intervention_name_of_trainor_affiliation ?? "",
        programProjectUnit: row.intervention_program_project_unit ?? "",
        dostCost: row.intervention_dost_cost ?? 0,
        partnerAgencyCost: row.intervention_partner_agency_cost ?? 0,
        totalCost: row.intervention_total_cost ?? 0,
        notesRemarks: row.intervention_notes_remarks ?? "",
        latitude:
          row.intervention_latitude !== null && row.intervention_latitude !== undefined
            ? Number(row.intervention_latitude)
            : null,
        longitude:
          row.intervention_longitude !== null && row.intervention_longitude !== undefined
            ? Number(row.intervention_longitude)
            : null,

        ...mapCestTechRolloutResponse(row),
        ...mapCestPackagingResponse(row),

        created_at: row.intervention_created_at,
      });
    }
  });

  return Object.values(projects);
};

const buildCestSearchWhere = (query = {}) => {
  const where = [];
  const params = [];

  const search = String(query.search || "").trim();
  const year = String(query.year || "ALL").trim();
  const district = normalizeCestDistrictKey(query.district || "ALL");
  const month = String(query.month || "ALL").trim();
  const municipality = String(query.municipality || "ALL").trim();
  const status = String(query.status || "ALL").trim();
  const quarter = String(query.quarter || "ALL").trim();

  if (search) {
    where.push(`(
      p.projectTitle LIKE ?
      OR p.associationName LIKE ?
      OR p.projectProponent LIKE ?
      OR p.address LIKE ?
      OR p.processSystem LIKE ?
      OR p.startupsAssisted LIKE ?
    )`);
    const like = `%${search}%`;
    params.push(like, like, like, like, like, like);
  }

  if (year !== "ALL" && year !== "") {
    where.push("YEAR(COALESCE(p.dateProjectApproval, p.created_at)) = ?");
    params.push(Number(year));
  }

  if (month !== "ALL" && month !== "") {
    where.push("MONTH(COALESCE(p.dateProjectApproval, p.created_at)) = ?");
    params.push(Number(month));
  }

  if (district !== "ALL" && district !== "") {
    const districtKey = normalizeCestDistrictKey(district);
    const municipalitiesForDistrict = CEST_PANGASINAN_DISTRICTS[districtKey] || [];
    if (!municipalitiesForDistrict.length) {
      where.push("1 = 0");
    } else {
      where.push(
        `p.address_municipality IN (${municipalitiesForDistrict
          .map(() => "?")
          .join(",")})`
      );
      params.push(...municipalitiesForDistrict);
    }
  }

  if (municipality !== "ALL" && municipality !== "") {
    where.push("p.address_municipality = ?");
    params.push(municipality);
  }

  if (status !== "ALL" && status !== "") {
    where.push("p.type = ?");
    params.push(status);
  }

  if (quarter !== "ALL" && quarter !== "") {
    where.push("p.quarter = ?");
    params.push(String(quarter));
  }

  return {
    whereSql: where.length ? `WHERE ${where.join(" AND ")}` : "",
    params,
  };
};

// GET all cest with interventions
app.get("/cest", (req, res) => {
  const hasServerPaging =
    req.query.page !== undefined ||
    req.query.limit !== undefined ||
    req.query.search !== undefined ||
    req.query.year !== undefined ||
    req.query.district !== undefined ||
    req.query.month !== undefined ||
    req.query.municipality !== undefined ||
    req.query.status !== undefined ||
    req.query.quarter !== undefined;

  if (!hasServerPaging) {
    const sql = `
      SELECT
        p.*,

        i.id AS intervention_id,
        i.project_id AS intervention_project_id,
        i.type AS intervention_type,
        i.title AS intervention_title,
        i.date AS intervention_date,
        i.venue AS intervention_venue,
        i.no_of_firms AS intervention_no_of_firms,
        i.male AS intervention_male,
        i.female AS intervention_female,
        i.total AS intervention_total,
        i.notes AS intervention_notes,
        i.project_name AS intervention_project_name,
        i.technology_promoted AS intervention_technology_promoted,
        i.technology_generator AS intervention_technology_generator,
        i.mode_of_promotion AS intervention_mode_of_promotion,
        i.customer_name AS intervention_customer_name,
        i.customer_address AS intervention_customer_address,
        i.sex AS intervention_promo_sex,
        i.staff_name AS intervention_staff_name,
        i.means_of_verification AS intervention_means_of_verification,
        i.photos AS intervention_photos,
        i.packaging_quarter AS intervention_packaging_quarter,
        i.packaging_province AS intervention_packaging_province,
        i.packaging_date_completed AS intervention_packaging_date_completed,
        i.packaging_type_of_intervention AS intervention_packaging_type_of_intervention,
        i.packaging_product_name AS intervention_packaging_product_name,
        i.packaging_size_variant AS intervention_packaging_size_variant,
        i.packaging_materials_provided AS intervention_packaging_materials_provided,
        i.packaging_customer_name AS intervention_packaging_customer_name,
        i.packaging_sex AS intervention_packaging_sex,
        i.packaging_firm_institution AS intervention_packaging_firm_institution,
        i.packaging_address AS intervention_packaging_address,
        i.packaging_address_meta AS intervention_packaging_address_meta,
        i.packaging_means_of_verification AS intervention_packaging_means_of_verification,
        i.packaging_photos AS intervention_packaging_photos,
        i.packaging_remarks AS intervention_packaging_remarks,
        i.technologies_promoted_total AS intervention_technologies_promoted_total,
        i.promotional_activities_press_release AS intervention_promotional_activities_press_release,

        i.tacs_consultancy_type AS intervention_tacs_consultancy_type,
        i.tacs_date_engagement AS intervention_tacs_date_engagement,
        i.tacs_expert_institution AS intervention_tacs_expert_institution,
        i.tacs_customer_name AS intervention_tacs_customer_name,
        i.tacs_customer_sex AS intervention_tacs_customer_sex,
        i.tacs_customer_address AS intervention_tacs_customer_address,
        i.tacs_customer_address_meta AS intervention_tacs_customer_address_meta,
        i.tacs_means_verification AS intervention_tacs_means_verification,
        i.tacs_no_of_advice AS intervention_tacs_no_of_advice,
        i.tacs_remarks AS intervention_tacs_remarks,
        i.tacs_photos AS intervention_tacs_photos,
        i.tacs_photos AS intervention_tacs_photos,

        i.program_training AS intervention_program_training,
        i.start_date AS intervention_start_date,
        i.end_date AS intervention_end_date,
        i.province AS intervention_province,
        i.venue_address_meta AS intervention_venue_address_meta,
        i.no_of_firms_sucs_heis_lgus AS intervention_no_of_firms_sucs_heis_lgus,
        i.participants_female AS intervention_participants_female,
        i.participants_male AS intervention_participants_male,
        i.senior_female AS intervention_senior_female,
        i.senior_male AS intervention_senior_male,
        i.ip_female AS intervention_ip_female,
        i.ip_male AS intervention_ip_male,
        i.fourps_female AS intervention_fourps_female,
        i.fourps_male AS intervention_fourps_male,
        i.pwd_female AS intervention_pwd_female,
        i.pwd_male AS intervention_pwd_male,
        i.total_female AS intervention_total_female,
        i.total_male AS intervention_total_male,
        i.total_participants AS intervention_total_participants,
        i.list_of_firms_associations AS intervention_list_of_firms_associations,
        i.name_of_trainor_affiliation AS intervention_name_of_trainor_affiliation,
        i.program_project_unit AS intervention_program_project_unit,
        i.dost_cost AS intervention_dost_cost,
        i.partner_agency_cost AS intervention_partner_agency_cost,
        i.total_cost AS intervention_total_cost,
        i.notes_remarks AS intervention_notes_remarks,
        i.latitude AS intervention_latitude,
        i.longitude AS intervention_longitude,

        i.techrollout_quarter AS intervention_techrollout_quarter,
        i.techrollout_unit_center AS intervention_techrollout_unit_center,
        i.techrollout_name_of_technology_transferred AS intervention_techrollout_name_of_technology_transferred,
        i.techrollout_technology_generator AS intervention_techrollout_technology_generator,
        i.techrollout_mode_of_transfer AS intervention_techrollout_mode_of_transfer,
        i.techrollout_is_dost_developed_funded AS intervention_techrollout_is_dost_developed_funded,
        i.techrollout_date_transferred AS intervention_techrollout_date_transferred,
        i.techrollout_activity_title AS intervention_techrollout_activity_title,
        i.techrollout_activity_date AS intervention_techrollout_activity_date,
        i.techrollout_activity_venue AS intervention_techrollout_activity_venue,
        i.techrollout_institution_name AS intervention_techrollout_institution_name,
        i.techrollout_institution_address AS intervention_techrollout_institution_address,
        i.techrollout_institution_address_meta AS intervention_techrollout_institution_address_meta,
        i.techrollout_classification AS intervention_techrollout_classification,
        i.techrollout_representative_name AS intervention_techrollout_representative_name,
        i.techrollout_representative_designation AS intervention_techrollout_representative_designation,
        i.techrollout_sex AS intervention_techrollout_sex,

        i.packaging_quarter AS intervention_packaging_quarter,
        i.packaging_province AS intervention_packaging_province,
        i.packaging_date_completed AS intervention_packaging_date_completed,
        i.packaging_type_of_intervention AS intervention_packaging_type_of_intervention,
        i.packaging_product_name AS intervention_packaging_product_name,
        i.packaging_size_variant AS intervention_packaging_size_variant,
        i.packaging_materials_provided AS intervention_packaging_materials_provided,
        i.packaging_customer_name AS intervention_packaging_customer_name,
        i.packaging_sex AS intervention_packaging_sex,
        i.packaging_firm_institution AS intervention_packaging_firm_institution,
        i.packaging_address AS intervention_packaging_address,
        i.packaging_address_meta AS intervention_packaging_address_meta,
        i.packaging_means_of_verification AS intervention_packaging_means_of_verification,
        i.packaging_photos AS intervention_packaging_photos,
        i.packaging_remarks AS intervention_packaging_remarks,

        i.created_at AS intervention_created_at
      FROM cest p
      LEFT JOIN cest_interventions i
        ON p.id = i.project_id
      ORDER BY p.created_at DESC, p.id DESC, i.id DESC
    `;

    db.query(sql, (err, rows) => {
      if (err) {
        console.error("GET /cest ERROR:", err);
        return res.status(500).json(err);
      }

      res.json(mapCestJoinedRowsToProjects(rows));
    });

    return;
  }

  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.max(1, Math.min(100, Number(req.query.limit || 10)));
  const offset = (page - 1) * limit;

  const { whereSql, params } = buildCestSearchWhere(req.query);

  const countSql = `
    SELECT COUNT(*) AS total
    FROM cest p
    ${whereSql}
  `;

  db.query(countSql, params, (countErr, countRows) => {
    if (countErr) {
      console.error("GET /cest count ERROR:", countErr);
      return res.status(500).json({ message: countErr.message });
    }

    const total = Number(countRows?.[0]?.total || 0);
    const totalPages = Math.max(1, Math.ceil(total / limit));

    if (total === 0) {
      return res.json({
        data: [],
        total: 0,
        totalPages,
        page,
        limit,
      });
    }

    const idsSql = `
      SELECT p.id
      FROM cest p
      ${whereSql}
      ORDER BY p.created_at DESC, p.id DESC
      LIMIT ? OFFSET ?
    `;

    db.query(idsSql, [...params, limit, offset], (idsErr, idRows) => {
      if (idsErr) {
        console.error("GET /cest ids ERROR:", idsErr);
        return res.status(500).json({ message: idsErr.message });
      }

      const ids = (idRows || []).map((row) => Number(row.id)).filter(Boolean);

      if (!ids.length) {
        return res.json({
          data: [],
          total,
          totalPages,
          page,
          limit,
        });
      }

      const placeholders = ids.map(() => "?").join(",");

      const dataSql = `
        SELECT
          p.*,

          i.id AS intervention_id,
          i.project_id AS intervention_project_id,
          i.type AS intervention_type,
          i.title AS intervention_title,
          i.date AS intervention_date,
          i.venue AS intervention_venue,
          i.no_of_firms AS intervention_no_of_firms,
          i.male AS intervention_male,
          i.female AS intervention_female,
          i.total AS intervention_total,
          i.notes AS intervention_notes,
          i.project_name AS intervention_project_name,
          i.technology_promoted AS intervention_technology_promoted,
          i.technology_generator AS intervention_technology_generator,
          i.mode_of_promotion AS intervention_mode_of_promotion,
          i.customer_name AS intervention_customer_name,
          i.customer_address AS intervention_customer_address,
          i.sex AS intervention_promo_sex,
          i.staff_name AS intervention_staff_name,
          i.means_of_verification AS intervention_means_of_verification,
          i.photos AS intervention_photos,
          i.packaging_quarter AS intervention_packaging_quarter,
          i.packaging_province AS intervention_packaging_province,
          i.packaging_date_completed AS intervention_packaging_date_completed,
          i.packaging_type_of_intervention AS intervention_packaging_type_of_intervention,
          i.packaging_product_name AS intervention_packaging_product_name,
          i.packaging_size_variant AS intervention_packaging_size_variant,
          i.packaging_materials_provided AS intervention_packaging_materials_provided,
          i.packaging_customer_name AS intervention_packaging_customer_name,
          i.packaging_sex AS intervention_packaging_sex,
          i.packaging_firm_institution AS intervention_packaging_firm_institution,
          i.packaging_address AS intervention_packaging_address,
          i.packaging_address_meta AS intervention_packaging_address_meta,
          i.packaging_means_of_verification AS intervention_packaging_means_of_verification,
          i.packaging_photos AS intervention_packaging_photos,
          i.packaging_remarks AS intervention_packaging_remarks,
          i.technologies_promoted_total AS intervention_technologies_promoted_total,
          i.promotional_activities_press_release AS intervention_promotional_activities_press_release,

          i.tacs_consultancy_type AS intervention_tacs_consultancy_type,
          i.tacs_date_engagement AS intervention_tacs_date_engagement,
          i.tacs_expert_institution AS intervention_tacs_expert_institution,
          i.tacs_customer_name AS intervention_tacs_customer_name,
          i.tacs_customer_sex AS intervention_tacs_customer_sex,
          i.tacs_customer_address AS intervention_tacs_customer_address,
          i.tacs_customer_address_meta AS intervention_tacs_customer_address_meta,
          i.tacs_means_verification AS intervention_tacs_means_verification,
          i.tacs_no_of_advice AS intervention_tacs_no_of_advice,
          i.tacs_remarks AS intervention_tacs_remarks,
          i.tacs_photos AS intervention_tacs_photos,
          i.tacs_photos AS intervention_tacs_photos,

          i.program_training AS intervention_program_training,
          i.start_date AS intervention_start_date,
          i.end_date AS intervention_end_date,
          i.province AS intervention_province,
          i.venue_address_meta AS intervention_venue_address_meta,
          i.no_of_firms_sucs_heis_lgus AS intervention_no_of_firms_sucs_heis_lgus,
          i.participants_female AS intervention_participants_female,
          i.participants_male AS intervention_participants_male,
          i.senior_female AS intervention_senior_female,
          i.senior_male AS intervention_senior_male,
          i.ip_female AS intervention_ip_female,
          i.ip_male AS intervention_ip_male,
          i.fourps_female AS intervention_fourps_female,
          i.fourps_male AS intervention_fourps_male,
          i.pwd_female AS intervention_pwd_female,
          i.pwd_male AS intervention_pwd_male,
          i.total_female AS intervention_total_female,
          i.total_male AS intervention_total_male,
          i.total_participants AS intervention_total_participants,
          i.list_of_firms_associations AS intervention_list_of_firms_associations,
          i.name_of_trainor_affiliation AS intervention_name_of_trainor_affiliation,
          i.program_project_unit AS intervention_program_project_unit,
          i.dost_cost AS intervention_dost_cost,
          i.partner_agency_cost AS intervention_partner_agency_cost,
          i.total_cost AS intervention_total_cost,
          i.notes_remarks AS intervention_notes_remarks,
          i.latitude AS intervention_latitude,
          i.longitude AS intervention_longitude,

          i.techrollout_quarter AS intervention_techrollout_quarter,
          i.techrollout_unit_center AS intervention_techrollout_unit_center,
          i.techrollout_name_of_technology_transferred AS intervention_techrollout_name_of_technology_transferred,
          i.techrollout_technology_generator AS intervention_techrollout_technology_generator,
          i.techrollout_mode_of_transfer AS intervention_techrollout_mode_of_transfer,
          i.techrollout_is_dost_developed_funded AS intervention_techrollout_is_dost_developed_funded,
          i.techrollout_date_transferred AS intervention_techrollout_date_transferred,
          i.techrollout_activity_title AS intervention_techrollout_activity_title,
          i.techrollout_activity_date AS intervention_techrollout_activity_date,
          i.techrollout_activity_venue AS intervention_techrollout_activity_venue,
          i.techrollout_institution_name AS intervention_techrollout_institution_name,
          i.techrollout_institution_address AS intervention_techrollout_institution_address,
          i.techrollout_institution_address_meta AS intervention_techrollout_institution_address_meta,
          i.techrollout_classification AS intervention_techrollout_classification,
          i.techrollout_representative_name AS intervention_techrollout_representative_name,
          i.techrollout_representative_designation AS intervention_techrollout_representative_designation,
          i.techrollout_sex AS intervention_techrollout_sex,

          i.packaging_quarter AS intervention_packaging_quarter,
          i.packaging_province AS intervention_packaging_province,
          i.packaging_date_completed AS intervention_packaging_date_completed,
          i.packaging_type_of_intervention AS intervention_packaging_type_of_intervention,
          i.packaging_product_name AS intervention_packaging_product_name,
          i.packaging_size_variant AS intervention_packaging_size_variant,
          i.packaging_materials_provided AS intervention_packaging_materials_provided,
          i.packaging_customer_name AS intervention_packaging_customer_name,
          i.packaging_sex AS intervention_packaging_sex,
          i.packaging_firm_institution AS intervention_packaging_firm_institution,
          i.packaging_address AS intervention_packaging_address,
          i.packaging_address_meta AS intervention_packaging_address_meta,
          i.packaging_means_of_verification AS intervention_packaging_means_of_verification,
          i.packaging_photos AS intervention_packaging_photos,
          i.packaging_remarks AS intervention_packaging_remarks,

          i.created_at AS intervention_created_at
        FROM cest p
        LEFT JOIN cest_interventions i
          ON p.id = i.project_id
        WHERE p.id IN (${placeholders})
        ORDER BY p.created_at DESC, p.id DESC, i.id DESC
      `;

      db.query(dataSql, ids, (dataErr, rows) => {
        if (dataErr) {
          console.error("GET /cest data ERROR:", dataErr);
          return res.status(500).json({ message: dataErr.message });
        }

        return res.json({
          data: mapCestJoinedRowsToProjects(rows),
          total,
          totalPages,
          page,
          limit,
        });
      });
    });
  });
});

// GET single cest project
app.get("/cest/:id", (req, res) => {

  const projectId = req.params.id;

  const sql = `
    SELECT
      p.*,

      i.id AS intervention_id,
      i.project_id AS intervention_project_id,
      i.type AS intervention_type,
      i.title AS intervention_title,
      i.date AS intervention_date,
      i.venue AS intervention_venue,
      i.no_of_firms AS intervention_no_of_firms,
      i.male AS intervention_male,
      i.female AS intervention_female,
      i.total AS intervention_total,
      i.notes AS intervention_notes,
      i.project_name AS intervention_project_name,
      i.technology_promoted AS intervention_technology_promoted,
      i.technology_generator AS intervention_technology_generator,
      i.mode_of_promotion AS intervention_mode_of_promotion,
      i.customer_name AS intervention_customer_name,
      i.customer_address AS intervention_customer_address,
      i.sex AS intervention_promo_sex,
      i.staff_name AS intervention_staff_name,
      i.means_of_verification AS intervention_means_of_verification,
      i.photos AS intervention_photos,
      i.packaging_quarter AS intervention_packaging_quarter,
      i.packaging_province AS intervention_packaging_province,
      i.packaging_date_completed AS intervention_packaging_date_completed,
      i.packaging_type_of_intervention AS intervention_packaging_type_of_intervention,
      i.packaging_product_name AS intervention_packaging_product_name,
      i.packaging_size_variant AS intervention_packaging_size_variant,
      i.packaging_materials_provided AS intervention_packaging_materials_provided,
      i.packaging_customer_name AS intervention_packaging_customer_name,
      i.packaging_sex AS intervention_packaging_sex,
      i.packaging_firm_institution AS intervention_packaging_firm_institution,
      i.packaging_address AS intervention_packaging_address,
      i.packaging_address_meta AS intervention_packaging_address_meta,
      i.packaging_means_of_verification AS intervention_packaging_means_of_verification,
      i.packaging_photos AS intervention_packaging_photos,
      i.packaging_remarks AS intervention_packaging_remarks,
      i.technologies_promoted_total AS intervention_technologies_promoted_total,
      i.promotional_activities_press_release AS intervention_promotional_activities_press_release,

      i.tacs_consultancy_type AS intervention_tacs_consultancy_type,
      i.tacs_date_engagement AS intervention_tacs_date_engagement,
      i.tacs_expert_institution AS intervention_tacs_expert_institution,
      i.tacs_customer_name AS intervention_tacs_customer_name,
      i.tacs_customer_sex AS intervention_tacs_customer_sex,
      i.tacs_customer_address AS intervention_tacs_customer_address,
      i.tacs_customer_address_meta AS intervention_tacs_customer_address_meta,
      i.tacs_means_verification AS intervention_tacs_means_verification,
      i.tacs_no_of_advice AS intervention_tacs_no_of_advice,
      i.tacs_remarks AS intervention_tacs_remarks,
      i.tacs_photos AS intervention_tacs_photos,
      i.tacs_photos AS intervention_tacs_photos,

      i.program_training AS intervention_program_training,
      i.start_date AS intervention_start_date,
      i.end_date AS intervention_end_date,
      i.province AS intervention_province,
      i.venue_address_meta AS intervention_venue_address_meta,
      i.no_of_firms_sucs_heis_lgus AS intervention_no_of_firms_sucs_heis_lgus,
      i.participants_female AS intervention_participants_female,
      i.participants_male AS intervention_participants_male,
      i.senior_female AS intervention_senior_female,
      i.senior_male AS intervention_senior_male,
      i.ip_female AS intervention_ip_female,
      i.ip_male AS intervention_ip_male,
      i.fourps_female AS intervention_fourps_female,
      i.fourps_male AS intervention_fourps_male,
      i.pwd_female AS intervention_pwd_female,
      i.pwd_male AS intervention_pwd_male,
      i.total_female AS intervention_total_female,
      i.total_male AS intervention_total_male,
      i.total_participants AS intervention_total_participants,
      i.list_of_firms_associations AS intervention_list_of_firms_associations,
      i.name_of_trainor_affiliation AS intervention_name_of_trainor_affiliation,
      i.program_project_unit AS intervention_program_project_unit,
      i.dost_cost AS intervention_dost_cost,
      i.partner_agency_cost AS intervention_partner_agency_cost,
      i.total_cost AS intervention_total_cost,
      i.notes_remarks AS intervention_notes_remarks,
      i.latitude AS intervention_latitude,
      i.longitude AS intervention_longitude,

      i.techrollout_quarter AS intervention_techrollout_quarter,
      i.techrollout_unit_center AS intervention_techrollout_unit_center,
      i.techrollout_name_of_technology_transferred AS intervention_techrollout_name_of_technology_transferred,
      i.techrollout_technology_generator AS intervention_techrollout_technology_generator,
      i.techrollout_mode_of_transfer AS intervention_techrollout_mode_of_transfer,
      i.techrollout_is_dost_developed_funded AS intervention_techrollout_is_dost_developed_funded,
      i.techrollout_date_transferred AS intervention_techrollout_date_transferred,
      i.techrollout_activity_title AS intervention_techrollout_activity_title,
      i.techrollout_activity_date AS intervention_techrollout_activity_date,
      i.techrollout_activity_venue AS intervention_techrollout_activity_venue,
      i.techrollout_institution_name AS intervention_techrollout_institution_name,
      i.techrollout_institution_address AS intervention_techrollout_institution_address,
      i.techrollout_institution_address_meta AS intervention_techrollout_institution_address_meta,
      i.techrollout_classification AS intervention_techrollout_classification,
      i.techrollout_representative_name AS intervention_techrollout_representative_name,
      i.techrollout_representative_designation AS intervention_techrollout_representative_designation,
      i.techrollout_sex AS intervention_techrollout_sex,

      i.packaging_quarter AS intervention_packaging_quarter,
      i.packaging_province AS intervention_packaging_province,
      i.packaging_date_completed AS intervention_packaging_date_completed,
      i.packaging_type_of_intervention AS intervention_packaging_type_of_intervention,
      i.packaging_product_name AS intervention_packaging_product_name,
      i.packaging_size_variant AS intervention_packaging_size_variant,
      i.packaging_materials_provided AS intervention_packaging_materials_provided,
      i.packaging_customer_name AS intervention_packaging_customer_name,
      i.packaging_sex AS intervention_packaging_sex,
      i.packaging_firm_institution AS intervention_packaging_firm_institution,
      i.packaging_address AS intervention_packaging_address,
      i.packaging_address_meta AS intervention_packaging_address_meta,
      i.packaging_means_of_verification AS intervention_packaging_means_of_verification,
      i.packaging_photos AS intervention_packaging_photos,
      i.packaging_remarks AS intervention_packaging_remarks,

      i.created_at AS intervention_created_at
    FROM cest p
    LEFT JOIN cest_interventions i
      ON p.id = i.project_id
    WHERE p.id = ?
    ORDER BY i.id DESC
  `;

  db.query(sql, [projectId], (err, rows) => {
    if (err) {
      console.error("GET /cest/:id ERROR:", err);
      return res.status(500).json(err);
    }

    if (!rows.length) {
      return res.status(404).json({ message: "CEST project not found" });
    }

    const p0 = rows[0];

    const typeVal = pickFirst(p0.type, "New Communities");
    const titleVal = pickFirst(p0.projectTitle, p0.project_title, "");
    const dateApprovedVal = formatDateOnly(
      pickFirst(
        p0.dateProjectApproval,
        p0.date_project_approval,
        p0.date_approved
      )
    );
    const amountVal = Number(
      pickFirst(
        p0.approvedProjectCost,
        p0.approved_project_cost,
        p0.amount,
        0
      )
    );
    const assocVal = pickFirst(
      p0.associationName,
      p0.association_name,
      p0.firm_name,
      p0.firmName,
      ""
    );

    const project = {
      id: p0.id,
      quarter: String(pickFirst(p0.quarter, "1")),
      type: typeVal,
      projectTitle: titleVal,
      project_title: titleVal,

      dateProjectApproval: dateApprovedVal,
      date_approved: dateApprovedVal,

      approvedProjectCost: amountVal,
      amount: amountVal,

      dateFundRelease: formatDateOnly(
        pickFirst(p0.dateFundRelease, p0.date_fund_release)
      ),

      associationName: assocVal,
      firmName: assocVal,
      firm_name: assocVal,

      address: pickFirst(p0.address, ""),
      addressMeta: {
        mode: pickFirst(p0.address_mode, ""),
        manualText: pickFirst(p0.address_manual_text, ""),
        province: pickFirst(p0.address_province, ""),
        municipality: pickFirst(p0.address_municipality, ""),
        barangay: pickFirst(p0.address_barangay, ""),
        lat:
          pickFirst(p0.address_lat, null) !== null
            ? Number(p0.address_lat)
            : null,
        lng:
          pickFirst(p0.address_lng, null) !== null
            ? Number(p0.address_lng)
            : null,
      },

      projectProponent: pickFirst(
        p0.projectProponent,
        p0.project_proponent,
        ""
      ),
      sex: pickFirst(p0.sex, ""),
      processSystem: pickFirst(p0.processSystem, p0.process_system, ""),
      pressRelease: Number(
        pickFirst(p0.pressRelease, p0.press_release, 0)
      ),

      communitiesAssisted: Number(
        pickFirst(p0.communitiesAssisted, p0.communities_assisted, 0)
      ),
      technologiesDeployed: Number(
        pickFirst(p0.technologiesDeployed, p0.technologies_deployed, 0)
      ),
      beneficiaries: Number(pickFirst(p0.beneficiaries, 0)),
      lguNumbersOfCommunities: pickFirst(
        p0.lguNumbersOfCommunities,
        p0.lgu_numbers_of_communities,
        ""
      ),
      numberOfMoa: Number(
        pickFirst(p0.numberOfMoa, p0.number_of_moa, 0)
      ),
      startupsAssisted: String(
        pickFirst(p0.startupsAssisted, p0.startups_assisted, "")
      ),
      jobsGenerated: Number(
        pickFirst(p0.jobsGenerated, p0.jobs_generated, 0)
      ),
      created_at: p0.created_at,
      custom_fields: parseJsonSafe(p0.custom_fields) || {},
      customFields: parseJsonSafe(p0.custom_fields) || {},
      interventions: [],
    };

    rows.forEach((row) => {
      if (row.intervention_id) {
        project.interventions.push({
          id: row.intervention_id,
          project_id: row.intervention_project_id,
          type: row.intervention_type ?? "",
          title: row.intervention_title ?? "",
          date: formatDateOnly(row.intervention_date),
          venue: row.intervention_venue || "",
          noOfFirms: row.intervention_no_of_firms ?? "",
          male: row.intervention_male ?? "",
          female: row.intervention_female ?? "",
          total: row.intervention_total ?? "",
          notes: row.intervention_notes || "",

          ...mapCestTechPromoResponse({
            intervention_project_name: row.intervention_project_name,
            intervention_activity_date: row.intervention_date,
            intervention_technology_promoted: row.intervention_technology_promoted,
            intervention_technology_generator: row.intervention_technology_generator,
            intervention_mode_of_promotion: row.intervention_mode_of_promotion,
            intervention_activity_title: row.intervention_title,
            intervention_activity_venue_address: row.intervention_venue,
            intervention_activity_venue_meta: row.intervention_venue_address_meta,
            intervention_customer_name: row.intervention_customer_name,
            intervention_customer_address: row.intervention_customer_address,
            intervention_promo_sex: row.intervention_promo_sex,
            intervention_means_of_verification: row.intervention_means_of_verification,
            intervention_staff_name: row.intervention_staff_name,
            intervention_photos: row.intervention_photos,
          }),
          packagingQuarter: row.intervention_packaging_quarter ?? "",
          packagingProvince: row.intervention_packaging_province ?? "Pangasinan",
          packagingDateCompleted: formatDateOnly(row.intervention_packaging_date_completed),
          packagingTypeOfIntervention:
            row.intervention_packaging_type_of_intervention ?? "",
          packagingProductName: row.intervention_packaging_product_name ?? "",
          packagingSizeVariant: row.intervention_packaging_size_variant ?? "",
          packagingMaterialsProvided:
            row.intervention_packaging_materials_provided ?? "",
          packagingCustomerName: row.intervention_packaging_customer_name ?? "",
          packagingSex: row.intervention_packaging_sex ?? "",
          packagingFirmInstitution:
            row.intervention_packaging_firm_institution ?? "",
          packagingAddress: row.intervention_packaging_address ?? "",
          packagingAddressMeta: parseJsonSafe(
            row.intervention_packaging_address_meta
          ),
          packagingMeansVerification:
            row.intervention_packaging_means_of_verification ?? "",
          packagingPhotos: parseJsonSafe(row.intervention_packaging_photos) || [],
          packagingRemarks: row.intervention_packaging_remarks ?? "",
          technologiesPromotedTotal:
            row.intervention_technologies_promoted_total ?? 0,
          promotionalActivitiesPressRelease:
            row.intervention_promotional_activities_press_release ?? 0,

          tacsConsultancyType: row.intervention_tacs_consultancy_type ?? "",
          tacsDateEngagement: formatDateOnly(
            row.intervention_tacs_date_engagement
          ),
          tacsExpertInstitution: row.intervention_tacs_expert_institution ?? "",
          tacsCustomerName: row.intervention_tacs_customer_name ?? "",
          tacsCustomerSex: row.intervention_tacs_customer_sex ?? "",
          tacsCustomerAddress: row.intervention_tacs_customer_address ?? "",
          tacsCustomerAddressMeta: parseJsonSafe(
            row.intervention_tacs_customer_address_meta
          ),
          tacsMeansVerification:
            row.intervention_tacs_means_verification ?? "",
          tacsNoOfAdvice: row.intervention_tacs_no_of_advice ?? "",
          tacsRemarks: row.intervention_tacs_remarks ?? "",
          tacsPhotos: parseJsonSafe(row.intervention_tacs_photos) || [],

          programTraining: row.intervention_program_training ?? "",
          startDate: formatDateOnly(row.intervention_start_date),
          endDate: formatDateOnly(row.intervention_end_date),
          province: row.intervention_province ?? "",
          venueAddressMeta: parseJsonSafe(row.intervention_venue_address_meta),
          noOfFirmsSucsHeisLgus:
            row.intervention_no_of_firms_sucs_heis_lgus ?? 0,
          participantsFemale: row.intervention_participants_female ?? 0,
          participantsMale: row.intervention_participants_male ?? 0,
          seniorFemale: row.intervention_senior_female ?? 0,
          seniorMale: row.intervention_senior_male ?? 0,
          ipFemale: row.intervention_ip_female ?? 0,
          ipMale: row.intervention_ip_male ?? 0,
          fourPsFemale: row.intervention_fourps_female ?? 0,
          fourPsMale: row.intervention_fourps_male ?? 0,
          pwdFemale: row.intervention_pwd_female ?? 0,
          pwdMale: row.intervention_pwd_male ?? 0,
          totalFemale: row.intervention_total_female ?? 0,
          totalMale: row.intervention_total_male ?? 0,
          totalParticipants: row.intervention_total_participants ?? 0,
          listOfFirmsAssociations:
            row.intervention_list_of_firms_associations ?? "",
          nameOfTrainorAffiliation:
            row.intervention_name_of_trainor_affiliation ?? "",
          programProjectUnit: row.intervention_program_project_unit ?? "",
          dostCost: row.intervention_dost_cost ?? 0,
          partnerAgencyCost: row.intervention_partner_agency_cost ?? 0,
          totalCost: row.intervention_total_cost ?? 0,
          notesRemarks: row.intervention_notes_remarks ?? "",
          latitude:
            row.intervention_latitude !== null && row.intervention_latitude !== undefined
              ? Number(row.intervention_latitude)
              : null,
          longitude:
            row.intervention_longitude !== null && row.intervention_longitude !== undefined
              ? Number(row.intervention_longitude)
              : null,

          ...mapCestTechRolloutResponse(row),
          ...mapCestPackagingResponse(row),

          created_at: row.intervention_created_at,
        });
      }
    });

    res.json(project);
  });
});

// GET interventions by cest project
app.get("/cest/:id/interventions", (req, res) => {
  db.query(
    `
      SELECT
        *,
        DATE_FORMAT(date, '%Y-%m-%d') AS date_fmt,
        DATE_FORMAT(start_date, '%Y-%m-%d') AS start_date_fmt,
        DATE_FORMAT(end_date, '%Y-%m-%d') AS end_date_fmt,
        DATE_FORMAT(tacs_date_engagement, '%Y-%m-%d') AS tacs_date_engagement_fmt,
        DATE_FORMAT(techrollout_date_transferred, '%Y-%m-%d') AS techrollout_date_transferred_fmt,
        DATE_FORMAT(techrollout_activity_date, '%Y-%m-%d') AS techrollout_activity_date_fmt
      FROM cest_interventions
      WHERE project_id=?
      ORDER BY id DESC
    `,
    [req.params.id],
    (err, rows) => {
      if (err) {
        console.error("GET /cest/:id/interventions ERROR:", err);
        return res.status(500).json(err);
      }

      const normalized = rows.map((row) => ({
        id: row.id,
        project_id: row.project_id,
        type: row.type ?? "",
        title: row.title ?? "",
        date: row.date_fmt || formatDateOnly(row.date),
        venue: row.venue || "",
        noOfFirms: row.no_of_firms ?? "",
        male: row.male ?? "",
        female: row.female ?? "",
        total: row.total ?? "",
        notes: row.notes || "",

        ...mapCestTechPromoResponse({
          project_name: row.project_name,
          activity_date: row.date_fmt || row.date,
          technology_promoted: row.technology_promoted,
          technology_generator: row.technology_generator,
          mode_of_promotion: row.mode_of_promotion,
          activity_title: row.title,
          activity_venue_address: row.venue,
          activity_venue_meta: row.venue_address_meta,
          customer_name: row.customer_name,
          customer_address: row.customer_address,
          sex: row.sex,
          means_of_verification: row.means_of_verification,
          staff_name: row.staff_name,
          photos: row.photos,
        }),
        technologiesPromotedTotal: row.technologies_promoted_total ?? 0,
        promotionalActivitiesPressRelease:
          row.promotional_activities_press_release ?? 0,

        tacsConsultancyType: row.tacs_consultancy_type ?? "",
        tacsDateEngagement:
          row.tacs_date_engagement_fmt || formatDateOnly(row.tacs_date_engagement),
        tacsExpertInstitution: row.tacs_expert_institution ?? "",
        tacsCustomerName: row.tacs_customer_name ?? "",
        tacsCustomerSex: row.tacs_customer_sex ?? "",
        tacsCustomerAddress: row.tacs_customer_address ?? "",
        tacsCustomerAddressMeta: parseJsonSafe(row.tacs_customer_address_meta),
        tacsMeansVerification: row.tacs_means_verification ?? "",
        tacsNoOfAdvice: row.tacs_no_of_advice ?? "",
        tacsRemarks: row.tacs_remarks ?? "",
        tacsPhotos: parseJsonSafe(row.tacs_photos) || [],

        programTraining: row.program_training ?? "",
        startDate: row.start_date_fmt || (row.start_date ? formatDateOnly(row.start_date) : ""),
        endDate: row.end_date_fmt || (row.end_date ? formatDateOnly(row.end_date) : ""),
        province: row.province ?? "",
        venueAddressMeta: parseJsonSafe(row.venue_address_meta),
        noOfFirmsSucsHeisLgus: row.no_of_firms_sucs_heis_lgus ?? 0,
        participantsFemale: row.participants_female ?? 0,
        participantsMale: row.participants_male ?? 0,
        seniorFemale: row.senior_female ?? 0,
        seniorMale: row.senior_male ?? 0,
        ipFemale: row.ip_female ?? 0,
        ipMale: row.ip_male ?? 0,
        fourPsFemale: row.fourps_female ?? 0,
        fourPsMale: row.fourps_male ?? 0,
        pwdFemale: row.pwd_female ?? 0,
        pwdMale: row.pwd_male ?? 0,
        totalFemale: row.total_female ?? 0,
        totalMale: row.total_male ?? 0,
        totalParticipants: row.total_participants ?? 0,
        listOfFirmsAssociations: row.list_of_firms_associations ?? "",
        nameOfTrainorAffiliation: row.name_of_trainor_affiliation ?? "",
        programProjectUnit: row.program_project_unit ?? "",
        dostCost: row.dost_cost ?? 0,
        partnerAgencyCost: row.partner_agency_cost ?? 0,
        totalCost: row.total_cost ?? 0,
        notesRemarks: row.notes_remarks ?? "",
        latitude:
          row.latitude !== null && row.latitude !== undefined
            ? Number(row.latitude)
            : null,
        longitude:
          row.longitude !== null && row.longitude !== undefined
            ? Number(row.longitude)
            : null,

        packagingQuarter: row.packaging_quarter ?? "",
        packagingProvince: row.packaging_province ?? "Pangasinan",
        packagingDateCompleted: formatDateOnly(row.packaging_date_completed),
        packagingTypeOfIntervention: row.packaging_type_of_intervention ?? "",
        packagingProductName: row.packaging_product_name ?? "",
        packagingSizeVariant: row.packaging_size_variant ?? "",
        packagingMaterialsProvided: row.packaging_materials_provided ?? "",
        packagingCustomerName: row.packaging_customer_name ?? "",
        packagingSex: row.packaging_sex ?? "",
        packagingFirmInstitution: row.packaging_firm_institution ?? "",
        packagingAddress: row.packaging_address ?? "",
        packagingAddressMeta: parseJsonSafe(row.packaging_address_meta),
        packagingMeansVerification: row.packaging_means_of_verification ?? "",
        packagingPhotos: parseJsonSafe(row.packaging_photos) || [],
        packagingRemarks: row.packaging_remarks ?? "",

        techrolloutQuarter: row.techrollout_quarter ?? "",
        techrolloutUnitCenter: row.techrollout_unit_center ?? "DOST-PANGASINAN",
        techrolloutNameOfTechnologyTransferred:
          row.techrollout_name_of_technology_transferred ?? "",
        techrolloutTechnologyGenerator: row.techrollout_technology_generator ?? "",
        techrolloutModeOfTransfer: row.techrollout_mode_of_transfer ?? "",
        techrolloutIsDostDevelopedFunded: Boolean(
          row.techrollout_is_dost_developed_funded ?? 0
        ),
        techrolloutDateTransferred:
          row.techrollout_date_transferred_fmt ||
          formatDateOnly(row.techrollout_date_transferred),
        techrolloutActivityTitle: row.techrollout_activity_title ?? "",
        techrolloutActivityDate:
          row.techrollout_activity_date_fmt ||
          formatDateOnly(row.techrollout_activity_date),
        techrolloutActivityVenue: row.techrollout_activity_venue ?? "",
        techrolloutInstitutionName: row.techrollout_institution_name ?? "",
        techrolloutInstitutionAddress: row.techrollout_institution_address ?? "",
        techrolloutInstitutionAddressMeta: parseJsonSafe(
          row.techrollout_institution_address_meta
        ),
        techrolloutClassification: row.techrollout_classification ?? "",
        techrolloutRepresentativeName: row.techrollout_representative_name ?? "",
        techrolloutRepresentativeDesignation:
          row.techrollout_representative_designation ?? "",
        techrolloutSex: row.techrollout_sex ?? "",

        ...mapCestPackagingResponse(row),
      }));

      res.json(normalized);
    }
  );
});

// ============================================================

app.post("/cest", (req, res) => {
  const b = req.body || {};

  const quarter = pickFirst(b.quarter, "1");
  const type = pickFirst(b.type, "New Communities");
  const projectTitle = pickFirst(b.projectTitle, b.project_title, "");
  const dateProjectApproval = pickFirst(
    b.dateProjectApproval,
    b.date_approved,
    null
  );
  const approvedProjectCost = pickFirst(b.approvedProjectCost, b.amount, 0);
  const dateFundRelease = pickFirst(
    b.dateFundRelease,
    b.date_fund_release,
    null
  );
  const associationName = pickFirst(
    b.associationName,
    b.association_name,
    b.firm_name,
    b.firmName,
    ""
  );
  const address = pickFirst(b.address, "");
  const projectProponent = pickFirst(
    b.projectProponent,
    b.project_proponent,
    ""
  );
  const sex = pickFirst(b.sex, "");
  const processSystem = pickFirst(b.processSystem, b.process_system, "");
  const pressRelease = pickFirst(b.pressRelease, b.press_release, 0);
  const communitiesAssisted = pickFirst(
    b.communitiesAssisted,
    b.communities_assisted,
    0
  );
  const technologiesDeployed = pickFirst(
    b.technologiesDeployed,
    b.technologies_deployed,
    0
  );
  const beneficiaries = pickFirst(b.beneficiaries, 0);
  const lguNumbersOfCommunities = pickFirst(
    b.lguNumbersOfCommunities,
    b.lgu_numbers_of_communities,
    ""
  );
  const numberOfMoa = pickFirst(
    b.numberOfMoa,
    b.number_of_moa,
    0
  );
  const startupsAssisted = pickFirst(
    b.startupsAssisted,
    b.startups_assisted,
    ""
  );
  const jobsGenerated = pickFirst(b.jobsGenerated, b.jobs_generated, 0);
  const customFields = b.custom_fields ?? b.customFields ?? {};

  const addr = mapAddressMetaFromBody(b);

  const sql = `
    INSERT INTO cest
    (
      quarter,
      type,
      projectTitle,
      dateProjectApproval,
      approvedProjectCost,
      dateFundRelease,
      associationName,
      address,
      address_mode,
      address_manual_text,
      address_province,
      address_municipality,
      address_barangay,
      address_lat,
      address_lng,
      projectProponent,
      sex,
      processSystem,
      press_release,
      communitiesAssisted,
      technologiesDeployed,
      beneficiaries,
      lgu_numbers_of_communities,
      number_of_moa,
      startupsAssisted,
      jobsGenerated,
      custom_fields
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [
      quarter,
      type,
      projectTitle,
      toNullIfEmpty(dateProjectApproval),
      toNumOrZero(approvedProjectCost),
      toNullIfEmpty(dateFundRelease),
      associationName,
      address,

      addr.address_mode,
      addr.address_manual_text,
      addr.address_province,
      addr.address_municipality,
      addr.address_barangay,
      addr.address_lat,
      addr.address_lng,

      projectProponent,
      sex || "",
      processSystem || "",
      toNumOrZero(pressRelease),
      toNumOrZero(communitiesAssisted),
      toNumOrZero(technologiesDeployed),
      toNumOrZero(beneficiaries),
      String(lguNumbersOfCommunities || "").trim(),
      toNumOrZero(numberOfMoa),
      String(startupsAssisted || "").trim(),
      toNumOrZero(jobsGenerated),
      JSON.stringify(customFields || {}),
    ],
    (err, result) => {
      if (err) {
        console.error("CREATE CEST ERROR:", err);
        return res.status(500).json(err);
      }
      res.json({ message: "CEST project created", id: result.insertId });
    }
  );
});

// UPDATE cest project
app.put("/cest/:id", (req, res) => {
  const b = req.body || {};

  const quarter = pickFirst(b.quarter, "1");
  const type = pickFirst(b.type, "New Communities");
  const projectTitle = pickFirst(b.projectTitle, b.project_title, "");
  const dateProjectApproval = pickFirst(
    b.dateProjectApproval,
    b.date_approved,
    null
  );
  const approvedProjectCost = pickFirst(b.approvedProjectCost, b.amount, 0);
  const dateFundRelease = pickFirst(
    b.dateFundRelease,
    b.date_fund_release,
    null
  );
  const associationName = pickFirst(
    b.associationName,
    b.association_name,
    b.firm_name,
    b.firmName,
    ""
  );
  const address = pickFirst(b.address, "");
  const projectProponent = pickFirst(
    b.projectProponent,
    b.project_proponent,
    ""
  );
  const sex = pickFirst(b.sex, "");
  const processSystem = pickFirst(b.processSystem, b.process_system, "");
  const pressRelease = pickFirst(b.pressRelease, b.press_release, 0);
  const communitiesAssisted = pickFirst(
    b.communitiesAssisted,
    b.communities_assisted,
    0
  );
  const technologiesDeployed = pickFirst(
    b.technologiesDeployed,
    b.technologies_deployed,
    0
  );
  const beneficiaries = pickFirst(b.beneficiaries, 0);
  const lguNumbersOfCommunities = pickFirst(
    b.lguNumbersOfCommunities,
    b.lgu_numbers_of_communities,
    ""
  );
  const numberOfMoa = pickFirst(
    b.numberOfMoa,
    b.number_of_moa,
    0
  );
  const startupsAssisted = pickFirst(
    b.startupsAssisted,
    b.startups_assisted,
    ""
  );
  const jobsGenerated = pickFirst(b.jobsGenerated, b.jobs_generated, 0);
  const customFields = b.custom_fields ?? b.customFields ?? {};

  const addr = mapAddressMetaFromBody(b);

  const sql = `
    UPDATE cest SET
      quarter=?,
      type=?,
      projectTitle=?,
      dateProjectApproval=?,
      approvedProjectCost=?,
      dateFundRelease=?,
      associationName=?,
      address=?,
      address_mode=?,
      address_manual_text=?,
      address_province=?,
      address_municipality=?,
      address_barangay=?,
      address_lat=?,
      address_lng=?,
      projectProponent=?,
      sex=?,
      processSystem=?,
      press_release=?,
      communitiesAssisted=?,
      technologiesDeployed=?,
      beneficiaries=?,
      lgu_numbers_of_communities=?,
      number_of_moa=?,
      startupsAssisted=?,
      jobsGenerated=?,
      custom_fields=?
    WHERE id=?
  `;

  db.query(
    sql,
    [
      quarter,
      type,
      projectTitle,
      toNullIfEmpty(dateProjectApproval),
      toNumOrZero(approvedProjectCost),
      toNullIfEmpty(dateFundRelease),
      associationName,
      address,

      addr.address_mode,
      addr.address_manual_text,
      addr.address_province,
      addr.address_municipality,
      addr.address_barangay,
      addr.address_lat,
      addr.address_lng,

      projectProponent,
      sex || "",
      processSystem || "",
      toNumOrZero(pressRelease),
      toNumOrZero(communitiesAssisted),
      toNumOrZero(technologiesDeployed),
      toNumOrZero(beneficiaries),
      String(lguNumbersOfCommunities || "").trim(),
      toNumOrZero(numberOfMoa),
      String(startupsAssisted || "").trim(),
      toNumOrZero(jobsGenerated),
      JSON.stringify(customFields || {}),

      req.params.id,
    ],
    (err) => {
      if (err) {
        console.error("UPDATE CEST ERROR:", err);
        return res.status(500).json(err);
      }
      res.json({ message: "CEST project updated" });
    }
  );
});

// DELETE cest project
app.delete("/cest/:id", (req, res) => {
  const projectId = req.params.id;

  db.query(
    "DELETE FROM tacs_entries WHERE project_id = ? AND source_module = ? AND source_table = ?",
    [projectId, "CEST", "cest_interventions"],
    (tacsErr) => {
      if (tacsErr) return res.status(500).json(tacsErr);

      db.query(
        "DELETE FROM cest_interventions WHERE project_id=?",
        [projectId],
        (err) => {
          if (err) return res.status(500).json(err);

          db.query(
            "DELETE FROM cest_other_indicators WHERE project_id=?",
            [projectId],
            (errOI) => {
              if (errOI) return res.status(500).json(errOI);

              db.query("DELETE FROM cest WHERE id=?", [projectId], (err2) => {
                if (err2) return res.status(500).json(err2);
                res.json({
                  message:
                    "CEST project deleted (with interventions + other indicators)",
                });
              });
            }
          );
        }
      );
    }
  );
});

// ===========================
// CEST INTERVENTION ROUTES
// ===========================

// CREATE intervention
app.post("/cest/:id/interventions", (req, res) => {
  const projectId = Number(req.params.id);
  const b = req.body || {};
  const techPromo = mapCestTechPromoPayload(b, b.type || "");
  const techrollout = mapCestTechRolloutPayload(b);
  const packaging = mapCestPackagingPayloadForDb(b);

  const type = pickFirst(b.type, "");
  const title = pickFirst(b.title, b.activityTitle, b.activity_title, "");
  const date = pickFirst(
    b.date,
    b.activityDate,
    b.activity_date,
    b.startDate,
    b.start_date,
    null
  );
  const venue = pickFirst(
    b.venue,
    b.activityVenueAddress,
    b.activity_venue_address,
    b.venueAddress,
    b.venue_address,
    ""
  );
  const noOfFirms = pickFirst(b.noOfFirms, b.no_of_firms, null);
  const male = pickFirst(b.male, b.totalMale, b.total_male, null);
  const female = pickFirst(b.female, b.totalFemale, b.total_female, null);
  const total = pickFirst(
    b.total,
    b.totalParticipants,
    b.total_participants,
    null
  );
  const notes = pickFirst(b.notes, "");

  const technologiesPromotedTotal = pickFirst(
    b.technologiesPromotedTotal,
    b.technologies_promoted_total,
    0
  );
  const promotionalActivitiesPressRelease = pickFirst(
    b.promotionalActivitiesPressRelease,
    b.promotional_activities_press_release,
    0
  );
  const pwd = pickFirst(b.pwd, null);
  const fourPs = pickFirst(b.fourPs, b.four_ps, null);
  const ip = pickFirst(b.ip, null);
  const seniors = pickFirst(b.seniors, null);

  const tacsConsultancyType = pickFirst(
    b.tacsConsultancyType,
    b.tacs_consultancy_type,
    null
  );
  const tacsDateEngagement = pickFirst(
    b.tacsDateEngagement,
    b.tacs_date_engagement,
    null
  );
  const tacsExpertInstitution = pickFirst(
    b.tacsExpertInstitution,
    b.tacs_expert_institution,
    null
  );
  const tacsCustomerName = pickFirst(
    b.tacsCustomerName,
    b.tacs_customer_name,
    null
  );
  const tacsCustomerSex = pickFirst(
    b.tacsCustomerSex,
    b.tacs_customer_sex,
    null
  );
  const tacsCustomerAddress = pickFirst(
    b.tacsCustomerAddress,
    b.tacs_customer_address,
    null
  );
  const tacsCustomerAddressMeta = pickFirst(
    b.tacsCustomerAddressMeta,
    b.tacs_customer_address_meta,
    null
  );
  const tacsMeansVerification = pickFirst(
    b.tacsMeansVerification,
    b.tacs_means_verification,
    null
  );
  const tacsNoOfAdvice = pickFirst(
    b.tacsNoOfAdvice,
    b.tacs_no_of_advice,
    null
  );
  const tacsRemarks = pickFirst(b.tacsRemarks, b.tacs_remarks, null);
  const tacsPhotos = pickFirst(b.tacsPhotos, b.tacs_photos, null);

  const trainingProgram = pickFirst(
    b.programTraining,
    b.program_training,
    null
  );
  const trainingStartDate = pickFirst(
    b.startDate,
    b.start_date,
    b.date,
    null
  );
  const trainingEndDate = pickFirst(b.endDate, b.end_date, null);
  const trainingProvince = pickFirst(b.province, null);
  const trainingVenueAddressMeta = pickFirst(
    b.venueAddressMeta,
    b.venue_address_meta,
    null
  );
  const latitude = toNumOrNull(
    pickFirst(
      b.latitude,
      b.lat,
      trainingVenueAddressMeta?.lat,
      trainingVenueAddressMeta?.latitude,
      null
    )
  );
  const longitude = toNumOrNull(
    pickFirst(
      b.longitude,
      b.lng,
      trainingVenueAddressMeta?.lng,
      trainingVenueAddressMeta?.longitude,
      null
    )
  );
  const noOfFirmsSucsHeisLgus = pickFirst(
    b.noOfFirmsSucsHeisLgus,
    b.no_of_firms_sucs_heis_lgus,
    b.firmsSucsHeisLgusCount,
    b.firms_sucs_heis_lgus_count,
    0
  );
  const participantsFemale = pickFirst(
    b.participantsFemale,
    b.participants_female,
    0
  );
  const participantsMale = pickFirst(
    b.participantsMale,
    b.participants_male,
    0
  );
  const seniorFemale = pickFirst(b.seniorFemale, b.senior_female, 0);
  const seniorMale = pickFirst(b.seniorMale, b.senior_male, 0);
  const ipFemale = pickFirst(b.ipFemale, b.ip_female, 0);
  const ipMale = pickFirst(b.ipMale, b.ip_male, 0);
  const fourPsFemale = pickFirst(b.fourPsFemale, b.fourps_female, 0);
  const fourPsMale = pickFirst(b.fourPsMale, b.fourps_male, 0);
  const pwdFemale = pickFirst(b.pwdFemale, b.pwd_female, 0);
  const pwdMale = pickFirst(b.pwdMale, b.pwd_male, 0);
  const totalFemale = pickFirst(b.totalFemale, b.total_female, female, 0);
  const totalMale = pickFirst(b.totalMale, b.total_male, male, 0);
  const totalParticipants = pickFirst(
    b.totalParticipants,
    b.total_participants,
    total,
    0
  );
  const listOfFirmsAssociations = pickFirst(
    b.listOfFirmsAssociations,
    b.list_of_firms_associations,
    null
  );
  const nameOfTrainorAffiliation = pickFirst(
    b.nameOfTrainorAffiliation,
    b.name_of_trainor_affiliation,
    null
  );
  const programProjectUnit = pickFirst(
    b.programProjectUnit,
    b.program_project_unit,
    null
  );
  const dostCost = pickFirst(b.dostCost, b.dost_cost, 0);
  const partnerAgencyCost = pickFirst(
    b.partnerAgencyCost,
    b.partner_agency_cost,
    0
  );
  const totalCost = pickFirst(b.totalCost, b.total_cost, 0);
  const notesRemarks = pickFirst(b.notesRemarks, b.notes_remarks, null);

  const sql = `
    INSERT INTO cest_interventions (
      project_id,
      type,
      title,
      date,
      venue,
      no_of_firms,
      male,
      female,
      total,
      notes,
      project_name,
      technology_promoted,
      technology_generator,
      mode_of_promotion,
      customer_name,
      customer_address,
      sex,
      staff_name,
      means_of_verification,
      photos,
      technologies_promoted_total,
      promotional_activities_press_release,
      pwd,
      four_ps,
      ip,
      seniors,
      tacs_consultancy_type,
      tacs_date_engagement,
      tacs_expert_institution,
      tacs_customer_name,
      tacs_customer_sex,
      tacs_customer_address,
      tacs_customer_address_meta,
      tacs_means_verification,
      tacs_no_of_advice,
      tacs_remarks,
      tacs_photos,
      program_training,
      start_date,
      end_date,
      province,
      venue_address_meta,
      no_of_firms_sucs_heis_lgus,
      participants_female,
      participants_male,
      senior_female,
      senior_male,
      ip_female,
      ip_male,
      fourps_female,
      fourps_male,
      pwd_female,
      pwd_male,
      total_female,
      total_male,
      total_participants,
      list_of_firms_associations,
      name_of_trainor_affiliation,
      program_project_unit,
      dost_cost,
      partner_agency_cost,
      total_cost,
      notes_remarks,
      latitude,
      longitude,
      techrollout_quarter,
      techrollout_unit_center,
      techrollout_name_of_technology_transferred,
      techrollout_technology_generator,
      techrollout_mode_of_transfer,
      techrollout_is_dost_developed_funded,
      techrollout_date_transferred,
      techrollout_activity_title,
      techrollout_activity_date,
      techrollout_activity_venue,
      techrollout_institution_name,
      techrollout_institution_address,
      techrollout_institution_address_meta,
      techrollout_classification,
      techrollout_representative_name,
      techrollout_representative_designation,
      techrollout_sex,
      packaging_quarter,
      packaging_province,
      packaging_date_completed,
      packaging_type_of_intervention,
      packaging_product_name,
      packaging_size_variant,
      packaging_materials_provided,
      packaging_customer_name,
      packaging_sex,
      packaging_firm_institution,
      packaging_address,
      packaging_address_meta,
      packaging_means_of_verification,
      packaging_photos,
      packaging_remarks
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.beginTransaction((txErr) => {
    if (txErr) {
      console.error("CREATE CEST INTERVENTION TX ERROR:", txErr);
      return res.status(500).json({ message: txErr.message });
    }

    db.query(
      sql,
      [
        projectId,
        type,
        title,
        toNullIfEmpty(date),
        venue || "",
        toNumOrNull(noOfFirms),
        toNumOrNull(male),
        toNumOrNull(female),
        toNumOrNull(total),
        notes || "",
        techPromo.project_name,
        techPromo.technology_promoted,
        techPromo.technology_generator,
        techPromo.mode_of_promotion,
        techPromo.customer_name,
        techPromo.customer_address,
        techPromo.sex,
        techPromo.staff_name,
        techPromo.means_of_verification,
        techPromo.photos,
        toNumOrZero(technologiesPromotedTotal),
        toNumOrZero(promotionalActivitiesPressRelease),
        toNullIfEmpty(pwd),
        toNullIfEmpty(fourPs),
        toNullIfEmpty(ip),
        toNullIfEmpty(seniors),
        toNullIfEmpty(tacsConsultancyType),
        toNullIfEmpty(tacsDateEngagement),
        toNullIfEmpty(tacsExpertInstitution),
        toNullIfEmpty(tacsCustomerName),
        toNullIfEmpty(tacsCustomerSex),
        toNullIfEmpty(tacsCustomerAddress),
        mapTacsAddressMeta(tacsCustomerAddressMeta),
        toNullIfEmpty(tacsMeansVerification),
        toNumOrNull(tacsNoOfAdvice),
        toNullIfEmpty(tacsRemarks),
        mapTacsAddressMeta(Array.isArray(tacsPhotos) ? tacsPhotos : []),
        toNullIfEmpty(trainingProgram),
        toNullIfEmpty(trainingStartDate),
        toNullIfEmpty(trainingEndDate),
        toNullIfEmpty(trainingProvince),
        techPromo.venue_address_meta ||
        mapTacsAddressMeta(trainingVenueAddressMeta),
        toNumOrZero(noOfFirmsSucsHeisLgus),
        toNumOrZero(participantsFemale),
        toNumOrZero(participantsMale),
        toNumOrZero(seniorFemale),
        toNumOrZero(seniorMale),
        toNumOrZero(ipFemale),
        toNumOrZero(ipMale),
        toNumOrZero(fourPsFemale),
        toNumOrZero(fourPsMale),
        toNumOrZero(pwdFemale),
        toNumOrZero(pwdMale),
        toNumOrZero(totalFemale),
        toNumOrZero(totalMale),
        toNumOrZero(totalParticipants),
        toNullIfEmpty(listOfFirmsAssociations),
        toNullIfEmpty(nameOfTrainorAffiliation),
        toNullIfEmpty(programProjectUnit),
        toNumOrZero(dostCost),
        toNumOrZero(partnerAgencyCost),
        toNumOrZero(totalCost),
        toNullIfEmpty(notesRemarks),
        latitude,
        longitude,
        techrollout.techrollout_quarter,
        techrollout.techrollout_unit_center,
        techrollout.techrollout_name_of_technology_transferred,
        techrollout.techrollout_technology_generator,
        techrollout.techrollout_mode_of_transfer,
        techrollout.techrollout_is_dost_developed_funded,
        techrollout.techrollout_date_transferred,
        techrollout.techrollout_activity_title,
        techrollout.techrollout_activity_date,
        techrollout.techrollout_activity_venue,
        techrollout.techrollout_institution_name,
        techrollout.techrollout_institution_address,
        techrollout.techrollout_institution_address_meta,
        techrollout.techrollout_classification,
        techrollout.techrollout_representative_name,
        techrollout.techrollout_representative_designation,
        techrollout.techrollout_sex,
        packaging.packaging_quarter,
        packaging.packaging_province,
        packaging.packaging_date_completed,
        packaging.packaging_type_of_intervention,
        packaging.packaging_product_name,
        packaging.packaging_size_variant,
        packaging.packaging_materials_provided,
        packaging.packaging_customer_name,
        packaging.packaging_sex,
        packaging.packaging_firm_institution,
        packaging.packaging_address,
        packaging.packaging_address_meta,
        packaging.packaging_means_of_verification,
        packaging.packaging_photos,
        packaging.packaging_remarks,
      ],
      (err, result) => {
        if (err) {
          return db.rollback(() => {
            console.error("CREATE CEST INTERVENTION ERROR:", err);
            res.status(500).json({ message: err.message });
          });
        }

        const interventionId = Number(result.insertId);

        syncCestTechnologyPromotionEntry(
          {
            projectId,
            interventionId,
            type,
            body: {
              ...b,
              title,
              date: toNullIfEmpty(date),
              venue: venue || "",
            },
          },
          (techPromoSyncErr) => {
            if (techPromoSyncErr) {
              return db.rollback(() => {
                console.error(
                  "CREATE CEST INTERVENTION Technology Promotion sync ERROR:",
                  techPromoSyncErr
                );
                res.status(500).json({ message: techPromoSyncErr.message });
              });
            }

            syncTacsEntryForIntervention(
              {
                projectId,
                interventionId,
                type,
                body: {
                  ...b,
                  title,
                  date: toNullIfEmpty(date),
                  venue: venue || "",
                  tacsPhotos: Array.isArray(tacsPhotos) ? tacsPhotos : [],
                },
                source_module: "CEST",
                source_table: "cest_interventions",
              },
              (tacsSyncErr) => {
                if (tacsSyncErr) {
                  return db.rollback(() => {
                    console.error(
                      "CREATE CEST INTERVENTION TACS sync ERROR:",
                      tacsSyncErr
                    );
                    res.status(500).json({ message: tacsSyncErr.message });
                  });
                }

                syncPackagingRecordForIntervention(
                  {
                    projectId,
                    interventionId,
                    type,
                    body: {
                      ...b,
                      title,
                      date: toNullIfEmpty(date),
                      venue: venue || "",
                      packagingQuarter: packaging.packaging_quarter,
                      packagingProvince: packaging.packaging_province,
                      packagingDateCompleted: packaging.packaging_date_completed,
                      packagingTypeOfIntervention:
                        packaging.packaging_type_of_intervention,
                      packagingProductName: packaging.packaging_product_name,
                      packagingSizeVariant: packaging.packaging_size_variant,
                      packagingMaterialsProvided:
                        packaging.packaging_materials_provided,
                      packagingCustomerName: packaging.packaging_customer_name,
                      packagingSex: packaging.packaging_sex,
                      packagingFirmInstitution:
                        packaging.packaging_firm_institution,
                      packagingAddress: packaging.packaging_address,
                      packagingAddressMeta: parseJsonSafe(
                        packaging.packaging_address_meta
                      ),
                      packagingMeansVerification:
                        packaging.packaging_means_of_verification,
                      packagingPhotos:
                        parseJsonSafe(packaging.packaging_photos) || [],
                      packagingRemarks: packaging.packaging_remarks,
                    },
                  },
                  (packagingSyncErr) => {
                    if (packagingSyncErr) {
                      return db.rollback(() => {
                        console.error(
                          "CREATE CEST INTERVENTION Packaging & Labeling sync ERROR:",
                          packagingSyncErr
                        );
                        res.status(500).json({ message: packagingSyncErr.message });
                      });
                    }

                    syncTechnologyTrainingEntryForIntervention(
                      {
                        projectId,
                        interventionId,
                        type,
                        body: {
                          ...b,
                          venue: venue || "",
                          latitude,
                          longitude,
                          male: toNumOrZero(totalMale),
                          female: toNumOrZero(totalFemale),
                          total: toNumOrZero(totalParticipants),
                        },
                        source_module: "cest",
                        source_label: "CEST",
                      },
                      (syncErr) => {
                        if (syncErr) {
                          return db.rollback(() => {
                            console.error(
                              "CREATE CEST INTERVENTION Technology Training sync ERROR:",
                              syncErr
                            );
                            res.status(500).json({ message: syncErr.message });
                          });
                        }

                        syncCestTechnologyRolloutToTable(
                          {
                            projectId,
                            interventionId,
                            type,
                            title,
                            techrollout,
                          },
                          (techRolloutSyncErr) => {
                            if (techRolloutSyncErr) {
                              return db.rollback(() => {
                                console.error(
                                  "CREATE CEST INTERVENTION Tech Roll Out table sync ERROR:",
                                  techRolloutSyncErr
                                );
                                res
                                  .status(500)
                                  .json({ message: techRolloutSyncErr.message });
                              });
                            }

                            db.commit((commitErr) => {
                              if (commitErr) {
                                return db.rollback(() => {
                                  console.error(
                                    "CREATE CEST INTERVENTION COMMIT ERROR:",
                                    commitErr
                                  );
                                  res.status(500).json({
                                    message: commitErr.message,
                                  });
                                });
                              }

                              res.json({
                                message: "CEST intervention added",
                                id: interventionId,
                              });
                            });
                          }
                        );
                      }
                    );
                  }
                );
              }
            );
          }
        );
      }
    );
  });
});

// ============================================================

// UPDATE intervention
app.put("/cest-interventions/:id", (req, res) => {
  const interventionId = Number(req.params.id);
  const b = req.body || {};
  const techPromo = mapCestTechPromoPayload(b, b.type || "");
  const techrollout = mapCestTechRolloutPayload(b);
  const packaging = mapCestPackagingPayloadForDb(b);

  const type = pickFirst(b.type, "");
  const title = pickFirst(b.title, b.activityTitle, b.activity_title, "");
  const date = pickFirst(
    b.date,
    b.activityDate,
    b.activity_date,
    b.startDate,
    b.start_date,
    null
  );
  const venue = pickFirst(
    b.venue,
    b.activityVenueAddress,
    b.activity_venue_address,
    b.venueAddress,
    b.venue_address,
    ""
  );
  const noOfFirms = pickFirst(b.noOfFirms, b.no_of_firms, null);
  const male = pickFirst(b.male, b.totalMale, b.total_male, null);
  const female = pickFirst(b.female, b.totalFemale, b.total_female, null);
  const total = pickFirst(b.total, b.totalParticipants, b.total_participants, null);
  const notes = pickFirst(b.notes, "");

  const technologiesPromotedTotal = pickFirst(
    b.technologiesPromotedTotal,
    b.technologies_promoted_total,
    0
  );
  const promotionalActivitiesPressRelease = pickFirst(
    b.promotionalActivitiesPressRelease,
    b.promotional_activities_press_release,
    0
  );
  const pwd = pickFirst(b.pwd, null);
  const fourPs = pickFirst(b.fourPs, b.four_ps, null);
  const ip = pickFirst(b.ip, null);
  const seniors = pickFirst(b.seniors, null);

  const tacsConsultancyType = pickFirst(
    b.tacsConsultancyType,
    b.tacs_consultancy_type,
    null
  );
  const tacsDateEngagement = pickFirst(
    b.tacsDateEngagement,
    b.tacs_date_engagement,
    null
  );
  const tacsExpertInstitution = pickFirst(
    b.tacsExpertInstitution,
    b.tacs_expert_institution,
    null
  );
  const tacsCustomerName = pickFirst(
    b.tacsCustomerName,
    b.tacs_customer_name,
    null
  );
  const tacsCustomerSex = pickFirst(
    b.tacsCustomerSex,
    b.tacs_customer_sex,
    null
  );
  const tacsCustomerAddress = pickFirst(
    b.tacsCustomerAddress,
    b.tacs_customer_address,
    null
  );
  const tacsCustomerAddressMeta = pickFirst(
    b.tacsCustomerAddressMeta,
    b.tacs_customer_address_meta,
    null
  );
  const tacsMeansVerification = pickFirst(
    b.tacsMeansVerification,
    b.tacs_means_verification,
    null
  );
  const tacsNoOfAdvice = pickFirst(
    b.tacsNoOfAdvice,
    b.tacs_no_of_advice,
    null
  );
  const tacsRemarks = pickFirst(b.tacsRemarks, b.tacs_remarks, null);
  const tacsPhotos = pickFirst(b.tacsPhotos, b.tacs_photos, null);

  const trainingProgram = pickFirst(b.programTraining, b.program_training, null);
  const trainingStartDate = pickFirst(b.startDate, b.start_date, b.date, null);
  const trainingEndDate = pickFirst(b.endDate, b.end_date, null);
  const trainingProvince = pickFirst(b.province, null);
  const trainingVenueAddressMeta = pickFirst(
    b.venueAddressMeta,
    b.venue_address_meta,
    null
  );
  const latitude = toNumOrNull(
    pickFirst(
      b.latitude,
      b.lat,
      trainingVenueAddressMeta?.lat,
      trainingVenueAddressMeta?.latitude,
      null
    )
  );
  const longitude = toNumOrNull(
    pickFirst(
      b.longitude,
      b.lng,
      trainingVenueAddressMeta?.lng,
      trainingVenueAddressMeta?.longitude,
      null
    )
  );
  const noOfFirmsSucsHeisLgus = pickFirst(
    b.noOfFirmsSucsHeisLgus,
    b.no_of_firms_sucs_heis_lgus,
    b.firmsSucsHeisLgusCount,
    b.firms_sucs_heis_lgus_count,
    0
  );
  const participantsFemale = pickFirst(b.participantsFemale, b.participants_female, 0);
  const participantsMale = pickFirst(b.participantsMale, b.participants_male, 0);
  const seniorFemale = pickFirst(b.seniorFemale, b.senior_female, 0);
  const seniorMale = pickFirst(b.seniorMale, b.senior_male, 0);
  const ipFemale = pickFirst(b.ipFemale, b.ip_female, 0);
  const ipMale = pickFirst(b.ipMale, b.ip_male, 0);
  const fourPsFemale = pickFirst(b.fourPsFemale, b.fourps_female, 0);
  const fourPsMale = pickFirst(b.fourPsMale, b.fourps_male, 0);
  const pwdFemale = pickFirst(b.pwdFemale, b.pwd_female, 0);
  const pwdMale = pickFirst(b.pwdMale, b.pwd_male, 0);
  const totalFemale = pickFirst(b.totalFemale, b.total_female, female, 0);
  const totalMale = pickFirst(b.totalMale, b.total_male, male, 0);
  const totalParticipants = pickFirst(b.totalParticipants, b.total_participants, total, 0);
  const listOfFirmsAssociations = pickFirst(
    b.listOfFirmsAssociations,
    b.list_of_firms_associations,
    null
  );
  const nameOfTrainorAffiliation = pickFirst(
    b.nameOfTrainorAffiliation,
    b.name_of_trainor_affiliation,
    null
  );
  const programProjectUnit = pickFirst(
    b.programProjectUnit,
    b.program_project_unit,
    null
  );
  const dostCost = pickFirst(b.dostCost, b.dost_cost, 0);
  const partnerAgencyCost = pickFirst(b.partnerAgencyCost, b.partner_agency_cost, 0);
  const totalCost = pickFirst(b.totalCost, b.total_cost, 0);
  const notesRemarks = pickFirst(b.notesRemarks, b.notes_remarks, null);

  const sql = `
    UPDATE cest_interventions SET
      type=?,
      title=?,
      date=?,
      venue=?,
      no_of_firms=?,
      male=?,
      female=?,
      total=?,
      notes=?,
      project_name=?,
      technology_promoted=?,
      technology_generator=?,
      mode_of_promotion=?,
      customer_name=?,
      customer_address=?,
      sex=?,
      staff_name=?,
      means_of_verification=?,
      photos=?,
      technologies_promoted_total=?,
      promotional_activities_press_release=?,
      pwd=?,
      four_ps=?,
      ip=?,
      seniors=?,
      tacs_consultancy_type=?,
      tacs_date_engagement=?,
      tacs_expert_institution=?,
      tacs_customer_name=?,
      tacs_customer_sex=?,
      tacs_customer_address=?,
      tacs_customer_address_meta=?,
      tacs_means_verification=?,
      tacs_no_of_advice=?,
      tacs_remarks=?,
      tacs_photos=?,
      program_training=?,
      start_date=?,
      end_date=?,
      province=?,
      venue_address_meta=?,
      no_of_firms_sucs_heis_lgus=?,
      participants_female=?,
      participants_male=?,
      senior_female=?,
      senior_male=?,
      ip_female=?,
      ip_male=?,
      fourps_female=?,
      fourps_male=?,
      pwd_female=?,
      pwd_male=?,
      total_female=?,
      total_male=?,
      total_participants=?,
      list_of_firms_associations=?,
      name_of_trainor_affiliation=?,
      program_project_unit=?,
      dost_cost=?,
      partner_agency_cost=?,
      total_cost=?,
      notes_remarks=?,
      latitude=?,
      longitude=?,
      techrollout_quarter=?,
      techrollout_unit_center=?,
      techrollout_name_of_technology_transferred=?,
      techrollout_technology_generator=?,
      techrollout_mode_of_transfer=?,
      techrollout_is_dost_developed_funded=?,
      techrollout_date_transferred=?,
      techrollout_activity_title=?,
      techrollout_activity_date=?,
      techrollout_activity_venue=?,
      techrollout_institution_name=?,
      techrollout_institution_address=?,
      techrollout_institution_address_meta=?,
      techrollout_classification=?,
      techrollout_representative_name=?,
      techrollout_representative_designation=?,
      techrollout_sex=?,
      packaging_quarter=?,
      packaging_province=?,
      packaging_date_completed=?,
      packaging_type_of_intervention=?,
      packaging_product_name=?,
      packaging_size_variant=?,
      packaging_materials_provided=?,
      packaging_customer_name=?,
      packaging_sex=?,
      packaging_firm_institution=?,
      packaging_address=?,
      packaging_address_meta=?,
      packaging_means_of_verification=?,
      packaging_photos=?,
      packaging_remarks=?
    WHERE id=?
  `;

  db.beginTransaction((txErr) => {
    if (txErr) {
      console.error("UPDATE CEST INTERVENTION TX ERROR:", txErr);
      return res.status(500).json({ message: txErr.message });
    }

    db.query(
      "SELECT project_id FROM cest_interventions WHERE id = ? LIMIT 1",
      [interventionId],
      (findErr, rows) => {
        if (findErr) {
          return db.rollback(() => {
            console.error("UPDATE CEST INTERVENTION find ERROR:", findErr);
            res.status(500).json({ message: findErr.message });
          });
        }

        if (!rows || !rows.length) {
          return db.rollback(() => {
            res.status(404).json({ message: "CEST intervention not found" });
          });
        }

        const projectId = Number(rows[0].project_id);

        db.query(
          sql,
          [
            type,
            title,
            toNullIfEmpty(date),
            venue || "",
            toNumOrNull(noOfFirms),
            toNumOrNull(male),
            toNumOrNull(female),
            toNumOrNull(total),
            notes || "",
            techPromo.project_name,
            techPromo.technology_promoted,
            techPromo.technology_generator,
            techPromo.mode_of_promotion,
            techPromo.customer_name,
            techPromo.customer_address,
            techPromo.sex,
            techPromo.staff_name,
            techPromo.means_of_verification,
            techPromo.photos,
            toNumOrZero(technologiesPromotedTotal),
            toNumOrZero(promotionalActivitiesPressRelease),
            toNullIfEmpty(pwd),
            toNullIfEmpty(fourPs),
            toNullIfEmpty(ip),
            toNullIfEmpty(seniors),
            toNullIfEmpty(tacsConsultancyType),
            toNullIfEmpty(tacsDateEngagement),
            toNullIfEmpty(tacsExpertInstitution),
            toNullIfEmpty(tacsCustomerName),
            toNullIfEmpty(tacsCustomerSex),
            toNullIfEmpty(tacsCustomerAddress),
            mapTacsAddressMeta(tacsCustomerAddressMeta),
            toNullIfEmpty(tacsMeansVerification),
            toNumOrNull(tacsNoOfAdvice),
            toNullIfEmpty(tacsRemarks),
            mapTacsAddressMeta(Array.isArray(tacsPhotos) ? tacsPhotos : []),
            toNullIfEmpty(trainingProgram),
            toNullIfEmpty(trainingStartDate),
            toNullIfEmpty(trainingEndDate),
            toNullIfEmpty(trainingProvince),
            techPromo.venue_address_meta || mapTacsAddressMeta(trainingVenueAddressMeta),
            toNumOrZero(noOfFirmsSucsHeisLgus),
            toNumOrZero(participantsFemale),
            toNumOrZero(participantsMale),
            toNumOrZero(seniorFemale),
            toNumOrZero(seniorMale),
            toNumOrZero(ipFemale),
            toNumOrZero(ipMale),
            toNumOrZero(fourPsFemale),
            toNumOrZero(fourPsMale),
            toNumOrZero(pwdFemale),
            toNumOrZero(pwdMale),
            toNumOrZero(totalFemale),
            toNumOrZero(totalMale),
            toNumOrZero(totalParticipants),
            toNullIfEmpty(listOfFirmsAssociations),
            toNullIfEmpty(nameOfTrainorAffiliation),
            toNullIfEmpty(programProjectUnit),
            toNumOrZero(dostCost),
            toNumOrZero(partnerAgencyCost),
            toNumOrZero(totalCost),
            toNullIfEmpty(notesRemarks),
            latitude,
            longitude,
            techrollout.techrollout_quarter,
            techrollout.techrollout_unit_center,
            techrollout.techrollout_name_of_technology_transferred,
            techrollout.techrollout_technology_generator,
            techrollout.techrollout_mode_of_transfer,
            techrollout.techrollout_is_dost_developed_funded,
            techrollout.techrollout_date_transferred,
            techrollout.techrollout_activity_title,
            techrollout.techrollout_activity_date,
            techrollout.techrollout_activity_venue,
            techrollout.techrollout_institution_name,
            techrollout.techrollout_institution_address,
            techrollout.techrollout_institution_address_meta,
            techrollout.techrollout_classification,
            techrollout.techrollout_representative_name,
            techrollout.techrollout_representative_designation,
            techrollout.techrollout_sex,
            packaging.packaging_quarter,
            packaging.packaging_province,
            packaging.packaging_date_completed,
            packaging.packaging_type_of_intervention,
            packaging.packaging_product_name,
            packaging.packaging_size_variant,
            packaging.packaging_materials_provided,
            packaging.packaging_customer_name,
            packaging.packaging_sex,
            packaging.packaging_firm_institution,
            packaging.packaging_address,
            packaging.packaging_address_meta,
            packaging.packaging_means_of_verification,
            packaging.packaging_photos,
            packaging.packaging_remarks,
            interventionId,
          ],
          (err, result) => {
            if (err) {
              return db.rollback(() => {
                console.error("UPDATE CEST INTERVENTION ERROR:", err);
                res.status(500).json({ message: err.message });
              });
            }

            if (!result.affectedRows) {
              return db.rollback(() => {
                res.status(404).json({ message: "CEST intervention not found" });
              });
            }

            syncCestTechnologyPromotionEntry(
              {
                projectId,
                interventionId,
                type,
                body: {
                  ...b,
                  title,
                  date: toNullIfEmpty(date),
                  venue: venue || "",
                },
              },
              (techPromoSyncErr) => {
                if (techPromoSyncErr) {
                  return db.rollback(() => {
                    console.error(
                      "UPDATE CEST INTERVENTION Technology Promotion sync ERROR:",
                      techPromoSyncErr
                    );
                    res.status(500).json({ message: techPromoSyncErr.message });
                  });
                }

                syncTacsEntryForIntervention(
                  {
                    projectId,
                    interventionId,
                    type,
                    body: {
                      ...b,
                      title,
                      date: toNullIfEmpty(date),
                      venue: venue || "",
                      tacsPhotos: Array.isArray(tacsPhotos) ? tacsPhotos : [],
                    },
                    source_module: "CEST",
                    source_table: "cest_interventions",
                  },
                  (tacsSyncErr) => {
                    if (tacsSyncErr) {
                      return db.rollback(() => {
                        console.error(
                          "UPDATE CEST INTERVENTION TACS sync ERROR:",
                          tacsSyncErr
                        );
                        res.status(500).json({ message: tacsSyncErr.message });
                      });
                    }

                    syncTechnologyTrainingEntryForIntervention(
                      {
                        projectId,
                        interventionId,
                        type,
                        body: {
                          ...b,
                          venue: venue || "",
                          latitude,
                          longitude,
                          male: toNumOrZero(totalMale),
                          female: toNumOrZero(totalFemale),
                          total: toNumOrZero(totalParticipants),
                        },
                        source_module: "cest",
                        source_label: "CEST",
                      },
                      (syncErr) => {
                        if (syncErr) {
                          return db.rollback(() => {
                            console.error(
                              "UPDATE CEST INTERVENTION Technology Training sync ERROR:",
                              syncErr
                            );
                            res.status(500).json({ message: syncErr.message });
                          });
                        }

                        syncCestTechnologyRolloutToTable(
                          {
                            projectId,
                            interventionId,
                            type,
                            title,
                            techrollout,
                          },
                          (techRolloutSyncErr) => {
                            if (techRolloutSyncErr) {
                              return db.rollback(() => {
                                console.error(
                                  "UPDATE CEST INTERVENTION Tech Roll Out table sync ERROR:",
                                  techRolloutSyncErr
                                );
                                res.status(500).json({ message: techRolloutSyncErr.message });
                              });
                            }

                            db.commit((commitErr) => {
                              if (commitErr) {
                                return db.rollback(() => {
                                  console.error(
                                    "UPDATE CEST INTERVENTION COMMIT ERROR:",
                                    commitErr
                                  );
                                  res.status(500).json({ message: commitErr.message });
                                });
                              }

                              res.json({ message: "CEST intervention updated" });
                            });
                          }
                        );
                      }
                    );
                  }
                );
              }
            );
          }
        );
      }
    );
  });
});

// DELETE intervention
app.delete("/cest-interventions/:id", (req, res) => {
  const interventionId = Number(req.params.id);

  db.beginTransaction((txErr) => {
    if (txErr) {
      console.error("DELETE CEST INTERVENTION TX ERROR:", txErr);
      return res.status(500).json({ message: txErr.message });
    }

    deletePackagingRecordByInterventionId(
      interventionId,
      (deletePackagingErr) => {
        if (deletePackagingErr) {
          return db.rollback(() => {
            console.error(
              "DELETE CEST INTERVENTION Packaging & Labeling delete ERROR:",
              deletePackagingErr
            );
            res.status(500).json({ message: deletePackagingErr.message });
          });
        }

        db.query(
          "DELETE FROM technology_training_entries WHERE intervention_id = ?",
          [interventionId],
          (deleteTrainingErr) => {
            if (deleteTrainingErr) {
              return db.rollback(() => {
                console.error(
                  "DELETE CEST INTERVENTION Technology Training delete ERROR:",
                  deleteTrainingErr
                );
                res.status(500).json({ message: deleteTrainingErr.message });
              });
            }

            deleteTacsEntryByInterventionId(
              interventionId,
              (deleteTacsErr) => {
                if (deleteTacsErr) {
                  return db.rollback(() => {
                    console.error(
                      "DELETE CEST INTERVENTION TACS delete ERROR:",
                      deleteTacsErr
                    );
                    res.status(500).json({
                      message: deleteTacsErr.message,
                    });
                  });
                }

                syncCestTechnologyPromotionEntry(
                  {
                    projectId: null,
                    interventionId,
                    type: "",
                    body: {},
                  },
                  (deleteTechPromoErr) => {
                    if (deleteTechPromoErr) {
                      return db.rollback(() => {
                        console.error(
                          "DELETE CEST INTERVENTION Technology Promotion delete ERROR:",
                          deleteTechPromoErr
                        );
                        res.status(500).json({
                          message: deleteTechPromoErr.message,
                        });
                      });
                    }

                    db.query(
                      "DELETE FROM technology_rollout WHERE intervention_id = ? AND source_module = ?",
                      [interventionId, "cest_interventions"],
                      (deleteTechRolloutErr) => {
                        if (deleteTechRolloutErr) {
                          return db.rollback(() => {
                            console.error(
                              "DELETE CEST INTERVENTION Tech Roll Out table delete ERROR:",
                              deleteTechRolloutErr
                            );
                            res.status(500).json({
                              message: deleteTechRolloutErr.message,
                            });
                          });
                        }

                        db.query(
                          "DELETE FROM cest_interventions WHERE id=?",
                          [interventionId],
                          (err, result) => {
                            if (err) {
                              return db.rollback(() => {
                                console.error(
                                  "DELETE CEST INTERVENTION ERROR:",
                                  err
                                );
                                res.status(500).json({ message: err.message });
                              });
                            }

                            if (!result.affectedRows) {
                              return db.rollback(() => {
                                res.status(404).json({
                                  message: "CEST intervention not found",
                                });
                              });
                            }

                            db.commit((commitErr) => {
                              if (commitErr) {
                                return db.rollback(() => {
                                  console.error(
                                    "DELETE CEST INTERVENTION COMMIT ERROR:",
                                    commitErr
                                  );
                                  res.status(500).json({
                                    message: commitErr.message,
                                  });
                                });
                              }

                              res.json({
                                message: "CEST intervention deleted",
                              });
                            });
                          }
                        );
                      }
                    );
                  }
                );
              },
              {
                source_module: "CEST",
                source_table: "cest_interventions",
              }
            );
          }
        );
      }
    );
  });
});

// ===========================
// ===========================
// CEST OTHER INDICATORS ROUTES
// ===========================
app.get("/cest/:id/other-indicators", (req, res) => {
  const projectId = req.params.id;

  db.query(
    "SELECT * FROM cest_other_indicators WHERE project_id=? LIMIT 1",
    [projectId],
    (err, rows) => {
      if (err) return res.status(500).json(err);
      res.json(rows[0] || null);
    }
  );
});

app.put("/cest/:id/other-indicators", (req, res) => {
  const projectId = req.params.id;
  const b = req.body || {};

  const jobs = b.jobsGenerated || {};
  const inc = b.jobsIncreasePct || {};
  const prod = b.productivityPct || {};
  const gross = b.grossSales || {};

  const sql = `
    INSERT INTO cest_other_indicators
      (project_id,
       jobs_q1,jobs_q2,jobs_q3,jobs_q4,
       jobs_inc_q1,jobs_inc_q2,jobs_inc_q3,jobs_inc_q4,
       prod_q1,prod_q2,prod_q3,prod_q4,
       gross_q1,gross_q2,gross_q3,gross_q4)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON DUPLICATE KEY UPDATE
      jobs_q1=VALUES(jobs_q1), jobs_q2=VALUES(jobs_q2), jobs_q3=VALUES(jobs_q3), jobs_q4=VALUES(jobs_q4),
      jobs_inc_q1=VALUES(jobs_inc_q1), jobs_inc_q2=VALUES(jobs_inc_q2), jobs_inc_q3=VALUES(jobs_inc_q3), jobs_inc_q4=VALUES(jobs_inc_q4),
      prod_q1=VALUES(prod_q1), prod_q2=VALUES(prod_q2), prod_q3=VALUES(prod_q3), prod_q4=VALUES(prod_q4),
      gross_q1=VALUES(gross_q1), gross_q2=VALUES(gross_q2), gross_q3=VALUES(gross_q3), gross_q4=VALUES(gross_q4)
  `;

  const vals = [
    projectId,
    Number(jobs.q1 || 0),
    Number(jobs.q2 || 0),
    Number(jobs.q3 || 0),
    Number(jobs.q4 || 0),

    Number(inc.q1 || 0),
    Number(inc.q2 || 0),
    Number(inc.q3 || 0),
    Number(inc.q4 || 0),

    Number(prod.q1 || 0),
    Number(prod.q2 || 0),
    Number(prod.q3 || 0),
    Number(prod.q4 || 0),

    Number(gross.q1 || 0),
    Number(gross.q2 || 0),
    Number(gross.q3 || 0),
    Number(gross.q4 || 0),
  ];

  db.query(sql, vals, (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "CEST other indicators saved" });
  });
});

app.delete("/cest/:id/other-indicators", (req, res) => {
  const projectId = req.params.id;

  db.query(
    "DELETE FROM cest_other_indicators WHERE project_id=?",
    [projectId],
    (err) => {
      if (err) return res.status(500).json(err);
      res.json({ message: "CEST other indicators deleted" });
    }
  );
});

// ===========================
// TACS TYPES ROUTES
// ===========================
app.get("/tacs-types", (req, res) => {
  db.query("SELECT * FROM tacs_types ORDER BY name ASC", (err, rows) => {
    if (err) return res.status(500).json(err);
    res.json(rows || []);
  });
});

app.post("/tacs-types", (req, res) => {
  const name = String(req.body?.name || "").trim();

  if (!name) {
    return res.status(400).json({ message: "Type name is required" });
  }

  db.query(
    "INSERT IGNORE INTO tacs_types (name) VALUES (?)",
    [name],
    (err) => {
      if (err) return res.status(500).json(err);

      db.query(
        "SELECT * FROM tacs_types WHERE name = ? LIMIT 1",
        [name],
        (err2, rows) => {
          if (err2) return res.status(500).json(err2);
          res.json(rows[0] || null);
        }
      );
    }
  );
});

app.get("/tacs-consultancy-types", (req, res) => {
  db.query("SELECT * FROM tacs_types ORDER BY name ASC", (err, rows) => {
    if (err) return res.status(500).json(err);
    res.json(rows || []);
  });
});

app.post("/tacs-consultancy-types", (req, res) => {
  const name = String(req.body?.name || "").trim();

  if (!name) {
    return res.status(400).json({ message: "Type name is required" });
  }

  db.query(
    "INSERT IGNORE INTO tacs_types (name) VALUES (?)",
    [name],
    (err) => {
      if (err) return res.status(500).json(err);

      db.query(
        "SELECT * FROM tacs_types WHERE name = ? LIMIT 1",
        [name],
        (err2, rows) => {
          if (err2) return res.status(500).json(err2);
          res.json(rows[0] || null);
        }
      );
    }
  );
});

app.delete("/tacs-consultancy-types/:name", (req, res) => {
  const name = String(req.params.name || "").trim();

  db.query("DELETE FROM tacs_types WHERE name = ?", [name], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "Consultancy type deleted" });
  });
});

// ===========================
// TACS ENTRY ROUTES
// ===========================
app.get("/tacs", (req, res) => {
  const hasServerPaging =
    req.query.page !== undefined ||
    req.query.limit !== undefined ||
    req.query.search !== undefined ||
    req.query.year !== undefined ||
    req.query.district !== undefined ||
    req.query.month !== undefined ||
    req.query.municipality !== undefined ||
    req.query.overall !== undefined;

  if (!hasServerPaging) {
    const sql = `
      SELECT *
      FROM tacs_entries
      ORDER BY
        COALESCE(date_of_engagement, created_at) DESC,
        created_at DESC,
        id DESC
    `;

    db.query(sql, (err, rows) => {
      if (err) return res.status(500).json(err);

      const normalized = (rows || []).map((row) => ({
        id: row.id,
        projectId: row.project_id ?? null,
        sourceModule: row.source_module || "",
        sourceTable: row.source_table || "",
        interventionId: row.intervention_id ?? null,
        typeOfConsultancy: row.type_of_consultancy || "",
        dateOfEngagement: row.date_of_engagement
          ? new Date(row.date_of_engagement).toISOString().slice(0, 10)
          : "",
        expertInstitution: row.expert_institution || "",
        customerName: row.customer_name || "",
        sex: row.sex || "",
        customerAddressText: row.customer_address_text || "",
        customerAddressMeta: parseJsonSafe(row.customer_address_meta),
        adviceCount: Number(row.advice_count ?? 0),
        meansOfVerification: row.means_of_verification || "",
        photos: parseJsonSafe(row.photos) || [],
        staffName: row.staff_name || "",
        nameOfStaff: row.staff_name || "",
        custom_fields: parseJsonSafe(row.custom_fields) || {},
        customFields: parseJsonSafe(row.custom_fields) || {},
        created_at: row.created_at,
        updated_at: row.updated_at,
      }));

      res.json(normalized);
    });

    return;
  }

  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.max(1, Math.min(100, Number(req.query.limit || 10)));
  const offset = (page - 1) * limit;

  const { whereSql, params } = buildTacsWhere(req.query);

  const countSql = `
    SELECT COUNT(*) AS total
    FROM tacs_entries
    ${whereSql}
  `;

  db.query(countSql, params, (countErr, countRows) => {
    if (countErr) {
      console.error("GET /tacs count ERROR:", countErr);
      return res.status(500).json({ message: countErr.message });
    }

    const total = Number(countRows?.[0]?.total || 0);
    const totalPages = Math.max(1, Math.ceil(total / limit));

    const dataSql = `
      SELECT *
      FROM tacs_entries
      ${whereSql}
      ORDER BY
        COALESCE(date_of_engagement, created_at) DESC,
        created_at DESC,
        id DESC
      LIMIT ? OFFSET ?
    `;

    db.query(dataSql, [...params, limit, offset], (err, rows) => {
      if (err) {
        console.error("GET /tacs ERROR:", err);
        return res.status(500).json({ message: err.message });
      }

      const normalized = (rows || []).map((row) => ({
        id: row.id,
        projectId: row.project_id ?? null,
        sourceModule: row.source_module || "",
        sourceTable: row.source_table || "",
        interventionId: row.intervention_id ?? null,
        typeOfConsultancy: row.type_of_consultancy || "",
        dateOfEngagement: row.date_of_engagement
          ? new Date(row.date_of_engagement).toISOString().slice(0, 10)
          : "",
        expertInstitution: row.expert_institution || "",
        customerName: row.customer_name || "",
        sex: row.sex || "",
        customerAddressText: row.customer_address_text || "",
        customerAddressMeta: parseJsonSafe(row.customer_address_meta),
        adviceCount: Number(row.advice_count ?? 0),
        meansOfVerification: row.means_of_verification || "",
        photos: parseJsonSafe(row.photos) || [],
        staffName: row.staff_name || "",
        nameOfStaff: row.staff_name || "",
        custom_fields: parseJsonSafe(row.custom_fields) || {},
        customFields: parseJsonSafe(row.custom_fields) || {},
        created_at: row.created_at,
        updated_at: row.updated_at,
      }));

      return res.json({
        data: normalized,
        total,
        totalPages,
        page,
        limit,
      });
    });
  });
});

app.post("/tacs", (req, res) => {
  const b = req.body || {};

  const sql = `
    INSERT INTO tacs_entries (
      id,
      project_id,
      source_module,
      source_table,
      intervention_id,
      type_of_consultancy,
      date_of_engagement,
      expert_institution,
      customer_name,
      sex,
      customer_address_text,
      customer_address_meta,
      advice_count,
      means_of_verification,
      photos,
      staff_name,
      custom_fields
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [
      b.id,
      toNumOrNull(b.projectId ?? b.project_id),
      toNullIfEmpty(b.sourceModule ?? b.source_module),
      toNullIfEmpty(b.sourceTable ?? b.source_table),
      toNumOrNull(b.interventionId ?? b.intervention_id),
      toNullIfEmpty(b.typeOfConsultancy ?? b.type_of_consultancy),
      toNullIfEmpty(b.dateOfEngagement ?? b.date_of_engagement),
      toNullIfEmpty(b.expertInstitution ?? b.expert_institution),
      toNullIfEmpty(b.customerName ?? b.customer_name),
      toNullIfEmpty(b.sex),
      toNullIfEmpty(b.customerAddressText ?? b.customer_address_text),
      mapTacsAddressMeta(b.customerAddressMeta ?? b.customer_address_meta),
      toNumOrZero(b.adviceCount ?? b.advice_count),
      toNullIfEmpty(b.meansOfVerification ?? b.means_of_verification),
      mapTacsAddressMeta(Array.isArray(b.photos) ? b.photos : []),
      toNullIfEmpty(b.staffName ?? b.nameOfStaff ?? b.staff_name),
      mapTacsAddressMeta(b.custom_fields ?? b.customFields ?? {}),
    ],
    (err) => {
      if (err) return res.status(500).json(err);
      res.json({ message: "TACS entry created", id: b.id });
    }
  );
});

app.put("/tacs/:id", (req, res) => {
  const b = req.body || {};

  const sql = `
    UPDATE tacs_entries SET
      project_id=?,
      source_module=?,
      source_table=?,
      intervention_id=?,
      type_of_consultancy=?,
      date_of_engagement=?,
      expert_institution=?,
      customer_name=?,
      sex=?,
      customer_address_text=?,
      customer_address_meta=?,
      advice_count=?,
      means_of_verification=?,
      photos=?,
      staff_name=?,
      custom_fields=?
    WHERE id=?
  `;

  db.query(
    sql,
    [
      toNumOrNull(b.projectId ?? b.project_id),
      toNullIfEmpty(b.sourceModule ?? b.source_module),
      toNullIfEmpty(b.sourceTable ?? b.source_table),
      toNumOrNull(b.interventionId ?? b.intervention_id),
      toNullIfEmpty(b.typeOfConsultancy ?? b.type_of_consultancy),
      toNullIfEmpty(b.dateOfEngagement ?? b.date_of_engagement),
      toNullIfEmpty(b.expertInstitution ?? b.expert_institution),
      toNullIfEmpty(b.customerName ?? b.customer_name),
      toNullIfEmpty(b.sex),
      toNullIfEmpty(b.customerAddressText ?? b.customer_address_text),
      mapTacsAddressMeta(b.customerAddressMeta ?? b.customer_address_meta),
      toNumOrZero(b.adviceCount ?? b.advice_count),
      toNullIfEmpty(b.meansOfVerification ?? b.means_of_verification),
      mapTacsAddressMeta(Array.isArray(b.photos) ? b.photos : []),
      toNullIfEmpty(b.staffName ?? b.nameOfStaff ?? b.staff_name),
      mapTacsAddressMeta(b.custom_fields ?? b.customFields ?? {}),
      req.params.id,
    ],
    (err) => {
      if (err) return res.status(500).json(err);
      res.json({ message: "TACS entry updated" });
    }
  );
});

app.delete("/tacs/:id", (req, res) => {
  db.query("DELETE FROM tacs_entries WHERE id=?", [req.params.id], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "TACS entry deleted" });
  });
});


// ===========================
// TACS HELPERS
// ===========================
const TACS_PANGASINAN_DISTRICTS = {
  "District 1": [
    "Agno",
    "Alaminos City",
    "Anda",
    "Bani",
    "Bolinao",
    "Burgos",
    "Dasol",
    "Infanta",
    "Mabini",
    "Sual",
  ],
  "District 2": [
    "Aguilar",
    "Basista",
    "Binmaley",
    "Bugallon",
    "Labrador",
    "Lingayen",
    "Mangatarem",
    "Urbiztondo",
  ],
  "District 3": [
    "Bayambang",
    "Calasiao",
    "Malasiqui",
    "Mapandan",
    "San Carlos City",
    "Santa Barbara",
  ],
  "District 4": [
    "Dagupan City",
    "Manaoag",
    "Mangaldan",
    "San Fabian",
    "San Jacinto",
  ],
  "District 5": [
    "Alcala",
    "Bautista",
    "Binalonan",
    "Laoac",
    "Pozorrubio",
    "Santo Tomas",
    "Sison",
    "Urdaneta City",
    "Villasis",
  ],
  "District 6": [
    "Asingan",
    "Balungao",
    "Natividad",
    "Rosales",
    "San Manuel",
    "San Nicolas",
    "San Quintin",
    "Santa Maria",
    "Tayug",
    "Umingan",
  ],
};

const normalizeTacsDistrictKey = (value = "") => {
  const raw = String(value || "").trim();
  if (!raw || raw.toUpperCase() === "ALL") return "ALL";

  const collapsed = raw.replace(/\s+/g, "").toLowerCase();
  const match = collapsed.match(/^district(\d+)$/);

  if (match) return `District ${match[1]}`;
  return raw.replace(/\s+/g, " ");
};

const buildTacsWhere = (query = {}) => {
  const where = [];
  const params = [];

  const search = String(query.search || "").trim();
  const year = String(query.year || "").trim();
  const district = normalizeTacsDistrictKey(query.district || "ALL");
  const month = String(query.month || "").trim();
  const municipality = String(query.municipality || "").trim();
  const overall = String(query.overall || "overall").trim().toLowerCase();

  const customerMetaMunicipalityExpr =
    "COALESCE(JSON_UNQUOTE(JSON_EXTRACT(customer_address_meta, '$.municipality')), '')";

  const customerLatExpr =
    "CAST(JSON_UNQUOTE(JSON_EXTRACT(customer_address_meta, '$.lat')) AS DECIMAL(18,10))";
  const customerLngExpr =
    "CAST(JSON_UNQUOTE(JSON_EXTRACT(customer_address_meta, '$.lng')) AS DECIMAL(18,10))";

  if (search) {
    const like = `%${search}%`;
    where.push(`(
      customer_name LIKE ?
      OR expert_institution LIKE ?
      OR type_of_consultancy LIKE ?
      OR customer_address_text LIKE ?
      OR means_of_verification LIKE ?
    )`);
    params.push(like, like, like, like, like);
  }

  if (year && year !== "ALL" && String(year).toLowerCase() !== "all") {
    where.push("YEAR(COALESCE(date_of_engagement, created_at)) = ?");
    params.push(Number(year));
  }

  if (month && month !== "ALL" && String(month).toLowerCase() !== "all") {
    where.push("MONTH(COALESCE(date_of_engagement, created_at)) = ?");
    params.push(Number(month));
  }

  if (district && district !== "ALL") {
    const municipalitiesForDistrict = TACS_PANGASINAN_DISTRICTS[district] || [];
    if (!municipalitiesForDistrict.length) {
      where.push("1 = 0");
    } else {
      const jsonPlaceholders = municipalitiesForDistrict.map(() => "?").join(",");
      const likeClauses = municipalitiesForDistrict
        .map(() => "customer_address_text LIKE ?")
        .join(" OR ");
      where.push(`(
        ${customerMetaMunicipalityExpr} IN (${jsonPlaceholders})
        OR (${likeClauses})
      )`);
      params.push(
        ...municipalitiesForDistrict,
        ...municipalitiesForDistrict.map((m) => `%${m}%`)
      );
    }
  }

  if (municipality && municipality !== "ALL" && municipality.toLowerCase() !== "all") {
    where.push(`(
      ${customerMetaMunicipalityExpr} = ?
      OR customer_address_text LIKE ?
    )`);
    params.push(municipality, `%${municipality}%`);
  }

  if (overall === "with-coordinates") {
    where.push(`(
      ${customerLatExpr} IS NOT NULL
      AND ${customerLngExpr} IS NOT NULL
    )`);
  } else if (overall === "without-coordinates") {
    where.push(`(
      ${customerLatExpr} IS NULL
      OR ${customerLngExpr} IS NULL
    )`);
  }

  return {
    whereSql: where.length ? `WHERE ${where.join(" AND ")}` : "",
    params,
  };
};

// ===========================
// TECHNOLOGY PROMOTION ROUTES
// ===========================
app.get("/technology-promotion/lookups", (req, res) => {
  ensureTechnologyPromotionDefaults((err) => {
    if (err) {
      console.error("GET /technology-promotion/lookups ERROR:", err);
      return res.status(500).json({ message: err.message });
    }

    db.query(
      "SELECT name FROM tp_projects ORDER BY name ASC",
      (errP, projectRows) => {
        if (errP) {
          console.error("TP lookups projects ERROR:", errP);
          return res.status(500).json({ message: errP.message });
        }

        db.query(
          "SELECT name FROM tp_modes ORDER BY name ASC",
          (errM, modeRows) => {
            if (errM) {
              console.error("TP lookups modes ERROR:", errM);
              return res.status(500).json({ message: errM.message });
            }

            res.json({
              projects: (projectRows || []).map((x) => x.name),
              modes: (modeRows || []).map((x) => x.name),
            });
          }
        );
      }
    );
  });
});

app.post("/technology-promotion/projects", (req, res) => {
  const name = String(req.body?.name || "").trim();

  if (!name) {
    return res.status(400).json({ message: "Project name is required." });
  }

  db.query(
    "INSERT IGNORE INTO tp_projects (name) VALUES (?)",
    [name],
    (err) => {
      if (err) {
        console.error("POST /technology-promotion/projects ERROR:", err);
        return res.status(500).json({ message: err.message });
      }

      res.json({ success: true, name });
    }
  );
});

app.post("/technology-promotion/modes", (req, res) => {
  const name = String(req.body?.name || "").trim();

  if (!name) {
    return res.status(400).json({ message: "Mode name is required." });
  }

  db.query(
    "INSERT IGNORE INTO tp_modes (name) VALUES (?)",
    [name],
    (err) => {
      if (err) {
        console.error("POST /technology-promotion/modes ERROR:", err);
        return res.status(500).json({ message: err.message });
      }

      res.json({ success: true, name });
    }
  );
});

// ===========================
// TECHNOLOGY PROMOTION BACKEND PAGINATION HELPERS
// ===========================
const TP_PANGASINAN_DISTRICTS = {
  "District 1": [
    "Agno",
    "Alaminos City",
    "Anda",
    "Bani",
    "Bolinao",
    "Burgos",
    "Dasol",
    "Infanta",
    "Mabini",
    "Sual",
  ],
  "District 2": [
    "Aguilar",
    "Basista",
    "Binmaley",
    "Bugallon",
    "Labrador",
    "Lingayen",
    "Mangatarem",
    "Urbiztondo",
  ],
  "District 3": [
    "Bayambang",
    "Calasiao",
    "Malasiqui",
    "Mapandan",
    "San Carlos City",
    "Santa Barbara",
  ],
  "District 4": [
    "Dagupan City",
    "Manaoag",
    "Mangaldan",
    "San Fabian",
    "San Jacinto",
  ],
  "District 5": [
    "Alcala",
    "Bautista",
    "Binalonan",
    "Laoac",
    "Pozorrubio",
    "Santo Tomas",
    "Sison",
    "Urdaneta City",
    "Villasis",
  ],
  "District 6": [
    "Asingan",
    "Balungao",
    "Natividad",
    "Rosales",
    "San Manuel",
    "San Nicolas",
    "San Quintin",
    "Santa Maria",
    "Tayug",
    "Umingan",
  ],
};

const normalizeTechnologyPromotionDistrictKey = (value = "") => {
  const raw = String(value || "").trim();
  if (!raw || raw.toUpperCase() === "ALL") return "ALL";

  const collapsed = raw.replace(/\s+/g, "").toLowerCase();
  const match = collapsed.match(/^district(\d+)$/);

  if (match) return `District ${match[1]}`;
  return raw.replace(/\s+/g, " ");
};

const buildTechnologyPromotionWhere = (query = {}) => {
  const where = [];
  const params = [];

  const project = String(query.project ?? "ALL").trim();
  const year = String(query.year ?? "ALL").trim();
  const month = String(query.month ?? "ALL").trim();
  const search = String(query.search ?? "").trim();
  const municipality = String(query.municipality ?? "ALL").trim();
  const district = normalizeTechnologyPromotionDistrictKey(query.district ?? "ALL");
  const view = String(query.view ?? query.source ?? "OVERALL").trim().toUpperCase();

  if (project && project !== "ALL") {
    if (project === "__NONE__" || project === "(None)") {
      where.push("(project_name IS NULL OR TRIM(project_name) = '')");
    } else {
      where.push("project_name = ?");
      params.push(project);
    }
  }

  if (year && year !== "ALL" && year.toLowerCase() !== "all") {
    where.push("YEAR(activity_date) = ?");
    params.push(Number(year));
  }

  if (month && month !== "ALL" && month.toLowerCase() !== "all") {
    where.push("MONTH(activity_date) = ?");
    params.push(Number(month));
  }

  if (municipality && municipality !== "ALL" && municipality.toLowerCase() !== "all") {
    where.push(`(
      venue_municipality = ?
      OR activity_venue_address LIKE ?
      OR venue_display_text LIKE ?
    )`);
    params.push(municipality, `%${municipality}%`, `%${municipality}%`);
  }

  if (district && district !== "ALL") {
    const municipalitiesForDistrict = TP_PANGASINAN_DISTRICTS[district] || [];
    if (!municipalitiesForDistrict.length) {
      where.push("1 = 0");
    } else {
      const placeholders = municipalitiesForDistrict.map(() => "?").join(",");
      const addressLikes = municipalitiesForDistrict
        .map(() => "activity_venue_address LIKE ?")
        .join(" OR ");
      const venueLikes = municipalitiesForDistrict
        .map(() => "venue_display_text LIKE ?")
        .join(" OR ");

      where.push(`(
        venue_municipality IN (${placeholders})
        OR (${addressLikes})
        OR (${venueLikes})
      )`);

      params.push(
        ...municipalitiesForDistrict,
        ...municipalitiesForDistrict.map((m) => `%${m}%`),
        ...municipalitiesForDistrict.map((m) => `%${m}%`)
      );
    }
  }

  if (view === "MANUAL") {
    where.push("(source_module IS NULL OR TRIM(source_module) = '')");
  } else if (view === "SYNCED") {
    where.push("(source_module IS NOT NULL AND TRIM(source_module) <> '')");
  }

  if (search) {
    const like = `%${search}%`;
    where.push(`(
      project_name LIKE ?
      OR activity_date LIKE ?
      OR technology_promoted LIKE ?
      OR technology_generator LIKE ?
      OR mode_of_promotion LIKE ?
      OR activity_title LIKE ?
      OR activity_venue_address LIKE ?
      OR venue_display_text LIKE ?
      OR venue_municipality LIKE ?
      OR venue_barangay LIKE ?
      OR customer_name LIKE ?
      OR customer_address LIKE ?
      OR sex LIKE ?
      OR means_of_verification LIKE ?
      OR staff_name LIKE ?
      OR source_module LIKE ?
      OR source_type LIKE ?
    )`);
    params.push(
      like,
      like,
      like,
      like,
      like,
      like,
      like,
      like,
      like,
      like,
      like,
      like,
      like,
      like,
      like,
      like,
      like
    );
  }

  return {
    whereSql: where.length ? `WHERE ${where.join(" AND ")}` : "",
    params,
  };
};

const attachTechnologyPromotionPhotos = (rows, callback) => {
  const list = Array.isArray(rows) ? rows : [];

  if (!list.length) return callback(null, []);

  const ids = list.map((r) => r.id).filter((id) => id !== null && id !== undefined);

  if (!ids.length) {
    return callback(
      null,
      list.map((row) => normalizeTechnologyPromotionEntry(row, []))
    );
  }

  const placeholders = ids.map(() => "?").join(",");

  db.query(
    `
    SELECT entry_id, file_name, mime_type, file_data
    FROM technology_promotion_photos
    WHERE entry_id IN (${placeholders})
    ORDER BY id ASC
    `,
    ids,
    (photoErr, photoRows) => {
      if (photoErr) return callback(photoErr);

      const photoMap = {};
      (photoRows || []).forEach((p) => {
        if (!photoMap[p.entry_id]) photoMap[p.entry_id] = [];
        photoMap[p.entry_id].push({
          name: p.file_name,
          type: p.mime_type,
          dataUrl: p.file_data,
        });
      });

      const payload = list.map((row) =>
        normalizeTechnologyPromotionEntry(row, photoMap[row.id] || [])
      );

      callback(null, payload);
    }
  );
};

app.get("/technology-promotion/entries", (req, res) => {
  const hasServerPaging =
    req.query.page !== undefined ||
    req.query.limit !== undefined ||
    req.query.search !== undefined ||
    req.query.month !== undefined ||
    req.query.district !== undefined ||
    req.query.municipality !== undefined ||
    req.query.view !== undefined ||
    req.query.source !== undefined;

  const { whereSql, params } = buildTechnologyPromotionWhere(req.query);

  if (!hasServerPaging) {
    const sql = `
      SELECT *
      FROM technology_promotion_entries
      ${whereSql}
      ORDER BY COALESCE(activity_date, created_at) DESC, created_at DESC, id DESC
    `;

    db.query(sql, params, (err, rows) => {
      if (err) {
        console.error("GET /technology-promotion/entries ERROR:", err);
        return res.status(500).json({ message: err.message });
      }

      attachTechnologyPromotionPhotos(rows || [], (photoErr, payload) => {
        if (photoErr) {
          console.error("GET TP photos ERROR:", photoErr);
          return res.status(500).json({ message: photoErr.message });
        }

        res.json(payload);
      });
    });

    return;
  }

  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.max(1, Math.min(100, Number(req.query.limit || 10)));
  const offset = (page - 1) * limit;

  const countSql = `
    SELECT COUNT(*) AS total
    FROM technology_promotion_entries
    ${whereSql}
  `;

  db.query(countSql, params, (countErr, countRows) => {
    if (countErr) {
      console.error("GET /technology-promotion/entries count ERROR:", countErr);
      return res.status(500).json({ message: countErr.message });
    }

    const total = Number(countRows?.[0]?.total || 0);
    const totalPages = Math.max(1, Math.ceil(total / limit));

    const dataSql = `
      SELECT *
      FROM technology_promotion_entries
      ${whereSql}
      ORDER BY COALESCE(activity_date, created_at) DESC, created_at DESC, id DESC
      LIMIT ? OFFSET ?
    `;

    db.query(dataSql, [...params, limit, offset], (err, rows) => {
      if (err) {
        console.error("GET /technology-promotion/entries data ERROR:", err);
        return res.status(500).json({ message: err.message });
      }

      attachTechnologyPromotionPhotos(rows || [], (photoErr, payload) => {
        if (photoErr) {
          console.error("GET TP photos ERROR:", photoErr);
          return res.status(500).json({ message: photoErr.message });
        }

        res.json({
          data: payload,
          total,
          totalPages,
          page,
          limit,
        });
      });
    });
  });
});

app.post("/technology-promotion/entries", (req, res) => {
  const body = req.body || {};
  const venue = body.activityVenueMeta || {};
  const photos = Array.isArray(body.photos) ? body.photos : [];

  const requiredChecks = [
    [body.activityDate, "Activity Date is required."],
    [body.technologyPromoted, "Technology Promoted is required."],
    [body.technologyGenerator, "Technology Generator is required."],
    [body.modeOfPromotion, "Mode of Promotion is required."],
    [body.activityTitle, "Activity Title is required."],
    [body.activityVenueAddress, "Activity Venue/Address is required."],
    [body.customerName, "Customer name is required."],
    [body.customerAddress, "Customer address is required."],
    [body.staffName, "Staff name is required."],
  ];

  for (const [value, message] of requiredChecks) {
    if (!String(value || "").trim()) {
      return res.status(400).json({ message });
    }
  }

  const insertSql = [
    "INSERT INTO technology_promotion_entries (",
    "  project_name,",
    "  activity_date,",
    "  technology_promoted,",
    "  technology_generator,",
    "  mode_of_promotion,",
    "  activity_title,",
    "  activity_venue_address,",
    "  venue_mode,",
    "  venue_display_text,",
    "  venue_province,",
    "  venue_municipality,",
    "  venue_barangay,",
    "  venue_lat,",
    "  venue_lng,",
    "  customer_name,",
    "  customer_address,",
    "  sex,",
    "  means_of_verification,",
    "  staff_name,",
    "  custom_fields",
    ") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ].join("\n");

  db.query(
    insertSql,
    [
      String(body.project || "").trim() || null,
      String(body.activityDate || "").trim(),
      String(body.technologyPromoted || "").trim(),
      String(body.technologyGenerator || "").trim(),
      String(body.modeOfPromotion || "").trim(),
      String(body.activityTitle || "").trim(),
      String(body.activityVenueAddress || "").trim(),
      toNullIfEmpty(venue.mode),
      toNullIfEmpty(venue.displayText || venue.manualText || body.activityVenueAddress || null),
      toNullIfEmpty(venue.province),
      toNullIfEmpty(venue.municipality),
      toNullIfEmpty(venue.barangay),
      toNumOrNull(venue.lat),
      toNumOrNull(venue.lng),
      String(body.customerName || "").trim(),
      String(body.customerAddress || "").trim(),
      String(body.sex || "N/A").trim() || "N/A",
      String(body.meansOfVerification || "").trim(),
      String(body.staffName || "").trim(),
      JSON.stringify(body.custom_fields || body.customFields || {}),
    ],
    (insertErr, result) => {
      if (insertErr) {
        console.error("TP INSERT entry ERROR:", insertErr);
        return res.status(500).json({ message: insertErr.message });
      }

      const entryId = Number(result.insertId);

      saveTechnologyPromotionPhotos(entryId, photos, (photoErr) => {
        if (photoErr) {
          console.error("TP INSERT photos ERROR:", photoErr);
          return res.status(500).json({ message: photoErr.message });
        }

        res.json({ success: true, id: entryId });
      });
    }
  );
});

app.put("/technology-promotion/entries/:id", (req, res) => {
  const entryId = Number(req.params.id);
  const body = req.body || {};
  const venue = body.activityVenueMeta || {};
  const photos = Array.isArray(body.photos) ? body.photos : [];

  if (!Number.isFinite(entryId) || entryId <= 0) {
    return res.status(400).json({ message: "Invalid entry ID." });
  }

  const requiredChecks = [
    [body.activityDate, "Activity Date is required."],
    [body.technologyPromoted, "Technology Promoted is required."],
    [body.technologyGenerator, "Technology Generator is required."],
    [body.modeOfPromotion, "Mode of Promotion is required."],
    [body.activityTitle, "Activity Title is required."],
    [body.activityVenueAddress, "Activity Venue/Address is required."],
    [body.customerName, "Customer name is required."],
    [body.customerAddress, "Customer address is required."],
    [body.staffName, "Staff name is required."],
  ];

  for (const [value, message] of requiredChecks) {
    if (!String(value || "").trim()) {
      return res.status(400).json({ message });
    }
  }

  const updateSql = [
    "UPDATE technology_promotion_entries",
    "SET",
    "  project_name = ?,",
    "  activity_date = ?,",
    "  technology_promoted = ?,",
    "  technology_generator = ?,",
    "  mode_of_promotion = ?,",
    "  activity_title = ?,",
    "  activity_venue_address = ?,",
    "  venue_mode = ?,",
    "  venue_display_text = ?,",
    "  venue_province = ?,",
    "  venue_municipality = ?,",
    "  venue_barangay = ?,",
    "  venue_lat = ?,",
    "  venue_lng = ?,",
    "  customer_name = ?,",
    "  customer_address = ?,",
    "  sex = ?,",
    "  means_of_verification = ?,",
    "  staff_name = ?,",
    "  custom_fields = ?",
    "WHERE id = ?"
  ].join("\n");

  db.query(
    updateSql,
    [
      String(body.project || "").trim() || null,
      String(body.activityDate || "").trim(),
      String(body.technologyPromoted || "").trim(),
      String(body.technologyGenerator || "").trim(),
      String(body.modeOfPromotion || "").trim(),
      String(body.activityTitle || "").trim(),
      String(body.activityVenueAddress || "").trim(),
      toNullIfEmpty(venue.mode),
      toNullIfEmpty(venue.displayText || venue.manualText || body.activityVenueAddress || null),
      toNullIfEmpty(venue.province),
      toNullIfEmpty(venue.municipality),
      toNullIfEmpty(venue.barangay),
      toNumOrNull(venue.lat),
      toNumOrNull(venue.lng),
      String(body.customerName || "").trim(),
      String(body.customerAddress || "").trim(),
      String(body.sex || "N/A").trim() || "N/A",
      String(body.meansOfVerification || "").trim(),
      String(body.staffName || "").trim(),
      JSON.stringify(body.custom_fields || body.customFields || {}),
      entryId,
    ],
    (updateErr, result) => {
      if (updateErr) {
        console.error("TP UPDATE entry ERROR:", updateErr);
        return res.status(500).json({ message: updateErr.message });
      }

      if (!result || result.affectedRows === 0) {
        return res.status(404).json({ message: "Entry not found." });
      }

      db.query(
        "DELETE FROM technology_promotion_photos WHERE entry_id = ?",
        [entryId],
        (deletePhotoErr) => {
          if (deletePhotoErr) {
            console.error("TP DELETE old photos ERROR:", deletePhotoErr);
            return res.status(500).json({ message: deletePhotoErr.message });
          }

          saveTechnologyPromotionPhotos(entryId, photos, (photoErr) => {
            if (photoErr) {
              console.error("TP REINSERT photos ERROR:", photoErr);
              return res.status(500).json({ message: photoErr.message });
            }

            res.json({ success: true });
          });
        }
      );
    }
  );
});

app.delete("/technology-promotion/entries/:id", (req, res) => {
  const entryId = Number(req.params.id);

  if (!Number.isFinite(entryId) || entryId <= 0) {
    return res.status(400).json({ message: "Invalid entry ID." });
  }

  db.query(
    "DELETE FROM technology_promotion_entries WHERE id = ?",
    [entryId],
    (err, result) => {
      if (err) {
        console.error("DELETE /technology-promotion/entries/:id ERROR:", err);
        return res.status(500).json({ message: err.message });
      }

      if (!result || result.affectedRows === 0) {
        return res.status(404).json({ message: "Entry not found." });
      }

      res.json({ success: true });
    }
  );
});

app.get("/technology-promotion/summary", (req, res) => {
  const project = String(req.query.project ?? "ALL");
  const year = Number(req.query.year || new Date().getFullYear());

  let sql = `
    SELECT
      QUARTER(activity_date) AS quarter_no,
      COUNT(*) AS activities_total,
      COUNT(DISTINCT NULLIF(TRIM(technology_promoted), '')) AS technologies_total
    FROM technology_promotion_entries
    WHERE YEAR(activity_date) = ?
  `;
  const params = [year];

  if (project !== "ALL") {
    if (project === "") {
      sql += ` AND (project_name IS NULL OR project_name = '') `;
    } else {
      sql += ` AND project_name = ? `;
      params.push(project);
    }
  }

  sql += ` GROUP BY QUARTER(activity_date) ORDER BY quarter_no ASC `;

  db.query(sql, params, (err, rows) => {
    if (err) {
      console.error("GET /technology-promotion/summary ERROR:", err);
      return res.status(500).json({ message: err.message });
    }

    const q = {
      1: { activities: 0, technologies: 0 },
      2: { activities: 0, technologies: 0 },
      3: { activities: 0, technologies: 0 },
      4: { activities: 0, technologies: 0 },
    };

    (rows || []).forEach((row) => {
      const quarter = Number(row.quarter_no);
      q[quarter] = {
        activities: Number(row.activities_total || 0),
        technologies: Number(row.technologies_total || 0),
      };
    });

    res.json({
      technologies_promoted_total: {
        q1: q[1].technologies,
        q2: q[2].technologies,
        q3: q[3].technologies,
        q4: q[4].technologies,
        total:
          q[1].technologies +
          q[2].technologies +
          q[3].technologies +
          q[4].technologies,
      },
      promotional_activities_total: {
        q1: q[1].activities,
        q2: q[2].activities,
        q3: q[3].activities,
        q4: q[4].activities,
        total:
          q[1].activities +
          q[2].activities +
          q[3].activities +
          q[4].activities,
      },
    });
  });
});

// ===========================
// TECHNOLOGY TRAINING ROUTES
// ===========================
app.get("/technology-training/programs", (req, res) => {
  db.query(
    "SELECT * FROM technology_training_programs ORDER BY name ASC",
    (err, rows) => {
      if (err) {
        console.error("GET /technology-training/programs ERROR:", err);
        return res.status(500).json({ message: err.message });
      }

      res.json((rows || []).map((r) => r.name));
    }
  );
});

app.post("/technology-training/programs", (req, res) => {
  const name = String(req.body?.name || "").trim();

  if (!name) {
    return res.status(400).json({ message: "Program name is required." });
  }

  db.query(
    "INSERT IGNORE INTO technology_training_programs (name) VALUES (?)",
    [name],
    (err) => {
      if (err) {
        console.error("POST /technology-training/programs ERROR:", err);
        return res.status(500).json({ message: err.message });
      }

      res.json({ success: true, name });
    }
  );
});

app.get("/technology-training/entries", (req, res) => {
  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.max(1, Math.min(100, Number(req.query.limit || 10)));
  const offset = (page - 1) * limit;

  const { whereSql, params } = buildTechnologyTrainingWhere(req.query);

  const countSql = `
    SELECT COUNT(*) AS total
    FROM technology_training_entries
    ${whereSql}
  `;

  db.query(countSql, params, (countErr, countRows) => {
    if (countErr) {
      console.error("GET /technology-training/entries count ERROR:", countErr);
      return res.status(500).json({ message: countErr.message });
    }

    const total = Number(countRows?.[0]?.total || 0);
    const totalPages = Math.max(1, Math.ceil(total / limit));

    const dataSql = `
      SELECT *
      FROM technology_training_entries
      ${whereSql}
      ORDER BY
        CASE WHEN intervention_id IS NULL THEN 0 ELSE 1 END ASC,
        start_date DESC,
        id DESC
      LIMIT ? OFFSET ?
    `;

    db.query(dataSql, [...params, limit, offset], (err, rows) => {
      if (err) {
        console.error("GET /technology-training/entries ERROR:", err);
        return res.status(500).json({ message: err.message });
      }

      return res.json({
        data: (rows || []).map(normalizeTechnologyTrainingEntry),
        total,
        totalPages,
        page,
        limit,
      });
    });
  });
});

app.post("/technology-training/entries", (req, res) => {
  const body = req.body || {};

  const requiredChecks = [
    [body.startDate, "Start Date is required."],
    [body.title, "Title is required."],
    [body.venueAddress, "Venue/Address is required."],
  ];

  for (const [value, message] of requiredChecks) {
    if (!String(value || "").trim()) {
      return res.status(400).json({ message });
    }
  }

  const sql = `
    INSERT INTO technology_training_entries (
      project_id,
      intervention_id,
      source_module,
      source_label,
      program,
      province,
      start_date,
      end_date,
      title,
      venue_address,
      venue_meta,
      latitude,
      longitude,
      no_of_firms,
      participants_female,
      participants_male,
      senior_female,
      senior_male,
      ip_female,
      ip_male,
      fourps_female,
      fourps_male,
      pwd_female,
      pwd_male,
      total_female,
      total_male,
      total_participants,
      firms_sucs_heis_lgus_count,
      firms_associations_list,
      trainor_affiliation,
      program_project_unit,
      cost_dost,
      cost_partner_agency,
      name_of_staff,
      custom_fields
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [
      toNumOrNull(body.projectId ?? body.project_id),
      toNumOrNull(body.interventionId ?? body.intervention_id),
      String(body.sourceModule || body.source_module || "technology_training").trim(),
      String(body.sourceLabel || body.source_label || "Manual Technology Training Entry").trim(),
      String(body.program || "").trim(),
      String(body.province || "PANGASINAN").trim(),
      String(body.startDate || "").trim(),
      toNullIfEmpty(String(body.endDate || "").trim()),
      String(body.title || "").trim(),
      String(body.venueAddress || "").trim(),
      body.venueMeta ? JSON.stringify(body.venueMeta) : null,
      toNumOrNull(body.latitude ?? body.lat ?? body.venueMeta?.lat ?? body.venueMeta?.latitude),
      toNumOrNull(body.longitude ?? body.lng ?? body.venueMeta?.lng ?? body.venueMeta?.longitude),
      toNumOrZero(body.noOfFirms),

      toNumOrZero(body.participantsFemale),
      toNumOrZero(body.participantsMale),

      toNumOrZero(body.seniorFemale),
      toNumOrZero(body.seniorMale),

      toNumOrZero(body.ipFemale),
      toNumOrZero(body.ipMale),

      toNumOrZero(body.fourPsFemale),
      toNumOrZero(body.fourPsMale),

      toNumOrZero(body.pwdFemale),
      toNumOrZero(body.pwdMale),

      toNumOrZero(body.totalFemale ?? body.participantsFemale),
      toNumOrZero(body.totalMale ?? body.participantsMale),
      toNumOrZero(
        body.totalParticipants ??
        ((Number(body.totalFemale ?? body.participantsFemale ?? 0)) +
          (Number(body.totalMale ?? body.participantsMale ?? 0)))
      ),

      toNumOrZero(body.firmsSucsHeisLgusCount),
      String(body.firmsAssociationsList || "").trim(),
      String(body.trainorAffiliation || "").trim(),
      String(body.programProjectUnit || "").trim(),
      toNumOrZero(body.costDost),
      toNumOrZero(body.costPartnerAgency),
      toNullIfEmpty(body.staffName || body.nameOfStaff || body.name_of_staff || body.staff_name),
      JSON.stringify(body.custom_fields || body.customFields || {}),
    ],
    (err, result) => {
      if (err) {
        console.error("POST /technology-training/entries ERROR:", err);
        return res.status(500).json({ message: err.message });
      }

      res.json({
        success: true,
        id: result.insertId,
      });
    }
  );
});

app.put("/technology-training/entries/:id", (req, res) => {
  const entryId = Number(req.params.id);
  const body = req.body || {};

  const requiredChecks = [
    [body.startDate, "Start Date is required."],
    [body.title, "Title is required."],
    [body.venueAddress, "Venue/Address is required."],
  ];

  for (const [value, message] of requiredChecks) {
    if (!String(value || "").trim()) {
      return res.status(400).json({ message });
    }
  }

  const sql = `
    UPDATE technology_training_entries
    SET
      project_id = ?,
      intervention_id = ?,
      source_module = ?,
      source_label = ?,
      program = ?,
      province = ?,
      start_date = ?,
      end_date = ?,
      title = ?,
      venue_address = ?,
      venue_meta = ?,
      latitude = ?,
      longitude = ?,
      no_of_firms = ?,
      participants_female = ?,
      participants_male = ?,
      senior_female = ?,
      senior_male = ?,
      ip_female = ?,
      ip_male = ?,
      fourps_female = ?,
      fourps_male = ?,
      pwd_female = ?,
      pwd_male = ?,
      total_female = ?,
      total_male = ?,
      total_participants = ?,
      firms_sucs_heis_lgus_count = ?,
      firms_associations_list = ?,
      trainor_affiliation = ?,
      program_project_unit = ?,
      cost_dost = ?,
      cost_partner_agency = ?,
      name_of_staff = ?,
      custom_fields = ?
    WHERE id = ?
  `;

  db.query(
    sql,
    [
      toNumOrNull(body.projectId ?? body.project_id),
      toNumOrNull(body.interventionId ?? body.intervention_id),
      String(body.sourceModule || body.source_module || "technology_training").trim(),
      String(body.sourceLabel || body.source_label || "Manual Technology Training Entry").trim(),
      String(body.program || "").trim(),
      String(body.province || "PANGASINAN").trim(),
      String(body.startDate || "").trim(),
      toNullIfEmpty(String(body.endDate || "").trim()),
      String(body.title || "").trim(),
      String(body.venueAddress || "").trim(),
      body.venueMeta ? JSON.stringify(body.venueMeta) : null,
      toNumOrNull(body.latitude ?? body.lat ?? body.venueMeta?.lat ?? body.venueMeta?.latitude),
      toNumOrNull(body.longitude ?? body.lng ?? body.venueMeta?.lng ?? body.venueMeta?.longitude),
      toNumOrZero(body.noOfFirms),

      toNumOrZero(body.participantsFemale),
      toNumOrZero(body.participantsMale),

      toNumOrZero(body.seniorFemale),
      toNumOrZero(body.seniorMale),

      toNumOrZero(body.ipFemale),
      toNumOrZero(body.ipMale),

      toNumOrZero(body.fourPsFemale),
      toNumOrZero(body.fourPsMale),

      toNumOrZero(body.pwdFemale),
      toNumOrZero(body.pwdMale),

      toNumOrZero(body.totalFemale ?? body.participantsFemale),
      toNumOrZero(body.totalMale ?? body.participantsMale),
      toNumOrZero(
        body.totalParticipants ??
        ((Number(body.totalFemale ?? body.participantsFemale ?? 0)) +
          (Number(body.totalMale ?? body.participantsMale ?? 0)))
      ),

      toNumOrZero(body.firmsSucsHeisLgusCount),
      String(body.firmsAssociationsList || "").trim(),
      String(body.trainorAffiliation || "").trim(),
      String(body.programProjectUnit || "").trim(),
      toNumOrZero(body.costDost),
      toNumOrZero(body.costPartnerAgency),
      toNullIfEmpty(body.staffName || body.nameOfStaff || body.name_of_staff || body.staff_name),
      JSON.stringify(body.custom_fields || body.customFields || {}),
      entryId,
    ],
    (err) => {
      if (err) {
        console.error("PUT /technology-training/entries/:id ERROR:", err);
        return res.status(500).json({ message: err.message });
      }

      res.json({ success: true });
    }
  );
});

app.delete("/technology-training/entries/:id", (req, res) => {
  const entryId = Number(req.params.id);

  db.query(
    "DELETE FROM technology_training_entries WHERE id = ?",
    [entryId],
    (err) => {
      if (err) {
        console.error("DELETE /technology-training/entries/:id ERROR:", err);
        return res.status(500).json({ message: err.message });
      }

      res.json({ success: true });
    }
  );
});

app.get("/technology-training/summary", (req, res) => {
  const year = Number(req.query.year || new Date().getFullYear());

  const sql = `
    SELECT
      QUARTER(start_date) AS quarter_no,
      COUNT(*) AS trainings_total,
      SUM(COALESCE(total_participants, COALESCE(participants_female, 0) + COALESCE(participants_male, 0))) AS participants_total
    FROM technology_training_entries
    WHERE YEAR(start_date) = ?
    GROUP BY QUARTER(start_date)
    ORDER BY quarter_no ASC
  `;

  db.query(sql, [year], (err, rows) => {
    if (err) {
      console.error("GET /technology-training/summary ERROR:", err);
      return res.status(500).json({ message: err.message });
    }

    const q = {
      1: { trainings: 0, participants: 0 },
      2: { trainings: 0, participants: 0 },
      3: { trainings: 0, participants: 0 },
      4: { trainings: 0, participants: 0 },
    };

    (rows || []).forEach((row) => {
      const quarter = Number(row.quarter_no);
      q[quarter] = {
        trainings: Number(row.trainings_total || 0),
        participants: Number(row.participants_total || 0),
      };
    });

    res.json({
      trainingsConducted: {
        q1: q[1].trainings,
        q2: q[2].trainings,
        q3: q[3].trainings,
        q4: q[4].trainings,
        total: q[1].trainings + q[2].trainings + q[3].trainings + q[4].trainings,
      },
      participantsReached: {
        q1: q[1].participants,
        q2: q[2].participants,
        q3: q[3].participants,
        q4: q[4].participants,
        total:
          q[1].participants +
          q[2].participants +
          q[3].participants +
          q[4].participants,
      },
    });
  });
});


// ===========================
// TECHNOLOGY ROLL OUT ROUTES
// ===========================
const normalizeTechnologyRolloutEntry = (row) => ({
  id: Number(row.id),
  quarter: row.quarter ? String(row.quarter) : "",
  unitCenter: row.unit_center || "DOST-PANGASINAN",
  nameOfTechnologyTransferred: row.name_of_technology_transferred || "",
  technologyGenerator: row.technology_generator || "",
  modeOfTransfer: row.mode_of_transfer || "",
  isDostDevelopedFunded: Boolean(row.is_dost_developed_funded),
  dateTransferred: row.date_transferred ? formatDateOnly(row.date_transferred) : "",
  activityTitle: row.activity_title || "",
  activityDate: row.activity_date ? formatDateOnly(row.activity_date) : "",
  activityVenue: row.activity_venue || "",
  institutionName: row.institution_name || "",
  institutionAddress: row.institution_address || "",
  institutionAddressMeta: {
    mode: row.address_mode || null,
    manualText: row.address_manual_text || "",
    displayText: row.address_display_text || row.institution_address || "",
    province: row.address_province || "",
    municipality: row.address_municipality || "",
    barangay: row.address_barangay || "",
    lat:
      row.address_lat !== null && row.address_lat !== undefined
        ? Number(row.address_lat)
        : null,
    lng:
      row.address_lng !== null && row.address_lng !== undefined
        ? Number(row.address_lng)
        : null,
  },
  classification: row.classification || "",
  representativeName: row.representative_name || "",
  representativeDesignation: row.representative_designation || "",
  sex: row.sex || "",
  nameOfStaff: row.name_of_staff || "",
  staffName: row.name_of_staff || "",
  name_of_staff: row.name_of_staff || "",
  custom_fields: parseJsonSafe(row.custom_fields) || {},
  customFields: parseJsonSafe(row.custom_fields) || {},
  created_at: row.created_at,
  updated_at: row.updated_at,
});

const mapTechnologyRolloutPayload = (body = {}) => {
  const meta =
    body.institutionAddressMeta ||
    body.addressMeta || {
      mode: body.address_mode,
      manualText: body.address_manual_text,
      displayText: body.address_display_text,
      province: body.address_province,
      municipality: body.address_municipality,
      barangay: body.address_barangay,
      lat: body.address_lat,
      lng: body.address_lng,
    };

  const addressText = String(
    body.institutionAddress ||
    body.institution_address ||
    body.address ||
    body.address_display_text ||
    body.address_manual_text ||
    ""
  ).trim();

  return {
    quarter: toNumOrZero(body.quarter),
    unit_center: String(
      body.unitCenter || body.unit_center || "DOST-PANGASINAN"
    ).trim(),
    name_of_technology_transferred: String(
      body.nameOfTechnologyTransferred ||
      body.name_of_technology_transferred ||
      ""
    ).trim(),
    technology_generator: String(
      body.technologyGenerator ||
      body.technology_generator ||
      ""
    ).trim(),
    mode_of_transfer: String(
      body.modeOfTransfer || body.mode_of_transfer || ""
    ).trim(),
    is_dost_developed_funded:
      body.isDostDevelopedFunded === true ||
        body.is_dost_developed_funded === true ||
        Number(body.is_dost_developed_funded) === 1
        ? 1
        : 0,
    date_transferred: toNullIfEmpty(
      body.dateTransferred || body.date_transferred
    ),
    activity_title: String(
      body.activityTitle || body.activity_title || ""
    ).trim(),
    activity_date: toNullIfEmpty(
      body.activityDate || body.activity_date
    ),
    activity_venue: toNullIfEmpty(
      body.activityVenue || body.activity_venue
    ),
    institution_name: String(
      body.institutionName || body.institution_name || ""
    ).trim(),
    institution_address: addressText,
    address_mode: toNullIfEmpty(meta?.mode),
    address_manual_text: toNullIfEmpty(meta?.manualText),
    address_display_text: toNullIfEmpty(meta?.displayText || addressText),
    address_province: toNullIfEmpty(meta?.province),
    address_municipality: toNullIfEmpty(meta?.municipality),
    address_barangay: toNullIfEmpty(meta?.barangay),
    address_lat: toNumOrNull(meta?.lat),
    address_lng: toNumOrNull(meta?.lng),
    classification: String(body.classification || "").trim(),
    representative_name: String(
      body.representativeName || body.representative_name || ""
    ).trim(),
    representative_designation: toNullIfEmpty(
      body.representativeDesignation || body.representative_designation
    ),
    sex: toNullIfEmpty(body.sex),
    name_of_staff: toNullIfEmpty(
      body.nameOfStaff || body.name_of_staff || body.staffName || body.staff_name
    ),
    custom_fields: JSON.stringify(body.custom_fields || body.customFields || {}),
  };
};

const normalizeTechnologyRolloutDistrictKey = (value = "") => {
  const raw = String(value || "").trim();
  if (!raw || raw.toUpperCase() === "ALL") return "ALL";

  const collapsed = raw.replace(/\s+/g, "").toLowerCase();
  const match = collapsed.match(/^district(\d+)$/);

  if (match) return `District ${match[1]}`;
  return raw.replace(/\s+/g, " ");
};

app.get("/technology-rollout", (req, res) => {
  const hasServerPaging =
    req.query.page !== undefined ||
    req.query.limit !== undefined ||
    req.query.search !== undefined ||
    req.query.year !== undefined ||
    req.query.quarter !== undefined ||
    req.query.modeOfTransfer !== undefined ||
    req.query.month !== undefined ||
    req.query.district !== undefined ||
    req.query.municipality !== undefined;

  const year = String(req.query.year || new Date().getFullYear()).trim();
  const quarter = String(req.query.quarter || "ALL").trim();
  const modeOfTransfer = String(req.query.modeOfTransfer || "ALL").trim();
  const month = String(req.query.month || "ALL").trim();
  const district = normalizeTechnologyRolloutDistrictKey(req.query.district || "ALL");
  const municipality = String(req.query.municipality || "ALL").trim();
  const search = String(req.query.search || "").trim();

  const where = [];
  const params = [];

  if (year !== "ALL" && year !== "") {
    where.push("YEAR(activity_date) = ?");
    params.push(Number(year));
  }

  if (quarter !== "ALL" && quarter !== "") {
    where.push("quarter = ?");
    params.push(Number(quarter));
  }

  if (modeOfTransfer !== "ALL" && modeOfTransfer !== "") {
    where.push("mode_of_transfer = ?");
    params.push(modeOfTransfer);
  }

  if (month !== "ALL" && month !== "") {
    where.push("MONTH(activity_date) = ?");
    params.push(Number(month));
  }

  if (district !== "ALL" && district !== "") {
    const municipalitiesForDistrict = CEST_PANGASINAN_DISTRICTS[district] || [];
    if (!municipalitiesForDistrict.length) {
      where.push("1 = 0");
    } else {
      where.push(`address_municipality IN (${municipalitiesForDistrict.map(() => "?").join(",")})`);
      params.push(...municipalitiesForDistrict);
    }
  }

  if (municipality !== "ALL" && municipality !== "") {
    where.push("address_municipality = ?");
    params.push(municipality);
  }

  if (search) {
    const like = `%${search}%`;
    where.push(`(
      name_of_technology_transferred LIKE ?
      OR technology_generator LIKE ?
      OR mode_of_transfer LIKE ?
      OR activity_title LIKE ?
      OR activity_venue LIKE ?
      OR institution_name LIKE ?
      OR institution_address LIKE ?
      OR representative_name LIKE ?
      OR representative_designation LIKE ?
      OR unit_center LIKE ?
      OR classification LIKE ?
      OR address_municipality LIKE ?
      OR address_barangay LIKE ?
    )`);
    params.push(
      like, like, like, like, like, like, like,
      like, like, like, like, like, like
    );
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const orderSql = `ORDER BY activity_date DESC, id DESC`;

  if (!hasServerPaging) {
    const sql = `
      SELECT *
      FROM technology_rollout
      ${whereSql}
      ${orderSql}
    `;

    db.query(sql, params, (err, rows) => {
      if (err) {
        console.error("GET /technology-rollout ERROR:", err);
        return res.status(500).json({ message: err.message });
      }

      res.json((rows || []).map(normalizeTechnologyRolloutEntry));
    });
    return;
  }

  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.max(1, Math.min(100, Number(req.query.limit || 10)));
  const offset = (page - 1) * limit;

  const countSql = `
    SELECT COUNT(*) AS total
    FROM technology_rollout
    ${whereSql}
  `;

  db.query(countSql, params, (countErr, countRows) => {
    if (countErr) {
      console.error("GET /technology-rollout count ERROR:", countErr);
      return res.status(500).json({ message: countErr.message });
    }

    const total = Number(countRows?.[0]?.total || 0);
    const totalPages = Math.max(1, Math.ceil(total / limit));

    if (total === 0) {
      return res.json({
        rows: [],
        total: 0,
        totalPages,
        page,
        limit,
      });
    }

    const dataSql = `
      SELECT *
      FROM technology_rollout
      ${whereSql}
      ${orderSql}
      LIMIT ? OFFSET ?
    `;

    db.query(dataSql, [...params, limit, offset], (err, rows) => {
      if (err) {
        console.error("GET /technology-rollout data ERROR:", err);
        return res.status(500).json({ message: err.message });
      }

      return res.json({
        rows: (rows || []).map(normalizeTechnologyRolloutEntry),
        total,
        totalPages,
        page,
        limit,
      });
    });
  });
});

app.get("/technology-rollout/summary/:year", (req, res) => {
  const year = Number(req.params.year || new Date().getFullYear());

  const sql = `
    SELECT
      quarter,
      SUM(1) AS transferred_total,
      SUM(CASE WHEN is_dost_developed_funded = 1 THEN 1 ELSE 0 END) AS transferred_dost,
      SUM(1) AS adopters_total,
      SUM(CASE WHEN is_dost_developed_funded = 1 THEN 1 ELSE 0 END) AS adopters_dost
    FROM technology_rollout
    WHERE YEAR(activity_date) = ?
    GROUP BY quarter
    ORDER BY quarter ASC
  `;

  db.query(sql, [year], (err, rows) => {
    if (err) {
      console.error("GET /technology-rollout/summary/:year ERROR:", err);
      return res.status(500).json({ message: err.message });
    }

    const q = {
      1: { transferred_total: 0, transferred_dost: 0, adopters_total: 0, adopters_dost: 0 },
      2: { transferred_total: 0, transferred_dost: 0, adopters_total: 0, adopters_dost: 0 },
      3: { transferred_total: 0, transferred_dost: 0, adopters_total: 0, adopters_dost: 0 },
      4: { transferred_total: 0, transferred_dost: 0, adopters_total: 0, adopters_dost: 0 },
    };

    (rows || []).forEach((row) => {
      const quarter = Number(row.quarter);
      if (!q[quarter]) return;
      q[quarter] = {
        transferred_total: Number(row.transferred_total || 0),
        transferred_dost: Number(row.transferred_dost || 0),
        adopters_total: Number(row.adopters_total || 0),
        adopters_dost: Number(row.adopters_dost || 0),
      };
    });

    res.json({
      kpi2TotalTransferred: {
        q1: q[1].transferred_total,
        q2: q[2].transferred_total,
        q3: q[3].transferred_total,
        q4: q[4].transferred_total,
        total:
          q[1].transferred_total +
          q[2].transferred_total +
          q[3].transferred_total +
          q[4].transferred_total,
      },
      kpi2DostTransferred: {
        q1: q[1].transferred_dost,
        q2: q[2].transferred_dost,
        q3: q[3].transferred_dost,
        q4: q[4].transferred_dost,
        total:
          q[1].transferred_dost +
          q[2].transferred_dost +
          q[3].transferred_dost +
          q[4].transferred_dost,
      },
      kpi3TotalAdopters: {
        q1: q[1].adopters_total,
        q2: q[2].adopters_total,
        q3: q[3].adopters_total,
        q4: q[4].adopters_total,
        total:
          q[1].adopters_total +
          q[2].adopters_total +
          q[3].adopters_total +
          q[4].adopters_total,
      },
      kpi3DostAdopters: {
        q1: q[1].adopters_dost,
        q2: q[2].adopters_dost,
        q3: q[3].adopters_dost,
        q4: q[4].adopters_dost,
        total:
          q[1].adopters_dost +
          q[2].adopters_dost +
          q[3].adopters_dost +
          q[4].adopters_dost,
      },
    });
  });
});
app.get("/technology-rollout/:id", (req, res) => {
  const entryId = Number(req.params.id);

  db.query(
    "SELECT * FROM technology_rollout WHERE id = ? LIMIT 1",
    [entryId],
    (err, rows) => {
      if (err) {
        console.error("GET /technology-rollout/:id ERROR:", err);
        return res.status(500).json({ message: err.message });
      }

      if (!rows || !rows.length) {
        return res.status(404).json({ message: "Technology Rollout entry not found." });
      }

      res.json(normalizeTechnologyRolloutEntry(rows[0]));
    }
  );
});

app.post("/technology-rollout", (req, res) => {
  const p = mapTechnologyRolloutPayload(req.body || {});

  const requiredChecks = [
    [p.quarter, "Quarter is required."],
    [p.name_of_technology_transferred, "Name of Technology Transferred is required."],
    [p.technology_generator, "Technology Generator is required."],
    [p.mode_of_transfer, "Mode of Transfer is required."],
    [p.date_transferred, "Date Transferred is required."],
    [p.activity_title, "Activity Title is required."],
    [p.activity_date, "Activity Date is required."],
    [p.institution_name, "Institution Name is required."],
    [p.institution_address, "Institution Address is required."],
    [p.classification, "Classification is required."],
    [p.representative_name, "Representative Name is required."],
  ];

  for (const [value, message] of requiredChecks) {
    if (!String(value || "").trim()) {
      return res.status(400).json({ message });
    }
  }

  const sql = `
    INSERT INTO technology_rollout (
      quarter,
      unit_center,
      name_of_technology_transferred,
      technology_generator,
      mode_of_transfer,
      is_dost_developed_funded,
      date_transferred,
      activity_title,
      activity_date,
      activity_venue,
      institution_name,
      institution_address,
      address_mode,
      address_manual_text,
      address_display_text,
      address_province,
      address_municipality,
      address_barangay,
      address_lat,
      address_lng,
      classification,
      representative_name,
      representative_designation,
      sex,
      name_of_staff,
      custom_fields
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [
      p.quarter,
      p.unit_center,
      p.name_of_technology_transferred,
      p.technology_generator,
      p.mode_of_transfer,
      p.is_dost_developed_funded,
      p.date_transferred,
      p.activity_title,
      p.activity_date,
      p.activity_venue,
      p.institution_name,
      p.institution_address,
      p.address_mode,
      p.address_manual_text,
      p.address_display_text,
      p.address_province,
      p.address_municipality,
      p.address_barangay,
      p.address_lat,
      p.address_lng,
      p.classification,
      p.representative_name,
      p.representative_designation,
      p.sex,
      p.name_of_staff,
      p.custom_fields,
    ],
    (err, result) => {
      if (err) {
        console.error("POST /technology-rollout ERROR:", err);
        return res.status(500).json({ message: err.message });
      }

      res.json({
        success: true,
        id: result.insertId,
        message: "Technology Rollout entry created",
      });
    }
  );
});

app.put("/technology-rollout/:id", (req, res) => {
  const entryId = Number(req.params.id);
  const p = mapTechnologyRolloutPayload(req.body || {});

  const requiredChecks = [
    [p.quarter, "Quarter is required."],
    [p.name_of_technology_transferred, "Name of Technology Transferred is required."],
    [p.technology_generator, "Technology Generator is required."],
    [p.mode_of_transfer, "Mode of Transfer is required."],
    [p.date_transferred, "Date Transferred is required."],
    [p.activity_title, "Activity Title is required."],
    [p.activity_date, "Activity Date is required."],
    [p.institution_name, "Institution Name is required."],
    [p.institution_address, "Institution Address is required."],
    [p.classification, "Classification is required."],
    [p.representative_name, "Representative Name is required."],
  ];

  for (const [value, message] of requiredChecks) {
    if (!String(value || "").trim()) {
      return res.status(400).json({ message });
    }
  }

  const sql = `
    UPDATE technology_rollout
    SET
      quarter = ?,
      unit_center = ?,
      name_of_technology_transferred = ?,
      technology_generator = ?,
      mode_of_transfer = ?,
      is_dost_developed_funded = ?,
      date_transferred = ?,
      activity_title = ?,
      activity_date = ?,
      activity_venue = ?,
      institution_name = ?,
      institution_address = ?,
      address_mode = ?,
      address_manual_text = ?,
      address_display_text = ?,
      address_province = ?,
      address_municipality = ?,
      address_barangay = ?,
      address_lat = ?,
      address_lng = ?,
      classification = ?,
      representative_name = ?,
      representative_designation = ?,
      sex = ?,
      name_of_staff = ?,
      custom_fields = ?
    WHERE id = ?
  `;

  db.query(
    sql,
    [
      p.quarter,
      p.unit_center,
      p.name_of_technology_transferred,
      p.technology_generator,
      p.mode_of_transfer,
      p.is_dost_developed_funded,
      p.date_transferred,
      p.activity_title,
      p.activity_date,
      p.activity_venue,
      p.institution_name,
      p.institution_address,
      p.address_mode,
      p.address_manual_text,
      p.address_display_text,
      p.address_province,
      p.address_municipality,
      p.address_barangay,
      p.address_lat,
      p.address_lng,
      p.classification,
      p.representative_name,
      p.representative_designation,
      p.sex,
      p.name_of_staff,
      p.custom_fields,
      entryId,
    ],
    (err, result) => {
      if (err) {
        console.error("PUT /technology-rollout/:id ERROR:", err);
        return res.status(500).json({ message: err.message });
      }

      if (!result.affectedRows) {
        return res.status(404).json({ message: "Technology Rollout entry not found." });
      }

      res.json({ success: true, message: "Technology Rollout entry updated" });
    }
  );
});

app.delete("/technology-rollout/:id", (req, res) => {
  const entryId = Number(req.params.id);

  db.query(
    "DELETE FROM technology_rollout WHERE id = ?",
    [entryId],
    (err, result) => {
      if (err) {
        console.error("DELETE /technology-rollout/:id ERROR:", err);
        return res.status(500).json({ message: err.message });
      }

      if (!result.affectedRows) {
        return res.status(404).json({ message: "Technology Rollout entry not found." });
      }

      res.json({ success: true, message: "Technology Rollout entry deleted" });
    }
  );
});



// ===========================
// SETUP PROJECT ROUTES
// TABLES:
// - projects
// - project_interventions
// - project_other_indicators
// ===========================

// GET all projects with interventions
app.get("/projects", (req, res) => {
  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.max(1, Number(req.query.limit || 10));
  const offset = (page - 1) * limit;

  const year = String(req.query.year || "ALL").trim();
  const district = String(req.query.district || "ALL").trim();
  const month = String(req.query.month || "ALL").trim();
  const municipality = String(req.query.municipality || "ALL").trim();
  const status = String(req.query.status || "ALL").trim();
  const search = String(req.query.search || "").trim();

  const where = [];
  const whereParams = [];

  if (year !== "ALL" && year !== "") {
    where.push("YEAR(p.date_approved) = ?");
    whereParams.push(Number(year));
  }

  if (district !== "ALL" && district !== "") {
    where.push("p.district = ?");
    whereParams.push(district);
  }

  if (month !== "ALL" && month !== "") {
    where.push("MONTH(p.date_approved) = ?");
    whereParams.push(Number(month));
  }

  if (municipality !== "ALL" && municipality !== "") {
    where.push("p.address_municipality = ?");
    whereParams.push(municipality);
  }

  if (status !== "ALL" && status !== "") {
    where.push("p.stpms_status = ?");
    whereParams.push(status);
  }

  if (search) {
    const like = `%${search}%`;
    where.push(`(
      p.firm_name LIKE ? OR
      p.project_title LIKE ? OR
      p.cooperator_name LIKE ? OR
      p.spin_number LIKE ? OR
      p.sector LIKE ? OR
      p.district LIKE ? OR
      p.address LIKE ?
    )`);
    whereParams.push(like, like, like, like, like, like, like);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const countSql = `
    SELECT COUNT(*) AS total
    FROM projects p
    ${whereSql}
  `;

  const idsSql = `
    SELECT p.id
    FROM projects p
    ${whereSql}
    ORDER BY p.created_at DESC, p.id DESC
    LIMIT ? OFFSET ?
  `;

  db.query(countSql, whereParams, (countErr, countRows) => {
    if (countErr) {
      console.error("GET /projects COUNT ERROR:", countErr);
      return res.status(500).json({ message: countErr.message });
    }

    const total = Number(countRows?.[0]?.total || 0);
    const totalPages = total > 0 ? Math.ceil(total / limit) : 1;

    db.query(idsSql, [...whereParams, limit, offset], (idsErr, idRows) => {
      if (idsErr) {
        console.error("GET /projects IDS ERROR:", idsErr);
        return res.status(500).json({ message: idsErr.message });
      }

      const projectIds = (idRows || [])
        .map((row) => Number(row.id))
        .filter((id) => Number.isFinite(id) && id > 0);

      if (!projectIds.length) {
        return res.json({ data: [], total, totalPages, page, limit });
      }

      const placeholders = projectIds.map(() => "?").join(",");
      const sql = `
        SELECT
          p.*,

          i.id AS intervention_id,
          i.project_id AS intervention_project_id,
          i.type AS intervention_type,
          i.title AS intervention_title,
          i.date AS intervention_date,
          i.venue AS intervention_venue,
          i.no_of_firms AS intervention_no_of_firms,
          i.male AS intervention_intervention_male,
          i.male AS intervention_male,
          i.female AS intervention_female,
          i.total AS intervention_total,
          i.notes AS intervention_notes,

          i.tacs_consultancy_type AS intervention_tacs_consultancy_type,
          i.tacs_date_engagement AS intervention_tacs_date_engagement,
          i.tacs_expert_institution AS intervention_tacs_expert_institution,
          i.tacs_customer_name AS intervention_tacs_customer_name,
          i.tacs_customer_sex AS intervention_tacs_customer_sex,
          i.tacs_customer_address AS intervention_tacs_customer_address,
          i.tacs_customer_address_meta AS intervention_tacs_customer_address_meta,
          i.tacs_means_verification AS intervention_tacs_means_verification,
          i.tacs_no_of_advice AS intervention_tacs_no_of_advice,
          i.tacs_remarks AS intervention_tacs_remarks,
          i.tacs_photos AS intervention_tacs_photos
        FROM projects p
        LEFT JOIN project_interventions i
          ON p.id = i.project_id
        WHERE p.id IN (${placeholders})
        ORDER BY FIELD(p.id, ${placeholders}), i.id ASC
      `;

      const queryParams = [...projectIds, ...projectIds];

      db.query(sql, queryParams, (err, rows) => {
        if (err) {
          console.error("GET /projects ERROR:", err);
          return res.status(500).json({ message: err.message });
        }

        const projects = {};

        rows.forEach((row) => {
          if (!projects[row.id]) {
            projects[row.id] = {
              id: Number(row.id),
              quarter: String(pickFirst(row.quarter, "1")),
              projectTitle: row.project_title ?? "",
              project_title: row.project_title ?? "",
              firmName: row.firm_name ?? "",
              firm_name: row.firm_name ?? "",
              cooperatorName: row.cooperator_name ?? "",
              cooperator_name: row.cooperator_name ?? "",
              age: row.age ?? "",
              sex: row.sex ?? "",
              spinNumber: row.spin_number ?? "",
              spin_number: row.spin_number ?? "",
              sector: row.sector ?? "",
              district: row.district ?? "",
              address: row.address ?? "",
              funded: row.funded ?? "N",
              amount: Number(row.amount ?? 0),
              remarks: row.remarks ?? "",
              status: row.stpms_status ?? "",
              stpms_status: row.stpms_status ?? "",
              type: row.phase ?? "",
              phase: row.phase ?? "",
              dateApproved: formatDateOnly(row.date_approved),
              date_approved: formatDateOnly(row.date_approved),
              moaSigned: formatDateOnly(row.moa_signed),
              moa_signed: formatDateOnly(row.moa_signed),
              created_at: row.created_at ?? null,
              custom_fields: parseJsonSafe(row.custom_fields) || {},
              customFields: parseJsonSafe(row.custom_fields) || {},
              addressMeta: {
                mode: deriveAddressMode(row),
                manualText: row.address_manual_text || "",
                province: row.address_province || "",
                municipality: row.address_municipality || "",
                barangay: row.address_barangay || "",
                lat:
                  row.address_lat !== null && row.address_lat !== undefined
                    ? Number(row.address_lat)
                    : null,
                lng:
                  row.address_lng !== null && row.address_lng !== undefined
                    ? Number(row.address_lng)
                    : null,
              },
              interventions: [],
            };
          }

          if (row.intervention_id) {
            projects[row.id].interventions.push({
              id: Number(row.intervention_id),
              project_id: Number(row.intervention_project_id),
              type: row.intervention_type ?? "",
              title: row.intervention_title ?? "",
              date: formatDateOnly(row.intervention_date),
              venue: row.intervention_venue || "",
              noOfFirms: row.intervention_no_of_firms ?? "",
              male: row.intervention_male ?? "",
              female: row.intervention_female ?? "",
              total: row.intervention_total ?? "",
              notes: row.intervention_notes || "",

              tacsConsultancyType: row.intervention_tacs_consultancy_type ?? "",
              tacsDateEngagement: formatDateOnly(
                row.intervention_tacs_date_engagement
              ),
              tacsExpertInstitution: row.intervention_tacs_expert_institution ?? "",
              tacsCustomerName: row.intervention_tacs_customer_name ?? "",
              tacsCustomerSex: row.intervention_tacs_customer_sex ?? "",
              tacsCustomerAddress: row.intervention_tacs_customer_address ?? "",
              tacsCustomerAddressMeta: parseJsonSafe(
                row.intervention_tacs_customer_address_meta
              ),
              tacsMeansVerification:
                row.intervention_tacs_means_verification ?? "",
              tacsNoOfAdvice: row.intervention_tacs_no_of_advice ?? "",
              tacsRemarks: row.intervention_tacs_remarks ?? "",
              tacsPhotos: parseJsonSafe(row.intervention_tacs_photos) || [],
            });
          }
        });

        res.json({
          data: Object.values(projects),
          total,
          totalPages,
          page,
          limit,
        });
      });
    });
  });
});

// GET single project
app.get("/projects/:id", (req, res) => {
  const projectId = req.params.id;

  const sql = `
    SELECT
      p.*,

      i.id AS intervention_id,
      i.project_id AS intervention_project_id,
      i.type AS intervention_type,
      i.title AS intervention_title,
      i.date AS intervention_date,
      i.venue AS intervention_venue,
      i.no_of_firms AS intervention_no_of_firms,
      i.male AS intervention_male,
      i.female AS intervention_female,
      i.total AS intervention_total,
      i.notes AS intervention_notes,

      i.tacs_consultancy_type AS intervention_tacs_consultancy_type,
      i.tacs_date_engagement AS intervention_tacs_date_engagement,
      i.tacs_expert_institution AS intervention_tacs_expert_institution,
      i.tacs_customer_name AS intervention_tacs_customer_name,
      i.tacs_customer_sex AS intervention_tacs_customer_sex,
      i.tacs_customer_address AS intervention_tacs_customer_address,
      i.tacs_customer_address_meta AS intervention_tacs_customer_address_meta,
      i.tacs_means_verification AS intervention_tacs_means_verification,
      i.tacs_no_of_advice AS intervention_tacs_no_of_advice,
      i.tacs_remarks AS intervention_tacs_remarks
    FROM projects p
    LEFT JOIN project_interventions i
      ON p.id = i.project_id
    WHERE p.id = ?
    ORDER BY i.id DESC
  `;

  db.query(sql, [projectId], (err, rows) => {
    if (err) {
      console.error("GET /projects/:id ERROR:", err);
      return res.status(500).json(err);
    }

    if (!rows.length) {
      return res.status(404).json({ message: "Project not found" });
    }

    const row0 = rows[0];

    const project = {
      id: Number(row0.id),
      quarter: String(pickFirst(row0.quarter, "1")),
      project_title: row0.project_title ?? "",
      projectTitle: row0.project_title ?? "",

      firm_name: row0.firm_name ?? "",
      firmName: row0.firm_name ?? "",

      cooperator_name: row0.cooperator_name ?? "",
      cooperatorName: row0.cooperator_name ?? "",

      age: row0.age ?? "",
      sex: row0.sex ?? "",
      spin_number: row0.spin_number ?? "",
      spinNumber: row0.spin_number ?? "",
      sector: row0.sector ?? "",
      district: row0.district ?? "",
      address: row0.address ?? "",
      funded: row0.funded ?? "N",
      amount: Number(row0.amount ?? 0),
      remarks: row0.remarks ?? "",
      stpms_status: row0.stpms_status ?? "",
      status: row0.stpms_status ?? "",
      phase: row0.phase ?? "",
      type: row0.phase ?? "",
      date_approved: formatDateOnly(row0.date_approved),
      dateApproved: formatDateOnly(row0.date_approved),
      moa_signed: formatDateOnly(row0.moa_signed),
      created_at: row0.created_at ?? null,
      custom_fields: parseJsonSafe(row0.custom_fields) || {},
      customFields: parseJsonSafe(row0.custom_fields) || {},

      addressMeta: {
        mode: deriveAddressMode(row0),
        manualText: row0.address_manual_text || "",
        province: row0.address_province || "",
        municipality: row0.address_municipality || "",
        barangay: row0.address_barangay || "",
        lat:
          row0.address_lat !== null && row0.address_lat !== undefined
            ? Number(row0.address_lat)
            : null,
        lng:
          row0.address_lng !== null && row0.address_lng !== undefined
            ? Number(row0.address_lng)
            : null,
      },

      interventions: [],
    };

    rows.forEach((row) => {
      if (row.intervention_id) {
        project.interventions.push({
          id: Number(row.intervention_id),
          project_id: Number(row.intervention_project_id),
          type: row.intervention_type ?? "",
          title: row.intervention_title ?? "",
          date: formatDateOnly(row.intervention_date),
          venue: row.intervention_venue || "",
          noOfFirms: row.intervention_no_of_firms ?? "",
          male: row.intervention_male ?? "",
          female: row.intervention_female ?? "",
          total: row.intervention_total ?? "",
          notes: row.intervention_notes || "",

          tacsConsultancyType: row.intervention_tacs_consultancy_type ?? "",
          tacsDateEngagement: formatDateOnly(
            row.intervention_tacs_date_engagement
          ),
          tacsExpertInstitution: row.intervention_tacs_expert_institution ?? "",
          tacsCustomerName: row.intervention_tacs_customer_name ?? "",
          tacsCustomerSex: row.intervention_tacs_customer_sex ?? "",
          tacsCustomerAddress: row.intervention_tacs_customer_address ?? "",
          tacsCustomerAddressMeta: parseJsonSafe(
            row.intervention_tacs_customer_address_meta
          ),
          tacsMeansVerification:
            row.intervention_tacs_means_verification ?? "",
          tacsNoOfAdvice: row.intervention_tacs_no_of_advice ?? "",
          tacsRemarks: row.intervention_tacs_remarks ?? "",
          tacsPhotos: parseJsonSafe(row.intervention_tacs_photos) || [],
        });
      }
    });

    res.json(project);
  });
});

// CREATE project
app.post("/projects", (req, res) => {
  const b = req.body || {};
  const addr = mapAddressMetaFromBody(b);

  const sql = `
    INSERT INTO projects (
      quarter,
      project_title,
      firm_name,
      cooperator_name,
      age,
      sex,
      spin_number,
      sector,
      district,
      address,
      funded,
      amount,
      remarks,
      stpms_status,
      phase,
      date_approved,
      moa_signed,
      address_manual_text,
      address_province,
      address_municipality,
      address_barangay,
      address_lat,
      address_lng,
      custom_fields
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [
      pickFirst(b.quarter, 1),
      b.project_title ?? b.projectTitle ?? "",
      b.firm_name ?? b.firmName ?? "",
      b.cooperator_name ?? b.cooperatorName ?? "",
      toNumOrNull(b.age),
      b.sex ?? "",
      b.spin_number ?? b.spinNumber ?? "",
      b.sector ?? "",
      b.district ?? "",
      b.address ?? "",
      b.funded ?? "N",
      toNumOrZero(b.amount),
      b.remarks ?? "",
      b.stpms_status ?? b.status ?? "",
      b.phase ?? b.type ?? "",
      toNullIfEmpty(b.date_approved ?? b.dateApproved),
      toNullIfEmpty(b.moa_signed ?? b.moaSigned),

      addr.address_manual_text,
      addr.address_province,
      addr.address_municipality,
      addr.address_barangay,
      addr.address_lat,
      addr.address_lng,
      JSON.stringify(b.custom_fields ?? b.customFields ?? {}),
    ],
    (err, result) => {
      if (err) {
        console.error("POST /projects ERROR:", err);
        return res.status(500).json(err);
      }
      res.json({ message: "Project created", id: result.insertId });
    }
  );
});

// UPDATE project
app.put("/projects/:id", (req, res) => {
  const b = req.body || {};
  const addr = mapAddressMetaFromBody(b);

  const sql = `
    UPDATE projects SET
      quarter=?,
      project_title=?,
      firm_name=?,
      cooperator_name=?,
      age=?,
      sex=?,
      spin_number=?,
      sector=?,
      district=?,
      address=?,
      funded=?,
      amount=?,
      remarks=?,
      stpms_status=?,
      phase=?,
      date_approved=?,
      moa_signed=?,
      address_manual_text=?,
      address_province=?,
      address_municipality=?,
      address_barangay=?,
      address_lat=?,
      address_lng=?,
      custom_fields=?
    WHERE id=?
  `;

  db.query(
    sql,
    [
      pickFirst(b.quarter, 1),
      b.project_title ?? b.projectTitle ?? "",
      b.firm_name ?? b.firmName ?? "",
      b.cooperator_name ?? b.cooperatorName ?? "",
      toNumOrNull(b.age),
      b.sex ?? "",
      b.spin_number ?? b.spinNumber ?? "",
      b.sector ?? "",
      b.district ?? "",
      b.address ?? "",
      b.funded ?? "N",
      toNumOrZero(b.amount),
      b.remarks ?? "",
      b.stpms_status ?? b.status ?? "",
      b.phase ?? b.type ?? "",
      toNullIfEmpty(b.date_approved ?? b.dateApproved),
      toNullIfEmpty(b.moa_signed ?? b.moaSigned),

      addr.address_manual_text,
      addr.address_province,
      addr.address_municipality,
      addr.address_barangay,
      addr.address_lat,
      addr.address_lng,
      JSON.stringify(b.custom_fields ?? b.customFields ?? {}),

      req.params.id,
    ],
    (err) => {
      if (err) {
        console.error("PUT /projects/:id ERROR:", err);
        return res.status(500).json(err);
      }
      res.json({ message: "Project updated" });
    }
  );
});

// DELETE project
app.delete("/projects/:id", (req, res) => {
  const projectId = req.params.id;

  db.query(
    "DELETE FROM project_interventions WHERE project_id=?",
    [projectId],
    (err) => {
      if (err) return res.status(500).json(err);

      db.query(
        "DELETE FROM project_other_indicators WHERE project_id=?",
        [projectId],
        (err2) => {
          if (err2) return res.status(500).json(err2);

          db.query("DELETE FROM projects WHERE id=?", [projectId], (err3) => {
            if (err3) return res.status(500).json(err3);
            res.json({ message: "Project deleted" });
          });
        }
      );
    }
  );
});

// GET project interventions
app.get("/projects/:id/interventions", (req, res) => {
  db.query(
    `
      SELECT
        *,
        DATE_FORMAT(date, '%Y-%m-%d') AS date_fmt,
        DATE_FORMAT(tacs_date_engagement, '%Y-%m-%d') AS tacs_date_engagement_fmt
      FROM project_interventions
      WHERE project_id=?
      ORDER BY id DESC
    `,
    [req.params.id],
    (err, rows) => {
      if (err) {
        console.error("GET /projects/:id/interventions ERROR:", err);
        return res.status(500).json(err);
      }

      const normalized = (rows || []).map((row) => ({
        id: Number(row.id),
        project_id: Number(row.project_id),
        type: row.type ?? "",
        title: row.title ?? "",
        date: row.date_fmt || formatDateOnly(row.date),
        venue: row.venue || "",
        noOfFirms: row.no_of_firms ?? "",
        male: row.male ?? "",
        female: row.female ?? "",
        total: row.total ?? "",
        notes: row.notes || "",

        tacsConsultancyType: row.tacs_consultancy_type ?? "",
        tacsDateEngagement:
          row.tacs_date_engagement_fmt ||
          formatDateOnly(row.tacs_date_engagement),
        tacsExpertInstitution: row.tacs_expert_institution ?? "",
        tacsCustomerName: row.tacs_customer_name ?? "",
        tacsCustomerSex: row.tacs_customer_sex ?? "",
        tacsCustomerAddress: row.tacs_customer_address ?? "",
        tacsCustomerAddressMeta: parseJsonSafe(row.tacs_customer_address_meta),
        tacsMeansVerification: row.tacs_means_verification ?? "",
        tacsNoOfAdvice: row.tacs_no_of_advice ?? "",
        tacsRemarks: row.tacs_remarks ?? "",
        tacsPhotos: parseJsonSafe(row.tacs_photos) || [],
      }));

      res.json(normalized);
    }
  );
});

// CREATE project intervention
app.post("/projects/:id/interventions", (req, res) => {
  const projectId = Number(req.params.id);
  const b = req.body || {};

  const sql = `
    INSERT INTO project_interventions (
      project_id,
      type,
      title,
      date,
      venue,
      no_of_firms,
      male,
      female,
      total,
      notes,
      tacs_consultancy_type,
      tacs_date_engagement,
      tacs_expert_institution,
      tacs_customer_name,
      tacs_customer_sex,
      tacs_customer_address,
      tacs_customer_address_meta,
      tacs_means_verification,
      tacs_no_of_advice,
      tacs_remarks
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.beginTransaction((txErr) => {
    if (txErr) {
      console.error("POST /projects/:id/interventions TX ERROR:", txErr);
      return res.status(500).json({ message: txErr.message });
    }

    db.query(
      sql,
      [
        projectId,
        b.type ?? "",
        b.title ?? "",
        toNullIfEmpty(b.date),
        b.venue ?? "",
        toNumOrNull(b.noOfFirms ?? b.no_of_firms),
        toNumOrNull(b.male),
        toNumOrNull(b.female),
        toNumOrNull(b.total),
        b.notes ?? "",
        toNullIfEmpty(b.tacs_consultancy_type ?? b.tacsConsultancyType),
        toNullIfEmpty(b.tacs_date_engagement ?? b.tacsDateEngagement),
        toNullIfEmpty(b.tacs_expert_institution ?? b.tacsExpertInstitution),
        toNullIfEmpty(b.tacs_customer_name ?? b.tacsCustomerName),
        toNullIfEmpty(b.tacs_customer_sex ?? b.tacsCustomerSex),
        toNullIfEmpty(b.tacs_customer_address ?? b.tacsCustomerAddress),
        mapTacsAddressMeta(
          b.tacs_customer_address_meta ?? b.tacsCustomerAddressMeta
        ),
        toNullIfEmpty(b.tacs_means_verification ?? b.tacsMeansVerification),
        toNumOrNull(b.tacs_no_of_advice ?? b.tacsNoOfAdvice),
        toNullIfEmpty(b.tacs_remarks ?? b.tacsRemarks),
      ],
      (err, result) => {
        if (err) {
          return db.rollback(() => {
            console.error("POST /projects/:id/interventions ERROR:", err);
            res.status(500).json({ message: err.message });
          });
        }

        const interventionId = Number(result.insertId);

        syncPackagingRecordForIntervention(
          {
            projectId,
            interventionId,
            type: b.type ?? "",
            body: b,
          },
          (packagingSyncErr) => {
            if (packagingSyncErr) {
              return db.rollback(() => {
                console.error(
                  "POST /projects/:id/interventions packaging sync ERROR:",
                  packagingSyncErr
                );
                res.status(500).json({ message: packagingSyncErr.message });
              });
            }

            syncTacsEntryForIntervention(
              {
                projectId,
                interventionId,
                type: b.type ?? "",
                body: b,
              },
              (tacsSyncErr) => {
                if (tacsSyncErr) {
                  return db.rollback(() => {
                    console.error(
                      "POST /projects/:id/interventions TACS sync ERROR:",
                      tacsSyncErr
                    );
                    res.status(500).json({ message: tacsSyncErr.message });
                  });
                }

                syncProjectInterventionTechnologyPromotionEntry(
                  {
                    projectId,
                    interventionId,
                    type: b.type ?? "",
                    body: b,
                  },
                  (techPromoSyncErr) => {
                    if (techPromoSyncErr) {
                      return db.rollback(() => {
                        console.error(
                          "POST /projects/:id/interventions Technology Promotion sync ERROR:",
                          techPromoSyncErr
                        );
                        res.status(500).json({ message: techPromoSyncErr.message });
                      });
                    }

                    syncTechnologyRolloutEntriesForIntervention(
                      {
                        interventionId,
                        type: b.type ?? "",
                        body: b,
                        previousNotes: null,
                      },
                      (techRolloutSyncErr) => {
                        if (techRolloutSyncErr) {
                          return db.rollback(() => {
                            console.error(
                              "POST /projects/:id/interventions Tech Roll Out sync ERROR:",
                              techRolloutSyncErr
                            );
                            res.status(500).json({ message: techRolloutSyncErr.message });
                          });
                        }

                        syncTechnologyTrainingEntryForIntervention(
                          {
                            projectId,
                            interventionId,
                            type: b.type ?? "",
                            body: b,
                          },
                          (techTrainingSyncErr) => {
                            if (techTrainingSyncErr) {
                              return db.rollback(() => {
                                console.error(
                                  "POST /projects/:id/interventions Technology Training sync ERROR:",
                                  techTrainingSyncErr
                                );
                                res.status(500).json({ message: techTrainingSyncErr.message });
                              });
                            }

                            db.commit((commitErr) => {
                              if (commitErr) {
                                return db.rollback(() => {
                                  console.error(
                                    "POST /projects/:id/interventions COMMIT ERROR:",
                                    commitErr
                                  );
                                  res.status(500).json({ message: commitErr.message });
                                });
                              }

                              res.json({ message: "Intervention added", id: interventionId });
                            });
                          }
                        );
                      }
                    );
                  }
                );
              }
            );
          }
        );
      }
    );
  });
});

// UPDATE project intervention
// UPDATE project intervention
app.put("/interventions/:id", (req, res) => {
  const interventionId = Number(req.params.id);
  const b = req.body || {};

  const sql = `
    UPDATE project_interventions SET
      type=?,
      title=?,
      date=?,
      venue=?,
      no_of_firms=?,
      male=?,
      female=?,
      total=?,
      notes=?,
      tacs_consultancy_type=?,
      tacs_date_engagement=?,
      tacs_expert_institution=?,
      tacs_customer_name=?,
      tacs_customer_sex=?,
      tacs_customer_address=?,
      tacs_customer_address_meta=?,
      tacs_means_verification=?,
      tacs_no_of_advice=?,
      tacs_remarks=?
    WHERE id=?
  `;

  db.beginTransaction((txErr) => {
    if (txErr) {
      console.error("PUT /interventions/:id TX ERROR:", txErr);
      return res.status(500).json({ message: txErr.message });
    }

    db.query(
      "SELECT project_id, notes FROM project_interventions WHERE id = ? LIMIT 1",
      [interventionId],
      (findErr, rows) => {
        if (findErr) {
          return db.rollback(() => {
            console.error("PUT /interventions/:id find ERROR:", findErr);
            res.status(500).json({ message: findErr.message });
          });
        }

        if (!rows || !rows.length) {
          return db.rollback(() => {
            res.status(404).json({ message: "Intervention not found" });
          });
        }

        const projectId = Number(rows[0].project_id);
        const previousNotes = rows[0].notes || "";

        db.query(
          sql,
          [
            b.type ?? "",
            b.title ?? "",
            toNullIfEmpty(b.date),
            b.venue ?? "",
            toNumOrNull(b.noOfFirms ?? b.no_of_firms),
            toNumOrNull(b.male),
            toNumOrNull(b.female),
            toNumOrNull(b.total),
            b.notes ?? "",
            toNullIfEmpty(b.tacs_consultancy_type ?? b.tacsConsultancyType),
            toNullIfEmpty(b.tacs_date_engagement ?? b.tacsDateEngagement),
            toNullIfEmpty(b.tacs_expert_institution ?? b.tacsExpertInstitution),
            toNullIfEmpty(b.tacs_customer_name ?? b.tacsCustomerName),
            toNullIfEmpty(b.tacs_customer_sex ?? b.tacsCustomerSex),
            toNullIfEmpty(b.tacs_customer_address ?? b.tacsCustomerAddress),
            mapTacsAddressMeta(
              b.tacs_customer_address_meta ?? b.tacsCustomerAddressMeta
            ),
            toNullIfEmpty(b.tacs_means_verification ?? b.tacsMeansVerification),
            toNumOrNull(b.tacs_no_of_advice ?? b.tacsNoOfAdvice),
            toNullIfEmpty(b.tacs_remarks ?? b.tacsRemarks),
            interventionId,
          ],
          (err, result) => {
            if (err) {
              return db.rollback(() => {
                console.error("PUT /interventions/:id ERROR:", err);
                res.status(500).json({ message: err.message });
              });
            }

            if (!result.affectedRows) {
              return db.rollback(() => {
                res.status(404).json({ message: "Intervention not found" });
              });
            }

            syncPackagingRecordForIntervention(
              {
                projectId,
                interventionId,
                type: b.type ?? "",
                body: b,
              },
              (packagingSyncErr) => {
                if (packagingSyncErr) {
                  return db.rollback(() => {
                    console.error(
                      "PUT /interventions/:id packaging sync ERROR:",
                      packagingSyncErr
                    );
                    res.status(500).json({ message: packagingSyncErr.message });
                  });
                }

                syncTacsEntryForIntervention(
                  {
                    projectId,
                    interventionId,
                    type: b.type ?? "",
                    body: b,
                  },
                  (tacsSyncErr) => {
                    if (tacsSyncErr) {
                      return db.rollback(() => {
                        console.error(
                          "PUT /interventions/:id TACS sync ERROR:",
                          tacsSyncErr
                        );
                        res.status(500).json({ message: tacsSyncErr.message });
                      });
                    }

                    syncProjectInterventionTechnologyPromotionEntry(
                      {
                        projectId,
                        interventionId,
                        type: b.type ?? "",
                        body: b,
                      },
                      (techPromoSyncErr) => {
                        if (techPromoSyncErr) {
                          return db.rollback(() => {
                            console.error(
                              "PUT /interventions/:id Technology Promotion sync ERROR:",
                              techPromoSyncErr
                            );
                            res.status(500).json({ message: techPromoSyncErr.message });
                          });
                        }

                        syncTechnologyRolloutEntriesForIntervention(
                          {
                            interventionId,
                            type: b.type ?? "",
                            body: b,
                            previousNotes,
                          },
                          (techRolloutSyncErr) => {
                            if (techRolloutSyncErr) {
                              return db.rollback(() => {
                                console.error(
                                  "PUT /interventions/:id Tech Roll Out sync ERROR:",
                                  techRolloutSyncErr
                                );
                                res.status(500).json({ message: techRolloutSyncErr.message });
                              });
                            }

                            syncTechnologyTrainingEntryForIntervention(
                              {
                                projectId,
                                interventionId,
                                type: b.type ?? "",
                                body: b,
                              },
                              (techTrainingSyncErr) => {
                                if (techTrainingSyncErr) {
                                  return db.rollback(() => {
                                    console.error(
                                      "PUT /interventions/:id Technology Training sync ERROR:",
                                      techTrainingSyncErr
                                    );
                                    res.status(500).json({ message: techTrainingSyncErr.message });
                                  });
                                }

                                db.commit((commitErr) => {
                                  if (commitErr) {
                                    return db.rollback(() => {
                                      console.error(
                                        "PUT /interventions/:id COMMIT ERROR:",
                                        commitErr
                                      );
                                      res.status(500).json({ message: commitErr.message });
                                    });
                                  }

                                  res.json({ message: "Intervention updated" });
                                });
                              }
                            );
                          }
                        );
                      }
                    );
                  }
                );
              }
            );
          }
        );
      }
    );
  });
});

// DELETE project intervention
// DELETE project intervention
app.delete("/interventions/:id", (req, res) => {
  const interventionId = Number(req.params.id);

  db.beginTransaction((txErr) => {
    if (txErr) {
      console.error("DELETE /interventions/:id TX ERROR:", txErr);
      return res.status(500).json({ message: txErr.message });
    }

    db.query(
      "SELECT notes FROM project_interventions WHERE id = ? LIMIT 1",
      [interventionId],
      (findErr, rows) => {
        if (findErr) {
          return db.rollback(() => {
            console.error("DELETE /interventions/:id find ERROR:", findErr);
            res.status(500).json({ message: findErr.message });
          });
        }

        const previousNotes = rows?.[0]?.notes || "";

        deletePackagingRecordByInterventionId(interventionId, (deletePackagingErr) => {
          if (deletePackagingErr) {
            return db.rollback(() => {
              console.error(
                "DELETE /interventions/:id packaging delete ERROR:",
                deletePackagingErr
              );
              res.status(500).json({ message: deletePackagingErr.message });
            });
          }

          deleteTacsEntryByInterventionId(interventionId, (deleteTacsErr) => {
            if (deleteTacsErr) {
              return db.rollback(() => {
                console.error(
                  "DELETE /interventions/:id TACS delete ERROR:",
                  deleteTacsErr
                );
                res.status(500).json({ message: deleteTacsErr.message });
              });
            }

            deleteProjectInterventionTechnologyPromotionEntry(
              interventionId,
              (deleteTechPromoErr) => {
                if (deleteTechPromoErr) {
                  return db.rollback(() => {
                    console.error(
                      "DELETE /interventions/:id Technology Promotion delete ERROR:",
                      deleteTechPromoErr
                    );
                    res.status(500).json({ message: deleteTechPromoErr.message });
                  });
                }

                deleteTechnologyRolloutEntriesFromInterventionNotes(
                  previousNotes,
                  (deleteTechRolloutErr) => {
                    if (deleteTechRolloutErr) {
                      return db.rollback(() => {
                        console.error(
                          "DELETE /interventions/:id Tech Roll Out delete ERROR:",
                          deleteTechRolloutErr
                        );
                        res.status(500).json({ message: deleteTechRolloutErr.message });
                      });
                    }

                    db.query(
                      "DELETE FROM technology_training_entries WHERE intervention_id = ?",
                      [interventionId],
                      (deleteTechTrainingErr) => {
                        if (deleteTechTrainingErr) {
                          return db.rollback(() => {
                            console.error(
                              "DELETE /interventions/:id Technology Training delete ERROR:",
                              deleteTechTrainingErr
                            );
                            res.status(500).json({ message: deleteTechTrainingErr.message });
                          });
                        }

                        db.query(
                          "DELETE FROM project_interventions WHERE id=?",
                          [interventionId],
                          (err, result) => {
                            if (err) {
                              return db.rollback(() => {
                                console.error("DELETE /interventions/:id ERROR:", err);
                                res.status(500).json({ message: err.message });
                              });
                            }

                            if (!result.affectedRows) {
                              return db.rollback(() => {
                                res.status(404).json({ message: "Intervention not found" });
                              });
                            }

                            db.commit((commitErr) => {
                              if (commitErr) {
                                return db.rollback(() => {
                                  console.error(
                                    "DELETE /interventions/:id COMMIT ERROR:",
                                    commitErr
                                  );
                                  res.status(500).json({ message: commitErr.message });
                                });
                              }

                              res.json({ message: "Intervention deleted" });
                            });
                          }
                        );
                      }
                    );
                  }
                );
              }
            );
          });
        });
      }
    );
  });
});

// GET other indicators
// GET other indicators
app.get("/projects/:id/other-indicators", (req, res) => {
  db.query(
    "SELECT * FROM project_other_indicators WHERE project_id=? LIMIT 1",
    [req.params.id],
    (err, rows) => {
      if (err) {
        console.error("GET /projects/:id/other-indicators ERROR:", err);
        return res.status(500).json(err);
      }
      res.json(rows[0] || null);
    }
  );
});

// UPSERT other indicators
app.put("/projects/:id/other-indicators", (req, res) => {
  const projectId = req.params.id;
  const b = req.body || {};

  const jobs = b.jobsGenerated || {};
  const inc = b.jobsIncreasePct || {};
  const prod = b.productivityPct || {};
  const gross = b.grossSales || {};

  const sql = `
    INSERT INTO project_other_indicators
      (
        project_id,
        jobs_q1, jobs_q2, jobs_q3, jobs_q4,
        jobs_inc_q1, jobs_inc_q2, jobs_inc_q3, jobs_inc_q4,
        prod_q1, prod_q2, prod_q3, prod_q4,
        gross_q1, gross_q2, gross_q3, gross_q4
      )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      jobs_q1=VALUES(jobs_q1),
      jobs_q2=VALUES(jobs_q2),
      jobs_q3=VALUES(jobs_q3),
      jobs_q4=VALUES(jobs_q4),
      jobs_inc_q1=VALUES(jobs_inc_q1),
      jobs_inc_q2=VALUES(jobs_inc_q2),
      jobs_inc_q3=VALUES(jobs_inc_q3),
      jobs_inc_q4=VALUES(jobs_inc_q4),
      prod_q1=VALUES(prod_q1),
      prod_q2=VALUES(prod_q2),
      prod_q3=VALUES(prod_q3),
      prod_q4=VALUES(prod_q4),
      gross_q1=VALUES(gross_q1),
      gross_q2=VALUES(gross_q2),
      gross_q3=VALUES(gross_q3),
      gross_q4=VALUES(gross_q4)
  `;

  const vals = [
    projectId,

    Number(jobs.q1 || 0),
    Number(jobs.q2 || 0),
    Number(jobs.q3 || 0),
    Number(jobs.q4 || 0),

    Number(inc.q1 || 0),
    Number(inc.q2 || 0),
    Number(inc.q3 || 0),
    Number(inc.q4 || 0),

    Number(prod.q1 || 0),
    Number(prod.q2 || 0),
    Number(prod.q3 || 0),
    Number(prod.q4 || 0),

    Number(gross.q1 || 0),
    Number(gross.q2 || 0),
    Number(gross.q3 || 0),
    Number(gross.q4 || 0),
  ];

  db.query(sql, vals, (err) => {
    if (err) {
      console.error("PUT /projects/:id/other-indicators ERROR:", err);
      return res.status(500).json(err);
    }
    res.json({ message: "Other indicators saved" });
  });
});

// DELETE other indicators
app.delete("/projects/:id/other-indicators", (req, res) => {
  db.query(
    "DELETE FROM project_other_indicators WHERE project_id=?",
    [req.params.id],
    (err) => {
      if (err) {
        console.error("DELETE /projects/:id/other-indicators ERROR:", err);
        return res.status(500).json(err);
      }
      res.json({ message: "Other indicators deleted" });
    }
  );
});

// ===========================
// TARGET SETTINGS ROUTES
// ===========================
app.get("/target-settings/:moduleName", (req, res) => {
  const moduleName = String(req.params.moduleName || "").trim().toLowerCase();

  if (!moduleName) {
    return res.status(400).json({ message: "moduleName is required" });
  }

  ensureTargetSettingsDefaults(moduleName, (seedErr) => {
    if (seedErr) {
      console.error("SEED /target-settings/:moduleName ERROR:", seedErr);
      return res.status(500).json({ message: seedErr.message });
    }

    db.query(
      `
      SELECT *
      FROM target_settings
      WHERE module_name = ?
      ORDER BY id ASC, kpi_label ASC
      `,
      [moduleName],
      (err, rows) => {
        if (err) {
          console.error("GET /target-settings/:moduleName ERROR:", err);
          return res.status(500).json({ message: err.message });
        }

        res.json(normalizeTargetSettingRows(rows));
      }
    );
  });
});

app.put("/target-settings/:moduleName", (req, res) => {
  const moduleName = String(req.params.moduleName || "").trim().toLowerCase();
  const rawRows = Array.isArray(req.body?.rows)
    ? req.body.rows
    : Array.isArray(req.body)
      ? req.body
      : [];

  if (!moduleName) {
    return res.status(400).json({ message: "moduleName is required" });
  }

  const normalizedRows = rawRows
    .map((r = {}, index) => ({
      sort_index: index,
      module_name: moduleName,
      kpi_key: String(r.kpiKey ?? r.kpi_key ?? r.key ?? "").trim(),
      kpi_label: String(r.kpiLabel ?? r.kpi_label ?? r.kpi ?? "").trim(),
      annual_target: toNumOrZero(r.annualTarget ?? r.annual_target ?? 0),
      q1_target: toNumOrZero(r.t1 ?? r.q1_target ?? 0),
      q2_target: toNumOrZero(r.t2 ?? r.q2_target ?? 0),
      q3_target: toNumOrZero(r.t3 ?? r.q3_target ?? 0),
      q4_target: toNumOrZero(r.t4 ?? r.q4_target ?? 0),
    }))
    .filter((r) => r.kpi_key && r.kpi_label);

  const dedupedRows = [];
  const seen = new Set();

  for (const row of normalizedRows) {
    const dedupeKey = `${row.module_name}::${row.kpi_key}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    dedupedRows.push(row);
  }

  console.log("[TARGET SETTINGS UPSERT] module:", moduleName);
  console.log("[TARGET SETTINGS UPSERT] raw row count:", rawRows.length);
  console.log("[TARGET SETTINGS UPSERT] normalized row count:", dedupedRows.length);
  console.log("[TARGET SETTINGS UPSERT] keys:", dedupedRows.map((r) => r.kpi_key));

  if (!dedupedRows.length) {
    return res.json({
      success: true,
      message: "No target settings to save",
      savedCount: 0,
      savedKeys: [],
    });
  }

  const upsertSql = `
    INSERT INTO target_settings (
      module_name,
      kpi_key,
      kpi_label,
      annual_target,
      q1_target,
      q2_target,
      q3_target,
      q4_target
    ) VALUES ?
    ON DUPLICATE KEY UPDATE
      kpi_label = VALUES(kpi_label),
      annual_target = VALUES(annual_target),
      q1_target = VALUES(q1_target),
      q2_target = VALUES(q2_target),
      q3_target = VALUES(q3_target),
      q4_target = VALUES(q4_target)
  `;

  const values = dedupedRows.map((row) => [
    row.module_name,
    row.kpi_key,
    row.kpi_label,
    row.annual_target,
    row.q1_target,
    row.q2_target,
    row.q3_target,
    row.q4_target,
  ]);

  db.query(upsertSql, [values], (err) => {
    if (err) {
      console.error("UPSERT target settings ERROR:", err);
      return res.status(500).json({ message: err.message });
    }

    res.json({
      success: true,
      message: "Target settings saved successfully",
      savedCount: dedupedRows.length,
      savedKeys: dedupedRows.map((r) => r.kpi_key),
    });
  });
});





const quarterFromDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return Math.floor(d.getUTCMonth() / 3) + 1;
};

const parseInterventionNotesObject = (notes) => {
  if (notes && typeof notes === "object" && !Array.isArray(notes)) return notes;
  const parsed = parseJsonSafe(notes);
  return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
};

const firstArrayLike = (...values) => {
  for (const value of values) {
    if (Array.isArray(value)) return value;
    const parsed = parseJsonSafe(value);
    if (Array.isArray(parsed)) return parsed;
  }
  return [];
};

const normalizePhotoList = (rawPhotos = []) => {
  const list = Array.isArray(rawPhotos) ? rawPhotos : firstArrayLike(rawPhotos);

  return list
    .map((item) => {
      if (!item) return null;

      if (typeof item === "string") {
        const dataUrl = String(item).trim();
        if (!dataUrl) return null;
        return {
          name: "photo",
          type: "image/jpeg",
          dataUrl,
        };
      }

      const dataUrl = String(
        item?.dataUrl ||
        item?.photo_data ||
        item?.file_data ||
        item?.src ||
        item?.url ||
        item?.preview ||
        item?.base64 ||
        ""
      ).trim();

      if (!dataUrl) return null;

      return {
        name: String(item?.name || item?.photo_name || item?.file_name || "photo").trim() || "photo",
        type:
          String(item?.type || item?.photo_type || item?.mime_type || "image/jpeg").trim() ||
          "image/jpeg",
        dataUrl,
      };
    })
    .filter(Boolean);
};

const normalizeTechRolloutRowInput = (row = {}, fallback = {}) => {
  const merged = { ...fallback, ...row };

  const resolvedDateTransferred = pickFirst(
    merged.dateTransferred,
    merged.date_transferred,
    merged.activityDate,
    merged.activity_date,
    fallback.dateTransferred,
    fallback.date_transferred,
    fallback.activityDate,
    fallback.activity_date,
    fallback.date,
    null
  );

  return mapTechnologyRolloutPayload({
    quarter:
      pickFirst(
        merged.quarter,
        merged.q,
        merged.quarterNo,
        quarterFromDate(resolvedDateTransferred)
      ) || "",
    unitCenter: pickFirst(
      merged.unitCenter,
      merged.unit_center,
      merged.unit,
      merged.unitcenter,
      "DOST-PANGASINAN"
    ),
    nameOfTechnologyTransferred: pickFirst(
      merged.nameOfTechnologyTransferred,
      merged.name_of_technology_transferred,
      merged.technologyTransferred,
      merged.technology_transferred,
      merged.knowledgeTech,
      merged.knowledge_tech,
      merged.title,
      fallback.title,
      ""
    ),
    technologyGenerator: pickFirst(
      merged.technologyGenerator,
      merged.technology_generator,
      merged.techGenerator,
      merged.tech_generator,
      ""
    ),
    modeOfTransfer: pickFirst(
      merged.modeOfTransfer,
      merged.mode_of_transfer,
      merged.modeTransfer,
      merged.mode_transfer,
      ""
    ),
    isDostDevelopedFunded: pickFirst(
      merged.isDostDevelopedFunded,
      merged.is_dost_developed_funded,
      false
    ),
    dateTransferred: resolvedDateTransferred,
    activityTitle: pickFirst(
      merged.activityTitle,
      merged.activity_title,
      merged.title,
      fallback.title,
      ""
    ),
    activityDate: pickFirst(
      merged.activityDate,
      merged.activity_date,
      resolvedDateTransferred,
      fallback.activityDate,
      fallback.activity_date,
      fallback.date,
      null
    ),
    activityVenue: pickFirst(
      merged.activityVenue,
      merged.activity_venue,
      merged.activityDateVenue,
      merged.activity_date_venue,
      merged.venue,
      fallback.venue,
      ""
    ),
    institutionName: pickFirst(
      merged.institutionName,
      merged.institution_name,
      merged.institutionNameAddress,
      merged.institution_name_address,
      merged.customerName,
      merged.customer_name,
      fallback.firmName,
      fallback.firm_name,
      ""
    ),
    institutionAddress: pickFirst(
      merged.institutionAddress,
      merged.institution_address,
      merged.institutionNameAddress,
      merged.institution_name_address,
      merged.address,
      merged.activityDateVenue,
      merged.activity_date_venue,
      merged.venue,
      fallback.address,
      fallback.venue,
      ""
    ),
    institutionAddressMeta: pickFirst(
      merged.institutionAddressMeta,
      merged.addressMeta,
      merged.institution_address_meta,
      fallback.addressMeta,
      null
    ),
    classification: pickFirst(merged.classification, ""),
    representativeName: pickFirst(
      merged.representativeName,
      merged.representative_name,
      merged.representativeNameDesignation,
      merged.representative_name_designation,
      merged.customerName,
      merged.customer_name,
      ""
    ),
    representativeDesignation: pickFirst(
      merged.representativeDesignation,
      merged.representative_designation,
      "",
      null
    ),
    sex: pickFirst(merged.sex, ""),
  });
};

const extractTechRolloutRowsFromInterventionBody = (body = {}) => {
  const notesObj = parseInterventionNotesObject(body.notes);
  const rawRows =
    pickFirst(
      body.techRolloutRows,
      body.technologyRolloutRows,
      body.rolloutRows,
      notesObj.techRolloutRows,
      notesObj.technologyRolloutRows,
      notesObj.rolloutRows,
      null
    ) || [];

  if (Array.isArray(rawRows) && rawRows.length) {
    return rawRows.map((row) => normalizeTechRolloutRowInput(row, body));
  }

  if (String(body.type || "").trim() === "Tech Roll Out") {
    return [normalizeTechRolloutRowInput(body, body)];
  }

  return [];
};

const setInterventionTechRolloutIdsInNotes = (
  interventionId,
  rawNotes,
  techRolloutEntryIds,
  callback
) => {
  const notesObj = parseInterventionNotesObject(rawNotes);
  notesObj.techRolloutEntryIds = techRolloutEntryIds;
  const nextNotes = JSON.stringify(notesObj);

  db.query(
    "UPDATE project_interventions SET notes = ? WHERE id = ?",
    [nextNotes, interventionId],
    (err) => {
      if (err) return callback(err);
      callback(null, nextNotes);
    }
  );
};

const deleteTechnologyRolloutEntriesByIds = (ids, callback) => {
  const list = (Array.isArray(ids) ? ids : [])
    .map((x) => Number(x))
    .filter((x) => Number.isFinite(x) && x > 0);

  if (!list.length) return callback(null);

  const placeholders = list.map(() => "?").join(",");
  db.query(
    `DELETE FROM technology_rollout WHERE id IN (${placeholders})`,
    list,
    (err) => {
      if (err) return callback(err);
      callback(null);
    }
  );
};

const syncTechnologyRolloutEntriesForIntervention = (
  { interventionId, type, body, previousNotes },
  callback
) => {
  const previousNotesObj = parseInterventionNotesObject(previousNotes);
  const oldIds = Array.isArray(previousNotesObj.techRolloutEntryIds)
    ? previousNotesObj.techRolloutEntryIds
    : [];

  deleteTechnologyRolloutEntriesByIds(oldIds, (deleteErr) => {
    if (deleteErr) return callback(deleteErr);

    if (type !== "Tech Roll Out") {
      return setInterventionTechRolloutIdsInNotes(
        interventionId,
        body.notes,
        [],
        callback
      );
    }

    const rows = extractTechRolloutRowsFromInterventionBody(body);
    if (!rows.length) {
      return setInterventionTechRolloutIdsInNotes(
        interventionId,
        body.notes,
        [],
        callback
      );
    }

    const insertSql = `
      INSERT INTO technology_rollout (
        quarter,
        unit_center,
        name_of_technology_transferred,
        technology_generator,
        mode_of_transfer,
        is_dost_developed_funded,
        date_transferred,
        activity_title,
        activity_date,
        activity_venue,
        institution_name,
        institution_address,
        address_mode,
        address_manual_text,
        address_display_text,
        address_province,
        address_municipality,
        address_barangay,
        address_lat,
        address_lng,
        classification,
        representative_name,
        representative_designation,
        sex
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const createdIds = [];
    let i = 0;

    const next = () => {
      if (i >= rows.length) {
        return setInterventionTechRolloutIdsInNotes(
          interventionId,
          body.notes,
          createdIds,
          callback
        );
      }

      const p = rows[i++];

      db.query(
        insertSql,
        [
          p.quarter,
          p.unit_center,
          p.name_of_technology_transferred,
          p.technology_generator,
          p.mode_of_transfer,
          p.is_dost_developed_funded,
          p.date_transferred,
          p.activity_title,
          p.activity_date,
          p.activity_venue,
          p.institution_name,
          p.institution_address,
          p.address_mode,
          p.address_manual_text,
          p.address_display_text,
          p.address_province,
          p.address_municipality,
          p.address_barangay,
          p.address_lat,
          p.address_lng,
          p.classification,
          p.representative_name,
          p.representative_designation,
          p.sex,
        ],
        (err, result) => {
          if (err) return callback(err);
          createdIds.push(Number(result.insertId));
          next();
        }
      );
    };

    next();
  });
};

const deleteTechnologyRolloutEntriesFromInterventionNotes = (notes, callback) => {
  const notesObj = parseInterventionNotesObject(notes);
  deleteTechnologyRolloutEntriesByIds(notesObj.techRolloutEntryIds || [], callback);
};

const parsePackagingInterventionPayload = (body = {}) => {
  const notesObj = parseInterventionNotesObject(body.notes);
  const bodyPackaging =
    body.packaging && typeof body.packaging === "object" && !Array.isArray(body.packaging)
      ? body.packaging
      : {};
  const notesPackaging =
    notesObj.packaging && typeof notesObj.packaging === "object" && !Array.isArray(notesObj.packaging)
      ? notesObj.packaging
      : {};

  const quarterRaw = pickFirst(
    body.packagingQuarter,
    body.packaging_quarter,
    bodyPackaging.quarter,
    body.quarter,
    notesObj.packagingQuarter,
    notesObj.packaging_quarter,
    notesPackaging.quarter,
    notesObj.quarter,
    ""
  );
  const quarterNum = Number(String(quarterRaw).replace(/[^0-9]/g, ""));

  const mainProductName = String(
    pickFirst(
      body.packagingProductName,
      body.packaging_product_name,
      bodyPackaging.productName,
      bodyPackaging.product_name,
      body.productName,
      body.product_name,
      notesObj.packagingProductName,
      notesObj.packaging_product_name,
      notesPackaging.productName,
      notesPackaging.product_name,
      notesObj.productName,
      notesObj.product_name,
      ""
    ) || ""
  ).trim();

  const products = Array.isArray(body.products)
    ? body.products
    : Array.isArray(bodyPackaging.products)
      ? bodyPackaging.products
      : Array.isArray(notesObj.products)
        ? notesObj.products
        : Array.isArray(notesPackaging.products)
          ? notesPackaging.products
          : mainProductName
            ? [{ productName: mainProductName }]
            : [];

  const photos = normalizePhotoList(
    firstArrayLike(
      body.packagingPhotos,
      body.packaging_photos,
      bodyPackaging.photos,
      bodyPackaging.packagingPhotos,
      bodyPackaging.packaging_photos,
      body.photos,
      notesObj.packagingPhotos,
      notesObj.packaging_photos,
      notesPackaging.photos,
      notesPackaging.packagingPhotos,
      notesPackaging.packaging_photos,
      notesObj.photos
    )
  );

  const addressMeta =
    pickFirst(
      body.packagingAddressMeta,
      body.packaging_address_meta,
      bodyPackaging.addressMeta,
      bodyPackaging.packagingAddressMeta,
      body.addressMeta,
      notesObj.packagingAddressMeta,
      notesObj.packaging_address_meta,
      notesPackaging.addressMeta,
      notesPackaging.packagingAddressMeta,
      notesObj.addressMeta,
      null
    ) || null;

  return {
    quarter: Number.isFinite(quarterNum) && quarterNum > 0 ? quarterNum : null,
    province:
      String(
        pickFirst(
          body.packagingProvince,
          body.packaging_province,
          bodyPackaging.province,
          body.province,
          notesObj.packagingProvince,
          notesObj.packaging_province,
          notesPackaging.province,
          notesObj.province,
          "Pangasinan"
        ) || "Pangasinan"
      ).trim() || "Pangasinan",
    date_completed: toNullIfEmpty(
      pickFirst(
        body.packagingDateCompleted,
        body.packaging_date_completed,
        bodyPackaging.dateCompleted,
        bodyPackaging.date_completed,
        body.dateCompletedExecuted,
        body.dateCompleted,
        body.date_completed,
        body.date,
        notesObj.packagingDateCompleted,
        notesObj.packaging_date_completed,
        notesPackaging.dateCompleted,
        notesPackaging.date_completed,
        notesObj.dateCompletedExecuted,
        notesObj.dateCompleted,
        notesObj.date_completed,
        null
      )
    ),
    type_of_intervention: String(
      pickFirst(
        body.packagingTypeOfIntervention,
        body.packaging_type_of_intervention,
        bodyPackaging.typeOfIntervention,
        bodyPackaging.type_of_intervention,
        body.typeOfIntervention,
        body.type_of_intervention,
        notesObj.packagingType,
        notesObj.packagingTypeOfIntervention,
        notesObj.packaging_type_of_intervention,
        notesPackaging.type,
        notesPackaging.typeOfIntervention,
        notesPackaging.type_of_intervention,
        body.title,
        ""
      ) || ""
    ).trim(),
    product_name: mainProductName,
    size_variant: String(
      pickFirst(
        body.packagingSizeVariant,
        body.packaging_size_variant,
        bodyPackaging.sizeVariantMaterial,
        bodyPackaging.sizeVariant,
        bodyPackaging.size_variant,
        body.sizeVariantMaterial,
        body.sizeVariant,
        body.size_variant,
        notesObj.packagingSizeVariant,
        notesObj.packaging_size_variant,
        notesPackaging.sizeVariantMaterial,
        notesPackaging.sizeVariant,
        notesPackaging.size_variant,
        notesObj.sizeVariantMaterial,
        notesObj.sizeVariant,
        ""
      ) || ""
    ).trim(),
    packaging_materials_provided: String(
      pickFirst(
        body.packagingMaterialsProvided,
        body.packaging_materials_provided,
        bodyPackaging.packagingMaterialsProvided,
        bodyPackaging.packaging_materials_provided,
        body.noOfPackagingMaterialsProvided,
        notesObj.packagingMaterialsProvided,
        notesObj.packaging_materials_provided,
        notesPackaging.packagingMaterialsProvided,
        notesPackaging.packaging_materials_provided,
        notesObj.noOfPackagingMaterialsProvided,
        ""
      ) || ""
    ).trim(),
    customer_name: String(
      pickFirst(
        body.packagingCustomerName,
        body.packaging_customer_name,
        bodyPackaging.customerName,
        bodyPackaging.customer_name,
        body.customerName,
        body.customer_name,
        notesObj.packagingCustomerName,
        notesObj.packaging_customer_name,
        notesPackaging.customerName,
        notesPackaging.customer_name,
        notesObj.customerName,
        ""
      ) || ""
    ).trim(),
    sex: toNullIfEmpty(
      pickFirst(
        body.packagingSex,
        body.packaging_sex,
        bodyPackaging.sex,
        body.sex,
        notesObj.packagingSex,
        notesObj.packaging_sex,
        notesPackaging.sex,
        notesObj.sex,
        null
      )
    ),
    firm_name: String(
      pickFirst(
        body.packagingFirmInstitution,
        body.packaging_firm_institution,
        bodyPackaging.firmInstitution,
        bodyPackaging.firmName,
        bodyPackaging.firm_name,
        body.firmName,
        body.firm_name,
        notesObj.packagingFirmInstitution,
        notesObj.packaging_firm_institution,
        notesPackaging.firmInstitution,
        notesPackaging.firmName,
        notesPackaging.firm_name,
        notesObj.firmName,
        ""
      ) || ""
    ).trim(),
    address: String(
      pickFirst(
        body.packagingAddress,
        body.packaging_address,
        bodyPackaging.address,
        body.address,
        notesObj.packagingAddress,
        notesObj.packaging_address,
        notesPackaging.address,
        notesObj.address,
        body.venue,
        ""
      ) || ""
    ).trim(),
    addressMeta,
    means_of_verification: toNullIfEmpty(
      pickFirst(
        body.packagingMeansVerification,
        body.packaging_means_of_verification,
        bodyPackaging.meansOfVerification,
        bodyPackaging.means_of_verification,
        body.meansOfVerification,
        body.means_of_verification,
        notesObj.packagingMeansVerification,
        notesObj.packaging_means_of_verification,
        notesPackaging.meansOfVerification,
        notesPackaging.means_of_verification,
        notesObj.meansOfVerification,
        null
      )
    ),
    remarks: toNullIfEmpty(
      pickFirst(
        body.packagingRemarks,
        body.packaging_remarks,
        bodyPackaging.remarks,
        body.remarks,
        notesObj.packagingNotesRemarks,
        notesObj.packagingRemarks,
        notesObj.packaging_remarks,
        notesPackaging.remarks,
        notesObj.remarks,
        null
      )
    ),
    products,
    photos,
  };
};

const buildPackagingRecordParams = ({
  projectId,
  interventionId,
  payload,
}) => {
  const meta = payload.addressMeta || {};
  const addressText = String(payload.address || "").trim();

  return [
    projectId,
    interventionId,
    payload.quarter,
    payload.province,
    payload.date_completed,
    payload.type_of_intervention,
    payload.product_name,
    payload.size_variant,
    payload.packaging_materials_provided,
    payload.customer_name,
    payload.sex,
    payload.firm_name,
    addressText,
    toNullIfEmpty(meta?.mode),
    toNullIfEmpty(meta?.manualText),
    toNullIfEmpty(meta?.displayText || addressText),
    toNullIfEmpty(meta?.municipality),
    toNullIfEmpty(meta?.barangay),
    toNumOrNull(meta?.lat),
    toNumOrNull(meta?.lng),
    payload.means_of_verification,
    payload.remarks,
  ];
};

const syncPackagingRecordForIntervention = ({
  projectId,
  interventionId,
  type,
  body,
}, callback) => {
  if (String(type || "").trim() !== "Packaging & Labeling") {
    return deletePackagingRecordByInterventionId(interventionId, callback);
  }

  const payload = parsePackagingInterventionPayload(body || {});
  const params = buildPackagingRecordParams({
    projectId,
    interventionId,
    payload,
  });

  db.query(
    "SELECT id FROM packaging_labeling_records WHERE intervention_id = ? LIMIT 1",
    [interventionId],
    (findErr, rows) => {
      if (findErr) return callback(findErr);

      const existingId = rows?.[0]?.id ? Number(rows[0].id) : null;
      const sql = existingId
        ? `
          UPDATE packaging_labeling_records
          SET
            project_id = ?,
            intervention_id = ?,
            quarter = ?,
            province = ?,
            date_completed = ?,
            type_of_intervention = ?,
            product_name = ?,
            size_variant = ?,
            packaging_materials_provided = ?,
            customer_name = ?,
            sex = ?,
            firm_name = ?,
            address = ?,
            address_mode = ?,
            address_manual_text = ?,
            address_display_text = ?,
            municipality = ?,
            barangay = ?,
            lat = ?,
            lng = ?,
            means_of_verification = ?,
            remarks = ?
          WHERE id = ?
        `
        : `
          INSERT INTO packaging_labeling_records (
            project_id,
            intervention_id,
            quarter,
            province,
            date_completed,
            type_of_intervention,
            product_name,
            size_variant,
            packaging_materials_provided,
            customer_name,
            sex,
            firm_name,
            address,
            address_mode,
            address_manual_text,
            address_display_text,
            municipality,
            barangay,
            lat,
            lng,
            means_of_verification,
            remarks
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

      const sqlParams = existingId ? [...params, existingId] : params;

      db.query(sql, sqlParams, (saveErr, result) => {
        if (saveErr) return callback(saveErr);

        const recordId = existingId || result.insertId;

        db.query(
          "DELETE FROM packaging_labeling_products WHERE record_id = ?",
          [recordId],
          (deleteProductsErr) => {
            if (deleteProductsErr) return callback(deleteProductsErr);

            db.query(
              "DELETE FROM packaging_labeling_photos WHERE record_id = ?",
              [recordId],
              (deletePhotosErr) => {
                if (deletePhotosErr) return callback(deletePhotosErr);

                savePackagingLabelingProducts(
                  recordId,
                  payload.products,
                  (productErr) => {
                    if (productErr) return callback(productErr);

                    savePackagingLabelingPhotos(
                      recordId,
                      payload.photos,
                      (photoErr) => {
                        if (photoErr) return callback(photoErr);
                        callback(null, recordId);
                      }
                    );
                  }
                );
              }
            );
          }
        );
      });
    }
  );
};

const deletePackagingRecordByInterventionId = (interventionId, callback) => {
  db.query(
    "SELECT id FROM packaging_labeling_records WHERE intervention_id = ? LIMIT 1",
    [interventionId],
    (findErr, rows) => {
      if (findErr) return callback(findErr);

      const recordId = rows?.[0]?.id ? Number(rows[0].id) : null;
      if (!recordId) return callback(null);

      db.query(
        "DELETE FROM packaging_labeling_products WHERE record_id = ?",
        [recordId],
        (productErr) => {
          if (productErr) return callback(productErr);

          db.query(
            "DELETE FROM packaging_labeling_photos WHERE record_id = ?",
            [recordId],
            (photoErr) => {
              if (photoErr) return callback(photoErr);

              db.query(
                "DELETE FROM packaging_labeling_records WHERE id = ?",
                [recordId],
                (deleteErr) => {
                  if (deleteErr) return callback(deleteErr);
                  callback(null);
                }
              );
            }
          );
        }
      );
    }
  );
};

const normalizeTacsSyncSource = (rawModule = "", rawTable = "") => {
  const source_module = String(rawModule || "SETUP").trim() || "SETUP";
  const source_table =
    String(rawTable || "project_interventions").trim() ||
    "project_interventions";

  return { source_module, source_table };
};

const buildTacsSyncRecordId = ({ source_table, interventionId }) =>
  `${String(source_table || "interventions").trim() || "interventions"}-${Number(
    interventionId
  )}`;

const parseTacsInterventionPayload = (body = {}) => ({
  type_of_consultancy: toNullIfEmpty(
    pickFirst(
      body.tacs_consultancy_type,
      body.tacsConsultancyType,
      body.type_of_consultancy,
      body.typeOfConsultancy,
      null
    )
  ),
  date_of_engagement: toNullIfEmpty(
    pickFirst(
      body.tacs_date_engagement,
      body.tacsDateEngagement,
      body.date_of_engagement,
      body.dateOfEngagement,
      body.date,
      null
    )
  ),
  expert_institution: toNullIfEmpty(
    pickFirst(
      body.tacs_expert_institution,
      body.tacsExpertInstitution,
      body.expert_institution,
      body.expertInstitution,
      null
    )
  ),
  customer_name: toNullIfEmpty(
    pickFirst(
      body.tacs_customer_name,
      body.tacsCustomerName,
      body.customer_name,
      body.customerName,
      null
    )
  ),
  sex: toNullIfEmpty(
    pickFirst(body.tacs_customer_sex, body.tacsCustomerSex, body.sex, null)
  ),
  customer_address_text: toNullIfEmpty(
    pickFirst(
      body.tacs_customer_address,
      body.tacsCustomerAddress,
      body.customer_address_text,
      body.customerAddressText,
      body.venue,
      null
    )
  ),
  customer_address_meta: pickFirst(
    body.tacs_customer_address_meta,
    body.tacsCustomerAddressMeta,
    body.customer_address_meta,
    body.customerAddressMeta,
    null
  ),
  advice_count: toNumOrNull(
    pickFirst(
      body.tacs_no_of_advice,
      body.tacsNoOfAdvice,
      body.advice_count,
      body.adviceCount,
      null
    )
  ),
  means_of_verification: toNullIfEmpty(
    pickFirst(
      body.tacs_means_verification,
      body.tacsMeansVerification,
      body.means_of_verification,
      body.meansOfVerification,
      null
    )
  ),
  photos: Array.isArray(body.tacs_photos)
    ? body.tacs_photos
    : Array.isArray(body.tacsPhotos)
      ? body.tacsPhotos
      : Array.isArray(body.photos)
        ? body.photos
        : [],
});

const syncTacsEntryForIntervention = (
  {
    projectId,
    interventionId,
    type,
    body,
    source_module = "SETUP",
    source_table = "project_interventions",
  },
  callback
) => {
  const sourceInfo = normalizeTacsSyncSource(source_module, source_table);
  const normalizedType = String(type || "").trim().toLowerCase();

  if (normalizedType !== "tacs") {
    return deleteTacsEntryByInterventionId(interventionId, callback, sourceInfo);
  }

  const payload = parseTacsInterventionPayload(body || {});
  const hasMeaningfulData = Boolean(
    payload.type_of_consultancy ||
    payload.date_of_engagement ||
    payload.expert_institution ||
    payload.customer_name ||
    payload.customer_address_text ||
    payload.means_of_verification ||
    payload.advice_count !== null ||
    (Array.isArray(payload.photos) && payload.photos.length)
  );

  if (!hasMeaningfulData) {
    return deleteTacsEntryByInterventionId(interventionId, callback, sourceInfo);
  }

  db.query(
    "SELECT id FROM tacs_entries WHERE source_module = ? AND source_table = ? AND intervention_id = ? LIMIT 1",
    [sourceInfo.source_module, sourceInfo.source_table, interventionId],
    (findErr, rows) => {
      if (findErr) return callback(findErr);

      const existingId = rows?.[0]?.id || null;
      const recordId =
        existingId ||
        buildTacsSyncRecordId({
          source_table: sourceInfo.source_table,
          interventionId,
        });
      const sql = existingId
        ? `
          UPDATE tacs_entries
          SET
            project_id = ?,
            source_module = ?,
            source_table = ?,
            intervention_id = ?,
            type_of_consultancy = ?,
            date_of_engagement = ?,
            expert_institution = ?,
            customer_name = ?,
            sex = ?,
            customer_address_text = ?,
            customer_address_meta = ?,
            advice_count = ?,
            means_of_verification = ?,
            photos = ?
          WHERE source_module = ? AND source_table = ? AND intervention_id = ?
        `
        : `
          INSERT INTO tacs_entries (
            id,
            project_id,
            source_module,
            source_table,
            intervention_id,
            type_of_consultancy,
            date_of_engagement,
            expert_institution,
            customer_name,
            sex,
            customer_address_text,
            customer_address_meta,
            advice_count,
            means_of_verification,
            photos
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

      const params = existingId
        ? [
          projectId,
          sourceInfo.source_module,
          sourceInfo.source_table,
          interventionId,
          payload.type_of_consultancy,
          payload.date_of_engagement,
          payload.expert_institution,
          payload.customer_name,
          payload.sex,
          payload.customer_address_text,
          mapTacsAddressMeta(payload.customer_address_meta),
          payload.advice_count,
          payload.means_of_verification,
          mapTacsAddressMeta(payload.photos),
          sourceInfo.source_module,
          sourceInfo.source_table,
          interventionId,
        ]
        : [
          recordId,
          projectId,
          sourceInfo.source_module,
          sourceInfo.source_table,
          interventionId,
          payload.type_of_consultancy,
          payload.date_of_engagement,
          payload.expert_institution,
          payload.customer_name,
          payload.sex,
          payload.customer_address_text,
          mapTacsAddressMeta(payload.customer_address_meta),
          payload.advice_count,
          payload.means_of_verification,
          mapTacsAddressMeta(payload.photos),
        ];

      db.query(sql, params, (saveErr) => {
        if (saveErr) return callback(saveErr);
        callback(null, recordId);
      });
    }
  );
};

const deleteTacsEntryByInterventionId = (
  interventionId,
  callback,
  options = {}
) => {
  const sourceInfo = normalizeTacsSyncSource(
    options?.source_module,
    options?.source_table
  );

  db.query(
    "DELETE FROM tacs_entries WHERE source_module = ? AND source_table = ? AND intervention_id = ?",
    [sourceInfo.source_module, sourceInfo.source_table, interventionId],
    (err) => {
      if (err) return callback(err);
      callback(null);
    }
  );
};

// ===========================
// PACKAGING AND LABELING HELPERS
// ===========================
const normalizePackagingLabelingRecord = (row, products = [], photos = []) => ({
  id: Number(row.id),
  projectId:
    row.project_id !== null && row.project_id !== undefined
      ? Number(row.project_id)
      : null,
  interventionId:
    row.intervention_id !== null && row.intervention_id !== undefined
      ? Number(row.intervention_id)
      : null,
  quarter: row.quarter ? String(row.quarter) : "",
  province: row.province || "Pangasinan",
  dateCompleted: row.date_completed ? formatDateOnly(row.date_completed) : "",
  typeOfIntervention: row.type_of_intervention || "",
  productName: row.product_name || "",
  sizeVariant: row.size_variant || "",
  packagingMaterialsProvided: row.packaging_materials_provided || "",
  customerName: row.customer_name || "",
  sex: row.sex || "",
  firmName: row.firm_name || "",
  address: row.address || "",
  addressMeta: {
    mode: row.address_mode || null,
    manualText: row.address_manual_text || "",
    displayText: row.address_display_text || row.address || "",
    province: row.province || "Pangasinan",
    municipality: row.municipality || "",
    barangay: row.barangay || "",
    lat:
      row.lat !== null && row.lat !== undefined
        ? Number(row.lat)
        : null,
    lng:
      row.lng !== null && row.lng !== undefined
        ? Number(row.lng)
        : null,
  },
  meansOfVerification: row.means_of_verification || "",
  nameOfStaff: row.name_of_staff || "",
  name_of_staff: row.name_of_staff || "",
  staffName: row.name_of_staff || "",
  remarks: row.remarks || "",
  custom_fields: parseJsonSafe(row.custom_fields) || {},
  customFields: parseJsonSafe(row.custom_fields) || {},
  products,
  photos,
  created_at: row.created_at,
  updated_at: row.updated_at,
});

const mapPackagingLabelingPayload = (body = {}) => {
  const meta =
    body.addressMeta || {
      mode: body.address_mode,
      manualText: body.address_manual_text,
      displayText: body.address_display_text,
      province: body.address_province,
      municipality: body.address_municipality,
      barangay: body.address_barangay,
      lat: body.address_lat,
      lng: body.address_lng,
    };

  const addressText = String(
    body.address ||
    body.addressText ||
    body.address_display_text ||
    body.address_manual_text ||
    ""
  ).trim();

  return {
    quarter: toNumOrZero(body.quarter),
    province: String(body.province || "Pangasinan").trim() || "Pangasinan",
    date_completed: toNullIfEmpty(body.dateCompleted || body.date_completed),
    type_of_intervention: String(
      body.typeOfIntervention || body.type_of_intervention || ""
    ).trim(),
    product_name: String(
      body.productName || body.product_name || body.packagingProductName || ""
    ).trim(),
    size_variant: String(body.sizeVariant || body.size_variant || "").trim(),
    packaging_materials_provided: String(
      body.packagingMaterialsProvided ||
      body.packaging_materials_provided ||
      ""
    ).trim(),
    customer_name: String(body.customerName || body.customer_name || "").trim(),
    sex: toNullIfEmpty(body.sex),
    firm_name: String(body.firmName || body.firm_name || "").trim(),
    address: addressText,
    address_mode: toNullIfEmpty(meta?.mode),
    address_manual_text: toNullIfEmpty(meta?.manualText),
    address_display_text: toNullIfEmpty(meta?.displayText || addressText),
    municipality: toNullIfEmpty(meta?.municipality),
    barangay: toNullIfEmpty(meta?.barangay),
    lat: toNumOrNull(meta?.lat),
    lng: toNumOrNull(meta?.lng),
    means_of_verification: toNullIfEmpty(
      body.meansOfVerification || body.means_of_verification
    ),
    remarks: toNullIfEmpty(body.remarks),
  };
};

const savePackagingLabelingProducts = (recordId, products, callback) => {
  const list = Array.isArray(products) ? products : [];
  if (!list.length) return callback(null);

  let i = 0;
  const next = () => {
    if (i >= list.length) return callback(null);

    const item = list[i++];
    db.query(
      `
      INSERT INTO packaging_labeling_products
      (record_id, product_name)
      VALUES (?, ?)
      `,
      [recordId, String(item?.productName || item?.product_name || "").trim()],
      (err) => {
        if (err) return callback(err);
        next();
      }
    );
  };

  next();
};

const savePackagingLabelingPhotos = (recordId, photos, callback) => {
  const list = normalizePhotoList(photos);
  if (!list.length) return callback(null);

  let i = 0;
  const next = () => {
    if (i >= list.length) return callback(null);

    const item = list[i++];
    db.query(
      `
      INSERT INTO packaging_labeling_photos
      (record_id, photo_name, photo_type, photo_data)
      VALUES (?, ?, ?, ?)
      `,
      [recordId, item.name, item.type, item.dataUrl],
      (err) => {
        if (err) return callback(err);
        next();
      }
    );
  };

  next();
};


const PCL_PANGASINAN_DISTRICTS = {
  "District 1": [
    "Agno",
    "Alaminos City",
    "Anda",
    "Bani",
    "Bolinao",
    "Burgos",
    "Dasol",
    "Infanta",
    "Mabini",
    "Sual",
  ],
  "District 2": [
    "Aguilar",
    "Basista",
    "Binmaley",
    "Bugallon",
    "Labrador",
    "Lingayen",
    "Mangatarem",
    "Urbiztondo",
  ],
  "District 3": [
    "Bayambang",
    "Calasiao",
    "Malasiqui",
    "Mapandan",
    "San Carlos City",
    "Santa Barbara",
  ],
  "District 4": [
    "Dagupan City",
    "Manaoag",
    "Mangaldan",
    "San Fabian",
    "San Jacinto",
  ],
  "District 5": [
    "Alcala",
    "Bautista",
    "Binalonan",
    "Laoac",
    "Pozorrubio",
    "Santo Tomas",
    "Sison",
    "Urdaneta City",
    "Villasis",
  ],
  "District 6": [
    "Asingan",
    "Balungao",
    "Natividad",
    "Rosales",
    "San Manuel",
    "San Nicolas",
    "San Quintin",
    "Santa Maria",
    "Tayug",
    "Umingan",
  ],
};

const normalizePackagingLabelingDistrictKey = (value = "") => {
  const raw = String(value || "").trim();
  if (!raw || raw.toUpperCase() === "ALL") return "ALL";

  const collapsed = raw.replace(/\s+/g, "").toLowerCase();
  const match = collapsed.match(/^district(\d+)$/);

  if (match) return `District ${match[1]}`;
  return raw.replace(/\s+/g, " ");
};

const buildPackagingLabelingWhere = (query = {}) => {
  const where = [];
  const params = [];

  const search = String(query.search || "").trim();
  const year = String(query.year || "").trim();
  const district = normalizePackagingLabelingDistrictKey(query.district || "ALL");
  const month = String(query.month || "").trim();
  const municipality = String(query.municipality || "").trim();
  const quarter = String(query.quarter || "").trim();

  if (search) {
    const like = `%${search}%`;
    where.push(`(
      customer_name LIKE ?
      OR firm_name LIKE ?
      OR address LIKE ?
      OR type_of_intervention LIKE ?
      OR product_name LIKE ?
      OR size_variant LIKE ?
      OR means_of_verification LIKE ?
      OR remarks LIKE ?
    )`);
    params.push(like, like, like, like, like, like, like, like);
  }

  if (year && year !== "ALL" && String(year).toLowerCase() !== "all") {
    where.push("YEAR(date_completed) = ?");
    params.push(Number(year));
  }

  if (month && month !== "ALL" && String(month).toLowerCase() !== "all") {
    where.push("MONTH(date_completed) = ?");
    params.push(Number(month));
  }

  if (quarter && quarter !== "ALL" && String(quarter).toLowerCase() !== "all") {
    where.push("quarter = ?");
    params.push(Number(quarter));
  }

  if (district && district !== "ALL") {
    const municipalitiesForDistrict = PCL_PANGASINAN_DISTRICTS[district] || [];
    if (!municipalitiesForDistrict.length) {
      where.push("1 = 0");
    } else {
      const placeholders = municipalitiesForDistrict.map(() => "?").join(",");
      where.push(`municipality IN (${placeholders})`);
      params.push(...municipalitiesForDistrict);
    }
  }

  if (municipality && municipality !== "ALL" && municipality.toLowerCase() !== "all") {
    where.push("municipality = ?");
    params.push(municipality);
  }

  return {
    whereSql: where.length ? `WHERE ${where.join(" AND ")}` : "",
    params,
  };
};

const getPackagingLabelingOrderSql = (sort = "") => {
  const normalized = String(sort || "").trim().toLowerCase();
  if (normalized === "oldest") {
    return `
      ORDER BY
        date_completed ASC,
        id ASC
    `;
  }

  return `
    ORDER BY
      date_completed DESC,
      id DESC
  `;
};

const getPackagingLabelingRecordsByIds = (ids = [], callback) => {
  const normalizedIds = (ids || [])
    .map((id) => Number(id))
    .filter((id) => Number.isFinite(id) && id > 0);

  if (!normalizedIds.length) return callback(null, []);

  const wherePlaceholders = normalizedIds.map(() => "?").join(",");
  const fieldPlaceholders = normalizedIds.map(() => "?").join(",");

  db.query(
    `
    SELECT *
    FROM packaging_labeling_records
    WHERE id IN (${wherePlaceholders})
    ORDER BY FIELD(id, ${fieldPlaceholders})
    `,
    [...normalizedIds, ...normalizedIds],
    (err, rows) => {
      if (err) return callback(err);

      const recordIds = (rows || []).map((r) => r.id);
      if (!recordIds.length) return callback(null, []);

      const placeholders = recordIds.map(() => "?").join(",");

      db.query(
        `
        SELECT id, record_id, product_name
        FROM packaging_labeling_products
        WHERE record_id IN (${placeholders})
        ORDER BY id ASC
        `,
        recordIds,
        (productErr, productRows) => {
          if (productErr) return callback(productErr);

          db.query(
            `
            SELECT id, record_id, photo_name, photo_type, photo_data
            FROM packaging_labeling_photos
            WHERE record_id IN (${placeholders})
            ORDER BY id ASC
            `,
            recordIds,
            (photoErr, photoRows) => {
              if (photoErr) return callback(photoErr);

              const productMap = {};
              (productRows || []).forEach((p) => {
                if (!productMap[p.record_id]) productMap[p.record_id] = [];
                productMap[p.record_id].push({
                  id: Number(p.id),
                  productName: p.product_name || "",
                });
              });

              const photoMap = {};
              (photoRows || []).forEach((p) => {
                if (!photoMap[p.record_id]) photoMap[p.record_id] = [];
                photoMap[p.record_id].push({
                  id: Number(p.id),
                  name: p.photo_name || "",
                  type: p.photo_type || "",
                  dataUrl: p.photo_data || "",
                });
              });

              const payload = (rows || []).map((row) =>
                normalizePackagingLabelingRecord(
                  row,
                  productMap[row.id] || [],
                  photoMap[row.id] || []
                )
              );

              callback(null, payload);
            }
          );
        }
      );
    }
  );
};


const getPackagingLabelingRecords = (filters = {}, callback) => {
  const year = Number(filters.year || new Date().getFullYear());
  const quarter = String(filters.quarter || "ALL").trim();

  let sql = `
    SELECT *
    FROM packaging_labeling_records
    WHERE YEAR(date_completed) = ?
  `;
  const params = [year];

  if (quarter !== "ALL" && quarter !== "") {
    sql += ` AND quarter = ? `;
    params.push(Number(quarter));
  }

  sql += `
    ORDER BY
      COALESCE(project_id, 0) ASC,
      COALESCE(intervention_id, 0) ASC,
      date_completed ASC,
      id ASC
  `;

  db.query(sql, params, (err, rows) => {
    if (err) return callback(err);

    const ids = (rows || []).map((r) => r.id);
    if (!ids.length) return callback(null, []);

    const placeholders = ids.map(() => "?").join(",");

    db.query(
      `
      SELECT id, record_id, product_name
      FROM packaging_labeling_products
      WHERE record_id IN (${placeholders})
      ORDER BY id ASC
      `,
      ids,
      (productErr, productRows) => {
        if (productErr) return callback(productErr);

        db.query(
          `
          SELECT id, record_id, photo_name, photo_type, photo_data
          FROM packaging_labeling_photos
          WHERE record_id IN (${placeholders})
          ORDER BY id ASC
          `,
          ids,
          (photoErr, photoRows) => {
            if (photoErr) return callback(photoErr);

            const productMap = {};
            (productRows || []).forEach((p) => {
              if (!productMap[p.record_id]) productMap[p.record_id] = [];
              productMap[p.record_id].push({
                id: Number(p.id),
                productName: p.product_name || "",
              });
            });

            const photoMap = {};
            (photoRows || []).forEach((p) => {
              if (!photoMap[p.record_id]) photoMap[p.record_id] = [];
              photoMap[p.record_id].push({
                id: Number(p.id),
                name: p.photo_name || "",
                type: p.photo_type || "",
                dataUrl: p.photo_data || "",
              });
            });

            const payload = (rows || []).map((row) =>
              normalizePackagingLabelingRecord(
                row,
                productMap[row.id] || [],
                photoMap[row.id] || []
              )
            );

            callback(null, payload);
          }
        );
      }
    );
  });
};

// ===========================
// PACKAGING AND LABELING ROUTES
// ===========================
app.get("/packaging-labeling", (req, res) => {
  const hasServerPaging =
    req.query.page !== undefined ||
    req.query.limit !== undefined ||
    req.query.search !== undefined ||
    req.query.year !== undefined ||
    req.query.district !== undefined ||
    req.query.month !== undefined ||
    req.query.municipality !== undefined ||
    req.query.quarter !== undefined ||
    req.query.sort !== undefined;

  if (!hasServerPaging) {
    getPackagingLabelingRecords(
      {
        year: req.query.year,
        quarter: req.query.quarter,
      },
      (err, records) => {
        if (err) {
          console.error("GET /packaging-labeling ERROR:", err);
          return res.status(500).json({ message: err.message });
        }

        res.json(records || []);
      }
    );
    return;
  }

  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.max(1, Math.min(100, Number(req.query.limit || 10)));
  const offset = (page - 1) * limit;

  const { whereSql, params } = buildPackagingLabelingWhere(req.query);
  const orderSql = getPackagingLabelingOrderSql(req.query.sort);

  const countSql = `
    SELECT COUNT(*) AS total
    FROM packaging_labeling_records
    ${whereSql}
  `;

  db.query(countSql, params, (countErr, countRows) => {
    if (countErr) {
      console.error("GET /packaging-labeling count ERROR:", countErr);
      return res.status(500).json({ message: countErr.message });
    }

    const total = Number(countRows?.[0]?.total || 0);
    const totalPages = Math.max(1, Math.ceil(total / limit));

    if (total === 0) {
      return res.json({
        data: [],
        total: 0,
        totalPages,
        page,
        limit,
      });
    }

    const idsSql = `
      SELECT id
      FROM packaging_labeling_records
      ${whereSql}
      ${orderSql}
      LIMIT ? OFFSET ?
    `;

    db.query(idsSql, [...params, limit, offset], (idsErr, idRows) => {
      if (idsErr) {
        console.error("GET /packaging-labeling ids ERROR:", idsErr);
        return res.status(500).json({ message: idsErr.message });
      }

      const ids = (idRows || [])
        .map((row) => Number(row.id))
        .filter((id) => Number.isFinite(id) && id > 0);

      if (!ids.length) {
        return res.json({
          data: [],
          total,
          totalPages,
          page,
          limit,
        });
      }

      getPackagingLabelingRecordsByIds(ids, (dataErr, records) => {
        if (dataErr) {
          console.error("GET /packaging-labeling data ERROR:", dataErr);
          return res.status(500).json({ message: dataErr.message });
        }

        return res.json({
          data: records || [],
          total,
          totalPages,
          page,
          limit,
        });
      });
    });
  });
});

app.get("/packaging-labeling/:id", (req, res) => {
  const recordId = Number(req.params.id);

  getPackagingLabelingRecords({}, (err, records) => {
    if (err) {
      console.error("GET /packaging-labeling/:id ERROR:", err);
      return res.status(500).json({ message: err.message });
    }

    const found = (records || []).find((x) => Number(x.id) === recordId);

    if (!found) {
      return res.status(404).json({ message: "Packaging and Labeling record not found." });
    }

    res.json(found);
  });
});

app.post("/packaging-labeling", (req, res) => {
  const p = mapPackagingLabelingPayload(req.body || {});
  const products = Array.isArray(req.body?.products) ? req.body.products : [];
  const photos = Array.isArray(req.body?.photos) ? req.body.photos : [];

  const requiredChecks = [
    [p.quarter, "Quarter is required."],
    [p.date_completed, "Date Completed is required."],
    [p.type_of_intervention, "Type of Intervention is required."],
    [p.size_variant, "Size/Variant is required."],
    [p.packaging_materials_provided, "Packaging Materials Provided is required."],
    [p.customer_name, "Customer Name is required."],
    [p.firm_name, "Firm Name is required."],
    [p.address, "Address is required."],
  ];

  for (const [value, message] of requiredChecks) {
    if (!String(value || "").trim()) {
      return res.status(400).json({ message });
    }
  }

  const sql = `
    INSERT INTO packaging_labeling_records (
      quarter,
      province,
      date_completed,
      type_of_intervention,
      product_name,
      size_variant,
      packaging_materials_provided,
      customer_name,
      sex,
      firm_name,
      address,
      address_mode,
      address_manual_text,
      address_display_text,
      municipality,
      barangay,
      lat,
      lng,
      means_of_verification,
      name_of_staff,
      remarks,
      custom_fields
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.getConnection((connErr, conn) => {
    if (connErr) {
      console.error("Packaging and Labeling getConnection error:", connErr);
      return res.status(500).json({ message: connErr.message });
    }

    conn.beginTransaction((txErr) => {
      if (txErr) {
        console.error("Packaging and Labeling POST transaction error:", txErr);
        conn.release();
        return res.status(500).json({ message: txErr.message });
      }

      conn.query(
        sql,
        [
          p.quarter,
          p.province,
          p.date_completed,
          p.type_of_intervention,
          p.product_name,
          p.size_variant,
          p.packaging_materials_provided,
          p.customer_name,
          p.sex,
          p.firm_name,
          p.address,
          p.address_mode,
          p.address_manual_text,
          p.address_display_text,
          p.municipality,
          p.barangay,
          p.lat,
          p.lng,
          p.means_of_verification,
          p.name_of_staff,
          p.remarks,
          p.custom_fields,
        ],
        (err, result) => {
          if (err) {
            return conn.rollback(() => {
              conn.release();
              console.error("POST /packaging-labeling ERROR:", err);
              res.status(500).json({ message: err.message });
            });
          }

          const recordId = result.insertId;

          savePackagingLabelingProducts(recordId, products, (productErr) => {
            if (productErr) {
              return conn.rollback(() => {
                conn.release();
                console.error("INSERT packaging products ERROR:", productErr);
                res.status(500).json({ message: productErr.message });
              });
            }

            savePackagingLabelingPhotos(recordId, photos, (photoErr) => {
              if (photoErr) {
                return conn.rollback(() => {
                  conn.release();
                  console.error("INSERT packaging photos ERROR:", photoErr);
                  res.status(500).json({ message: photoErr.message });
                });
              }

              conn.commit((commitErr) => {
                if (commitErr) {
                  return conn.rollback(() => {
                    conn.release();
                    console.error(
                      "Packaging and Labeling POST commit ERROR:",
                      commitErr
                    );
                    res.status(500).json({ message: commitErr.message });
                  });
                }

                conn.release();
                res.json({
                  success: true,
                  id: recordId,
                  message: "Packaging and Labeling record created",
                });
              });
            });
          });
        }
      );
    });
  });
});

app.put("/packaging-labeling/:id", (req, res) => {
  const recordId = Number(req.params.id);
  const p = mapPackagingLabelingPayload(req.body || {});
  const products = Array.isArray(req.body?.products) ? req.body.products : [];
  const photos = Array.isArray(req.body?.photos) ? req.body.photos : [];

  const requiredChecks = [
    [p.quarter, "Quarter is required."],
    [p.date_completed, "Date Completed is required."],
    [p.type_of_intervention, "Type of Intervention is required."],
    [p.size_variant, "Size/Variant is required."],
    [p.packaging_materials_provided, "Packaging Materials Provided is required."],
    [p.customer_name, "Customer Name is required."],
    [p.firm_name, "Firm Name is required."],
    [p.address, "Address is required."],
  ];

  for (const [value, message] of requiredChecks) {
    if (!String(value || "").trim()) {
      return res.status(400).json({ message });
    }
  }

  const sql = `
    UPDATE packaging_labeling_records
    SET
      quarter = ?,
      province = ?,
      date_completed = ?,
      type_of_intervention = ?,
      product_name = ?,
      size_variant = ?,
      packaging_materials_provided = ?,
      customer_name = ?,
      sex = ?,
      firm_name = ?,
      address = ?,
      address_mode = ?,
      address_manual_text = ?,
      address_display_text = ?,
      municipality = ?,
      barangay = ?,
      lat = ?,
      lng = ?,
      means_of_verification = ?,
      name_of_staff = ?,
      remarks = ?,
      custom_fields = ?
    WHERE id = ?
  `;

  db.beginTransaction((txErr) => {
    if (txErr) {
      console.error("Packaging and Labeling PUT transaction error:", txErr);
      return res.status(500).json({ message: txErr.message });
    }

    db.query(
      sql,
      [
        p.quarter,
        p.province,
        p.date_completed,
        p.type_of_intervention,
        p.product_name,
        p.size_variant,
        p.packaging_materials_provided,
        p.customer_name,
        p.sex,
        p.firm_name,
        p.address,
        p.address_mode,
        p.address_manual_text,
        p.address_display_text,
        p.municipality,
        p.barangay,
        p.lat,
        p.lng,
        p.means_of_verification,
        p.name_of_staff,
        p.remarks,
        p.custom_fields,
        recordId,
      ],
      (err, result) => {
        if (err) {
          return db.rollback(() => {
            console.error("PUT /packaging-labeling/:id ERROR:", err);
            res.status(500).json({ message: err.message });
          });
        }

        if (!result.affectedRows) {
          return db.rollback(() => {
            res.status(404).json({ message: "Packaging and Labeling record not found." });
          });
        }

        db.query(
          "DELETE FROM packaging_labeling_products WHERE record_id = ?",
          [recordId],
          (deleteProductErr) => {
            if (deleteProductErr) {
              return db.rollback(() => {
                console.error("DELETE old packaging products ERROR:", deleteProductErr);
                res.status(500).json({ message: deleteProductErr.message });
              });
            }

            db.query(
              "DELETE FROM packaging_labeling_photos WHERE record_id = ?",
              [recordId],
              (deletePhotoErr) => {
                if (deletePhotoErr) {
                  return db.rollback(() => {
                    console.error("DELETE old packaging photos ERROR:", deletePhotoErr);
                    res.status(500).json({ message: deletePhotoErr.message });
                  });
                }

                savePackagingLabelingProducts(recordId, products, (productErr) => {
                  if (productErr) {
                    return db.rollback(() => {
                      console.error("REINSERT packaging products ERROR:", productErr);
                      res.status(500).json({ message: productErr.message });
                    });
                  }

                  savePackagingLabelingPhotos(recordId, photos, (photoErr) => {
                    if (photoErr) {
                      return db.rollback(() => {
                        console.error("REINSERT packaging photos ERROR:", photoErr);
                        res.status(500).json({ message: photoErr.message });
                      });
                    }

                    db.commit((commitErr) => {
                      if (commitErr) {
                        return db.rollback(() => {
                          console.error("Packaging and Labeling PUT commit ERROR:", commitErr);
                          res.status(500).json({ message: commitErr.message });
                        });
                      }

                      res.json({
                        success: true,
                        message: "Packaging and Labeling record updated",
                      });
                    });
                  });
                });
              }
            );
          }
        );
      }
    );
  });
});

app.delete("/packaging-labeling/:id", (req, res) => {
  const recordId = Number(req.params.id);

  db.beginTransaction((txErr) => {
    if (txErr) {
      return res.status(500).json({ message: txErr.message });
    }

    db.query(
      "DELETE FROM packaging_labeling_products WHERE record_id = ?",
      [recordId],
      (productErr) => {
        if (productErr) {
          return db.rollback(() => {
            console.error("DELETE packaging products ERROR:", productErr);
            res.status(500).json({ message: productErr.message });
          });
        }

        db.query(
          "DELETE FROM packaging_labeling_photos WHERE record_id = ?",
          [recordId],
          (photoErr) => {
            if (photoErr) {
              return db.rollback(() => {
                console.error("DELETE packaging photos ERROR:", photoErr);
                res.status(500).json({ message: photoErr.message });
              });
            }

            db.query(
              "DELETE FROM packaging_labeling_records WHERE id = ?",
              [recordId],
              (err, result) => {
                if (err) {
                  return db.rollback(() => {
                    console.error("DELETE /packaging-labeling/:id ERROR:", err);
                    res.status(500).json({ message: err.message });
                  });
                }

                if (!result.affectedRows) {
                  return db.rollback(() => {
                    res.status(404).json({ message: "Packaging and Labeling record not found." });
                  });
                }

                db.commit((commitErr) => {
                  if (commitErr) {
                    return db.rollback(() => {
                      res.status(500).json({ message: commitErr.message });
                    });
                  }

                  res.json({
                    success: true,
                    message: "Packaging and Labeling record deleted",
                  });
                });
              }
            );
          }
        );
      }
    );
  });
});

app.post("/packaging-labeling/:id/products", (req, res) => {
  const recordId = Number(req.params.id);
  const productName = String(
    req.body?.productName || req.body?.product_name || ""
  ).trim();

  if (!productName) {
    return res.status(400).json({ message: "Product name is required." });
  }

  db.query(
    `
    INSERT INTO packaging_labeling_products
    (record_id, product_name)
    VALUES (?, ?)
    `,
    [recordId, productName],
    (err, result) => {
      if (err) {
        console.error("POST /packaging-labeling/:id/products ERROR:", err);
        return res.status(500).json({ message: err.message });
      }

      res.json({
        success: true,
        id: result.insertId,
        productName,
      });
    }
  );
});

app.put("/packaging-labeling/products/:productId", (req, res) => {
  const productId = Number(req.params.productId);
  const productName = String(
    req.body?.productName || req.body?.product_name || ""
  ).trim();

  if (!productName) {
    return res.status(400).json({ message: "Product name is required." });
  }

  db.query(
    `
    UPDATE packaging_labeling_products
    SET product_name = ?
    WHERE id = ?
    `,
    [productName, productId],
    (err, result) => {
      if (err) {
        console.error("PUT /packaging-labeling/products/:productId ERROR:", err);
        return res.status(500).json({ message: err.message });
      }

      if (!result.affectedRows) {
        return res.status(404).json({ message: "Product not found." });
      }

      res.json({
        success: true,
        message: "Product updated",
      });
    }
  );
});

app.delete("/packaging-labeling/products/:productId", (req, res) => {
  const productId = Number(req.params.productId);

  db.query(
    "DELETE FROM packaging_labeling_products WHERE id = ?",
    [productId],
    (err, result) => {
      if (err) {
        console.error("DELETE /packaging-labeling/products/:productId ERROR:", err);
        return res.status(500).json({ message: err.message });
      }

      if (!result.affectedRows) {
        return res.status(404).json({ message: "Product not found." });
      }

      res.json({
        success: true,
        message: "Product deleted",
      });
    }
  );
});

app.get("/packaging-labeling/summary/:year", (req, res) => {
  const year = Number(req.params.year || new Date().getFullYear());

  const sql = `
    SELECT
      quarter,
      COUNT(*) AS records_total,
      COUNT(DISTINCT NULLIF(TRIM(customer_name), '')) AS customers_total,
      COUNT(DISTINCT NULLIF(TRIM(firm_name), '')) AS firms_total
    FROM packaging_labeling_records
    WHERE YEAR(date_completed) = ?
    GROUP BY quarter
    ORDER BY quarter ASC
  `;

  db.query(sql, [year], (err, rows) => {
    if (err) {
      console.error("GET /packaging-labeling/summary/:year ERROR:", err);
      return res.status(500).json({ message: err.message });
    }

    const q = {
      1: { records: 0, customers: 0, firms: 0 },
      2: { records: 0, customers: 0, firms: 0 },
      3: { records: 0, customers: 0, firms: 0 },
      4: { records: 0, customers: 0, firms: 0 },
    };

    (rows || []).forEach((row) => {
      const quarter = Number(row.quarter);
      if (!q[quarter]) return;
      q[quarter] = {
        records: Number(row.records_total || 0),
        customers: Number(row.customers_total || 0),
        firms: Number(row.firms_total || 0),
      };
    });

    res.json({
      interventionsProvided: {
        q1: q[1].records,
        q2: q[2].records,
        q3: q[3].records,
        q4: q[4].records,
        total: q[1].records + q[2].records + q[3].records + q[4].records,
      },
      customersAssisted: {
        q1: q[1].customers,
        q2: q[2].customers,
        q3: q[3].customers,
        q4: q[4].customers,
        total: q[1].customers + q[2].customers + q[3].customers + q[4].customers,
      },
      firmsAssisted: {
        q1: q[1].firms,
        q2: q[2].firms,
        q3: q[3].firms,
        q4: q[4].firms,
        total: q[1].firms + q[2].firms + q[3].firms + q[4].firms,
      },
    });
  });
});

// ============================================================
// SSCP HELPERS + ROUTES
// Idikit ito sa server.js mo bago ang 
// ===========================
// SSCP LGU NESTED ROUTES PATCH START
// ===========================

const sscpLguJsonParse = (raw, fallback = null) => {
  if (!raw) return fallback;
  if (typeof raw === "object") return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
};

const sscpLguDateOnly = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
};

const sscpLguToNull = (value) =>
  value === undefined || value === null || value === "" ? null : value;

const sscpLguToNumOrNull = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
};

const sscpLguToNumOrZero = (value) => {
  const n = Number(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
};

const sscpLguAddressMeta = (body = {}) => {
  const m = body.addressMeta || body.address_meta || {};
  return {
    address_mode: sscpLguToNull(m.mode),
    address_manual_text: sscpLguToNull(m.manualText || m.manual_text),
    address_province: sscpLguToNull(m.province),
    address_municipality: sscpLguToNull(m.municipality),
    address_barangay: sscpLguToNull(m.barangay),
    address_lat: sscpLguToNumOrNull(m.lat ?? m.latitude),
    address_lng: sscpLguToNumOrNull(m.lng ?? m.longitude),
  };
};

const sscpLguBuildAddressMeta = (row = {}, prefix = "address") => {
  const mode = row[`${prefix}_mode`] || "";
  const manualText = row[`${prefix}_manual_text`] || "";
  const province = row[`${prefix}_province`] || "";
  const municipality = row[`${prefix}_municipality`] || "";
  const barangay = row[`${prefix}_barangay`] || "";
  const latRaw = row[`${prefix}_lat`];
  const lngRaw = row[`${prefix}_lng`];
  const lat = latRaw === null || latRaw === undefined ? null : Number(latRaw);
  const lng = lngRaw === null || lngRaw === undefined ? null : Number(lngRaw);
  const displayText = row.address || [barangay, municipality, province].filter(Boolean).join(", ");

  return {
    mode,
    manualText,
    displayText,
    province,
    municipality,
    barangay,
    lat: Number.isFinite(lat) ? lat : null,
    lng: Number.isFinite(lng) ? lng : null,
  };
};

const normalizeSscpLguRow = (row = {}) => ({
  id: row.id,
  lguCommunity: row.lgu_community || "",
  address: row.address || "",
  addressMeta: sscpLguBuildAddressMeta(row),
  moaMouType: row.moa_mou_type || "",
  moaMouTitle: row.moa_mou_title || "",
  partners: row.partners || "",
  isSmartCity: Boolean(row.is_smart_city),
  smartCityDate: sscpLguDateOnly(row.smart_city_date),
  remarks: row.remarks || "",
  createdAt: sscpLguDateOnly(row.created_at),
  created_at: row.created_at,
  updated_at: row.updated_at,
  custom_fields: sscpLguJsonParse(row.custom_fields, {}) || {},
  customFields: sscpLguJsonParse(row.custom_fields, {}) || {},
  sscProjects: [],
  interventions: [],
});

const normalizeSscpProjectRow = (row = {}) => ({
  id: row.id,
  sscpLguId: row.sscp_lgu_id,
  sscp_lgu_id: row.sscp_lgu_id,
  projectTitle: row.project_title || "",
  title: row.project_title || "",
  dateProjectApproval: sscpLguDateOnly(row.date_project_approval),
  approvedProjectCost: Number(row.approved_project_cost || 0),
  cost: Number(row.approved_project_cost || 0),
  dateFundRelease: sscpLguDateOnly(row.date_fund_release),
  associationName: row.association_name || "",
  address: row.address || "",
  addressMeta: sscpLguBuildAddressMeta(row),
  projectProponent: row.project_proponent || "",
  sex: row.sex || "",
  processSystem: row.process_system || "",
  createdAt: sscpLguDateOnly(row.created_at),
  created_at: row.created_at,
  updated_at: row.updated_at,
  interventions: [],
});

const normalizeSscpInterventionRow = (row = {}) => ({
  id: row.id,
  project_id: row.project_id,
  type: row.type || "",
  title: row.title || "",
  date: sscpLguDateOnly(row.date),
  venue: row.venue || "",
  noOfFirms: row.no_of_firms ?? "",
  male: row.male ?? "",
  female: row.female ?? "",
  total: row.total ?? "",
  notes: row.notes || "",

  technologiesPromotedTotal: row.technologies_promoted_total ?? 0,
  promotionalActivitiesPressRelease: row.promotional_activities_press_release ?? 0,
  pwd: row.pwd || "",
  fourPs: row.four_ps || "",
  ip: row.ip || "",
  seniors: row.seniors || "",

  tacsConsultancyType: row.tacs_consultancy_type || "",
  tacsDateEngagement: sscpLguDateOnly(row.tacs_date_engagement),
  tacsExpertInstitution: row.tacs_expert_institution || "",
  tacsCustomerName: row.tacs_customer_name || "",
  tacsCustomerSex: row.tacs_customer_sex || "",
  tacsCustomerAddress: row.tacs_customer_address || "",
  tacsCustomerAddressMeta: sscpLguJsonParse(row.tacs_customer_address_meta, null),
  tacsMeansVerification: row.tacs_means_verification || "",
  tacsNoOfAdvice: row.tacs_no_of_advice ?? "",
  tacsRemarks: row.tacs_remarks || "",
  tacsPhotos: sscpLguJsonParse(row.tacs_photos, []),

  programTraining: row.program_training || "",
  startDate: sscpLguDateOnly(row.start_date),
  endDate: sscpLguDateOnly(row.end_date),
  province: row.province || "",
  venueAddressMeta: sscpLguJsonParse(row.venue_address_meta, null),
  noOfFirmsSucsHeisLgus: row.no_of_firms_sucs_heis_lgus ?? 0,
  participantsFemale: row.participants_female ?? 0,
  participantsMale: row.participants_male ?? 0,
  seniorFemale: row.senior_female ?? 0,
  seniorMale: row.senior_male ?? 0,
  ipFemale: row.ip_female ?? 0,
  ipMale: row.ip_male ?? 0,
  fourPsFemale: row.fourps_female ?? 0,
  fourPsMale: row.fourps_male ?? 0,
  pwdFemale: row.pwd_female ?? 0,
  pwdMale: row.pwd_male ?? 0,
  totalFemale: row.total_female ?? 0,
  totalMale: row.total_male ?? 0,
  totalParticipants: row.total_participants ?? 0,
  listOfFirmsAssociations: row.list_of_firms_associations || "",
  nameOfTrainorAffiliation: row.name_of_trainor_affiliation || "",
  programProjectUnit: row.program_project_unit || "",
  dostCost: Number(row.dost_cost || 0),
  partnerAgencyCost: Number(row.partner_agency_cost || 0),
  totalCost: Number(row.total_cost || 0),
  notesRemarks: row.notes_remarks || "",
  latitude: row.latitude === null || row.latitude === undefined ? null : Number(row.latitude),
  longitude: row.longitude === null || row.longitude === undefined ? null : Number(row.longitude),

  techrolloutQuarter: row.techrollout_quarter || "",
  techrolloutUnitCenter: row.techrollout_unit_center || "",
  techrolloutNameOfTechnologyTransferred: row.techrollout_name_of_technology_transferred || "",
  techrolloutTechnologyGenerator: row.techrollout_technology_generator || "",
  techrolloutModeOfTransfer: row.techrollout_mode_of_transfer || "",
  techrolloutIsDostDevelopedFunded: Boolean(row.techrollout_is_dost_developed_funded),
  techrolloutDateTransferred: sscpLguDateOnly(row.techrollout_date_transferred),
  techrolloutActivityTitle: row.techrollout_activity_title || "",
  techrolloutActivityDate: sscpLguDateOnly(row.techrollout_activity_date),
  techrolloutActivityVenue: row.techrollout_activity_venue || "",
  techrolloutInstitutionName: row.techrollout_institution_name || "",
  techrolloutInstitutionAddress: row.techrollout_institution_address || "",
  techrolloutInstitutionAddressMeta: sscpLguJsonParse(row.techrollout_institution_address_meta, null),
  techrolloutClassification: row.techrollout_classification || "",
  techrolloutRepresentativeName: row.techrollout_representative_name || "",
  techrolloutRepresentativeDesignation: row.techrollout_representative_designation || "",
  techrolloutSex: row.techrollout_sex || "",

  project: row.project_name || "",
  technologyPromoted: row.technology_promoted || "",
  technologyGenerator: row.technology_generator || "",
  modeOfPromotion: row.mode_of_promotion || "",
  customerName: row.customer_name || "",
  customerAddress: row.customer_address || "",
  promoSex: row.sex || "",
  staffName: row.staff_name || "",
  meansOfVerification: row.means_of_verification || "",
  photos: sscpLguJsonParse(row.photos, []),

  packagingQuarter: row.packaging_quarter ?? "",
  packagingProvince: row.packaging_province || "",
  packagingDateCompleted: sscpLguDateOnly(row.packaging_date_completed),
  packagingTypeOfIntervention: row.packaging_type_of_intervention || "",
  packagingProductName: row.packaging_product_name || "",
  packagingSizeVariant: row.packaging_size_variant || "",
  packagingMaterialsProvided: row.packaging_materials_provided || "",
  packagingCustomerName: row.packaging_customer_name || "",
  packagingSex: row.packaging_sex || "",
  packagingFirmInstitution: row.packaging_firm_institution || "",
  packagingAddress: row.packaging_address || "",
  packagingAddressMeta: sscpLguJsonParse(row.packaging_address_meta, null),
  packagingMeansVerification: row.packaging_means_of_verification || "",
  packagingPhotos: sscpLguJsonParse(row.packaging_photos, []),
  packagingRemarks: row.packaging_remarks || "",

  created_at: row.created_at,
  updated_at: row.updated_at,
});

app.get("/sscp", (req, res) => {
  const sql = `
    SELECT *
    FROM sscp_lgus
    ORDER BY created_at DESC, id DESC
  `;

  db.query(sql, (err, lguRows) => {
    if (err) {
      console.error("GET /sscp LGU ERROR:", err);
      return res.status(500).json({ message: err.message });
    }

    const lgus = (lguRows || []).map(normalizeSscpLguRow);
    if (!lgus.length) return res.json([]);

    const lguIds = lgus.map((x) => x.id);
    const placeholders = lguIds.map(() => "?").join(",");

    db.query(
      `SELECT * FROM sscp_projects WHERE sscp_lgu_id IN (${placeholders}) ORDER BY created_at DESC, id DESC`,
      lguIds,
      (projErr, projectRows) => {
        if (projErr) {
          console.error("GET /sscp projects ERROR:", projErr);
          return res.status(500).json({ message: projErr.message });
        }

        const projectList = (projectRows || []).map(normalizeSscpProjectRow);
        const projectIds = projectList.map((x) => x.id);
        const lguMap = new Map(lgus.map((x) => [String(x.id), x]));
        projectList.forEach((p) => {
          const parent = lguMap.get(String(p.sscpLguId));
          if (parent) parent.sscProjects.push(p);
        });

        if (!projectIds.length) return res.json(lgus);

        const pPlaceholders = projectIds.map(() => "?").join(",");
        db.query(
          `SELECT * FROM sscp_interventions WHERE project_id IN (${pPlaceholders}) ORDER BY created_at DESC, id DESC`,
          projectIds,
          (intErr, interventionRows) => {
            if (intErr) {
              console.error("GET /sscp interventions ERROR:", intErr);
              return res.status(500).json({ message: intErr.message });
            }

            const projectMap = new Map(projectList.map((p) => [String(p.id), p]));
            (interventionRows || []).map(normalizeSscpInterventionRow).forEach((it) => {
              const parent = projectMap.get(String(it.project_id));
              if (parent) parent.interventions.push(it);
            });

            res.json(lgus);
          }
        );
      }
    );
  });
});

app.post("/sscp", (req, res) => {
  const b = req.body || {};
  const addr = sscpLguAddressMeta(b);
  const customFields = b.custom_fields ?? b.customFields ?? {};

  const sql = `
    INSERT INTO sscp_lgus (
      lgu_community,
      address,
      address_mode,
      address_manual_text,
      address_province,
      address_municipality,
      address_barangay,
      address_lat,
      address_lng,
      moa_mou_type,
      moa_mou_title,
      partners,
      is_smart_city,
      smart_city_date,
      remarks
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [
      String(b.lguCommunity || b.lgu_community || "").trim(),
      String(b.address || "").trim(),
      addr.address_mode,
      addr.address_manual_text,
      addr.address_province,
      addr.address_municipality,
      addr.address_barangay,
      addr.address_lat,
      addr.address_lng,
      sscpLguToNull(b.moaMouType || b.moa_mou_type),
      sscpLguToNull(b.moaMouTitle || b.moa_mou_title),
      sscpLguToNull(b.partners),
      b.isSmartCity || b.is_smart_city ? 1 : 0,
      b.isSmartCity || b.is_smart_city ? sscpLguToNull(b.smartCityDate || b.smart_city_date) : null,
      sscpLguToNull(b.remarks),
      JSON.stringify(customFields || {}),
    ],
    (err, result) => {
      if (err) {
        console.error("POST /sscp ERROR:", err);
        return res.status(500).json({ message: err.message });
      }
      res.json({ message: "SSCP LGU/Community created", id: result.insertId });
    }
  );
});

app.put("/sscp/:id", (req, res, next) => {
  if (req.params.id === "test") return next();

  const b = req.body || {};
  const addr = sscpLguAddressMeta(b);
  const customFields = b.custom_fields ?? b.customFields ?? {};

  const sql = `
    UPDATE sscp_lgus SET
      lgu_community = ?,
      address = ?,
      address_mode = ?,
      address_manual_text = ?,
      address_province = ?,
      address_municipality = ?,
      address_barangay = ?,
      address_lat = ?,
      address_lng = ?,
      moa_mou_type = ?,
      moa_mou_title = ?,
      partners = ?,
      is_smart_city = ?,
      smart_city_date = ?,
      remarks = ?,
      custom_fields = ?
    WHERE id = ?
  `;

  db.query(
    sql,
    [
      String(b.lguCommunity || b.lgu_community || "").trim(),
      String(b.address || "").trim(),
      addr.address_mode,
      addr.address_manual_text,
      addr.address_province,
      addr.address_municipality,
      addr.address_barangay,
      addr.address_lat,
      addr.address_lng,
      sscpLguToNull(b.moaMouType || b.moa_mou_type),
      sscpLguToNull(b.moaMouTitle || b.moa_mou_title),
      sscpLguToNull(b.partners),
      b.isSmartCity || b.is_smart_city ? 1 : 0,
      b.isSmartCity || b.is_smart_city ? sscpLguToNull(b.smartCityDate || b.smart_city_date) : null,
      sscpLguToNull(b.remarks),
      JSON.stringify(customFields || {}),
      req.params.id,
    ],
    (err, result) => {
      if (err) {
        console.error("PUT /sscp/:id ERROR:", err);
        return res.status(500).json({ message: err.message });
      }
      if (!result.affectedRows) return res.status(404).json({ message: "SSCP LGU/Community not found" });
      res.json({ message: "SSCP LGU/Community updated" });
    }
  );
});

app.delete("/sscp/:id", (req, res, next) => {
  if (req.params.id === "test") return next();

  db.query("DELETE FROM sscp_lgus WHERE id = ?", [req.params.id], (err, result) => {
    if (err) {
      console.error("DELETE /sscp/:id ERROR:", err);
      return res.status(500).json({ message: err.message });
    }
    if (!result.affectedRows) return res.status(404).json({ message: "SSCP LGU/Community not found" });
    res.json({ message: "SSCP LGU/Community deleted" });
  });
});

app.post("/sscp/:lguId/projects", (req, res) => {
  const b = req.body || {};
  const addr = sscpLguAddressMeta(b);

  const sql = `
    INSERT INTO sscp_projects (
      sscp_lgu_id,
      project_title,
      date_project_approval,
      approved_project_cost,
      date_fund_release,
      association_name,
      address,
      address_mode,
      address_manual_text,
      address_province,
      address_municipality,
      address_barangay,
      address_lat,
      address_lng,
      project_proponent,
      sex,
      process_system
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [
      req.params.lguId,
      String(b.projectTitle || b.project_title || b.title || "").trim(),
      sscpLguToNull(b.dateProjectApproval || b.date_project_approval),
      sscpLguToNumOrZero(b.approvedProjectCost ?? b.approved_project_cost ?? b.cost),
      sscpLguToNull(b.dateFundRelease || b.date_fund_release),
      sscpLguToNull(b.associationName || b.association_name),
      sscpLguToNull(b.address),
      addr.address_mode,
      addr.address_manual_text,
      addr.address_province,
      addr.address_municipality,
      addr.address_barangay,
      addr.address_lat,
      addr.address_lng,
      sscpLguToNull(b.projectProponent || b.project_proponent),
      sscpLguToNull(b.sex),
      sscpLguToNull(b.processSystem || b.process_system),
    ],
    (err, result) => {
      if (err) {
        console.error("POST /sscp/:lguId/projects ERROR:", err);
        return res.status(500).json({ message: err.message });
      }
      res.json({ message: "SSCP project created", id: result.insertId });
    }
  );
});

app.put("/sscp-projects/:projectId", (req, res) => {
  const b = req.body || {};
  const addr = sscpLguAddressMeta(b);

  const sql = `
    UPDATE sscp_projects SET
      project_title = ?,
      date_project_approval = ?,
      approved_project_cost = ?,
      date_fund_release = ?,
      association_name = ?,
      address = ?,
      address_mode = ?,
      address_manual_text = ?,
      address_province = ?,
      address_municipality = ?,
      address_barangay = ?,
      address_lat = ?,
      address_lng = ?,
      project_proponent = ?,
      sex = ?,
      process_system = ?
    WHERE id = ?
  `;

  db.query(
    sql,
    [
      String(b.projectTitle || b.project_title || b.title || "").trim(),
      sscpLguToNull(b.dateProjectApproval || b.date_project_approval),
      sscpLguToNumOrZero(b.approvedProjectCost ?? b.approved_project_cost ?? b.cost),
      sscpLguToNull(b.dateFundRelease || b.date_fund_release),
      sscpLguToNull(b.associationName || b.association_name),
      sscpLguToNull(b.address),
      addr.address_mode,
      addr.address_manual_text,
      addr.address_province,
      addr.address_municipality,
      addr.address_barangay,
      addr.address_lat,
      addr.address_lng,
      sscpLguToNull(b.projectProponent || b.project_proponent),
      sscpLguToNull(b.sex),
      sscpLguToNull(b.processSystem || b.process_system),
      req.params.projectId,
    ],
    (err, result) => {
      if (err) {
        console.error("PUT /sscp-projects/:projectId ERROR:", err);
        return res.status(500).json({ message: err.message });
      }
      if (!result.affectedRows) return res.status(404).json({ message: "SSCP project not found" });
      res.json({ message: "SSCP project updated" });
    }
  );
});

app.delete("/sscp-projects/:projectId", (req, res) => {
  db.query("DELETE FROM sscp_projects WHERE id = ?", [req.params.projectId], (err, result) => {
    if (err) {
      console.error("DELETE /sscp-projects/:projectId ERROR:", err);
      return res.status(500).json({ message: err.message });
    }
    if (!result.affectedRows) return res.status(404).json({ message: "SSCP project not found" });
    res.json({ message: "SSCP project deleted" });
  });
});

const sscpInterventionDbPayload = (body = {}) => {
  const notesObj = sscpLguJsonParse(body.notes, null) || {};
  const pick = (...vals) => vals.find((v) => v !== undefined && v !== null);
  const venueMeta = pick(body.venueAddressMeta, body.venue_address_meta, body.trainingVenueAddressMeta, body.promoActivityVenueMeta, notesObj.venueAddressMeta, null);

  return {
    type: String(pick(body.type, "") || "").trim(),
    title: String(pick(body.title, body.activityTitle, body.promoActivityTitle, body.consultancyType, "") || "").trim(),
    date: sscpLguToNull(pick(body.date, body.activityDate, body.promoActivityDate, body.dateEngagement, body.trainingStartDate, null)),
    venue: sscpLguToNull(pick(body.venue, body.activityVenueAddress, body.promoActivityVenueAddress, body.trainingVenueAddress, body.customerAddress, "")),
    no_of_firms: sscpLguToNumOrNull(pick(body.noOfFirms, body.no_of_firms, null)),
    male: sscpLguToNumOrNull(pick(body.male, body.totalMale, null)),
    female: sscpLguToNumOrNull(pick(body.female, body.totalFemale, null)),
    total: sscpLguToNumOrNull(pick(body.total, body.totalParticipants, null)),
    notes: body.notes || "",
    technologies_promoted_total: sscpLguToNumOrZero(pick(body.technologiesPromotedTotal, body.technologies_promoted_total, 0)),
    promotional_activities_press_release: sscpLguToNumOrZero(pick(body.promotionalActivitiesPressRelease, body.promotional_activities_press_release, 0)),
    pwd: sscpLguToNull(body.pwd),
    four_ps: sscpLguToNull(body.fourPs || body.four_ps),
    ip: sscpLguToNull(body.ip),
    seniors: sscpLguToNull(body.seniors),

    tacs_consultancy_type: sscpLguToNull(body.tacsConsultancyType || body.consultancyType),
    tacs_date_engagement: sscpLguToNull(body.tacsDateEngagement || body.dateEngagement),
    tacs_expert_institution: sscpLguToNull(body.tacsExpertInstitution || body.expertInstitution),
    tacs_customer_name: sscpLguToNull(body.tacsCustomerName || body.customerName),
    tacs_customer_sex: sscpLguToNull(body.tacsCustomerSex || body.customerSex),
    tacs_customer_address: sscpLguToNull(body.tacsCustomerAddress || body.customerAddress),
    tacs_customer_address_meta: body.tacsCustomerAddressMeta || body.customerAddressMeta ? JSON.stringify(body.tacsCustomerAddressMeta || body.customerAddressMeta) : null,
    tacs_means_verification: sscpLguToNull(body.tacsMeansVerification || body.meansVerification),
    tacs_no_of_advice: sscpLguToNumOrNull(body.tacsNoOfAdvice || body.noOfAdvice),
    tacs_remarks: sscpLguToNull(body.tacsRemarks),
    tacs_photos: JSON.stringify(Array.isArray(body.tacsPhotos) ? body.tacsPhotos : []),

    program_training: sscpLguToNull(body.programTraining || body.trainingProgram),
    start_date: sscpLguToNull(body.startDate || body.trainingStartDate),
    end_date: sscpLguToNull(body.endDate || body.trainingEndDate),
    province: sscpLguToNull(body.province || body.trainingProvince),
    venue_address_meta: venueMeta ? JSON.stringify(venueMeta) : null,
    no_of_firms_sucs_heis_lgus: sscpLguToNumOrZero(body.noOfFirmsSucsHeisLgus || body.trainingFirmsSucsHeisLgusCount),
    participants_female: sscpLguToNumOrZero(body.participantsFemale || body.trainingParticipantsFemale),
    participants_male: sscpLguToNumOrZero(body.participantsMale || body.trainingParticipantsMale),
    senior_female: sscpLguToNumOrZero(body.seniorFemale || body.trainingSeniorFemale),
    senior_male: sscpLguToNumOrZero(body.seniorMale || body.trainingSeniorMale),
    ip_female: sscpLguToNumOrZero(body.ipFemale || body.trainingIpFemale),
    ip_male: sscpLguToNumOrZero(body.ipMale || body.trainingIpMale),
    fourps_female: sscpLguToNumOrZero(body.fourPsFemale || body.trainingFourPsFemale),
    fourps_male: sscpLguToNumOrZero(body.fourPsMale || body.trainingFourPsMale),
    pwd_female: sscpLguToNumOrZero(body.pwdFemale || body.trainingPwdFemale),
    pwd_male: sscpLguToNumOrZero(body.pwdMale || body.trainingPwdMale),
    total_female: sscpLguToNumOrZero(body.totalFemale),
    total_male: sscpLguToNumOrZero(body.totalMale),
    total_participants: sscpLguToNumOrZero(body.totalParticipants),
    list_of_firms_associations: sscpLguToNull(body.listOfFirmsAssociations || body.trainingFirmsAssociationsList),
    name_of_trainor_affiliation: sscpLguToNull(body.nameOfTrainorAffiliation || body.trainingTrainorAffiliation),
    program_project_unit: sscpLguToNull(body.programProjectUnit || body.projectProgramUnit),
    dost_cost: sscpLguToNumOrZero(body.dostCost || body.trainingCostDost),
    partner_agency_cost: sscpLguToNumOrZero(body.partnerAgencyCost || body.trainingCostPartnerAgency),
    total_cost: sscpLguToNumOrZero(body.totalCost),
    notes_remarks: sscpLguToNull(body.notesRemarks),
    latitude: sscpLguToNumOrNull(body.latitude),
    longitude: sscpLguToNumOrNull(body.longitude),

    techrollout_quarter: sscpLguToNull(body.techrolloutQuarter || body.techrollout_quarter),
    techrollout_unit_center: sscpLguToNull(body.techrolloutUnitCenter || body.techrollout_unit_center),
    techrollout_name_of_technology_transferred: sscpLguToNull(body.techrolloutNameOfTechnologyTransferred || body.techrollout_name_of_technology_transferred),
    techrollout_technology_generator: sscpLguToNull(body.techrolloutTechnologyGenerator || body.techrollout_technology_generator),
    techrollout_mode_of_transfer: sscpLguToNull(body.techrolloutModeOfTransfer || body.techrollout_mode_of_transfer),
    techrollout_is_dost_developed_funded: body.techrolloutIsDostDevelopedFunded || body.techrollout_is_dost_developed_funded ? 1 : 0,
    techrollout_date_transferred: sscpLguToNull(body.techrolloutDateTransferred || body.techrollout_date_transferred),
    techrollout_activity_title: sscpLguToNull(body.techrolloutActivityTitle || body.techrollout_activity_title),
    techrollout_activity_date: sscpLguToNull(body.techrolloutActivityDate || body.techrollout_activity_date),
    techrollout_activity_venue: sscpLguToNull(body.techrolloutActivityVenue || body.techrollout_activity_venue),
    techrollout_institution_name: sscpLguToNull(body.techrolloutInstitutionName || body.techrollout_institution_name),
    techrollout_institution_address: sscpLguToNull(body.techrolloutInstitutionAddress || body.techrollout_institution_address),
    techrollout_institution_address_meta: body.techrolloutInstitutionAddressMeta || body.techrollout_institution_address_meta ? JSON.stringify(body.techrolloutInstitutionAddressMeta || body.techrollout_institution_address_meta) : null,
    techrollout_classification: sscpLguToNull(body.techrolloutClassification || body.techrollout_classification),
    techrollout_representative_name: sscpLguToNull(body.techrolloutRepresentativeName || body.techrollout_representative_name),
    techrollout_representative_designation: sscpLguToNull(body.techrolloutRepresentativeDesignation || body.techrollout_representative_designation),
    techrollout_sex: sscpLguToNull(body.techrolloutSex || body.techrollout_sex),

    project_name: sscpLguToNull(body.project || body.promoProject),
    technology_promoted: sscpLguToNull(body.technologyPromoted || body.promoTechnologyPromoted),
    technology_generator: sscpLguToNull(body.technologyGenerator || body.promoTechnologyGenerator),
    mode_of_promotion: sscpLguToNull(body.modeOfPromotion || body.promoModeOfPromotion),
    customer_name: sscpLguToNull(body.customerName || body.promoCustomerName),
    customer_address: sscpLguToNull(body.customerAddress || body.promoCustomerAddress),
    sex: sscpLguToNull(body.sex || body.promoSex),
    staff_name: sscpLguToNull(body.staffName || body.promoStaffName),
    means_of_verification: sscpLguToNull(body.meansOfVerification || body.promoMeansVerification),
    photos: JSON.stringify(Array.isArray(body.photos || body.promoPhotos) ? body.photos || body.promoPhotos : []),

    packaging_quarter: sscpLguToNumOrNull(body.packagingQuarter),
    packaging_province: sscpLguToNull(body.packagingProvince),
    packaging_date_completed: sscpLguToNull(body.packagingDateCompleted),
    packaging_type_of_intervention: sscpLguToNull(body.packagingTypeOfIntervention),
    packaging_product_name: sscpLguToNull(body.packagingProductName),
    packaging_size_variant: sscpLguToNull(body.packagingSizeVariant),
    packaging_materials_provided: sscpLguToNull(body.packagingMaterialsProvided),
    packaging_customer_name: sscpLguToNull(body.packagingCustomerName),
    packaging_sex: sscpLguToNull(body.packagingSex),
    packaging_firm_institution: sscpLguToNull(body.packagingFirmInstitution),
    packaging_address: sscpLguToNull(body.packagingAddress),
    packaging_address_meta: body.packagingAddressMeta ? JSON.stringify(body.packagingAddressMeta) : null,
    packaging_means_of_verification: sscpLguToNull(body.packagingMeansVerification),
    packaging_photos: JSON.stringify(Array.isArray(body.packagingPhotos) ? body.packagingPhotos : []),
    packaging_remarks: sscpLguToNull(body.packagingRemarks),
  };
};

const SSCP_INT_COLUMNS = [
  "type", "title", "date", "venue", "no_of_firms", "male", "female", "total", "notes",
  "technologies_promoted_total", "promotional_activities_press_release", "pwd", "four_ps", "ip", "seniors",
  "tacs_consultancy_type", "tacs_date_engagement", "tacs_expert_institution", "tacs_customer_name", "tacs_customer_sex", "tacs_customer_address", "tacs_customer_address_meta", "tacs_means_verification", "tacs_no_of_advice", "tacs_remarks", "tacs_photos",
  "program_training", "start_date", "end_date", "province", "venue_address_meta", "no_of_firms_sucs_heis_lgus", "participants_female", "participants_male", "senior_female", "senior_male", "ip_female", "ip_male", "fourps_female", "fourps_male", "pwd_female", "pwd_male", "total_female", "total_male", "total_participants", "list_of_firms_associations", "name_of_trainor_affiliation", "program_project_unit", "dost_cost", "partner_agency_cost", "total_cost", "notes_remarks", "latitude", "longitude",
  "techrollout_quarter", "techrollout_unit_center", "techrollout_name_of_technology_transferred", "techrollout_technology_generator", "techrollout_mode_of_transfer", "techrollout_is_dost_developed_funded", "techrollout_date_transferred", "techrollout_activity_title", "techrollout_activity_date", "techrollout_activity_venue", "techrollout_institution_name", "techrollout_institution_address", "techrollout_institution_address_meta", "techrollout_classification", "techrollout_representative_name", "techrollout_representative_designation", "techrollout_sex",
  "project_name", "technology_promoted", "technology_generator", "mode_of_promotion", "customer_name", "customer_address", "sex", "staff_name", "means_of_verification", "photos",
  "packaging_quarter", "packaging_province", "packaging_date_completed", "packaging_type_of_intervention", "packaging_product_name", "packaging_size_variant", "packaging_materials_provided", "packaging_customer_name", "packaging_sex", "packaging_firm_institution", "packaging_address", "packaging_address_meta", "packaging_means_of_verification", "packaging_photos", "packaging_remarks"
];

app.post("/sscp-projects/:projectId/interventions", (req, res) => {
  const payload = sscpInterventionDbPayload(req.body || {});
  const cols = ["project_id", ...SSCP_INT_COLUMNS];
  const placeholders = cols.map(() => "?").join(", ");
  const values = [req.params.projectId, ...SSCP_INT_COLUMNS.map((c) => payload[c])];

  db.query(
    `INSERT INTO sscp_interventions (${cols.join(", ")}) VALUES (${placeholders})`,
    values,
    (err, result) => {
      if (err) {
        console.error("POST /sscp-projects/:projectId/interventions ERROR:", err);
        return res.status(500).json({ message: err.message });
      }
      res.json({ message: "SSCP intervention created", id: result.insertId });
    }
  );
});

app.put("/sscp-interventions/:interventionId", (req, res) => {
  const payload = sscpInterventionDbPayload(req.body || {});
  const setSql = SSCP_INT_COLUMNS.map((c) => `${c} = ?`).join(", ");
  const values = [...SSCP_INT_COLUMNS.map((c) => payload[c]), req.params.interventionId];

  db.query(
    `UPDATE sscp_interventions SET ${setSql} WHERE id = ?`,
    values,
    (err, result) => {
      if (err) {
        console.error("PUT /sscp-interventions/:interventionId ERROR:", err);
        return res.status(500).json({ message: err.message });
      }
      if (!result.affectedRows) return res.status(404).json({ message: "SSCP intervention not found" });
      res.json({ message: "SSCP intervention updated" });
    }
  );
});

app.delete("/sscp-interventions/:interventionId", (req, res) => {
  db.query("DELETE FROM sscp_interventions WHERE id = ?", [req.params.interventionId], (err, result) => {
    if (err) {
      console.error("DELETE /sscp-interventions/:interventionId ERROR:", err);
      return res.status(500).json({ message: err.message });
    }
    if (!result.affectedRows) return res.status(404).json({ message: "SSCP intervention not found" });
    res.json({ message: "SSCP intervention deleted" });
  });
});


const syncSscpTechnologyPromotionEntry = (
  { projectId, interventionId, type, body },
  callback
) => {
  const removeLinkedTechnologyPromotion = () => {
    db.query(
      "SELECT id FROM technology_promotion_entries WHERE source_module = ? AND source_intervention_id = ?",
      ["SSCP", interventionId],
      (findErr, rows) => {
        if (findErr) return callback(findErr);

        const ids = (rows || [])
          .map((row) => Number(row.id))
          .filter((id) => Number.isFinite(id) && id > 0);

        const deleteEntryRows = () =>
          db.query(
            "DELETE FROM technology_promotion_entries WHERE source_module = ? AND source_intervention_id = ?",
            ["SSCP", interventionId],
            (deleteErr) => {
              if (deleteErr) return callback(deleteErr);
              callback(null);
            }
          );

        if (!ids.length) return deleteEntryRows();

        const placeholders = ids.map(() => "?").join(",");
        db.query(
          `DELETE FROM technology_promotion_photos WHERE entry_id IN (${placeholders})`,
          ids,
          (photoErr) => {
            if (photoErr) return callback(photoErr);
            deleteEntryRows();
          }
        );
      }
    );
  };

  if (!isCestTechPromoType(type)) {
    return removeLinkedTechnologyPromotion();
  }

  const promo = mapCestTechPromoPayload(body, type);
  const venueMeta = parseJsonSafe(promo.venue_address_meta) || {};
  const photos = parseJsonSafe(promo.photos) || [];

  const activityDate = toNullIfEmpty(
    pickFirst(
      body.promoActivityDate,
      body.promo_activity_date,
      body.activityDate,
      body.activity_date,
      body.date,
      null
    )
  );
  const activityTitle = toNullIfEmpty(
    pickFirst(
      body.promoActivityTitle,
      body.promo_activity_title,
      body.activityTitle,
      body.activity_title,
      body.title,
      null
    )
  );
  const activityVenueAddress = toNullIfEmpty(
    pickFirst(
      body.promoActivityVenueAddress,
      body.promo_activity_venue_address,
      body.activityVenueAddress,
      body.activity_venue_address,
      body.venue,
      body.venueAddress,
      body.venue_address,
      null
    )
  );

  const payload = {
    project_name: promo.project_name || "SSCP",
    activity_date: activityDate,
    technology_promoted: promo.technology_promoted,
    technology_generator: promo.technology_generator,
    mode_of_promotion: promo.mode_of_promotion,
    activity_title: activityTitle,
    activity_venue_address: activityVenueAddress,
    venue_mode: toNullIfEmpty(venueMeta?.mode),
    venue_display_text: toNullIfEmpty(
      venueMeta?.displayText || venueMeta?.manualText || activityVenueAddress
    ),
    venue_province: toNullIfEmpty(venueMeta?.province),
    venue_municipality: toNullIfEmpty(venueMeta?.municipality),
    venue_barangay: toNullIfEmpty(venueMeta?.barangay),
    venue_lat: toNumOrNull(venueMeta?.lat),
    venue_lng: toNumOrNull(venueMeta?.lng),
    customer_name: promo.customer_name,
    customer_address: promo.customer_address,
    sex: toNullIfEmpty(promo.sex) || "N/A",
    means_of_verification: promo.means_of_verification,
    staff_name: promo.staff_name,
    source_module: "SSCP",
    source_project_id: toNumOrNull(projectId),
    source_intervention_id: toNumOrNull(interventionId),
    source_type: String(type || "").trim() || null,
  };

  const hasRequiredFields = Boolean(
    payload.activity_date &&
    payload.technology_promoted &&
    payload.technology_generator &&
    payload.mode_of_promotion &&
    payload.activity_title &&
    payload.activity_venue_address &&
    payload.customer_name &&
    payload.customer_address &&
    payload.staff_name
  );

  if (!hasRequiredFields) {
    return removeLinkedTechnologyPromotion();
  }

  db.query(
    "SELECT id FROM technology_promotion_entries WHERE source_module = ? AND source_intervention_id = ? LIMIT 1",
    ["SSCP", interventionId],
    (findErr, rows) => {
      if (findErr) return callback(findErr);

      const existingId = rows?.[0]?.id ? Number(rows[0].id) : null;
      const params = [
        payload.project_name,
        payload.activity_date,
        payload.technology_promoted,
        payload.technology_generator,
        payload.mode_of_promotion,
        payload.activity_title,
        payload.activity_venue_address,
        payload.venue_mode,
        payload.venue_display_text,
        payload.venue_province,
        payload.venue_municipality,
        payload.venue_barangay,
        payload.venue_lat,
        payload.venue_lng,
        payload.customer_name,
        payload.customer_address,
        payload.sex,
        payload.means_of_verification,
        payload.staff_name,
        payload.source_module,
        payload.source_project_id,
        payload.source_intervention_id,
        payload.source_type,
      ];

      const sql = existingId
        ? `
          UPDATE technology_promotion_entries
          SET
            project_name = ?,
            activity_date = ?,
            technology_promoted = ?,
            technology_generator = ?,
            mode_of_promotion = ?,
            activity_title = ?,
            activity_venue_address = ?,
            venue_mode = ?,
            venue_display_text = ?,
            venue_province = ?,
            venue_municipality = ?,
            venue_barangay = ?,
            venue_lat = ?,
            venue_lng = ?,
            customer_name = ?,
            customer_address = ?,
            sex = ?,
            means_of_verification = ?,
            staff_name = ?,
            source_module = ?,
            source_project_id = ?,
            source_intervention_id = ?,
            source_type = ?
          WHERE id = ?
        `
        : `
          INSERT INTO technology_promotion_entries (
            project_name,
            activity_date,
            technology_promoted,
            technology_generator,
            mode_of_promotion,
            activity_title,
            activity_venue_address,
            venue_mode,
            venue_display_text,
            venue_province,
            venue_municipality,
            venue_barangay,
            venue_lat,
            venue_lng,
            customer_name,
            customer_address,
            sex,
            means_of_verification,
            staff_name,
            source_module,
            source_project_id,
            source_intervention_id,
            source_type
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

      db.query(sql, existingId ? [...params, existingId] : params, (saveErr, result) => {
        if (saveErr) return callback(saveErr);

        const entryId = existingId || Number(result.insertId);
        db.query(
          "DELETE FROM technology_promotion_photos WHERE entry_id = ?",
          [entryId],
          (deletePhotoErr) => {
            if (deletePhotoErr) return callback(deletePhotoErr);

            saveTechnologyPromotionPhotos(entryId, photos, (photoErr) => {
              if (photoErr) return callback(photoErr);
              callback(null, entryId);
            });
          }
        );
      });
    }
  );
};

// ===========================
// SSCP TECH ROLL OUT HELPER
// ===========================
const syncSscpTechnologyRolloutToTable = ({
  projectId,
  interventionId,
  type,
  title,
  techrollout,
}, callback) => {
  const removeLinkedTechRollout = () =>
    db.query(
      "DELETE FROM technology_rollout WHERE intervention_id = ? AND source_module = ?",
      [interventionId, "sscp_interventions"],
      (deleteErr) => {
        if (deleteErr) return callback(deleteErr);
        callback(null);
      }
    );

  if (String(type || "").trim() !== "Tech Roll Out") {
    return removeLinkedTechRollout();
  }

  const meta = parseCestTechRolloutAddressMeta(
    techrollout?.techrollout_institution_address_meta
  );

  const normalized = {
    quarter: toNumOrNull(techrollout?.techrollout_quarter),
    unit_center:
      String(techrollout?.techrollout_unit_center || "DOST-PANGASINAN").trim() ||
      "DOST-PANGASINAN",
    name_of_technology_transferred: String(
      techrollout?.techrollout_name_of_technology_transferred || ""
    ).trim(),
    technology_generator: String(
      techrollout?.techrollout_technology_generator || ""
    ).trim(),
    mode_of_transfer: String(
      techrollout?.techrollout_mode_of_transfer || ""
    ).trim(),
    is_dost_developed_funded: techrollout?.techrollout_is_dost_developed_funded ? 1 : 0,
    date_transferred: toNullIfEmpty(techrollout?.techrollout_date_transferred),
    activity_title: String(techrollout?.techrollout_activity_title || title || "").trim(),
    activity_date: toNullIfEmpty(techrollout?.techrollout_activity_date),
    activity_venue: toNullIfEmpty(techrollout?.techrollout_activity_venue),
    institution_name: String(techrollout?.techrollout_institution_name || "").trim(),
    institution_address: String(techrollout?.techrollout_institution_address || "").trim(),
    address_mode: toNullIfEmpty(meta?.mode),
    address_manual_text: toNullIfEmpty(meta?.manualText),
    address_display_text: toNullIfEmpty(
      meta?.displayText || techrollout?.techrollout_institution_address || null
    ),
    address_province: toNullIfEmpty(meta?.province),
    address_municipality: toNullIfEmpty(meta?.municipality),
    address_barangay: toNullIfEmpty(meta?.barangay),
    address_lat: toNumOrNull(meta?.lat),
    address_lng: toNumOrNull(meta?.lng),
    classification: String(techrollout?.techrollout_classification || "").trim(),
    representative_name: String(techrollout?.techrollout_representative_name || "").trim(),
    representative_designation: toNullIfEmpty(
      techrollout?.techrollout_representative_designation
    ),
    sex: toNullIfEmpty(techrollout?.techrollout_sex),
    project_id: toNumOrNull(projectId),
    intervention_id: toNumOrNull(interventionId),
    source_module: "sscp_interventions",
    source_label: toNullIfEmpty(title),
  };

  const hasRequiredFields = Boolean(
    normalized.quarter &&
    normalized.name_of_technology_transferred &&
    normalized.technology_generator &&
    normalized.mode_of_transfer &&
    normalized.date_transferred &&
    normalized.activity_title &&
    normalized.activity_date &&
    normalized.institution_name &&
    normalized.institution_address &&
    normalized.classification &&
    normalized.representative_name
  );

  if (!hasRequiredFields) {
    return removeLinkedTechRollout();
  }

  const params = [
    normalized.quarter,
    normalized.unit_center,
    normalized.name_of_technology_transferred,
    normalized.technology_generator,
    normalized.mode_of_transfer,
    normalized.is_dost_developed_funded,
    normalized.date_transferred,
    normalized.activity_title,
    normalized.activity_date,
    normalized.activity_venue,
    normalized.institution_name,
    normalized.institution_address,
    normalized.address_mode,
    normalized.address_manual_text,
    normalized.address_display_text,
    normalized.address_province,
    normalized.address_municipality,
    normalized.address_barangay,
    normalized.address_lat,
    normalized.address_lng,
    normalized.classification,
    normalized.representative_name,
    normalized.representative_designation,
    normalized.sex,
    normalized.project_id,
    normalized.intervention_id,
    normalized.source_module,
    normalized.source_label,
  ];

  db.query(
    "SELECT id FROM technology_rollout WHERE intervention_id = ? AND source_module = ? LIMIT 1",
    [interventionId, "sscp_interventions"],
    (findErr, rows) => {
      if (findErr) return callback(findErr);

      const existingId = rows?.[0]?.id ? Number(rows[0].id) : null;
      const sql = existingId
        ? `
          UPDATE technology_rollout
          SET
            quarter = ?,
            unit_center = ?,
            name_of_technology_transferred = ?,
            technology_generator = ?,
            mode_of_transfer = ?,
            is_dost_developed_funded = ?,
            date_transferred = ?,
            activity_title = ?,
            activity_date = ?,
            activity_venue = ?,
            institution_name = ?,
            institution_address = ?,
            address_mode = ?,
            address_manual_text = ?,
            address_display_text = ?,
            address_province = ?,
            address_municipality = ?,
            address_barangay = ?,
            address_lat = ?,
            address_lng = ?,
            classification = ?,
            representative_name = ?,
            representative_designation = ?,
            sex = ?,
            project_id = ?,
            intervention_id = ?,
            source_module = ?,
            source_label = ?
          WHERE id = ?
        `
        : `
          INSERT INTO technology_rollout (
            quarter,
            unit_center,
            name_of_technology_transferred,
            technology_generator,
            mode_of_transfer,
            is_dost_developed_funded,
            date_transferred,
            activity_title,
            activity_date,
            activity_venue,
            institution_name,
            institution_address,
            address_mode,
            address_manual_text,
            address_display_text,
            address_province,
            address_municipality,
            address_barangay,
            address_lat,
            address_lng,
            classification,
            representative_name,
            representative_designation,
            sex,
            project_id,
            intervention_id,
            source_module,
            source_label
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

      db.query(sql, existingId ? [...params, existingId] : params, (saveErr) => {
        if (saveErr) return callback(saveErr);
        callback(null, existingId || interventionId);
      });
    }
  );
};

// ===========================
// SSCP ROUTES
// ===========================

// GET all sscp with interventions
app.get("/sscp-summary", (req, res) => {
  const sql = `
    SELECT
      l.id AS lgu_id,
      l.lgu_community,
      l.address AS lgu_address,
      l.address_mode AS lgu_address_mode,
      l.address_manual_text AS lgu_address_manual_text,
      l.address_province AS lgu_address_province,
      l.address_municipality AS lgu_address_municipality,
      l.address_barangay AS lgu_address_barangay,
      l.address_lat AS lgu_address_lat,
      l.address_lng AS lgu_address_lng,
      l.created_at AS lgu_created_at,
      l.moa_mou_type,
      l.is_smart_city,

      p.id AS project_id,
      p.project_title,
      DATE_FORMAT(p.date_project_approval, '%Y-%m-%d') AS date_project_approval,
      p.approved_project_cost,
      DATE_FORMAT(p.date_fund_release, '%Y-%m-%d') AS date_fund_release,
      p.association_name,
      p.address AS project_address,
      p.address_mode AS project_address_mode,
      p.address_manual_text AS project_address_manual_text,
      p.address_province AS project_address_province,
      p.address_municipality AS project_address_municipality,
      p.address_barangay AS project_address_barangay,
      p.address_lat AS project_address_lat,
      p.address_lng AS project_address_lng,
      p.project_proponent,
      p.sex AS project_sex,
      p.process_system,
      p.created_at AS project_created_at,

      i.id AS intervention_id,
      i.type AS intervention_type,
      i.title AS intervention_title,
      DATE_FORMAT(i.date, '%Y-%m-%d') AS intervention_date,
      i.venue AS intervention_venue,
      i.total AS intervention_total,
      i.technologies_promoted_total AS intervention_technologies_promoted_total,
      i.promotional_activities_press_release AS intervention_promotional_activities_press_release,
      i.created_at AS intervention_created_at
    FROM sscp_lgus l
    LEFT JOIN sscp_projects p
      ON p.sscp_lgu_id = l.id
    LEFT JOIN sscp_interventions i
      ON i.project_id = p.id
    ORDER BY l.created_at DESC, l.id DESC, p.id DESC, i.id DESC
  `;

  db.query(sql, (err, rows) => {
    if (err) {
      console.error("GET /sscp-summary NEW TABLES ERROR:", err);
      return res.status(500).json({ message: err.message });
    }

    const map = {};

    (rows || []).forEach((r) => {
      const key = r.project_id ? `project_${r.project_id}` : `lgu_${r.lgu_id}`;

      if (!map[key]) {
        const addressMeta = {
          mode: r.project_address_mode || r.lgu_address_mode || "",
          manualText: r.project_address_manual_text || r.lgu_address_manual_text || "",
          province: r.project_address_province || r.lgu_address_province || "",
          municipality: r.project_address_municipality || r.lgu_address_municipality || "",
          barangay: r.project_address_barangay || r.lgu_address_barangay || "",
          lat: r.project_address_lat !== null && r.project_address_lat !== undefined ? Number(r.project_address_lat) : (r.lgu_address_lat !== null && r.lgu_address_lat !== undefined ? Number(r.lgu_address_lat) : null),
          lng: r.project_address_lng !== null && r.project_address_lng !== undefined ? Number(r.project_address_lng) : (r.lgu_address_lng !== null && r.lgu_address_lng !== undefined ? Number(r.lgu_address_lng) : null),
        };

        map[key] = {
          id: r.project_id || `lgu_${r.lgu_id}`,
          lguId: r.lgu_id,
          lguCommunity: r.lgu_community || "",
          quarter: r.date_project_approval ? String(Math.floor((Number(String(r.date_project_approval).slice(5, 7)) + 2) / 3)) : "1",
          type: "New Communities",
          projectTitle: r.project_title || r.lgu_community || "",
          project_title: r.project_title || r.lgu_community || "",
          dateProjectApproval: r.date_project_approval || "",
          date_approved: r.date_project_approval || "",
          approvedProjectCost: Number(r.approved_project_cost || 0),
          amount: Number(r.approved_project_cost || 0),
          dateFundRelease: r.date_fund_release || "",
          associationName: r.association_name || "",
          firmName: r.lgu_community || "",
          firm_name: r.lgu_community || "",
          address: r.project_address || r.lgu_address || "",
          addressMeta,
          projectProponent: r.project_proponent || "",
          sex: r.project_sex || "",
          processSystem: r.process_system || "",
          pressRelease: 0,
          communitiesAssisted: 1,
          communitiesLgusAssisted: 1,
          smartCitiesEstablished: r.is_smart_city ? 1 : 0,
          mouMoa: r.moa_mou_type ? 1 : 0,
          technologiesDeployed: 0,
          technologiesAdopted: 0,
          technologiesPromoted: 0,
          beneficiaries: 0,
          startupsAssisted: 0,
          jobsGenerated: 0,
          technologiesPromotedTotal: 0,
          promotionalActivitiesPressRelease: 0,
          created_at: r.project_created_at || r.lgu_created_at,
          interventions: [],
        };
      }

      if (r.intervention_id) {
        const it = {
          id: r.intervention_id,
          type: r.intervention_type || "",
          title: r.intervention_title || "",
          date: r.intervention_date || "",
          venue: r.intervention_venue || "",
          total: Number(r.intervention_total || 0),
          technologiesPromotedTotal: Number(r.intervention_technologies_promoted_total || 0),
          promotionalActivitiesPressRelease: Number(r.intervention_promotional_activities_press_release || 0),
          created_at: r.intervention_created_at,
        };

        map[key].interventions.push(it);

        if (String(it.type || "").trim() === "Tech Roll Out") {
          map[key].technologiesDeployed += 1;
          map[key].technologiesAdopted += 1;
        }

        if (String(it.type || "").trim() === "Tech Promo") {
          map[key].technologiesPromoted += 1;
          map[key].technologiesPromotedTotal += 1;
        }

        map[key].beneficiaries += Number(it.total || 0);
        // technologiesPromotedTotal is counted only from Tech Promo above
        map[key].promotionalActivitiesPressRelease += Number(it.promotionalActivitiesPressRelease || 0);
        map[key].pressRelease += Number(it.promotionalActivitiesPressRelease || 0);
      }
    });

    const value = Object.values(map);

    res.json({
      value,
      Count: value.length,
    });
  });
});

// GET single sscp project
app.get("/sscp/:id", (req, res) => {
  const projectId = req.params.id;

  const sql = `
    SELECT
      p.*,

      i.id AS intervention_id,
      i.project_id AS intervention_project_id,
      i.type AS intervention_type,
      i.title AS intervention_title,
      i.date AS intervention_date,
      i.venue AS intervention_venue,
      i.no_of_firms AS intervention_no_of_firms,
      i.male AS intervention_male,
      i.female AS intervention_female,
      i.total AS intervention_total,
      i.notes AS intervention_notes,
      i.project_name AS intervention_project_name,
      i.technology_promoted AS intervention_technology_promoted,
      i.technology_generator AS intervention_technology_generator,
      i.mode_of_promotion AS intervention_mode_of_promotion,
      i.customer_name AS intervention_customer_name,
      i.customer_address AS intervention_customer_address,
      i.sex AS intervention_promo_sex,
      i.staff_name AS intervention_staff_name,
      i.means_of_verification AS intervention_means_of_verification,
      i.photos AS intervention_photos,
      i.packaging_quarter AS intervention_packaging_quarter,
      i.packaging_province AS intervention_packaging_province,
      i.packaging_date_completed AS intervention_packaging_date_completed,
      i.packaging_type_of_intervention AS intervention_packaging_type_of_intervention,
      i.packaging_product_name AS intervention_packaging_product_name,
      i.packaging_size_variant AS intervention_packaging_size_variant,
      i.packaging_materials_provided AS intervention_packaging_materials_provided,
      i.packaging_customer_name AS intervention_packaging_customer_name,
      i.packaging_sex AS intervention_packaging_sex,
      i.packaging_firm_institution AS intervention_packaging_firm_institution,
      i.packaging_address AS intervention_packaging_address,
      i.packaging_address_meta AS intervention_packaging_address_meta,
      i.packaging_means_of_verification AS intervention_packaging_means_of_verification,
      i.packaging_photos AS intervention_packaging_photos,
      i.packaging_remarks AS intervention_packaging_remarks,
      i.technologies_promoted_total AS intervention_technologies_promoted_total,
      i.promotional_activities_press_release AS intervention_promotional_activities_press_release,

      i.tacs_consultancy_type AS intervention_tacs_consultancy_type,
      i.tacs_date_engagement AS intervention_tacs_date_engagement,
      i.tacs_expert_institution AS intervention_tacs_expert_institution,
      i.tacs_customer_name AS intervention_tacs_customer_name,
      i.tacs_customer_sex AS intervention_tacs_customer_sex,
      i.tacs_customer_address AS intervention_tacs_customer_address,
      i.tacs_customer_address_meta AS intervention_tacs_customer_address_meta,
      i.tacs_means_verification AS intervention_tacs_means_verification,
      i.tacs_no_of_advice AS intervention_tacs_no_of_advice,
      i.tacs_remarks AS intervention_tacs_remarks,
      i.tacs_photos AS intervention_tacs_photos,

      i.program_training AS intervention_program_training,
      i.start_date AS intervention_start_date,
      i.end_date AS intervention_end_date,
      i.province AS intervention_province,
      i.venue_address_meta AS intervention_venue_address_meta,
      i.no_of_firms_sucs_heis_lgus AS intervention_no_of_firms_sucs_heis_lgus,
      i.participants_female AS intervention_participants_female,
      i.participants_male AS intervention_participants_male,
      i.senior_female AS intervention_senior_female,
      i.senior_male AS intervention_senior_male,
      i.ip_female AS intervention_ip_female,
      i.ip_male AS intervention_ip_male,
      i.fourps_female AS intervention_fourps_female,
      i.fourps_male AS intervention_fourps_male,
      i.pwd_female AS intervention_pwd_female,
      i.pwd_male AS intervention_pwd_male,
      i.total_female AS intervention_total_female,
      i.total_male AS intervention_total_male,
      i.total_participants AS intervention_total_participants,
      i.list_of_firms_associations AS intervention_list_of_firms_associations,
      i.name_of_trainor_affiliation AS intervention_name_of_trainor_affiliation,
      i.program_project_unit AS intervention_program_project_unit,
      i.dost_cost AS intervention_dost_cost,
      i.partner_agency_cost AS intervention_partner_agency_cost,
      i.total_cost AS intervention_total_cost,
      i.notes_remarks AS intervention_notes_remarks,
      i.latitude AS intervention_latitude,
      i.longitude AS intervention_longitude,

      i.techrollout_quarter AS intervention_techrollout_quarter,
      i.techrollout_unit_center AS intervention_techrollout_unit_center,
      i.techrollout_name_of_technology_transferred AS intervention_techrollout_name_of_technology_transferred,
      i.techrollout_technology_generator AS intervention_techrollout_technology_generator,
      i.techrollout_mode_of_transfer AS intervention_techrollout_mode_of_transfer,
      i.techrollout_is_dost_developed_funded AS intervention_techrollout_is_dost_developed_funded,
      i.techrollout_date_transferred AS intervention_techrollout_date_transferred,
      i.techrollout_activity_title AS intervention_techrollout_activity_title,
      i.techrollout_activity_date AS intervention_techrollout_activity_date,
      i.techrollout_activity_venue AS intervention_techrollout_activity_venue,
      i.techrollout_institution_name AS intervention_techrollout_institution_name,
      i.techrollout_institution_address AS intervention_techrollout_institution_address,
      i.techrollout_institution_address_meta AS intervention_techrollout_institution_address_meta,
      i.techrollout_classification AS intervention_techrollout_classification,
      i.techrollout_representative_name AS intervention_techrollout_representative_name,
      i.techrollout_representative_designation AS intervention_techrollout_representative_designation,
      i.techrollout_sex AS intervention_techrollout_sex,

      i.created_at AS intervention_created_at
    FROM sscp p
    LEFT JOIN sscp_interventions i
      ON p.id = i.project_id
    WHERE p.id = ?
    ORDER BY i.id DESC
  `;

  db.query(sql, [projectId], (err, rows) => {
    if (err) {
      console.error("GET /sscp/:id ERROR:", err);
      return res.status(500).json(err);
    }

    if (!rows.length) {
      return res.status(404).json({ message: "SSCP project not found" });
    }

    const p0 = rows[0];

    const typeVal = pickFirst(p0.type, "New Communities");
    const titleVal = pickFirst(p0.projectTitle, p0.project_title, "");
    const dateApprovedVal = formatDateOnly(
      pickFirst(
        p0.dateProjectApproval,
        p0.date_project_approval,
        p0.date_approved
      )
    );
    const amountVal = Number(
      pickFirst(
        p0.approvedProjectCost,
        p0.approved_project_cost,
        p0.amount,
        0
      )
    );
    const assocVal = pickFirst(
      p0.associationName,
      p0.association_name,
      p0.firm_name,
      p0.firmName,
      ""
    );

    const project = {
      id: p0.id,
      quarter: String(pickFirst(p0.quarter, "1")),
      type: typeVal,
      projectTitle: titleVal,
      project_title: titleVal,

      dateProjectApproval: dateApprovedVal,
      date_approved: dateApprovedVal,

      approvedProjectCost: amountVal,
      amount: amountVal,

      dateFundRelease: formatDateOnly(
        pickFirst(p0.dateFundRelease, p0.date_fund_release)
      ),

      associationName: assocVal,
      firmName: assocVal,
      firm_name: assocVal,

      address: pickFirst(p0.address, ""),
      addressMeta: {
        mode: pickFirst(p0.address_mode, ""),
        manualText: pickFirst(p0.address_manual_text, ""),
        province: pickFirst(p0.address_province, ""),
        municipality: pickFirst(p0.address_municipality, ""),
        barangay: pickFirst(p0.address_barangay, ""),
        lat:
          pickFirst(p0.address_lat, null) !== null
            ? Number(p0.address_lat)
            : null,
        lng:
          pickFirst(p0.address_lng, null) !== null
            ? Number(p0.address_lng)
            : null,
      },

      projectProponent: pickFirst(
        p0.projectProponent,
        p0.project_proponent,
        ""
      ),
      sex: pickFirst(p0.sex, ""),
      processSystem: pickFirst(p0.processSystem, p0.process_system, ""),
      pressRelease: Number(
        pickFirst(p0.pressRelease, p0.press_release, 0)
      ),

      communitiesAssisted: Number(
        pickFirst(p0.communitiesAssisted, p0.communities_assisted, 0)
      ),
      technologiesDeployed: Number(
        pickFirst(p0.technologiesDeployed, p0.technologies_deployed, 0)
      ),
      beneficiaries: Number(pickFirst(p0.beneficiaries, 0)),
      startupsAssisted: Number(
        pickFirst(p0.startupsAssisted, p0.startups_assisted, 0)
      ),
      jobsGenerated: Number(
        pickFirst(p0.jobsGenerated, p0.jobs_generated, 0)
      ),
      created_at: p0.created_at,
      interventions: [],
    };

    rows.forEach((row) => {
      if (row.intervention_id) {
        project.interventions.push({
          id: row.intervention_id,
          project_id: row.intervention_project_id,
          type: row.intervention_type ?? "",
          title: row.intervention_title ?? "",
          date: formatDateOnly(row.intervention_date),
          venue: row.intervention_venue || "",
          noOfFirms: row.intervention_no_of_firms ?? "",
          male: row.intervention_male ?? "",
          female: row.intervention_female ?? "",
          total: row.intervention_total ?? "",
          notes: row.intervention_notes || "",

          ...mapCestTechPromoResponse({
            intervention_project_name: row.intervention_project_name,
            intervention_activity_date: row.intervention_date,
            intervention_technology_promoted: row.intervention_technology_promoted,
            intervention_technology_generator: row.intervention_technology_generator,
            intervention_mode_of_promotion: row.intervention_mode_of_promotion,
            intervention_activity_title: row.intervention_title,
            intervention_activity_venue_address: row.intervention_venue,
            intervention_activity_venue_meta: row.intervention_venue_address_meta,
            intervention_customer_name: row.intervention_customer_name,
            intervention_customer_address: row.intervention_customer_address,
            intervention_promo_sex: row.intervention_promo_sex,
            intervention_means_of_verification: row.intervention_means_of_verification,
            intervention_staff_name: row.intervention_staff_name,
            intervention_photos: row.intervention_photos,
          }),
          packagingQuarter: row.intervention_packaging_quarter ?? "",
          packagingProvince: row.intervention_packaging_province ?? "Pangasinan",
          packagingDateCompleted: formatDateOnly(row.intervention_packaging_date_completed),
          packagingTypeOfIntervention:
            row.intervention_packaging_type_of_intervention ?? "",
          packagingProductName: row.intervention_packaging_product_name ?? "",
          packagingSizeVariant: row.intervention_packaging_size_variant ?? "",
          packagingMaterialsProvided:
            row.intervention_packaging_materials_provided ?? "",
          packagingCustomerName: row.intervention_packaging_customer_name ?? "",
          packagingSex: row.intervention_packaging_sex ?? "",
          packagingFirmInstitution:
            row.intervention_packaging_firm_institution ?? "",
          packagingAddress: row.intervention_packaging_address ?? "",
          packagingAddressMeta: parseJsonSafe(
            row.intervention_packaging_address_meta
          ),
          packagingMeansVerification:
            row.intervention_packaging_means_of_verification ?? "",
          packagingPhotos: parseJsonSafe(row.intervention_packaging_photos) || [],
          packagingRemarks: row.intervention_packaging_remarks ?? "",
          technologiesPromotedTotal:
            row.intervention_technologies_promoted_total ?? 0,
          promotionalActivitiesPressRelease:
            row.intervention_promotional_activities_press_release ?? 0,

          tacsConsultancyType: row.intervention_tacs_consultancy_type ?? "",
          tacsDateEngagement: formatDateOnly(
            row.intervention_tacs_date_engagement
          ),
          tacsExpertInstitution: row.intervention_tacs_expert_institution ?? "",
          tacsCustomerName: row.intervention_tacs_customer_name ?? "",
          tacsCustomerSex: row.intervention_tacs_customer_sex ?? "",
          tacsCustomerAddress: row.intervention_tacs_customer_address ?? "",
          tacsCustomerAddressMeta: parseJsonSafe(
            row.intervention_tacs_customer_address_meta
          ),
          tacsMeansVerification:
            row.intervention_tacs_means_verification ?? "",
          tacsNoOfAdvice: row.intervention_tacs_no_of_advice ?? "",
          tacsRemarks: row.intervention_tacs_remarks ?? "",
          tacsPhotos: parseJsonSafe(row.intervention_tacs_photos) || [],

          programTraining: row.intervention_program_training ?? "",
          startDate: formatDateOnly(row.intervention_start_date),
          endDate: formatDateOnly(row.intervention_end_date),
          province: row.intervention_province ?? "",
          venueAddressMeta: parseJsonSafe(row.intervention_venue_address_meta),
          noOfFirmsSucsHeisLgus:
            row.intervention_no_of_firms_sucs_heis_lgus ?? 0,
          participantsFemale: row.intervention_participants_female ?? 0,
          participantsMale: row.intervention_participants_male ?? 0,
          seniorFemale: row.intervention_senior_female ?? 0,
          seniorMale: row.intervention_senior_male ?? 0,
          ipFemale: row.intervention_ip_female ?? 0,
          ipMale: row.intervention_ip_male ?? 0,
          fourPsFemale: row.intervention_fourps_female ?? 0,
          fourPsMale: row.intervention_fourps_male ?? 0,
          pwdFemale: row.intervention_pwd_female ?? 0,
          pwdMale: row.intervention_pwd_male ?? 0,
          totalFemale: row.intervention_total_female ?? 0,
          totalMale: row.intervention_total_male ?? 0,
          totalParticipants: row.intervention_total_participants ?? 0,
          listOfFirmsAssociations:
            row.intervention_list_of_firms_associations ?? "",
          nameOfTrainorAffiliation:
            row.intervention_name_of_trainor_affiliation ?? "",
          programProjectUnit: row.intervention_program_project_unit ?? "",
          dostCost: row.intervention_dost_cost ?? 0,
          partnerAgencyCost: row.intervention_partner_agency_cost ?? 0,
          totalCost: row.intervention_total_cost ?? 0,
          notesRemarks: row.intervention_notes_remarks ?? "",
          latitude:
            row.intervention_latitude !== null && row.intervention_latitude !== undefined
              ? Number(row.intervention_latitude)
              : null,
          longitude:
            row.intervention_longitude !== null && row.intervention_longitude !== undefined
              ? Number(row.intervention_longitude)
              : null,

          ...mapCestTechRolloutResponse(row),
          ...mapCestPackagingResponse(row),

          created_at: row.intervention_created_at,
        });
      }
    });

    res.json(project);
  });
});

// GET interventions by sscp project
app.get("/sscp/:id/interventions", (req, res) => {
  db.query(
    `
      SELECT
        *,
        DATE_FORMAT(date, '%Y-%m-%d') AS date_fmt,
        DATE_FORMAT(start_date, '%Y-%m-%d') AS start_date_fmt,
        DATE_FORMAT(end_date, '%Y-%m-%d') AS end_date_fmt,
        DATE_FORMAT(tacs_date_engagement, '%Y-%m-%d') AS tacs_date_engagement_fmt,
        DATE_FORMAT(techrollout_date_transferred, '%Y-%m-%d') AS techrollout_date_transferred_fmt,
        DATE_FORMAT(techrollout_activity_date, '%Y-%m-%d') AS techrollout_activity_date_fmt
      FROM sscp_interventions
      WHERE project_id=?
      ORDER BY id DESC
    `,
    [req.params.id],
    (err, rows) => {
      if (err) {
        console.error("GET /sscp/:id/interventions ERROR:", err);
        return res.status(500).json(err);
      }

      const normalized = rows.map((row) => ({
        id: row.id,
        project_id: row.project_id,
        type: row.type ?? "",
        title: row.title ?? "",
        date: row.date_fmt || formatDateOnly(row.date),
        venue: row.venue || "",
        noOfFirms: row.no_of_firms ?? "",
        male: row.male ?? "",
        female: row.female ?? "",
        total: row.total ?? "",
        notes: row.notes || "",

        ...mapCestTechPromoResponse({
          project_name: row.project_name,
          activity_date: row.date_fmt || row.date,
          technology_promoted: row.technology_promoted,
          technology_generator: row.technology_generator,
          mode_of_promotion: row.mode_of_promotion,
          activity_title: row.title,
          activity_venue_address: row.venue,
          activity_venue_meta: row.venue_address_meta,
          customer_name: row.customer_name,
          customer_address: row.customer_address,
          sex: row.sex,
          means_of_verification: row.means_of_verification,
          staff_name: row.staff_name,
          photos: row.photos,
        }),
        technologiesPromotedTotal: row.technologies_promoted_total ?? 0,
        promotionalActivitiesPressRelease:
          row.promotional_activities_press_release ?? 0,

        tacsConsultancyType: row.tacs_consultancy_type ?? "",
        tacsDateEngagement:
          row.tacs_date_engagement_fmt || formatDateOnly(row.tacs_date_engagement),
        tacsExpertInstitution: row.tacs_expert_institution ?? "",
        tacsCustomerName: row.tacs_customer_name ?? "",
        tacsCustomerSex: row.tacs_customer_sex ?? "",
        tacsCustomerAddress: row.tacs_customer_address ?? "",
        tacsCustomerAddressMeta: parseJsonSafe(row.tacs_customer_address_meta),
        tacsMeansVerification: row.tacs_means_verification ?? "",
        tacsNoOfAdvice: row.tacs_no_of_advice ?? "",
        tacsRemarks: row.tacs_remarks ?? "",
        tacsPhotos: parseJsonSafe(row.tacs_photos) || [],

        programTraining: row.program_training ?? "",
        startDate: row.start_date_fmt || (row.start_date ? formatDateOnly(row.start_date) : ""),
        endDate: row.end_date_fmt || (row.end_date ? formatDateOnly(row.end_date) : ""),
        province: row.province ?? "",
        venueAddressMeta: parseJsonSafe(row.venue_address_meta),
        noOfFirmsSucsHeisLgus: row.no_of_firms_sucs_heis_lgus ?? 0,
        participantsFemale: row.participants_female ?? 0,
        participantsMale: row.participants_male ?? 0,
        seniorFemale: row.senior_female ?? 0,
        seniorMale: row.senior_male ?? 0,
        ipFemale: row.ip_female ?? 0,
        ipMale: row.ip_male ?? 0,
        fourPsFemale: row.fourps_female ?? 0,
        fourPsMale: row.fourps_male ?? 0,
        pwdFemale: row.pwd_female ?? 0,
        pwdMale: row.pwd_male ?? 0,
        totalFemale: row.total_female ?? 0,
        totalMale: row.total_male ?? 0,
        totalParticipants: row.total_participants ?? 0,
        listOfFirmsAssociations: row.list_of_firms_associations ?? "",
        nameOfTrainorAffiliation: row.name_of_trainor_affiliation ?? "",
        programProjectUnit: row.program_project_unit ?? "",
        dostCost: row.dost_cost ?? 0,
        partnerAgencyCost: row.partner_agency_cost ?? 0,
        totalCost: row.total_cost ?? 0,
        notesRemarks: row.notes_remarks ?? "",
        latitude:
          row.latitude !== null && row.latitude !== undefined
            ? Number(row.latitude)
            : null,
        longitude:
          row.longitude !== null && row.longitude !== undefined
            ? Number(row.longitude)
            : null,

        packagingQuarter: row.packaging_quarter ?? "",
        packagingProvince: row.packaging_province ?? "Pangasinan",
        packagingDateCompleted: formatDateOnly(row.packaging_date_completed),
        packagingTypeOfIntervention: row.packaging_type_of_intervention ?? "",
        packagingProductName: row.packaging_product_name ?? "",
        packagingSizeVariant: row.packaging_size_variant ?? "",
        packagingMaterialsProvided: row.packaging_materials_provided ?? "",
        packagingCustomerName: row.packaging_customer_name ?? "",
        packagingSex: row.packaging_sex ?? "",
        packagingFirmInstitution: row.packaging_firm_institution ?? "",
        packagingAddress: row.packaging_address ?? "",
        packagingAddressMeta: parseJsonSafe(row.packaging_address_meta),
        packagingMeansVerification: row.packaging_means_of_verification ?? "",
        packagingPhotos: parseJsonSafe(row.packaging_photos) || [],
        packagingRemarks: row.packaging_remarks ?? "",

        techrolloutQuarter: row.techrollout_quarter ?? "",
        techrolloutUnitCenter: row.techrollout_unit_center ?? "DOST-PANGASINAN",
        techrolloutNameOfTechnologyTransferred:
          row.techrollout_name_of_technology_transferred ?? "",
        techrolloutTechnologyGenerator: row.techrollout_technology_generator ?? "",
        techrolloutModeOfTransfer: row.techrollout_mode_of_transfer ?? "",
        techrolloutIsDostDevelopedFunded: Boolean(
          row.techrollout_is_dost_developed_funded ?? 0
        ),
        techrolloutDateTransferred:
          row.techrollout_date_transferred_fmt ||
          formatDateOnly(row.techrollout_date_transferred),
        techrolloutActivityTitle: row.techrollout_activity_title ?? "",
        techrolloutActivityDate:
          row.techrollout_activity_date_fmt ||
          formatDateOnly(row.techrollout_activity_date),
        techrolloutActivityVenue: row.techrollout_activity_venue ?? "",
        techrolloutInstitutionName: row.techrollout_institution_name ?? "",
        techrolloutInstitutionAddress: row.techrollout_institution_address ?? "",
        techrolloutInstitutionAddressMeta: parseJsonSafe(
          row.techrollout_institution_address_meta
        ),
        techrolloutClassification: row.techrollout_classification ?? "",
        techrolloutRepresentativeName: row.techrollout_representative_name ?? "",
        techrolloutRepresentativeDesignation:
          row.techrollout_representative_designation ?? "",
        techrolloutSex: row.techrollout_sex ?? "",

        ...mapCestPackagingResponse(row),
      }));

      res.json(normalized);
    }
  );
});

// CREATE sscp project
app.post("/sscp", (req, res) => {
  const b = req.body || {};

  const quarter = pickFirst(b.quarter, "1");
  const type = pickFirst(b.type, "New Communities");
  const projectTitle = pickFirst(b.projectTitle, b.project_title, "");
  const dateProjectApproval = pickFirst(
    b.dateProjectApproval,
    b.date_approved,
    null
  );
  const approvedProjectCost = pickFirst(b.approvedProjectCost, b.amount, 0);
  const dateFundRelease = pickFirst(
    b.dateFundRelease,
    b.date_fund_release,
    null
  );
  const associationName = pickFirst(
    b.associationName,
    b.association_name,
    b.firm_name,
    b.firmName,
    ""
  );
  const address = pickFirst(b.address, "");
  const projectProponent = pickFirst(
    b.projectProponent,
    b.project_proponent,
    ""
  );
  const sex = pickFirst(b.sex, "");
  const processSystem = pickFirst(b.processSystem, b.process_system, "");
  const pressRelease = pickFirst(b.pressRelease, b.press_release, 0);
  const communitiesAssisted = pickFirst(
    b.communitiesAssisted,
    b.communities_assisted,
    0
  );
  const technologiesDeployed = pickFirst(
    b.technologiesDeployed,
    b.technologies_deployed,
    0
  );
  const beneficiaries = pickFirst(b.beneficiaries, 0);
  const startupsAssisted = pickFirst(
    b.startupsAssisted,
    b.startups_assisted,
    0
  );
  const jobsGenerated = pickFirst(b.jobsGenerated, b.jobs_generated, 0);

  const addr = mapAddressMetaFromBody(b);

  const sql = `
    INSERT INTO sscp
    (
      quarter,
      type,
      projectTitle,
      dateProjectApproval,
      approvedProjectCost,
      dateFundRelease,
      associationName,
      address,
      address_mode,
      address_manual_text,
      address_province,
      address_municipality,
      address_barangay,
      address_lat,
      address_lng,
      projectProponent,
      sex,
      processSystem,
      press_release,
      communitiesAssisted,
      technologiesDeployed,
      beneficiaries,
      startupsAssisted,
      jobsGenerated
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [
      quarter,
      type,
      projectTitle,
      toNullIfEmpty(dateProjectApproval),
      toNumOrZero(approvedProjectCost),
      toNullIfEmpty(dateFundRelease),
      associationName,
      address,

      addr.address_mode,
      addr.address_manual_text,
      addr.address_province,
      addr.address_municipality,
      addr.address_barangay,
      addr.address_lat,
      addr.address_lng,

      projectProponent,
      sex || "",
      processSystem || "",
      toNumOrZero(pressRelease),
      toNumOrZero(communitiesAssisted),
      toNumOrZero(technologiesDeployed),
      toNumOrZero(beneficiaries),
      toNumOrZero(startupsAssisted),
      toNumOrZero(jobsGenerated),
    ],
    (err, result) => {
      if (err) {
        console.error("CREATE SSCP ERROR:", err);
        return res.status(500).json(err);
      }
      res.json({ message: "SSCP project created", id: result.insertId });
    }
  );
});

// UPDATE sscp project
app.put("/sscp/:id", (req, res) => {
  const b = req.body || {};

  const quarter = pickFirst(b.quarter, "1");
  const type = pickFirst(b.type, "New Communities");
  const projectTitle = pickFirst(b.projectTitle, b.project_title, "");
  const dateProjectApproval = pickFirst(
    b.dateProjectApproval,
    b.date_approved,
    null
  );
  const approvedProjectCost = pickFirst(b.approvedProjectCost, b.amount, 0);
  const dateFundRelease = pickFirst(
    b.dateFundRelease,
    b.date_fund_release,
    null
  );
  const associationName = pickFirst(
    b.associationName,
    b.association_name,
    b.firm_name,
    b.firmName,
    ""
  );
  const address = pickFirst(b.address, "");
  const projectProponent = pickFirst(
    b.projectProponent,
    b.project_proponent,
    ""
  );
  const sex = pickFirst(b.sex, "");
  const processSystem = pickFirst(b.processSystem, b.process_system, "");
  const pressRelease = pickFirst(b.pressRelease, b.press_release, 0);
  const communitiesAssisted = pickFirst(
    b.communitiesAssisted,
    b.communities_assisted,
    0
  );
  const technologiesDeployed = pickFirst(
    b.technologiesDeployed,
    b.technologies_deployed,
    0
  );
  const beneficiaries = pickFirst(b.beneficiaries, 0);
  const startupsAssisted = pickFirst(
    b.startupsAssisted,
    b.startups_assisted,
    0
  );
  const jobsGenerated = pickFirst(b.jobsGenerated, b.jobs_generated, 0);

  const addr = mapAddressMetaFromBody(b);

  const sql = `
    UPDATE sscp SET
      quarter=?,
      type=?,
      projectTitle=?,
      dateProjectApproval=?,
      approvedProjectCost=?,
      dateFundRelease=?,
      associationName=?,
      address=?,
      address_mode=?,
      address_manual_text=?,
      address_province=?,
      address_municipality=?,
      address_barangay=?,
      address_lat=?,
      address_lng=?,
      projectProponent=?,
      sex=?,
      processSystem=?,
      press_release=?,
      communitiesAssisted=?,
      technologiesDeployed=?,
      beneficiaries=?,
      startupsAssisted=?,
      jobsGenerated=?
    WHERE id=?
  `;

  db.query(
    sql,
    [
      quarter,
      type,
      projectTitle,
      toNullIfEmpty(dateProjectApproval),
      toNumOrZero(approvedProjectCost),
      toNullIfEmpty(dateFundRelease),
      associationName,
      address,

      addr.address_mode,
      addr.address_manual_text,
      addr.address_province,
      addr.address_municipality,
      addr.address_barangay,
      addr.address_lat,
      addr.address_lng,

      projectProponent,
      sex || "",
      processSystem || "",
      toNumOrZero(pressRelease),
      toNumOrZero(communitiesAssisted),
      toNumOrZero(technologiesDeployed),
      toNumOrZero(beneficiaries),
      toNumOrZero(startupsAssisted),
      toNumOrZero(jobsGenerated),

      req.params.id,
    ],
    (err) => {
      if (err) {
        console.error("UPDATE SSCP ERROR:", err);
        return res.status(500).json(err);
      }
      res.json({ message: "SSCP project updated" });
    }
  );
});

// DELETE sscp project
app.delete("/sscp/:id", (req, res) => {
  const projectId = req.params.id;

  db.query(
    "DELETE FROM tacs_entries WHERE project_id = ? AND source_module = ? AND source_table = ?",
    [projectId, "SSCP", "sscp_interventions"],
    (tacsErr) => {
      if (tacsErr) return res.status(500).json(tacsErr);

      db.query(
        "DELETE FROM sscp_interventions WHERE project_id=?",
        [projectId],
        (err) => {
          if (err) return res.status(500).json(err);

          db.query(
            "DELETE FROM sscp_other_indicators WHERE project_id=?",
            [projectId],
            (errOI) => {
              if (errOI) return res.status(500).json(errOI);

              db.query("DELETE FROM sscp WHERE id=?", [projectId], (err2) => {
                if (err2) return res.status(500).json(err2);
                res.json({
                  message:
                    "SSCP project deleted (with interventions + other indicators)",
                });
              });
            }
          );
        }
      );
    }
  );
});

// CREATE sscp intervention
app.post("/sscp/:id/interventions", (req, res) => {
  const projectId = Number(req.params.id);
  const b = req.body || {};
  const techPromo = mapCestTechPromoPayload(b, b.type || "");
  const techrollout = mapCestTechRolloutPayload(b);
  const packaging = mapCestPackagingPayloadForDb(b);

  const type = pickFirst(b.type, "");
  const title = pickFirst(b.title, b.activityTitle, b.activity_title, "");
  const date = pickFirst(
    b.date,
    b.activityDate,
    b.activity_date,
    b.startDate,
    b.start_date,
    null
  );
  const venue = pickFirst(
    b.venue,
    b.activityVenueAddress,
    b.activity_venue_address,
    b.venueAddress,
    b.venue_address,
    ""
  );
  const noOfFirms = pickFirst(b.noOfFirms, b.no_of_firms, null);
  const male = pickFirst(b.male, b.totalMale, b.total_male, null);
  const female = pickFirst(b.female, b.totalFemale, b.total_female, null);
  const total = pickFirst(
    b.total,
    b.totalParticipants,
    b.total_participants,
    null
  );
  const notes = pickFirst(b.notes, "");

  const technologiesPromotedTotal = pickFirst(
    b.technologiesPromotedTotal,
    b.technologies_promoted_total,
    0
  );
  const promotionalActivitiesPressRelease = pickFirst(
    b.promotionalActivitiesPressRelease,
    b.promotional_activities_press_release,
    0
  );
  const pwd = pickFirst(b.pwd, null);
  const fourPs = pickFirst(b.fourPs, b.four_ps, null);
  const ip = pickFirst(b.ip, null);
  const seniors = pickFirst(b.seniors, null);

  const tacsConsultancyType = pickFirst(
    b.tacsConsultancyType,
    b.tacs_consultancy_type,
    null
  );
  const tacsDateEngagement = pickFirst(
    b.tacsDateEngagement,
    b.tacs_date_engagement,
    null
  );
  const tacsExpertInstitution = pickFirst(
    b.tacsExpertInstitution,
    b.tacs_expert_institution,
    null
  );
  const tacsCustomerName = pickFirst(
    b.tacsCustomerName,
    b.tacs_customer_name,
    null
  );
  const tacsCustomerSex = pickFirst(
    b.tacsCustomerSex,
    b.tacs_customer_sex,
    null
  );
  const tacsCustomerAddress = pickFirst(
    b.tacsCustomerAddress,
    b.tacs_customer_address,
    null
  );
  const tacsCustomerAddressMeta = pickFirst(
    b.tacsCustomerAddressMeta,
    b.tacs_customer_address_meta,
    null
  );
  const tacsMeansVerification = pickFirst(
    b.tacsMeansVerification,
    b.tacs_means_verification,
    null
  );
  const tacsNoOfAdvice = pickFirst(
    b.tacsNoOfAdvice,
    b.tacs_no_of_advice,
    null
  );
  const tacsRemarks = pickFirst(b.tacsRemarks, b.tacs_remarks, null);
  const tacsPhotos = pickFirst(b.tacsPhotos, b.tacs_photos, null);

  const trainingProgram = pickFirst(
    b.programTraining,
    b.program_training,
    null
  );
  const trainingStartDate = pickFirst(
    b.startDate,
    b.start_date,
    b.date,
    null
  );
  const trainingEndDate = pickFirst(b.endDate, b.end_date, null);
  const trainingProvince = pickFirst(b.province, null);
  const trainingVenueAddressMeta = pickFirst(
    b.venueAddressMeta,
    b.venue_address_meta,
    null
  );
  const latitude = toNumOrNull(
    pickFirst(
      b.latitude,
      b.lat,
      trainingVenueAddressMeta?.lat,
      trainingVenueAddressMeta?.latitude,
      null
    )
  );
  const longitude = toNumOrNull(
    pickFirst(
      b.longitude,
      b.lng,
      trainingVenueAddressMeta?.lng,
      trainingVenueAddressMeta?.longitude,
      null
    )
  );
  const noOfFirmsSucsHeisLgus = pickFirst(
    b.noOfFirmsSucsHeisLgus,
    b.no_of_firms_sucs_heis_lgus,
    b.firmsSucsHeisLgusCount,
    b.firms_sucs_heis_lgus_count,
    0
  );
  const participantsFemale = pickFirst(
    b.participantsFemale,
    b.participants_female,
    0
  );
  const participantsMale = pickFirst(
    b.participantsMale,
    b.participants_male,
    0
  );
  const seniorFemale = pickFirst(b.seniorFemale, b.senior_female, 0);
  const seniorMale = pickFirst(b.seniorMale, b.senior_male, 0);
  const ipFemale = pickFirst(b.ipFemale, b.ip_female, 0);
  const ipMale = pickFirst(b.ipMale, b.ip_male, 0);
  const fourPsFemale = pickFirst(b.fourPsFemale, b.fourps_female, 0);
  const fourPsMale = pickFirst(b.fourPsMale, b.fourps_male, 0);
  const pwdFemale = pickFirst(b.pwdFemale, b.pwd_female, 0);
  const pwdMale = pickFirst(b.pwdMale, b.pwd_male, 0);
  const totalFemale = pickFirst(b.totalFemale, b.total_female, female, 0);
  const totalMale = pickFirst(b.totalMale, b.total_male, male, 0);
  const totalParticipants = pickFirst(
    b.totalParticipants,
    b.total_participants,
    total,
    0
  );
  const listOfFirmsAssociations = pickFirst(
    b.listOfFirmsAssociations,
    b.list_of_firms_associations,
    null
  );
  const nameOfTrainorAffiliation = pickFirst(
    b.nameOfTrainorAffiliation,
    b.name_of_trainor_affiliation,
    null
  );
  const programProjectUnit = pickFirst(
    b.programProjectUnit,
    b.program_project_unit,
    null
  );
  const dostCost = pickFirst(b.dostCost, b.dost_cost, 0);
  const partnerAgencyCost = pickFirst(
    b.partnerAgencyCost,
    b.partner_agency_cost,
    0
  );
  const totalCost = pickFirst(b.totalCost, b.total_cost, 0);
  const notesRemarks = pickFirst(b.notesRemarks, b.notes_remarks, null);

  const sql = `
    INSERT INTO sscp_interventions (
      project_id,
      type,
      title,
      date,
      venue,
      no_of_firms,
      male,
      female,
      total,
      notes,
      project_name,
      technology_promoted,
      technology_generator,
      mode_of_promotion,
      customer_name,
      customer_address,
      sex,
      staff_name,
      means_of_verification,
      photos,
      technologies_promoted_total,
      promotional_activities_press_release,
      pwd,
      four_ps,
      ip,
      seniors,
      tacs_consultancy_type,
      tacs_date_engagement,
      tacs_expert_institution,
      tacs_customer_name,
      tacs_customer_sex,
      tacs_customer_address,
      tacs_customer_address_meta,
      tacs_means_verification,
      tacs_no_of_advice,
      tacs_remarks,
      tacs_photos,
      program_training,
      start_date,
      end_date,
      province,
      venue_address_meta,
      no_of_firms_sucs_heis_lgus,
      participants_female,
      participants_male,
      senior_female,
      senior_male,
      ip_female,
      ip_male,
      fourps_female,
      fourps_male,
      pwd_female,
      pwd_male,
      total_female,
      total_male,
      total_participants,
      list_of_firms_associations,
      name_of_trainor_affiliation,
      program_project_unit,
      dost_cost,
      partner_agency_cost,
      total_cost,
      notes_remarks,
      latitude,
      longitude,
      techrollout_quarter,
      techrollout_unit_center,
      techrollout_name_of_technology_transferred,
      techrollout_technology_generator,
      techrollout_mode_of_transfer,
      techrollout_is_dost_developed_funded,
      techrollout_date_transferred,
      techrollout_activity_title,
      techrollout_activity_date,
      techrollout_activity_venue,
      techrollout_institution_name,
      techrollout_institution_address,
      techrollout_institution_address_meta,
      techrollout_classification,
      techrollout_representative_name,
      techrollout_representative_designation,
      techrollout_sex,
      packaging_quarter,
      packaging_province,
      packaging_date_completed,
      packaging_type_of_intervention,
      packaging_product_name,
      packaging_size_variant,
      packaging_materials_provided,
      packaging_customer_name,
      packaging_sex,
      packaging_firm_institution,
      packaging_address,
      packaging_address_meta,
      packaging_means_of_verification,
      packaging_photos,
      packaging_remarks
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.beginTransaction((txErr) => {
    if (txErr) {
      console.error("CREATE SSCP INTERVENTION TX ERROR:", txErr);
      return res.status(500).json({ message: txErr.message });
    }

    db.query(
      sql,
      [
        projectId,
        type,
        title,
        toNullIfEmpty(date),
        venue || "",
        toNumOrNull(noOfFirms),
        toNumOrNull(male),
        toNumOrNull(female),
        toNumOrNull(total),
        notes || "",
        techPromo.project_name || "SSCP",
        techPromo.technology_promoted,
        techPromo.technology_generator,
        techPromo.mode_of_promotion,
        techPromo.customer_name,
        techPromo.customer_address,
        techPromo.sex,
        techPromo.staff_name,
        techPromo.means_of_verification,
        techPromo.photos,
        toNumOrZero(technologiesPromotedTotal),
        toNumOrZero(promotionalActivitiesPressRelease),
        toNullIfEmpty(pwd),
        toNullIfEmpty(fourPs),
        toNullIfEmpty(ip),
        toNullIfEmpty(seniors),
        toNullIfEmpty(tacsConsultancyType),
        toNullIfEmpty(tacsDateEngagement),
        toNullIfEmpty(tacsExpertInstitution),
        toNullIfEmpty(tacsCustomerName),
        toNullIfEmpty(tacsCustomerSex),
        toNullIfEmpty(tacsCustomerAddress),
        mapTacsAddressMeta(tacsCustomerAddressMeta),
        toNullIfEmpty(tacsMeansVerification),
        toNumOrNull(tacsNoOfAdvice),
        toNullIfEmpty(tacsRemarks),
        mapTacsAddressMeta(Array.isArray(tacsPhotos) ? tacsPhotos : []),
        toNullIfEmpty(trainingProgram),
        toNullIfEmpty(trainingStartDate),
        toNullIfEmpty(trainingEndDate),
        toNullIfEmpty(trainingProvince),
        techPromo.venue_address_meta ||
        mapTacsAddressMeta(trainingVenueAddressMeta),
        toNumOrZero(noOfFirmsSucsHeisLgus),
        toNumOrZero(participantsFemale),
        toNumOrZero(participantsMale),
        toNumOrZero(seniorFemale),
        toNumOrZero(seniorMale),
        toNumOrZero(ipFemale),
        toNumOrZero(ipMale),
        toNumOrZero(fourPsFemale),
        toNumOrZero(fourPsMale),
        toNumOrZero(pwdFemale),
        toNumOrZero(pwdMale),
        toNumOrZero(totalFemale),
        toNumOrZero(totalMale),
        toNumOrZero(totalParticipants),
        toNullIfEmpty(listOfFirmsAssociations),
        toNullIfEmpty(nameOfTrainorAffiliation),
        toNullIfEmpty(programProjectUnit),
        toNumOrZero(dostCost),
        toNumOrZero(partnerAgencyCost),
        toNumOrZero(totalCost),
        toNullIfEmpty(notesRemarks),
        latitude,
        longitude,
        techrollout.techrollout_quarter,
        techrollout.techrollout_unit_center,
        techrollout.techrollout_name_of_technology_transferred,
        techrollout.techrollout_technology_generator,
        techrollout.techrollout_mode_of_transfer,
        techrollout.techrollout_is_dost_developed_funded,
        techrollout.techrollout_date_transferred,
        techrollout.techrollout_activity_title,
        techrollout.techrollout_activity_date,
        techrollout.techrollout_activity_venue,
        techrollout.techrollout_institution_name,
        techrollout.techrollout_institution_address,
        techrollout.techrollout_institution_address_meta,
        techrollout.techrollout_classification,
        techrollout.techrollout_representative_name,
        techrollout.techrollout_representative_designation,
        techrollout.techrollout_sex,
        packaging.packaging_quarter,
        packaging.packaging_province,
        packaging.packaging_date_completed,
        packaging.packaging_type_of_intervention,
        packaging.packaging_product_name,
        packaging.packaging_size_variant,
        packaging.packaging_materials_provided,
        packaging.packaging_customer_name,
        packaging.packaging_sex,
        packaging.packaging_firm_institution,
        packaging.packaging_address,
        packaging.packaging_address_meta,
        packaging.packaging_means_of_verification,
        packaging.packaging_photos,
        packaging.packaging_remarks,
      ],
      (err, result) => {
        if (err) {
          return db.rollback(() => {
            console.error("CREATE SSCP INTERVENTION ERROR:", err);
            res.status(500).json({ message: err.message });
          });
        }

        const interventionId = Number(result.insertId);

        syncSscpTechnologyPromotionEntry(
          {
            projectId,
            interventionId,
            type,
            body: {
              ...b,
              title,
              date: toNullIfEmpty(date),
              venue: venue || "",
            },
          },
          (techPromoSyncErr) => {
            if (techPromoSyncErr) {
              return db.rollback(() => {
                console.error(
                  "CREATE SSCP INTERVENTION Technology Promotion sync ERROR:",
                  techPromoSyncErr
                );
                res.status(500).json({ message: techPromoSyncErr.message });
              });
            }

            syncTacsEntryForIntervention(
              {
                projectId,
                interventionId,
                type,
                body: {
                  ...b,
                  title,
                  date: toNullIfEmpty(date),
                  venue: venue || "",
                  tacsPhotos: Array.isArray(tacsPhotos) ? tacsPhotos : [],
                },
                source_module: "SSCP",
                source_table: "sscp_interventions",
              },
              (tacsSyncErr) => {
                if (tacsSyncErr) {
                  return db.rollback(() => {
                    console.error(
                      "CREATE SSCP INTERVENTION TACS sync ERROR:",
                      tacsSyncErr
                    );
                    res.status(500).json({ message: tacsSyncErr.message });
                  });
                }

                syncPackagingRecordForIntervention(
                  {
                    projectId,
                    interventionId,
                    type,
                    body: {
                      ...b,
                      title,
                      date: toNullIfEmpty(date),
                      venue: venue || "",
                      packagingQuarter: packaging.packaging_quarter,
                      packagingProvince: packaging.packaging_province,
                      packagingDateCompleted: packaging.packaging_date_completed,
                      packagingTypeOfIntervention:
                        packaging.packaging_type_of_intervention,
                      packagingProductName: packaging.packaging_product_name,
                      packagingSizeVariant: packaging.packaging_size_variant,
                      packagingMaterialsProvided:
                        packaging.packaging_materials_provided,
                      packagingCustomerName: packaging.packaging_customer_name,
                      packagingSex: packaging.packaging_sex,
                      packagingFirmInstitution:
                        packaging.packaging_firm_institution,
                      packagingAddress: packaging.packaging_address,
                      packagingAddressMeta: parseJsonSafe(
                        packaging.packaging_address_meta
                      ),
                      packagingMeansVerification:
                        packaging.packaging_means_of_verification,
                      packagingPhotos:
                        parseJsonSafe(packaging.packaging_photos) || [],
                      packagingRemarks: packaging.packaging_remarks,
                    },
                  },
                  (packagingSyncErr) => {
                    if (packagingSyncErr) {
                      return db.rollback(() => {
                        console.error(
                          "CREATE SSCP INTERVENTION Packaging & Labeling sync ERROR:",
                          packagingSyncErr
                        );
                        res.status(500).json({ message: packagingSyncErr.message });
                      });
                    }

                    syncTechnologyTrainingEntryForIntervention(
                      {
                        projectId,
                        interventionId,
                        type,
                        body: {
                          ...b,
                          venue: venue || "",
                          latitude,
                          longitude,
                          male: toNumOrZero(totalMale),
                          female: toNumOrZero(totalFemale),
                          total: toNumOrZero(totalParticipants),
                        },
                        source_module: "sscp",
                        source_label: "SSCP",
                      },
                      (syncErr) => {
                        if (syncErr) {
                          return db.rollback(() => {
                            console.error(
                              "CREATE SSCP INTERVENTION Technology Training sync ERROR:",
                              syncErr
                            );
                            res.status(500).json({ message: syncErr.message });
                          });
                        }

                        syncSscpTechnologyRolloutToTable(
                          {
                            projectId,
                            interventionId,
                            type,
                            title,
                            techrollout,
                          },
                          (techRolloutSyncErr) => {
                            if (techRolloutSyncErr) {
                              return db.rollback(() => {
                                console.error(
                                  "CREATE SSCP INTERVENTION Tech Roll Out table sync ERROR:",
                                  techRolloutSyncErr
                                );
                                res
                                  .status(500)
                                  .json({ message: techRolloutSyncErr.message });
                              });
                            }

                            db.commit((commitErr) => {
                              if (commitErr) {
                                return db.rollback(() => {
                                  console.error(
                                    "CREATE SSCP INTERVENTION COMMIT ERROR:",
                                    commitErr
                                  );
                                  res.status(500).json({
                                    message: commitErr.message,
                                  });
                                });
                              }

                              res.json({
                                message: "SSCP intervention added",
                                id: interventionId,
                              });
                            });
                          }
                        );
                      }
                    );
                  }
                );
              }
            );
          }
        );
      }
    );
  });
});

// UPDATE sscp intervention
app.put("/sscp-interventions/:id", (req, res) => {
  const interventionId = Number(req.params.id);
  const b = req.body || {};
  const techPromo = mapCestTechPromoPayload(b, b.type || "");
  const techrollout = mapCestTechRolloutPayload(b);
  const packaging = mapCestPackagingPayloadForDb(b);

  const type = pickFirst(b.type, "");
  const title = pickFirst(b.title, b.activityTitle, b.activity_title, "");
  const date = pickFirst(
    b.date,
    b.activityDate,
    b.activity_date,
    b.startDate,
    b.start_date,
    null
  );
  const venue = pickFirst(
    b.venue,
    b.activityVenueAddress,
    b.activity_venue_address,
    b.venueAddress,
    b.venue_address,
    ""
  );
  const noOfFirms = pickFirst(b.noOfFirms, b.no_of_firms, null);
  const male = pickFirst(b.male, b.totalMale, b.total_male, null);
  const female = pickFirst(b.female, b.totalFemale, b.total_female, null);
  const total = pickFirst(b.total, b.totalParticipants, b.total_participants, null);
  const notes = pickFirst(b.notes, "");

  const technologiesPromotedTotal = pickFirst(
    b.technologiesPromotedTotal,
    b.technologies_promoted_total,
    0
  );
  const promotionalActivitiesPressRelease = pickFirst(
    b.promotionalActivitiesPressRelease,
    b.promotional_activities_press_release,
    0
  );
  const pwd = pickFirst(b.pwd, null);
  const fourPs = pickFirst(b.fourPs, b.four_ps, null);
  const ip = pickFirst(b.ip, null);
  const seniors = pickFirst(b.seniors, null);

  const tacsConsultancyType = pickFirst(
    b.tacsConsultancyType,
    b.tacs_consultancy_type,
    null
  );
  const tacsDateEngagement = pickFirst(
    b.tacsDateEngagement,
    b.tacs_date_engagement,
    null
  );
  const tacsExpertInstitution = pickFirst(
    b.tacsExpertInstitution,
    b.tacs_expert_institution,
    null
  );
  const tacsCustomerName = pickFirst(
    b.tacsCustomerName,
    b.tacs_customer_name,
    null
  );
  const tacsCustomerSex = pickFirst(
    b.tacsCustomerSex,
    b.tacs_customer_sex,
    null
  );
  const tacsCustomerAddress = pickFirst(
    b.tacsCustomerAddress,
    b.tacs_customer_address,
    null
  );
  const tacsCustomerAddressMeta = pickFirst(
    b.tacsCustomerAddressMeta,
    b.tacs_customer_address_meta,
    null
  );
  const tacsMeansVerification = pickFirst(
    b.tacsMeansVerification,
    b.tacs_means_verification,
    null
  );
  const tacsNoOfAdvice = pickFirst(
    b.tacsNoOfAdvice,
    b.tacs_no_of_advice,
    null
  );
  const tacsRemarks = pickFirst(b.tacsRemarks, b.tacs_remarks, null);
  const tacsPhotos = pickFirst(b.tacsPhotos, b.tacs_photos, null);

  const trainingProgram = pickFirst(b.programTraining, b.program_training, null);
  const trainingStartDate = pickFirst(b.startDate, b.start_date, b.date, null);
  const trainingEndDate = pickFirst(b.endDate, b.end_date, null);
  const trainingProvince = pickFirst(b.province, null);
  const trainingVenueAddressMeta = pickFirst(
    b.venueAddressMeta,
    b.venue_address_meta,
    null
  );
  const latitude = toNumOrNull(
    pickFirst(
      b.latitude,
      b.lat,
      trainingVenueAddressMeta?.lat,
      trainingVenueAddressMeta?.latitude,
      null
    )
  );
  const longitude = toNumOrNull(
    pickFirst(
      b.longitude,
      b.lng,
      trainingVenueAddressMeta?.lng,
      trainingVenueAddressMeta?.longitude,
      null
    )
  );
  const noOfFirmsSucsHeisLgus = pickFirst(
    b.noOfFirmsSucsHeisLgus,
    b.no_of_firms_sucs_heis_lgus,
    b.firmsSucsHeisLgusCount,
    b.firms_sucs_heis_lgus_count,
    0
  );
  const participantsFemale = pickFirst(b.participantsFemale, b.participants_female, 0);
  const participantsMale = pickFirst(b.participantsMale, b.participants_male, 0);
  const seniorFemale = pickFirst(b.seniorFemale, b.senior_female, 0);
  const seniorMale = pickFirst(b.seniorMale, b.senior_male, 0);
  const ipFemale = pickFirst(b.ipFemale, b.ip_female, 0);
  const ipMale = pickFirst(b.ipMale, b.ip_male, 0);
  const fourPsFemale = pickFirst(b.fourPsFemale, b.fourps_female, 0);
  const fourPsMale = pickFirst(b.fourPsMale, b.fourps_male, 0);
  const pwdFemale = pickFirst(b.pwdFemale, b.pwd_female, 0);
  const pwdMale = pickFirst(b.pwdMale, b.pwd_male, 0);
  const totalFemale = pickFirst(b.totalFemale, b.total_female, female, 0);
  const totalMale = pickFirst(b.totalMale, b.total_male, male, 0);
  const totalParticipants = pickFirst(b.totalParticipants, b.total_participants, total, 0);
  const listOfFirmsAssociations = pickFirst(
    b.listOfFirmsAssociations,
    b.list_of_firms_associations,
    null
  );
  const nameOfTrainorAffiliation = pickFirst(
    b.nameOfTrainorAffiliation,
    b.name_of_trainor_affiliation,
    null
  );
  const programProjectUnit = pickFirst(
    b.programProjectUnit,
    b.program_project_unit,
    null
  );
  const dostCost = pickFirst(b.dostCost, b.dost_cost, 0);
  const partnerAgencyCost = pickFirst(b.partnerAgencyCost, b.partner_agency_cost, 0);
  const totalCost = pickFirst(b.totalCost, b.total_cost, 0);
  const notesRemarks = pickFirst(b.notesRemarks, b.notes_remarks, null);

  const sql = `
    UPDATE sscp_interventions SET
      type=?,
      title=?,
      date=?,
      venue=?,
      no_of_firms=?,
      male=?,
      female=?,
      total=?,
      notes=?,
      project_name=?,
      technology_promoted=?,
      technology_generator=?,
      mode_of_promotion=?,
      customer_name=?,
      customer_address=?,
      sex=?,
      staff_name=?,
      means_of_verification=?,
      photos=?,
      technologies_promoted_total=?,
      promotional_activities_press_release=?,
      pwd=?,
      four_ps=?,
      ip=?,
      seniors=?,
      tacs_consultancy_type=?,
      tacs_date_engagement=?,
      tacs_expert_institution=?,
      tacs_customer_name=?,
      tacs_customer_sex=?,
      tacs_customer_address=?,
      tacs_customer_address_meta=?,
      tacs_means_verification=?,
      tacs_no_of_advice=?,
      tacs_remarks=?,
      tacs_photos=?,
      program_training=?,
      start_date=?,
      end_date=?,
      province=?,
      venue_address_meta=?,
      no_of_firms_sucs_heis_lgus=?,
      participants_female=?,
      participants_male=?,
      senior_female=?,
      senior_male=?,
      ip_female=?,
      ip_male=?,
      fourps_female=?,
      fourps_male=?,
      pwd_female=?,
      pwd_male=?,
      total_female=?,
      total_male=?,
      total_participants=?,
      list_of_firms_associations=?,
      name_of_trainor_affiliation=?,
      program_project_unit=?,
      dost_cost=?,
      partner_agency_cost=?,
      total_cost=?,
      notes_remarks=?,
      latitude=?,
      longitude=?,
      techrollout_quarter=?,
      techrollout_unit_center=?,
      techrollout_name_of_technology_transferred=?,
      techrollout_technology_generator=?,
      techrollout_mode_of_transfer=?,
      techrollout_is_dost_developed_funded=?,
      techrollout_date_transferred=?,
      techrollout_activity_title=?,
      techrollout_activity_date=?,
      techrollout_activity_venue=?,
      techrollout_institution_name=?,
      techrollout_institution_address=?,
      techrollout_institution_address_meta=?,
      techrollout_classification=?,
      techrollout_representative_name=?,
      techrollout_representative_designation=?,
      techrollout_sex=?,
      packaging_quarter=?,
      packaging_province=?,
      packaging_date_completed=?,
      packaging_type_of_intervention=?,
      packaging_product_name=?,
      packaging_size_variant=?,
      packaging_materials_provided=?,
      packaging_customer_name=?,
      packaging_sex=?,
      packaging_firm_institution=?,
      packaging_address=?,
      packaging_address_meta=?,
      packaging_means_of_verification=?,
      packaging_photos=?,
      packaging_remarks=?
    WHERE id=?
  `;

  db.beginTransaction((txErr) => {
    if (txErr) {
      console.error("UPDATE SSCP INTERVENTION TX ERROR:", txErr);
      return res.status(500).json({ message: txErr.message });
    }

    db.query(
      "SELECT project_id FROM sscp_interventions WHERE id = ? LIMIT 1",
      [interventionId],
      (findErr, rows) => {
        if (findErr) {
          return db.rollback(() => {
            console.error("UPDATE SSCP INTERVENTION find ERROR:", findErr);
            res.status(500).json({ message: findErr.message });
          });
        }

        if (!rows || !rows.length) {
          return db.rollback(() => {
            res.status(404).json({ message: "SSCP intervention not found" });
          });
        }

        const projectId = Number(rows[0].project_id);

        db.query(
          sql,
          [
            type,
            title,
            toNullIfEmpty(date),
            venue || "",
            toNumOrNull(noOfFirms),
            toNumOrNull(male),
            toNumOrNull(female),
            toNumOrNull(total),
            notes || "",
            techPromo.project_name || "SSCP",
            techPromo.technology_promoted,
            techPromo.technology_generator,
            techPromo.mode_of_promotion,
            techPromo.customer_name,
            techPromo.customer_address,
            techPromo.sex,
            techPromo.staff_name,
            techPromo.means_of_verification,
            techPromo.photos,
            toNumOrZero(technologiesPromotedTotal),
            toNumOrZero(promotionalActivitiesPressRelease),
            toNullIfEmpty(pwd),
            toNullIfEmpty(fourPs),
            toNullIfEmpty(ip),
            toNullIfEmpty(seniors),
            toNullIfEmpty(tacsConsultancyType),
            toNullIfEmpty(tacsDateEngagement),
            toNullIfEmpty(tacsExpertInstitution),
            toNullIfEmpty(tacsCustomerName),
            toNullIfEmpty(tacsCustomerSex),
            toNullIfEmpty(tacsCustomerAddress),
            mapTacsAddressMeta(tacsCustomerAddressMeta),
            toNullIfEmpty(tacsMeansVerification),
            toNumOrNull(tacsNoOfAdvice),
            toNullIfEmpty(tacsRemarks),
            mapTacsAddressMeta(Array.isArray(tacsPhotos) ? tacsPhotos : []),
            toNullIfEmpty(trainingProgram),
            toNullIfEmpty(trainingStartDate),
            toNullIfEmpty(trainingEndDate),
            toNullIfEmpty(trainingProvince),
            techPromo.venue_address_meta || mapTacsAddressMeta(trainingVenueAddressMeta),
            toNumOrZero(noOfFirmsSucsHeisLgus),
            toNumOrZero(participantsFemale),
            toNumOrZero(participantsMale),
            toNumOrZero(seniorFemale),
            toNumOrZero(seniorMale),
            toNumOrZero(ipFemale),
            toNumOrZero(ipMale),
            toNumOrZero(fourPsFemale),
            toNumOrZero(fourPsMale),
            toNumOrZero(pwdFemale),
            toNumOrZero(pwdMale),
            toNumOrZero(totalFemale),
            toNumOrZero(totalMale),
            toNumOrZero(totalParticipants),
            toNullIfEmpty(listOfFirmsAssociations),
            toNullIfEmpty(nameOfTrainorAffiliation),
            toNullIfEmpty(programProjectUnit),
            toNumOrZero(dostCost),
            toNumOrZero(partnerAgencyCost),
            toNumOrZero(totalCost),
            toNullIfEmpty(notesRemarks),
            latitude,
            longitude,
            techrollout.techrollout_quarter,
            techrollout.techrollout_unit_center,
            techrollout.techrollout_name_of_technology_transferred,
            techrollout.techrollout_technology_generator,
            techrollout.techrollout_mode_of_transfer,
            techrollout.techrollout_is_dost_developed_funded,
            techrollout.techrollout_date_transferred,
            techrollout.techrollout_activity_title,
            techrollout.techrollout_activity_date,
            techrollout.techrollout_activity_venue,
            techrollout.techrollout_institution_name,
            techrollout.techrollout_institution_address,
            techrollout.techrollout_institution_address_meta,
            techrollout.techrollout_classification,
            techrollout.techrollout_representative_name,
            techrollout.techrollout_representative_designation,
            techrollout.techrollout_sex,
            packaging.packaging_quarter,
            packaging.packaging_province,
            packaging.packaging_date_completed,
            packaging.packaging_type_of_intervention,
            packaging.packaging_product_name,
            packaging.packaging_size_variant,
            packaging.packaging_materials_provided,
            packaging.packaging_customer_name,
            packaging.packaging_sex,
            packaging.packaging_firm_institution,
            packaging.packaging_address,
            packaging.packaging_address_meta,
            packaging.packaging_means_of_verification,
            packaging.packaging_photos,
            packaging.packaging_remarks,
            interventionId,
          ],
          (err, result) => {
            if (err) {
              return db.rollback(() => {
                console.error("UPDATE SSCP INTERVENTION ERROR:", err);
                res.status(500).json({ message: err.message });
              });
            }

            if (!result.affectedRows) {
              return db.rollback(() => {
                res.status(404).json({ message: "SSCP intervention not found" });
              });
            }

            syncSscpTechnologyPromotionEntry(
              {
                projectId,
                interventionId,
                type,
                body: {
                  ...b,
                  title,
                  date: toNullIfEmpty(date),
                  venue: venue || "",
                },
              },
              (techPromoSyncErr) => {
                if (techPromoSyncErr) {
                  return db.rollback(() => {
                    console.error(
                      "UPDATE SSCP INTERVENTION Technology Promotion sync ERROR:",
                      techPromoSyncErr
                    );
                    res.status(500).json({ message: techPromoSyncErr.message });
                  });
                }

                syncTacsEntryForIntervention(
                  {
                    projectId,
                    interventionId,
                    type,
                    body: {
                      ...b,
                      title,
                      date: toNullIfEmpty(date),
                      venue: venue || "",
                      tacsPhotos: Array.isArray(tacsPhotos) ? tacsPhotos : [],
                    },
                    source_module: "SSCP",
                    source_table: "sscp_interventions",
                  },
                  (tacsSyncErr) => {
                    if (tacsSyncErr) {
                      return db.rollback(() => {
                        console.error(
                          "UPDATE SSCP INTERVENTION TACS sync ERROR:",
                          tacsSyncErr
                        );
                        res.status(500).json({ message: tacsSyncErr.message });
                      });
                    }

                    syncTechnologyTrainingEntryForIntervention(
                      {
                        projectId,
                        interventionId,
                        type,
                        body: {
                          ...b,
                          venue: venue || "",
                          latitude,
                          longitude,
                          male: toNumOrZero(totalMale),
                          female: toNumOrZero(totalFemale),
                          total: toNumOrZero(totalParticipants),
                        },
                        source_module: "sscp",
                        source_label: "SSCP",
                      },
                      (syncErr) => {
                        if (syncErr) {
                          return db.rollback(() => {
                            console.error(
                              "UPDATE SSCP INTERVENTION Technology Training sync ERROR:",
                              syncErr
                            );
                            res.status(500).json({ message: syncErr.message });
                          });
                        }

                        syncSscpTechnologyRolloutToTable(
                          {
                            projectId,
                            interventionId,
                            type,
                            title,
                            techrollout,
                          },
                          (techRolloutSyncErr) => {
                            if (techRolloutSyncErr) {
                              return db.rollback(() => {
                                console.error(
                                  "UPDATE SSCP INTERVENTION Tech Roll Out table sync ERROR:",
                                  techRolloutSyncErr
                                );
                                res.status(500).json({ message: techRolloutSyncErr.message });
                              });
                            }

                            db.commit((commitErr) => {
                              if (commitErr) {
                                return db.rollback(() => {
                                  console.error(
                                    "UPDATE SSCP INTERVENTION COMMIT ERROR:",
                                    commitErr
                                  );
                                  res.status(500).json({ message: commitErr.message });
                                });
                              }

                              res.json({ message: "SSCP intervention updated" });
                            });
                          }
                        );
                      }
                    );
                  }
                );
              }
            );
          }
        );
      }
    );
  });
});

// DELETE sscp intervention
app.delete("/sscp-interventions/:id", (req, res) => {
  const interventionId = Number(req.params.id);

  db.beginTransaction((txErr) => {
    if (txErr) {
      console.error("DELETE SSCP INTERVENTION TX ERROR:", txErr);
      return res.status(500).json({ message: txErr.message });
    }

    deletePackagingRecordByInterventionId(
      interventionId,
      (deletePackagingErr) => {
        if (deletePackagingErr) {
          return db.rollback(() => {
            console.error(
              "DELETE SSCP INTERVENTION Packaging & Labeling delete ERROR:",
              deletePackagingErr
            );
            res.status(500).json({ message: deletePackagingErr.message });
          });
        }

        db.query(
          "DELETE FROM technology_training_entries WHERE intervention_id = ?",
          [interventionId],
          (deleteTrainingErr) => {
            if (deleteTrainingErr) {
              return db.rollback(() => {
                console.error(
                  "DELETE SSCP INTERVENTION Technology Training delete ERROR:",
                  deleteTrainingErr
                );
                res.status(500).json({ message: deleteTrainingErr.message });
              });
            }

            deleteTacsEntryByInterventionId(
              interventionId,
              (deleteTacsErr) => {
                if (deleteTacsErr) {
                  return db.rollback(() => {
                    console.error(
                      "DELETE SSCP INTERVENTION TACS delete ERROR:",
                      deleteTacsErr
                    );
                    res.status(500).json({
                      message: deleteTacsErr.message,
                    });
                  });
                }

                syncSscpTechnologyPromotionEntry(
                  {
                    projectId: null,
                    interventionId,
                    type: "",
                    body: {},
                  },
                  (deleteTechPromoErr) => {
                    if (deleteTechPromoErr) {
                      return db.rollback(() => {
                        console.error(
                          "DELETE SSCP INTERVENTION Technology Promotion delete ERROR:",
                          deleteTechPromoErr
                        );
                        res.status(500).json({
                          message: deleteTechPromoErr.message,
                        });
                      });
                    }

                    db.query(
                      "DELETE FROM technology_rollout WHERE intervention_id = ? AND source_module = ?",
                      [interventionId, "sscp_interventions"],
                      (deleteTechRolloutErr) => {
                        if (deleteTechRolloutErr) {
                          return db.rollback(() => {
                            console.error(
                              "DELETE SSCP INTERVENTION Tech Roll Out table delete ERROR:",
                              deleteTechRolloutErr
                            );
                            res.status(500).json({
                              message: deleteTechRolloutErr.message,
                            });
                          });
                        }

                        db.query(
                          "DELETE FROM sscp_interventions WHERE id=?",
                          [interventionId],
                          (err, result) => {
                            if (err) {
                              return db.rollback(() => {
                                console.error(
                                  "DELETE SSCP INTERVENTION ERROR:",
                                  err
                                );
                                res.status(500).json({ message: err.message });
                              });
                            }

                            if (!result.affectedRows) {
                              return db.rollback(() => {
                                res.status(404).json({
                                  message: "SSCP intervention not found",
                                });
                              });
                            }

                            db.commit((commitErr) => {
                              if (commitErr) {
                                return db.rollback(() => {
                                  console.error(
                                    "DELETE SSCP INTERVENTION COMMIT ERROR:",
                                    commitErr
                                  );
                                  res.status(500).json({
                                    message: commitErr.message,
                                  });
                                });
                              }

                              res.json({
                                message: "SSCP intervention deleted",
                              });
                            });
                          }
                        );
                      }
                    );
                  }
                );
              },
              {
                source_module: "SSCP",
                source_table: "sscp_interventions",
              }
            );
          }
        );
      }
    );
  });
});

// SSCP OTHER INDICATORS
app.get("/sscp/:id/other-indicators", (req, res) => {
  const projectId = req.params.id;

  db.query(
    "SELECT * FROM sscp_other_indicators WHERE project_id=? LIMIT 1",
    [projectId],
    (err, rows) => {
      if (err) return res.status(500).json(err);
      res.json(rows[0] || null);
    }
  );
});

app.put("/sscp/:id/other-indicators", (req, res) => {
  const projectId = req.params.id;
  const b = req.body || {};

  const jobs = b.jobsGenerated || {};
  const inc = b.jobsIncreasePct || {};
  const prod = b.productivityPct || {};
  const gross = b.grossSales || {};

  const sql = `
    INSERT INTO sscp_other_indicators
      (project_id,
       jobs_q1,jobs_q2,jobs_q3,jobs_q4,
       jobs_inc_q1,jobs_inc_q2,jobs_inc_q3,jobs_inc_q4,
       prod_q1,prod_q2,prod_q3,prod_q4,
       gross_q1,gross_q2,gross_q3,gross_q4)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON DUPLICATE KEY UPDATE
      jobs_q1=VALUES(jobs_q1), jobs_q2=VALUES(jobs_q2), jobs_q3=VALUES(jobs_q3), jobs_q4=VALUES(jobs_q4),
      jobs_inc_q1=VALUES(jobs_inc_q1), jobs_inc_q2=VALUES(jobs_inc_q2), jobs_inc_q3=VALUES(jobs_inc_q3), jobs_inc_q4=VALUES(jobs_inc_q4),
      prod_q1=VALUES(prod_q1), prod_q2=VALUES(prod_q2), prod_q3=VALUES(prod_q3), prod_q4=VALUES(prod_q4),
      gross_q1=VALUES(gross_q1), gross_q2=VALUES(gross_q2), gross_q3=VALUES(gross_q3), gross_q4=VALUES(gross_q4)
  `;

  const vals = [
    projectId,
    Number(jobs.q1 || 0),
    Number(jobs.q2 || 0),
    Number(jobs.q3 || 0),
    Number(jobs.q4 || 0),

    Number(inc.q1 || 0),
    Number(inc.q2 || 0),
    Number(inc.q3 || 0),
    Number(inc.q4 || 0),

    Number(prod.q1 || 0),
    Number(prod.q2 || 0),
    Number(prod.q3 || 0),
    Number(prod.q4 || 0),

    Number(gross.q1 || 0),
    Number(gross.q2 || 0),
    Number(gross.q3 || 0),
    Number(gross.q4 || 0),
  ];

  db.query(sql, vals, (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "SSCP other indicators saved" });
  });
});

app.delete("/sscp/:id/other-indicators", (req, res) => {
  const projectId = req.params.id;

  db.query(
    "DELETE FROM sscp_other_indicators WHERE project_id=?",
    [projectId],
    (err) => {
      if (err) return res.status(500).json(err);
      res.json({ message: "SSCP other indicators deleted" });
    }
  );
});


// ============================================================
// CALIBRATION HELPERS + ROUTES
// Idikit ito sa server.js mo bago ang app.listen(...)
// Required tables:
// - calibration
// - calibration_targets
// ============================================================

// ===========================
// CALIBRATION HELPERS
// ===========================
const stringifyCalibrationJson = (value) => {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
};

const parseCalibrationJson = (value, fallback = null) => {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const normalizeCalibrationCategory = (value) => {
  const raw = String(value || "PAYING").trim().toUpperCase();
  if (raw === "NON-PAYING" || raw === "NON_PAYING" || raw === "NONPAYING") {
    return "NON-PAYING";
  }
  return "PAYING";
};

const makeCalibrationId = () =>
  `calibration_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const normalizeCalibrationMcBreakdown = (rows = []) => {
  if (!Array.isArray(rows)) return [];

  return rows
    .map((row = {}) => ({
      id: String(row.id || `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`),
      range: String(row.range || "").trim(),
      noOfSample: toNumOrZero(row.noOfSample ?? row.no_of_sample),
      cost: Number(toNumOrZero(row.cost).toFixed(2)),
      feesCollected: Number(
        toNumOrZero(row.feesCollected ?? row.fees_collected).toFixed(2)
      ),
      autoFilled: Boolean(row.autoFilled),
    }))
    .filter(
      (row) =>
        row.range ||
        row.noOfSample > 0 ||
        row.cost > 0 ||
        row.feesCollected > 0
    );
};

const mapCalibrationPayload = (body = {}) => {
  const category = normalizeCalibrationCategory(body.category);
  const female = toNumOrZero(body.female);
  const male = toNumOrZero(body.male);
  const totalCustomersInput = pickFirst(
    body.totalCustomers,
    body.total_customers,
    null
  );
  const totalCustomers =
    totalCustomersInput === null ||
      totalCustomersInput === undefined ||
      totalCustomersInput === ""
      ? female + male
      : toNumOrZero(totalCustomersInput);

  const rawMcBreakdown = pickFirst(body.mcBreakdown, body.mc_breakdown, []);
  const mcBreakdown = normalizeCalibrationMcBreakdown(rawMcBreakdown);
  const addressMeta = pickFirst(body.addressMeta, body.address_meta, null);

  return {
    id: String(
      pickFirst(body.id, body.calibrationId, body.calibration_id, makeCalibrationId())
    ).trim(),
    category,
    date: toNullIfEmpty(body.date),
    typeOfSample: String(
      pickFirst(body.typeOfSample, body.type_of_sample, "")
    ).trim(),
    testType: toNullIfEmpty(
      String(pickFirst(body.testType, body.test_type, "")).trim()
    ),
    noOfSample: toNumOrZero(pickFirst(body.noOfSample, body.no_of_sample, 0)),
    range: toNullIfEmpty(String(pickFirst(body.range, "")).trim()),
    cost: Number(toNumOrZero(body.cost).toFixed(2)),
    feesCollected: Number(
      toNumOrZero(pickFirst(body.feesCollected, body.fees_collected, 0)).toFixed(2)
    ),
    mcBreakdown,
    barangay: toNullIfEmpty(String(pickFirst(body.barangay, "")).trim()),
    address: toNullIfEmpty(String(pickFirst(body.address, "")).trim()),
    addressMeta,
    female,
    male,
    totalCustomers,
    noOfFirms: toNumOrZero(pickFirst(body.noOfFirms, body.no_of_firms, 0)),
    noOfNewFirms: toNumOrZero(
      pickFirst(body.noOfNewFirms, body.no_of_new_firms, 0)
    ),
    ageRange: toNullIfEmpty(
      String(pickFirst(body.ageRange, body.age_range, "")).trim()
    ),
    pwd: toNumOrZero(body.pwd),
    ip: toNumOrZero(body.ip),
    sc: toNumOrZero(body.sc),
    fourPs: toNumOrZero(pickFirst(body.fourPs, body.four_ps, 0)),
    nameOfStaff: toNullIfEmpty(String(pickFirst(body.nameOfStaff, body.name_of_staff, body.staffName, body.staff_name, "")).trim()),
    remarks: toNullIfEmpty(String(pickFirst(body.remarks, "")).trim()),
    custom_fields: pickFirst(body.custom_fields, body.customFields, {}),
  };
};

const validateCalibrationPayload = (payload = {}) => {
  if (!payload.date) return "Date is required.";
  if (!payload.typeOfSample) return "Type of sample is required.";
  if (!payload.address) return "Address is required.";
  if (payload.noOfSample <= 0) return "No. of Sample must be greater than zero.";

  if (payload.typeOfSample === "Weighing Scale") {
    if (!payload.mcBreakdown.length) {
      return "MC breakdown is required for Weighing Scale.";
    }

    const totalBreakdownSamples = payload.mcBreakdown.reduce(
      (sum, row) => sum + toNumOrZero(row.noOfSample),
      0
    );

    if (totalBreakdownSamples !== payload.noOfSample) {
      return "MC breakdown total samples must match main No. of Sample.";
    }
  }

  return null;
};

const normalizeCalibrationRow = (row = {}) => ({
  id: String(row.id),
  category: normalizeCalibrationCategory(row.category),
  date: row.date ? formatDateOnly(row.date) : "",
  typeOfSample: row.typeOfSample || "",
  testType: row.testType || "",
  noOfSample: Number(row.noOfSample || 0),
  range: row.range || "",
  cost: Number(row.cost || 0),
  feesCollected: Number(row.feesCollected || 0),
  mcBreakdown: normalizeCalibrationMcBreakdown(
    parseCalibrationJson(row.mcBreakdown, [])
  ),
  barangay: row.barangay || "",
  address: row.address || "",
  addressMeta: parseCalibrationJson(row.addressMeta, null),
  female: Number(row.female || 0),
  male: Number(row.male || 0),
  totalCustomers: Number(row.totalCustomers || 0),
  noOfFirms: Number(row.noOfFirms || 0),
  noOfNewFirms: Number(row.noOfNewFirms || 0),
  ageRange: row.ageRange || "",
  pwd: Number(row.pwd || 0),
  ip: Number(row.ip || 0),
  sc: Number(row.sc || 0),
  fourPs: Number(row.fourPs || 0),
  nameOfStaff: row.nameOfStaff || "",
  name_of_staff: row.nameOfStaff || "",
  staffName: row.nameOfStaff || "",
  remarks: row.remarks || "",
  custom_fields: parseCalibrationJson(row.custom_fields, {}) || {},
  customFields: parseCalibrationJson(row.custom_fields, {}) || {},
  quarter: quarterFromDate(row.date),
  created_at: row.created_at || null,
  updated_at: row.updated_at || null,
});

const buildCalibrationInsertValues = (payload = {}) => [
  payload.id,
  payload.category,
  payload.date,
  payload.typeOfSample,
  payload.testType,
  payload.noOfSample,
  payload.range,
  payload.cost,
  payload.feesCollected,
  stringifyCalibrationJson(payload.mcBreakdown),
  payload.barangay,
  payload.address,
  stringifyCalibrationJson(payload.addressMeta),
  payload.female,
  payload.male,
  payload.totalCustomers,
  payload.noOfFirms,
  payload.noOfNewFirms,
  payload.ageRange,
  payload.pwd,
  payload.ip,
  payload.sc,
  payload.fourPs,
  payload.nameOfStaff,
  payload.remarks,
  stringifyCalibrationJson(payload.custom_fields || {}),
];

const emptyCalibrationTargets = () => ({
  totalCalibratedMC: { annual: 0, q1: 0, q2: 0, q3: 0, q4: 0 },
  totalCalibratedVC: { annual: 0, q1: 0, q2: 0, q3: 0, q4: 0 },
  totalIncomeGenerated: { annual: 0, q1: 0, q2: 0, q3: 0, q4: 0 },
  totalAmountAssistance: { annual: 0, q1: 0, q2: 0, q3: 0, q4: 0 },
  totalCustomersAll: { annual: 0, q1: 0, q2: 0, q3: 0, q4: 0 },
});


const sendCalibrationDbError = (res, label, err, extra = {}) => {
  console.error(label, err);
  if (extra && Object.keys(extra).length) {
    console.error(`${label} CONTEXT:`, extra);
  }

  return res.status(500).json({
    message: err?.sqlMessage || err?.message || "Calibration database error.",
    code: err?.code || null,
    errno: err?.errno || null,
    sqlState: err?.sqlState || null,
    sqlMessage: err?.sqlMessage || null,
    ...extra,
  });
};

// ===========================
// CALIBRATION BACKEND PAGINATION HELPERS
// ===========================
const CALIBRATION_PANGASINAN_DISTRICTS = {
  "District 1": [
    "Agno",
    "Alaminos City",
    "Anda",
    "Bani",
    "Bolinao",
    "Burgos",
    "Dasol",
    "Infanta",
    "Mabini",
    "Sual",
  ],
  "District 2": [
    "Aguilar",
    "Basista",
    "Binmaley",
    "Bugallon",
    "Labrador",
    "Lingayen",
    "Mangatarem",
    "Urbiztondo",
  ],
  "District 3": [
    "Bayambang",
    "Calasiao",
    "Malasiqui",
    "Mapandan",
    "San Carlos City",
    "Santa Barbara",
  ],
  "District 4": [
    "Dagupan City",
    "Manaoag",
    "Mangaldan",
    "San Fabian",
    "San Jacinto",
  ],
  "District 5": [
    "Alcala",
    "Bautista",
    "Binalonan",
    "Laoac",
    "Pozorrubio",
    "Santo Tomas",
    "Sison",
    "Urdaneta City",
    "Villasis",
  ],
  "District 6": [
    "Asingan",
    "Balungao",
    "Natividad",
    "Rosales",
    "San Manuel",
    "San Nicolas",
    "San Quintin",
    "Santa Maria",
    "Tayug",
    "Umingan",
  ],
};

const normalizeCalibrationDistrictKey = (value = "") => {
  const raw = String(value || "").trim();
  if (!raw || raw.toUpperCase() === "ALL") return "ALL";

  const collapsed = raw.replace(/\s+/g, "").toLowerCase();
  const match = collapsed.match(/^district(\d+)$/);

  if (match) return `District ${match[1]}`;
  return raw.replace(/\s+/g, " ");
};

const buildCalibrationWhere = (query = {}) => {
  const where = [];
  const params = [];

  const search = String(query.search || "").trim();
  const year = String(query.year || "ALL").trim();
  const month = String(query.month || "ALL").trim();
  const categoryRaw = String(query.category || "ALL").trim();
  const municipality = String(query.municipality || "ALL").trim();
  const district = normalizeCalibrationDistrictKey(query.district || "ALL");

  const addressMunicipalityExpr =
    "COALESCE(JSON_UNQUOTE(JSON_EXTRACT(addressMeta, '$.municipality')), '')";
  const addressBarangayExpr =
    "COALESCE(JSON_UNQUOTE(JSON_EXTRACT(addressMeta, '$.barangay')), '')";

  if (search) {
    const like = `%${search}%`;
    where.push(`(
      id LIKE ?
      OR category LIKE ?
      OR date LIKE ?
      OR typeOfSample LIKE ?
      OR testType LIKE ?
      OR \`range\` LIKE ?
      OR barangay LIKE ?
      OR address LIKE ?
      OR ${addressMunicipalityExpr} LIKE ?
      OR ${addressBarangayExpr} LIKE ?
      OR ageRange LIKE ?
      OR remarks LIKE ?
    )`);
    params.push(
      like,
      like,
      like,
      like,
      like,
      like,
      like,
      like,
      like,
      like,
      like,
      like
    );
  }

  if (year && year !== "ALL" && year.toLowerCase() !== "all") {
    where.push("YEAR(COALESCE(date, created_at)) = ?");
    params.push(Number(year));
  }

  if (month && month !== "ALL" && month.toLowerCase() !== "all") {
    where.push("MONTH(COALESCE(date, created_at)) = ?");
    params.push(Number(month));
  }

  if (categoryRaw && categoryRaw !== "ALL" && categoryRaw.toLowerCase() !== "all") {
    where.push("category = ?");
    params.push(normalizeCalibrationCategory(categoryRaw));
  }

  if (municipality && municipality !== "ALL" && municipality.toLowerCase() !== "all") {
    where.push(`(
      ${addressMunicipalityExpr} = ?
      OR address LIKE ?
      OR barangay LIKE ?
    )`);
    params.push(municipality, `%${municipality}%`, `%${municipality}%`);
  }

  if (district && district !== "ALL") {
    const municipalitiesForDistrict = CALIBRATION_PANGASINAN_DISTRICTS[district] || [];

    if (!municipalitiesForDistrict.length) {
      where.push("1 = 0");
    } else {
      const jsonPlaceholders = municipalitiesForDistrict.map(() => "?").join(",");
      const addressLikes = municipalitiesForDistrict
        .map(() => "address LIKE ?")
        .join(" OR ");
      const barangayLikes = municipalitiesForDistrict
        .map(() => "barangay LIKE ?")
        .join(" OR ");

      where.push(`(
        ${addressMunicipalityExpr} IN (${jsonPlaceholders})
        OR (${addressLikes})
        OR (${barangayLikes})
      )`);

      params.push(
        ...municipalitiesForDistrict,
        ...municipalitiesForDistrict.map((m) => `%${m}%`),
        ...municipalitiesForDistrict.map((m) => `%${m}%`)
      );
    }
  }

  return {
    whereSql: where.length ? `WHERE ${where.join(" AND ")}` : "",
    params,
  };
};

const CALIBRATION_SELECT_COLUMNS = `
  id,
  category,
  date,
  typeOfSample,
  testType,
  noOfSample,
  \`range\`,
  cost,
  feesCollected,
  mcBreakdown,
  barangay,
  address,
  addressMeta,
  female,
  male,
  totalCustomers,
  noOfFirms,
  noOfNewFirms,
  ageRange,
  pwd,
  ip,
  sc,
  fourPs,
  remarks,
  created_at,
  updated_at
`;

// ===========================
// CALIBRATION SUMMARY ROUTE
// ===========================
app.get("/calibration/summary/:year", (req, res) => {
  const year = Number(req.params.year || new Date().getFullYear());

  db.query(
    `
      SELECT
        QUARTER(date) AS quarter_no,
        SUM(CASE WHEN typeOfSample = 'Weighing Scale' THEN COALESCE(noOfSample, 0) ELSE 0 END) AS totalCalibratedMC,
        SUM(CASE WHEN typeOfSample = 'Bucket' THEN COALESCE(noOfSample, 0) ELSE 0 END) AS totalCalibratedVC,
        SUM(CASE WHEN category = 'PAYING' THEN COALESCE(feesCollected, 0) ELSE 0 END) AS totalIncomeGenerated,
        SUM(CASE WHEN category = 'NON-PAYING' THEN COALESCE(cost, 0) ELSE 0 END) AS totalAmountAssistance,
        SUM(COALESCE(totalCustomers, 0)) AS totalCustomersAll
      FROM calibration
      WHERE YEAR(date) = ?
      GROUP BY QUARTER(date)
      ORDER BY quarter_no ASC
    `,
    [year],
    (err, rows) => {
      if (err) {
        console.error("GET /calibration/summary/:year ERROR:", err);
        return res.status(500).json({ message: err.message });
      }

      const q = {
        1: {
          totalCalibratedMC: 0,
          totalCalibratedVC: 0,
          totalIncomeGenerated: 0,
          totalAmountAssistance: 0,
          totalCustomersAll: 0,
        },
        2: {
          totalCalibratedMC: 0,
          totalCalibratedVC: 0,
          totalIncomeGenerated: 0,
          totalAmountAssistance: 0,
          totalCustomersAll: 0,
        },
        3: {
          totalCalibratedMC: 0,
          totalCalibratedVC: 0,
          totalIncomeGenerated: 0,
          totalAmountAssistance: 0,
          totalCustomersAll: 0,
        },
        4: {
          totalCalibratedMC: 0,
          totalCalibratedVC: 0,
          totalIncomeGenerated: 0,
          totalAmountAssistance: 0,
          totalCustomersAll: 0,
        },
      };

      (rows || []).forEach((row) => {
        const quarter = Number(row.quarter_no);
        if (!q[quarter]) return;
        q[quarter] = {
          totalCalibratedMC: Number(row.totalCalibratedMC || 0),
          totalCalibratedVC: Number(row.totalCalibratedVC || 0),
          totalIncomeGenerated: Number(row.totalIncomeGenerated || 0),
          totalAmountAssistance: Number(row.totalAmountAssistance || 0),
          totalCustomersAll: Number(row.totalCustomersAll || 0),
        };
      });

      const buildQuarterPayload = (key) => ({
        q1: q[1][key],
        q2: q[2][key],
        q3: q[3][key],
        q4: q[4][key],
        total: q[1][key] + q[2][key] + q[3][key] + q[4][key],
      });

      res.json({
        year,
        totalCalibratedMC: buildQuarterPayload("totalCalibratedMC"),
        totalCalibratedVC: buildQuarterPayload("totalCalibratedVC"),
        totalIncomeGenerated: buildQuarterPayload("totalIncomeGenerated"),
        totalAmountAssistance: buildQuarterPayload("totalAmountAssistance"),
        totalCustomersAll: buildQuarterPayload("totalCustomersAll"),
      });
    }
  );
});

// ===========================
// CALIBRATION TARGET ROUTES
// Backward-compatible bridge to target_settings (module_name = 'calibration')
// ===========================
const CALIBRATION_TARGET_DEFINITIONS = [
  {
    key: "totalCalibratedMC",
    label: "Total Calibrated (MC) No. of Samples",
  },
  {
    key: "totalCalibratedVC",
    label: "Total Calibrated (VC) No. of Samples",
  },
  {
    key: "totalIncomeGenerated",
    label: "Total Income Generated (Paying)",
  },
  {
    key: "totalAmountAssistance",
    label: "Total Amount of Assistance (Non-Paying)",
  },
  {
    key: "totalCustomersAll",
    label: "Total Customers",
  },
];

const CALIBRATION_TARGET_KEY_SET = new Set(
  CALIBRATION_TARGET_DEFINITIONS.map((item) => item.key)
);

const buildCalibrationTargetsFromTargetSettingsRows = (rows = []) => {
  const targets = emptyCalibrationTargets();

  (rows || []).forEach((row) => {
    const key = String(row.kpi_key || row.kpiKey || "").trim();
    if (!CALIBRATION_TARGET_KEY_SET.has(key) || !targets[key]) return;

    targets[key] = {
      annual: Number(row.annual_target ?? row.annualTarget ?? 0),
      q1: Number(row.q1_target ?? row.t1 ?? 0),
      q2: Number(row.q2_target ?? row.t2 ?? 0),
      q3: Number(row.q3_target ?? row.t3 ?? 0),
      q4: Number(row.q4_target ?? row.t4 ?? 0),
    };
  });

  return targets;
};

app.get("/calibration/targets/:year", (req, res) => {
  const year = Number(req.params.year || new Date().getFullYear());

  db.query(
    `
      SELECT
        id,
        module_name,
        kpi_key,
        kpi_label,
        annual_target,
        q1_target,
        q2_target,
        q3_target,
        q4_target,
        sort_index
      FROM target_settings
      WHERE module_name = 'calibration'
      ORDER BY sort_index ASC, id ASC, kpi_label ASC
    `,
    (err, rows) => {
      if (err) {
        console.error("GET /calibration/targets/:year ERROR:", err);
        return res.status(500).json({ message: err.message });
      }

      res.json({
        year,
        targets: buildCalibrationTargetsFromTargetSettingsRows(rows),
      });
    }
  );
});

app.put("/calibration/targets/:year", (req, res) => {
  const year = Number(req.params.year || new Date().getFullYear());
  const rawTargets = req.body?.targets || {};

  const normalizedRows = CALIBRATION_TARGET_DEFINITIONS.map((item, index) => {
    const source = rawTargets?.[item.key] || {};

    return {
      sort_index: index,
      module_name: "calibration",
      kpi_key: item.key,
      kpi_label: item.label,
      annual_target: Number(toNumOrZero(source.annual)),
      q1_target: Number(toNumOrZero(source.q1)),
      q2_target: Number(toNumOrZero(source.q2)),
      q3_target: Number(toNumOrZero(source.q3)),
      q4_target: Number(toNumOrZero(source.q4)),
    };
  });

  db.beginTransaction((txErr) => {
    if (txErr) {
      console.error("PUT /calibration/targets/:year transaction ERROR:", txErr);
      return res.status(500).json({ message: txErr.message });
    }

    db.query(
      "DELETE FROM target_settings WHERE module_name = ?",
      ["calibration"],
      (deleteErr) => {
        if (deleteErr) {
          return db.rollback(() => {
            console.error("DELETE target_settings calibration ERROR:", deleteErr);
            res.status(500).json({ message: deleteErr.message });
          });
        }

        const insertSql = `
          INSERT INTO target_settings (
            module_name,
            kpi_key,
            kpi_label,
            annual_target,
            q1_target,
            q2_target,
            q3_target,
            q4_target,
            sort_index
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        let index = 0;

        const insertNext = () => {
          if (index >= normalizedRows.length) {
            return db.commit((commitErr) => {
              if (commitErr) {
                return db.rollback(() => {
                  console.error("COMMIT target_settings calibration ERROR:", commitErr);
                  res.status(500).json({ message: commitErr.message });
                });
              }

              res.json({
                success: true,
                year,
                savedCount: normalizedRows.length,
                message: "Calibration targets saved successfully",
              });
            });
          }

          const row = normalizedRows[index++];

          db.query(
            insertSql,
            [
              row.module_name,
              row.kpi_key,
              row.kpi_label,
              row.annual_target,
              row.q1_target,
              row.q2_target,
              row.q3_target,
              row.q4_target,
              row.sort_index,
            ],
            (insertErr) => {
              if (insertErr) {
                return db.rollback(() => {
                  console.error("INSERT target_settings calibration ERROR:", insertErr, row);
                  res.status(500).json({ message: insertErr.message, failedRow: row });
                });
              }

              insertNext();
            }
          );
        };

        insertNext();
      }
    );
  });
});

// ===========================
// CALIBRATION ENTRY ROUTES
// ===========================
app.get("/calibration", (req, res) => {
  const hasServerPaging =
    req.query.page !== undefined ||
    req.query.limit !== undefined ||
    req.query.search !== undefined ||
    req.query.year !== undefined ||
    req.query.month !== undefined ||
    req.query.category !== undefined ||
    req.query.municipality !== undefined ||
    req.query.district !== undefined;

  const { whereSql, params } = buildCalibrationWhere(req.query);

  // Backward compatible: kapag plain /calibration lang, array pa rin ang return.
  if (!hasServerPaging) {
    const sql = `
      SELECT
        ${CALIBRATION_SELECT_COLUMNS}
      FROM calibration
      ${whereSql}
      ORDER BY COALESCE(date, created_at) DESC, updated_at DESC, created_at DESC, id DESC
    `;

    db.query(sql, params, (err, rows) => {
      if (err) {
        return sendCalibrationDbError(
          res,
          "GET /calibration ERROR:",
          err,
          {
            route: "GET /calibration",
            filters: req.query,
          }
        );
      }

      return res.json((rows || []).map(normalizeCalibrationRow));
    });

    return;
  }

  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.max(1, Math.min(100, Number(req.query.limit || 10)));
  const offset = (page - 1) * limit;

  const countSql = `
    SELECT COUNT(*) AS total
    FROM calibration
    ${whereSql}
  `;

  db.query(countSql, params, (countErr, countRows) => {
    if (countErr) {
      return sendCalibrationDbError(
        res,
        "GET /calibration count ERROR:",
        countErr,
        {
          route: "GET /calibration",
          filters: req.query,
        }
      );
    }

    const total = Number(countRows?.[0]?.total || 0);
    const totalPages = Math.max(1, Math.ceil(total / limit));

    const dataSql = `
      SELECT
        ${CALIBRATION_SELECT_COLUMNS}
      FROM calibration
      ${whereSql}
      ORDER BY COALESCE(date, created_at) DESC, updated_at DESC, created_at DESC, id DESC
      LIMIT ? OFFSET ?
    `;

    db.query(dataSql, [...params, limit, offset], (err, rows) => {
      if (err) {
        return sendCalibrationDbError(
          res,
          "GET /calibration data ERROR:",
          err,
          {
            route: "GET /calibration",
            filters: req.query,
          }
        );
      }

      const data = (rows || []).map(normalizeCalibrationRow);

      return res.json({
        data,
        rows: data,
        total,
        totalPages,
        page,
        limit,
      });
    });
  });
});

app.get("/calibration/:id", (req, res) => {
  db.query(
    `
      SELECT
        id,
        category,
        date,
        typeOfSample,
        testType,
        noOfSample,
        \`range\`,
        cost,
        feesCollected,
        mcBreakdown,
        barangay,
        address,
        addressMeta,
        female,
        male,
        totalCustomers,
        noOfFirms,
        noOfNewFirms,
        ageRange,
        pwd,
        ip,
        sc,
        fourPs,
        nameOfStaff,
        remarks,
        custom_fields,
        created_at,
        updated_at
      FROM calibration
      WHERE id = ?
      LIMIT 1
    `,
    [req.params.id],
    (err, rows) => {
      if (err) {
        return sendCalibrationDbError(
          res,
          "GET /calibration/:id ERROR:",
          err,
          {
            route: "GET /calibration/:id",
            calibrationId: req.params.id,
          }
        );
      }

      if (!rows || !rows.length) {
        return res.status(404).json({ message: "Calibration entry not found." });
      }

      res.json(normalizeCalibrationRow(rows[0]));
    }
  );
});

app.post("/calibration", (req, res) => {
  const payload = mapCalibrationPayload(req.body || {});
  const validationError = validateCalibrationPayload(payload);

  if (validationError) {
    return res.status(400).json({ message: validationError });
  }

  const sql = `
    INSERT INTO calibration (
      id,
      category,
      date,
      typeOfSample,
      testType,
      noOfSample,
      \`range\`,
      cost,
      feesCollected,
      mcBreakdown,
      barangay,
      address,
      addressMeta,
      female,
      male,
      totalCustomers,
      noOfFirms,
      noOfNewFirms,
      ageRange,
      pwd,
      ip,
      sc,
      fourPs,
      nameOfStaff,
      remarks,
      custom_fields
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const insertPayload = (candidatePayload, hasRetriedDuplicate = false) => {
    db.query(sql, buildCalibrationInsertValues(candidatePayload), (err) => {
      if (err && err.code === "ER_DUP_ENTRY" && !hasRetriedDuplicate) {
        const retryPayload = {
          ...candidatePayload,
          id: makeCalibrationId(),
        };
        return insertPayload(retryPayload, true);
      }

      if (err) {
        return sendCalibrationDbError(
          res,
          "POST /calibration ERROR:",
          err,
          {
            route: "POST /calibration",
            payload: candidatePayload,
          }
        );
      }

      res.json({
        success: true,
        id: candidatePayload.id,
        message: "Calibration entry created",
      });
    });
  };

  insertPayload(payload);
});

app.put("/calibration/:id", (req, res) => {
  const payload = mapCalibrationPayload({ ...(req.body || {}), id: req.params.id });
  const validationError = validateCalibrationPayload(payload);

  if (validationError) {
    return res.status(400).json({ message: validationError });
  }

  const sql = `
    UPDATE calibration
    SET
      category = ?,
      date = ?,
      typeOfSample = ?,
      testType = ?,
      noOfSample = ?,
      \`range\` = ?,
      cost = ?,
      feesCollected = ?,
      mcBreakdown = ?,
      barangay = ?,
      address = ?,
      addressMeta = ?,
      female = ?,
      male = ?,
      totalCustomers = ?,
      noOfFirms = ?,
      noOfNewFirms = ?,
      ageRange = ?,
      pwd = ?,
      ip = ?,
      sc = ?,
      fourPs = ?,
      nameOfStaff = ?,
      remarks = ?,
      custom_fields = ?
    WHERE id = ?
  `;

  const values = [
    payload.category,
    payload.date,
    payload.typeOfSample,
    payload.testType,
    payload.noOfSample,
    payload.range,
    payload.cost,
    payload.feesCollected,
    stringifyCalibrationJson(payload.mcBreakdown),
    payload.barangay,
    payload.address,
    stringifyCalibrationJson(payload.addressMeta),
    payload.female,
    payload.male,
    payload.totalCustomers,
    payload.noOfFirms,
    payload.noOfNewFirms,
    payload.ageRange,
    payload.pwd,
    payload.ip,
    payload.sc,
    payload.fourPs,
    payload.nameOfStaff,
    payload.remarks,
    stringifyCalibrationJson(payload.custom_fields || {}),
    req.params.id,
  ];

  db.query(sql, values, (err, result) => {
    if (err) {
      return sendCalibrationDbError(
        res,
        "PUT /calibration/:id ERROR:",
        err,
        {
          route: "PUT /calibration/:id",
          calibrationId: req.params.id,
          payload,
        }
      );
    }

    if (!result.affectedRows) {
      return res.status(404).json({ message: "Calibration entry not found." });
    }

    res.json({
      success: true,
      message: "Calibration entry updated",
    });
  });
});

app.delete("/calibration/:id", (req, res) => {
  db.query(
    "DELETE FROM calibration WHERE id = ?",
    [req.params.id],
    (err, result) => {
      if (err) {
        return sendCalibrationDbError(
          res,
          "DELETE /calibration/:id ERROR:",
          err,
          {
            route: "DELETE /calibration/:id",
            calibrationId: req.params.id,
          }
        );
      }

      if (!result.affectedRows) {
        return res.status(404).json({ message: "Calibration entry not found." });
      }

      res.json({
        success: true,
        message: "Calibration entry deleted",
      });
    }
  );
});

// ===========================
// S&T PROMO HELPERS
// ===========================
const normalizeStPromoRow = (row = {}) => ({
  id: String(row.id || ""),
  entryMode: row.entryMode || "ONLINE",
  date: row.date ? formatDateOnly(row.date) : "",
  projectTitle: row.projectTitle || "",
  activityType: row.activityType || "",
  regional: Number(row.regional || 0),
  provincial: Number(row.provincial || 0),
  cityMunicipality: Number(row.cityMunicipality || 0),
  male: Number(row.male || 0),
  female: Number(row.female || 0),
  totalParticipants: Number(row.totalParticipants || 0),
  peopleReached: Number(row.peopleReached || 0),
  views: Number(row.views || 0),
  reaction: Number(row.reaction || 0),
  comment: Number(row.comment || 0),
  share: Number(row.share || 0),
  totalEngagements: Number(row.totalEngagements || 0),
  meansOfVerification: row.meansOfVerification || "",
  address: row.address || "",
  addressMeta: parseJsonSafe(row.addressMeta),
  municipality: row.municipality || "",
  district: row.district || "",
  barangay: row.barangay || "",
  remarks: row.remarks || "",
  created_at: row.created_at || null,
  updated_at: row.updated_at || null,
});

const buildStPromoPayload = (body = {}, forcedId = null) => {
  const entryModeRaw = String(pickFirst(body.entryMode, "ONLINE") || "ONLINE")
    .trim()
    .toUpperCase();

  const entryMode = entryModeRaw === "ONSITE" ? "ONSITE" : "ONLINE";
  const parsedAddressMeta = parseJsonSafe(body.addressMeta);
  const safeId =
    forcedId ||
    String(pickFirst(body.id, `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`)).trim();

  const onsiteMunicipality =
    entryMode === "ONSITE" ? String(body.municipality || "").trim() : "";
  const onsiteDistrict = entryMode === "ONSITE" ? String(body.district || "").trim() : "";
  const onsiteBarangay = entryMode === "ONSITE" ? String(body.barangay || "").trim() : "";

  return {
    id: safeId,
    entryMode,
    date: toNullIfEmpty(String(body.date || "").trim()),
    projectTitle: String(body.projectTitle || "").trim(),
    activityType: String(body.activityType || "").trim(),
    regional: toNumOrZero(body.regional),
    provincial: toNumOrZero(body.provincial),
    cityMunicipality: toNumOrZero(body.cityMunicipality),
    male: toNumOrZero(body.male),
    female: toNumOrZero(body.female),
    totalParticipants: toNumOrZero(
      pickFirst(
        body.totalParticipants,
        toNumOrZero(body.male) + toNumOrZero(body.female)
      )
    ),
    peopleReached: entryMode === "ONLINE" ? toNumOrZero(body.peopleReached) : 0,
    views: entryMode === "ONLINE" ? toNumOrZero(body.views) : 0,
    reaction: entryMode === "ONLINE" ? toNumOrZero(body.reaction) : 0,
    comment: entryMode === "ONLINE" ? toNumOrZero(body.comment) : 0,
    share: entryMode === "ONLINE" ? toNumOrZero(body.share) : 0,
    totalEngagements:
      entryMode === "ONLINE"
        ? toNumOrZero(
          pickFirst(
            body.totalEngagements,
            toNumOrZero(body.reaction) +
            toNumOrZero(body.comment) +
            toNumOrZero(body.share)
          )
        )
        : 0,
    meansOfVerification: String(body.meansOfVerification || "").trim(),
    address: entryMode === "ONSITE" ? String(body.address || "").trim() : "",
    addressMeta:
      entryMode === "ONSITE" && parsedAddressMeta
        ? JSON.stringify(parsedAddressMeta)
        : null,
    municipality: onsiteMunicipality,
    district: onsiteDistrict,
    barangay: onsiteBarangay,
    staffName: toNullIfEmpty(String(body.staffName || body.nameOfStaff || body.staff_name || "").trim()),
    remarks: toNullIfEmpty(String(body.remarks || "").trim()),
    custom_fields: JSON.stringify(body.custom_fields || body.customFields || {}),
  };
};

const validateStPromoPayload = (payload = {}) => {
  if (!payload.id) return "ID is required.";
  if (!payload.entryMode) return "Entry mode is required.";
  if (!payload.date) return "Date is required.";
  if (!payload.projectTitle) return "Project title is required.";
  if (!payload.activityType) return "Activity type is required.";
  if (!payload.meansOfVerification) return "Means of verification is required.";
  if (payload.entryMode === "ONSITE" && !payload.address) {
    return "Address is required for onsite entries.";
  }
  return null;
};


const buildStPromoWhere = (query = {}) => {
  const where = [];
  const params = [];

  const search = String(query.search || "").trim();
  const year = String(query.year || "ALL").trim();
  const month = String(query.month || "ALL").trim();
  const municipality = String(query.municipality || "ALL").trim();
  const district = String(query.district || "ALL").trim();
  const entryMode = String(
    pickFirst(query.entryMode, query.view, query.filterView, "OVERALL")
  )
    .trim()
    .toUpperCase();

  if (search) {
    const like = `%${search}%`;
    where.push(`(
      id LIKE ?
      OR date LIKE ?
      OR projectTitle LIKE ?
      OR activityType LIKE ?
      OR entryMode LIKE ?
      OR municipality LIKE ?
      OR district LIKE ?
      OR barangay LIKE ?
      OR address LIKE ?
      OR meansOfVerification LIKE ?
      OR remarks LIKE ?
    )`);
    params.push(like, like, like, like, like, like, like, like, like, like, like);
  }

  if (year !== "ALL" && year !== "") {
    where.push("YEAR(date) = ?");
    params.push(Number(year));
  }

  if (month !== "ALL" && month !== "") {
    where.push("MONTH(date) = ?");
    params.push(Number(month));
  }

  if (municipality !== "ALL" && municipality !== "") {
    where.push("municipality = ?");
    params.push(municipality);
  }

  if (district !== "ALL" && district !== "") {
    where.push("district = ?");
    params.push(district);
  }

  if (entryMode !== "OVERALL" && entryMode !== "ALL" && entryMode !== "") {
    where.push("entryMode = ?");
    params.push(entryMode === "ONSITE" ? "ONSITE" : "ONLINE");
  }

  return {
    whereSql: where.length ? `WHERE ${where.join(" AND ")}` : "",
    params,
  };
};

const fetchStPromoById = (id, callback) => {
  db.query(
    "SELECT * FROM st_promo WHERE id = ? LIMIT 1",
    [id],
    (err, rows) => {
      if (err) return callback(err);
      callback(null, rows?.[0] ? normalizeStPromoRow(rows[0]) : null);
    }
  );
};

// ===========================
// S&T PROMO ROUTES
// ===========================
app.get("/st-promo", (req, res) => {
  const hasServerPaging =
    req.query.page !== undefined ||
    req.query.limit !== undefined ||
    req.query.search !== undefined ||
    req.query.year !== undefined ||
    req.query.month !== undefined ||
    req.query.municipality !== undefined ||
    req.query.district !== undefined ||
    req.query.entryMode !== undefined ||
    req.query.view !== undefined ||
    req.query.filterView !== undefined;

  if (!hasServerPaging) {
    const sql = `
      SELECT *
      FROM st_promo
      ORDER BY date DESC, created_at DESC, id DESC
    `;

    db.query(sql, (err, rows) => {
      if (err) {
        console.error("GET /st-promo ERROR:", err);
        return res.status(500).json({ message: err.message });
      }

      res.json((rows || []).map(normalizeStPromoRow));
    });

    return;
  }

  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.max(1, Math.min(100, Number(req.query.limit || 10)));
  const offset = (page - 1) * limit;
  const { whereSql, params } = buildStPromoWhere(req.query);

  const countSql = `
    SELECT COUNT(*) AS total
    FROM st_promo
    ${whereSql}
  `;

  db.query(countSql, params, (countErr, countRows) => {
    if (countErr) {
      console.error("GET /st-promo count ERROR:", countErr);
      return res.status(500).json({ message: countErr.message });
    }

    const total = Number(countRows?.[0]?.total || 0);
    const totalPages = Math.max(1, Math.ceil(total / limit));

    const dataSql = `
      SELECT *
      FROM st_promo
      ${whereSql}
      ORDER BY date DESC, created_at DESC, id DESC
      LIMIT ? OFFSET ?
    `;

    db.query(dataSql, [...params, limit, offset], (err, rows) => {
      if (err) {
        console.error("GET /st-promo paged ERROR:", err);
        return res.status(500).json({ message: err.message });
      }

      res.json({
        data: (rows || []).map(normalizeStPromoRow),
        total,
        totalPages,
        page,
        limit,
      });
    });
  });
});

app.get("/st-promo/:id", (req, res) => {
  fetchStPromoById(req.params.id, (err, row) => {
    if (err) {
      console.error("GET /st-promo/:id ERROR:", err);
      return res.status(500).json({ message: err.message });
    }

    if (!row) {
      return res.status(404).json({ message: "S&T Promo entry not found." });
    }

    res.json(row);
  });
});

app.post("/st-promo", (req, res) => {
  const payload = buildStPromoPayload(req.body || {});
  const validationError = validateStPromoPayload(payload);

  if (validationError) {
    return res.status(400).json({ message: validationError });
  }

  const sql = `
    INSERT INTO st_promo (
      id,
      entryMode,
      date,
      projectTitle,
      activityType,
      regional,
      provincial,
      cityMunicipality,
      male,
      female,
      totalParticipants,
      peopleReached,
      views,
      reaction,
      comment,
      share,
      totalEngagements,
      meansOfVerification,
      address,
      addressMeta,
      municipality,
      district,
      barangay,
      staffName,
      remarks,
      custom_fields
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [
      payload.id,
      payload.entryMode,
      payload.date,
      payload.projectTitle,
      payload.activityType,
      payload.regional,
      payload.provincial,
      payload.cityMunicipality,
      payload.male,
      payload.female,
      payload.totalParticipants,
      payload.peopleReached,
      payload.views,
      payload.reaction,
      payload.comment,
      payload.share,
      payload.totalEngagements,
      payload.meansOfVerification,
      payload.address,
      payload.addressMeta,
      payload.municipality,
      payload.district,
      payload.barangay,
      payload.staffName,
      payload.remarks,
      payload.custom_fields,
    ],
    (err) => {
      if (err) {
        console.error("POST /st-promo ERROR:", err);
        return res.status(500).json({ message: err.message });
      }

      fetchStPromoById(payload.id, (fetchErr, row) => {
        if (fetchErr) {
          console.error("POST /st-promo fetch ERROR:", fetchErr);
          return res.status(500).json({ message: fetchErr.message });
        }

        res.status(201).json(row || normalizeStPromoRow(payload));
      });
    }
  );
});

app.put("/st-promo/:id", (req, res) => {
  const entryId = String(req.params.id || "").trim();
  const payload = buildStPromoPayload(req.body || {}, entryId);
  const validationError = validateStPromoPayload(payload);

  if (validationError) {
    return res.status(400).json({ message: validationError });
  }

  const sql = `
    UPDATE st_promo
    SET
      entryMode = ?,
      date = ?,
      projectTitle = ?,
      activityType = ?,
      regional = ?,
      provincial = ?,
      cityMunicipality = ?,
      male = ?,
      female = ?,
      totalParticipants = ?,
      peopleReached = ?,
      views = ?,
      reaction = ?,
      comment = ?,
      share = ?,
      totalEngagements = ?,
      meansOfVerification = ?,
      address = ?,
      addressMeta = ?,
      municipality = ?,
      district = ?,
      barangay = ?,
      staffName = ?,
      remarks = ?,
      custom_fields = ?
    WHERE id = ?
  `;

  db.query(
    sql,
    [
      payload.entryMode,
      payload.date,
      payload.projectTitle,
      payload.activityType,
      payload.regional,
      payload.provincial,
      payload.cityMunicipality,
      payload.male,
      payload.female,
      payload.totalParticipants,
      payload.peopleReached,
      payload.views,
      payload.reaction,
      payload.comment,
      payload.share,
      payload.totalEngagements,
      payload.meansOfVerification,
      payload.address,
      payload.addressMeta,
      payload.municipality,
      payload.district,
      payload.barangay,
      payload.staffName,
      payload.remarks,
      payload.custom_fields,
      entryId,
    ],
    (err, result) => {
      if (err) {
        console.error("PUT /st-promo/:id ERROR:", err);
        return res.status(500).json({ message: err.message });
      }

      if (!result.affectedRows) {
        return res.status(404).json({ message: "S&T Promo entry not found." });
      }

      fetchStPromoById(entryId, (fetchErr, row) => {
        if (fetchErr) {
          console.error("PUT /st-promo/:id fetch ERROR:", fetchErr);
          return res.status(500).json({ message: fetchErr.message });
        }

        res.json(row || normalizeStPromoRow(payload));
      });
    }
  );
});

app.delete("/st-promo/:id", (req, res) => {
  db.query(
    "DELETE FROM st_promo WHERE id = ?",
    [req.params.id],
    (err, result) => {
      if (err) {
        console.error("DELETE /st-promo/:id ERROR:", err);
        return res.status(500).json({ message: err.message });
      }

      if (!result.affectedRows) {
        return res.status(404).json({ message: "S&T Promo entry not found." });
      }

      res.json({
        success: true,
        message: "S&T Promo entry deleted",
      });
    }
  );
});


// ===========================
// DASHBOARD PROJECTS ROUTE
// ===========================
const dashboardQueryAsync = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.query(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });

const dashboardNormalizeName = (value = "") =>
  String(value || "")
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/\s+/g, " ")
    .trim();

const dashboardDistrictFromMunicipality = (name = "") => {
  const target = dashboardNormalizeName(name);
  const districts = [
    {
      id: "District 1",
      municipalities: ["Agno", "Alaminos City", "Anda", "Bani", "Bolinao", "Burgos", "Dasol", "Infanta", "Mabini", "Sual"],
    },
    {
      id: "District 2",
      municipalities: ["Aguilar", "Basista", "Binmaley", "Bugallon", "Labrador", "Lingayen", "Mangatarem", "Urbiztondo"],
    },
    {
      id: "District 3",
      municipalities: ["Bayambang", "Calasiao", "Malasiqui", "Mapandan", "San Carlos City", "Santa Barbara"],
    },
    {
      id: "District 4",
      municipalities: ["Dagupan City", "Manaoag", "Mangaldan", "San Fabian", "San Jacinto"],
    },
    {
      id: "District 5",
      municipalities: ["Alcala", "Bautista", "Binalonan", "Laoac", "Pozorrubio", "Santo Tomas", "Sison", "Urdaneta City", "Villasis"],
    },
    {
      id: "District 6",
      municipalities: ["Asingan", "Balungao", "Natividad", "Rosales", "San Manuel", "San Nicolas", "San Quintin", "Santa Maria", "Tayug", "Umingan"],
    },
  ];

  for (const district of districts) {
    if (district.municipalities.some((item) => dashboardNormalizeName(item) === target)) {
      return district.id;
    }
  }

  return "";
};

const dashboardToProjectRecord = ({
  id,
  program,
  title,
  municipality,
  district,
  barangay,
  lat,
  lng,
  status,
  approvedProjectCost = 0,
  beneficiaries = 0,
  createdAt,
}) => ({
  id,
  program,
  title: String(title || "Untitled Project").trim() || "Untitled Project",
  municipality: String(municipality || "").trim(),
  district: String(district || dashboardDistrictFromMunicipality(municipality)).trim(),
  barangay: String(barangay || "").trim(),
  lat: lat === "" || lat === null || lat === undefined ? null : Number(lat),
  lng: lng === "" || lng === null || lng === undefined ? null : Number(lng),
  status: String(status || "Pending").trim() || "Pending",
  approvedProjectCost: Number(approvedProjectCost || 0),
  beneficiaries: Number(beneficiaries || 0),
  createdAt: formatDateOnly(createdAt) || formatDateOnly(new Date()) || "",
});

app.get("/dashboard/projects", async (req, res) => {
  try {
    const [
      setupRows,
      cestRows,
      sscpRows,
      rolloutRows,
      trainingRows,
      tacsRows,
      packagingRows,
      stPromoRows,
      techPromoRows,
      calibrationRows,
    ] = await Promise.all([
      dashboardQueryAsync(`
        SELECT
          id,
          project_title,
          district,
          address_barangay,
          address_municipality,
          address_lat,
          address_lng,
          stpms_status,
          amount,
          beneficiaries,
          date_approved,
          created_at
        FROM projects
        ORDER BY id DESC
      `),
      dashboardQueryAsync(`
        SELECT
          id,
          projectTitle,
          address_barangay,
          address_municipality,
          address_lat,
          address_lng,
          approvedProjectCost,
          beneficiaries,
          dateProjectApproval,
          created_at
        FROM cest
        ORDER BY id DESC
      `),
      dashboardQueryAsync(`
        SELECT
          id,
          projectTitle,
          address_barangay,
          address_municipality,
          address_lat,
          address_lng,
          approvedProjectCost,
          beneficiaries,
          dateProjectApproval,
          created_at
        FROM sscp
        ORDER BY id DESC
      `),
      dashboardQueryAsync(`
        SELECT
          id,
          activity_title,
          name_of_technology_transferred,
          address_barangay,
          address_municipality,
          address_lat,
          address_lng,
          activity_date,
          created_at
        FROM technology_rollout
        ORDER BY id DESC
      `),
      dashboardQueryAsync(`
        SELECT
          id,
          title,
          venue_meta,
          latitude,
          longitude,
          start_date,
          created_at
        FROM technology_training_entries
        ORDER BY id DESC
      `),
      dashboardQueryAsync(`
        SELECT
          id,
          type_of_consultancy,
          customer_name,
          customer_address_meta,
          date_of_engagement,
          created_at
        FROM tacs_entries
        ORDER BY id DESC
      `),
      dashboardQueryAsync(`
        SELECT
          id,
          firm_name,
          product_name,
          municipality,
          barangay,
          lat,
          lng,
          date_completed,
          created_at
        FROM packaging_labeling_records
        ORDER BY id DESC
      `),
      dashboardQueryAsync(`
        SELECT
          id,
          projectTitle,
          municipality,
          district,
          barangay,
          addressMeta,
          date,
          created_at
        FROM st_promo
        ORDER BY created_at DESC, id DESC
      `),
      dashboardQueryAsync(`
        SELECT
          id,
          activity_title,
          technology_promoted,
          venue_barangay,
          venue_municipality,
          venue_lat,
          venue_lng,
          activity_date,
          created_at
        FROM technology_promotion_entries
        ORDER BY id DESC
      `),
      dashboardQueryAsync(`
        SELECT
          id,
          testType,
          typeOfSample,
          addressMeta,
          barangay,
          date,
          created_at
        FROM calibration
        ORDER BY created_at DESC, id DESC
      `),
    ]);

    const payload = [];

    (setupRows || []).forEach((row) => {
      payload.push(
        dashboardToProjectRecord({
          id: row.id,
          program: "setup",
          title: row.project_title,
          municipality: row.address_municipality,
          district: row.district,
          barangay: row.address_barangay,
          lat: row.address_lat,
          lng: row.address_lng,
          status: row.stpms_status || "Ongoing",
          approvedProjectCost: row.amount,
          beneficiaries: row.beneficiaries,
          createdAt: row.date_approved || row.created_at,
        })
      );
    });

    (cestRows || []).forEach((row) => {
      payload.push(
        dashboardToProjectRecord({
          id: `cest_${row.id}`,
          program: "cest",
          title: row.projectTitle,
          municipality: row.address_municipality,
          barangay: row.address_barangay,
          lat: row.address_lat,
          lng: row.address_lng,
          status: "Ongoing",
          approvedProjectCost: row.approvedProjectCost,
          beneficiaries: row.beneficiaries,
          createdAt: row.dateProjectApproval || row.created_at,
        })
      );
    });

    (sscpRows || []).forEach((row) => {
      payload.push(
        dashboardToProjectRecord({
          id: `sscp_${row.id}`,
          program: "sscp",
          title: row.projectTitle,
          municipality: row.address_municipality,
          barangay: row.address_barangay,
          lat: row.address_lat,
          lng: row.address_lng,
          status: "Ongoing",
          approvedProjectCost: row.approvedProjectCost,
          beneficiaries: row.beneficiaries,
          createdAt: row.dateProjectApproval || row.created_at,
        })
      );
    });

    (rolloutRows || []).forEach((row) => {
      payload.push(
        dashboardToProjectRecord({
          id: `rollout_${row.id}`,
          program: "rollout",
          title: row.activity_title || row.name_of_technology_transferred,
          municipality: row.address_municipality,
          barangay: row.address_barangay,
          lat: row.address_lat,
          lng: row.address_lng,
          status: "Completed",
          createdAt: row.activity_date || row.created_at,
        })
      );
    });

    (trainingRows || []).forEach((row) => {
      const meta = parseJsonSafe(row.venue_meta) || {};
      payload.push(
        dashboardToProjectRecord({
          id: `training_${row.id}`,
          program: "training",
          title: row.title,
          municipality: meta.municipality || "",
          barangay: meta.barangay || "",
          lat: row.latitude ?? meta.lat ?? null,
          lng: row.longitude ?? meta.lng ?? null,
          status: "Completed",
          createdAt: row.start_date || row.created_at,
        })
      );
    });

    (tacsRows || []).forEach((row) => {
      const meta = parseJsonSafe(row.customer_address_meta) || {};
      payload.push(
        dashboardToProjectRecord({
          id: `tacs_${row.id}`,
          program: "tacs",
          title: row.customer_name || row.type_of_consultancy,
          municipality: meta.municipality || "",
          barangay: meta.barangay || "",
          lat: meta.lat ?? null,
          lng: meta.lng ?? null,
          status: "Completed",
          createdAt: row.date_of_engagement || row.created_at,
        })
      );
    });

    (packagingRows || []).forEach((row) => {
      payload.push(
        dashboardToProjectRecord({
          id: `packaging_${row.id}`,
          program: "packaging",
          title: row.firm_name || row.product_name,
          municipality: row.municipality,
          barangay: row.barangay,
          lat: row.lat,
          lng: row.lng,
          status: "Completed",
          createdAt: row.date_completed || row.created_at,
        })
      );
    });

    (stPromoRows || []).forEach((row) => {
      const meta = parseJsonSafe(row.addressMeta) || {};
      payload.push(
        dashboardToProjectRecord({
          id: `stpromo_${row.id}`,
          program: "stPromo",
          title: row.projectTitle,
          municipality: row.municipality || meta.municipality || "",
          district: row.district || meta.district || "",
          barangay: row.barangay || meta.barangay || "",
          lat: meta.lat ?? null,
          lng: meta.lng ?? null,
          status: "Completed",
          createdAt: row.date || row.created_at,
        })
      );
    });

    (techPromoRows || []).forEach((row) => {
      payload.push(
        dashboardToProjectRecord({
          id: `techpromo_${row.id}`,
          program: "techPromo",
          title: row.activity_title || row.technology_promoted,
          municipality: row.venue_municipality,
          barangay: row.venue_barangay,
          lat: row.venue_lat,
          lng: row.venue_lng,
          status: "Completed",
          createdAt: row.activity_date || row.created_at,
        })
      );
    });

    (calibrationRows || []).forEach((row) => {
      const meta = parseJsonSafe(row.addressMeta) || {};
      payload.push(
        dashboardToProjectRecord({
          id: `calibration_${row.id}`,
          program: "calibration",
          title: row.testType || row.typeOfSample,
          municipality: meta.municipality || "",
          barangay: row.barangay || meta.barangay || "",
          lat: meta.lat ?? null,
          lng: meta.lng ?? null,
          status: "Completed",
          createdAt: row.date || row.created_at,
        })
      );
    });

    res.json(payload.filter((item) => item.municipality));
  } catch (err) {
    console.error("GET /dashboard/projects ERROR:", err);
    res.status(500).json({
      message: err?.sqlMessage || err?.message || "Failed to load dashboard projects.",
    });
  }
});




// ============================================================
// INTEGRATED USER MANAGEMENT + AUTH ROUTES
// ============================================================

// ============================================================
// USER MANAGEMENT + AUTH ROUTES
// Idikit ito sa server.js bago ang app.listen(...)
// Tables needed:
// - user_accounts
// - user_permissions
// - user_special_permissions
// - user_assignments
// - user_accomplishments
// - user_audit_logs
// ============================================================

const USER_MODULE_KEYS = [
  "dashboard",
  "targetSetting",
  "userManagement",
  "tableManagement",
  "setup",
  "cest",
  "sscp",
  "technologyTraining",
  "tacs",
  "pcl",
  "specialReport",
  "promo",
  "calibration",
];

const defaultUserPagePermission = () => ({
  view: false,
  add: false,
  edit: false,
  delete: false,
  export: false,
});

const fullUserPagePermission = () => ({
  view: true,
  add: true,
  edit: true,
  delete: true,
  export: true,
});

const buildEmptyUserPermissions = () =>
  USER_MODULE_KEYS.reduce((acc, key) => {
    acc[key] = defaultUserPagePermission();
    return acc;
  }, {});

const normalizeUserRole = (role = "staff") => {
  const value = String(role || "staff").trim().toLowerCase();
  if (["superadmin", "admin", "staff"].includes(value)) return value;
  return "staff";
};

const normalizeUserStatus = (status = "active") => {
  const value = String(status || "active").trim().toLowerCase();
  if (["active", "inactive"].includes(value)) return value;
  return "active";
};

const userBool = (value) => {
  if (value === true || value === 1 || value === "1") return true;
  return false;
};

const parseUserJsonSafe = (value, fallback = null) => {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const formatUserDate = (value) => {
  if (!value) return "Never";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value || "Never");
  return d.toLocaleString();
};

const normalizeUserRow = (row = {}, permissions = {}, special = {}) => ({
  id: Number(row.id),
  firstName: row.first_name || "",
  middleName: row.middle_name || "",
  lastName: row.last_name || "",
  suffix: row.suffix || "",
  fullName: row.full_name || "",
  username: row.username || "",
  email: row.email || "",
  contactNumber: row.contact_number || "",
  role: row.role || "staff",
  status: row.status || "active",
  position: row.position || "",
  office: row.office || "",
  createdBy: row.created_by || "",
  createdAt: formatUserDate(row.created_at),
  lastLogin: formatUserDate(row.last_login),
  canManageDropdowns: userBool(row.can_manage_dropdowns),
  avatar: parseUserJsonSafe(row.avatar_json, null),
  assigned: Number(row.assigned || 0),
  completed: Number(row.completed || 0),
  pending: Number(row.pending || 0),
  editedRecords: Number(row.edited_records || 0),
  permissions,
  specialPermissions: {
    manageDropdowns: userBool(special.manage_dropdowns),
    manageUsers: userBool(special.manage_users),
  },
});

const getUserPermissionsByUserId = (userId, callback) => {
  db.query(
    `
      SELECT
        page_key,
        can_view,
        can_add,
        can_edit,
        can_delete,
        can_export
      FROM user_permissions
      WHERE user_id = ?
    `,
    [userId],
    (err, rows) => {
      if (err) return callback(err);

      const pages = buildEmptyUserPermissions();

      (rows || []).forEach((row) => {
        const key = row.page_key;
        if (!pages[key]) pages[key] = defaultUserPagePermission();

        pages[key] = {
          view: userBool(row.can_view),
          add: userBool(row.can_add),
          edit: userBool(row.can_edit),
          delete: userBool(row.can_delete),
          export: userBool(row.can_export),
        };
      });

      callback(null, pages);
    }
  );
};

const getUserSpecialPermissionsByUserId = (userId, callback) => {
  db.query(
    `
      SELECT
        manage_dropdowns,
        manage_users
      FROM user_special_permissions
      WHERE user_id = ?
      LIMIT 1
    `,
    [userId],
    (err, rows) => {
      if (err) return callback(err);

      callback(null, rows?.[0] || {
        manage_dropdowns: 0,
        manage_users: 0,
      });
    }
  );
};

const getFullUserById = (userId, callback) => {
  db.query(
    "SELECT * FROM user_accounts WHERE id = ? LIMIT 1",
    [userId],
    (err, rows) => {
      if (err) return callback(err);

      const row = rows?.[0];
      if (!row) return callback(null, null);

      getUserPermissionsByUserId(userId, (permErr, permissions) => {
        if (permErr) return callback(permErr);

        getUserSpecialPermissionsByUserId(userId, (specialErr, special) => {
          if (specialErr) return callback(specialErr);

          callback(null, normalizeUserRow(row, permissions, special));
        });
      });
    }
  );
};

const saveUserPermissions = (userId, pages = {}, callback) => {
  const keys = Object.keys(pages || {});
  if (!keys.length) return callback(null);

  let index = 0;

  const next = () => {
    if (index >= keys.length) return callback(null);

    const key = keys[index++];
    const p = pages[key] || {};

    db.query(
      `
        INSERT INTO user_permissions
        (user_id, page_key, can_view, can_add, can_edit, can_delete, can_export)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          can_view = VALUES(can_view),
          can_add = VALUES(can_add),
          can_edit = VALUES(can_edit),
          can_delete = VALUES(can_delete),
          can_export = VALUES(can_export)
      `,
      [
        userId,
        key,
        p.view ? 1 : 0,
        p.add ? 1 : 0,
        p.edit ? 1 : 0,
        p.delete ? 1 : 0,
        p.export ? 1 : 0,
      ],
      (err) => {
        if (err) return callback(err);
        next();
      }
    );
  };

  next();
};

const saveUserSpecialPermissions = (userId, special = {}, callback) => {
  db.query(
    `
      INSERT INTO user_special_permissions
      (user_id, manage_dropdowns, manage_users)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE
        manage_dropdowns = VALUES(manage_dropdowns),
        manage_users = VALUES(manage_users)
    `,
    [
      userId,
      special.manageDropdowns || special.manage_dropdowns ? 1 : 0,
      special.manageUsers || special.manage_users ? 1 : 0,
    ],
    callback
  );
};

const getDefaultPermissionsForRole = (role = "staff") => {
  const normalizedRole = normalizeUserRole(role);
  const pages = buildEmptyUserPermissions();

  if (normalizedRole === "superadmin") {
    USER_MODULE_KEYS.forEach((key) => {
      pages[key] = fullUserPagePermission();
    });

    return {
      pages,
      special: {
        manageDropdowns: true,
        manageUsers: true,
      },
    };
  }

  if (normalizedRole === "admin") {
    USER_MODULE_KEYS.forEach((key) => {
      pages[key] = {
        view: true,
        add: true,
        edit: true,
        delete: false,
        export: true,
      };
    });

    pages.dashboard = {
      view: true,
      add: false,
      edit: false,
      delete: false,
      export: true,
    };

    return {
      pages,
      special: {
        manageDropdowns: true,
        manageUsers: true,
      },
    };
  }

  pages.dashboard = { view: true, add: false, edit: false, delete: false, export: false };
  pages.targetSetting = { view: true, add: false, edit: false, delete: false, export: false };
  pages.userManagement = { view: true, add: false, edit: false, delete: false, export: false };
  pages.setup = { view: true, add: true, edit: true, delete: false, export: false };
  pages.tacs = { view: true, add: true, edit: true, delete: false, export: false };
  pages.calibration = { view: true, add: true, edit: false, delete: false, export: false };

  return {
    pages,
    special: {
      manageDropdowns: false,
      manageUsers: false,
    },
  };
};

// LOGIN
app.post("/login", (req, res) => {
  const username = String(req.body?.username || "").trim();
  const password = String(req.body?.password || "").trim();

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: "Username and password are required.",
    });
  }

  db.query(
    `
      SELECT *
      FROM user_accounts
      WHERE LOWER(username) = LOWER(?)
        AND password = ?
        AND status = 'active'
      LIMIT 1
    `,
    [username, password],
    (err, rows) => {
      if (err) {
        console.error("POST /login ERROR:", err);
        return res.status(500).json({
          success: false,
          message: err.message,
        });
      }

      const userRow = rows?.[0];

      if (!userRow) {
        return res.status(401).json({
          success: false,
          message: "Invalid username or password.",
        });
      }

      db.query(
        "UPDATE user_accounts SET last_login = NOW() WHERE id = ?",
        [userRow.id],
        (updateErr) => {
          if (updateErr) {
            console.error("POST /login update last_login ERROR:", updateErr);
          }

          getFullUserById(userRow.id, (fullErr, user) => {
            if (fullErr) {
              console.error("POST /login get full user ERROR:", fullErr);
              return res.status(500).json({
                success: false,
                message: fullErr.message,
              });
            }

            return res.json({
              success: true,
              user,
            });
          });
        }
      );
    }
  );
});

// GET ALL USERS
app.get("/users", (req, res) => {
  db.query(
    `
      SELECT *
      FROM user_accounts
      ORDER BY
        FIELD(role, 'superadmin', 'admin', 'staff'),
        full_name ASC
    `,
    (err, rows) => {
      if (err) {
        console.error("GET /users ERROR:", err);
        return res.status(500).json({ message: err.message });
      }

      const list = rows || [];
      const output = [];
      let index = 0;

      const next = () => {
        if (index >= list.length) return res.json(output);

        const row = list[index++];

        getUserPermissionsByUserId(row.id, (permErr, permissions) => {
          if (permErr) return res.status(500).json({ message: permErr.message });

          getUserSpecialPermissionsByUserId(row.id, (specialErr, special) => {
            if (specialErr) return res.status(500).json({ message: specialErr.message });

            output.push(normalizeUserRow(row, permissions, special));
            next();
          });
        });
      };

      next();
    }
  );
});

// GET SINGLE USER
app.get("/users/:id", (req, res) => {
  getFullUserById(req.params.id, (err, user) => {
    if (err) {
      console.error("GET /users/:id ERROR:", err);
      return res.status(500).json({ message: err.message });
    }

    if (!user) return res.status(404).json({ message: "User not found." });

    res.json(user);
  });
});

// CREATE USER
app.post("/users", (req, res) => {
  const b = req.body || {};
  const role = normalizeUserRole(b.role);
  const status = normalizeUserStatus(b.status);
  const defaults = getDefaultPermissionsForRole(role);

  const firstName = String(b.firstName || b.first_name || "").trim();
  const middleName = String(b.middleName || b.middle_name || "").trim();
  const lastName = String(b.lastName || b.last_name || "").trim();
  const suffix = String(b.suffix || "").trim();

  const fullName = String(
    b.fullName ||
    b.full_name ||
    [firstName, middleName, lastName, suffix].filter(Boolean).join(" ")
  )
    .replace(/\s+/g, " ")
    .trim();

  const username = String(b.username || "").trim();
  const password = String(b.password || "1234").trim() || "1234";

  if (!fullName || !username) {
    return res.status(400).json({
      message: "Full name and username are required.",
    });
  }

  const insertSql = [
    "INSERT INTO user_accounts (",
    "first_name, middle_name, last_name, suffix, full_name, username, password,",
    "email, contact_number, role, status, position, office, created_by,",
    "can_manage_dropdowns, avatar_json, assigned, completed, pending, edited_records, last_login",
    ") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0, NULL)"
  ].join(" ");

  db.query(
    insertSql,
    [
      firstName || null,
      middleName || null,
      lastName || null,
      suffix || null,
      fullName,
      username,
      password,
      toNullIfEmpty(b.email),
      toNullIfEmpty(b.contactNumber ?? b.contact_number),
      role,
      status,
      toNullIfEmpty(b.position),
      toNullIfEmpty(b.office),
      toNullIfEmpty(b.createdBy ?? b.created_by),
      b.canManageDropdowns || role !== "staff" ? 1 : 0,
      b.avatar ? JSON.stringify(b.avatar) : null,
    ],
    (err, result) => {
      if (err) {
        console.error("POST /users INSERT ERROR:", err);
        return res.status(500).json({ message: err.message });
      }

      const userId = Number(result.insertId);
      const pages = b.permissions?.pages || b.permissions || b.pages || defaults.pages;
      const special =
        b.specialPermissions ||
        b.permissions?.special ||
        b.special ||
        defaults.special;

      saveUserPermissions(userId, pages, (permErr) => {
        if (permErr) {
          console.error("POST /users permissions ERROR:", permErr);
          return res.status(500).json({ message: permErr.message });
        }

        saveUserSpecialPermissions(userId, special, (specialErr) => {
          if (specialErr) {
            console.error("POST /users special permissions ERROR:", specialErr);
            return res.status(500).json({ message: specialErr.message });
          }

          getFullUserById(userId, (getErr, user) => {
            if (getErr) {
              console.error("POST /users get user ERROR:", getErr);
              return res.status(500).json({ message: getErr.message });
            }

            res.json({ success: true, user });
          });
        });
      });
    }
  );
});



// UPDATE USER
app.put("/users/:id", (req, res) => {
  const userId = Number(req.params.id);
  const b = req.body || {};

  if (!Number.isFinite(userId) || userId <= 0) {
    return res.status(400).json({ message: "Invalid user id." });
  }

  const role = normalizeUserRole(b.role);
  const status = normalizeUserStatus(b.status);
  const defaults = getDefaultPermissionsForRole(role);

  const firstName = String(b.firstName || b.first_name || "").trim();
  const middleName = String(b.middleName || b.middle_name || "").trim();
  const lastName = String(b.lastName || b.last_name || "").trim();
  const suffix = String(b.suffix || "").trim();

  const fullName = String(
    b.fullName ||
    b.full_name ||
    [firstName, middleName, lastName, suffix].filter(Boolean).join(" ")
  )
    .replace(/\s+/g, " ")
    .trim();

  const username = String(b.username || "").trim();

  if (!fullName || !username) {
    return res.status(400).json({
      message: "Full name and username are required.",
    });
  }

  const updateSql = [
    "UPDATE user_accounts SET",
    "first_name=?, middle_name=?, last_name=?, suffix=?, full_name=?, username=?,",
    "email=?, contact_number=?, role=?, status=?, position=?, office=?,",
    "can_manage_dropdowns=?, avatar_json=?",
    "WHERE id=?"
  ].join(" ");

  db.query(
    updateSql,
    [
      firstName || null,
      middleName || null,
      lastName || null,
      suffix || null,
      fullName,
      username,
      toNullIfEmpty(b.email),
      toNullIfEmpty(b.contactNumber ?? b.contact_number),
      role,
      status,
      toNullIfEmpty(b.position),
      toNullIfEmpty(b.office),
      b.canManageDropdowns || role !== "staff" ? 1 : 0,
      b.avatar ? JSON.stringify(b.avatar) : null,
      userId,
    ],
    (err, result) => {
      if (err) {
        console.error("PUT /users/:id UPDATE ERROR:", err);
        return res.status(500).json({ message: err.message });
      }

      if (!result.affectedRows) {
        return res.status(404).json({ message: "User not found." });
      }

      const pages = b.permissions?.pages || b.permissions || b.pages || defaults.pages;
      const special =
        b.specialPermissions ||
        b.permissions?.special ||
        b.special ||
        defaults.special;

      saveUserPermissions(userId, pages, (permErr) => {
        if (permErr) {
          console.error("PUT /users/:id permissions ERROR:", permErr);
          return res.status(500).json({ message: permErr.message });
        }

        saveUserSpecialPermissions(userId, special, (specialErr) => {
          if (specialErr) {
            console.error("PUT /users/:id special permissions ERROR:", specialErr);
            return res.status(500).json({ message: specialErr.message });
          }

          getFullUserById(userId, (getErr, user) => {
            if (getErr) {
              console.error("PUT /users/:id get user ERROR:", getErr);
              return res.status(500).json({ message: getErr.message });
            }

            res.json({ success: true, user });
          });
        });
      });
    }
  );
});



// UPDATE USER PERMISSIONS ONLY
// UPDATE USER PERMISSIONS
app.put("/users/:id/permissions", (req, res) => {
  const userId = Number(req.params.id);
  const b = req.body || {};

  if (!Number.isFinite(userId) || userId <= 0) {
    return res.status(400).json({ message: "Invalid user id." });
  }

  const pages = b.permissions?.pages || b.pages || b.permissions || {};
  const special = b.specialPermissions || b.permissions?.special || b.special || {};

  saveUserPermissions(userId, pages, (permErr) => {
    if (permErr) {
      console.error("PUT /users/:id/permissions pages ERROR:", permErr);
      return res.status(500).json({ message: permErr.message });
    }

    saveUserSpecialPermissions(userId, special, (specialErr) => {
      if (specialErr) {
        console.error("PUT /users/:id/permissions special ERROR:", specialErr);
        return res.status(500).json({ message: specialErr.message });
      }

      getFullUserById(userId, (getErr, user) => {
        if (getErr) {
          console.error("PUT /users/:id/permissions get user ERROR:", getErr);
          return res.status(500).json({ message: getErr.message });
        }

        res.json({ success: true, user });
      });
    });
  });
});



// RESET PASSWORD
// RESET USER PASSWORD
app.put("/users/:id/reset-password", (req, res) => {
  const userId = Number(req.params.id);
  const password = String(req.body?.password || "1234").trim() || "1234";

  if (!Number.isFinite(userId) || userId <= 0) {
    return res.status(400).json({ message: "Invalid user id." });
  }

  db.query(
    "UPDATE user_accounts SET password=? WHERE id=?",
    [password, userId],
    (err, result) => {
      if (err) {
        console.error("PUT /users/:id/reset-password ERROR:", err);
        return res.status(500).json({ message: err.message });
      }

      if (!result.affectedRows) {
        return res.status(404).json({ message: "User not found." });
      }

      res.json({ success: true, message: "Password reset successfully." });
    }
  );
});



// ACTIVATE USER
app.put("/users/:id/activate", (req, res) => {
  const userId = Number(req.params.id);

  if (!Number.isFinite(userId) || userId <= 0) {
    return res.status(400).json({ message: "Invalid user id." });
  }

  db.query(
    "UPDATE user_accounts SET status='active' WHERE id=?",
    [userId],
    (err, result) => {
      if (err) {
        console.error("PUT /users/:id/activate ERROR:", err);
        return res.status(500).json({ message: err.message });
      }

      if (!result.affectedRows) {
        return res.status(404).json({ message: "User not found." });
      }

      getFullUserById(userId, (getErr, user) => {
        if (getErr) {
          console.error("PUT /users/:id/activate get user ERROR:", getErr);
          return res.status(500).json({ message: getErr.message });
        }

        res.json({ success: true, user });
      });
    }
  );
});



// DEACTIVATE USER
app.put("/users/:id/deactivate", (req, res) => {
  const userId = Number(req.params.id);

  if (!Number.isFinite(userId) || userId <= 0) {
    return res.status(400).json({ message: "Invalid user id." });
  }

  db.query(
    "UPDATE user_accounts SET status='inactive' WHERE id=?",
    [userId],
    (err, result) => {
      if (err) {
        console.error("PUT /users/:id/deactivate ERROR:", err);
        return res.status(500).json({ message: err.message });
      }

      if (!result.affectedRows) {
        return res.status(404).json({ message: "User not found." });
      }

      getFullUserById(userId, (getErr, user) => {
        if (getErr) {
          console.error("PUT /users/:id/deactivate get user ERROR:", getErr);
          return res.status(500).json({ message: getErr.message });
        }

        res.json({ success: true, user });
      });
    }
  );
});



// DELETE USER
app.delete("/users/:id", (req, res) => {
  const userId = Number(req.params.id);

  if (!Number.isFinite(userId) || userId <= 0) {
    return res.status(400).json({ message: "Invalid user id." });
  }

  const deleteSpecial = (next) => {
    db.query("DELETE FROM user_special_permissions WHERE user_id=?", [userId], next);
  };

  const deletePermissions = (next) => {
    db.query("DELETE FROM user_permissions WHERE user_id=?", [userId], next);
  };

  const deleteAssignments = (next) => {
    db.query("DELETE FROM user_assignments WHERE user_id=?", [userId], next);
  };

  const deleteAuditLogs = (next) => {
    db.query("DELETE FROM user_audit_logs WHERE user_id=?", [userId], next);
  };

  const deleteAccount = () => {
    db.query("DELETE FROM user_accounts WHERE id=?", [userId], (err, result) => {
      if (err) {
        console.error("DELETE /users/:id account ERROR:", err);
        return res.status(500).json({ message: err.message });
      }

      if (!result.affectedRows) {
        return res.status(404).json({ message: "User not found." });
      }

      res.json({ success: true, message: "User deleted successfully." });
    });
  };

  deleteSpecial((specialErr) => {
    if (specialErr) {
      console.error("DELETE /users/:id special ERROR:", specialErr);
      return res.status(500).json({ message: specialErr.message });
    }

    deletePermissions((permErr) => {
      if (permErr) {
        console.error("DELETE /users/:id permissions ERROR:", permErr);
        return res.status(500).json({ message: permErr.message });
      }

      deleteAssignments((assignErr) => {
        if (assignErr) {
          console.error("DELETE /users/:id assignments ERROR:", assignErr);
          return res.status(500).json({ message: assignErr.message });
        }

        deleteAuditLogs((auditErr) => {
          if (auditErr) {
            console.error("DELETE /users/:id audit ERROR:", auditErr);
            return res.status(500).json({ message: auditErr.message });
          }

          deleteAccount();
        });
      });
    });
  });
});





// ============================================================
// SPECIAL PROJECTS ROUTES
// Required table:
// - special_projects
// ============================================================

const normalizeSpecialProjectRow = (row = {}) => ({
  id: Number(row.id),
  quarter: row.quarter || "",
  beneficiaryName: row.beneficiary_name || "",
  address: row.address || "",
  addressMeta: {
    mode: row.address_mode || null,
    manualText: row.address_manual_text || "",
    displayText:
      row.address ||
      row.address_manual_text ||
      [row.address_barangay, row.address_municipality, row.address_province]
        .filter(Boolean)
        .join(", "),
    province: row.address_province || "",
    municipality: row.address_municipality || "",
    barangay: row.address_barangay || "",
    lat:
      row.address_lat !== null && row.address_lat !== undefined
        ? Number(row.address_lat)
        : null,
    lng:
      row.address_lng !== null && row.address_lng !== undefined
        ? Number(row.address_lng)
        : null,
  },
  specialProject: row.special_project || "",
  projectTitle: row.project_title || "",
  project_title: row.project_title || "",
  dateProjectApproved: formatDateOnly(row.date_project_approved),
  projectCost:
    row.project_cost !== null && row.project_cost !== undefined
      ? String(row.project_cost)
      : "0",
  meansOfVerification: row.means_of_verification || "",
  staffName: row.staff_name || "",
  staff_name: row.staff_name || "",
  sntInterventions: parseJsonSafe(row.snt_interventions) || [],
  snt_interventions: parseJsonSafe(row.snt_interventions) || [],
  custom_fields: parseJsonSafe(row.custom_fields) || {},
  customFields: parseJsonSafe(row.custom_fields) || {},
  created_at: row.created_at,
  updated_at: row.updated_at,
});

const buildSpecialProjectPayload = (body = {}) => {
  const meta = body.addressMeta || {};

  const finalAddress = String(
    body.address ||
    meta.displayText ||
    meta.manualText ||
    [meta.barangay, meta.municipality, meta.province].filter(Boolean).join(", ")
  ).trim();

  return {
    quarter: String(body.quarter || "").trim(),
    beneficiary_name: String(body.beneficiaryName || "").trim(),
    address: finalAddress,

    address_mode: toNullIfEmpty(meta.mode),
    address_manual_text: toNullIfEmpty(meta.manualText),
    address_province: toNullIfEmpty(meta.province),
    address_municipality: toNullIfEmpty(meta.municipality),
    address_barangay: toNullIfEmpty(meta.barangay),
    address_lat: toNumOrNull(meta.lat),
    address_lng: toNumOrNull(meta.lng),

    special_project: String(body.specialProject || "").trim(),
    project_title: toNullIfEmpty(body.projectTitle || body.project_title),
    date_project_approved: toNullIfEmpty(body.dateProjectApproved),
    project_cost:
      body.projectCost !== "" &&
        body.projectCost !== null &&
        body.projectCost !== undefined
        ? Number(String(body.projectCost).replace(/,/g, ""))
        : 0,

    means_of_verification: toNullIfEmpty(body.meansOfVerification),
    staff_name: toNullIfEmpty(body.staffName || body.staff_name),
    snt_interventions: JSON.stringify(Array.isArray(body.sntInterventions || body.snt_interventions) ? (body.sntInterventions || body.snt_interventions) : []),
    custom_fields: JSON.stringify(body.custom_fields || body.customFields || {}),
  };
};

app.get("/special-projects", (req, res) => {
  const sql = `
    SELECT *
    FROM special_projects
    ORDER BY date_project_approved DESC, id DESC
  `;

  db.query(sql, (err, rows) => {
    if (err) {
      console.error("GET /special-projects ERROR:", err);
      return res.status(500).json({ message: err.message });
    }

    res.json((rows || []).map(normalizeSpecialProjectRow));
  });
});

app.post("/special-projects", (req, res) => {
  const payload = buildSpecialProjectPayload(req.body);

  if (
    !payload.quarter ||
    !payload.beneficiary_name ||
    !payload.address ||
    !payload.special_project ||
    !payload.date_project_approved
  ) {
    return res.status(400).json({
      message:
        "Quarter, beneficiary name, address, special project, and date approved are required.",
    });
  }

  const sql = `
    INSERT INTO special_projects (
      quarter,
      beneficiary_name,
      address,
      address_mode,
      address_manual_text,
      address_province,
      address_municipality,
      address_barangay,
      address_lat,
      address_lng,
      special_project,
      project_title,
      date_project_approved,
      project_cost,
      means_of_verification,
      staff_name,
      snt_interventions,
      custom_fields
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    payload.quarter,
    payload.beneficiary_name,
    payload.address,
    payload.address_mode,
    payload.address_manual_text,
    payload.address_province,
    payload.address_municipality,
    payload.address_barangay,
    payload.address_lat,
    payload.address_lng,
    payload.special_project,
    payload.project_title,
    payload.date_project_approved,
    payload.project_cost,
    payload.means_of_verification,
    payload.staff_name,
    payload.snt_interventions,
    payload.custom_fields,
  ];

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error("POST /special-projects ERROR:", err);
      return res.status(500).json({ message: err.message });
    }

    db.query(
      "SELECT * FROM special_projects WHERE id = ? LIMIT 1",
      [result.insertId],
      (findErr, rows) => {
        if (findErr) {
          console.error("POST /special-projects reload ERROR:", findErr);
          return res.status(500).json({ message: findErr.message });
        }

        res.status(201).json(normalizeSpecialProjectRow(rows?.[0] || {}));
      }
    );
  });
});

app.put("/special-projects/:id", (req, res) => {
  const id = Number(req.params.id);
  const payload = buildSpecialProjectPayload(req.body);

  if (!Number.isFinite(id) || id <= 0) {
    return res.status(400).json({ message: "Invalid special project ID." });
  }

  if (
    !payload.quarter ||
    !payload.beneficiary_name ||
    !payload.address ||
    !payload.special_project ||
    !payload.date_project_approved
  ) {
    return res.status(400).json({
      message:
        "Quarter, beneficiary name, address, special project, and date approved are required.",
    });
  }

  const sql = `
    UPDATE special_projects
    SET
      quarter = ?,
      beneficiary_name = ?,
      address = ?,
      address_mode = ?,
      address_manual_text = ?,
      address_province = ?,
      address_municipality = ?,
      address_barangay = ?,
      address_lat = ?,
      address_lng = ?,
      special_project = ?,
      project_title = ?,
      date_project_approved = ?,
      project_cost = ?,
      means_of_verification = ?,
      staff_name = ?,
      snt_interventions = ?,
      custom_fields = ?
    WHERE id = ?
  `;

  const values = [
    payload.quarter,
    payload.beneficiary_name,
    payload.address,
    payload.address_mode,
    payload.address_manual_text,
    payload.address_province,
    payload.address_municipality,
    payload.address_barangay,
    payload.address_lat,
    payload.address_lng,
    payload.special_project,
    payload.project_title,
    payload.date_project_approved,
    payload.project_cost,
    payload.means_of_verification,
    payload.staff_name,
    payload.snt_interventions,
    payload.custom_fields,
    id,
  ];

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error("PUT /special-projects/:id ERROR:", err);
      return res.status(500).json({ message: err.message });
    }

    if (!result.affectedRows) {
      return res.status(404).json({ message: "Special project not found." });
    }

    db.query(
      "SELECT * FROM special_projects WHERE id = ? LIMIT 1",
      [id],
      (findErr, rows) => {
        if (findErr) {
          console.error("PUT /special-projects/:id reload ERROR:", findErr);
          return res.status(500).json({ message: findErr.message });
        }

        res.json(normalizeSpecialProjectRow(rows?.[0] || {}));
      }
    );
  });
});

app.delete("/special-projects/:id", (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isFinite(id) || id <= 0) {
    return res.status(400).json({ message: "Invalid special project ID." });
  }

  db.query("DELETE FROM special_projects WHERE id = ?", [id], (err, result) => {
    if (err) {
      console.error("DELETE /special-projects/:id ERROR:", err);
      return res.status(500).json({ message: err.message });
    }

    if (!result.affectedRows) {
      return res.status(404).json({ message: "Special project not found." });
    }

    res.json({ success: true, message: "Special project deleted." });
  });
});

const PORT = process.env.API_PORT || 2100;


// ===========================
// DRRM API ROUTES
// Paste this block in server.js BEFORE app.listen(...)
// Requires these MySQL tables:
// drrm_activities, drrm_activity_sectors,
// drrm_iec_materials, drrm_iec_titles, drrm_iec_sources,
// drrm_collaborations, drrm_collaboration_stakeholders,
// drrm_pscp, drrm_dropdown_options
// ===========================

const drrmDateOnly = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
};

const drrmNum = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const drrmNull = (value) => {
  if (value === undefined || value === null || value === "") return null;
  return value;
};

const drrmArray = (value) => {
  if (Array.isArray(value)) return value.map((v) => String(v || "").trim()).filter(Boolean);
  if (typeof value === "string") {
    return value.split(",").map((v) => v.trim()).filter(Boolean);
  }
  return [];
};

const drrmSplit = (value) =>
  String(value || "")
    .split("|||")
    .map((v) => v.trim())
    .filter(Boolean);

const drrmActivityPayload = (body = {}) => {
  const venueMeta = body.venueMeta || {};
  const male = drrmNum(body.male);
  const female = drrmNum(body.female);

  return {
    title: String(body.title || "").trim(),
    sectors: drrmArray(body.sectors),
    date_start: drrmNull(body.dateStart || body.date_start),
    date_end: drrmNull(body.dateEnd || body.date_end),
    venue_text: drrmNull(body.venueText || body.venue_text || venueMeta.displayText),
    venue_mode: drrmNull(venueMeta.mode),
    venue_manual_text: drrmNull(venueMeta.manualText),
    venue_display_text: drrmNull(venueMeta.displayText || body.venueText),
    venue_province: drrmNull(venueMeta.province),
    venue_municipality: drrmNull(venueMeta.municipality),
    venue_barangay: drrmNull(venueMeta.barangay),
    venue_lat: drrmNull(venueMeta.lat),
    venue_lng: drrmNull(venueMeta.lng),
    co_organizer: drrmNull(body.org || body.co_organizer),
    male,
    female,
    total: male + female,
    means_of_verification: drrmNull(body.mov || body.means_of_verification),
    remarks: drrmNull(body.remarks),
  };
};

const drrmIecPayload = (body = {}) => {
  const male = drrmNum(body.male);
  const female = drrmNum(body.female);

  return {
    titles: drrmArray(body.titles),
    sources: drrmArray(body.sources),
    date_used: drrmNull(body.date || body.date_used),
    male,
    female,
    total: male + female,
    means_of_verification: drrmNull(body.mov || body.means_of_verification),
    remarks: drrmNull(body.remarks),
  };
};

const drrmCollabPayload = (body = {}) => ({
  title: String(body.title || "").trim(),
  stakeholders: drrmArray(body.stakeholders),
  activity_date: drrmNull(body.date || body.activity_date),
  means_of_verification: drrmNull(body.mov || body.means_of_verification),
  remarks: drrmNull(body.remarks),
});

const drrmJson = (raw, fallback = null) => {
  try {
    if (!raw) return fallback;
    return typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    return fallback;
  }
};

const normalizeDrrmActivity = (row) => ({
  id: row.id,
  title: row.title || "",
  sectors: drrmSplit(row.sectors),
  dateStart: drrmDateOnly(row.date_start),
  dateEnd: drrmDateOnly(row.date_end),
  date: drrmDateOnly(row.date_start),
  venueText: row.venue_text || row.venue_display_text || "",
  venueMeta: {
    mode: row.venue_mode || "",
    manualText: row.venue_manual_text || "",
    displayText: row.venue_display_text || row.venue_text || "",
    province: row.venue_province || "",
    municipality: row.venue_municipality || "",
    barangay: row.venue_barangay || "",
    lat: row.venue_lat === null || row.venue_lat === undefined ? null : Number(row.venue_lat),
    lng: row.venue_lng === null || row.venue_lng === undefined ? null : Number(row.venue_lng),
  },
  org: row.co_organizer || "",
  male: drrmNum(row.male),
  female: drrmNum(row.female),
  total: drrmNum(row.total),
  mov: row.means_of_verification || "",
  remarks: row.remarks || "",
  custom_fields: drrmJson(row.custom_fields, {}) || {},
  customFields: drrmJson(row.custom_fields, {}) || {},
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const normalizeDrrmIec = (row) => ({
  id: row.id,
  titles: drrmSplit(row.titles),
  sources: drrmSplit(row.sources),
  date: drrmDateOnly(row.date_used),
  male: drrmNum(row.male),
  female: drrmNum(row.female),
  total: drrmNum(row.total),
  mov: row.means_of_verification || "",
  remarks: row.remarks || "",
  custom_fields: drrmJson(row.custom_fields, {}) || {},
  customFields: drrmJson(row.custom_fields, {}) || {},
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const normalizeDrrmCollab = (row) => ({
  id: row.id,
  title: row.title || "",
  stakeholders: drrmSplit(row.stakeholders),
  date: drrmDateOnly(row.activity_date),
  mov: row.means_of_verification || "",
  remarks: row.remarks || "",
  custom_fields: drrmJson(row.custom_fields, {}) || {},
  customFields: drrmJson(row.custom_fields, {}) || {},
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const sendDrrmError = (res, label, err) => {
  console.error(label, err);
  return res.status(500).json({
    success: false,
    message: "DRRM database error",
    error: err?.message || String(err),
  });
};

const insertDrrmChildRows = (table, parentColumn, parentId, valueColumn, values, cb) => {
  const clean = drrmArray(values);
  if (!clean.length) return cb();

  const sql = `INSERT INTO ${table} (${parentColumn}, ${valueColumn}) VALUES ?`;
  const rows = clean.map((value) => [parentId, value]);

  db.query(sql, [rows], cb);
};

// ---------- Dropdowns ----------
app.get("/drrm/dropdowns", (req, res) => {
  db.query(
    `
      SELECT category, option_name
      FROM drrm_dropdown_options
      WHERE is_active = 1
      ORDER BY category ASC, option_name ASC
    `,
    [],
    (err, rows) => {
      if (err) return sendDrrmError(res, "GET /drrm/dropdowns ERROR:", err);

      const output = {
        sector: [],
        iec_title: [],
        iec_source: [],
        stakeholder: [],
      };

      (rows || []).forEach((row) => {
        if (output[row.category]) output[row.category].push(row.option_name);
      });

      res.json(output);
    }
  );
});

app.post("/drrm/dropdowns", (req, res) => {
  const category = String(req.body?.category || "").trim();
  const optionName = String(req.body?.optionName || req.body?.option_name || "").trim();

  const allowed = ["sector", "iec_title", "iec_source", "stakeholder"];
  if (!allowed.includes(category)) return res.status(400).json({ message: "Invalid dropdown category." });
  if (!optionName) return res.status(400).json({ message: "Option name is required." });

  db.query(
    `
      INSERT INTO drrm_dropdown_options (category, option_name, is_active)
      VALUES (?, ?, 1)
      ON DUPLICATE KEY UPDATE is_active = 1, updated_at = CURRENT_TIMESTAMP
    `,
    [category, optionName],
    (err) => {
      if (err) return sendDrrmError(res, "POST /drrm/dropdowns ERROR:", err);
      res.json({ success: true, category, optionName });
    }
  );
});

// ---------- Activities ----------
app.get("/drrm/activities", (req, res) => {
  db.query(
    `
      SELECT
        a.*,
        GROUP_CONCAT(s.sector_name ORDER BY s.id SEPARATOR '|||') AS sectors
      FROM drrm_activities a
      LEFT JOIN drrm_activity_sectors s ON s.activity_id = a.id
      GROUP BY a.id
      ORDER BY a.date_start DESC, a.updated_at DESC, a.created_at DESC, a.id DESC
    `,
    [],
    (err, rows) => {
      if (err) return sendDrrmError(res, "GET /drrm/activities ERROR:", err);
      res.json((rows || []).map(normalizeDrrmActivity));
    }
  );
});

app.post("/drrm/activities", (req, res) => {
  const p = drrmActivityPayload(req.body || {});
  p.custom_fields = req.body?.custom_fields ?? req.body?.customFields ?? {};
  if (!p.title) return res.status(400).json({ message: "Title of Activity is required." });
  if (!p.date_start) return res.status(400).json({ message: "Date Conducted is required." });
  if (!p.sectors.length) return res.status(400).json({ message: "Sector intervention is required." });

  db.query(
    `
      INSERT INTO drrm_activities (
        title, date_start, date_end,
        venue_text, venue_mode, venue_manual_text, venue_display_text,
        venue_province, venue_municipality, venue_barangay, venue_lat, venue_lng,
        co_organizer, male, female, total,
        means_of_verification, remarks, custom_fields
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      p.title, p.date_start, p.date_end,
      p.venue_text, p.venue_mode, p.venue_manual_text, p.venue_display_text,
      p.venue_province, p.venue_municipality, p.venue_barangay, p.venue_lat, p.venue_lng,
      p.co_organizer, p.male, p.female, p.total,
      p.means_of_verification, p.remarks,
      JSON.stringify(p.custom_fields || {}),
    ],
    (err, result) => {
      if (err) return sendDrrmError(res, "POST /drrm/activities INSERT ERROR:", err);

      const id = result.insertId;
      insertDrrmChildRows("drrm_activity_sectors", "activity_id", id, "sector_name", p.sectors, (childErr) => {
        if (childErr) return sendDrrmError(res, "POST /drrm/activities SECTORS ERROR:", childErr);
        res.json({ success: true, id });
      });
    }
  );
});

app.put("/drrm/activities/:id", (req, res) => {
  const id = req.params.id;
  const p = drrmActivityPayload(req.body || {});
  p.custom_fields = req.body?.custom_fields ?? req.body?.customFields ?? {};
  if (!p.title) return res.status(400).json({ message: "Title of Activity is required." });
  if (!p.date_start) return res.status(400).json({ message: "Date Conducted is required." });
  if (!p.sectors.length) return res.status(400).json({ message: "Sector intervention is required." });

  db.query(
    `
      UPDATE drrm_activities
      SET
        title = ?, date_start = ?, date_end = ?,
        venue_text = ?, venue_mode = ?, venue_manual_text = ?, venue_display_text = ?,
        venue_province = ?, venue_municipality = ?, venue_barangay = ?, venue_lat = ?, venue_lng = ?,
        co_organizer = ?, male = ?, female = ?, total = ?,
        means_of_verification = ?, remarks = ?, custom_fields = ?
      WHERE id = ?
    `,
    [
      p.title, p.date_start, p.date_end,
      p.venue_text, p.venue_mode, p.venue_manual_text, p.venue_display_text,
      p.venue_province, p.venue_municipality, p.venue_barangay, p.venue_lat, p.venue_lng,
      p.co_organizer, p.male, p.female, p.total,
      p.means_of_verification, p.remarks,
      JSON.stringify(p.custom_fields || {}),
      id,
    ],
    (err) => {
      if (err) return sendDrrmError(res, "PUT /drrm/activities UPDATE ERROR:", err);

      db.query("DELETE FROM drrm_activity_sectors WHERE activity_id = ?", [id], (delErr) => {
        if (delErr) return sendDrrmError(res, "PUT /drrm/activities DELETE SECTORS ERROR:", delErr);

        insertDrrmChildRows("drrm_activity_sectors", "activity_id", id, "sector_name", p.sectors, (childErr) => {
          if (childErr) return sendDrrmError(res, "PUT /drrm/activities INSERT SECTORS ERROR:", childErr);
          res.json({ success: true, id });
        });
      });
    }
  );
});

app.delete("/drrm/activities/:id", (req, res) => {
  db.query("DELETE FROM drrm_activities WHERE id = ?", [req.params.id], (err) => {
    if (err) return sendDrrmError(res, "DELETE /drrm/activities/:id ERROR:", err);
    res.json({ success: true });
  });
});

// ---------- IEC Materials ----------
app.get("/drrm/iec-materials", (req, res) => {
  db.query(
    `
      SELECT
        i.*,
        GROUP_CONCAT(DISTINCT t.title_name ORDER BY t.id SEPARATOR '|||') AS titles,
        GROUP_CONCAT(DISTINCT s.source_name ORDER BY s.id SEPARATOR '|||') AS sources
      FROM drrm_iec_materials i
      LEFT JOIN drrm_iec_titles t ON t.iec_id = i.id
      LEFT JOIN drrm_iec_sources s ON s.iec_id = i.id
      GROUP BY i.id
      ORDER BY i.date_used DESC, i.updated_at DESC, i.created_at DESC, i.id DESC
    `,
    [],
    (err, rows) => {
      if (err) return sendDrrmError(res, "GET /drrm/iec-materials ERROR:", err);
      res.json((rows || []).map(normalizeDrrmIec));
    }
  );
});

app.post("/drrm/iec-materials", (req, res) => {
  const p = drrmIecPayload(req.body || {});
  p.custom_fields = req.body?.custom_fields ?? req.body?.customFields ?? {};
  if (!p.titles.length) return res.status(400).json({ message: "Title of IEC Material is required." });
  if (!p.sources.length) return res.status(400).json({ message: "Source is required." });
  if (!p.date_used) return res.status(400).json({ message: "Date is required." });

  db.query(
    `
      INSERT INTO drrm_iec_materials (
        date_used, male, female, total, means_of_verification, remarks, custom_fields
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [p.date_used, p.male, p.female, p.total, p.means_of_verification, p.remarks, JSON.stringify(p.custom_fields || {})],
    (err, result) => {
      if (err) return sendDrrmError(res, "POST /drrm/iec-materials INSERT ERROR:", err);

      const id = result.insertId;
      insertDrrmChildRows("drrm_iec_titles", "iec_id", id, "title_name", p.titles, (titleErr) => {
        if (titleErr) return sendDrrmError(res, "POST /drrm/iec-materials TITLES ERROR:", titleErr);

        insertDrrmChildRows("drrm_iec_sources", "iec_id", id, "source_name", p.sources, (sourceErr) => {
          if (sourceErr) return sendDrrmError(res, "POST /drrm/iec-materials SOURCES ERROR:", sourceErr);
          res.json({ success: true, id });
        });
      });
    }
  );
});

app.put("/drrm/iec-materials/:id", (req, res) => {
  const id = req.params.id;
  const p = drrmIecPayload(req.body || {});
  p.custom_fields = req.body?.custom_fields ?? req.body?.customFields ?? {};
  if (!p.titles.length) return res.status(400).json({ message: "Title of IEC Material is required." });
  if (!p.sources.length) return res.status(400).json({ message: "Source is required." });
  if (!p.date_used) return res.status(400).json({ message: "Date is required." });

  db.query(
    `
      UPDATE drrm_iec_materials
      SET date_used = ?, male = ?, female = ?, total = ?, means_of_verification = ?, remarks = ?, custom_fields = ?
      WHERE id = ?
    `,
    [p.date_used, p.male, p.female, p.total, p.means_of_verification, p.remarks, JSON.stringify(p.custom_fields || {}), id],
    (err) => {
      if (err) return sendDrrmError(res, "PUT /drrm/iec-materials UPDATE ERROR:", err);

      db.query("DELETE FROM drrm_iec_titles WHERE iec_id = ?", [id], (delTitleErr) => {
        if (delTitleErr) return sendDrrmError(res, "PUT /drrm/iec-materials DELETE TITLES ERROR:", delTitleErr);

        db.query("DELETE FROM drrm_iec_sources WHERE iec_id = ?", [id], (delSourceErr) => {
          if (delSourceErr) return sendDrrmError(res, "PUT /drrm/iec-materials DELETE SOURCES ERROR:", delSourceErr);

          insertDrrmChildRows("drrm_iec_titles", "iec_id", id, "title_name", p.titles, (titleErr) => {
            if (titleErr) return sendDrrmError(res, "PUT /drrm/iec-materials INSERT TITLES ERROR:", titleErr);

            insertDrrmChildRows("drrm_iec_sources", "iec_id", id, "source_name", p.sources, (sourceErr) => {
              if (sourceErr) return sendDrrmError(res, "PUT /drrm/iec-materials INSERT SOURCES ERROR:", sourceErr);
              res.json({ success: true, id });
            });
          });
        });
      });
    }
  );
});

app.delete("/drrm/iec-materials/:id", (req, res) => {
  db.query("DELETE FROM drrm_iec_materials WHERE id = ?", [req.params.id], (err) => {
    if (err) return sendDrrmError(res, "DELETE /drrm/iec-materials/:id ERROR:", err);
    res.json({ success: true });
  });
});

// ---------- Collaborations ----------
app.get("/drrm/collaborations", (req, res) => {
  db.query(
    `
      SELECT
        c.*,
        GROUP_CONCAT(s.stakeholder_name ORDER BY s.id SEPARATOR '|||') AS stakeholders
      FROM drrm_collaborations c
      LEFT JOIN drrm_collaboration_stakeholders s ON s.collaboration_id = c.id
      GROUP BY c.id
      ORDER BY c.activity_date DESC, c.updated_at DESC, c.created_at DESC, c.id DESC
    `,
    [],
    (err, rows) => {
      if (err) return sendDrrmError(res, "GET /drrm/collaborations ERROR:", err);
      res.json((rows || []).map(normalizeDrrmCollab));
    }
  );
});

app.post("/drrm/collaborations", (req, res) => {
  const p = drrmCollabPayload(req.body || {});
  if (!p.title) return res.status(400).json({ message: "Title of Activity is required." });
  if (!p.stakeholders.length) return res.status(400).json({ message: "Stakeholder is required." });
  if (!p.activity_date) return res.status(400).json({ message: "Date is required." });

  db.query(
    `
      INSERT INTO drrm_collaborations (
        title, activity_date, means_of_verification, remarks
      )
      VALUES (?, ?, ?, ?)
    `,
    [p.title, p.activity_date, p.means_of_verification, p.remarks],
    (err, result) => {
      if (err) return sendDrrmError(res, "POST /drrm/collaborations INSERT ERROR:", err);

      const id = result.insertId;
      insertDrrmChildRows(
        "drrm_collaboration_stakeholders",
        "collaboration_id",
        id,
        "stakeholder_name",
        p.stakeholders,
        (childErr) => {
          if (childErr) return sendDrrmError(res, "POST /drrm/collaborations STAKEHOLDERS ERROR:", childErr);
          res.json({ success: true, id });
        }
      );
    }
  );
});

app.put("/drrm/collaborations/:id", (req, res) => {
  const id = req.params.id;
  const p = drrmCollabPayload(req.body || {});
  if (!p.title) return res.status(400).json({ message: "Title of Activity is required." });
  if (!p.stakeholders.length) return res.status(400).json({ message: "Stakeholder is required." });
  if (!p.activity_date) return res.status(400).json({ message: "Date is required." });

  db.query(
    `
      UPDATE drrm_collaborations
      SET title = ?, activity_date = ?, means_of_verification = ?, remarks = ?
      WHERE id = ?
    `,
    [p.title, p.activity_date, p.means_of_verification, p.remarks, id],
    (err) => {
      if (err) return sendDrrmError(res, "PUT /drrm/collaborations UPDATE ERROR:", err);

      db.query("DELETE FROM drrm_collaboration_stakeholders WHERE collaboration_id = ?", [id], (delErr) => {
        if (delErr) return sendDrrmError(res, "PUT /drrm/collaborations DELETE STAKEHOLDERS ERROR:", delErr);

        insertDrrmChildRows(
          "drrm_collaboration_stakeholders",
          "collaboration_id",
          id,
          "stakeholder_name",
          p.stakeholders,
          (childErr) => {
            if (childErr) return sendDrrmError(res, "PUT /drrm/collaborations INSERT STAKEHOLDERS ERROR:", childErr);
            res.json({ success: true, id });
          }
        );
      });
    }
  );
});

app.delete("/drrm/collaborations/:id", (req, res) => {
  db.query("DELETE FROM drrm_collaborations WHERE id = ?", [req.params.id], (err) => {
    if (err) return sendDrrmError(res, "DELETE /drrm/collaborations/:id ERROR:", err);
    res.json({ success: true });
  });
});

// ---------- PSCP ----------
app.get("/drrm/pscp/:year", (req, res) => {
  const year = Number(req.params.year) || new Date().getFullYear();

  db.query(
    `
      SELECT item_type, q1, q2, q3, q4
      FROM drrm_pscp
      WHERE year_value = ?
    `,
    [year],
    (err, rows) => {
      if (err) return sendDrrmError(res, "GET /drrm/pscp/:year ERROR:", err);

      const output = {
        crafted: { q1: "", q2: "", q3: "", q4: "" },
        implemented: { q1: "", q2: "", q3: "", q4: "" },
      };

      (rows || []).forEach((row) => {
        if (output[row.item_type]) {
          output[row.item_type] = {
            q1: row.q1 || "",
            q2: row.q2 || "",
            q3: row.q3 || "",
            q4: row.q4 || "",
          };
        }
      });

      res.json(output);
    }
  );
});

app.put("/drrm/pscp/:year", (req, res) => {
  const year = Number(req.params.year) || new Date().getFullYear();
  const crafted = req.body?.crafted || {};
  const implemented = req.body?.implemented || {};

  const upsertOne = (itemType, item, cb) => {
    db.query(
      `
        INSERT INTO drrm_pscp (year_value, item_type, q1, q2, q3, q4)
        VALUES (?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          q1 = VALUES(q1),
          q2 = VALUES(q2),
          q3 = VALUES(q3),
          q4 = VALUES(q4),
          updated_at = CURRENT_TIMESTAMP
      `,
      [year, itemType, item.q1 || null, item.q2 || null, item.q3 || null, item.q4 || null],
      cb
    );
  };

  upsertOne("crafted", crafted, (craftedErr) => {
    if (craftedErr) return sendDrrmError(res, "PUT /drrm/pscp/:year CRAFTED ERROR:", craftedErr);

    upsertOne("implemented", implemented, (implementedErr) => {
      if (implementedErr) return sendDrrmError(res, "PUT /drrm/pscp/:year IMPLEMENTED ERROR:", implementedErr);
      res.json({ success: true, year });
    });
  });
});




// ===========================
// TABLE MANAGEMENT ROUTES
// ===========================

// GET full table management config
app.get("/table-management/config", (req, res) => {
  const sql = `
    SELECT
      m.id AS module_id,
      m.module_name,
      m.display_order AS module_order,

      t.id AS table_id,
      t.table_name,
      t.display_name,
      t.display_order AS table_order,

      f.id AS field_id,
      f.field_label,
      f.field_key,
      f.field_type,
      f.is_required,
      f.is_visible,
      f.show_add,
      f.show_edit,
      f.sort_order,
      f.is_system_field,

      s.id AS settings_id,
      s.rows_per_page,
      s.allow_search,
      s.allow_export,
      s.allow_print,
      s.show_actions,
      s.default_sort
    FROM table_management_modules m
    LEFT JOIN table_management_tables t
      ON t.module_id = m.id AND t.is_active = 1
    LEFT JOIN table_management_fields f
      ON f.table_id = t.id
    LEFT JOIN table_management_settings s
      ON s.table_id = t.id
    WHERE m.is_active = 1
    ORDER BY m.display_order, t.display_order, f.sort_order
  `;

  db.query(sql, (err, rows) => {
    if (err) {
      console.error("GET /table-management/config ERROR:", err);
      return res.status(500).json({ message: err.message });
    }

    const modulesMap = {};

    (rows || []).forEach((row) => {
      if (!modulesMap[row.module_id]) {
        modulesMap[row.module_id] = {
          id: row.module_id,
          moduleName: row.module_name,
          displayOrder: row.module_order,
          tables: [],
        };
      }

      const moduleObj = modulesMap[row.module_id];

      if (row.table_id) {
        let tableObj = moduleObj.tables.find((x) => x.id === row.table_id);

        if (!tableObj) {
          tableObj = {
            id: row.table_id,
            tableName: row.table_name,
            displayName: row.display_name,
            displayOrder: row.table_order,
            settings: {
              id: row.settings_id,
              rowsPerPage: row.rows_per_page,
              allowSearch: Boolean(row.allow_search),
              allowExport: Boolean(row.allow_export),
              allowPrint: Boolean(row.allow_print),
              showActions: Boolean(row.show_actions),
              defaultSort: row.default_sort,
            },
            fields: [],
          };

          moduleObj.tables.push(tableObj);
        }

        if (row.field_id) {
          tableObj.fields.push({
            id: row.field_id,
            fieldLabel: row.field_label,
            fieldKey: row.field_key,
            fieldType: row.field_type,
            isRequired: Boolean(row.is_required),
            isVisible: Boolean(row.is_visible),
            showAdd: Boolean(row.show_add),
            showEdit: Boolean(row.show_edit),
            sortOrder: row.sort_order,
            isSystemField: Boolean(row.is_system_field),
          });
        }
      }
    });

    res.json(Object.values(modulesMap));
  });
});

// GET dropdowns with options
app.get("/table-management/dropdowns", (req, res) => {
  const sql = `
    SELECT
      d.id AS dropdown_id,
      d.module_id,
      d.table_id,
      d.dropdown_name,
      d.display_order AS dropdown_order,

      o.id AS option_id,
      o.option_value,
      o.display_order AS option_order,

      m.module_name,
      t.display_name
    FROM table_management_dropdowns d
    JOIN table_management_modules m ON m.id = d.module_id
    LEFT JOIN table_management_tables t ON t.id = d.table_id
    LEFT JOIN table_management_dropdown_options o ON o.dropdown_id = d.id
    WHERE d.is_active = 1
    ORDER BY m.display_order, t.display_order, d.display_order, o.display_order
  `;

  db.query(sql, (err, rows) => {
    if (err) {
      console.error("GET /table-management/dropdowns ERROR:", err);
      return res.status(500).json({ message: err.message });
    }

    const dropdownMap = {};

    (rows || []).forEach((row) => {
      if (!dropdownMap[row.dropdown_id]) {
        dropdownMap[row.dropdown_id] = {
          id: row.dropdown_id,
          moduleId: row.module_id,
          tableId: row.table_id,
          moduleName: row.module_name,
          tableName: row.display_name,
          dropdownName: row.dropdown_name,
          displayOrder: row.dropdown_order,
          options: [],
        };
      }

      if (row.option_id) {
        dropdownMap[row.dropdown_id].options.push({
          id: row.option_id,
          optionValue: row.option_value,
          displayOrder: row.option_order,
        });
      }
    });

    res.json(Object.values(dropdownMap));
  });
});

// CREATE field
app.post("/table-management/fields", (req, res) => {
  const b = req.body || {};

  const sql = `
    INSERT INTO table_management_fields
    (
      module_id,
      table_id,
      field_label,
      field_key,
      field_type,
      is_required,
      is_visible,
      show_add,
      show_edit,
      sort_order,
      is_system_field
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
  `;

  db.query(
    sql,
    [
      Number(b.moduleId),
      Number(b.tableId),
      String(b.fieldLabel || "").trim(),
      String(b.fieldKey || "").trim(),
      String(b.fieldType || "Text").trim(),
      b.isRequired ? 1 : 0,
      b.isVisible === false ? 0 : 1,
      b.showAdd === false ? 0 : 1,
      b.showEdit === false ? 0 : 1,
      Number(b.sortOrder || 0),
    ],
    (err, result) => {
      if (err) {
        console.error("POST /table-management/fields ERROR:", err);
        return res.status(500).json({ message: err.message });
      }

      res.json({ success: true, id: result.insertId });
    }
  );
});

// UPDATE field
app.put("/table-management/fields/:id", (req, res) => {
  const b = req.body || {};

  const sql = `
    UPDATE table_management_fields SET
      field_label = ?,
      field_key = ?,
      field_type = ?,
      is_required = ?,
      is_visible = ?,
      show_add = ?,
      show_edit = ?,
      sort_order = ?
    WHERE id = ? AND is_system_field = 0
  `;

  db.query(
    sql,
    [
      String(b.fieldLabel || "").trim(),
      String(b.fieldKey || "").trim(),
      String(b.fieldType || "Text").trim(),
      b.isRequired ? 1 : 0,
      b.isVisible === false ? 0 : 1,
      b.showAdd === false ? 0 : 1,
      b.showEdit === false ? 0 : 1,
      Number(b.sortOrder || 0),
      req.params.id,
    ],
    (err, result) => {
      if (err) {
        console.error("PUT /table-management/fields/:id ERROR:", err);
        return res.status(500).json({ message: err.message });
      }

      res.json({ success: true, affectedRows: result.affectedRows });
    }
  );
});

// DELETE field
app.delete("/table-management/fields/:id", (req, res) => {
  db.query(
    "DELETE FROM table_management_fields WHERE id = ? AND is_system_field = 0",
    [req.params.id],
    (err, result) => {
      if (err) {
        console.error("DELETE /table-management/fields/:id ERROR:", err);
        return res.status(500).json({ message: err.message });
      }

      res.json({ success: true, affectedRows: result.affectedRows });
    }
  );
});

// CREATE dropdown
app.post("/table-management/dropdowns", (req, res) => {
  const b = req.body || {};

  const sql = `
    INSERT INTO table_management_dropdowns
    (module_id, table_id, dropdown_name, display_order)
    VALUES (?, ?, ?, ?)
  `;

  db.query(
    sql,
    [
      Number(b.moduleId),
      Number(b.tableId),
      String(b.dropdownName || "").trim(),
      Number(b.displayOrder || 0),
    ],
    (err, result) => {
      if (err) {
        console.error("POST /table-management/dropdowns ERROR:", err);
        return res.status(500).json({ message: err.message });
      }

      res.json({ success: true, id: result.insertId });
    }
  );
});

// UPDATE dropdown
app.put("/table-management/dropdowns/:id", (req, res) => {
  const b = req.body || {};

  db.query(
    `
    UPDATE table_management_dropdowns SET
      dropdown_name = ?,
      display_order = ?
    WHERE id = ?
    `,
    [
      String(b.dropdownName || "").trim(),
      Number(b.displayOrder || 0),
      req.params.id,
    ],
    (err, result) => {
      if (err) {
        console.error("PUT /table-management/dropdowns/:id ERROR:", err);
        return res.status(500).json({ message: err.message });
      }

      res.json({ success: true, affectedRows: result.affectedRows });
    }
  );
});

// DELETE dropdown
app.delete("/table-management/dropdowns/:id", (req, res) => {
  db.query(
    "DELETE FROM table_management_dropdowns WHERE id = ?",
    [req.params.id],
    (err, result) => {
      if (err) {
        console.error("DELETE /table-management/dropdowns/:id ERROR:", err);
        return res.status(500).json({ message: err.message });
      }

      res.json({ success: true, affectedRows: result.affectedRows });
    }
  );
});

// CREATE dropdown option
app.post("/table-management/dropdown-options", (req, res) => {
  const b = req.body || {};

  db.query(
    `
    INSERT INTO table_management_dropdown_options
    (dropdown_id, option_value, display_order)
    VALUES (?, ?, ?)
    `,
    [
      Number(b.dropdownId),
      String(b.optionValue || "").trim(),
      Number(b.displayOrder || 0),
    ],
    (err, result) => {
      if (err) {
        console.error("POST /table-management/dropdown-options ERROR:", err);
        return res.status(500).json({ message: err.message });
      }

      res.json({ success: true, id: result.insertId });
    }
  );
});

// DELETE dropdown option
app.delete("/table-management/dropdown-options/:id", (req, res) => {
  db.query(
    "DELETE FROM table_management_dropdown_options WHERE id = ?",
    [req.params.id],
    (err, result) => {
      if (err) {
        console.error("DELETE /table-management/dropdown-options/:id ERROR:", err);
        return res.status(500).json({ message: err.message });
      }

      res.json({ success: true, affectedRows: result.affectedRows });
    }
  );
});

// UPDATE table settings
app.put("/table-management/settings/:id", (req, res) => {
  const b = req.body || {};

  db.query(
    `
    UPDATE table_management_settings SET
      rows_per_page = ?,
      allow_search = ?,
      allow_export = ?,
      allow_print = ?,
      show_actions = ?,
      default_sort = ?
    WHERE id = ?
    `,
    [
      Number(b.rowsPerPage || 10),
      b.allowSearch === false ? 0 : 1,
      b.allowExport === false ? 0 : 1,
      b.allowPrint === false ? 0 : 1,
      b.showActions === false ? 0 : 1,
      String(b.defaultSort || "latest_first").trim(),
      req.params.id,
    ],
    (err, result) => {
      if (err) {
        console.error("PUT /table-management/settings/:id ERROR:", err);
        return res.status(500).json({ message: err.message });
      }

      res.json({ success: true, affectedRows: result.affectedRows });
    }
  );
});


// SAVE selected table management field configuration
app.post("/table-management/config/save", async (req, res) => {
  const b = req.body || {};
  const fields = Array.isArray(b.fields) ? b.fields : [];

  const editableFields = fields.filter(
    (f) => Number.isFinite(Number(f.id)) && !f.isSystemField
  );

  if (editableFields.length === 0) {
    return res.json({
      success: true,
      message: "No editable fields to save.",
      saved: 0,
    });
  }

  const runQuery = (sql, params) =>
    new Promise((resolve, reject) => {
      db.query(sql, params, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });

  try {
    for (let i = 0; i < editableFields.length; i += 1) {
      const f = editableFields[i];

      await runQuery(
        `
          UPDATE table_management_fields SET
            field_label = ?,
            field_type = ?,
            is_required = ?,
            is_visible = ?,
            show_add = ?,
            show_edit = ?,
            sort_order = ?
          WHERE id = ? AND is_system_field = 0
        `,
        [
          String(f.fieldLabel || f.label || "").trim(),
          String(f.fieldType || f.type || "Text").trim(),
          f.isRequired || f.required ? 1 : 0,
          f.isVisible === false || f.visible === false ? 0 : 1,
          f.showAdd === false ? 0 : 1,
          f.showEdit === false ? 0 : 1,
          Number(f.sortOrder || i + 1),
          Number(f.id),
        ]
      );
    }

    res.json({
      success: true,
      message: "Table configuration saved.",
      saved: editableFields.length,
    });
  } catch (err) {
    console.error("POST /table-management/config/save ERROR:", err);
    res.status(500).json({ message: err.message });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
});
