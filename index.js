/* eslint-disable no-undef */
'use strict';

const port = 8010;


const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database(':memory:');

const buildSchemas = require('./src/schemas');

db.serialize(async () => {
    await buildSchemas(db);

    const app = require('./src/app')(db);

    // eslint-disable-next-line no-console
    await app.listen(port, () => console.log(`App started and listening on port ${port}`));
});
