const express = require("express");
const app = express();
const dotenv = require("dotenv");
const bodyParser = require("body-parser");
const booksRoutes = require("./routes/booksRoutes");

dotenv.config();
app.use(express.static("public"));
app.use(express.json());  
app.use(bodyParser.urlencoded({ extended: true }));

app.use("/", booksRoutes);

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server listening on port http://localhost:${PORT}`);
});

module.exports = app;