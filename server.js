const express = require("express");
const path = require("path");

const app = express();
const port = process.env.PORT || 3000;

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

app.use("/css", express.static(path.join(__dirname, "css")));
app.use("/js", express.static(path.join(__dirname, "js")));

app.listen(port, () => {
    console.log(`Dashboard available at http://localhost:${port}`);
});
