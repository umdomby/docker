import { createClient } from 'redis';

const client = createClient({
    url: 'redis://localhost:6379' // Замените на ваш URL, если используете облачный сервис
});

client.on('error', (err) => console.log('Redis Client Error', err));

await client.connect();

export default client;