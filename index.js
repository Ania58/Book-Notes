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
    "user": process.env.USER,
    "host": process.env.HOST,
    "database": process.env.DATABASE,
    "password": process.env.PASSWORD,
    "port": process.env.PORT
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
        const searchResponse = await axios.get(`https://openlibrary.org/search.json?title=${encodeURIComponent(title)}&author=${encodeURIComponent(author)}`);
        console.log(searchResponse.data.docs);
        
        const bookData = searchResponse.data.docs.find(book => book.author_name && book.author_name.includes(author));

        if (!bookData) return { title, author, error: "Not found" };

        const bookInfo = {
            title: bookData.title,
            author: Array.isArray(bookData.author_name) ? bookData.author_name[0] : 'Unknown Author',
            publicationYear: bookData.first_publish_year || 'Unknown Year',
            description: 'Description not available',
            coverImage: bookData.cover_i 
                ? `https://covers.openlibrary.org/b/id/${bookData.cover_i}-L.jpg` 
                : 'Cover image not available'
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
        //res.json(bookResults);
    } catch (error) {
        console.error("Error fetching books:", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
})






app.listen(PORT, () => {
    console.log(`Server listening on port http://localhost:${PORT}`);
})