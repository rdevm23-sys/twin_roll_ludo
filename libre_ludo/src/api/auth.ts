function getApiBaseUrl(): string {
  if (import.meta.env.DEV) {
    const { protocol, host } = window.location;
    return `${protocol}//${host}`;
  }
  return `${window.location.protocol}//${window.location.host}`;
}

export interface LoginResponse {
  token: string;
  player: {
    id: number;
    username: string;
    avatar?: string;
  };
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
}

const getAuthHeader = (): Record<string, string> => {
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export async function login(credentials: LoginRequest): Promise<LoginResponse> {
  const response = await fetch(`${getApiBaseUrl()}/api/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    } as HeadersInit,
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Login failed');
  }

  return response.json();
}

export async function register(credentials: RegisterRequest): Promise<LoginResponse> {
  const response = await fetch(`${getApiBaseUrl()}/api/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Registration failed');
  }

  return response.json();
}

export async function getProfile() {
  const response = await fetch(`${getApiBaseUrl()}/api/profile`, {
    headers: getAuthHeader() as HeadersInit,
  });

  if (!response.ok) {
    throw new Error('Failed to fetch profile');
  }

  return response.json();
}

export async function getLeaderboard() {
  const response = await fetch(`${getApiBaseUrl()}/api/leaderboard`);

  if (!response.ok) {
    throw new Error('Failed to fetch leaderboard');
  }

  return response.json();
}
