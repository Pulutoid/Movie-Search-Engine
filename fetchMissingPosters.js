// Import required modules and dependencies
const articleModel = require('./models/article_model.js');

// Function to open a connection to the database
async function openConnectionToDB() {
    return await articleModel.openConnectionToDB();
}

// Function to update the runtime column by removing " min"
async function updateRuntimeColumn() {
    const db = await openConnectionToDB();

    try {
        // Fetch all movies with runtime
        const rows = await db.all('SELECT id, runtime FROM MovRec_movie');
        const totalRows = rows.length;

        console.log(`Total rows to update: ${totalRows}`);

        // Iterate through each row and update the runtime
        let updatedCount = 0;
        for (const row of rows) {
            if (row.runtime) {
                // Remove " min" and trim any spaces
                const updatedRuntime = row.runtime.replace(' min', '').trim();

                // Update the database with the new runtime value
                await db.run('UPDATE MovRec_movie SET runtime = ? WHERE id = ?', [updatedRuntime, row.id]);
                updatedCount++;
                console.log(`Updated ${updatedCount}/${totalRows} rows.`);
            }
        }

        console.log('Runtime column has been successfully updated.');
    } catch (error) {
        console.error('Failed to update runtime column:', error.message);
    } finally {
        await db.close();
    }
}

// Run the script to update the runtime column
updateRuntimeColumn().catch(error => {
    console.error('Failed to execute the script:', error.message);
});
