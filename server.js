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
  try {
    // Configure Nunjucks template engine
    nunjucks.configure('views', {
      autoescape: false,  // Disable autoescape for flexibility
      express: app        // Attach Nunjucks to the Express app
    });

    // Route for the home page with pagination
    app.get('/search', async (req, res) => {
      try {
        const { title, genres, minYear, maxYear, minRating, maxRating, minDuration, maxDuration, director, cast, country, language } = req.query;
    
        const filters = {
          title: title || undefined,
          genres: genres ? (Array.isArray(genres) ? genres : [genres]) : undefined,
          minYear: minYear || undefined,
          maxYear: maxYear || undefined,
          minRating: minRating || undefined,
          maxRating: maxRating || undefined,
          minDuration: minDuration || undefined,
          maxDuration: maxDuration || undefined,
          director: director || undefined,
          cast: cast || undefined,
          country: country || undefined,
          language: language || undefined,
        };
    
        const page = parseInt(req.query.page) || 1;
        const moviesPerPage = 100;
        const offset = (page - 1) * moviesPerPage;
    
        const movieSearchResult = await articleModel.searchMovies(filters, offset, moviesPerPage);
        const totalMovies = await articleModel.countMovies(filters);
        const totalPages = Math.ceil(totalMovies / moviesPerPage);
    
        res.send(nunjucks.render('index.html', { movieSearchResult, page, totalPages, query: req.query }));
      } catch (error) {
        console.error("Error fetching movies:", error);
        res.status(500).send("Internal Server Error");
      }
    });
    
    // Redirect root path to /home
    app.get('/', (req, res) => {
      try {
        res.redirect('/home');
      } catch (error) {
        console.error("Error redirecting to home:", error);
        res.status(500).send("Internal Server Error");
      }
    });

    app.get('/home', async (req, res) => {
      try {
        const profileID = req.cookies.profileID;
        if (!profileID) {
          return res.redirect('/switchProfile');
        }

        const profile = await articleModel.getProfileById(profileID);
        if (!profile) {
          return res.redirect('/signup');
        }

        const { birthYear, favouriteFilters } = profile;
        let filters = [];
        let movieSearchFilters = {};

        // Try to determine user's age
        let age;
        try {
          const currentYear = new Date().getFullYear();
          age = birthYear ? currentYear - birthYear : null;
        } catch (error) {
          console.error("Error calculating age:", error);
          age = null; // Fallback if birthYear is not available
        }

        // Check if favouriteFilters is a string and split it, or if it's already an array, use it directly
        if (favouriteFilters && typeof favouriteFilters === 'string') {
          filters = favouriteFilters.split(',');
        } else if (Array.isArray(favouriteFilters)) {
          filters = favouriteFilters;
        }

        // If age is available, search for movies based on age range
        if (age) {
          movieSearchFilters.minYear = new Date().getFullYear() - (age + 20);
          movieSearchFilters.maxYear = new Date().getFullYear() - (age - 20);
        }

        // Add genres to the search filters if available
        if (filters.length > 0) {
          movieSearchFilters.genres = filters;
        }

        // Fetch favorite movies
        let favoriteMovies = await articleModel.getFavoriteMovies(profileID);
        let featuredMovies = [];
        if (favoriteMovies && favoriteMovies.length > 0) {
          while (featuredMovies.length < 5 && favoriteMovies.length > 0) {
            const randomIndex = Math.floor(Math.random() * favoriteMovies.length);
            featuredMovies.push(favoriteMovies.splice(randomIndex, 1)[0]);
          }
        }

        // Fetch all movies based on the filters, or randomly if no filters/age
        let allMovies;
        if (Object.keys(movieSearchFilters).length > 0) {
          allMovies = await articleModel.searchMovies(movieSearchFilters, 0, 1000);
        } else {
          allMovies = await articleModel.searchMovies({}, 0, 1000); // Fetch all movies randomly
        }

        // Pick 5 random movies from the filtered or full collection
        let recommendedMovies = [];
        if (allMovies.length > 0) {
          while (recommendedMovies.length < 5 && allMovies.length > 0) {
            const randomIndex = Math.floor(Math.random() * allMovies.length);
            recommendedMovies.push(allMovies.splice(randomIndex, 1)[0]);
          }
        }

        res.send(nunjucks.render('home.html', { featuredMovies, recommendedMovies }));
      } catch (error) {
        console.error("Error fetching homepage movies:", error);
        res.status(500).send("Internal Server Error");
      }
    });

    // Route for the Get Started page
    app.get('/getStarted', (req, res) => {
      try {
        res.send(nunjucks.render('getStarted.html'));
      } catch (error) {
        console.error("Error rendering Get Started page:", error);
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

        const movieDetails = await articleModel.getMovieById(movieId);
        if (!movieDetails) {
          return res.status(404).send("Movie not found");
        }

        res.send(nunjucks.render('movie.html', { movie: movieDetails }));
      } catch (error) {
        console.error("Error fetching movie details:", error);
        res.status(500).send("Internal Server Error");
      }
    });

    // Route for the sign-up page
    app.get('/signup', (req, res) => {
      try {
        res.send(nunjucks.render('signup.html'));
      } catch (error) {
        console.error("Error rendering signup page:", error);
        res.status(500).send("Internal Server Error");
      }
    });

    // POST route to handle sign-up form submission
    app.post('/signup', upload.single('picture'), async (req, res) => {
      try {
        const { name, birth_year, favouriteFilters, picture } = req.body;
    
        console.log("Received genres:", favouriteFilters); // Debugging line
    
        const filters = Array.isArray(favouriteFilters) ? favouriteFilters.join(',') : favouriteFilters;
    
        const profileID = await articleModel.insertProfile({
          name,
          birthYear: birth_year,
          picture,
          favouriteFilters: filters
        });
    
        if (!profileID) {
          throw new Error('Failed to generate profile ID');
        }
    
        res.cookie('profileID', profileID, { maxAge: 10 * 365 * 24 * 60 * 60 * 1000, httpOnly: true });
        res.redirect('/getStarted');
      } catch (error) {
        console.error("Error creating profile:", error);
        res.status(500).send("Internal Server Error");
      }
    });
    
    // Route to view profile page
    app.get('/viewProfile', async (req, res) => {
      try {
        const profileID = req.cookies.profileID;
        if (!profileID) {
          return res.redirect('/switchProfile');
        }

        const profile = await articleModel.getProfileById(profileID);
        if (!profile) {
          return res.redirect('/signup');
        }

        res.send(nunjucks.render('viewProfile.html', { profile }));
      } catch (error) {
        console.error("Error fetching profile details:", error);
        res.status(500).send("Internal Server Error");
      }
    });

    // Route for the favorites page
    app.get('/favorites', async (req, res) => {
      try {
        const profileID = req.cookies.profileID;
        if (!profileID) {
          return res.redirect('/switchProfile');
        }

        const favoriteMovies = await articleModel.getFavoriteMovies(profileID);
        if (!favoriteMovies || favoriteMovies.length === 0) {
          return res.status(404).send("No favorite movies found");
        }

        res.send(nunjucks.render('favorites.html', { favoriteMovies }));
      } catch (error) {
        console.error("Error fetching favorite movies:", error);
        res.status(500).send("Internal Server Error");
      }
    });

    // Route to handle profile editing
    app.get('/editProfile', async (req, res) => {
      try {
        const profileID = req.cookies.profileID;
        if (!profileID) {
          return res.redirect('/switchProfile');
        }

        const profile = await articleModel.getProfileById(profileID);
        if (!profile) {
          return res.redirect('/signup');
        }

        res.send(nunjucks.render('edit.html', { profile }));
      } catch (error) {
        console.error("Error fetching profile details:", error);
        res.status(500).send("Internal Server Error");
      }
    });

    // POST route to handle profile edits
    app.post('/edit', upload.single('picture'), async (req, res) => {
      try {
        const { profileID, name, birth_year, favouriteFilters } = req.body;
        const picture = req.file ? `/uploads/${req.file.filename}` : null;

        const filters = Array.isArray(favouriteFilters) ? favouriteFilters.join(',') : favouriteFilters;

        await articleModel.updateProfile({
          profileID,
          name,
          birthYear: birth_year,
          picture,
          favouriteFilters: filters
        });

        res.send("Profile updated successfully!");
      } catch (error) {
        console.error("Error updating profile:", error);
        res.status(500).send("Internal Server Error");
      }
    });

    // POST route to handle adding a movie to favorites
    app.post('/addToFavorites', async (req, res) => {
      try {
        const profileID = req.cookies.profileID;
        const { movieID } = req.body;

        if (!profileID || !movieID) {
          return res.status(400).send("Bad Request: Profile ID and Movie ID are required");
        }

        await articleModel.addToFavorites(profileID, movieID);

        res.send("Movie added to favorites successfully!");
      } catch (error) {
        console.error("Error adding movie to favorites:", error);
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

    // Route for switching profiles
    app.get('/switchProfile', async (req, res) => {
      try {
        const profiles = await articleModel.getAllProfiles();
        if (!profiles || profiles.length === 0) {
          // Redirect to the sign-up page if no profiles are found
          return res.redirect('/signup');
        }
    
        res.send(nunjucks.render('switchProfile.html', { profiles }));
      } catch (error) {
        console.error("Error fetching profiles:", error);
        res.status(500).send("Internal Server Error");
      }
    });
    
    // POST route to handle profile switching
    app.post('/switchProfile', (req, res) => {
      try {
        const { profileID } = req.body;
        if (!profileID) {
          return res.status(400).send("Bad Request: Profile ID is required");
        }
    
        res.cookie('profileID', profileID, { maxAge: 900000, httpOnly: true });
        res.redirect('/');
      } catch (error) {
        console.error("Error switching profile:", error);
        res.status(500).send("Internal Server Error");
      }
    });
    
    // Start the server and listen on port 3000
    app.listen(3000, () => {
      console.log('Server listening on port 3000');
    });
  } catch (error) {
    console.error("Error initializing the server:", error);
  }
}

// Start the server and set up routes
mainIndexHtml();
