import { provideAuth, withAppInitializerAuthCheck } from 'angular-auth-oidc-client';

export const authConfig = {
  authority: 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_KXyVp3ZAW',
  redirectUrl: 'http://localhost:4200',
  clientId: '6imkctvt738uoe2ffil8hldrl3',
  scope: 'phone openid email',
  responseType: 'code',
  silentRenew: true,
  useRefreshToken: true,
  renewTimeBeforeTokenExpiresInSeconds: 30,
  triggerRefreshWhenIdTokenExpired: false,
};

export const authProviders = provideAuth({ config: authConfig }, withAppInitializerAuthCheck());
