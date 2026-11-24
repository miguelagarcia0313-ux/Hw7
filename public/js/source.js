$(function () {
    const customerPageSize = 10;
    let customerOffset = 0;

    const formatCurrency = value => new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD"
    }).format(Number(value || 0));

    function formatDate(value) {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return String(value || "");
        }

        return new Intl.DateTimeFormat("en-US", { timeZone: "UTC" }).format(date);
    }

    function appendCells(selector, values) {
        const row = $("<tr>");
        values.forEach(value => row.append($("<td>").text(value == null ? "" : value)));
        $(selector).append(row);
    }

    function renderList(selector, alerts) {
        const list = $(selector).empty();
        alerts.forEach(alert => list.append($("<li>").text(alert.description)));
    }

    function renderDashboard(data) {
        const { summary, customers, sales, alerts } = data;

        $(".revenue-amt").text(formatCurrency(summary.revenue));
        $("#customer-num").text(summary.customers.toLocaleString());
        $("#orders-amt").text(summary.orders.toLocaleString());
        $("#issues-amt").text(summary.issues.toLocaleString());
        $("#notification-num").text(summary.notifications.toLocaleString());

        const customerTable = $("#customerTableBody").empty();
        customers.forEach(customer => {
            const active = customer.status.toLowerCase() === "active";
            const status = $("<span>")
                .addClass("status")
                .addClass(active ? "status-active" : "status-pending")
                .text(customer.status);
            const row = $("<tr>");

            row.append(
                $("<td>").text(customer.name),
                $("<td>").text(customer.email),
                $("<td>").append(status),
                $("<td>").text(formatDate(customer.datejoined))
            );
            customerTable.append(row);
        });

        const salesTable = $("#salesTableBody").empty();
        sales.forEach(sale => {
            appendCells("#salesTableBody", [
                sale.name,
                Number(sale.quantity).toLocaleString(),
                formatCurrency(sale.saleamount)
            ]);
        });

        renderList("#system-status-list", alerts.issues);
        renderList("#notifications-list", alerts.notifications);
        renderList("#tasks-list", alerts.tasks);

        const pageCount = Math.max(1, Math.ceil(data.customerCount / data.customerLimit));
        const currentPage = Math.floor(data.customerOffset / data.customerLimit) + 1;
        $("#customerPageInfo").text(`Page ${currentPage} of ${pageCount}`);
        $("#previousCustomers").prop("disabled", data.customerOffset === 0);
        $("#nextCustomers").prop(
            "disabled",
            data.customerOffset + data.customerLimit >= data.customerCount
        );
    }

    async function loadDashboard(offset) {
        const response = await fetch(
            `/api/dashboard?limit=${customerPageSize}&offset=${offset}`
        );
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Unable to load dashboard data.");
        }

        customerOffset = data.customerOffset;
        renderDashboard(data);
        $("#dashboardError").prop("hidden", true).text("");
    }

    $("button").button();
    $("#dashboardTabs").tabs();
    $("#customerDate").datepicker();
    $("#accordion").accordion({
        collapsible: true,
        heightStyle: "content"
    });

    $("#customerDialog").dialog({
        autoOpen: false,
        modal: true,
        width: 450,
        buttons: {
            "Create Customer": function () {
                const name = $("#customerName").val();
                const email = $("#customerEmail").val();
                if (!name || !email) {
                    alert("Please enter a name and email.");
                    return;
                }

                alert("Customer created: " + name);
                $(this).dialog("close");
            },
            "Cancel": function () {
                $(this).dialog("close");
            }
        }
    });

    $("#newCustomerButton").on("click", function () {
        $("#customerDialog").dialog("open");
    });

    $("#previousCustomers").on("click", function () {
        loadDashboard(Math.max(0, customerOffset - customerPageSize)).catch(showDashboardError);
    });

    $("#nextCustomers").on("click", function () {
        loadDashboard(customerOffset + customerPageSize).catch(showDashboardError);
    });

    function showDashboardError(error) {
        console.error("Failed to load dashboard:", error);
        $("#dashboardError").text(error.message).prop("hidden", false);
    }

    loadDashboard(0).catch(showDashboardError);
});
