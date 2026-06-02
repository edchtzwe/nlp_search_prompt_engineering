import supertest from 'supertest';

const BASE_URL = process.env.APP_URL || 'http://localhost:3000/';

console.info(`\n🚀 Testing against: ${BASE_URL}\n`);

export const api = supertest(BASE_URL);
