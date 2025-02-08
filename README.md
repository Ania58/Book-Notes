# Book-Notes
## 📚 Book Management Website with Open Library Integration
This is a Node.js + Express + PostgreSQL project that integrates with the Open Library API to fetch book data, including covers and descriptions. The project supports CRUD operations for managing books while persisting data in a PostgreSQL database.

### 🚀 Features
* GET & POST-only API: Uses POST also for updates and deletions.
* Open Library API Integration: Fetches book covers and descriptions dynamically.
* EJS Templating: Renders book-related views.
* Environment Variables: Stores API keys and configurations securely.

### 🛠 Technologies Used
#### Backend:
* Node.js
* Express.js
* PostgreSQL
* Axios (for API calls)
#### Frontend:
* EJS (for templating)
* HTML, CSS
#### API Integration:
* Open Library Covers API


### 📂 Project Structure
``` bash
📦 BOOK-NOTES
 ┣ 📂 public                # Static assets (CSS)
 ┣ 📂 views                 # EJS templates
 ┣ 📂 routes                # API routes
 ┣ 📂 config                # Database configurations
 ┣ 📜 .env                  # Environment variables 
 ┣ 📜 index.js              # Main Express server
 ┣ 📜 README.md             # Project documentation
 ┣ 📜 package.json          # Project dependencies

 ```

 ### 1️⃣ Install dependencies
```bash
npm install
```

### 2️⃣ Set up environment variables
#### Create a .env file in the root directory and add:
* USER
* HOST
* DATABASE
* PASSWORD
* PORT


### 3️⃣  Run the server
```bash
npm start
```

OR 
```bash
nodemon index.js
```

The Book Notes page will be available at http://localhost:3000.

```bash 
🔗 API Endpoints
Method	Endpoint	    Description
GET	    /	            Fetch all books
POST	/add	         Add a new book
POST	/edit/:id	    Update a book (form-based)
POST	/delete/:id	    Delete a book (form-based)
```