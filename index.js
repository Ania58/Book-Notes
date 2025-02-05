const express = require("express");
const app = express();
const PORT = 3000;
const axios = require("axios");
const pg = require("pg");
const dotenv = require("dotenv");
const bodyParser = require("body-parser");

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
dotenv.config();

const db = new pg.Client({
    user: process.env.USER,
    host: process.env.HOST,
    database: process.env.DATABASE,
    password: process.env.PASSWORD,
    port: process.env.PORT
});

db.connect();

const books = [
    { title: "The Great Gatsby", author: "F. Scott Fitzgerald" },
    { title: "The Little Prince", author: "Antoine de Saint-Exupéry" },
    { title: "The Truth About the Harry Quebert Affair", author: "Joël Dicker" },
    { title: "The Baltimore Boys", author: "Joël Dicker" },
    { title: "The Hobbit", author: "J.R.R. Tolkien" },
    { title: "A Streetcar Named Desire", author: "Tennessee Williams" },
    { title: "Pride and Prejudice", author: "Jane Austen" },
    { title: "The Witcher", author: "Andrzej Sapkowski" }, 
    { title: "The Alchemist", author: "Paulo Coelho" },
    { title: "Lord of the Rings", author: "J.R.R. Tolkien" }
];

const fetchBookData = async ({ title, author }) => {
    try {
        const cleanTitle = title.trim().toLowerCase();
        const cleanAuthor = author.trim().toLowerCase();

        const existingBook = await db.query(
            "SELECT * FROM books WHERE LOWER(title) = $1 AND LOWER(author) = $2",
            [cleanTitle, cleanAuthor]
        );

        if (existingBook.rows.length > 0) {
            console.log(`✅ Book already exists in DB: ${title}`);
            return existingBook.rows[0];
        }

        const searchResponse = await axios.get(
            `https://openlibrary.org/search.json?title=${encodeURIComponent(title)}&author=${encodeURIComponent(author)}`
        );

        const books = searchResponse.data.docs;
        if (!books || books.length === 0) {
            return { title, author, error: "Not found" };
        }

        const bestBook = books.find(book =>
            book.title.toLowerCase() === cleanTitle &&
            book.author_name &&
            book.author_name.some(a => a.toLowerCase() === cleanAuthor) &&
            !book.title.toLowerCase().includes("annotated") &&
            !book.title.toLowerCase().includes("study guide") &&
            !book.title.toLowerCase().includes("sparknotes") &&
            !book.title.toLowerCase().includes("summary")
        );

        if (!bestBook) {
            return { title, author, error: "No suitable edition found" };
        }

        const bookInfo = {
            title: bestBook.title,
            author: Array.isArray(bestBook.author_name) ? bestBook.author_name[0] : "Unknown Author",
            publicationYear: bestBook.first_publish_year || null,
            description: "Description not available",
            coverImage: bestBook.cover_i
                ? `https://covers.openlibrary.org/b/id/${bestBook.cover_i}-L.jpg`
                : "Cover image not available"
        };

        if (bestBook.key) {
            try {
                const workResponse = await axios.get(`https://openlibrary.org${bestBook.key}.json`);
                if (workResponse.data.description) {
                    bookInfo.description = typeof workResponse.data.description === "string"
                        ? workResponse.data.description
                        : workResponse.data.description.value;
                }
            } catch (descError) {
                console.log("⚠️ Could not fetch description for:", title);
            }
        }
        try {
            await db.query(
                `INSERT INTO books (title, author, publication_year, description, cover_image) 
                 VALUES ($1, $2, $3, $4, $5) 
                 ON CONFLICT (title, author) DO NOTHING`,
                [bookInfo.title, bookInfo.author, bookInfo.publicationYear, bookInfo.description, bookInfo.coverImage]
            );
            console.log(`📚 Book saved to database: ${title}`);
        } catch (dbError) {
            console.error(`❌ Error inserting book into database: ${title}`, dbError.message);
        }

        return bookInfo;
    } catch (error) {
        console.error(`❌ Error fetching data for "${title}":`, error.message);
        return { title, author, error: "API request failed" };
    }
};



app.get("/", async (req, res) => {
    try {
        /*const bookResults = await Promise.all(books.map(book => fetchBookData(book)));
        res.render("index.ejs", { books: bookResults});
        console.log(bookResults);*/
        const dbBooks = await db.query("SELECT * FROM books ORDER BY id ASC");

        const existingTitles = dbBooks.rows.map(book => book.title);
        const missingBooks = books.filter(book => !existingTitles.includes(book.title));

        const newBooks = await Promise.all(missingBooks.map(fetchBookData));

        const updatedBooks = await db.query("SELECT * FROM books ORDER BY id ASC");

        res.render("index.ejs", { books: updatedBooks.rows });
        //res.json(bookResults);
    } catch (error) {
        console.error("Error fetching books:", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
})

app.get("/add", (req, res) => {
    res.render("addBook.ejs", { message: null }); 
});

app.post("/add", async (req, res) => {
    const { title, author, publication_year, description, cover_image } = req.body;
    if (!title || !author) {
        return res.status(400).json({ error: "Title and author are required" });
    }
    try {
        const result = await db.query(`INSERT INTO books 
            (title, author, publication_year, description, cover_image) 
            VALUES ($1, $2, $3, $4, $5) RETURNING*`, 
            [title, author, publication_year, description || "Description not available", cover_image || "Cover image not available"]); 
        res.render("addBook.ejs", { message: `✅ Book "${title}" added successfully!` });
    } catch (error) {
        console.error("Error adding book:", error);
        res.status(500).json({ error: "Database error" });
    }
})




app.listen(PORT, () => {
    console.log(`Server listening on port http://localhost:${PORT}`);
})