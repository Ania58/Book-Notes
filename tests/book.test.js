const request = require("supertest");
const app = require("../index");
const db = require("../config/db");

describe("GET /",() => {
    it("should get all the books from the database", async () => {
        const response = await request(app)
        .get("/")
        .set("test-mode", "true")
        .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
    }, 15000)
});

describe("📚 Book API Tests", () => {
    beforeEach(async () => {
        if (process.env.NODE_ENV === "test") {
            await db.query("DELETE FROM books WHERE title = 'Test Book' AND author = 'Test Author'");
        }
    });
    let createdBookId; 

    it("should add a new book", async () => {
        const newBook = {
            title: "Test Book",
            author: "Test Author",
            publication_year: 2023,
            description: "This is a test book",
            cover_image: "https://example.com/test-book.jpg"
        };

        const response = await request(app)
            .post("/add")
            .set("Content-Type", "application/json")  
            .set("Accept", "application/json") 
            .set("test-mode", "true")
            .send(newBook) 
            .expect(201); 

        expect(response.text).toContain("✅ Book"); 

        const result = await db.query("SELECT * FROM books WHERE title = $1", [newBook.title]);
        expect(result.rows.length).toBe(1); 
        createdBookId = result.rows[0].id; 
    }, 15000);
    
    it("should return an error when title is missing", async () => {
        const response = await request(app)
            .post("/add")
            .send({ author: "Author Without Title" }) 
            .expect(400); 

        expect(response.body.error).toBe("Title and author are required");
    });

});

describe("✏️ Edit Book API Tests", () => {
    let bookId; 
    beforeAll(async () => {
        if (process.env.NODE_ENV === "test") {
            await db.query("DELETE FROM books WHERE title = 'Edit Test Book' AND author = 'Edit Test Author'");
        }
    
        const newBook = {
            title: "Edit Test Book",
            author: "Edit Test Author",
            publication_year: 2023,
            description: "This is a test book for editing",
            cover_image: "https://example.com/test-book-edit.jpg"
        };
    
        const addResponse = await request(app)
            .post("/add")
            .set("Content-Type", "application/json")  
            .set("Accept", "application/json") 
            .set("test-mode", "true")
            .send(newBook)
            .expect(201);
    
        const result = await db.query("SELECT id FROM books WHERE title = $1", [newBook.title]);
    
        if (result.rows.length > 0) {
            bookId = result.rows[0].id;
        } else {
            throw new Error("bookId was not assigned correctly.");
        }
    });

    it("should edit an existing book", async () => {
        if (!bookId) {
            throw new Error("bookId is undefined before test.");
        }

        const updatedBook = {
            title: "Edited Test Book",
            author: "Edited Test Author",
            publication_year: 2024,
            description: "Updated description",
            cover_image: "https://example.com/updated-test-book.jpg"
        };

        const editResponse = await request(app)
            .post(`/edit/${bookId}`)
            .set("Content-Type", "application/json")  
            .set("Accept", "application/json") 
            .send(updatedBook)
            .expect(302); 

            
        const updatedResult = await db.query("SELECT * FROM books WHERE id = $1", [bookId]);

        expect(updatedResult.rows[0].title).toBe(updatedBook.title);
        expect(updatedResult.rows[0].author).toBe(updatedBook.author);
        expect(updatedResult.rows[0].description).toBe(updatedBook.description);
    }, 15000);
});

describe("🗑️ Delete Book API Tests", () => {
    let bookId;

    beforeAll(async () => {
        if (process.env.NODE_ENV === "test") {
            if (bookId) {
                await db.query("DELETE FROM books WHERE id = $1", [bookId]);
            }
        }

        const newBook = {
            title: "Delete Test Book",
            author: "Delete Test Author",
            publication_year: 2023,
            description: "This is a test book for deleting",
            cover_image: "https://example.com/test-book-delete.jpg"
        };

        const addResponse = await request(app)
            .post("/add")
            .set("Content-Type", "application/json")  
            .set("Accept", "application/json") 
            .set("test-mode", "true")
            .send(newBook)
            .expect(201);

        const result = await db.query("SELECT id FROM books WHERE title = $1", [newBook.title]);

        if (result.rows.length > 0) {
            bookId = result.rows[0].id;
        } else {
            throw new Error("bookId was not assigned correctly.");
        }
    });

    it("should delete an existing book", async () => {
        if (!bookId) {
            throw new Error("❌ bookId is undefined before delete test.");
        }

        await request(app)
            .post(`/delete/${bookId}`)
            .expect(302);

        const deletedResult = await db.query("SELECT * FROM books WHERE id = $1", [bookId]);
        expect(deletedResult.rows.length).toBe(0);
    }, 15000);
});

afterAll(async () => {
    await db.end(); 
});