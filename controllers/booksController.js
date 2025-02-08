const axios = require("axios");
const db = require("../config/db");

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

const customBookData = {
    "The Baltimore Boys": {
        description: "The Baltimore Boys. The Goldman Gang. That was what they called Marcus Goldman and his cousins Woody and Hillel—three brilliant young men with dazzling futures before their kingdom crumbled beneath the weight of lies, jealousy, and betrayal.",
        coverImage: "https://example.com/baltimore-boys-cover.jpg"
    },
    "Truth About the Harry Quebert Affair": {
        description: "August 30, 1975: the day fifteen-year-old Nola Kellergan was glimpsed fleeing through the woods, never to be heard from again. Thirty-three years later, Marcus Goldman, a successful young novelist, visits Somerset to see his mentor Quebert, one of the country's most respected writers.",
        coverImage: "https://m.media-amazon.com/images/I/71cjtDPGf6L._AC_UF1000,1000_QL80_.jpg"
    },
    "The Witcher": {
        description: "The Witcher is a series of fantasy novels by Andrzej Sapkowski, following Geralt of Rivia, a monster hunter with supernatural abilities. Witchers are trained to battle dangerous creatures across the world.",
        coverImage: "https://example.com/witcher-cover.jpg"
    },
    "A Day with The Little Prince": {
        description: "No story is more beloved by children and grown-ups alike than this wise, enchanting fable. This classic tale is beautifully reimagined with simple text, original illustrations, and a captivating design.",
        coverImage: "https://example.com/little-prince-day-cover.jpg"
    },
    "The Little Prince": {
        description: "The Little Prince is a novella written and illustrated by Antoine de Saint-Exupéry. The story follows a young prince who visits various planets, including Earth, and explores themes of loneliness, friendship, love, and loss.",
        coverImage: "https://upload.wikimedia.org/wikipedia/en/0/05/Littleprince.JPG"
    }
};

const fetchBookData = async ({ title, author }) => {
    console.log(`🚀 Processing book: ${title} by ${author}`);

    try {
        const cleanTitle = title.trim().toLowerCase();
        const cleanAuthor = author.trim().toLowerCase();

        const existingBook = await db.query(
            "SELECT * FROM books WHERE LOWER(title) = $1 AND LOWER(author) = $2",
            [cleanTitle, cleanAuthor]
        );
        
        let existingBookData = null;

        if (existingBook.rows.length > 0) {
            console.log(`✅ Book already exists in DB: ${title}`);
            //return existingBook.rows[0];
            existingBookData = existingBook.rows[0];
            
        }

        const searchResponse = await axios.get(
            `https://openlibrary.org/search.json?title=${encodeURIComponent(title)}&author=${encodeURIComponent(author)}`
        );

        console.log(`🔍 API Search Response for "${title}":`, searchResponse.data.docs);
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
        console.log(`✅ Checking bestBook for ${title}:`, bestBook ? "FOUND" : "NOT FOUND");


        const bookInfo = {
            title: bestBook.title,
            author: Array.isArray(bestBook.author_name) ? bestBook.author_name[0] : "Unknown Author",
            publicationYear: bestBook.first_publish_year || null,
            description: "Description not available",
            coverImage: bestBook.cover_i
                ? `https://covers.openlibrary.org/b/id/${bestBook.cover_i}-L.jpg`
                : "Cover image not available"
        };
        console.log(`📖 Best book object for ${title}:`, bestBook);


        if (bestBook.key || bestBook.edition_key) {
            try {
                const workKey = bestBook.key || `/works/${bestBook.edition_key[0]}`;
                const workResponse = await axios.get(`https://openlibrary.org${bestBook.key}.json`);
                console.log(`API Raw Description Response for ${title}:`, workResponse.data.description);
                if (workResponse.data.description) {
                        bookInfo.description = cleanDescription(
                            typeof workResponse.data.description === "string"
                                ? workResponse.data.description
                                : workResponse.data.description.value
                        );
                }
                console.log(`Cleaned Description for ${title}:`, bookInfo.description);
            } catch (descError) {
                console.log("⚠️ Could not fetch description for:", title);
            }
        }
        const matchedKey = Object.keys(customBookData).find(
            key => bookInfo.title.toLowerCase().includes(key.toLowerCase())
        );

        
        if (matchedKey) {
        
            if (!bookInfo.description || bookInfo.description === "Description not available") {
                bookInfo.description = customBookData[matchedKey].description;
            }
            if (!bookInfo.coverImage || bookInfo.coverImage === "Cover image not available") {
                bookInfo.coverImage = customBookData[matchedKey].coverImage;
            }
        }
        
        try {
            await db.query(
                `INSERT INTO books (title, author, publication_year, description, cover_image) 
                 VALUES ($1, $2, $3, $4, $5) 
                 ON CONFLICT (title, author) DO UPDATE 
                 SET description = CASE 
                     WHEN books.description = 'Description not available' OR books.description IS NULL THEN EXCLUDED.description 
                     ELSE books.description END,
                 cover_image = CASE 
                     WHEN books.cover_image = 'Cover image not available' OR books.cover_image IS NULL THEN EXCLUDED.cover_image 
                     ELSE books.cover_image END`,
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

const cleanDescription = (description) => {
    if (!description) return "Description not available";

    if (typeof description !== "string") {
        description = description.value || "Description not available";
    }

    description = description.replace(/\[.*?\]\(https?:\/\/openlibrary\.org\/.*?\)/g, ''); 
    description = description.replace(/https?:\/\/openlibrary\.org\/.*?\s?/g, ''); 
    description = description.replace(/[-]{2,}/g, ''); 
    description = description.replace(/\s{2,}/g, ' ').trim(); 
    description = description.replace(/\*.*?\*/g, ''); 

    description = description.split('Also contained in:')[0].trim();
    description = description.split('Contains:')[0].trim();

    let sentences = description.split(/(?<=\.)\s+/);
    let cleanedSentence = sentences.slice(0, 5).join(" ");

    return cleanedSentence || "Description not available";
};

const getAllBooks = async (req, res) => {
    try {
        const dbBooks = await db.query("SELECT * FROM books ORDER BY id ASC");
        
        if (req.headers["test-mode"] === "true") {
            return res.status(200).json(dbBooks.rows);
        }

        const existingTitles = dbBooks.rows.map(book => book.title);
        const missingBooks = books.filter(book => !existingTitles.includes(book.title));

        const newBooks = [];

        for (const book of books) {
            const fetchedBook = await fetchBookData(book);
            
            if (fetchedBook) {
                newBooks.push(fetchedBook);
            }
        }
        const updatedBooks = await db.query("SELECT * FROM books ORDER BY id ASC");

        res.render("index.ejs", { books: updatedBooks.rows });
    } catch (error) {
        console.error("Error fetching books:", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};

const getAddBookForm = (req, res) => {
    res.render("addBook.ejs", { message: null });
};

const addBook = async (req, res) => {
    const { title, author, publication_year, description, cover_image } = req.body;
    if (!title || !author) {
        return res.status(400).json({ error: "Title and author are required" });
    }
    try {
        const result = await db.query(`INSERT INTO books 
            (title, author, publication_year, description, cover_image) 
            VALUES ($1, $2, $3, $4, $5) RETURNING*`, 
            [title, author, publication_year, description || "Description not available", cover_image || "Cover image not available"]); 
            if (req.headers["test-mode"] === "true") {
                return res.status(201).json({ message: `✅ Book "${title}" added successfully!`, book: result.rows[0] });
            }
        res.render("addBook.ejs", { message: `✅ Book "${title}" added successfully!` });
    } catch (error) {
        console.error("Error adding book:", error);
        res.status(500).json({ error: "Database error" });
    }
};

const getEditBookForm = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query("SELECT * FROM books WHERE id = $1", [id]);
        if (result.rows.length === 0) return res.status(404).send("Book not found");
        res.render("editBook.ejs", { book: result.rows[0] });
    } catch (error) {
        console.error("Error fetching book:", error);
        res.status(500).send("Internal Server Error");
    }
};

const editBook = async (req, res) => {
    const { title, author, publication_year, description, cover_image } = req.body;
    const { id } = req.params;
    try {
        const checkDuplicate = await db.query(
            "SELECT * FROM books WHERE title = $1 AND author = $2 AND id != $3",
            [title, author, id]
        );

        if (checkDuplicate.rows.length > 0) {
            return res.status(400).json({ error: "Another book with the same title and author already exists." });
        }
        const result = await db.query(`UPDATE books
            SET title = $1, author = $2, publication_year = $3, description = $4, cover_image = $5
            WHERE id = $6 RETURNING *`,
            [title,author,publication_year,description,cover_image,id]);
            
            if (result.rows.length === 0) {
                return res.status(404).json({ error: "Book not found" });
            }
            res.redirect("/");
    } catch (error) {
        console.error("Error editing book:", error);
        res.status(500).json({ error: "Database error" });
    }
};

const getDeleteBookForm = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query("SELECT * FROM books WHERE id = $1", [id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Book not found" });
        }

        const book = result.rows[0];
        res.render("deleteConfirm.ejs", { book });

    } catch (error) {
        console.error("Error fetching book for deletion:", error);
        res.status(500).json({ error: "Database error" });
    }
};

const deleteBook = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query(`DELETE FROM books WHERE id = $1 RETURNING *`, [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Book not found" });
        }
        res.redirect("/");
    } catch (error) {
        console.error("Error deleting book:", error);
        res.status(500).json({ error: "Database error" });
    }
};

module.exports = {
    getAllBooks,
    getAddBookForm,
    addBook,
    getEditBookForm,
    editBook,
    getDeleteBookForm,
    deleteBook
};