// Import required modules and dependencies
const articleModel = require('./models/article_model.js');

// Function to open a connection to the database
async function openConnectionToDB() {
    return await articleModel.openConnectionToDB();
}

// Function to get all unique genres from the database
async function getUniqueGenres() {
    const db = await openConnectionToDB();

    // Query to get all genres from the MovRec_movie table
    const rows = await db.all('SELECT genre FROM MovRec_movie');

    // Set to store unique genres
    const uniqueGenres = new Set();

    // Iterate through each row and add genres to the set
    rows.forEach(row => {
        if (row.genre) {
            const genresArray = row.genre.split(',').map(genre => genre.trim());
            genresArray.forEach(genre => uniqueGenres.add(genre));
        }
    });

    // Convert the set to an array and return it
    return Array.from(uniqueGenres);
}

// Run the script to get unique genres
getUniqueGenres().then(genres => {
    console.log('Unique genres available in the database:');
    console.log(genres);
}).catch(error => {
    console.error('Failed to retrieve unique genres:', error.message);
});

[
    'Documentary', 'Short', 'Drama',
    'Fantasy', 'Adventure', 'Action',
    'Western', 'Horror', 'Animation',
    'Comedy', 'Sci-Fi', 'Crime',
    'History', 'Romance', 'Sport',
    'War', 'Biography', 'Family',
    'Thriller', 'Mystery', 'Music',
    'Musical', 'Film-Noir', 'Adult',
    'Talk-Show', 'News', 'Reality-TV'
]