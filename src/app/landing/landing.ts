import {
  Component,
  ElementRef,
  OnDestroy,
  afterRenderEffect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { RouterLink } from '@angular/router';
import { environment } from '../../environments/environment';

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          'expired-callback': () => void;
          'error-callback': () => void;
        },
      ) => string;
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
export class LandingPage implements OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly turnstileContainer = viewChild<ElementRef<HTMLDivElement>>('turnstileContainer');
  private script?: HTMLScriptElement;
  private widgetId?: string;
  readonly isAuthenticated = this.authService.isAuthenticated;
  readonly turnstilePassed = signal(false);

  constructor() {
    afterRenderEffect(() => {
      if (this.isAuthenticated()) {
        this.removeWidget();
      } else if (environment.turnstile.siteKey && this.turnstileContainer()) {
        this.loadWidget();
      }
    });
  }

  private loadWidget(): void {
    if (this.widgetId) return;
    if (window.turnstile) {
      this.renderWidget();
      return;
    }

    if (this.script) return;
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
    this.removeWidget();
  }

  private removeWidget(): void {
    this.script?.removeEventListener('load', this.renderWidget);
    this.script = undefined;
    if (this.widgetId) window.turnstile?.remove(this.widgetId);
    this.widgetId = undefined;
    this.turnstilePassed.set(false);
  }

  private readonly renderWidget = (): void => {
    const container = this.turnstileContainer();
    if (window.turnstile && container && !this.isAuthenticated() && !this.widgetId) {
      this.widgetId = window.turnstile.render(container.nativeElement, {
        sitekey: environment.turnstile.siteKey,
        callback: (token) => this.turnstilePassed.set(!!token),
        'expired-callback': () => this.turnstilePassed.set(false),
        'error-callback': () => this.turnstilePassed.set(false),
      });
    }
  };

  login(): void {
    if (this.turnstilePassed()) this.authService.login();
  }
}
