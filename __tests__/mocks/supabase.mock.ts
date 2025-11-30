import { vi } from "vitest"

export const mockSupabaseClient = {
  auth: {
    getUser: vi.fn(),
    signUp: vi.fn(),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    resetPasswordForEmail: vi.fn(),
    updateUser: vi.fn(),
    onAuthStateChange: vi.fn(),
  },
  from: vi.fn(),
  storage: {
    from: vi.fn(),
  },
  rpc: vi.fn(),
  channel: vi.fn(),
}

export const mockSupabaseServer = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
}

/**
 * Mock helper for database queries
 */
export const mockDatabaseQuery = (data: any[], error: any = null) => {
  return {
    data,
    error,
    count: data.length,
    status: error ? 400 : 200,
  }
}

/**
 * Mock helper for single row operations
 */
export const mockSingleRowOperation = (data: any = null, error: any = null) => {
  return {
    data,
    error,
    status: error ? 400 : 201,
  }
}

/**
 * Type for table mock operations
 */
interface TableMock {
  select: ReturnType<typeof vi.fn>
  insert: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
  delete: ReturnType<typeof vi.fn>
  eq: ReturnType<typeof vi.fn>
  in: ReturnType<typeof vi.fn>
  single: ReturnType<typeof vi.fn>
  order: ReturnType<typeof vi.fn>
  limit: ReturnType<typeof vi.fn>
  range: ReturnType<typeof vi.fn>
  [key: string]: ReturnType<typeof vi.fn>
}

/**
 * Mock Supabase client interface
 */
interface MockSupabaseClient {
  auth: {
    getUser: ReturnType<typeof vi.fn>
    signUp: ReturnType<typeof vi.fn>
    signInWithPassword: ReturnType<typeof vi.fn>
    signOut: ReturnType<typeof vi.fn>
    resetPasswordForEmail: ReturnType<typeof vi.fn>
    updateUser: ReturnType<typeof vi.fn>
    onAuthStateChange: ReturnType<typeof vi.fn>
  }
  from: ReturnType<typeof vi.fn>
  storage: {
    from: ReturnType<typeof vi.fn>
  }
  rpc: ReturnType<typeof vi.fn>
  channel: ReturnType<typeof vi.fn>
  // Direct table access for convenience (deprecated pattern, use .from() instead)
  artifacts: TableMock
  collections: TableMock
  [key: string]: unknown
}

/**
 * Create a custom mock Supabase client with specific table mocks
 * Returns `any` to allow flexible mocking without strict Supabase type requirements
 */
export const createMockSupabaseClient = (tables?: Record<string, Partial<TableMock>>): any => {
  const createDefaultTableMock = (): TableMock => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
  })

  const defaultTables: Record<string, TableMock> = {
    artifacts: createDefaultTableMock(),
    collections: createDefaultTableMock(),
  }

  // Merge custom table mocks with defaults
  const mergedTables: Record<string, TableMock> = {}
  for (const [key, value] of Object.entries(defaultTables)) {
    mergedTables[key] = { ...value, ...(tables?.[key] || {}) } as TableMock
  }
  // Add any additional tables from the tables parameter
  if (tables) {
    for (const [key, value] of Object.entries(tables)) {
      if (!mergedTables[key]) {
        mergedTables[key] = { ...createDefaultTableMock(), ...value } as TableMock
      }
    }
  }

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "test-user-id", email: "test@example.com" } },
        error: null,
      }),
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updateUser: vi.fn(),
      onAuthStateChange: vi.fn(),
    },
    from: vi.fn(
      (table: string) => mergedTables[table] || mergedTables.artifacts
    ),
    storage: {
      from: vi.fn().mockReturnValue({
        remove: vi.fn(),
        list: vi.fn(),
        download: vi.fn(),
        upload: vi.fn(),
      }),
    },
    rpc: vi.fn(),
    channel: vi.fn(),
    // Also spread table mocks directly on client for backwards compatibility
    // This allows tests to use supabase.artifacts.insert() directly
    ...mergedTables,
  } as MockSupabaseClient
}

/**
 * Setup common Supabase mock patterns
 */
export const setupSupabaseMocks = () => {
  // Mock select queries
  mockSupabaseClient.from.mockReturnValue({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockResolvedValue(mockDatabaseQuery([])),
  })

  // Mock auth state
  mockSupabaseClient.auth.getUser.mockResolvedValue({
    data: {
      user: {
        id: "test-user-id",
        email: "test@example.com",
        user_metadata: { displayName: "Test User" },
      },
    },
    error: null,
  })

  return mockSupabaseClient
}
