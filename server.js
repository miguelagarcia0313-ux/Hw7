const express = require("express");
const path = require("path");
const apiRouter = require("./routes/api");

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use("/api", apiRouter);
app.use(express.static(path.join(__dirname, "public")));

app.listen(port, () => {
    console.log(`Dashboard available at http://localhost:${port}`);
});
