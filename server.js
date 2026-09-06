const express = require("express");
const session = require("express-session");
const path = require("path");
const BetterSqlite3Store = require("better-sqlite3-session-store")(session);
const BetterSqlite3 = require("better-sqlite3");

const {
    parseFromHTML,
    loadReceipt
} = require("./index");

const db = require("./database");

const app = express();
const PORT = process.env.PORT || 3000;

/*
==========================================
ADMIN ACCOUNTS
==========================================
*/

const ADMIN_ACCOUNTS = {
    "naol.b": "Naol@7898",
    "zedingle.a": "Zedingle@7898",
    "abrham.w": "Abrham@7898",
    "brook.b": "Brook@7898",
    "suraphel.a": "Suraphel@7898"
};

/*
==========================================
APPROVED SETTLEMENT WALLETS
==========================================
*/

const SETTLEMENT_WALLETS = [
    "251931121236",
    "25192546449",
    "251992547803",
    "251972606080",
    "251953699900",
    "251908986699",
    "251995039529",
    "251951662675"
];

/*
==========================================
MIDDLEWARE
==========================================
*/

app.use(express.json());
app.use(
    express.urlencoded({
        extended: true
    })
);

/*
==========================================
SESSION
==========================================
*/

const SESSION_DB_PATH = path.join(
    __dirname,
    "data",
    "sessions.db"
);

app.use(
    session({
        secret:
            process.env.SESSION_SECRET ||
            "nexel-pays-change-this-secret-before-production",

        resave: false,

        saveUninitialized: false,

        store: new BetterSqlite3Store({
            client: new BetterSqlite3(SESSION_DB_PATH)
        }),

        cookie: {
            httpOnly: true,
            secure: false,
            sameSite: "lax",
            maxAge: 8 * 60 * 60 * 1000
        }
    })
);

app.use(
    express.static(
        path.join(__dirname, "public")
    )
);

/*
==========================================
ACCOUNT CLEANING
==========================================
*/

function cleanAccount(value) {
    if (
        value === undefined ||
        value === null
    ) {
        return "";
    }

    return String(value)
        .replace(/\s+/g, "")
        .replace(/[^\d*+]/g, "");
}

/*
==========================================
ACCOUNT MATCHING
==========================================
*/

function accountMatches(
    account,
    wallet
) {
    const a = cleanAccount(account);
    const b = cleanAccount(wallet);

    if (!a || !b) {
        return false;
    }

    if (a === b) {
        return true;
    }

    if (a.includes("*")) {
        const parts = a.split("*");

        const prefix = parts[0];
        const suffix =
            parts[parts.length - 1];

        if (
            prefix &&
            suffix &&
            b.startsWith(prefix) &&
            b.endsWith(suffix)
        ) {
            return true;
        }
    }

    if (!a.includes("*")) {
        if (
            a.endsWith(b) ||
            b.endsWith(a)
        ) {
            return true;
        }
    }

    return false;
}

/*
==========================================
FIND APPROVED SETTLEMENT WALLET
==========================================
*/

function findSettlementWallet(
    account
) {
    for (
        const wallet of SETTLEMENT_WALLETS
    ) {
        if (
            accountMatches(
                account,
                wallet
            )
        ) {
            return wallet;
        }
    }

    return null;
}

/*
==========================================
AUTHENTICATION
==========================================
*/

function requireLogin(
    req,
    res,
    next
) {
    if (
        !req.session ||
        !req.session.authenticated
    ) {
        return res.status(401).json({
            success: false,
            message:
                "Authentication required."
        });
    }

    next();
}

/*
==========================================
HOME
==========================================
*/

app.get(
    "/",
    function (req, res) {
        res.sendFile(
            path.join(
                __dirname,
                "public",
                "index.html"
            )
        );
    }
);

/*
==========================================
LOGIN
==========================================
*/

app.post(
    "/api/login",
    function (req, res) {
        const username =
            String(
                req.body.username || ""
            ).trim();

        const password =
            String(
                req.body.password || ""
            );

        if (
            !username ||
            !password
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Username and password are required."
            });
        }

        if (
            Object.prototype.hasOwnProperty.call(
                ADMIN_ACCOUNTS,
                username
            ) &&
            ADMIN_ACCOUNTS[
                username
            ] === password
        ) {
            req.session.authenticated =
                true;

            req.session.username =
                username;

            return res.json({
                success: true,
                message:
                    "Login successful.",
                username:
                    username
            });
        }

        return res.status(401).json({
            success: false,
            message:
                "Invalid username or password."
        });
    }
);

/*
==========================================
SESSION CHECK
==========================================
*/

app.get(
    "/api/session",
    function (req, res) {
        if (
            req.session &&
            req.session.authenticated
        ) {
            return res.json({
                success: true,
                loggedIn: true,
                authenticated: true,
                username:
                    req.session.username ||
                    ""
            });
        }

        return res.json({
            success: true,
            loggedIn: false,
            authenticated: false
        });
    }
);

/*
==========================================
LOGOUT
==========================================
*/

app.post(
    "/api/logout",
    function (req, res) {
        req.session.destroy(
            function (error) {
                if (error) {
                    console.error(
                        "Logout error:",
                        error
                    );

                    return res.status(
                        500
                    ).json({
                        success: false,
                        message:
                            "Unable to logout."
                    });
                }

                res.clearCookie(
                    "connect.sid"
                );

                return res.json({
                    success: true,
                    message:
                        "Logged out successfully."
                });
            }
        );
    }
);

/*
==========================================
TELEBIRR CONNECTION TEST
==========================================
*/

app.get(
    "/api/telebirr-test",
    requireLogin,
    async function (req, res) {
        const receiptNo =
            "DI52GY7RUI";

        try {
            console.log(
                "Testing direct Telebirr connection..."
            );

            console.log(
                "Receipt:",
                receiptNo
            );

            const html =
                await loadReceipt({
                    receiptNo:
                        receiptNo
                });

            return res.json({
                success: true,
                message:
                    "Telebirr receipt retrieved successfully.",
                receiptNo:
                    receiptNo,
                htmlLength:
                    html.length
            });
        } catch (error) {
            console.error(
                "Telebirr direct test error:",
                error
            );

            return res.status(
                502
            ).json({
                success: false,
                message:
                    "Unable to connect directly to Telebirr.",
                error:
                    error.message
            });
        }
    }
);

/*
==========================================
VERIFY TRANSACTION
==========================================
*/

app.post(
    "/api/verify",
    requireLogin,
    async function (req, res) {

        /*
        ----------------------------------
        GET TRANSACTION ID
        ----------------------------------
        */

        const transactionId =
            String(
                req.body.transactionId ||
                req.body.transaction_id ||
                req.body.receiptNo ||
                req.body.receipt_no ||
                ""
            ).trim();

        if (!transactionId) {
            return res.status(
                400
            ).json({
                success: false,
                verified: false,
                duplicate: false,
                message:
                    "Transaction ID is required."
            });
        }

        /*
        ----------------------------------
        GET TELEBIRR RECEIPT
        ----------------------------------
        */

        let html;

        try {
            console.log(
                "Verifying transaction directly with Telebirr:",
                transactionId
            );

            html =
                await loadReceipt({
                    receiptNo:
                        transactionId
                });
        } catch (error) {
            console.error(
                "Telebirr connection error:",
                error
            );

            return res.status(
                502
            ).json({
                success: false,
                verified: false,
                duplicate: false,
                message:
                    "Unable to retrieve the Telebirr receipt.",
                error:
                    error.message
            });
        }

        /*
        ----------------------------------
        CHECK HTML
        ----------------------------------
        */

        if (
            !html ||
            html.length < 100
        ) {
            return res.status(
                502
            ).json({
                success: false,
                verified: false,
                duplicate: false,
                message:
                    "Telebirr returned an empty or invalid receipt."
            });
        }

        /*
        ----------------------------------
        PARSE RECEIPT
        ----------------------------------
        */

        let parsed;

        try {
            parsed =
                parseFromHTML(html);
        } catch (parseError) {
            console.error(
                "Receipt parsing error:",
                parseError
            );

            return res.status(
                500
            ).json({
                success: false,
                verified: false,
                duplicate: false,
                message:
                    "Unable to parse the Telebirr receipt."
            });
        }

        if (
            !parsed ||
            typeof parsed !== "object"
        ) {
            return res.status(
                404
            ).json({
                success: false,
                verified: false,
                duplicate: false,
                message:
                    "No valid receipt information was found."
            });
        }

        /*
        ----------------------------------
        RECEIPT NUMBER
        ----------------------------------
        */

        const receiptNo =
            parsed.receiptNo ||
            parsed.invoice_no ||
            parsed.invoiceNo ||
            transactionId;

        /*
        ----------------------------------
        TRANSACTION STATUS
        ----------------------------------
        */

        const status =
            String(
                parsed.transaction_status ||
                parsed.transactionStatus ||
                parsed.status ||
                ""
            ).trim();

        const normalizedStatus =
            status.toLowerCase();

        /*
        ----------------------------------
        TRANSACTION FOUND
        ----------------------------------
        */

        const transactionFound =
            Boolean(
                receiptNo &&
                html &&
                html.length > 100
            );

        /*
        ----------------------------------
        TRANSACTION COMPLETED
        ----------------------------------
        */

        const transactionCompleted =
            normalizedStatus ===
                "completed" ||
            normalizedStatus.startsWith(
                "completed "
            ) ||
            normalizedStatus ===
                "successful" ||
            normalizedStatus.startsWith(
                "successful "
            ) ||
            normalizedStatus ===
                "success" ||
            normalizedStatus.startsWith(
                "success "
            ) ||
            normalizedStatus ===
                "paid" ||
            normalizedStatus.startsWith(
                "paid "
            );

        /*
        ----------------------------------
        CREDITED ACCOUNT
        ----------------------------------
        */

        const creditedAccount =
            parsed.credited_party_acc_no ||
            parsed.creditedPartyAccount ||
            parsed.creditedAccount ||
            parsed.credited_account ||
            parsed.receiverAccount ||
            parsed.receiver_account ||
            "";

        /*
        ----------------------------------
        SETTLEMENT CHECK
        ----------------------------------
        */

        const settlementWallet =
            findSettlementWallet(
                creditedAccount
            );

        const settlementMatched =
            settlementWallet !== null;

        /*
        ----------------------------------
        BASIC VERIFICATION
        ----------------------------------
        */

        const verified =
            transactionFound &&
            transactionCompleted &&
            settlementMatched;

        /*
        ==================================
        DUPLICATE CHECK
        ==================================
        */

        let existingTransaction = null;

        try {
            existingTransaction =
                db.prepare(`
                    SELECT
                        id,
                        receipt_no,
                        settled_amount,
                        total_amount,
                        verified_by,
                        verified_at,
                        status
                    FROM transactions
                    WHERE receipt_no = ?
                    LIMIT 1
                `).get(receiptNo);
        } catch (dbError) {
            console.error(
                "Database duplicate check error:",
                dbError
            );

            return res.status(
                500
            ).json({
                success: false,
                verified: false,
                duplicate: false,
                message:
                    "Unable to check transaction history."
            });
        }

        /*
        ==================================
        IF DUPLICATE
        ==================================
        */

        if (
            existingTransaction
        ) {
            console.log(
                "DUPLICATE TRANSACTION:",
                receiptNo
            );

            return res.json({
                success: true,

                verified: false,

                duplicate: true,

                message:
                    "This transaction has already been verified.",

                duplicateInfo: {
                    receipt_no:
                        existingTransaction.receipt_no,

                    verified_by:
                        existingTransaction.verified_by,

                    verified_at:
                        existingTransaction.verified_at,

                    amount:
                        existingTransaction.settled_amount,

                    total_amount:
                        existingTransaction.total_amount,

                    status:
                        existingTransaction.status
                },

                checks: {
                    transactionFound:
                        transactionFound,

                    transactionCompleted:
                        transactionCompleted,

                    settlementMatched:
                        settlementMatched
                },

                receipt: {
                    transaction_id:
                        transactionId,

                    invoice_no:
                        receiptNo,

                    transaction_status:
                        status,

                    settled_amount:
                        parsed.settled_amount ??
                        "",

                    total_paid_amount:
                        parsed.total_amount ??
                        "",

                    service_fee:
                        parsed.service_fee ??
                        "",

                    service_fee_vat:
                        parsed.service_fee_vat ??
                        "",

                    total_fee:
                        parsed.total_fee ??
                        "",

                    payment_date:
                        parsed.date ||
                        "",

                    payment_mode:
                        parsed.payment_mode ||
                        "",

                    payment_channel:
                        parsed.payment_channel ||
                        "",

                    payer_name:
                        parsed.payer_name ||
                        "",

                    payer_account:
                        parsed.payer_telebirr_no ||
                        "",

                    credited_party_name:
                        parsed.credited_party_name ||
                        "",

                    credited_party_account:
                        creditedAccount,

                    payment_reason:
                        parsed.payment_reason ||
                        "",

                    settlement_wallet:
                        settlementWallet ||
                        ""
                }
            });
        }

        /*
        ==================================
        VERIFICATION MESSAGE
        ==================================
        */

        let message;

        if (verified) {
            message =
                "Payment successfully verified.";
        } else if (
            !transactionFound
        ) {
            message =
                "Transaction receipt was not found.";
        } else if (
            !transactionCompleted
        ) {
            message =
                "Transaction was found, but its status is not completed.";
        } else if (
            !settlementMatched
        ) {
            message =
                "Transaction was completed, but the credited account does not match an approved settlement wallet.";
        } else {
            message =
                "Payment could not be verified.";
        }

        /*
        ==================================
        SAVE VERIFIED TRANSACTION
        ==================================
        */

        if (verified) {
            const verifiedBy =
                req.session.username ||
                "unknown";

            const verifiedAt =
                new Date().toISOString();

            try {
                const insert =
                    db.prepare(`
                        INSERT INTO transactions (
                            receipt_no,

                            payer_name,
                            payer_telebirr_no,

                            credited_party_name,
                            credited_party_acc_no,

                            transaction_status,

                            settled_amount,
                            service_fee,
                            service_fee_vat,
                            total_fee,
                            total_amount,

                            payment_mode,
                            payment_reason,
                            payment_channel,

                            verified_by,
                            verified_at,

                            status
                        )
                        VALUES (
                            @receipt_no,

                            @payer_name,
                            @payer_telebirr_no,

                            @credited_party_name,
                            @credited_party_acc_no,

                            @transaction_status,

                            @settled_amount,
                            @service_fee,
                            @service_fee_vat,
                            @total_fee,
                            @total_amount,

                            @payment_mode,
                            @payment_reason,
                            @payment_channel,

                            @verified_by,
                            @verified_at,

                            @status
                        )
                    `);

                insert.run({
                    receipt_no:
                        receiptNo,

                    payer_name:
                        parsed.payer_name ||
                        "",

                    payer_telebirr_no:
                        parsed.payer_telebirr_no ||
                        "",

                    credited_party_name:
                        parsed.credited_party_name ||
                        "",

                    credited_party_acc_no:
                        creditedAccount,

                    transaction_status:
                        status,

                    settled_amount:
                        parsed.settled_amount ??
                        null,

                    service_fee:
                        parsed.service_fee ??
                        null,

                    service_fee_vat:
                        parsed.service_fee_vat ??
                        null,

                    total_fee:
                        parsed.total_fee ??
                        null,

                    total_amount:
                        parsed.total_amount ??
                        null,

                    payment_mode:
                        parsed.payment_mode ||
                        "",

                    payment_reason:
                        parsed.payment_reason ||
                        "",

                    payment_channel:
                        parsed.payment_channel ||
                        "",

                    verified_by:
                        verifiedBy,

                    verified_at:
                        verifiedAt,

                    status:
                        "VERIFIED"
                });

                console.log(
                    "Transaction saved:",
                    receiptNo
                );

            } catch (dbError) {

                /*
                ----------------------------------
                RACE CONDITION PROTECTION
                ----------------------------------
                */

                if (
                    dbError &&
                    dbError.code ===
                        "SQLITE_CONSTRAINT_UNIQUE"
                ) {
                    const duplicate =
                        db.prepare(`
                            SELECT
                                receipt_no,
                                settled_amount,
                                total_amount,
                                verified_by,
                                verified_at,
                                status
                            FROM transactions
                            WHERE receipt_no = ?
                            LIMIT 1
                        `).get(receiptNo);

                    return res.json({
                        success: true,
                        verified: false,
                        duplicate: true,

                        message:
                            "This transaction has already been verified.",

                        duplicateInfo: {
                            receipt_no:
                                duplicate.receipt_no,

                            verified_by:
                                duplicate.verified_by,

                            verified_at:
                                duplicate.verified_at,

                            amount:
                                duplicate.settled_amount,

                            total_amount:
                                duplicate.total_amount,

                            status:
                                duplicate.status
                        },

                        checks: {
                            transactionFound:
                                transactionFound,

                            transactionCompleted:
                                transactionCompleted,

                            settlementMatched:
                                settlementMatched
                        }
                    });
                }

                console.error(
                    "Database save error:",
                    dbError
                );

                return res.status(
                    500
                ).json({
                    success: false,
                    verified: false,
                    duplicate: false,
                    message:
                        "Payment was verified, but the transaction could not be saved to the database."
                });
            }
        }

        /*
        ==================================
        RETURN NORMAL RESULT
        ==================================
        */

        return res.json({
            success: true,

            verified:
                verified,

            duplicate:
                false,

            message:
                message,

            checks: {
                transactionFound:
                    transactionFound,

                transactionCompleted:
                    transactionCompleted,

                settlementMatched:
                    settlementMatched
            },

            receipt: {
                transaction_id:
                    transactionId,

                invoice_no:
                    receiptNo,

                transaction_status:
                    status,

                settled_amount:
                    parsed.settled_amount ??
                    parsed.settledAmount ??
                    "",

                total_paid_amount:
                    parsed.total_amount ??
                    parsed.total_paid_amount ??
                    parsed.totalPaidAmount ??
                    "",

                service_fee:
                    parsed.service_fee ??
                    parsed.serviceFee ??
                    "",

                service_fee_vat:
                    parsed.service_fee_vat ??
                    parsed.serviceFeeVat ??
                    "",

                total_fee:
                    parsed.total_fee ??
                    "",

                payment_date:
                    parsed.date ||
                    parsed.payment_date ||
                    parsed.paymentDate ||
                    "",

                payment_mode:
                    parsed.payment_mode ||
                    parsed.paymentMode ||
                    "",

                payment_channel:
                    parsed.payment_channel ||
                    parsed.paymentChannel ||
                    "",

                payer_name:
                    parsed.payer_name ||
                    parsed.payer ||
                    parsed.payerName ||
                    "",

                payer_account:
                    parsed.payer_telebirr_no ||
                    parsed.payer_account ||
                    parsed.payerAccount ||
                    "",

                credited_party_name:
                    parsed.credited_party_name ||
                    parsed.creditedParty ||
                    parsed.creditedPartyName ||
                    "",

                credited_party_account:
                    creditedAccount,

                payment_reason:
                    parsed.payment_reason ||
                    parsed.paymentReason ||
                    "",

                settlement_wallet:
                    settlementWallet ||
                    ""
            }
        });
    }
);

/*
==========================================
UNKNOWN API ROUTE
==========================================
*/

app.use(
    "/api",
    function (req, res) {
        res.status(404).json({
            success: false,
            message:
                "API endpoint not found."
        });
    }
);

/*
==========================================
START SERVER
==========================================
*/

app.listen(
    PORT,
    function () {
        console.log(
            "=========================================="
        );

        console.log(
            "       NEXEL PAYS PAYMENT VERIFIER"
        );

        console.log(
            "=========================================="
        );

        console.log(
            "Server running on port " +
                PORT
        );

        console.log(
            "Telebirr connection: DIRECT"
        );

        console.log(
            "SQLite database: ENABLED"
        );

        console.log(
            "Duplicate detection: ENABLED"
        );

        console.log(
            "=========================================="
        );
    }
);