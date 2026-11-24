require("dotenv").config();

const express = require("express");
const path = require("path");
const { Pool } = require("pg");

const app = express();
const port = process.env.PORT || 3000;
const pageSize = 10;
const maxPageSize = 100;
let pool;

app.use(express.json());

function getPool() {
    if (!process.env.DATABASE_URL) {
        return null;
    }

    if (!pool) {
        pool = new Pool({ connectionString: process.env.DATABASE_URL });
    }

    return pool;
}

app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
});

app.get("/api/dashboard", async (req, res) => {
    const database = getPool();
    if (!database) {
        return res.status(503).json({
            error: "DATABASE_URL is not configured. Add it to the project root .env file."
        });
    }

    const limit = req.query.limit === undefined ? pageSize : Number(req.query.limit);
    const offset = req.query.offset === undefined ? 0 : Number(req.query.offset);

    if (!Number.isInteger(limit) || limit < 1 || limit > maxPageSize ||
        !Number.isInteger(offset) || offset < 0) {
        return res.status(400).json({
            error: `Use a limit from 1 to ${maxPageSize} and a non-negative offset.`
        });
    }

    try {
        const [
            customerCount,
            customers,
            revenue,
            sales,
            orderCount,
            issueCount,
            issues,
            notificationCount,
            notifications,
            tasks
        ] = await Promise.all([
            database.query("SELECT count(*) FROM customers"),
            database.query("SELECT * FROM customers ORDER BY id LIMIT $1 OFFSET $2", [limit, offset]),
            database.query("SELECT sum(saleamount) FROM sales"),
            database.query(`
                SELECT products.name, sales.quantity, sales.saleamount
                FROM sales
                LEFT JOIN products ON sales.productid = products.id
                ORDER BY sales.id ASC
            `),
            database.query("SELECT count(quantity) FROM orders"),
            database.query("SELECT count(id) FROM alerts WHERE type = 'issues'"),
            database.query("SELECT * FROM alerts WHERE type = 'issues'"),
            database.query("SELECT count(id) FROM alerts WHERE type = 'notifications'"),
            database.query("SELECT * FROM alerts WHERE type = 'notifications'"),
            database.query("SELECT * FROM alerts WHERE type = 'tasks'")
        ]);

        res.json({
            summary: {
                customers: Number(customerCount.rows[0].count),
                revenue: revenue.rows[0].sum,
                orders: Number(orderCount.rows[0].count),
                issues: Number(issueCount.rows[0].count),
                notifications: Number(notificationCount.rows[0].count)
            },
            customers: customers.rows,
            customerCount: Number(customerCount.rows[0].count),
            customerLimit: limit,
            customerOffset: offset,
            sales: sales.rows,
            alerts: {
                issues: issues.rows,
                notifications: notifications.rows,
                tasks: tasks.rows
            }
        });
    } catch (error) {
        console.error("Failed to load dashboard data:", error);

        if (error.code === "42P01") {
            return res.status(500).json({
                error: "The dashboard tables are missing. Run the SQL setup scripts in database/scripts."
            });
        }

        return res.status(500).json({
            error: "Unable to load dashboard data. Check the database settings and server logs."
        });
    }
});

app.use(express.static(path.join(__dirname, "public")));

app.listen(port, () => {
    console.log(`Dashboard available at http://localhost:${port}`);
});
