// Import the necessary modules for SQLite database interaction
const sqlite3 = require('sqlite3').verbose(); // Import sqlite3 with verbose mode for debugging
const sqlite = require('sqlite'); // Import sqlite to provide async/await API over sqlite3

// Open a connection to the SQLite database
async function openConnectionToDB() {
  const db = await sqlite.open({
    filename: './testing database.db3', // Path to the SQLite database file
    driver: sqlite3.Database // Specify the database driver
  });
  return db; // Return the database connection object
}

// Function to generate a 12-digit random ID without scientific notation
function generateRandomId() {
  return Array.from({ length: 12 }, () => Math.floor(Math.random() * 10)).join('');
}

// Function to check if a profile ID already exists in the database
async function profileIdExists(db, profileID) {
  const query = 'SELECT COUNT(*) as count FROM profiles WHERE profileID = ?';
  const row = await db.get(query, profileID);
  return row.count > 0;
}

// Function to insert a new profile into the database
async function insertProfile({ name, birthYear, picture, favouriteFilters }) {
  const db = await openConnectionToDB();

  let profileID;
  let idExists = true;

  // Generate a unique profile ID
  while (idExists) {
    profileID = generateRandomId();
    idExists = await profileIdExists(db, profileID);
  }

  const query = `INSERT INTO profiles (profileID, name, birthYear, picture, favouriteFilters) VALUES (?, ?, ?, ?, ?)`;
  await db.run(query, [profileID, name, birthYear, picture, favouriteFilters]);

  return profileID; // Return the generated profileID
}

// Function to get a profile by ID
async function getProfileById(profileID) {
  const db = await openConnectionToDB();
  const query = `SELECT * FROM profiles WHERE profileID = ?`;
  const profile = await db.get(query, profileID);

  // Ensure favouriteFilters and favouriteMovies are returned as arrays
  if (profile && profile.favouriteFilters) {
    profile.favouriteFilters = profile.favouriteFilters.split(',');
  }
  if (profile && profile.favouriteMovies) {
    profile.favouriteMovies = profile.favouriteMovies.split(',');
  }

  return profile;
}

// Function to update an existing profile in the database
async function updateProfile({ profileID, name, birthYear, picture, favouriteFilters }) {
  const db = await openConnectionToDB();

  const query = `UPDATE profiles 
                 SET name = ?, birthYear = ?, picture = COALESCE(?, picture), favouriteFilters = ?
                 WHERE profileID = ?`;

  await db.run(query, [name, birthYear, picture, favouriteFilters.join(','), profileID]);
}

// Function to add a favorite movie to the profile
async function addFavoriteMovie(profileID, movieID) {
  const db = await openConnectionToDB();

  // Get the current favorite movies for the profile
  const profile = await getProfileById(profileID);
  let favouriteMovies = profile.favouriteMovies || [];

  // Add the new movie ID if it's not already in the list
  if (!favouriteMovies.includes(movieID)) {
    favouriteMovies.push(movieID);
  }

  // Update the profile with the new favorite movies list
  const query = `UPDATE profiles 
                 SET favouriteMovies = ?
                 WHERE profileID = ?`;

  await db.run(query, [favouriteMovies.join(','), profileID]);
}

// Function to get all profiles from the database
async function getAllProfiles() {
  const db = await openConnectionToDB();
  const query = `SELECT profileID, name, picture FROM profiles`;
  const profiles = await db.all(query);
  return profiles;
}

// Function to search for movies based on various attributes with pagination
async function searchMovies({ title, genres, minYear, maxYear, minRating, maxRating, director, cast, country, language }, offset = 0, limit = 100) {
  const db = await openConnectionToDB(); // Open database connection

  // Initialize query and parameters array
  let query = 'SELECT * FROM MovRec_movie WHERE 1=1';
  let params = [];

  // Add title condition for partial or full match
  if (title) {
    query += ' AND title LIKE ?';
    params.push(`%${title}%`);
  }

  // Ensure genres is always treated as an array
  if (genres) {
    if (typeof genres === 'string') {
      genres = [genres]; // Convert to array if it's a string
    }

    // Add conditions to match all selected genres
    genres.forEach((genre) => {
      query += ' AND genre LIKE ?';
      params.push(`%${genre}%`);
    });
  }

  // Add other conditions based on provided filters
  if (minYear) {
    query += ' AND year >= ?';
    params.push(minYear);
  }
  if (maxYear) {
    query += ' AND year <= ?';
    params.push(maxYear);
  }
  if (minRating) {
    query += ' AND imdbrating >= ?';
    params.push(minRating);
  }
  if (maxRating) {
    query += ' AND imdbrating <= ?';
    params.push(maxRating);
  }
  if (director) {
    query += ' AND director LIKE ?';
    params.push(`%${director}%`);
  }
  if (cast) {
    query += ' AND cast LIKE ?';
    params.push(`%${cast}%`);
  }
  if (country) {
    query += ' AND country LIKE ?';
    params.push(`%${country}%`);
  }
  if (language) {
    query += ' AND language LIKE ?';
    params.push(`%${language}%`);
  }

  // Add limit and offset for pagination
  query += ' LIMIT ? OFFSET ?';
  params.push(limit, offset);

  // Execute the query with parameters
  let movieSearchResult = await db.all(query, ...params);

  // Set a default placeholder image URL
  const placeholderImage = 'https://via.placeholder.com/300x450?text=No+Image+Available';

  // Replace missing poster images with the placeholder image
  movieSearchResult.forEach(movie => {
    if (!movie.poster) {
      movie.poster = placeholderImage;
    }
  });

  return movieSearchResult;
}

// Function to get a movie by its ID
async function getMovieById(id) {
  const db = await openConnectionToDB(); // Open database connection

  // Query to select a movie by ID
  const query = 'SELECT * FROM MovRec_movie WHERE id = ?';
  const movie = await db.get(query, id);

  // Return the movie details
  return movie;
}

// Function to count the total number of movies in the database (with optional filters)
async function countMovies(filters = {}) {
  const db = await openConnectionToDB(); // Open database connection

  // Initialize query and parameters array
  let query = 'SELECT COUNT(*) as count FROM MovRec_movie WHERE 1=1';
  let params = [];

  // Add conditions based on filters (optional)
  if (filters.title) {
    query += ' AND title LIKE ?';
    params.push(`%${filters.title}%`);
  }
  if (filters.genres) {
    if (typeof filters.genres === 'string') {
      filters.genres = [filters.genres]; // Convert to array if it's a string
    }

    filters.genres.forEach((genre) => {
      query += ' AND genre LIKE ?';
      params.push(`%${genre}%`);
    });
  }
  if (filters.minYear) {
    query += ' AND year >= ?';
    params.push(filters.minYear);
  }
  if (filters.maxYear) {
    query += ' AND year <= ?';
    params.push(filters.maxYear);
  }
  if (filters.minRating) {
    query += ' AND imdbrating >= ?';
    params.push(filters.minRating);
  }
  if (filters.maxRating) {
    query += ' AND imdbrating <= ?';
    params.push(filters.maxRating);
  }
  if (filters.director) {
    query += ' AND director LIKE ?';
    params.push(`%${filters.director}%`);
  }
  if (filters.cast) {
    query += ' AND cast LIKE ?';
    params.push(`%${filters.cast}%`);
  }
  if (filters.country) {
    query += ' AND country LIKE ?';
    params.push(`%${filters.country}%`);
  }
  if (filters.language) {
    query += ' AND language LIKE ?';
    params.push(`%${filters.language}%`);
  }

  // Execute the query with parameters
  const row = await db.get(query, ...params);
  return row.count;
}

// Export functions
module.exports = {
  openConnectionToDB,
  insertProfile,
  searchMovies,
  countMovies,
  getMovieById,
  getProfileById,
  updateProfile,
  addFavoriteMovie, // Export the new function
  getAllProfiles
};
