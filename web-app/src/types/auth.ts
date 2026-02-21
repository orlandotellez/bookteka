export interface LoginMethod {
  username?: string;
  email: string;
  password: string;
}

export interface RegisterMethod {
  name: string;
  last_name: string;
  age: number;
  email: string;
  username: string;
  password: string;
}
