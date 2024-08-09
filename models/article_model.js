// Import the necessary modules for SQLite database interaction
const sqlite3 = require('sqlite3').verbose(); // Import sqlite3 with verbose mode for debugging
const sqlite = require('sqlite'); // Import sqlite to provide async/await API over sqlite3

// Open a connection to the SQLite database
async function openConnectionToDB() {
  // Open a connection to the database file 'testing database.db3'
  const db = await sqlite.open({
    filename: './testing database.db3', // Path to the SQLite database file
    driver: sqlite3.Database // Specify the database driver
  });
  return db; // Return the database connection object
}

// Search for movies based on various attributes with pagination
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
    } else if (!Array.isArray(genres)) {
      genres = []; // Default to an empty array if undefined or not an array
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

// Count the total number of movies in the database (with optional filters)
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
    } else if (!Array.isArray(filters.genres)) {
      filters.genres = []; // Default to an empty array if undefined or not an array
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

// Export the functions for use in other parts of the application
module.exports = {
  openConnectionToDB,
  searchMovies,
  countMovies
};
