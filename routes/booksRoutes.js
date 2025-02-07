const express = require("express");
const router = express.Router();
const booksController = require("../controllers/booksController");

router.get("/", booksController.getAllBooks);
router.get("/add", booksController.getAddBookForm);
router.post("/add", booksController.addBook);
router.get("/edit/:id", booksController.getEditBookForm);
router.post("/edit/:id", booksController.editBook);
router.get("/delete/:id", booksController.getDeleteBookForm);
router.post("/delete/:id", booksController.deleteBook);

module.exports = router;