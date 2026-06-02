// tests/health-checks.test.ts
import { api } from './request';

describe('Smoke Tests: Health Checks', () => {
  
  // 1. Root Health Check (Runs first)
  describe('Express: health-check', () => {
    it('should return 200 OK', async () => {
      // No leading slash
      const response = await api.get('health-check');
      expect(response.status).toBe(200);
    });
  });

  // 2. Uploads Service
  describe('Express: uploads/health-check', () => {
    it('should return 200 OK', async () => {
      const response = await api.get('uploads/health-check');
      expect(response.status).toBe(200);
    });
  });

  // 3. Downloads Service (Existing)
  describe('Express: downloads/health-check', () => {
    it('should return 200 OK', async () => {
      const response = await api.get('downloads/health-check');
      expect(response.status).toBe(200);
    });
  });

  // 4. ISOBMFF Service
  describe('Express: isobmff/health-check', () => {
    it('should return 200 OK', async () => {
      const response = await api.get('isobmff/health-check');
      expect(response.status).toBe(200);
    });
  });

  // 5. GraphQL (Existing)
  describe('GraphQL: Health Query', () => {
    it('should return health status from graphql', async () => {
      const query = `
        query {
          health
        }
      `;
      
      const response = await api
        .post('graphql') // No leading slash
        .send({ query });

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
    });
  });
});