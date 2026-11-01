// In-memory stand-in for the Supabase client (the only external boundary of auth/profile code).
// Registered globally in jest.setup.ts as the `@/lib/supabase` module; reset before every test.
type AuthEvent =
  'INITIAL_SESSION' | 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED' | 'USER_UPDATED';
type Listener = (event: AuthEvent, session: FakeSession | null) => void;

export type FakeSession = {
  access_token: string;
  user: { id: string; email: string; email_confirmed_at: string | null };
};

type Result = { data: unknown; error: unknown };

const state = {
  session: null as FakeSession | null,
  tables: {} as Record<string, Record<string, unknown>[]>,
  listeners: new Set<Listener>(),
};

function queryBuilder(table: string) {
  const filters: [string, unknown][] = [];
  const rows = () =>
    (state.tables[table] ?? []).filter((row) =>
      filters.every(([key, value]) => row[key] === value),
    );
  const builder = {
    select: () => builder,
    eq: (key: string, value: unknown) => {
      filters.push([key, value]);
      return builder;
    },
    maybeSingle: async (): Promise<Result> => ({ data: rows()[0] ?? null, error: null }),
  };
  return builder;
}

export const fakeSupabase = {
  auth: {
    getSession: jest.fn(async () => ({ data: { session: state.session }, error: null })),
    onAuthStateChange: jest.fn((listener: Listener) => {
      state.listeners.add(listener);
      return { data: { subscription: { unsubscribe: () => state.listeners.delete(listener) } } };
    }),
    signUp: jest.fn(async (): Promise<Result> => ({
      data: { user: { id: 'new' }, session: null },
      error: null,
    })),
    signInWithPassword: jest.fn(async (): Promise<Result> => ({
      data: { session: state.session },
      error: null,
    })),
    signOut: jest.fn(async () => {
      setFakeSession(null, 'SIGNED_OUT');
      return { error: null };
    }),
    resend: jest.fn(async (): Promise<Result> => ({ data: {}, error: null })),
    resetPasswordForEmail: jest.fn(async (): Promise<Result> => ({ data: {}, error: null })),
    updateUser: jest.fn(async (): Promise<Result> => ({ data: {}, error: null })),
    exchangeCodeForSession: jest.fn(async (): Promise<Result> => ({ data: {}, error: null })),
    startAutoRefresh: jest.fn(),
    stopAutoRefresh: jest.fn(),
  },
  from: jest.fn((table: string) => queryBuilder(table)),
  rpc: jest.fn(async (_name: string, _args?: unknown): Promise<Result> => ({
    data: null,
    error: null,
  })),
};

export function setFakeSession(session: FakeSession | null, event: AuthEvent = 'SIGNED_IN'): void {
  state.session = session;
  state.listeners.forEach((listener) => listener(event, session));
}

export function setFakeTable(table: string, rows: Record<string, unknown>[]): void {
  state.tables[table] = rows;
}

export function fakeUserSession(overrides: Partial<FakeSession['user']> = {}): FakeSession {
  return {
    access_token: 'token',
    user: {
      id: 'user-1',
      email: 'lince@example.com',
      email_confirmed_at: '2026-11-01T10:00:00Z',
      ...overrides,
    },
  };
}

export function fakeProfileRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'user-1',
    handle: 'lince.rosso',
    handle_changed_at: null,
    birth_date: '2000-05-10',
    gender: 'female',
    locale: 'it',
    location_opt_in: false,
    contacts_opt_in: false,
    is_creator: false,
    deleted_at: null,
    ...overrides,
  };
}

export function resetFakeSupabase(): void {
  state.session = null;
  state.tables = {};
  state.listeners.clear();
  jest.clearAllMocks();
}
