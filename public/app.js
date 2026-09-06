document.addEventListener("DOMContentLoaded", function () {

    const loginPage = document.getElementById("loginPage");
    const dashboardPage = document.getElementById("dashboardPage");

    const loginForm = document.getElementById("loginForm");
    const loginError = document.getElementById("loginError");
    const loginButton = document.getElementById("loginButton");

    const verifyForm = document.getElementById("verifyForm");
    const verifyButton = document.getElementById("verifyButton");
    const verifyButtonText = document.getElementById("verifyButtonText");

    const logoutButton = document.getElementById("logoutButton");

    const resultSection = document.getElementById("resultSection");
    const resultCard = document.getElementById("resultCard");

    const resultIcon = document.getElementById("resultIcon");
    const resultLabel = document.getElementById("resultLabel");
    const resultTitle = document.getElementById("resultTitle");
    const resultDescription = document.getElementById("resultDescription");
    const resultBadge = document.getElementById("resultBadge");

    const checkTransaction = document.getElementById("checkTransaction");
    const checkStatus = document.getElementById("checkStatus");
    const checkSettlement = document.getElementById("checkSettlement");
    const checkApprovedWallet = document.getElementById("checkApprovedWallet");

    const receiptDetails = document.getElementById("receiptDetails");


    // =====================================================
    // PAGE CONTROL
    // =====================================================

    function showLogin() {

        if (loginPage) {
            loginPage.classList.remove("hidden");
        }

        if (dashboardPage) {
            dashboardPage.classList.add("hidden");
        }

    }


    function showDashboard() {

        if (loginPage) {
            loginPage.classList.add("hidden");
        }

        if (dashboardPage) {
            dashboardPage.classList.remove("hidden");
        }

    }


    // =====================================================
    // LOGIN
    // =====================================================

    if (loginForm) {

        loginForm.addEventListener("submit", async function (event) {

            event.preventDefault();

            const usernameInput =
                document.getElementById("username");

            const passwordInput =
                document.getElementById("password");


            const username =
                usernameInput
                    ? usernameInput.value.trim()
                    : "";


            const password =
                passwordInput
                    ? passwordInput.value
                    : "";


            if (!username || !password) {

                if (loginError) {

                    loginError.textContent =
                        "Username and password are required.";

                }

                return;

            }


            if (loginButton) {
                loginButton.disabled = true;
            }


            if (loginError) {
                loginError.textContent = "Signing in...";
            }


            try {

                const response = await fetch(
                    "/api/login",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        credentials:
                            "same-origin",

                        body: JSON.stringify({
                            username: username,
                            password: password
                        })
                    }
                );


                let data = {};

                try {

                    data =
                        await response.json();

                } catch (jsonError) {

                    data = {};

                }


                if (
                    !response.ok ||
                    !data.success
                ) {

                    if (loginError) {

                        loginError.textContent =
                            data.message ||
                            "Invalid username or password.";

                    }


                    if (loginButton) {
                        loginButton.disabled = false;
                    }


                    return;

                }


                if (loginError) {
                    loginError.textContent = "";
                }


                loginForm.reset();

                showDashboard();


            } catch (error) {

                console.error(
                    "Login error:",
                    error
                );


                if (loginError) {

                    loginError.textContent =
                        "Unable to connect to the server.";

                }

            } finally {

                if (loginButton) {
                    loginButton.disabled = false;
                }

            }

        });

    }


    // =====================================================
    // SESSION CHECK
    // =====================================================

    async function checkSession() {

        try {

            const response =
                await fetch(
                    "/api/session",
                    {
                        method: "GET",
                        credentials:
                            "same-origin"
                    }
                );


            const data =
                await response.json();


            if (
                data &&
                data.success &&
                data.authenticated
            ) {

                showDashboard();

            } else {

                showLogin();

            }


        } catch (error) {

            console.error(
                "Session check error:",
                error
            );


            showLogin();

        }

    }


    // =====================================================
    // LOGOUT
    // =====================================================

    if (logoutButton) {

        logoutButton.addEventListener(
            "click",
            async function () {

                try {

                    await fetch(
                        "/api/logout",
                        {
                            method: "POST",
                            credentials:
                                "same-origin"
                        }
                    );


                } catch (error) {

                    console.error(
                        "Logout error:",
                        error
                    );

                }


                showLogin();

                clearResults();

            }
        );

    }


    // =====================================================
    // VERIFY PAYMENT
    // =====================================================

    if (verifyForm) {

        verifyForm.addEventListener(
            "submit",
            async function (event) {

                event.preventDefault();


                const transactionInput =
                    document.getElementById(
                        "transactionId"
                    );


                const transactionId =
                    transactionInput
                        ? transactionInput.value.trim()
                        : "";


                if (!transactionId) {

                    displayError(
                        "Please enter a Telebirr transaction ID."
                    );

                    return;

                }


                clearResults();


                if (verifyButton) {
                    verifyButton.disabled = true;
                }


                if (verifyButtonText) {

                    verifyButtonText.textContent =
                        "Verifying...";

                }


                try {

                    const response =
                        await fetch(
                            "/api/verify",
                            {
                                method: "POST",

                                headers: {
                                    "Content-Type":
                                        "application/json"
                                },

                                credentials:
                                    "same-origin",

                                body: JSON.stringify({
                                    transactionId:
                                        transactionId
                                })
                            }
                        );


                    let data = {};


                    try {

                        data =
                            await response.json();

                    } catch (jsonError) {

                        data = {};

                    }


                    if (response.status === 401) {

                        // Session expired — redirect to login
                        if (loginError) {
                            loginError.textContent =
                                "Session expired. Please log in again.";
                        }

                        showLogin();

                        return;

                    }


                    if (!response.ok) {

                        displayError(
                            data.message ||
                            "Verification failed."
                        );

                        return;

                    }


                    displayResult(data);


                } catch (error) {

                    console.error(
                        "Verification error:",
                        error
                    );


                    displayError(
                        "Unable to connect to the verification server."
                    );


                } finally {

                    if (verifyButton) {
                        verifyButton.disabled = false;
                    }


                    if (verifyButtonText) {

                        verifyButtonText.textContent =
                            "Verify Payment";

                    }

                }

            }
        );

    }


    // =====================================================
    // DISPLAY RESULT
    // =====================================================

    function displayResult(data) {

        if (!resultSection) {
            return;
        }


        resultSection.classList.remove(
            "hidden"
        );


        const verified =
            Boolean(
                data &&
                data.verified
            );


        const duplicate =
            Boolean(
                data &&
                data.duplicate
            );


        const receipt =
            data &&
            data.receipt
                ? data.receipt
                : {};


        // =================================================
        // DUPLICATE TRANSACTION
        // =================================================

        if (duplicate) {

            clearDuplicateBox();


            if (resultIcon) {

                resultIcon.textContent =
                    "!";

                resultIcon.style.color =
                    "#d97706";

                resultIcon.style.background =
                    "#fef3c7";

            }


            if (resultLabel) {

                resultLabel.textContent =
                    "DUPLICATE TRANSACTION";

                resultLabel.style.color =
                    "#d97706";

            }


            if (resultTitle) {

                resultTitle.textContent =
                    "This transaction has already been verified.";

            }


            if (resultDescription) {

                resultDescription.textContent =
                    data.message ||
                    "This transaction was previously verified and is being shown for review.";

            }


            if (resultBadge) {

                resultBadge.textContent =
                    "DUPLICATE";

                resultBadge.style.color =
                    "#b45309";

                resultBadge.style.background =
                    "#fef3c7";

                resultBadge.style.borderColor =
                    "#fcd34d";

            }


            const duplicateInfo =
                data.duplicateInfo || {};


            const duplicateBox =
                document.createElement(
                    "div"
                );


            duplicateBox.id =
                "nexelDuplicateInfo";


            duplicateBox.style.cssText = `
                margin-top:20px;
                padding:20px;
                border-radius:16px;
                background:#fffbeb;
                border:1px solid #fcd34d;
                box-shadow:0 4px 14px rgba(146,64,14,.08);
            `;


            const receiptNumber =
                duplicateInfo.receipt_no ||
                receipt.receiptNo ||
                receipt.transaction_id ||
                data.transactionId ||
                "—";


            const verifiedBy =
                duplicateInfo.verified_by ||
                "—";


            let verifiedAt =
                duplicateInfo.verified_at ||
                "—";


            if (
                verifiedAt !== "—" &&
                !isNaN(
                    Date.parse(verifiedAt)
                )
            ) {

                verifiedAt =
                    new Date(
                        verifiedAt
                    ).toLocaleString();

            }


            const duplicateAmount =
                parseNumber(
                    duplicateInfo.amount
                );


            const receiptAmount =
                parseNumber(
                    receipt.total_paid_amount
                );


            const settledAmount =
                parseNumber(
                    receipt.settled_amount
                );


            const finalAmount =
                duplicateAmount !== null
                    ? duplicateAmount
                    : (
                        receiptAmount !== null
                            ? receiptAmount
                            : settledAmount
                    );


            const amountText =
                finalAmount !== null
                    ? `${formatMoney(finalAmount)} ETB`
                    : "—";


            duplicateBox.innerHTML = `

                <div style="
                    display:flex;
                    align-items:center;
                    gap:12px;
                    margin-bottom:18px;
                ">

                    <div style="
                        width:42px;
                        height:42px;
                        min-width:42px;
                        border-radius:50%;
                        display:flex;
                        align-items:center;
                        justify-content:center;
                        background:#fef3c7;
                        color:#d97706;
                        font-size:24px;
                        font-weight:900;
                        border:1px solid #fcd34d;
                    ">
                        !
                    </div>

                    <div>

                        <div style="
                            font-size:15px;
                            font-weight:900;
                            color:#92400e;
                            letter-spacing:.04em;
                        ">
                            DUPLICATE TRANSACTION
                        </div>

                        <div style="
                            margin-top:3px;
                            font-size:12px;
                            color:#a16207;
                        ">
                            This receipt was already verified.
                        </div>

                    </div>

                </div>


                <div style="
                    display:flex;
                    justify-content:space-between;
                    align-items:flex-start;
                    gap:15px;
                    padding:11px 0;
                    border-bottom:1px solid #fde68a;
                ">

                    <span style="
                        color:#92400e;
                        font-size:13px;
                        font-weight:700;
                    ">
                        Receipt Number
                    </span>

                    <strong style="
                        color:#451a03;
                        font-size:13px;
                        text-align:right;
                        word-break:break-word;
                        max-width:65%;
                    ">
                        ${escapeHTML(receiptNumber)}
                    </strong>

                </div>


                <div style="
                    display:flex;
                    justify-content:space-between;
                    align-items:flex-start;
                    gap:15px;
                    padding:11px 0;
                    border-bottom:1px solid #fde68a;
                ">

                    <span style="
                        color:#92400e;
                        font-size:13px;
                        font-weight:700;
                    ">
                        Previously Verified
                    </span>

                    <strong style="
                        color:#451a03;
                        font-size:13px;
                        text-align:right;
                        max-width:65%;
                    ">
                        ${escapeHTML(verifiedAt)}
                    </strong>

                </div>


                <div style="
                    display:flex;
                    justify-content:space-between;
                    align-items:flex-start;
                    gap:15px;
                    padding:11px 0;
                    border-bottom:1px solid #fde68a;
                ">

                    <span style="
                        color:#92400e;
                        font-size:13px;
                        font-weight:700;
                    ">
                        Verified By
                    </span>

                    <strong style="
                        color:#451a03;
                        font-size:13px;
                        text-align:right;
                    ">
                        ${escapeHTML(verifiedBy)}
                    </strong>

                </div>


                <div style="
                    display:flex;
                    justify-content:space-between;
                    align-items:flex-start;
                    gap:15px;
                    padding:11px 0 0;
                ">

                    <span style="
                        color:#92400e;
                        font-size:13px;
                        font-weight:700;
                    ">
                        Amount
                    </span>

                    <strong style="
                        color:#b45309;
                        font-size:15px;
                        text-align:right;
                    ">
                        ${escapeHTML(amountText)}
                    </strong>

                </div>

            `;


            if (resultCard) {

                const checksGrid =
                    resultCard.querySelector(
                        ".checks-grid"
                    );


                if (checksGrid) {

                    checksGrid.before(
                        duplicateBox
                    );

                } else {

                    resultCard.appendChild(
                        duplicateBox
                    );

                }

            }


            // ---------------------------------------------
            // DUPLICATE CHECKS
            // ---------------------------------------------

            const checks =
                data &&
                data.checks
                    ? data.checks
                    : {};


            updateCheck(
                checkTransaction,
                checks.transactionFound,
                "Found",
                "Not Found"
            );


            updateCheck(
                checkStatus,
                checks.transactionCompleted,
                "Completed",
                "Not Completed"
            );


            updateCheck(
                checkSettlement,
                checks.settlementMatched,
                "Matched",
                "Not Matched"
            );


            updateCheck(
                checkApprovedWallet,
                checks.settlementMatched,
                "Matched",
                "Not Matched"
            );


            displayPaidAmount(
                receipt,
                false
            );


            displayReceipt(
                receipt
            );


            return;

        }


        // =================================================
        // NORMAL VERIFIED TRANSACTION
        // =================================================

        if (verified) {

            if (resultIcon) {

                resultIcon.textContent =
                    "✓";

                resultIcon.style.color =
                    "";

                resultIcon.style.background =
                    "";

            }


            if (resultLabel) {

                resultLabel.textContent =
                    "PAYMENT VERIFIED";

                resultLabel.style.color =
                    "";

            }


            if (resultTitle) {

                resultTitle.textContent =
                    "Transaction successfully verified";

            }


            if (resultDescription) {

                resultDescription.textContent =
                    data.message ||
                    "The transaction passed all verification checks.";

            }


            if (resultBadge) {

                resultBadge.textContent =
                    "VERIFIED";

                resultBadge.style.color =
                    "";

                resultBadge.style.background =
                    "";

                resultBadge.style.borderColor =
                    "";

            }

        }


        // =================================================
        // NORMAL REJECTED TRANSACTION
        // =================================================

        else {

            if (resultIcon) {

                resultIcon.textContent =
                    "!";

                resultIcon.style.color =
                    "";

                resultIcon.style.background =
                    "";

            }


            if (resultLabel) {

                resultLabel.textContent =
                    "PAYMENT NOT VERIFIED";

                resultLabel.style.color =
                    "";

            }


            if (resultTitle) {

                resultTitle.textContent =
                    "Transaction could not be verified";

            }


            if (resultDescription) {

                resultDescription.textContent =
                    data.message ||
                    "The transaction did not pass all verification checks.";

            }


            if (resultBadge) {

                resultBadge.textContent =
                    "NOT VERIFIED";

                resultBadge.style.color =
                    "";

                resultBadge.style.background =
                    "";

                resultBadge.style.borderColor =
                    "";

            }

        }


        // =================================================
        // VERIFICATION CHECKS
        // =================================================

        const checks =
            data &&
            data.checks
                ? data.checks
                : {};


        updateCheck(
            checkTransaction,
            checks.transactionFound,
            "Passed",
            "Not Found"
        );


        updateCheck(
            checkStatus,
            checks.transactionCompleted,
            "Passed",
            "Not Completed"
        );


        updateCheck(
            checkSettlement,
            checks.settlementMatched,
            "Matched",
            "Not Matched"
        );


        updateCheck(
            checkApprovedWallet,
            checks.settlementMatched,
            "Matched",
            "Not Matched"
        );


        // =================================================
        // AMOUNT
        // =================================================

        displayPaidAmount(
            receipt,
            verified
        );


        // =================================================
        // RECEIPT DETAILS
        // =================================================

        displayReceipt(
            receipt
        );

    }


    // =====================================================
    // DUPLICATE BOX CLEANUP
    // =====================================================

    function clearDuplicateBox() {

        const duplicateBox =
            document.getElementById(
                "nexelDuplicateInfo"
            );


        if (duplicateBox) {
            duplicateBox.remove();
        }

    }


    // =====================================================
    // PAID AMOUNT + FEE BREAKDOWN
    // =====================================================

    function displayPaidAmount(
        receipt,
        verified
    ) {

        if (!resultCard) {
            return;
        }


        const oldAmount =
            document.getElementById(
                "nexelPaidAmountBox"
            );


        if (oldAmount) {
            oldAmount.remove();
        }


        const oldFee =
            document.getElementById(
                "nexelFeeBreakdown"
            );


        if (oldFee) {
            oldFee.remove();
        }


        const totalPaid =
            parseNumber(
                receipt.total_paid_amount
            );


        const serviceFee =
            parseNumber(
                receipt.service_fee
            );


        const serviceFeeVat =
            parseNumber(
                receipt.service_fee_vat
            );


        let totalFee =
            parseNumber(
                receipt.total_fee
            );


        if (
            totalFee === null &&
            serviceFee !== null
        ) {

            totalFee =
                serviceFee +
                (
                    serviceFeeVat !== null
                        ? serviceFeeVat
                        : 0
                );

        }


        const paidAmount =
            totalPaid !== null
                ? totalPaid
                : parseNumber(
                    receipt.settled_amount
                );


        if (paidAmount !== null) {

            const amountBox =
                document.createElement(
                    "div"
                );


            amountBox.id =
                "nexelPaidAmountBox";


            amountBox.style.cssText = `
                margin-top:20px;
                padding:24px 20px;
                border-radius:16px;
                text-align:center;
                background:${verified ? "#f0fdf4" : "#f8fafc"};
                border:1px solid ${verified ? "#bbf7d0" : "#e2e8f0"};
            `;


            amountBox.innerHTML = `

                <div style="
                    font-size:12px;
                    font-weight:800;
                    letter-spacing:.12em;
                    color:${verified ? "#15803d" : "#64748b"};
                    margin-bottom:8px;
                ">
                    PAID AMOUNT
                </div>

                <div style="
                    font-size:36px;
                    line-height:1.1;
                    font-weight:900;
                    color:${verified ? "#16a34a" : "#334155"};
                ">
                    ${formatMoney(paidAmount)} ETB
                </div>

            `;


            const checksGrid =
                resultCard.querySelector(
                    ".checks-grid"
                );


            const duplicateBox =
                document.getElementById(
                    "nexelDuplicateInfo"
                );


            if (duplicateBox) {

                duplicateBox.after(
                    amountBox
                );

            } else if (checksGrid) {

                checksGrid.before(
                    amountBox
                );

            } else {

                resultCard.appendChild(
                    amountBox
                );

            }

        }


        if (
            serviceFee === null &&
            serviceFeeVat === null &&
            totalFee === null
        ) {
            return;
        }


        const feeBox =
            document.createElement(
                "div"
            );


        feeBox.id =
            "nexelFeeBreakdown";


        feeBox.style.cssText = `
            margin-top:12px;
            padding:16px 18px;
            border-radius:14px;
            background:#ffffff;
            border:1px solid #e2e8f0;
            box-shadow:0 4px 14px rgba(15,23,42,.06);
        `;


        const serviceFeeText =
            serviceFee !== null
                ? formatMoney(serviceFee)
                : "—";


        const vatText =
            serviceFeeVat !== null
                ? formatMoney(serviceFeeVat)
                : "—";


        const totalFeeText =
            totalFee !== null
                ? formatMoney(totalFee)
                : "—";


        feeBox.innerHTML = `

            <div style="
                display:flex;
                align-items:center;
                justify-content:space-between;
                gap:10px;
                padding-bottom:10px;
                margin-bottom:8px;
                border-bottom:1px solid #e5e7eb;
            ">

                <span style="
                    font-size:12px;
                    font-weight:900;
                    letter-spacing:.08em;
                    color:#334155;
                ">
                    RECEIPT FEE BREAKDOWN
                </span>

                <span style="
                    font-size:10px;
                    font-weight:800;
                    color:#94a3b8;
                ">
                    TELEBIRR
                </span>

            </div>


            <div style="
                display:flex;
                justify-content:space-between;
                gap:15px;
                padding:7px 0;
                font-size:14px;
            ">

                <span style="color:#64748b;">
                    Transfer Fee
                </span>

                <strong style="color:#334155;">
                    ${serviceFeeText} ETB
                </strong>

            </div>


            <div style="
                display:flex;
                justify-content:space-between;
                gap:15px;
                padding:7px 0;
                font-size:14px;
            ">

                <span style="color:#64748b;">
                    Fee VAT
                </span>

                <strong style="color:#334155;">
                    ${vatText} ETB
                </strong>

            </div>


            <div style="
                display:flex;
                justify-content:space-between;
                gap:15px;
                padding-top:10px;
                margin-top:5px;
                border-top:1px solid #e5e7eb;
                font-size:15px;
            ">

                <span style="
                    font-weight:800;
                    color:#334155;
                ">
                    Total Fee
                </span>

                <strong style="
                    font-size:16px;
                    color:#dc2626;
                ">
                    ${totalFeeText} ETB
                </strong>

            </div>

        `;


        const amountBox =
            document.getElementById(
                "nexelPaidAmountBox"
            );


        if (amountBox) {

            amountBox.after(
                feeBox
            );

        } else {

            const duplicateBox =
                document.getElementById(
                    "nexelDuplicateInfo"
                );


            if (duplicateBox) {

                duplicateBox.after(
                    feeBox
                );

            } else {

                const checksGrid =
                    resultCard.querySelector(
                        ".checks-grid"
                    );


                if (checksGrid) {

                    checksGrid.before(
                        feeBox
                    );

                } else {

                    resultCard.appendChild(
                        feeBox
                    );

                }

            }

        }

    }


    // =====================================================
    // CHECK ITEMS
    // =====================================================

    function updateCheck(
        element,
        passed,
        successText,
        failureText
    ) {

        if (!element) {
            return;
        }


        const strong =
            element.querySelector(
                ".check-content strong"
            );


        if (strong) {

            strong.textContent =
                passed
                    ? successText
                    : failureText;

        }


        if (passed) {

            element.classList.remove(
                "failed"
            );


            element.classList.add(
                "passed"
            );

        } else {

            element.classList.remove(
                "passed"
            );


            element.classList.add(
                "failed"
            );

        }

    }


    // =====================================================
    // RECEIPT DETAILS
    // =====================================================

    function displayReceipt(
        receipt
    ) {

        if (!receiptDetails) {
            return;
        }


        receiptDetails.innerHTML = "";


        const rows = [

            [
                "Transaction ID",
                receipt.transaction_id ||
                receipt.receiptNo
            ],

            [
                "Payer Name",
                receipt.payer_name
            ],

            [
                "Payer Telebirr No.",
                receipt.payer_account ||
                receipt.payer_telebirr_no
            ],

            [
                "Credited Party",
                receipt.credited_party_name
            ],

            [
                "Credited Account",
                receipt.credited_party_account ||
                receipt.credited_party_acc_no
            ],

            [
                "Transaction Status",
                receipt.transaction_status
            ],

            [
                "Invoice No.",
                receipt.invoice_no
            ],

            [
                "Payment Date",
                receipt.payment_date ||
                receipt.date
            ],

            [
                "Settled Amount",
                receipt.settled_amount
            ],

            [
                "Total Paid Amount",
                receipt.total_paid_amount
            ],

            [
                "Transfer Fee",
                receipt.service_fee
            ],

            [
                "Fee VAT",
                receipt.service_fee_vat
            ],

            [
                "Total Fee",
                receipt.total_fee
            ],

            [
                "Payment Mode",
                receipt.payment_mode
            ],

            [
                "Payment Channel",
                receipt.payment_channel
            ],

            [
                "Payment Reason",
                receipt.payment_reason
            ]

        ];


        rows.forEach(function (row) {

            const label =
                row[0];


            const value =
                row[1];


            if (
                value === undefined ||
                value === null ||
                value === ""
            ) {
                return;
            }


            const item =
                document.createElement(
                    "div"
                );


            item.style.cssText = `
                display:flex;
                justify-content:space-between;
                align-items:flex-start;
                gap:20px;
                padding:12px 0;
                border-bottom:1px solid #f1f5f9;
            `;


            let displayValue =
                String(value);


            if (
                label === "Settled Amount" ||
                label === "Total Paid Amount" ||
                label === "Transfer Fee" ||
                label === "Fee VAT" ||
                label === "Total Fee"
            ) {

                const number =
                    parseNumber(value);


                if (number !== null) {

                    displayValue =
                        `${formatMoney(number)} ETB`;

                }

            }


            item.innerHTML = `

                <span style="
                    color:#64748b;
                    font-size:13px;
                    font-weight:600;
                ">
                    ${escapeHTML(label)}
                </span>


                <span style="
                    color:#1e293b;
                    font-size:13px;
                    font-weight:700;
                    text-align:right;
                    word-break:break-word;
                    max-width:65%;
                ">
                    ${escapeHTML(displayValue)}
                </span>

            `;


            receiptDetails.appendChild(
                item
            );

        });

    }


    // =====================================================
    // ERROR
    // =====================================================

    function displayError(
        message
    ) {

        if (resultSection) {

            resultSection.classList.remove(
                "hidden"
            );

        }


        clearDuplicateBox();


        if (resultIcon) {

            resultIcon.textContent =
                "!";

            resultIcon.style.color =
                "";

            resultIcon.style.background =
                "";

        }


        if (resultLabel) {

            resultLabel.textContent =
                "VERIFICATION ERROR";

            resultLabel.style.color =
                "";

        }


        if (resultTitle) {

            resultTitle.textContent =
                "Unable to verify transaction";

        }


        if (resultDescription) {

            resultDescription.textContent =
                message;

        }


        if (resultBadge) {

            resultBadge.textContent =
                "ERROR";

            resultBadge.style.color =
                "";

            resultBadge.style.background =
                "";

            resultBadge.style.borderColor =
                "";

        }


        clearAmountBoxes();


        if (receiptDetails) {

            receiptDetails.innerHTML =
                "";

        }

    }


    // =====================================================
    // CLEAR RESULTS
    // =====================================================

    function clearResults() {

        if (resultSection) {

            resultSection.classList.add(
                "hidden"
            );

        }


        clearDuplicateBox();

        clearAmountBoxes();


        if (receiptDetails) {

            receiptDetails.innerHTML =
                "";

        }

    }


    function clearAmountBoxes() {

        const amountBox =
            document.getElementById(
                "nexelPaidAmountBox"
            );


        if (amountBox) {
            amountBox.remove();
        }


        const feeBox =
            document.getElementById(
                "nexelFeeBreakdown"
            );


        if (feeBox) {
            feeBox.remove();
        }

    }


    // =====================================================
    // HELPERS
    // =====================================================

    function parseNumber(
        value
    ) {

        if (
            value === undefined ||
            value === null ||
            value === ""
        ) {

            return null;

        }


        const number =
            Number(
                String(value)
                    .replace(
                        /,/g,
                        ""
                    )
                    .replace(
                        /[^0-9.-]/g,
                        ""
                    )
            );


        return Number.isFinite(number)
            ? number
            : null;

    }


    function formatMoney(
        value
    ) {

        const number =
            parseNumber(value);


        if (number === null) {
            return "—";
        }


        return number.toFixed(2);

    }


    function escapeHTML(
        value
    ) {

        return String(value)

            .replace(
                /&/g,
                "&amp;"
            )

            .replace(
                /</g,
                "&lt;"
            )

            .replace(
                />/g,
                "&gt;"
            )

            .replace(
                /"/g,
                "&quot;"
            )

            .replace(
                /'/g,
                "&#039;"
            );

    }


    // =====================================================
    // START
    // =====================================================

    checkSession();

});