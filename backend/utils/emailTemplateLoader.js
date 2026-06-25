const fs = require('fs');
const path = require('path');

const TEMPLATE_DIR = path.join(__dirname, '..', 'templates', 'email');

/** In-memory cache so we do not re-read disk on every send. */
const cache = new Map();

/**
 * List all `.html` files in `backend/templates/email/`.
 * @returns {string[]}
 */
function getTemplateFileNames() {
    if (!fs.existsSync(TEMPLATE_DIR)) {
        return [];
    }
    return fs
        .readdirSync(TEMPLATE_DIR)
        .filter((f) => f.endsWith('.html'))
        .sort();
}

/**
 * Read a template file by basename (e.g. `welcome.html`).
 * @param {string} filename
 * @returns {string}
 */
function readTemplateFile(filename) {
    if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*\.html$/.test(filename)) {
        throw new Error(`Invalid email template filename: ${filename}`);
    }
    if (cache.has(filename)) {
        return cache.get(filename);
    }
    const fullPath = path.join(TEMPLATE_DIR, filename);
    const html = fs.readFileSync(fullPath, 'utf8');
    cache.set(filename, html);
    return html;
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/**
 * Replace `{{key}}` placeholders. Values are HTML-escaped unless listed in `options.rawKeys`
 * (trusted pre-rendered snippets, e.g. line breaks or styled rows built with escapeHtml in JS).
 * @param {string} html
 * @param {Record<string, string | number | undefined | null>} vars
 * @param {{ rawKeys?: string[] }} [options]
 * @returns {string}
 */
function renderTemplate(html, vars = {}, options = {}) {
    const rawKeys = new Set(options.rawKeys || []);
    let out = html;
    for (const [key, value] of Object.entries(vars)) {
        const replacement = rawKeys.has(key)
            ? String(value ?? '')
            : escapeHtml(value);
        out = out.split(`{{${key}}}`).join(replacement);
    }
    return out;
}

/**
 * Load a file from `backend/templates/email/` and apply `{{key}}` replacements.
 * @param {string} filename
 * @param {Record<string, string | number | undefined | null>} vars
 * @param {{ rawKeys?: string[] }} [options]
 */
function renderEmailTemplate(filename, vars, options) {
    return renderTemplate(readTemplateFile(filename), vars, options);
}

module.exports = {
    TEMPLATE_DIR,
    getTemplateFileNames,
    readTemplateFile,
    renderTemplate,
    renderEmailTemplate,
    escapeHtml,
};
