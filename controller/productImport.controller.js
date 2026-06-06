const {
  importWorkbookFromBuffer,
} = require("../services/productImport.service");
const {
  generateTemplateBuffer,
} = require("../services/productImportTemplate.service");

// POST /api/product/import-excel?mode=validate|commit
// Multipart upload, field name: "file". One workbook with
// Categories / Brands / ProductTypes / Products sheets.
exports.importProductsExcel = async (req, res, next) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({
        success: false,
        message: "No Excel file uploaded. Send the file in the 'file' field.",
      });
    }

    const mode = req.query.mode === "validate" ? "validate" : "commit";
    const result = await importWorkbookFromBuffer(req.file.buffer, mode);

    const p = result.products || { inserted: 0 };
    const message =
      mode === "validate"
        ? "Validation complete. Nothing was saved."
        : `Import complete. ${p.inserted} product(s) added` +
          `, categories +${result.categories.created} (${result.categories.skipped} existing skipped)` +
          `, brands +${result.brands.created} (${result.brands.skipped} existing skipped)` +
          `, types +${result.productTypes.created} (${result.productTypes.skipped} existing skipped).`;

    res.status(200).json({ success: true, message, data: result });
  } catch (error) {
    next(error);
  }
};

// GET /api/product/import-template
// Streams a freshly generated workbook with lookup sheets pre-filled.
exports.downloadProductTemplate = async (req, res, next) => {
  try {
    const buffer = await generateTemplateBuffer();
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="cuideo-product-import.xlsx"'
    );
    res.status(200).send(Buffer.from(buffer));
  } catch (error) {
    next(error);
  }
};
