// src/core/auth/types.ts

export interface User {
  id:         number;
  username:   string;
  display_name: string;
  created_at: string;
}

export interface Session {
  user: User;
  token: string; // simple UUID guardado en localStorage
}