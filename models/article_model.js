const sqlite3 = require('sqlite3').verbose();
const sqlite = require('sqlite');

// Open a connection to the SQLite database
async function openConnectionToDB() {
  const db = await sqlite.open({
    filename: './testing database.db3',
    driver: sqlite3.Database
  });
  return db;
}

function generateRandomId() {
  return Array.from({ length: 12 }, () => Math.floor(Math.random() * 10)).join('');
}

async function profileIdExists(db, profileID) {
  const query = 'SELECT COUNT(*) as count FROM profiles WHERE profileID = ?';
  const row = await db.get(query, profileID);
  return row.count > 0;
}

async function insertProfile({ name, birthYear, picture, favouriteFilters }) {
  const db = await openConnectionToDB();

  let profileID;
  let idExists = true;

  while (idExists) {
    profileID = generateRandomId();
    idExists = await profileIdExists(db, profileID);
  }

  const query = `INSERT INTO profiles (profileID, name, birthYear, picture, favouriteFilters) VALUES (?, ?, ?, ?, ?)`;
  await db.run(query, [profileID, name, birthYear, picture, favouriteFilters]);

  return profileID;
}

async function getProfileById(profileID) {
  const db = await openConnectionToDB();
  const query = `SELECT * FROM profiles WHERE profileID = ?`;
  const profile = await db.get(query, profileID);

  if (profile && profile.favouriteFilters) {
    profile.favouriteFilters = profile.favouriteFilters.split(',');
  }

  return profile;
}

async function updateProfile({ profileID, name, birthYear, picture, favouriteFilters }) {
  const db = await openConnectionToDB();

  const query = `UPDATE profiles 
                   SET name = ?, birthYear = ?, picture = COALESCE(?, picture), favouriteFilters = ?
                   WHERE profileID = ?`;

  await db.run(query, [name, birthYear, picture, favouriteFilters.join(','), profileID]);
}

async function getAllProfiles() {
  const db = await openConnectionToDB();
  const query = `SELECT profileID, name, picture FROM profiles`;
  const profiles = await db.all(query);
  return profiles;
}

async function addToFavorites(profileID, movieID) {
  const db = await openConnectionToDB();

  const profile = await getProfileById(profileID);
  let favouriteMovies = profile.favouriteMovies ? profile.favouriteMovies.split(',') : [];

  if (!favouriteMovies.includes(movieID)) {
    favouriteMovies.push(movieID);
    const query = `UPDATE profiles SET favouriteMovies = ? WHERE profileID = ?`;
    await db.run(query, [favouriteMovies.join(','), profileID]);
  }
}

async function getMoviesByIds(ids) {
  const db = await openConnectionToDB();

  const placeholders = ids.map(() => '?').join(',');
  const query = `SELECT * FROM MovRec_movie WHERE id IN (${placeholders})`;
  const movies = await db.all(query, ids);

  const placeholderImage = 'https://via.placeholder.com/300x450?text=No+Image+Available';
  movies.forEach(movie => {
    if (!movie.poster) {
      movie.poster = placeholderImage;
    }
  });

  return movies;
}

// New function to retrieve favorite movies for a profile
async function getFavoriteMovies(profileID) {
  const db = await openConnectionToDB();
  const profile = await getProfileById(profileID);
  if (!profile || !profile.favouriteMovies) {
    return [];
  }
  const movieIds = profile.favouriteMovies.split(',');
  return getMoviesByIds(movieIds);
}

// Function to search for movies with filters and pagination
async function searchMovies(filters, offset = 0, limit = 100) {
  const db = await openConnectionToDB();

  let query = 'SELECT * FROM MovRec_movie WHERE 1=1';
  let params = [];

  if (filters.title) {
    query += ' AND title LIKE ?';
    params.push(`%${filters.title}%`);
  }

  if (filters.genres) {
    const genres = Array.isArray(filters.genres) ? filters.genres : [filters.genres];
    genres.forEach((genre) => {
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

  query += ' LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const movieSearchResult = await db.all(query, params);

  return movieSearchResult;
}

// Function to count total number of movies matching the filters
async function countMovies(filters = {}) {
  const db = await openConnectionToDB();

  let query = 'SELECT COUNT(*) as count FROM MovRec_movie WHERE 1=1';
  let params = [];

  if (filters.title) {
    query += ' AND title LIKE ?';
    params.push(`%${filters.title}%`);
  }

  if (filters.genres) {
    const genres = Array.isArray(filters.genres) ? filters.genres : [filters.genres];
    genres.forEach((genre) => {
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

  const row = await db.get(query, params);
  return row.count;
}

// Function to get a movie by its ID
async function getMovieById(id) {
  const db = await openConnectionToDB();
  const query = 'SELECT * FROM MovRec_movie WHERE id = ?';
  const movie = await db.get(query, id);
  return movie;
}

module.exports = {
  openConnectionToDB,
  insertProfile,
  searchMovies,
  countMovies,
  getMovieById,
  getProfileById,
  updateProfile,
  getAllProfiles,
  addToFavorites,
  getMoviesByIds,
  getFavoriteMovies
};
