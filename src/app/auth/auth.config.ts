import { provideAuth, withAppInitializerAuthCheck } from 'angular-auth-oidc-client';
import { environment } from '../../environments/environment';

export const authConfig = {
  authority: environment.auth.authority,
  redirectUrl: environment.auth.redirectUrl,
  clientId: environment.auth.clientId,
  scope: environment.auth.scope,
  responseType: 'code',
  silentRenew: true,
  useRefreshToken: true,
  renewTimeBeforeTokenExpiresInSeconds: 30,
  triggerRefreshWhenIdTokenExpired: false,
  secureRoutes: [environment.api.baseUrl],
};

export const authProviders = provideAuth({ config: authConfig }, withAppInitializerAuthCheck());
