import { provideAuth, withAppInitializerAuthCheck } from 'angular-auth-oidc-client';

export const authConfig = {
  authority: 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_of9rJ6VYd',
  redirectUrl: 'https://d84l1y8p4kdic.cloudfront.net',
  postLogoutRedirectUri: 'https://d84l1y8p4kdic.cloudfront.net',
  clientId: '7uf659clndbe7111acqb105u7v',
  scope: 'email openid phone',
  responseType: 'code',
  silentRenew: true,
  useRefreshToken: true,
  renewTimeBeforeTokenExpiresInSeconds: 30,
  triggerRefreshWhenIdTokenExpired: false,
};

export const authProviders = provideAuth({ config: authConfig }, withAppInitializerAuthCheck());
