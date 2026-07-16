import { Routes } from '@angular/router';
import { authGuard } from './auth/auth.guard';
import { LandingPage } from './landing/landing';
import { AdminLayout } from './admin-layout/admin-layout';
import { ControlPanel } from './control-panel/control-panel';
import { Register } from './register/register';

export const routes: Routes = [
  { path: '', component: LandingPage },
  {
    path: 'admin',
    component: AdminLayout,
    canActivate: [authGuard],
    children: [
      { path: '', component: ControlPanel },
      { path: 'register', component: Register },
    ],
  },
];
