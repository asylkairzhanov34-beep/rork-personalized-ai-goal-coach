export interface User {
  id: string;
  email: string;
  name?: string;
  provider: 'apple' | 'google';
  createdAt: Date;
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}
