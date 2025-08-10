import { Request } from 'express';

export interface IUser {
  _id: string;
  name: string;
  username: string;
  email: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

export interface IUserPayload {
  userId: string;
  email: string;
  username: string;
}

export interface IAuthRequest extends Request {
  user?: IUserPayload;
}

export interface ITokenPayload {
  userId: string;
  email: string;
  username: string;
}

export interface ILoginInput {
  emailOrUsername: string;
  password: string;
}

export interface ISignupInput {
  name: string;
  username: string;
  email: string;
  password: string;
}

export interface IAuthResponse {
  message: string;
  token: string;
  user: {
    id: string;
    name: string;
    username: string;
    email: string;
    role: string;
  };
}

export interface IErrorResponse {
  message: string;
  errors?: any;
  stack?: string;
}
