import { api } from '../../request';

describe('GraphQL: System Tools', () => {

  // 1. Find Unvirtualized Videos
  it('should Find Unvirtualized Videos', async () => {
    const query = `query findUnvirtualizedSourceVideos {
  findUnvirtualizedSourceVideos {
    id
    original_name
    filename
    mime_type
    created_at
  }
}`;
    const variables = {};

    const response = await api
      .post('graphql')
      .send({ query, variables });

    expect(response.status).toBe(200);
  });

  // 2. Index Directory
  it('should Index Directory', async () => {
    const query = `query IndexLocalDirectory($url: String!) {
  indexDirectory(url: $url) {
    filename
    filepath
    sizeMB
    createdAt
    modifiedAt
  }
}`;
    const variables = {
      "url": "/app/data/samples"
    };

    const response = await api
      .post('graphql')
      .send({ query, variables });

    expect(response.status).toBe(200);
  });

  // 3. Dump Virtual Video By UUID
  it('should Dump Virtual Video By UUID', async () => {
    const query = `query Mp4Dump($uuid: String!) {
  mp4dump(uuid: $uuid) {
    success
    filePath
    structure
  }
}`;
    const variables = {
      "uuid": "a09642ee-931b-40db-a518-6cf4f85b42bb"
    };

    const response = await api
      .post('graphql')
      .send({ query, variables });

    expect(response.status).toBe(200);
  });

});
