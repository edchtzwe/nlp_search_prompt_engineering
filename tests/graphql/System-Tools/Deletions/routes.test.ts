import { api } from '../../../request';

describe('GraphQL: System Tools - Deletions', () => {

  // 1. Purge ISOBMFF Files
  it('should Purge ISOBMFF Files', async () => {
    const query = `mutation PurgeIsobmffFiles {
  purgeIsobmffFiles {
    success
    message
  }
}
`;
    const variables = {};

    const response = await api
      .post('graphql')
      .send({ query, variables });

    expect(response.status).toBe(200);
  });

  // 2. Purge Source Video Files
  it('should Purge Source Video Files', async () => {
    const query = `mutation PurgeSourceFiles {
  purgeSourceFiles {
    success
    message
  }
}`;
    const variables = {};

    const response = await api
      .post('graphql')
      .send({ query, variables });

    expect(response.status).toBe(200);
  });

  // 3. Delete ISOBMFF SubDir By UUID
  it('should Delete ISOBMFF SubDir By UUID', async () => {
    const query = `mutation DeleteIsobmffByUUID($uuid: String!) {
  deleteIsobmffByUUID(uuid: $uuid) {
    success
    message
    uuid
  }
}`;
    const variables = {
      "uuid": "74c3c65d-175c-48f0-9e7d-f20f2696f2dd"
    };

    const response = await api
      .post('graphql')
      .send({ query, variables });

    expect(response.status).toBe(200);
  });

  // 4. Purge Asset Tables in DB
  it('should Purge Asset Tables in DB', async () => {
    const query = `mutation PurgeAssetsDatabase {
  purgeAssetsDatabase {
    success
    message
  }
}`;
    const variables = {};

    const response = await api
      .post('graphql')
      .send({ query, variables });

    expect(response.status).toBe(200);
  });

});
