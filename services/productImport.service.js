const ExcelJS = require("exceljs");
const Product = require("../model/Products");
const Brand = require("../model/Brand");
const Category = require("../model/Category");
const ProductsType = require("../model/ProductsType");
const {
  SHEET,
  CATEGORY_STATUS_VALUES,
  BRAND_STATUS_VALUES,
  COLOR_OPTIONS,
  CATEGORY_COLUMNS,
  BRAND_COLUMNS,
  PRODUCT_TYPE_COLUMNS,
  PRODUCT_COLUMNS,
} = require("../utils/productImportSchema");

// name -> { name, code } lookup for the fixed colour palette
const COLOR_BY_NAME = new Map(
  COLOR_OPTIONS.map((c) => [c.name.toLowerCase(), c])
);

// Used when a product row is imported without an image. The schema requires a
// non-empty image string, so we store this marker; the UI shows a "No Image"
// box instead of trying to render it, and the admin can upload the real image
// later on the product's edit page. Override via the DEFAULT_PRODUCT_IMAGE env var.
const DEFAULT_PRODUCT_IMAGE = process.env.DEFAULT_PRODUCT_IMAGE || "NO_IMAGE";

// ---------------- generic helpers ----------------

const slugify = (str) =>
  String(str || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const normalizeHeader = (h) =>
  String(h || "")
    .replace(/\*/g, "")
    .trim()
    .toLowerCase();

// ExcelJS cell values may be plain, hyperlink objects, rich text or formula results.
const cellToValue = (raw) => {
  if (raw === null || raw === undefined) return "";
  if (typeof raw === "object") {
    if (raw instanceof Date) return raw;
    if (typeof raw.text === "string") return raw.text;
    if (raw.hyperlink) return raw.hyperlink;
    if (raw.result !== undefined) return raw.result;
    if (Array.isArray(raw.richText)) return raw.richText.map((t) => t.text).join("");
    return "";
  }
  return raw;
};

const asTrimmedString = (v) => (v === 0 ? "0" : String(v ?? "").trim());
const isHttpUrl = (s) => /^https?:\/\/.+/i.test(String(s).trim());
const splitPipe = (s) =>
  String(s).split(/[|\n]/).map((x) => x.trim()).filter(Boolean);
const splitCsv = (s) =>
  String(s).split(",").map((x) => x.trim()).filter(Boolean);
// For image lists: accept comma, pipe, or newline as the separator.
const splitUrlList = (s) =>
  String(s).split(/[|,\n]/).map((x) => x.trim()).filter(Boolean);

// Read a worksheet into [{ rowNumber, record }] using a column definition list.
const parseSheet = (worksheet, columns) => {
  if (!worksheet) return [];

  const headerLookup = new Map(columns.map((c) => [normalizeHeader(c.header), c.key]));
  const colKeyByIndex = {};
  worksheet.getRow(1).eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const key = headerLookup.get(normalizeHeader(cellToValue(cell.value)));
    if (key) colKeyByIndex[colNumber] = key;
  });

  const rows = [];
  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;
    const record = {};
    let hasValue = false;
    Object.entries(colKeyByIndex).forEach(([colNumber, key]) => {
      const value = cellToValue(row.getCell(Number(colNumber)).value);
      record[key] = value;
      if (asTrimmedString(value) !== "") hasValue = true;
    });
    if (hasValue) rows.push({ rowNumber, record });
  });
  return rows;
};

// ---------------- reference data ----------------

const loadReferenceData = async () => {
  const [categories, brands, productTypes] = await Promise.all([
    Category.find({}, { parent: 1, children: 1, productType: 1 }).lean(),
    Brand.find({}, { name: 1 }).lean(),
    ProductsType.find({}, { name: 1 }).lean(),
  ]);

  const categoryByName = new Map();
  categories.forEach((c) =>
    categoryByName.set(String(c.parent).toLowerCase(), {
      id: c._id,
      name: c.parent,
      children: (c.children || []).map(String),
      productType: c.productType,
    })
  );
  const brandByName = new Map();
  brands.forEach((b) => brandByName.set(String(b.name).toLowerCase(), b));
  const productTypeByName = new Map();
  productTypes.forEach((p) => productTypeByName.set(String(p.name).toLowerCase(), p));

  return { categoryByName, brandByName, productTypeByName };
};

// Merge categories/brands/types declared in the sheets onto the DB refs.
// Used for the dry-run so products can validate against not-yet-created lookups.
const mergeSheetRefs = (refs, categoryRows, brandRows, typeRows) => {
  categoryRows.forEach(({ record }) => {
    const name = asTrimmedString(record.category_name);
    if (!name) return;
    const key = name.toLowerCase();
    const children = record.subcategories ? splitPipe(record.subcategories) : [];
    if (refs.categoryByName.has(key)) {
      const existing = refs.categoryByName.get(key);
      existing.children = Array.from(new Set([...existing.children, ...children]));
    } else {
      refs.categoryByName.set(key, { id: null, name, children, productType: record.productType });
    }
  });
  brandRows.forEach(({ record }) => {
    const name = asTrimmedString(record.name);
    if (name && !refs.brandByName.has(name.toLowerCase()))
      refs.brandByName.set(name.toLowerCase(), { _id: null, name });
  });
  typeRows.forEach(({ record }) => {
    const name = asTrimmedString(record.name);
    if (name && !refs.productTypeByName.has(name.toLowerCase()))
      refs.productTypeByName.set(name.toLowerCase(), { _id: null, name });
  });
  return refs;
};

// ---------------- lookup-table importers (upsert) ----------------

const importCategoriesSheet = async (rows) => {
  const result = { created: 0, skipped: 0, errors: [] };
  if (rows.length === 0) return result;

  const existing = await Category.find({}).select("parent");
  const existingNames = new Set(existing.map((c) => String(c.parent).toLowerCase()));
  const seenInFile = new Set();

  for (const { rowNumber, record } of rows) {
    const name = asTrimmedString(record.category_name);
    if (!name) {
      result.errors.push({ sheet: SHEET.CATEGORIES, row: rowNumber, name, messages: ["Missing required field: category_name"] });
      continue;
    }

    const key = name.toLowerCase();
    // Already in the database, or already created earlier in this file -> skip.
    if (existingNames.has(key) || seenInFile.has(key)) {
      result.skipped += 1;
      continue;
    }
    seenInFile.add(key);

    // Validate only the rows we are about to create.
    const messages = [];
    const productType = asTrimmedString(record.productType);
    const children = record.subcategories ? splitPipe(record.subcategories) : [];
    const img = asTrimmedString(record.image);
    const description = asTrimmedString(record.description);
    const status = asTrimmedString(record.status) || "Show";

    if (!productType) messages.push("Missing required field: productType (needed to create a new category)");
    if (img && !isHttpUrl(img)) messages.push("image must be a full URL");
    if (status && !CATEGORY_STATUS_VALUES.includes(status))
      messages.push(`status must be one of: ${CATEGORY_STATUS_VALUES.join(", ")}`);

    if (messages.length) {
      result.errors.push({ sheet: SHEET.CATEGORIES, row: rowNumber, name, messages });
      continue;
    }

    try {
      await Category.create({ parent: name, productType, children, img: img || undefined, description: description || undefined, status });
      result.created += 1;
    } catch (err) {
      result.errors.push({ sheet: SHEET.CATEGORIES, row: rowNumber, name, messages: [err.message] });
    }
  }
  return result;
};

const importBrandsSheet = async (rows) => {
  const result = { created: 0, skipped: 0, errors: [] };
  if (rows.length === 0) return result;

  const existing = await Brand.find({}).select("name");
  const existingNames = new Set(existing.map((b) => String(b.name).toLowerCase()));
  const seenInFile = new Set();

  for (const { rowNumber, record } of rows) {
    const name = asTrimmedString(record.name);
    if (!name) {
      result.errors.push({ sheet: SHEET.BRANDS, row: rowNumber, name, messages: ["Missing required field: name"] });
      continue;
    }

    const key = name.toLowerCase();
    if (existingNames.has(key) || seenInFile.has(key)) {
      result.skipped += 1;
      continue;
    }
    seenInFile.add(key);

    const messages = [];
    const logo = asTrimmedString(record.logo);
    const status = asTrimmedString(record.status) || "active";
    if (logo && !isHttpUrl(logo)) messages.push("logo must be a full URL");
    if (status && !BRAND_STATUS_VALUES.includes(status))
      messages.push(`status must be one of: ${BRAND_STATUS_VALUES.join(", ")}`);

    if (messages.length) {
      result.errors.push({ sheet: SHEET.BRANDS, row: rowNumber, name, messages });
      continue;
    }

    try {
      await Brand.create({
        name,
        status,
        logo: logo || undefined,
        description: asTrimmedString(record.description) || undefined,
        email: asTrimmedString(record.email) || undefined,
        website: asTrimmedString(record.website) || undefined,
        location: asTrimmedString(record.location) || undefined,
      });
      result.created += 1;
    } catch (err) {
      result.errors.push({ sheet: SHEET.BRANDS, row: rowNumber, name, messages: [err.message] });
    }
  }
  return result;
};

const importProductTypesSheet = async (rows) => {
  const result = { created: 0, skipped: 0, errors: [] };
  if (rows.length === 0) return result;

  const existing = await ProductsType.find({}).select("name");
  const existingNames = new Set(existing.map((p) => String(p.name).toLowerCase()));
  const seenInFile = new Set();

  for (const { rowNumber, record } of rows) {
    const name = asTrimmedString(record.name);
    if (!name) {
      result.errors.push({ sheet: SHEET.PRODUCT_TYPES, row: rowNumber, name, messages: ["Missing required field: name"] });
      continue;
    }

    const key = name.toLowerCase();
    if (existingNames.has(key) || seenInFile.has(key)) {
      result.skipped += 1;
      continue;
    }
    seenInFile.add(key);

    const messages = [];
    const image = asTrimmedString(record.image);
    if (name.length < 3 || name.length > 200)
      messages.push("name must be between 3 and 200 characters");
    if (image && !isHttpUrl(image)) messages.push("image must be a full URL");

    if (messages.length) {
      result.errors.push({ sheet: SHEET.PRODUCT_TYPES, row: rowNumber, name, messages });
      continue;
    }

    try {
      await ProductsType.create({ name, image: image || undefined });
      result.created += 1;
    } catch (err) {
      result.errors.push({ sheet: SHEET.PRODUCT_TYPES, row: rowNumber, name, messages: [err.message] });
    }
  }
  return result;
};

// ---------------- product row builder ----------------

const buildProductFromRow = (record, refs, errors) => {
  const get = (k) => asTrimmedString(record[k]);
  const product = {};

  const title = get("title");
  if (!title) errors.push("Missing required field: title");
  else product.title = title;

  const sku = get("sku");
  if (!sku) errors.push("Missing required field: sku");
  else product.sku = sku;

  const toNumber = (k, label) => {
    const raw = get(k);
    if (raw === "") return undefined;
    const n = Number(raw);
    if (Number.isNaN(n)) {
      errors.push(`${label} must be a number (got "${raw}")`);
      return undefined;
    }
    return n;
  };

  const price = toNumber("price", "price");
  if (get("price") === "") errors.push("Missing required field: price");
  else if (price !== undefined && price < 0) errors.push("price must be >= 0");
  else if (price !== undefined) product.price = price;

  const quantity = toNumber("quantity", "quantity");
  if (get("quantity") === "") errors.push("Missing required field: quantity");
  else if (quantity !== undefined && quantity < 0) errors.push("quantity must be >= 0");
  else if (quantity !== undefined) product.quantity = quantity;

  const discount = toNumber("discount", "discount");
  if (discount !== undefined) {
    if (discount < 0) errors.push("discount must be >= 0");
    else if (price !== undefined && discount > price)
      errors.push("discount must not be greater than price");
    else product.discount = discount;
  } else {
    product.discount = 0;
  }

  const colorName = get("color_name");
  if (!colorName) {
    errors.push("Missing required field: color_name");
  } else {
    // Resolve the hex code from the fixed palette; fall back to the raw name
    // (with empty code) if a custom colour was typed.
    const match = COLOR_BY_NAME.get(colorName.toLowerCase());
    product.color = {
      name: match ? match.name : colorName,
      code: match ? match.code : "",
    };
  }

  const image = get("image");
  if (image) {
    if (!isHttpUrl(image)) errors.push("image must be a full URL starting with http(s)://");
    else product.image = image;
  } else {
    // No image provided: store a placeholder; upload the real one later via the edit page.
    product.image = DEFAULT_PRODUCT_IMAGE;
  }

  const additionalRaw = get("additional_images");
  if (additionalRaw) {
    const urls = splitUrlList(additionalRaw);
    const bad = urls.filter((u) => !isHttpUrl(u));
    if (bad.length) errors.push(`additional_images contains ${bad.length} value(s) that are not valid URLs`);
    else product.additionalImages = urls;
  } else {
    product.additionalImages = [];
  }

  const categoryName = get("category_name");
  if (!categoryName) {
    errors.push("Missing required field: category_name");
  } else {
    const cat = refs.categoryByName.get(categoryName.toLowerCase());
    if (!cat) {
      errors.push(`Category "${categoryName}" was not found (add it to the Categories sheet)`);
    } else {
      product.category = { id: cat.id, name: cat.name };
      product.parent = cat.name;
      const subcategory = get("subcategory");
      if (subcategory) {
        const match = cat.children.some((ch) => ch.toLowerCase() === subcategory.toLowerCase());
        if (!match) errors.push(`Sub-category "${subcategory}" is not a child of category "${cat.name}"`);
        else product.children = [subcategory];
      } else {
        product.children = [];
      }
    }
  }

  const brandName = get("brand_name");
  if (!brandName) {
    errors.push("Missing required field: brand_name");
  } else {
    const brand = refs.brandByName.get(brandName.toLowerCase());
    if (!brand) errors.push(`Brand "${brandName}" was not found (add it to the Brands sheet)`);
    else product.brand = { id: brand._id, name: brand.name };
  }

  const productTypeName = get("productType_name");
  if (!productTypeName) {
    errors.push("Missing required field: productType_name");
  } else {
    const pt = refs.productTypeByName.get(productTypeName.toLowerCase());
    if (!pt) errors.push(`Product type "${productTypeName}" was not found (add it to the ProductTypes sheet)`);
    else product.productType = { id: pt._id, name: pt.name };
  }

  if (title) product.slug = slugify(title);

  ["unit", "description", "additionalInformation"].forEach((k) => {
    const v = get(k);
    if (v) product[k] = v;
  });

  // Multi-select tags: merge tag_1..tag_5 (deduped, case-preserving).
  const tagValues = [];
  for (let i = 1; i <= 5; i++) {
    const t = get(`tag_${i}`);
    if (t) tagValues.push(t);
  }
  if (tagValues.length) {
    const seenTag = new Set();
    product.tags = tagValues.filter((t) => {
      const k = t.toLowerCase();
      if (seenTag.has(k)) return false;
      seenTag.add(k);
      return true;
    });
  }

  // status is always derived from quantity (no status column in the sheet).
  if (quantity !== undefined) {
    product.status = quantity > 0 ? "in-stock" : "out-of-stock";
  }

  const startRaw = get("offer_start_date");
  const endRaw = get("offer_end_date");
  if (startRaw || endRaw) {
    if (!startRaw || !endRaw) {
      errors.push("offer_start_date and offer_end_date must both be provided together");
    } else {
      const start = new Date(startRaw);
      const end = new Date(endRaw);
      if (Number.isNaN(start.getTime())) errors.push("offer_start_date is not a valid date");
      else if (Number.isNaN(end.getTime())) errors.push("offer_end_date is not a valid date");
      else if (end <= start) errors.push("offer_end_date must be after offer_start_date");
      else product.offerDate = { startDate: start, endDate: end };
    }
  }

  return product;
};

// Validate (and in commit mode insert) the Products sheet rows.
const importProductsSheet = async (rows, refs, mode) => {
  const errors = [];
  const skipped = [];
  const validProducts = [];

  if (rows.length === 0) {
    return { totalRows: 0, validCount: 0, inserted: 0, skipped, errors };
  }

  const candidateSkus = rows.map((r) => asTrimmedString(r.record.sku)).filter(Boolean);
  const existingDocs = await Product.find({ sku: { $in: candidateSkus } }, { sku: 1 }).lean();
  const existingSkuSet = new Set(existingDocs.map((d) => String(d.sku).toLowerCase()));

  const seenInFile = new Map();

  for (const { rowNumber, record } of rows) {
    const rowErrors = [];
    const product = buildProductFromRow(record, refs, rowErrors);
    const skuLower = product.sku ? product.sku.toLowerCase() : "";

    if (skuLower) {
      if (seenInFile.has(skuLower)) {
        skipped.push({ row: rowNumber, sku: product.sku, reason: `Duplicate SKU within the file (first seen on row ${seenInFile.get(skuLower)})` });
        continue;
      }
      seenInFile.set(skuLower, rowNumber);
      if (existingSkuSet.has(skuLower)) {
        skipped.push({ row: rowNumber, sku: product.sku, reason: "A product with this SKU already exists in the database" });
        continue;
      }
    }

    if (rowErrors.length > 0) {
      errors.push({ row: rowNumber, sku: product.sku || "", messages: rowErrors });
      continue;
    }
    validProducts.push(product);
  }

  const out = {
    totalRows: rows.length,
    validCount: validProducts.length,
    inserted: 0,
    skipped,
    errors,
  };

  if (mode !== "commit" || validProducts.length === 0) return out;

  let insertedDocs = [];
  try {
    insertedDocs = await Product.insertMany(validProducts, { ordered: false });
  } catch (err) {
    insertedDocs = err.insertedDocs || [];
    const writeErrors = err.writeErrors || (err.result && err.result.writeErrors) || [];
    writeErrors.forEach((we) => {
      const failed = validProducts[we.index];
      errors.push({ row: null, sku: failed ? failed.sku : "", messages: [we.errmsg || "Database rejected this row"] });
    });
  }

  const brandOps = [];
  const categoryOps = [];
  insertedDocs.forEach((doc) => {
    if (doc.brand && doc.brand.id)
      brandOps.push({ updateOne: { filter: { _id: doc.brand.id }, update: { $addToSet: { products: doc._id } } } });
    if (doc.category && doc.category.id)
      categoryOps.push({ updateOne: { filter: { _id: doc.category.id }, update: { $addToSet: { products: doc._id } } } });
  });
  await Promise.all([
    brandOps.length ? Brand.bulkWrite(brandOps) : Promise.resolve(),
    categoryOps.length ? Category.bulkWrite(categoryOps) : Promise.resolve(),
  ]);

  out.inserted = insertedDocs.length;
  return out;
};

// ---------------- orchestration ----------------

const importWorkbookFromBuffer = async (buffer, mode = "commit") => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const productSheet =
    workbook.getWorksheet(SHEET.PRODUCTS) ||
    workbook.worksheets.find((w) => w.name !== SHEET.CATEGORIES && w.name !== SHEET.BRANDS && w.name !== SHEET.PRODUCT_TYPES);

  const categoryRows = parseSheet(workbook.getWorksheet(SHEET.CATEGORIES), CATEGORY_COLUMNS);
  const brandRows = parseSheet(workbook.getWorksheet(SHEET.BRANDS), BRAND_COLUMNS);
  const typeRows = parseSheet(workbook.getWorksheet(SHEET.PRODUCT_TYPES), PRODUCT_TYPE_COLUMNS);
  const productRows = parseSheet(productSheet, PRODUCT_COLUMNS);

  const summary = { mode, categories: null, brands: null, productTypes: null, products: null };

  if (mode === "commit") {
    // Create/Update lookups first so products can resolve against them.
    summary.categories = await importCategoriesSheet(categoryRows);
    summary.brands = await importBrandsSheet(brandRows);
    summary.productTypes = await importProductTypesSheet(typeRows);

    const refs = await loadReferenceData();
    summary.products = await importProductsSheet(productRows, refs, "commit");
  } else {
    // Dry run: validate lookups lightly and products against DB + sheet-declared lookups.
    summary.categories = { created: 0, updated: 0, errors: [] };
    summary.brands = { created: 0, updated: 0, errors: [] };
    summary.productTypes = { created: 0, updated: 0, errors: [] };

    const dbRefs = await loadReferenceData();
    const refs = mergeSheetRefs(dbRefs, categoryRows, brandRows, typeRows);
    summary.products = await importProductsSheet(productRows, refs, "validate");
  }

  return summary;
};

module.exports = {
  importWorkbookFromBuffer,
  loadReferenceData,
  // exported for unit testing
  parseSheet,
  buildProductFromRow,
};
