// Import required modules and dependencies
const axios = require('axios');
const cheerio = require('cheerio');
const articleModel = require('./models/article_model.js');

// Function to open a connection to the database
async function openConnectionToDB() {
    return await articleModel.openConnectionToDB();
}

// Function to update missing posters by scraping
async function updateMissingPostersWithScraping() {
    const db = await openConnectionToDB();
    const placeholderImage = 'https://via.placeholder.com/300x450?text=No+Image+Available';

    // Get movies with missing posters
    const movies = await db.all('SELECT id, title FROM MovRec_movie WHERE poster IS NULL OR poster = ?', [placeholderImage]);

    for (const movie of movies) {
        try {
            // Fetch search page from IMDb for the movie title
            const searchUrl = `https://www.imdb.com/find?q=${encodeURIComponent(movie.title)}`;
            const searchResponse = await axios.get(searchUrl);
            const $search = cheerio.load(searchResponse.data);

            // Extract the first result's link to the movie page
            const moviePageUrl = $search('.result_text a').attr('href');
            if (!moviePageUrl) {
                console.log(`No result found for ${movie.title}`);
                continue;
            }

            // Fetch the movie page
            const fullMoviePageUrl = `https://www.imdb.com${moviePageUrl}`;
            const moviePageResponse = await axios.get(fullMoviePageUrl);
            const $moviePage = cheerio.load(moviePageResponse.data);

            // Extract the poster URL
            const posterUrl = $moviePage('.poster img').attr('src');
            if (posterUrl) {
                await db.run('UPDATE MovRec_movie SET poster = ? WHERE id = ?', [posterUrl, movie.id]);
                console.log(`Updated poster for ${movie.title}`);
            } else {
                console.log(`No poster found for ${movie.title}`);
            }
        } catch (error) {
            console.error(`Failed to update ${movie.title}:`, error.message);
        }
    }
}

// Run the script
updateMissingPostersWithScraping().then(() => {
    console.log('Poster update process completed');
});
