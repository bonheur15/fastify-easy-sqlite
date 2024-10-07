import Fastify from 'fastify'
import sqlite3 from 'sqlite3';
const app = Fastify({
  logger: true,
})

const db = new sqlite3.Database('./hits.db');


const incrementHitCount = (endpoint) => {
  return new Promise((resolve, reject) => {
    db.run(
      `
      INSERT INTO hits (endpoint, hit_count) 
      VALUES (?, 1) 
      ON CONFLICT(endpoint) 
      DO UPDATE SET hit_count = hit_count + 1
    `,
      [endpoint],
      (err) => {
        if (err) {
          console.error('Error updating hit count:', err.message);
          return reject(err);
        }
        resolve();
      }
    );
  });
};




db.run(
  `
  CREATE TABLE IF NOT EXISTS hits (
    endpoint TEXT PRIMARY KEY,
    hit_count INTEGER DEFAULT 0
  )
`,
  (err) => {
    if (err) {
      console.error('Error creating table:', err.message);
      process.exit(1);
    } else {
      console.log('Hits table created or already exists');

      // Endpoint to get the stats of all hit counts
      fastify.get('/stats', async (_request, reply) => {
        try {
          const hits = await new Promise((resolve, reject) => {
            db.all('SELECT * FROM hits', [], (err, rows) => {
              if (err) {
                console.error('Error fetching hit counts:', err.message);
                return reject(err);
              }
              resolve(rows);
            });
          });
          reply.send(hits);
        } catch (error) {
          reply.status(500).send({ error: 'Error fetching stats' });
        }
      });

      // Endpoint to increment hit count for a specific endpoint
      fastify.get('/hit/:endpoint', async (request, reply) => {
        const endpoint = `/${request.params.endpoint}`;
        try {
          await incrementHitCount(endpoint);
          reply.send({ message: `Hit count for ${endpoint} incremented` });
        } catch (error) {
          reply.status(500).send({ error: 'Error incrementing hit count' });
        }
      });

    }
  }
);

export default async function handler(req, reply) {
  await app.ready()
  app.server.emit('request', req, reply)
}


