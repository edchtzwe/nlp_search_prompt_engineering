import { api } from '../request';
import * as fs from 'fs';
import * as path from 'path';

describe('Workflow: Upload -> Virtualize -> Downstream', () => {
  let uploadedVideoUuid1: string;
  let uploadedVideoUuid2: string;
  let virtualVideoUuid1: string;
  let virtualVideoUuid2: string;

  // Helper to upload and virtualize a video
  const processVideo = async (filename: string): Promise<{ uploadUuid: string, virtualUuid: string }> => {
    const filePath = path.resolve(__dirname, `../data/${filename}`);
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`Skipping upload test, file not found: ${filePath}`);
    }

    // 1. Upload
    const uploadResponse = await api
      .post('uploads/upload-video')
      .attach('file', filePath);

    expect(uploadResponse.status).toBe(201);
    const uploadUuid = uploadResponse.body.file.id;
    expect(uploadUuid).toBeDefined();

    // 2. Re-encode
    const reencodeQuery = `mutation ReencodeMp4($uuid: String!) {
      reencodeMp4(uuid: $uuid) {
        success
        uuid
      }
    }`;
    await api.post('graphql').send({ query: reencodeQuery, variables: { uuid: uploadUuid } });

    // 3. Slice
    const sliceQuery = `mutation SliceFmp4($uuid: String!) {
      sliceFmp4(uuid: $uuid) {
        success
        uuid
      }
    }`;
    await api.post('graphql').send({ query: sliceQuery, variables: { uuid: uploadUuid } });

    // 4. Create Virtual Video (DREF)
    const drefQuery = `query CreateDrefMp4($uuid: String!) {
      createDrefMp4(uuid: $uuid) {
        success
        uuid
      }
    }`;
    const drefResponse = await api.post('graphql').send({ query: drefQuery, variables: { uuid: uploadUuid } });
    
    if (drefResponse.body.errors || !drefResponse.body.data || !drefResponse.body.data.createDrefMp4) {
      console.error('CreateDrefMp4 Failed:', JSON.stringify(drefResponse.body, null, 2));
    }
    
    const virtualUuid = drefResponse.body.data.createDrefMp4.uuid;

    return { uploadUuid, virtualUuid };
  };

  it('should process SampleOne.mp4', async () => {
    const result = await processVideo('SampleOne.mp4');
    uploadedVideoUuid1 = result.uploadUuid;
    virtualVideoUuid1 = result.virtualUuid;
    console.log('SampleOne UUIDs:', result);
  });

  it('should process SampleTwo.mp4', async () => {
    const result = await processVideo('SampleTwo.mp4');
    uploadedVideoUuid2 = result.uploadUuid;
    virtualVideoUuid2 = result.virtualUuid;
    console.log('SampleTwo UUIDs:', result);
  });

  // 5. Downstream: Download MDAT (using SampleOne)
  it('should be able to download MDAT', async () => {
    if (!uploadedVideoUuid1) return;
    const response = await api.get(`downloads/download-mdat/${uploadedVideoUuid1}`);
    expect(response.status).toBe(200);
  });

  // 6. Downstream: Download DREF MOOV (using SampleOne)
  it('should be able to download DREF MOOV', async () => {
    const targetUuid = virtualVideoUuid1 || uploadedVideoUuid1;
    if (!targetUuid) return;
    const response = await api.get(`downloads/download-dref-moov/${targetUuid}`);
    expect(response.status).toBe(200);
  });

  // 7. Create Clip
  it('should create a video clip', async () => {
    if (!uploadedVideoUuid1) return;

    const query = `mutation CreateClip($sourceUuid: String!, $startTime: Float!, $endTime: Float!) {
      createClippedMp4(sourceUuid: $sourceUuid, startTime: $startTime, endTime: $endTime) {
        success
        uuid
        message
      }
    }`;
    const variables = {
      sourceUuid: uploadedVideoUuid1,
      startTime: 5,
      endTime: 10
    };

    const response = await api.post('graphql').send({ query, variables });
    expect(response.status).toBe(200);
    expect(response.body.data.createClippedMp4.success).toBe(true);
  });

  // 8. Create Composite (using both videos)
  it('should create a composite video', async () => {
    if (!uploadedVideoUuid1 || !uploadedVideoUuid2) return;

    const query = `mutation CreateCompositeMp4($uuids: [String!]!) {
      createCompositeMp4(uuids: $uuids) {
        success
        uuid
        message
      }
    }`;
    const variables = {
      uuids: [uploadedVideoUuid1, uploadedVideoUuid2]
    };

    const response = await api.post('graphql').send({ query, variables });
    expect(response.status).toBe(200);
    expect(response.body.data.createCompositeMp4.success).toBe(true);
  });

  // 9. Create Seamstress Mixture (using both videos)
  it('should create a seamstress mixture', async () => {
    if (!uploadedVideoUuid1 || !uploadedVideoUuid2) return;

    const query = `mutation createSeamstress($clips: [SeamstressClipInput!]!) {
      createSeamstress(clips: $clips) {
        success
        uuid
        manifestUrl
      }
    }`;
    const variables = {
      clips: [
        { video_id: uploadedVideoUuid1, startTime: 0, endTime: 5 },
        { video_id: uploadedVideoUuid2, startTime: 0, endTime: 5 }
      ]
    };

    const response = await api.post('graphql').send({ query, variables });
    expect(response.status).toBe(200);
    expect(response.body.data.createSeamstress.success).toBe(true);
  });

});
