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
        const existingBook = await db.query("SELECT * FROM books WHERE title = $1 AND author = $2", [title, author]);

        console.log(`Retrieved from DB:`, existingBook.rows[0]); 

        if (existingBook.rows.length > 0) {
            console.log(`Book found in database: ${title}`);
            return existingBook.rows[0]; 
        }

        const searchResponse = await axios.get(`https://openlibrary.org/search.json?title=${encodeURIComponent(title)}&author=${encodeURIComponent(author)}`);
        console.log(searchResponse.data.docs);

        if (!searchResponse.data.docs || searchResponse.data.docs.length === 0) {
            return { title, author, error: "Not found" };
       };
        
        const bookData = searchResponse.data.docs.find(book => book.author_name && book.author_name.includes(author));

        if (!bookData) return { title, author, error: "Not found" };
       
        const bookInfo = {
            title: bookData.title,
            author: Array.isArray(bookData.author_name) ? bookData.author_name[0] : 'Unknown Author',
            publicationYear: bookData.first_publish_year || null,
            description: 'Description not available',
            coverImage: bookData.cover_i 
                ? `https://covers.openlibrary.org/b/id/${bookData.cover_i}-L.jpg` 
                : "Cover image not available",
            encodedTitle: encodeURIComponent(bookData.title)
        };

        if (bookData.key) {
            const workResponse = await axios.get(`https://openlibrary.org${bookData.key}.json`);
            //console.log(workResponse);
            
            if (workResponse.data.description) {
                bookInfo.description = typeof workResponse.data.description === 'string' 
                    ? workResponse.data.description 
                    : workResponse.data.description.value;
            }
        }

        try {
            await db.query(
                `INSERT INTO books (title, author, publication_year, description, cover_image) 
                 VALUES ($1, $2, $3, $4, $5) 
                 ON CONFLICT (title, author) DO UPDATE 
                 SET cover_image = COALESCE(books.cover_image, EXCLUDED.cover_image)`,
                [bookInfo.title, bookInfo.author, bookInfo.publicationYear, bookInfo.description, bookInfo.coverImage]
            );
            console.log(`Book saved to database: ${title}`);
        } catch (dbError) {
            console.error(`Error inserting book into database: ${title}`, dbError.message);
        }

        console.log(`Book saved to database: ${title}`);

        return bookInfo;
    } catch (error) {
        console.error(`Error fetching data for "${title}":`, error.message);
        return { title, author, error: "API request failed" };
    }
};


app.get("/", async (req, res) => {
    try {
        const bookResults = await Promise.all(books.map(book => fetchBookData(book)));
        res.render("index.ejs", { books: bookResults});
        console.log(bookResults);
        //res.json(bookResults);
    } catch (error) {
        console.error("Error fetching books:", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
})






app.listen(PORT, () => {
    console.log(`Server listening on port http://localhost:${PORT}`);
})