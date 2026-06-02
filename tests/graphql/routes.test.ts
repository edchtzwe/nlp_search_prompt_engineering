import { api } from '../request';

describe('GraphQL: Top Level Routes', () => {

  // 1. Create Composite
  it('should Create Composite', async () => {
    const query = `mutation CreateCompositeMp4($uuids: [String!]!) {
  createCompositeMp4(uuids: $uuids) {
    success
    message
    uuid
    mediaServerUrl
    fileSize
    instructions
  }
}`;
    const variables = {
"uuids": [
"4fd8b161-c2e7-4a19-b9eb-1cd55bad44be",
"91cc9b88-e682-480d-a1ec-5ea16411487b"
]
};

    const response = await api
      .post('graphql')
      .send({ query, variables });

    expect(response.status).toBe(200);
  });

  // 2. Create Clip
  it('should Create Clip', async () => {
    const query = `mutation CreateClip($sourceUuid: String!, $startTime: Float!, $endTime: Float!) {
  createClippedMp4(sourceUuid: $sourceUuid, startTime: $startTime, endTime: $endTime) {
    success
    uuid
    message
    newDuration
    startTimeSeconds
    endTimeSeconds
    mediaServerUrl
    mdatLocation
  }
}`;
    const variables = {
"sourceUuid": "b9d03e6f-2fe6-4d8c-93ee-ebfee0703daf",
"startTime": 10,
"endTime": 20
};

    const response = await api
      .post('graphql')
      .send({ query, variables });

    expect(response.status).toBe(200);
  });

  // 3. Create Seamstress Mixture
  it('should Create Seamstress Mixture', async () => {
    const query = `mutation createSeamstress($clips: [SeamstressClipInput!]!) {
  createSeamstress(clips: $clips) {
    success
    uuid
    manifestUrl
  totalDuration\n  manifestPath
  }
}`;
    const variables = {
  "clips": [
    {
        "video_id": "7ee17d1b-7ce6-4b8d-a3f4-f7dc59407c96",
        "startTime": 0,
        "endTime": 179.333
    },
    {
        "video_id": "ccfd7c7d-86d5-463e-bedf-b3cf92155832",
        "startTime": 0,
        "endTime": 106.166
    }
  ]
};

    const response = await api
      .post('graphql')
      .send({ query, variables });

    expect(response.status).toBe(200);
  });

  // 4. Create Clip Composites
  it('should Create Clip Composites', async () => {
    const query = `mutation CreateTimedComposite($clips: [SeamstressClipInput!]!) {
  createTimedCompositeMp4(clips: $clips) {
    success
    uuid
    mediaServerUrl
    mdatLocation
    fileSize
    message
  }
}
`;
    const variables = {
  "clips": [
    {
        "video_id": "51331e85-1501-44aa-9755-5383b4eb2fb7",
        "startTime": 10,
        "endTime": 20
    },
    {
        "video_id": "4091a0c2-369b-47dc-8ec8-224bece50631",
        "startTime": 10,
        "endTime": 20
    }
  ]
};

    const response = await api
      .post('graphql')
      .send({ query, variables });

    expect(response.status).toBe(200);
  });

  // 5. NLP
  it('should NLP Search', async () => {
    if (!process.env.GOOGLE_AI_KEY) {
      console.warn('Skipping NLP Search test: GOOGLE_AI_KEY not set');
      return;
    }

    const query = `query Search($prompt: String!, $videoUuid: String) {
  searchScenes(prompt: $prompt, videoUuid: $videoUuid) {
    id
    sourceVideoId
    startTime
    endTime
    content
    similarity
  }
}`;
    const variables = {
  "prompt": "video of plating"
};

    const response = await api
      .post('graphql')
      .send({ query, variables });

    expect(response.status).toBe(200);
  });

  // 6. NLP Video Manifest Discovery
  it('should NLP Video Manifest Discovery', async () => {
    if (!process.env.GOOGLE_AI_KEY) {
      console.warn('Skipping NLP Video Manifest Discovery test: GOOGLE_AI_KEY not set');
      return;
    }

    const query = `query Search($prompt: String!, $videoUuid: String) {
  searchScenes(prompt: $prompt, videoUuid: $videoUuid) {
    id
    sourceVideoId
    startTime
    endTime
    content
    similarity
  }
}`;
    const variables = {
  "prompt": "video of plating",
  "videoUuid": "5f934bbc-f0dd-4584-add5-0e8e2943b066"
};

    const response = await api
      .post('graphql')
      .send({ query, variables });

    expect(response.status).toBe(200);
  });

  // 7. orchestrate video
  it('should orchestrate video', async () => {
    if (!process.env.GOOGLE_AI_KEY) {
      console.warn('Skipping orchestrate video test: GOOGLE_AI_KEY not set');
      return;
    }

    const query = `mutation OrchestrateVideo($prompt: String!) {
  handleVideoOrchestration(prompt: $prompt) {
    success
    message
    data {
      originalPrompt
      action
      reasoning
      searchPhrases
      # The new fields
      successfulPhrase
      foundScenes {
        id
        sourceVideoId
        startTime
        endTime
        similarity
        content
      }
    }
  }
}`;
    // Postman uses {{selectedPrompt}} which is set in pre-request script.
    // I'll pick one of the variations: "Create a single video that teaches me how to cook the top five Asian recipes I can make for under fifteen dollars."
    const variables = {
  "prompt": "Create a single video that teaches me how to cook the top five Asian recipes I can make for under fifteen dollars."
};

    const response = await api
      .post('graphql')
      .send({ query, variables });

    expect(response.status).toBe(200);
  });

  // 8. agentic orchestrate video
  it('should agentic orchestrate video', async () => {
    if (!process.env.GOOGLE_AI_KEY) {
      console.warn('Skipping agentic orchestrate video test: GOOGLE_AI_KEY not set');
      return;
    }

    const query = `mutation OrchestrateVideo($prompt: String!, $context: OrchestrationContextInput) {
  handleVideoOrchestration(prompt: $prompt, context: $context) {
    success
    message
    data {
      originalPrompt
      action
      reasoning
      searchPhrases
      successfulPhrase
      foundScenes {
        id
        sourceVideoId
        startTime
        endTime
        similarity
        content
      }
    }
  }
}`;
    const variables = {
  "prompt": "From this video, show me the the best vegan recipe. Remove all dialogue and non essential content, and deliver a clean video showing just the cooking process and the final dish.",
  "context": {
    "action": "COMPOSITE",
    "uuid": "3b051bda-1322-44f0-bdc4-6fabf8c3708b" 
  }
};

    const response = await api
      .post('graphql')
      .send({ query, variables });

    expect(response.status).toBe(200);
  });

  // 9. judge found scenes
  it('should judge found scenes', async () => {
    if (!process.env.GOOGLE_AI_KEY) {
      console.warn('Skipping judge found scenes test: GOOGLE_AI_KEY not set');
      return;
    }

    const query = `mutation JudgeVideoScenes($prompt: String!, $scenes: [VideoSceneInput!]!) {
  judgeVideoScenes(prompt: $prompt, scenes: $scenes) {
    id
    content
    startTime
    endTime
    similarity
  }
}`;
    const variables = {
  "prompt": "From this video, show me the the best vegan recipe. Remove all dialogue and non essential content, and deliver a clean video showing just the cooking process and the final dish.",
  "context": {
    "action": "COMPOSITE",
    "uuid": "3b051bda-1322-44f0-bdc4-6fabf8c3708b" 
  }
};
    // Note: The Postman body for "judge found scenes" seems to have "context" in variables but the query doesn't use it, and "scenes" is required but missing in the example variables I see in the collection file for this specific request (it has context but no scenes?).
    // Wait, looking at the collection file for "judge found scenes" (lines 1214+):
    // Variables:
    // "prompt": "From this video...",
    // "context": { ... }
    // But the query is: mutation JudgeVideoScenes($prompt: String!, $scenes: [VideoSceneInput!]!)
    // It requires $scenes. The variables provided in the example don't have "scenes".
    // This might be a mistake in the Postman collection or I missed something.
    // However, looking at "judge prompt 1 found scenes" (line 1316), it HAS "scenes".
    // I will use the variables from "judge prompt 1 found scenes" (line 1323) as a valid example, or just skip/comment if I can't find valid input.
    // I'll try to use the variables from "judge prompt 1 found scenes" for this test case as it seems to be the same mutation.
    
    const validVariables = {
    "prompt": "Create a single video that teaches me how to cook the top five Asian recipes I can make for under fifteen dollars.",
    "scenes": [
                    {
                        "id": "f2055d94-f997-4560-aeca-63f74285ba5d",
                        "sourceVideoId": "1a79fffe-1584-4439-9e24-30983ca22df0",
                        "startTime": 0,
                        "endTime": 15,
                        "similarity": 0.685515740324213,
                        "content": "Intro. Cheap Asian vegan recipe. Vegan ramen. Showing the dish. $1.5 meal."
                    }
                ]
    };

    const response = await api
      .post('graphql')
      .send({ query, variables: validVariables });

    expect(response.status).toBe(200);
  });

});
