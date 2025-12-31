export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthUser {
  commitment: string;
  accountId: string;
}

export interface LoginResponse {
  account: {
    id: string;
    commitment: string;
    createdAt: string;
  };
  accessToken: string;
  refreshToken: string;
}
