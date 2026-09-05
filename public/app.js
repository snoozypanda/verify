document.addEventListener("DOMContentLoaded", () => {

    /* =========================================================
       ELEMENTS
    ========================================================= */

    const loginPage = document.getElementById("loginPage");
    const dashboardPage = document.getElementById("dashboardPage");

    const loginForm = document.getElementById("loginForm");
    const loginError = document.getElementById("loginError");

    const verifyForm = document.getElementById("verifyForm");
    const transactionIdInput =
        document.getElementById("transactionId");

    const verifyButton =
        document.getElementById("verifyButton");

    const verifyButtonText =
        document.getElementById("verifyButtonText");

    const logoutButton =
        document.getElementById("logoutButton");

    const resultSection =
        document.getElementById("resultSection");

    const resultCard =
        document.getElementById("resultCard");

    const resultIcon =
        document.getElementById("resultIcon");

    const resultLabel =
        document.getElementById("resultLabel");

    const resultTitle =
        document.getElementById("resultTitle");

    const resultDescription =
        document.getElementById("resultDescription");

    const resultBadge =
        document.getElementById("resultBadge");

    const receiptDetails =
        document.getElementById("receiptDetails");

    const checkTransaction =
        document.getElementById("checkTransaction");

    const checkStatus =
        document.getElementById("checkStatus");

    const checkSettlement =
        document.getElementById("checkSettlement");


    /* =========================================================
       PAGE CONTROL
    ========================================================= */

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


    /* =========================================================
       CHECK SESSION
    ========================================================= */

    async function checkSession() {

        try {

            const response = await fetch(
                "/api/session",
                {
                    method: "GET",
                    credentials: "same-origin",
                    cache: "no-store"
                }
            );

            const data =
                await response.json();

            if (data.loggedIn === true) {

                showDashboard();

            } else {

                showLogin();
            }

        } catch (error) {

            console.error(
                "Session error:",
                error
            );

            showLogin();
        }
    }


    /* =========================================================
       LOGIN
    ========================================================= */

    if (!loginForm) {

        console.error(
            "ERROR: loginForm was not found in index.html"
        );

        return;
    }


    loginForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();

            console.log(
                "Login button clicked."
            );


            if (loginError) {
                loginError.textContent = "";
            }


            const usernameInput =
                document.getElementById("username");

            const passwordInput =
                document.getElementById("password");


            if (!usernameInput || !passwordInput) {

                if (loginError) {

                    loginError.textContent =
                        "Login fields could not be found.";
                }

                console.error(
                    "Username or password field missing."
                );

                return;
            }


            const username =
                usernameInput.value.trim();

            const password =
                passwordInput.value;


            if (!username || !password) {

                if (loginError) {

                    loginError.textContent =
                        "Please enter your username and password.";
                }

                return;
            }


            const loginButton =
                loginForm.querySelector(
                    "button[type='submit']"
                );


            if (loginButton) {

                loginButton.disabled = true;

                loginButton.innerHTML = `
                    <span>Signing in...</span>
                `;
            }


            try {

                console.log(
                    "Sending login request..."
                );


                const response =
                    await fetch(
                        "/api/login",
                        {
                            method: "POST",

                            credentials: "same-origin",

                            cache: "no-store",

                            headers: {
                                "Content-Type":
                                    "application/json",

                                "Accept":
                                    "application/json"
                            },

                            body: JSON.stringify({
                                username: username,
                                password: password
                            })
                        }
                    );


                console.log(
                    "Login response:",
                    response.status
                );


                const data =
                    await response.json();


                console.log(
                    "Login data:",
                    data
                );


                if (
                    response.ok &&
                    data.success === true
                ) {

                    console.log(
                        "LOGIN SUCCESSFUL"
                    );


                    loginForm.reset();

                    showDashboard();


                } else {

                    if (loginError) {

                        loginError.textContent =
                            data.message ||
                            "Invalid login credentials.";
                    }
                }


            } catch (error) {

                console.error(
                    "LOGIN ERROR:",
                    error
                );


                if (loginError) {

                    loginError.textContent =
                        "Unable to connect to the server.";
                }


            } finally {

                if (loginButton) {

                    loginButton.disabled = false;

                    loginButton.innerHTML = `
                        <span>Access Dashboard</span>
                        <span class="button-arrow">→</span>
                    `;
                }
            }
        }
    );


    /* =========================================================
       LOGOUT
    ========================================================= */

    if (logoutButton) {

        logoutButton.addEventListener(
            "click",
            async function () {

                try {

                    await fetch(
                        "/api/logout",
                        {
                            method: "POST",
                            credentials: "same-origin",
                            cache: "no-store"
                        }
                    );

                } catch (error) {

                    console.error(
                        "Logout error:",
                        error
                    );
                }


                if (verifyForm) {
                    verifyForm.reset();
                }

                if (resultSection) {
                    resultSection.classList.add("hidden");
                }

                if (receiptDetails) {
                    receiptDetails.innerHTML = "";
                }

                showLogin();
            }
        );
    }


    /* =========================================================
       VERIFY PAYMENT
    ========================================================= */

    if (verifyForm) {

        verifyForm.addEventListener(
            "submit",
            async function (event) {

                event.preventDefault();


                const transactionId =
                    transactionIdInput
                        ? transactionIdInput.value.trim()
                        : "";


                if (!transactionId) {

                    displayError(
                        "Please enter a Telebirr Transaction ID."
                    );

                    return;
                }


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

                                credentials:
                                    "same-origin",

                                cache: "no-store",

                                headers: {
                                    "Content-Type":
                                        "application/json",

                                    "Accept":
                                        "application/json"
                                },

                                body: JSON.stringify({
                                    transactionId:
                                        transactionId
                                })
                            }
                        );


                    const data =
                        await response.json();


                    if (response.status === 401) {

                        showLogin();

                        if (loginError) {

                            loginError.textContent =
                                "Your session has expired. Please log in again.";
                        }

                        return;
                    }


                    if (!response.ok) {

                        displayError(
                            data.message ||
                            "Unable to verify the transaction."
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


    /* =========================================================
       DISPLAY RESULT
    ========================================================= */

    function displayResult(data) {

        if (!resultSection || !resultCard) {
            return;
        }


        resultSection.classList.remove(
            "hidden"
        );


        const verified =
            data.verified === true;


        resultCard.classList.remove(
            "verified",
            "failed"
        );


        resultCard.classList.add(
            verified
                ? "verified"
                : "failed"
        );


        if (resultIcon) {

            resultIcon.textContent =
                verified
                    ? "✓"
                    : "×";
        }


        if (resultLabel) {

            resultLabel.textContent =
                verified
                    ? "PAYMENT VERIFIED"
                    : "PAYMENT NOT VERIFIED";
        }


        if (resultTitle) {

            resultTitle.textContent =
                verified
                    ? "Transaction successfully verified"
                    : "Transaction could not be verified";
        }


        if (resultDescription) {

            resultDescription.textContent =
                verified
                    ? "The transaction passed all verification checks."
                    : (
                        data.message ||
                        "Unable to retrieve or verify the Telebirr receipt."
                    );
        }


        if (resultBadge) {

            resultBadge.textContent =
                verified
                    ? "VERIFIED"
                    : "NOT VERIFIED";
        }


        let amount = "";


        if (
            data.receipt &&
            data.receipt.settled_amount !== null &&
            data.receipt.settled_amount !== undefined
        ) {

            amount =
                String(
                    data.receipt.settled_amount
                );
        }


        updateCheck(
            checkTransaction,
            data.checks &&
            data.checks.transactionFound === true,
            "Transaction Found",
            amount
        );


        updateCheck(
            checkStatus,
            data.checks &&
            data.checks.transactionCompleted === true,
            "Transaction Completed"
        );


        updateCheck(
            checkSettlement,
            data.checks &&
            data.checks.settlementMatched === true,
            "Settlement Account"
        );


        if (data.receipt) {

            displayReceipt(
                data.receipt
            );

        } else if (receiptDetails) {

            receiptDetails.innerHTML = `
                <div class="empty-receipt">
                    <span>Information</span>
                    <strong>No receipt details available.</strong>
                </div>
            `;
        }


        resultSection.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }


    /* =========================================================
       UPDATE CHECK
    ========================================================= */

    function updateCheck(
        element,
        passed,
        label,
        amount = ""
    ) {

        if (!element) {
            return;
        }


        element.classList.toggle(
            "failed",
            !passed
        );


        const icon =
            passed
                ? "✓"
                : "×";


        let statusText;


        if (label === "Settlement Account") {

            statusText =
                passed
                    ? "Matched"
                    : "Failed";

        } else {

            statusText =
                passed
                    ? "Passed"
                    : "Failed";
        }


        let amountHTML = "";


        if (
            label === "Transaction Found" &&
            amount
        ) {

            amountHTML = `
                <span class="check-amount">
                    ${escapeHTML(amount)}
                </span>
            `;
        }


        element.innerHTML = `
            <div class="check-icon">
                ${icon}
            </div>

            <div class="check-content">

                <span>
                    ${escapeHTML(label)}
                </span>

                <strong>
                    ${statusText}
                    ${amountHTML}
                </strong>

            </div>
        `;
    }


    /* =========================================================
       RECEIPT
    ========================================================= */

    function displayReceipt(receipt) {

        if (!receiptDetails) {
            return;
        }


        const fields = [

            [
                "Transaction ID",
                receipt.transaction_id
            ],

            [
                "Payer Name",
                receipt.payer_name
            ],

            [
                "Payer Telebirr No.",
                receipt.payer_account
            ],

            [
                "Credited Party",
                receipt.credited_party_name
            ],

            [
                "Credited Account",
                receipt.credited_party_account
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
                receipt.payment_date
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


        const availableFields =
            fields.filter(
                ([, value]) =>
                    value !== undefined &&
                    value !== null &&
                    String(value).trim() !== ""
            );


        if (!availableFields.length) {

            receiptDetails.innerHTML = `
                <div class="empty-receipt">
                    <span>Information</span>
                    <strong>No receipt details available.</strong>
                </div>
            `;

            return;
        }


        receiptDetails.innerHTML =
            availableFields
                .map(
                    ([label, value]) => `
                        <div class="receipt-row">

                            <span class="receipt-label">
                                ${escapeHTML(label)}
                            </span>

                            <strong class="receipt-value">
                                ${escapeHTML(String(value))}
                            </strong>

                        </div>
                    `
                )
                .join("");
    }


    /* =========================================================
       ERROR
    ========================================================= */

    function displayError(message) {

        if (!resultSection || !resultCard) {
            return;
        }


        resultSection.classList.remove(
            "hidden"
        );


        resultCard.classList.remove(
            "verified"
        );


        resultCard.classList.add(
            "failed"
        );


        if (resultIcon) {
            resultIcon.textContent = "×";
        }


        if (resultLabel) {
            resultLabel.textContent =
                "PAYMENT NOT VERIFIED";
        }


        if (resultTitle) {
            resultTitle.textContent =
                "Transaction could not be verified";
        }


        if (resultDescription) {
            resultDescription.textContent =
                message;
        }


        if (resultBadge) {
            resultBadge.textContent =
                "NOT VERIFIED";
        }


        updateCheck(
            checkTransaction,
            false,
            "Transaction Found"
        );


        updateCheck(
            checkStatus,
            false,
            "Transaction Completed"
        );


        updateCheck(
            checkSettlement,
            false,
            "Settlement Account"
        );


        if (receiptDetails) {

            receiptDetails.innerHTML = `
                <div class="empty-receipt">
                    <span>Information</span>
                    <strong>No receipt details available.</strong>
                </div>
            `;
        }


        resultSection.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }


    /* =========================================================
       HTML ESCAPE
    ========================================================= */

    function escapeHTML(value) {

        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }


    /* =========================================================
       START
    ========================================================= */

    checkSession();

});
