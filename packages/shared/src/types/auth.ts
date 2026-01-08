export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthUser {
  commitment: string;
  userId: string;
}

export interface LoginResponse {
  user: {
    id: string;
    commitment: string;
    createdAt: string;
  };
  accessToken: string;
  refreshToken: string;
}
