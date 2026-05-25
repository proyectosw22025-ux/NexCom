import { gql } from "@apollo/client";

export const REGISTER = gql`
  mutation Register($input: RegisterInput!) {
    register(input: $input) {
      accessToken
      refreshToken
      usuario {
        id
        email
        rol
        verificado
        perfilVendedor { id nombreNegocio }
        perfilComprador { id nombreCompleto }
      }
    }
  }
`;

export const LOGIN = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      accessToken
      refreshToken
      usuario {
        id
        email
        rol
        verificado
        perfilVendedor { id nombreNegocio }
        perfilComprador { id nombreCompleto }
      }
    }
  }
`;

export const LOGOUT = gql`
  mutation Logout($refreshToken: String) {
    logout(refreshToken: $refreshToken)
  }
`;

export const REFRESH_TOKEN = gql`
  mutation RefreshToken($token: String!) {
    refreshToken(token: $token) {
      accessToken
      refreshToken
      usuario {
        id
        email
        rol
        verificado
      }
    }
  }
`;

export const VERIFY_EMAIL = gql`
  mutation VerifyEmail($token: String!) {
    verifyEmail(token: $token)
  }
`;

export const REQUEST_PASSWORD_RESET = gql`
  mutation RequestPasswordReset($email: String!) {
    requestPasswordReset(email: $email)
  }
`;

export const RESET_PASSWORD = gql`
  mutation ResetPassword($token: String!, $nuevaPassword: String!) {
    resetPassword(token: $token, nuevaPassword: $nuevaPassword)
  }
`;

export const UPDATE_PASSWORD = gql`
  mutation UpdatePassword($passwordActual: String!, $nuevaPassword: String!) {
    updatePassword(passwordActual: $passwordActual, nuevaPassword: $nuevaPassword)
  }
`;
