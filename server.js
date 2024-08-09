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

  // Route for the home page with pagination
  app.get('/', async (req, res) => {
    try {
      // Get page number from query, default to 1 if not provided
      const page = parseInt(req.query.page) || 1;
      const moviesPerPage = 100;
      const offset = (page - 1) * moviesPerPage;

      // Fetch movies for the current page from the database
      const movieSearchResult = await articleModel.searchMovies({}, offset, moviesPerPage);

      // Fetch the total count of movies for pagination
      const totalMovies = await articleModel.countMovies();
      const totalPages = Math.ceil(totalMovies / moviesPerPage);

      // Render the 'index.html' template with the fetched movies and pagination data
      res.send(nunjucks.render('index.html', { movieSearchResult, page, totalPages, query: req.query }));
    } catch (error) {
      console.error("Error fetching movies:", error);
      res.status(500).send("Internal Server Error");
    }
  });

  // Route for advanced search with various filters
  app.get('/search', async (req, res) => {
    try {
      // Retrieve search parameters from query
      let { title, genres, minYear, maxYear, minRating, maxRating, director, cast, country, language, page } = req.query;

      // Ensure genres is always treated as an array
      if (typeof genres === 'string') {
        genres = [genres];
      } else if (!Array.isArray(genres)) {
        genres = [];
      }

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

      // Calculate pagination details
      const currentPage = parseInt(page) || 1;
      const moviesPerPage = 100;
      const offset = (currentPage - 1) * moviesPerPage;

      // Call searchMovies with the extracted parameters
      const movieSearchResult = await articleModel.searchMovies(filters, offset, moviesPerPage);

      // Fetch the total count of movies for pagination
      const totalMovies = await articleModel.countMovies(filters);
      const totalPages = Math.ceil(totalMovies / moviesPerPage);

      // Render the 'index.html' template with the search results and pagination data
      res.send(nunjucks.render('index.html', { movieSearchResult, page: currentPage, totalPages, query: req.query }));
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
