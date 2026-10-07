import { AfterViewInit, Component, ElementRef, OnDestroy, inject, viewChild } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { RouterLink } from '@angular/router';
import { environment } from '../../environments/environment';

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: { sitekey: string }) => string;
      remove: (widgetId: string) => void;
    };
  }
}

@Component({
  selector: 'app-landing',
  imports: [RouterLink],
  templateUrl: './landing.html',
  styleUrl: './landing.css',
})
export class LandingPage implements AfterViewInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly turnstileContainer =
    viewChild.required<ElementRef<HTMLDivElement>>('turnstileContainer');
  private script?: HTMLScriptElement;
  private widgetId?: string;
  readonly isAuthenticated = this.authService.isAuthenticated;

  ngAfterViewInit(): void {
    if (!environment.turnstile.siteKey) return;

    if (window.turnstile) {
      this.renderWidget();
      return;
    }

    this.script =
      document.querySelector<HTMLScriptElement>('#cloudflare-turnstile-script') ?? undefined;
    if (!this.script) {
      this.script = document.createElement('script');
      this.script.id = 'cloudflare-turnstile-script';
      this.script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      this.script.async = true;
      this.script.addEventListener('load', this.renderWidget);
      document.head.append(this.script);
    } else {
      this.script.addEventListener('load', this.renderWidget);
    }
  }

  ngOnDestroy(): void {
    this.script?.removeEventListener('load', this.renderWidget);
    if (this.widgetId) window.turnstile?.remove(this.widgetId);
  }

  private readonly renderWidget = (): void => {
    if (window.turnstile && !this.widgetId) {
      this.widgetId = window.turnstile.render(this.turnstileContainer().nativeElement, {
        sitekey: environment.turnstile.siteKey,
      });
    }
  };

  login(): void {
    this.authService.login();
  }
}
