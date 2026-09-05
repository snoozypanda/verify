const https = require("https");
const htmlparser = require("htmlparser2");


/* =========================================================
   RECEIPT VERIFICATION HELPER
========================================================= */

function receipt(parsedFields = {}, preDefinedFields = {}) {

    function equals(a, b) {

        if (
            typeof a === "number" &&
            typeof b === "number"
        ) {
            return a === b;
        }

        if (
            typeof a === "string" &&
            typeof b === "string"
        ) {
            return a === b;
        }

        return false;
    }


    function verify(callback) {

        return callback(
            parsedFields,
            preDefinedFields
        );

    }


    function verifyAll(doNotCompare = []) {

        if (
            Object.keys(parsedFields).length === 0
        ) {
            return false;
        }


        for (const key in parsedFields) {

            if (
                Object.prototype.hasOwnProperty.call(
                    parsedFields,
                    key
                )
            ) {

                if (
                    !doNotCompare.includes(key)
                ) {

                    if (
                        !equals(
                            parsedFields[key],
                            preDefinedFields[key]
                        )
                    ) {
                        return false;
                    }

                }

            }

        }

        return true;
    }


    function verifyOnly(fieldNames = []) {

        if (
            !Array.isArray(fieldNames) ||
            fieldNames.length === 0
        ) {
            return false;
        }


        for (const key of fieldNames) {

            if (
                !equals(
                    parsedFields[key],
                    preDefinedFields[key]
                )
            ) {
                return false;
            }

        }

        return true;
    }


    return {
        equals,
        verify,
        verifyOnly,
        verifyAll
    };
}


/* =========================================================
   TEXT HELPERS
========================================================= */

function cleanText(value) {

    return String(value || "")
        .replace(/[\n\r\t]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();

}


function normalizeText(value) {

    return cleanText(value)
        .toLowerCase()
        .replace(/\s+/g, " ");

}


function normalizeLabel(value) {

    return cleanText(value)
        .replace(/\s+/g, "")
        .toLowerCase();

}


/* =========================================================
   AMOUNT PARSER
========================================================= */

function parseAmount(value) {

    const text =
        cleanText(value)
            .replace(/,/g, "")
            .replace(/birr/ig, "")
            .replace(/etb/ig, "")
            .trim();


    const match =
        text.match(
            /-?\d+(?:\.\d+)?/
        );


    if (!match) {
        return null;
    }


    const number =
        Number(match[0]);


    return Number.isFinite(number)
        ? number
        : null;

}


/* =========================================================
   EXTRACT TEXT BETWEEN LABELS
========================================================= */

function extractBetween(
    text,
    startLabel,
    endLabels = []
) {

    const normalized =
        normalizeText(text);


    const normalizedStart =
        normalizeText(startLabel);


    const start =
        normalized.indexOf(
            normalizedStart
        );


    if (start === -1) {
        return "";
    }


    let valueStart =
        start +
        normalizedStart.length;


    while (
        valueStart < normalized.length &&
        (
            normalized[valueStart] === ":" ||
            normalized[valueStart] === "：" ||
            normalized[valueStart] === "-"
        )
    ) {

        valueStart++;

    }


    let valueEnd =
        normalized.length;


    for (
        const endLabel of endLabels
    ) {

        const normalizedEnd =
            normalizeText(endLabel);


        const index =
            normalized.indexOf(
                normalizedEnd,
                valueStart
            );


        if (
            index !== -1 &&
            index < valueEnd
        ) {

            valueEnd = index;

        }

    }


    return cleanText(
        normalized.substring(
            valueStart,
            valueEnd
        )
    );

}


/* =========================================================
   EXTRACT FIELD
========================================================= */

function extractField(
    text,
    labels,
    endLabels = []
) {

    for (
        const label of labels
    ) {

        const value =
            extractBetween(
                text,
                label,
                endLabels
            );


        if (value) {
            return value;
        }

    }


    return "";

}


/* =========================================================
   TELEBIRR RECEIPT PARSER
========================================================= */

function parseFromHTML(str) {

    if (
        typeof str !== "string" ||
        !str.trim()
    ) {
        return {};
    }


    const document =
        htmlparser.parseDocument(str);


    const fields = {};


    /* -----------------------------------------------------
       FULL PAGE TEXT
    ----------------------------------------------------- */

    const bodyText =
        cleanText(
            htmlparser.DomUtils.textContent(
                document
            )
        );


    /* -----------------------------------------------------
       TABLE CELLS
    ----------------------------------------------------- */

    const tdElements =
        htmlparser.DomUtils.getElementsByTagName(
            "td",
            document
        );


    const tdTexts =
        tdElements.map(
            element =>
                cleanText(
                    htmlparser.DomUtils.textContent(
                        element
                    )
                )
        );


    /* -----------------------------------------------------
       LABELS
    ----------------------------------------------------- */

    const labels = {

        payerName: [
            "Payer Name",
            "የከፋይ ስም"
        ],

        payerPhone: [
            "Payer telebirr no.",
            "Payer telebirr no",
            "የከፋይ ቴሌብር ቁ."
        ],

        payerAccountType: [
            "Payer account type",
            "የከፋይ አካውንት አይነት"
        ],

        creditedPartyName: [
            "Credited Party name",
            "Credited Party Name",
            "የገንዘብ ተቀባይ ስም"
        ],

        creditedPartyAccount: [
            "Credited party account no",
            "Credited Party account no",
            "Credited party account number",
            "Credited account",
            "Credited Account",
            "የገንዘብ ተቀባይ ቴሌብር ቁ."
        ],

        transactionStatus: [
            "Transaction status",
            "transaction status",
            "የክፍያው ሁኔታ"
        ],

        receiptNo: [
            "Invoice No.",
            "Invoice No",
            "Receipt No.",
            "Receipt No",
            "የክፍያ ቁጥር"
        ],

        paymentDate: [
            "Payment date",
            "Payment Date",
            "የክፍያ ቀን"
        ],

        settledAmount: [
            "Settled Amount",
            "settled amount",
            "የተከፈለው መጠን"
        ],

        stampDuty: [
            "Stamp Duty",
            "የማህተም ክፍያ"
        ],

        discountAmount: [
            "Discount Amount",
            "የቅናሽ መጠን",
            "ቅናሽ"
        ],

        serviceFee: [
            "Service fee",
            "የአገልግሎት ክፍያ"
        ],

        serviceFeeVAT: [
            "Service fee VAT",
            "የአገልግሎት ክፍያ ተ.እ.ኤ."
        ],

        totalAmount: [
            "Total Paid Amount",
            "Total paid amount",
            "ጠቅላላ የተከፈለ"
        ],

        amountInWord: [
            "Total Amount in word",
            "Total amount in word",
            "የገንዘቡ ልክ በፊደል"
        ],

        paymentMode: [
            "Payment Mode",
            "Payment mode",
            "የክፍያ ዘዴ"
        ],

        paymentReason: [
            "Payment Reason",
            "Payment reason",
            "የክፍያ ምክንያት"
        ],

        paymentChannel: [
            "Payment channel",
            "Payment Channel",
            "የክፍያ መንገድ"
        ]

    };


    const allLabels = [
        ...labels.payerName,
        ...labels.payerPhone,
        ...labels.payerAccountType,
        ...labels.creditedPartyName,
        ...labels.creditedPartyAccount,
        ...labels.transactionStatus,
        ...labels.receiptNo,
        ...labels.paymentDate,
        ...labels.settledAmount,
        ...labels.stampDuty,
        ...labels.discountAmount,
        ...labels.serviceFee,
        ...labels.serviceFeeVAT,
        ...labels.totalAmount,
        ...labels.amountInWord,
        ...labels.paymentMode,
        ...labels.paymentReason,
        ...labels.paymentChannel
    ];


    /* -----------------------------------------------------
       TEXT PARSING
    ----------------------------------------------------- */

    fields.payer_name =
        extractField(
            bodyText,
            labels.payerName,
            allLabels
        );


    fields.payer_telebirr_no =
        extractField(
            bodyText,
            labels.payerPhone,
            allLabels
        );


    fields.payer_acc_type =
        extractField(
            bodyText,
            labels.payerAccountType,
            allLabels
        );


    fields.credited_party_name =
        extractField(
            bodyText,
            labels.creditedPartyName,
            allLabels
        );


    fields.credited_party_acc_no =
        extractField(
            bodyText,
            labels.creditedPartyAccount,
            allLabels
        );


    fields.transaction_status =
        extractField(
            bodyText,
            labels.transactionStatus,
            allLabels
        );


    fields.receiptNo =
        extractField(
            bodyText,
            labels.receiptNo,
            allLabels
        );


    fields.date =
        extractField(
            bodyText,
            labels.paymentDate,
            allLabels
        );


    /* -----------------------------------------------------
       AMOUNTS
    ----------------------------------------------------- */

    const settledAmount =
        parseAmount(
            extractField(
                bodyText,
                labels.settledAmount,
                allLabels
            )
        );


    if (settledAmount !== null) {

        fields.settled_amount =
            settledAmount;

    }


    const discountAmount =
        parseAmount(
            extractField(
                bodyText,
                labels.discountAmount,
                allLabels
            )
        );


    if (discountAmount !== null) {

        fields.discount_amount =
            discountAmount;

    }


    const serviceFee =
        parseAmount(
            extractField(
                bodyText,
                labels.serviceFee,
                allLabels
            )
        );


    if (serviceFee !== null) {

        fields.service_fee =
            serviceFee;

    }


    const serviceFeeVAT =
        parseAmount(
            extractField(
                bodyText,
                labels.serviceFeeVAT,
                allLabels
            )
        );


    if (serviceFeeVAT !== null) {

        fields.service_fee_vat =
            serviceFeeVAT;

    }


    const totalAmount =
        parseAmount(
            extractField(
                bodyText,
                labels.totalAmount,
                allLabels
            )
        );


    if (totalAmount !== null) {

        fields.total_amount =
            totalAmount;

    }


    fields.amount_in_word =
        extractField(
            bodyText,
            labels.amountInWord,
            allLabels
        );


    fields.payment_mode =
        extractField(
            bodyText,
            labels.paymentMode,
            allLabels
        );


    fields.payment_reason =
        extractField(
            bodyText,
            labels.paymentReason,
            allLabels
        );


    fields.payment_channel =
        extractField(
            bodyText,
            labels.paymentChannel,
            allLabels
        );


    /* -----------------------------------------------------
       TABLE FALLBACK
    ----------------------------------------------------- */

    for (
        let i = 0;
        i < tdTexts.length;
        i++
    ) {

        const current =
            normalizeLabel(
                tdTexts[i]
            );


        const next =
            i + 1 < tdTexts.length
                ? cleanText(tdTexts[i + 1])
                : "";


        if (!next) {
            continue;
        }


        /* Payer name */

        if (
            current === normalizeLabel("Payer Name") ||
            current === normalizeLabel("የከፋይ ስም")
        ) {

            if (!fields.payer_name) {

                fields.payer_name =
                    next;

            }

        }


        /* Payer phone */

        if (
            current === normalizeLabel("Payer telebirr no.") ||
            current === normalizeLabel("የከፋይ ቴሌብር ቁ.")
        ) {

            if (!fields.payer_telebirr_no) {

                fields.payer_telebirr_no =
                    next;

            }

        }


        /* Credited party name */

        if (
            current === normalizeLabel("Credited Party name") ||
            current === normalizeLabel("የገንዘብ ተቀባይ ስም")
        ) {

            if (!fields.credited_party_name) {

                fields.credited_party_name =
                    next;

            }

        }


        /* Credited account */

        if (
            current === normalizeLabel("Credited party account no") ||
            current === normalizeLabel("Credited account") ||
            current === normalizeLabel("Credited Account") ||
            current === normalizeLabel("የገንዘብ ተቀባይ ቴሌብር ቁ.")
        ) {

            if (!fields.credited_party_acc_no) {

                fields.credited_party_acc_no =
                    next;

            }

        }


        /* Transaction status */

        if (
            current === normalizeLabel("Transaction status") ||
            current === normalizeLabel("የክፍያው ሁኔታ")
        ) {

            const candidate =
                cleanText(next);


            const lower =
                candidate.toLowerCase();


            if (
                lower === "completed" ||
                lower === "successful" ||
                lower === "success" ||
                lower.includes("completed") ||
                lower.includes("successful")
            ) {

                fields.transaction_status =
                    candidate;

            }

        }


        /* Invoice */

        if (
            current === normalizeLabel("Invoice No.") ||
            current === normalizeLabel("Receipt No.") ||
            current === normalizeLabel("የክፍያ ቁጥር")
        ) {

            if (!fields.receiptNo) {

                const match =
                    next.match(
                        /[A-Za-z0-9._-]{3,100}/
                    );


                if (match) {

                    fields.receiptNo =
                        match[0];

                }

            }

        }


        /* Payment date */

        if (
            current === normalizeLabel("Payment date") ||
            current === normalizeLabel("የክፍያ ቀን")
        ) {

            if (!fields.date) {

                fields.date =
                    next;

            }

        }


        /* Settled amount */

        if (
            current === normalizeLabel("Settled Amount") ||
            current === normalizeLabel("የተከፈለው መጠን")
        ) {

            const amount =
                parseAmount(next);


            if (amount !== null) {

                fields.settled_amount =
                    amount;

            }

        }


        /* Total amount */

        if (
            current === normalizeLabel("Total Paid Amount")
        ) {

            const amount =
                parseAmount(next);


            if (amount !== null) {

                fields.total_amount =
                    amount;

            }

        }


        /* Payment mode */

        if (
            current === normalizeLabel("Payment Mode")
        ) {

            if (!fields.payment_mode) {

                fields.payment_mode =
                    next;

            }

        }


        /* Payment reason */

        if (
            current === normalizeLabel("Payment Reason")
        ) {

            if (!fields.payment_reason) {

                fields.payment_reason =
                    next;

            }

        }


        /* Payment channel */

        if (
            current === normalizeLabel("Payment channel")
        ) {

            if (!fields.payment_channel) {

                fields.payment_channel =
                    next;

            }

        }

    }


    /* -----------------------------------------------------
       STATUS FALLBACK
    ----------------------------------------------------- */

    const currentStatus =
        cleanText(
            fields.transaction_status
        );


    if (
        currentStatus.length > 100 ||
        (
            !currentStatus
                .toLowerCase()
                .includes("completed") &&
            !currentStatus
                .toLowerCase()
                .includes("successful") &&
            !currentStatus
                .toLowerCase()
                .includes("success") &&
            !currentStatus.includes("ተሳክቷል")
        )
    ) {

        const statusMatch =
            bodyText.match(
                /Transaction\s+status\s*:?\s*(Completed|Successful|Success)/i
            );


        if (statusMatch) {

            fields.transaction_status =
                statusMatch[1];

        }

    }


    /* -----------------------------------------------------
       INVOICE FALLBACK
    ----------------------------------------------------- */

    if (
        !fields.receiptNo ||
        fields.receiptNo.length > 100
    ) {

        const invoiceMatch =
            bodyText.match(
                /Invoice\s+No\.?\s*:?\s*([A-Za-z0-9._-]{3,100})/i
            );


        if (invoiceMatch) {

            fields.receiptNo =
                invoiceMatch[1];

        }

    }


    /* -----------------------------------------------------
       DATE FALLBACK
    ----------------------------------------------------- */

    if (!fields.date) {

        const dateMatch =
            bodyText.match(
                /Payment\s+date\s*:?\s*(\d{2}-\d{2}-\d{4}\s+\d{2}:\d{2}:\d{2})/i
            );


        if (dateMatch) {

            fields.date =
                dateMatch[1];

        }

    }


    /* -----------------------------------------------------
       AMOUNT FALLBACK
    ----------------------------------------------------- */

    if (
        !Number.isFinite(
            fields.settled_amount
        )
    ) {

        const amountMatch =
            bodyText.match(
                /Settled\s+Amount\s*:?\s*([\d,]+(?:\.\d+)?)\s*Birr/i
            );


        if (amountMatch) {

            fields.settled_amount =
                parseAmount(
                    amountMatch[1]
                );

        }

    }


    /* -----------------------------------------------------
       TOTAL FALLBACK
    ----------------------------------------------------- */

    if (
        !Number.isFinite(
            fields.total_amount
        )
    ) {

        const totalMatch =
            bodyText.match(
                /Total\s+Paid\s+Amount\s*:?\s*([\d,]+(?:\.\d+)?)\s*Birr/i
            );


        if (totalMatch) {

            fields.total_amount =
                parseAmount(
                    totalMatch[1]
                );

        }

    }


    /* -----------------------------------------------------
       CLEAN STRING FIELDS
    ----------------------------------------------------- */

    for (
        const key of Object.keys(fields)
    ) {

        if (
            typeof fields[key] === "string"
        ) {

            fields[key] =
                cleanText(
                    fields[key]
                );

        }

    }


    return fields;
}


/* =========================================================
   LOAD TELEBIRR RECEIPT
========================================================= */

function loadReceipt({
    receiptNo,
    fullUrl
} = {}) {

    return new Promise(
        (resolve, reject) => {

            let url;


            /* -------------------------------------------------
               Build official Telebirr receipt URL
            ------------------------------------------------- */

            if (receiptNo) {

                url =
                    `https://transactioninfo.ethiotelecom.et/receipt/${encodeURIComponent(receiptNo)}`;

            } else if (fullUrl) {

                url = fullUrl;

            } else {

                reject(
                    new Error(
                        "Receipt number or URL is required."
                    )
                );

                return;

            }


            /* -------------------------------------------------
               Validate URL
            ------------------------------------------------- */

            let parsedUrl;


            try {

                parsedUrl =
                    new URL(url);

            } catch (error) {

                reject(
                    new Error(
                        "Invalid receipt URL."
                    )
                );

                return;

            }


            /* -------------------------------------------------
               Official Telebirr host only
            ------------------------------------------------- */

            if (
                parsedUrl.protocol !== "https:" ||
                parsedUrl.hostname !==
                    "transactioninfo.ethiotelecom.et"
            ) {

                reject(
                    new Error(
                        "Invalid receipt host."
                    )
                );

                return;

            }


            /* -------------------------------------------------
               HTTPS request
            ------------------------------------------------- */

            const options = {

                hostname:
                    parsedUrl.hostname,

                port:
                    parsedUrl.port || 443,

                path:
                    `${parsedUrl.pathname}${parsedUrl.search}`,

                method:
                    "GET",

                headers: {

                    "User-Agent":
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/151 Safari/537.36",

                    "Accept":
                        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",

                    "Accept-Language":
                        "en-US,en;q=0.9"

                },

                timeout: 15000

            };


            const request =
                https.request(
                    options,
                    response => {

                        let data = "";


                        response.setEncoding(
                            "utf8"
                        );


                        response.on(
                            "data",
                            chunk => {

                                data += chunk;

                            }
                        );


                        response.on(
                            "end",
                            () => {

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


                                if (!data.trim()) {

                                    reject(
                                        new Error(
                                            "Telebirr returned an empty receipt."
                                        )
                                    );

                                    return;

                                }


                                resolve(data);

                            }
                        );

                    }
                );


            request.on(
                "timeout",
                () => {

                    request.destroy(
                        new Error(
                            "Telebirr receipt request timed out."
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


            request.end();

        }
    );

}


/* =========================================================
   EXPORT
========================================================= */

module.exports = {

    receipt,

    parseFromHTML,

    loadReceipt

};