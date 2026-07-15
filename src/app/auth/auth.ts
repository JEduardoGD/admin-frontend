import { Component, inject } from '@angular/core';
import { JsonPipe } from '@angular/common';
import { AuthService } from './auth.service';

@Component({
  selector: 'app-auth',
  imports: [JsonPipe],
  templateUrl: './auth.html',
  styleUrl: './auth.css',
})
export class Auth {
  private readonly authService = inject(AuthService);

  readonly isAuthenticated = this.authService.isAuthenticated;
  readonly userData = this.authService.userData;

  login(): void {
    this.authService.login();
  }

  logout(): void {
    this.authService.logout();
  }
}
