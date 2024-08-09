// Import required modules and dependencies
const express = require('express');
const nunjucks = require('nunjucks');
const app = express();
const cookieParser = require('cookie-parser');
const articleModel = require('./models/article_model.js');
const path = require('path');
const multer = require('multer');

// Middleware setup
app.use(express.static('public'));
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Set up file storage with multer for file uploads
const upload = multer({ dest: 'public/' });

// Main function to initialize the server and routes
async function mainIndexHtml() {
  // Open a connection to the database
  const db = await articleModel.openConnectionToDB();

  // Configure Nunjucks template engine
  nunjucks.configure('views', {
    autoescape: false,
    express: app
  });

  // Route for the home page
  app.get('/', async (req, res) => {
    try {
      // Fetch all movies from the database
      let movieSearchResult = await db.all('SELECT * FROM MovRec_movie');
      // Render the 'index.html' template with the fetched movies
      const html = nunjucks.render('index.html', { movieSearchResult });
      res.send(html); // Send the rendered HTML to the client
    } catch (error) {
      console.error("Error fetching movies:", error);
      res.status(500).send("Internal Server Error");
    }
  });

  // Route for advanced search with various filters
  app.get('/search', async (req, res) => {
    try {
      // Retrieve search parameters from query
      let { genres, minYear, maxYear, minRating, maxRating, director, cast, country, language } = req.query;

      // Adjust for decade-based year ranges
      if (minYear) minYear = parseInt(minYear);
      if (maxYear) maxYear = parseInt(maxYear);

      // Call searchMovies with the extracted parameters
      let movieSearchResult = await articleModel.searchMovies({
        genres,
        minYear,
        maxYear,
        minRating,
        maxRating,
        director,
        cast,
        country,
        language
      });

      // Render the 'index.html' template with the search results
      const html = nunjucks.render('index.html', { movieSearchResult });
      res.send(html); // Send the rendered HTML to the client
    } catch (error) {
      console.error("Error fetching movies by search parameters:", error);
      res.status(500).send("Internal Server Error");
    }
  });

  // Remaining routes (e.g., /article.html/:id, /new_article.html, etc.) remain unchanged

  // Start the server and listen on port 3000
  app.listen(3000, () => {
    console.log('Server listening on port 3000');
  });
}

// Call the main function to start the server and set up routes
mainIndexHtml(); // Ensure this call is after the function definition
