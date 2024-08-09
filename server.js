// Import required modules and dependencies
const express = require('express');
const nunjucks = require('nunjucks');
const app = express();
const cookieParser = require('cookie-parser');
const articleModel = require('./models/article_model.js');
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
  // Configure Nunjucks template engine
  nunjucks.configure('views', {
    autoescape: false,  // Disable autoescape for flexibility
    express: app        // Attach Nunjucks to the Express app
  });

  // Route for the home page
  app.get('/', async (req, res) => {
    try {
      // Fetch all movies from the database
      const movieSearchResult = await articleModel.searchMovies({});

      // Render the 'index.html' template with the fetched movies
      res.send(nunjucks.render('index.html', { movieSearchResult }));
    } catch (error) {
      console.error("Error fetching movies:", error);
      res.status(500).send("Internal Server Error");
    }
  });

  // Route for advanced search with various filters
  app.get('/search', async (req, res) => {
    try {
      // Retrieve search parameters from query
      const { title, genres, minYear, maxYear, minRating, maxRating, director, cast, country, language } = req.query;

      // Convert year filters to integers if present
      const filters = {
        title,
        genres,
        minYear: minYear ? parseInt(minYear) : undefined,
        maxYear: maxYear ? parseInt(maxYear) : undefined,
        minRating,
        maxRating,
        director,
        cast,
        country,
        language
      };

      // Call searchMovies with the extracted parameters
      const movieSearchResult = await articleModel.searchMovies(filters);

      // Render the 'index.html' template with the search results
      res.send(nunjucks.render('index.html', { movieSearchResult }));
    } catch (error) {
      console.error("Error fetching movies by search parameters:", error);
      res.status(500).send("Internal Server Error");
    }
  });

  // Start the server and listen on port 3000
  app.listen(3000, () => {
    console.log('Server listening on port 3000');
  });
}

// Start the server and set up routes
mainIndexHtml();
