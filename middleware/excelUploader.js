const multer = require("multer");
const path = require("path");

// Keep the uploaded spreadsheet in memory only — we parse it from the buffer
// and never persist it to disk (unlike the image uploader).
const storage = multer.memoryStorage();

const supportedExt = /\.(xlsx|xls)$/i;
const supportedMime = new Set([
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "application/vnd.ms-excel", // .xls
  "application/octet-stream", // some browsers send this for .xlsx
]);

const excelUploader = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const extOk = supportedExt.test(path.extname(file.originalname));
    const mimeOk = supportedMime.has(file.mimetype);
    if (extOk && mimeOk) {
      cb(null, true);
    } else {
      cb(new Error("Must be an Excel file (.xlsx or .xls)"));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  },
});

module.exports = excelUploader;
