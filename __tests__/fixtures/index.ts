/**
 * Test fixtures - reusable test data for all test suites
 */

export const fixtures = {
  users: {
    validUser: {
      id: "test-user-id-001",
      email: "testuser@example.com",
      displayName: "Test User",
      theme: "light",
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
    },
    anotherUser: {
      id: "test-user-id-002",
      email: "anotheruser@example.com",
      displayName: "Another User",
      theme: "dark",
      createdAt: new Date("2024-01-02"),
      updatedAt: new Date("2024-01-02"),
    },
  },

  collections: {
    publicCollection: {
      id: "test-collection-001",
      title: "My Public Collection",
      description: "A publicly visible collection",
      userId: "test-user-id-001",
      coverImage: null,
      isPublic: true,
      slug: "my-public-collection-1704067200",
      primaryTypeId: null,
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
    },
    privateCollection: {
      id: "test-collection-002",
      title: "My Private Collection",
      description: "A private collection",
      userId: "test-user-id-001",
      coverImage: null,
      isPublic: false,
      slug: "my-private-collection-1704067200",
      primaryTypeId: null,
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
    },
    withPrimaryType: {
      id: "test-collection-003",
      title: "Car Collection",
      description: "Collection of cars",
      userId: "test-user-id-001",
      coverImage: "https://example.com/car-cover.jpg",
      isPublic: true,
      slug: "car-collection-1704067200",
      primaryTypeId: "type-car",
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
    },
  },

  artifacts: {
    imageArtifact: {
      id: "test-artifact-001",
      title: "Old Family Photo",
      description: "A photo from the 1980s",
      collectionId: "test-collection-001",
      userId: "test-user-id-001",
      mediaUrls: ["https://example.com/photo.jpg"],
      thumbnailUrl: "https://example.com/photo.jpg",
      slug: "old-family-photo-1704067200",
      yearAcquired: 1985,
      origin: "Family Estate",
      typeId: null,
      imageCaptions: {
        "https://example.com/photo.jpg": "Family photo showing three people",
      },
      videoSummaries: {},
      audioTranscripts: {},
      audioSummaries: {},
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
    },
    multiMediaArtifact: {
      id: "test-artifact-002",
      title: "Wedding Memory",
      description: "Photos and video from wedding",
      collectionId: "test-collection-001",
      userId: "test-user-id-001",
      mediaUrls: [
        "https://example.com/photo1.jpg",
        "https://example.com/video.mp4",
        "https://example.com/photo2.jpg",
      ],
      thumbnailUrl: "https://example.com/photo1.jpg",
      slug: "wedding-memory-1704067200",
      yearAcquired: 2022,
      origin: "Personal",
      typeId: null,
      imageCaptions: {
        "https://example.com/photo1.jpg": "Bride and groom at altar",
        "https://example.com/photo2.jpg": "Reception dance",
      },
      videoSummaries: {
        "https://example.com/video.mp4": " ceremony and first dance",
      },
      audioTranscripts: {},
      audioSummaries: {},
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
    },
    audioArtifact: {
      id: "test-artifact-003",
      title: "Grandpa Interview",
      description: "Audio interview with grandfather",
      collectionId: "test-collection-002",
      userId: "test-user-id-001",
      mediaUrls: ["https://example.com/interview.mp3"],
      thumbnailUrl: null,
      slug: "grandpa-interview-1704067200",
      yearAcquired: null,
      origin: null,
      typeId: null,
      imageCaptions: {},
      videoSummaries: {},
      audioTranscripts: {
        "https://example.com/interview.mp3": "Transcript of grandfather talking about his life",
      },
      audioSummaries: {
        "https://example.com/interview.mp3":
          "Grandfather shares stories about his military service",
      },
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
    },
  },

  artifactTypes: {
    car: {
      id: "type-car",
      name: "Car Collectors",
      slug: "car-collectors",
      description: "For collecting cars and vehicle photos",
      iconName: "Car",
      displayOrder: 1,
      isActive: true,
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
    },
    watch: {
      id: "type-watch",
      name: "Watch Collectors",
      slug: "watch-collectors",
      description: "For collecting watches and timepieces",
      iconName: "Watch",
      displayOrder: 2,
      isActive: true,
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
    },
    general: {
      id: "type-general",
      name: "General / Other",
      slug: "general-other",
      description: "General artifacts",
      iconName: "Package",
      displayOrder: 0,
      isActive: true,
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
    },
  },

  forms: {
    validCreateArtifactInput: {
      title: "Test Artifact",
      description: "A test artifact for unit testing",
      collectionId: "test-collection-001",
      yearAcquired: 2020,
      origin: "Test Source",
      mediaUrls: ["https://example.com/image.jpg"],
      thumbnailUrl: "https://example.com/image.jpg",
      typeId: null,
      imageCaptions: {},
      videoSummaries: {},
      audioTranscripts: {},
    },
    invalidCreateArtifactInput: {
      title: "", // Invalid - empty title
      description: "Too long".repeat(500), // Invalid - too long
      collectionId: "invalid-uuid",
      mediaUrls: ["not-a-url"],
    },
  },

  cloudinary: {
    imageUrl:
      "https://res.cloudinary.com/test/image/upload/v1704067200/users/test-user/artifacts/2024/01/image_1704067200.jpg",
    videoUrl:
      "https://res.cloudinary.com/test/video/upload/v1704067200/users/test-user/artifacts/2024/01/video_1704067200.mp4",
    audioUrl:
      "https://res.cloudinary.com/test/video/upload/v1704067200/users/test-user/artifacts/audio/2024/01/audio_1704067200.mp3",
    invalidUrl: "https://example.com/image.jpg",
  },

  auth: {
    validLoginCredentials: {
      email: "testuser@example.com",
      password: "SecurePassword123!",
    },
    invalidLoginCredentials: {
      email: "testuser@example.com",
      password: "WrongPassword",
    },
    signupData: {
      email: "newuser@example.com",
      password: "SecurePassword123!",
      displayName: "New User",
    },
  },
}

export type Fixtures = typeof fixtures
