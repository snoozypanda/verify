const https = require("https");
const { parseDocument } = require("htmlparser2");

const TELEBIRR_HOST = "transactioninfo.ethiotelecom.et";
const TELEBIRR_BASE_URL = `https://${TELEBIRR_HOST}/receipt/`;

/**
 * Clean text extracted from Telebirr HTML.
 */
function cleanText(value) {
    return String(value ?? "")
        .replace(/\s+/g, " ")
        .trim();
}

/**
 * Normalize text for comparisons.
 */
function normalizeText(value) {
    return cleanText(value).toLowerCase();
}

/**
 * Convert a value containing a number into a Number.
 */
function parseAmount(value) {
    if (value === null || value === undefined) {
        return null;
    }

    const match = String(value)
        .replace(/,/g, "")
        .match(/-?\d+(?:\.\d+)?/);

    if (!match) {
        return null;
    }

    const number = Number(match[0]);

    return Number.isFinite(number) ? number : null;
}

/**
 * Extract visible text from HTML into separate lines.
 */
function getTextLines(html) {
    const document = parseDocument(html, {
        decodeEntities: true
    });

    const lines = [];

    function walk(node) {
        if (!node) {
            return;
        }

        if (node.type === "text") {
            const text = cleanText(node.data);

            if (text) {
                lines.push(text);
            }

            return;
        }

        if (node.children) {
            for (const child of node.children) {
                walk(child);
            }
        }
    }

    for (const child of document.children || []) {
        walk(child);
    }

    return lines;
}

/**
 * Find the value after a text label.
 *
 * Telebirr labels often look like:
 *
 * የከፋይ ስም/Payer Name
 *
 * Therefore we use includes() instead of requiring
 * the line to start exactly with "Payer Name".
 */
function findAfterLabel(lines, label) {
    const wanted = normalizeText(label);

    for (let i = 0; i < lines.length; i++) {
        const current = normalizeText(lines[i]);

        if (
            current === wanted ||
            current.startsWith(wanted) ||
            current.includes(wanted)
        ) {
            for (
                let j = i + 1;
                j < Math.min(i + 8, lines.length);
                j++
            ) {
                const value = cleanText(lines[j]);

                if (!value) {
                    continue;
                }

                const normalizedValue = normalizeText(value);

                if (
                    normalizedValue === wanted ||
                    normalizedValue.startsWith(wanted) ||
                    normalizedValue.includes(wanted)
                ) {
                    continue;
                }

                return value;
            }
        }
    }

    return "";
}

/**
 * Find a Birr amount after a label.
 */
function findBirrAfterLabel(lines, label) {
    const wanted = normalizeText(label);

    for (let i = 0; i < lines.length; i++) {
        const current = normalizeText(lines[i]);

        if (
            current === wanted ||
            current.startsWith(wanted) ||
            current.includes(wanted)
        ) {
            for (
                let j = i + 1;
                j < Math.min(i + 8, lines.length);
                j++
            ) {
                const value = cleanText(lines[j]);

                if (
                    /^\d+(?:\.\d+)?\s*Birr$/i.test(value)
                ) {
                    return parseAmount(value);
                }
            }
        }
    }

    return null;
}

/**
 * Parse a Telebirr receipt HTML page.
 */
function parseFromHTML(html) {
    const lines = getTextLines(html);

    console.log(
        `Telebirr text lines detected: ${lines.length}`
    );

    /*
     * -------------------------------
     * BASIC RECEIPT INFORMATION
     * -------------------------------
     */

    const payer_name = findAfterLabel(
        lines,
        "Payer Name"
    );

    const payer_telebirr_no = findAfterLabel(
        lines,
        "Payer telebirr no."
    );

    const payer_acc_type = findAfterLabel(
        lines,
        "Payer account type"
    );

    const credited_party_name = findAfterLabel(
        lines,
        "Credited Party name"
    );

    const credited_party_acc_no = findAfterLabel(
        lines,
        "Credited party account no"
    );

    const transaction_status = findAfterLabel(
        lines,
        "transaction status"
    );

    /*
     * -------------------------------
     * RECEIPT NUMBER
     * -------------------------------
     */

    let receiptNo = "";

    for (const line of lines) {
        const value = cleanText(line);

        if (
            /^[A-Z]{2}[A-Z0-9]{8,}$/i.test(value)
        ) {
            receiptNo = value;
            break;
        }
    }

    /*
     * -------------------------------
     * PAYMENT DATE
     * -------------------------------
     */

    let date = "";

    for (const line of lines) {
        const value = cleanText(line);

        const match = value.match(
            /^\d{2}-\d{2}-\d{4}\s+\d{2}:\d{2}:\d{2}$/
        );

        if (match) {
            date = match[0];
            break;
        }
    }

    /*
     * -------------------------------
     * SETTLED AMOUNT
     * -------------------------------
     */

    let settled_amount = null;

    for (let i = 0; i < lines.length; i++) {
        const current = normalizeText(lines[i]);

        if (current.includes("settled amount")) {
            for (
                let j = i + 1;
                j < Math.min(i + 8, lines.length);
                j++
            ) {
                const value = cleanText(lines[j]);

                if (
                    /^\d+(?:\.\d+)?\s*Birr$/i.test(value)
                ) {
                    const amount = parseAmount(value);

                    if (amount !== null) {
                        settled_amount = amount;
                        break;
                    }
                }
            }
        }

        if (settled_amount !== null) {
            break;
        }
    }

    /*
     * -------------------------------
     * SERVICE FEE
     * -------------------------------
     *
     * IMPORTANT:
     *
     * "Service fee"
     *
     * also appears inside:
     *
     * "Service fee VAT"
     *
     * So we explicitly exclude VAT here.
     */

    let service_fee = null;

    for (let i = 0; i < lines.length; i++) {
        const current = normalizeText(lines[i]);

        if (
            current.includes("service fee") &&
            !current.includes("service fee vat")
        ) {
            for (
                let j = i + 1;
                j < Math.min(i + 8, lines.length);
                j++
            ) {
                const value = cleanText(lines[j]);

                if (
                    /^\d+(?:\.\d+)?\s*Birr$/i.test(value)
                ) {
                    service_fee = parseAmount(value);
                    break;
                }
            }
        }

        if (service_fee !== null) {
            break;
        }
    }

    /*
     * -------------------------------
     * SERVICE FEE VAT
     * -------------------------------
     */

    const service_fee_vat =
        findBirrAfterLabel(
            lines,
            "Service fee VAT"
        );

    /*
     * -------------------------------
     * TOTAL FEE
     * -------------------------------
     */

    let total_fee = null;

    if (
        service_fee !== null ||
        service_fee_vat !== null
    ) {
        total_fee =
            (service_fee ?? 0) +
            (service_fee_vat ?? 0);
    }

    /*
     * -------------------------------
     * TOTAL AMOUNT
     * -------------------------------
     */

    let total_amount = null;

    if (
        settled_amount !== null &&
        total_fee !== null
    ) {
        total_amount =
            settled_amount +
            total_fee;
    }

    /*
     * -------------------------------
     * DISCOUNT
     * -------------------------------
     */

    const discount_amount =
        findBirrAfterLabel(
            lines,
            "Discount"
        ) ?? 0;

    /*
     * -------------------------------
     * STAMP DUTY
     * -------------------------------
     */

    const stamp_duty =
        findBirrAfterLabel(
            lines,
            "Stamp duty"
        ) ?? 0;

    /*
     * -------------------------------
     * OTHER RECEIPT INFORMATION
     * -------------------------------
     */

    const amount_in_word =
        findAfterLabel(
            lines,
            "Total Amount in word"
        );

    const payment_mode =
        findAfterLabel(
            lines,
            "Payment Mode"
        );

    const payment_reason =
        findAfterLabel(
            lines,
            "Payment Reason"
        );

    const payment_channel =
        findAfterLabel(
            lines,
            "Payment channel"
        );

    /*
     * -------------------------------
     * RETURN PARSED RECEIPT
     * -------------------------------
     */

    return {
        payer_name,
        payer_telebirr_no,
        payer_acc_type,

        credited_party_name,
        credited_party_acc_no,

        transaction_status,

        receiptNo,
        date,

        settled_amount,
        discount_amount,
        stamp_duty,

        service_fee,
        service_fee_vat,
        total_fee,
        total_amount,

        amount_in_word,

        payment_mode,
        payment_reason,
        payment_channel
    };
}

/**
 * Download a Telebirr receipt.
 */
function fetchReceiptOnce(url) {
    return new Promise(
        (resolve, reject) => {
            const request = https.get(
                url,
                {
                    headers: {
                        "User-Agent":
                            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/151.0.0.0 Safari/537.36",

                        "Accept":
                            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",

                        "Accept-Language":
                            "en-US,en;q=0.9",

                        "Connection":
                            "close"
                    },

                    timeout: 30000
                },

                response => {
                    const chunks = [];

                    response.on(
                        "data",
                        chunk => {
                            chunks.push(chunk);
                        }
                    );

                    response.on(
                        "end",
                        () => {
                            const body =
                                Buffer.concat(
                                    chunks
                                ).toString(
                                    "utf8"
                                );

                            console.log(
                                `Telebirr HTTP status: ${response.statusCode}`
                            );

                            if (
                                response.statusCode < 200 ||
                                response.statusCode >= 300
                            ) {
                                reject(
                                    new Error(
                                        `Telebirr returned HTTP ${response.statusCode}`
                                    )
                                );

                                return;
                            }

                            console.log(
                                "Telebirr receipt retrieved successfully."
                            );

                            resolve(body);
                        }
                    );
                }
            );

            request.on(
                "timeout",
                () => {
                    request.destroy(
                        new Error(
                            "Telebirr request timed out."
                        )
                    );
                }
            );

            request.on(
                "error",
                error => {
                    reject(error);
                }
            );
        }
    );
}

/**
 * Check if the HTML returned by Telebirr is a real receipt
 * or a bad/error response (e.g. "This request is not correct").
 */
function isValidReceiptHtml(html) {
    if (!html || html.length < 1000) {
        return false;
    }

    const lower = html.toLowerCase();

    if (lower.includes("this request is not correct")) {
        return false;
    }

    if (lower.includes("receipt")) {
        return true;
    }

    return false;
}

function loadReceipt(options = {}) {
    const receiptNo = String(
        options.receiptNo || ""
    ).trim();

    if (!receiptNo) {
        return Promise.reject(
            new Error(
                "Receipt number is required."
            )
        );
    }

    const url =
        `${TELEBIRR_BASE_URL}` +
        encodeURIComponent(receiptNo);

    console.log(
        `Telebirr URL: ${url}`
    );

    const MAX_ATTEMPTS = 4;
    const RETRY_DELAY_MS = 2000;

    async function attempt(tries) {
        console.log(
            `Telebirr fetch attempt ${tries} of ${MAX_ATTEMPTS}...`
        );

        let html;

        try {
            html = await fetchReceiptOnce(url);
        } catch (err) {
            console.warn(
                `Telebirr attempt ${tries} failed:`,
                err.message
            );

            if (tries < MAX_ATTEMPTS) {
                await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
                return attempt(tries + 1);
            }

            throw err;
        }

        if (!isValidReceiptHtml(html)) {
            console.warn(
                `Telebirr attempt ${tries} returned bad/empty response ` +
                `(${html.length} bytes). Retrying...`
            );

            if (tries < MAX_ATTEMPTS) {
                await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
                return attempt(tries + 1);
            }

            // Return whatever we got on last attempt so
            // the caller can decide what to do with it.
            return html;
        }

        return html;
    }

    return attempt(1);
}

/**
 * Safely create a Telebirr receipt URL.
 */
function safeReceiptUrl(receiptNo) {
    return (
        `${TELEBIRR_BASE_URL}` +
        encodeURIComponent(
            String(
                receiptNo || ""
            ).trim()
        )
    );
}

/*
 * -------------------------------
 * EXPORTS
 * -------------------------------
 */

module.exports = {
    receipt: parseFromHTML,
    parseFromHTML,
    loadReceipt,
    cleanText,
    normalizeText,
    parseAmount,

    extractRowValue:
        findAfterLabel,

    extractTextValue:
        findAfterLabel,

    safeReceiptUrl
};