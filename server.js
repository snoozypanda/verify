require("dotenv").config();

const express = require("express");
const session = require("express-session");
const path = require("path");
const https = require("https");

const { loadReceipt, parseFromHTML } = require("./index");

const app = express();
const PORT = 3000;


/* =========================================================
   ADMIN ACCOUNTS
   TEMPORARY TEST CREDENTIALS
   CHANGE THESE BEFORE PRODUCTION
========================================================= */

const ADMIN_ACCOUNTS = [
    {
        username: "naol.b",
        password: "Naol@7898"
    },
    {
        username: "zedingle.a",
        password: "Zedingle@7898"
    },
    {
        username: "abrham.w",
        password: "Abrham@7898"
    },
    {
        username: "brook.b",
        password: "Brook@7898"
    },
    {
        username: "suraphel.a",
        password: "Suraphel@7898"
    }
];


/* =========================================================
   SETTLEMENT TELEBIRR ACCOUNTS
========================================================= */

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


/* =========================================================
   EXPRESS CONFIGURATION
========================================================= */

app.use(express.json());

app.use(
    express.urlencoded({
        extended: true
    })
);


/* =========================================================
   SESSION
========================================================= */

app.use(
    session({
        secret:
            process.env.SESSION_SECRET ||
            "nexel-pays-change-this-secret-before-production",

        resave: false,

        saveUninitialized: false,

        cookie: {
            httpOnly: true,

            secure: false,

            sameSite: "lax",

            maxAge: 8 * 60 * 60 * 1000
        }
    })
);


/* =========================================================
   STATIC WEBSITE
========================================================= */

app.use(
    express.static(
        path.join(__dirname, "public")
    )
);


/* =========================================================
   ACCOUNT HELPERS
========================================================= */

function cleanAccount(value) {

    return String(value || "")
        .replace(/\s+/g, "")
        .replace(/[^\d*]/g, "");
}


/*
 * Compares a Telebirr receipt account with
 * one of our configured settlement accounts.
 *
 * Supports:
 *
 * Exact:
 * 251931121236
 *
 * Masked:
 * 2519****1236
 *
 * The * characters are treated as wildcards.
 */

function accountMatches(receiptAccount, configuredAccount) {

    const receipt =
        cleanAccount(receiptAccount);

    const configured =
        cleanAccount(configuredAccount);


    if (!receipt || !configured) {
        return false;
    }


    /*
     * Exact match
     */

    if (receipt === configured) {
        return true;
    }


    /*
     * A masked account must have
     * the same length.
     */

    if (receipt.length !== configured.length) {
        return false;
    }


    /*
     * Compare every visible character.
     *
     * "*" means unknown/masked character.
     */

    for (let i = 0; i < receipt.length; i++) {

        if (receipt[i] === "*") {
            continue;
        }

        if (receipt[i] !== configured[i]) {
            return false;
        }
    }


    return true;
}


/*
 * Find which configured settlement
 * account matches the receipt.
 */

function findSettlementWallet(receiptAccount) {

    for (const wallet of SETTLEMENT_WALLETS) {

        if (
            accountMatches(
                receiptAccount,
                wallet
            )
        ) {
            return wallet;
        }
    }

    return null;
}


/* =========================================================
   LOGIN MIDDLEWARE
========================================================= */

function requireLogin(req, res, next) {

    if (
        req.session &&
        req.session.authenticated === true
    ) {
        return next();
    }


    return res.status(401).json({

        success: false,

        message: "Unauthorized"
    });
}


/* =========================================================
   HOME PAGE
========================================================= */

app.get("/", (req, res) => {

    res.sendFile(
        path.join(
            __dirname,
            "public",
            "index.html"
        )
    );
});


/* =========================================================
   LOGIN
========================================================= */

app.post("/api/login", (req, res) => {

    const username =
        String(
            req.body.username || ""
        ).trim();


    const password =
        String(
            req.body.password || ""
        );


    if (!username || !password) {

        return res.status(400).json({

            success: false,

            message:
                "Username and password are required."
        });
    }


    const account =
        ADMIN_ACCOUNTS.find(
            admin =>
                admin.username === username &&
                admin.password === password
        );


    if (!account) {

        console.log(
            `Login failed: ${username}`
        );


        return res.status(401).json({

            success: false,

            message:
                "Invalid login credentials."
        });
    }


    /*
     * Mark session as authenticated.
     */

    req.session.authenticated = true;

    req.session.username =
        account.username;


    /*
     * Explicitly save the session before
     * sending the response.
     */

    req.session.save(error => {

        if (error) {

            console.error(
                "Session save error:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Unable to create login session."
            });
        }


        console.log(
            `Login successful: ${account.username}`
        );


        return res.json({

            success: true,

            message:
                "Login successful.",

            username:
                account.username
        });
    });
});


/* =========================================================
   CHECK LOGIN SESSION
========================================================= */

app.get("/api/session", (req, res) => {

    if (
        req.session &&
        req.session.authenticated === true
    ) {

        return res.json({

            loggedIn: true,

            username:
                req.session.username
        });
    }


    return res.json({

        loggedIn: false
    });
});


/* =========================================================
   LOGOUT
========================================================= */

app.post("/api/logout", (req, res) => {

    const username =
        req.session?.username ||
        "unknown";


    req.session.destroy(error => {

        if (error) {

            console.error(
                "Logout error:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Logout failed."
            });
        }


        console.log(
            `Logout: ${username}`
        );


        res.clearCookie(
            "connect.sid"
        );


        return res.json({

            success: true,

            message:
                "Logged out successfully."
        });
    });
});


/* =========================================================
   TEMPORARY TELEBIRR CONNECTIVITY TEST
========================================================= */

app.get("/api/telebirr-test", (req, res) => {

    const url =
        "https://transactioninfo.ethiotelecom.et/receipt/DI52GY7RUI";


    console.log("");

    console.log(
        "========== TELEBIRR CONNECTIVITY TEST =========="
    );

    console.log(
        "Testing:",
        url
    );


    const start =
        Date.now();


    const request =
        https.get(
            url,
            {
                headers: {

                    "User-Agent":
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/151.0.0.0 Safari/537.36",

                    "Accept":
                        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",

                    "Accept-Language":
                        "en-US,en;q=0.9"
                }
            },
            response => {

                const elapsed =
                    Date.now() - start;


                console.log(
                    "HTTP status:",
                    response.statusCode
                );


                console.log(
                    "Response time:",
                    elapsed,
                    "ms"
                );


                /*
                 * We don't need to read the entire
                 * receipt for this test.
                 */

                response.resume();


                response.on(
                    "end",
                    () => {

                        console.log(
                            "Telebirr connection test completed."
                        );


                        console.log(
                            "=============================================="
                        );


                        return res.json({

                            success: true,

                            reachable: true,

                            statusCode:
                                response.statusCode,

                            responseTimeMs:
                                elapsed
                        });
                    }
                );
            }
        );


    /*
     * Stop the test after 10 seconds.
     */

    request.setTimeout(
        10000,
        () => {

            request.destroy(
                new Error(
                    "Telebirr connection timed out after 10 seconds."
                )
            );
        }
    );


    /*
     * Handle connection errors.
     */

    request.on(
        "error",
        error => {

            const elapsed =
                Date.now() - start;


            console.error(
                "Telebirr connection error:",
                error.message
            );


            console.log(
                "Response time:",
                elapsed,
                "ms"
            );


            console.log(
                "=============================================="
            );


            if (!res.headersSent) {

                return res.status(502).json({

                    success: false,

                    reachable: false,

                    error:
                        error.message,

                    responseTimeMs:
                        elapsed
                });
            }
        }
    );
});


/* =========================================================
   VERIFY PAYMENT
========================================================= */

app.post(
    "/api/verify",
    requireLogin,
    async (req, res) => {

        /*
         * Get transaction ID from frontend.
         */

        const transactionId =
            String(
                req.body.transactionId ||
                ""
            ).trim();


        if (!transactionId) {

            return res.status(400).json({

                success: false,

                verified: false,

                message:
                    "Transaction ID is required.",

                checks: {

                    transactionFound: false,

                    transactionCompleted: false,

                    settlementMatched: false
                },

                receipt: null
            });
        }


        console.log("");

        console.log(
            "========== PAYMENT VERIFICATION =========="
        );

        console.log(
            "Admin:",
            req.session.username
        );

        console.log(
            "Transaction ID:",
            transactionId
        );


        try {

            /* =================================================
               STEP 1 — RETRIEVE TELEBIRR RECEIPT
            ================================================= */

            console.log(
                "Retrieving Telebirr receipt..."
            );


            const html =
                await loadReceipt({
                    receiptNo: transactionId
                });


            if (!html) {

                throw new Error(
                    "Telebirr returned an empty receipt."
                );
            }


            console.log(
                "Telebirr receipt retrieved successfully."
            );


            /* =================================================
               STEP 2 — PARSE RECEIPT
            ================================================= */

            const parsed =
                parseFromHTML(html);


            console.log(
                "Parsed receipt:",
                parsed
            );


            /*
             * A valid parsed receipt should
             * contain receipt information.
             */

            const transactionFound =
                Boolean(
                    parsed &&
                    Object.keys(parsed).length > 0
                );


            /* =================================================
               STEP 3 — CHECK TRANSACTION STATUS
            ================================================= */

            const status =
                String(
                    parsed.transaction_status ||
                    ""
                ).trim();


            const normalizedStatus =
                status.toLowerCase();


            const transactionCompleted =
                normalizedStatus === "completed" ||
                normalizedStatus === "successful" ||
                normalizedStatus === "success" ||
                normalizedStatus.includes("completed") ||
                normalizedStatus.includes("successful") ||
                normalizedStatus.includes("success") ||
                status.includes("ተሳክቷል");


            /* =================================================
               STEP 4 — GET CREDITED ACCOUNT
            ================================================= */

            const creditedAccount =
                parsed.credited_party_acc_no ||
                parsed.credited_party_account ||
                parsed.creditedAccount ||
                "";


            console.log(
                "Transaction status:",
                status || "N/A"
            );


            console.log(
                "Credited account:",
                creditedAccount || "N/A"
            );


            /* =================================================
               STEP 5 — MATCH SETTLEMENT ACCOUNT
            ================================================= */

            const matchedSettlementWallet =
                findSettlementWallet(
                    creditedAccount
                );


            const settlementMatched =
                Boolean(
                    matchedSettlementWallet
                );


            console.log(
                "Settlement account matched:",
                settlementMatched
            );


            if (matchedSettlementWallet) {

                console.log(
                    "Matched settlement wallet:",
                    matchedSettlementWallet
                );
            }


            /* =================================================
               STEP 6 — FINAL VERIFICATION
            ================================================= */

            const verified =
                transactionFound &&
                transactionCompleted &&
                settlementMatched;


            console.log(
                "FINAL VERIFICATION:",
                verified
            );


            console.log(
                "=========================================="
            );


            /* =================================================
               STEP 7 — FORMAT RECEIPT FOR FRONTEND
            ================================================= */

            const receipt = {

                transaction_id:
                    transactionId,

                invoice_no:
                    parsed.receiptNo ||
                    transactionId,

                transaction_status:
                    parsed.transaction_status ||
                    "",

                settled_amount:
                    parsed.settled_amount ??
                    null,

                total_paid_amount:
                    parsed.total_amount ??
                    null,

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

                credited_party_name:
                    parsed.credited_party_name ||
                    "",

                credited_party_account:
                    creditedAccount ||
                    "",

                payment_reason:
                    parsed.payment_reason ||
                    ""
            };


            /* =================================================
               STEP 8 — SEND RESULT TO FRONTEND
            ================================================= */

            return res.json({

                success: true,

                verified: verified,

                message:
                    verified
                        ? "Payment verified successfully."
                        : !transactionFound
                            ? "Transaction could not be found."
                            : !transactionCompleted
                                ? "Transaction has not been completed."
                                : !settlementMatched
                                    ? "Credited account does not match a configured settlement account."
                                    : "Payment could not be verified.",

                checks: {

                    transactionFound:
                        transactionFound,

                    transactionCompleted:
                        transactionCompleted,

                    settlementMatched:
                        settlementMatched
                },

                receipt: receipt
            });


        } catch (error) {

            console.error("");

            console.error(
                "========== VERIFICATION ERROR =========="
            );

            console.error(
                error
            );

            console.error(
                "========================================"
            );


            return res.status(502).json({

                success: false,

                verified: false,

                message:
                    "Unable to retrieve or verify the Telebirr receipt.",

                checks: {

                    transactionFound: false,

                    transactionCompleted: false,

                    settlementMatched: false
                },

                receipt: null
            });
        }
    }
);


/* =========================================================
   UNKNOWN API ROUTES
========================================================= */

app.use(
    "/api",
    (req, res) => {

        return res.status(404).json({

            success: false,

            message:
                "API endpoint not found."
        });
    }
);


/* =========================================================
   START SERVER
========================================================= */

app.listen(PORT, () => {

    console.log("");

    console.log(
        "=========================================="
    );

    console.log(
        "      NEXEL PAYS PAYMENT VERIFIER"
    );

    console.log(
        "=========================================="
    );

    console.log(
        `Admin accounts loaded: ${ADMIN_ACCOUNTS.length}`
    );

    console.log(
        `Settlement wallets: ${SETTLEMENT_WALLETS.length}`
    );

    console.log(
        `Server running on http://localhost:${PORT}`
    );

    console.log(
        "=========================================="
    );

});