import { Request } from 'express';

export interface IUser {
  _id: string;
  name: string;
  email: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

export interface IUserPayload {
  userId: string;
  email: string;
}

export interface IAuthRequest extends Request {
  user?: IUserPayload;
}

export interface ITokenPayload {
  userId: string;
  email: string;
}

export interface ILoginInput {
  email: string;
  password: string;
}

export interface ISignupInput {
  name: string;
  email: string;
  password: string;
}

export interface IAuthResponse {
  message: string;
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export interface IErrorResponse {
  message: string;
  errors?: any;
  stack?: string;
}
