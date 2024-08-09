// Import required modules and dependencies
const articleModel = require('./models/article_model.js');

// Function to open a connection to the database
async function openConnectionToDB() {
    return await articleModel.openConnectionToDB();
}

// Function to delete movies without posters
async function deleteMoviesWithoutPosters() {
    const db = await openConnectionToDB();
    const placeholderImage = 'https://via.placeholder.com/300x450?text=No+Image+Available';

    // Get movies with missing posters
    const moviesWithoutPosters = await db.all('SELECT id, title FROM MovRec_movie WHERE poster IS NULL OR poster = ?', [placeholderImage]);

    for (const movie of moviesWithoutPosters) {
        try {
            // Delete movie from the database
            await db.run('DELETE FROM MovRec_movie WHERE id = ?', [movie.id]);
            console.log(`Deleted movie: ${movie.title} (ID: ${movie.id})`);
        } catch (error) {
            console.error(`Failed to delete ${movie.title} (ID: ${movie.id}):`, error.message);
        }
    }

    console.log('Deletion process completed');
}

// Run the script
deleteMoviesWithoutPosters().then(() => {
    console.log('Movies without posters have been deleted');
});
