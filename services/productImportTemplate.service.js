const ExcelJS = require("exceljs");
const Category = require("../model/Category");
const Brand = require("../model/Brand");
const ProductsType = require("../model/ProductsType");
const Product = require("../model/Products");
const Tags = require("../model/tags");
const {
  SHEET,
  COLOR_OPTIONS,
  TAG_OPTIONS,
  CATEGORY_COLUMNS,
  BRAND_COLUMNS,
  PRODUCT_TYPE_COLUMNS,
  PRODUCT_COLUMNS,
} = require("../utils/productImportSchema");

const REQUIRED_FILL = "FFE74C3C"; // red
const OPTIONAL_FILL = "FF34495E"; // dark slate
const MAX_VALIDATION_ROWS = 1000;

// Workbook-scoped dynamic named ranges for the cross-sheet dropdowns. Each one
// uses OFFSET+COUNTA so the dropdown auto-sizes to the rows actually filled in
// the source sheet (no trailing blank rows, and it grows as you add rows).
const DEFINED_NAMES = [
  { name: "CategoryList", sheet: SHEET.CATEGORIES, col: "A" },
  { name: "BrandList", sheet: SHEET.BRANDS, col: "A" },
  { name: "ProductTypeList", sheet: SHEET.PRODUCT_TYPES, col: "A" },
];
const NAME_BY_SHEET = {
  [SHEET.CATEGORIES]: "CategoryList",
  [SHEET.BRANDS]: "BrandList",
  [SHEET.PRODUCT_TYPES]: "ProductTypeList",
};

const numToCol = (n) => {
  let s = "";
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
};

// Create a worksheet with styled headers, optional pre-filled rows, and
// (for the Products sheet) data-validation dropdowns.
const addSheet = (workbook, name, columns, dataRows, options = {}) => {
  const ws = workbook.addWorksheet(name, {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  ws.columns = columns.map((c) => ({
    header: c.required ? `${c.header} *` : c.header,
    key: c.key,
    width: c.width || 18,
  }));

  const headerRow = ws.getRow(1);
  headerRow.height = 22;
  columns.forEach((col, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: col.required ? REQUIRED_FILL : OPTIONAL_FILL },
    };
    cell.font = { color: { argb: "FFFFFFFF" }, bold: true, size: 11 };
    cell.alignment = { vertical: "middle", horizontal: "left" };
    cell.note = `${col.required ? "REQUIRED. " : "Optional. "}${col.note}`;
  });

  (dataRows || []).forEach((row) => ws.addRow(row));

  // Data-validation dropdowns (used on the Products sheet).
  if (options.dropdowns) {
    columns.forEach((col, idx) => {
      if (!col.dropdown) return;
      let formula;
      if (col.dropdown.values) {
        formula = `"${col.dropdown.values.join(",")}"`;
      } else if (col.dropdown.sheet) {
        // Reference the dynamic named range (injected after writeBuffer) so the
        // dropdown shows exactly the filled rows with no trailing blanks.
        formula = NAME_BY_SHEET[col.dropdown.sheet];
      } else if (col.dropdown.list && options.dropdownByList) {
        formula = options.dropdownByList[col.dropdown.list];
      }
      if (!formula) return;
      const colLetter = numToCol(idx + 1);
      for (let r = 2; r <= MAX_VALIDATION_ROWS; r++) {
        ws.getCell(`${colLetter}${r}`).dataValidation = {
          type: "list",
          allowBlank: !col.required,
          formulae: [formula],
          showErrorMessage: true,
          errorStyle: "warning",
          errorTitle: "Pick from the list",
          error: "Use a value that exists in the source sheet, or add it there first.",
        };
      }
    });
  }

  return ws;
};

const buildTemplateWorkbook = async () => {
  const [categories, brands, productTypes, tagDocs, productTags] = await Promise.all([
    Category.find({}).select("parent productType children img description status").sort({ parent: 1 }).lean(),
    Brand.find({}).select("name logo description email website location status").sort({ name: 1 }).lean(),
    ProductsType.find({}).select("name image").sort({ name: 1 }).lean(),
    Tags.find({}).select("name").sort({ name: 1 }).lean(), // tags managed in the dashboard
    Product.distinct("tags"), // tags already used on products
  ]);

  // Tag dropdown = tags from the Tags collection + tags used on products +
  // the predefined palette, de-duplicated case-insensitively.
  const mergedTags = [];
  const seenTag = new Set();
  [
    ...tagDocs.map((t) => t.name),
    ...(productTags || []),
    ...TAG_OPTIONS,
  ].forEach((t) => {
    const v = String(t || "").trim();
    if (!v) return;
    const k = v.toLowerCase();
    if (seenTag.has(k)) return;
    seenTag.add(k);
    mergedTags.push(v);
  });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Cuideo Admin";
  workbook.created = new Date(0); // deterministic output

  // ----- How to use (first tab) -----
  const help = workbook.addWorksheet("How to use");
  help.columns = [{ width: 115 }];
  const lines = [
    "Cuideo — Product import workbook",
    "",
    "This file has four data sheets. Fill them and upload the whole file.",
    "",
    "Categories / Brands / ProductTypes:",
    "  - These come pre-filled with whatever already exists in the database (empty if nothing exists yet).",
    "  - Add new rows to create new ones. Rows that already exist (by name) are SKIPPED — existing records are never changed.",
    "  - category_name and brand/type names must be unique.",
    "",
    "Products:",
    "  - This sheet is always empty on download — add one product per row.",
    "  - Dropdowns: category_name, subcategory, brand_name, productType_name, color_name and tag_1..tag_5.",
    "  - Tags are multi-select: pick one per tag_1..tag_5 column to attach several tags to one product.",
    "  - category/brand/type dropdowns are sourced from the other sheets, so any row you add there appears in the dropdown.",
    "  - color_name is a fixed palette; the backend stores the matching colour code automatically.",
    "  - status has no column — it is set automatically from quantity (0 => out-of-stock, otherwise in-stock).",
    "  - slug is generated from the title automatically (no slug column).",
    "",
    "Images:",
    "  - Always paste the FULL Cloudinary URL (https://res.cloudinary.com/...), not the public id.",
    "  - 'image' (main image) is OPTIONAL. If left blank, a placeholder is stored and you can upload the real image later on the product's edit page.",
    "  - 'additional_images' takes several full URLs separated by | (pipe).",
    "",
    "Rules:",
    "  - Columns with a red header and a * are REQUIRED. Hover any header to read what it expects.",
    "  - SKU must be unique. Duplicate-in-file or already-in-database SKUs are skipped and reported.",
    "  - price / quantity / discount are numbers >= 0; discount must not exceed price.",
    "  - Nothing is ever deleted. Valid rows are added; invalid rows are reported back with the reason.",
    "  - Tip: use ?mode=validate first for a dry run that reports problems without saving.",
  ];
  lines.forEach((text, i) => {
    const cell = help.getCell(`A${i + 1}`);
    cell.value = text;
    if (i === 0) cell.font = { bold: true, size: 14 };
    else if (/:$/.test(text)) cell.font = { bold: true };
  });

  // ----- Lookup sheets (pre-filled) -----
  addSheet(
    workbook,
    SHEET.CATEGORIES,
    CATEGORY_COLUMNS,
    categories.map((c) => ({
      category_name: c.parent,
      productType: c.productType,
      subcategories: (c.children || []).join(" | "),
      image: c.img || "",
      description: c.description || "",
      status: c.status || "Show",
    })),
    { dropdowns: true } // status + productType (from ProductTypes) dropdowns
  );

  addSheet(
    workbook,
    SHEET.BRANDS,
    BRAND_COLUMNS,
    brands.map((b) => ({
      name: b.name,
      logo: b.logo || "",
      description: b.description || "",
      email: b.email || "",
      website: b.website || "",
      location: b.location || "",
      status: b.status || "active",
    })),
    { dropdowns: true } // status dropdown on Brands
  );

  addSheet(
    workbook,
    SHEET.PRODUCT_TYPES,
    PRODUCT_TYPE_COLUMNS,
    productTypes.map((p) => ({ name: p.name, image: p.image || "" }))
  );

  // ----- Hidden Lists sheet (sources for fixed/flat dropdowns) -----
  const subcategories = Array.from(
    new Set(
      categories.flatMap((c) => (c.children || []).map((s) => String(s).trim())).filter(Boolean)
    )
  ).sort();

  const lists = workbook.addWorksheet("Lists", { state: "hidden" });
  lists.columns = [
    { header: "Colors", key: "color", width: 22 },
    { header: "Tags", key: "tag", width: 22 },
    { header: "Subcategories", key: "sub", width: 30 },
  ];
  const maxLen = Math.max(COLOR_OPTIONS.length, mergedTags.length, subcategories.length);
  for (let i = 0; i < maxLen; i++) {
    lists.addRow({
      color: COLOR_OPTIONS[i] ? COLOR_OPTIONS[i].name : null,
      tag: mergedTags[i] || null,
      sub: subcategories[i] || null,
    });
  }
  const listRange = (colLetter, count) =>
    `Lists!$${colLetter}$2:$${colLetter}$${Math.max(count, 1) + 1}`;
  const dropdownByList = {
    colors: listRange("A", COLOR_OPTIONS.length),
    tags: listRange("B", mergedTags.length),
    subcategories: listRange("C", subcategories.length),
  };

  // ----- Products sheet (empty, with cross-sheet + list dropdowns) -----
  addSheet(workbook, SHEET.PRODUCTS, PRODUCT_COLUMNS, [], {
    dropdowns: true,
    dropdownByList,
  });

  return workbook;
};

// exceljs can't emit formula-based defined names, so we inject them into
// xl/workbook.xml after the workbook is serialized.
const injectDefinedNames = async (buffer) => {
  const JSZip = require("jszip");
  const zip = await JSZip.loadAsync(buffer);
  const path = "xl/workbook.xml";
  const file = zip.file(path);
  if (!file) return buffer;

  let xml = await file.async("string");
  const defs = DEFINED_NAMES.map(
    (d) =>
      `<definedName name="${d.name}">OFFSET(${d.sheet}!$${d.col}$2,0,0,MAX(COUNTA(${d.sheet}!$${d.col}:$${d.col})-1,1),1)</definedName>`
  ).join("");

  if (xml.includes("<definedNames>")) {
    xml = xml.replace("</definedNames>", `${defs}</definedNames>`);
  } else if (xml.includes("</sheets>")) {
    // definedNames must come after <sheets> in the OOXML schema order.
    xml = xml.replace("</sheets>", `</sheets><definedNames>${defs}</definedNames>`);
  }

  zip.file(path, xml);
  return zip.generateAsync({ type: "nodebuffer" });
};

const generateTemplateBuffer = async () => {
  const workbook = await buildTemplateWorkbook();
  const buffer = await workbook.xlsx.writeBuffer();
  return injectDefinedNames(buffer);
};

module.exports = { generateTemplateBuffer };
