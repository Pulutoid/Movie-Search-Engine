// Import required modules and dependencies
const express = require('express');
const nunjucks = require('nunjucks');
const app = express();
const cookieParser = require('cookie-parser');
const articleModel = require('./models/article_model.js');
const multer = require('multer');
const path = require('path');

// Middleware setup
app.use(express.static('public'));
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Set up file storage with multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

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
      const { title, genres, minYear, maxYear, minRating, maxRating, director, cast, country, language, page } = req.query;

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

  // Route for the movie details page
  app.get('/movie', async (req, res) => {
    try {
      const movieId = req.query.id;
      if (!movieId) {
        return res.status(400).send("Bad Request: Movie ID is required");
      }

      // Fetch movie details by ID
      const movieDetails = await articleModel.getMovieById(movieId);

      if (!movieDetails) {
        return res.status(404).send("Movie not found");
      }

      // Render the 'movie.html' template with the movie details
      res.send(nunjucks.render('movie.html', { movie: movieDetails }));
    } catch (error) {
      console.error("Error fetching movie details:", error);
      res.status(500).send("Internal Server Error");
    }
  });

  // Route for the sign-up page
  app.get('/signup', (req, res) => {
    try {
      // Render the 'signup.html' template
      res.send(nunjucks.render('signup.html'));
    } catch (error) {
      console.error("Error rendering signup page:", error);
      res.status(500).send("Internal Server Error");
    }
  });

  // POST route to handle sign-up form submission
  // POST route to handle sign-up form submission
  app.post('/signup', upload.single('picture'), async (req, res) => {
    try {
      const { name, birth_year, favouriteFilters } = req.body;
      const picture = req.file ? `/uploads/${req.file.filename}` : null;

      // Convert favouriteFilters to string (comma-separated)
      const filters = Array.isArray(favouriteFilters) ? favouriteFilters.join(',') : favouriteFilters;

      // Insert new profile into the database and get the profileID
      const profileID = await articleModel.insertProfile({ name, birthYear: birth_year, picture, favouriteFilters: filters });

      if (!profileID) {
        throw new Error('Failed to generate profile ID');
      }

      // Store profileID in a cookie
      res.cookie('profileID', profileID, { maxAge: 900000, httpOnly: true });

      res.send("Profile created successfully!");
    } catch (error) {
      console.error("Error creating profile:", error);
      res.status(500).send("Internal Server Error");
    }
  });


  // Route to view profile page
  // Route to view profile page
  app.get('/viewProfile', async (req, res) => {
    try {
      const profileID = req.cookies.profileID;
      if (!profileID) {
        return res.status(400).send("Bad Request: Profile ID is required");
      }

      // Fetch profile details by ID
      const profile = await articleModel.getProfileById(profileID);

      if (!profile) {
        return res.status(404).send("Profile not found");
      }

      // Render the 'viewProfile.html' template with the profile details
      res.send(nunjucks.render('viewProfile.html', { profile }));
    } catch (error) {
      console.error("Error fetching profile details:", error);
      res.status(500).send("Internal Server Error");
    }
  });

  // Route to get profile by ID (used for profile retrieval)
  app.get('/get-profile', async (req, res) => {
    try {
      const profileID = req.query.id;
      if (!profileID) {
        return res.status(400).json({ error: "Profile ID is required" });
      }

      const profile = await articleModel.getProfileById(profileID);
      if (!profile) {
        return res.status(404).json({ error: "Profile not found" });
      }

      res.json(profile);
    } catch (error) {
      console.error("Error retrieving profile:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Route to handle profile edits
  app.post('/edit', upload.single('picture'), async (req, res) => {
    try {
      const { profileID, name, birth_year, favouriteFilters } = req.body;
      const picture = req.file ? `/uploads/${req.file.filename}` : null;

      // Convert favouriteFilters to string (comma-separated)
      const filters = Array.isArray(favouriteFilters) ? favouriteFilters.join(',') : favouriteFilters;

      // Update the profile in the database
      await articleModel.updateProfile({ profileID, name, birthYear: birth_year, picture, favouriteFilters: filters });

      res.send("Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
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
