import { Component, inject } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-landing',
  imports: [RouterLink],
  templateUrl: './landing.html',
  styleUrl: './landing.css',
})
export class LandingPage {
  private readonly authService = inject(AuthService);
  readonly isAuthenticated = this.authService.isAuthenticated;

  login(): void {
    this.authService.login();
  }
}
