import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { environment } from '../../environments/environment';
import { LandingPage } from './landing';

describe('LandingPage Turnstile', () => {
  let fixture: ComponentFixture<LandingPage>;
  let login: ReturnType<typeof vi.fn>;
  let isAuthenticated: ReturnType<typeof signal<boolean>>;

  beforeEach(async () => {
    login = vi.fn();
    isAuthenticated = signal(false);
    await TestBed.configureTestingModule({
      imports: [LandingPage],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { isAuthenticated, login } },
      ],
    }).compileComponents();
  });

  afterEach(() => {
    fixture?.destroy();
    document.querySelector('#cloudflare-turnstile-script')?.remove();
    delete window.turnstile;
  });

  it('renders after the script loads and removes the widget when leaving the page', () => {
    fixture = TestBed.createComponent(LandingPage);
    fixture.detectChanges();

    const script = document.querySelector<HTMLScriptElement>('#cloudflare-turnstile-script');
    expect(script?.src).toBe(
      'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit',
    );

    const render = vi.fn().mockReturnValue('widget-id');
    const remove = vi.fn();
    window.turnstile = { render, remove };
    script?.dispatchEvent(new Event('load'));

    expect(render).toHaveBeenCalledWith(
      (fixture.nativeElement as HTMLElement).querySelector('div.d-flex.justify-content-center'),
      expect.objectContaining({ sitekey: environment.turnstile.siteKey }),
    );

    fixture.destroy();
    expect(remove).toHaveBeenCalledWith('widget-id');
  });

  it('renders again when returning to the landing page after the script has loaded', () => {
    window.turnstile = { render: vi.fn().mockReturnValue('widget-id'), remove: vi.fn() };

    fixture = TestBed.createComponent(LandingPage);
    fixture.detectChanges();
    expect(window.turnstile.render).toHaveBeenCalledTimes(1);

    fixture.destroy();
    fixture = TestBed.createComponent(LandingPage);
    fixture.detectChanges();
    expect(window.turnstile.render).toHaveBeenCalledTimes(2);
  });

  it('enables login only after a successful challenge and disables it on expiration or error', () => {
    const render = vi.fn().mockReturnValue('widget-id');
    window.turnstile = { render, remove: vi.fn() };
    fixture = TestBed.createComponent(LandingPage);
    fixture.detectChanges();

    const button = (fixture.nativeElement as HTMLElement).querySelector('button')!;
    const options = render.mock.calls[0][1] as Parameters<
      NonNullable<Window['turnstile']>['render']
    >[1];

    expect(button.disabled).toBe(true);
    fixture.componentInstance.login();
    expect(login).not.toHaveBeenCalled();

    options.callback('valid-token');
    fixture.detectChanges();
    expect(button.disabled).toBe(false);
    button.click();
    expect(login).toHaveBeenCalledOnce();

    options['expired-callback']();
    fixture.detectChanges();
    expect(button.disabled).toBe(true);
    fixture.componentInstance.login();
    expect(login).toHaveBeenCalledOnce();

    options.callback('new-token');
    options['error-callback']();
    fixture.detectChanges();
    expect(button.disabled).toBe(true);
  });

  it('shows Turnstile only to logged-out visitors and removes it when they log in', () => {
    isAuthenticated.set(true);
    const render = vi.fn().mockReturnValue('widget-id');
    const remove = vi.fn();
    window.turnstile = { render, remove };
    fixture = TestBed.createComponent(LandingPage);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('a')?.textContent).toContain(
      'Go to Admin Panel',
    );
    expect((fixture.nativeElement as HTMLElement).querySelector('div.d-flex')).toBeNull();
    expect(document.querySelector('#cloudflare-turnstile-script')).toBeNull();
    expect(render).not.toHaveBeenCalled();

    isAuthenticated.set(false);
    fixture.detectChanges();
    expect(render).toHaveBeenCalledOnce();
    const options = render.mock.calls[0][1] as Parameters<
      NonNullable<Window['turnstile']>['render']
    >[1];
    options.callback('valid-token');
    expect(fixture.componentInstance.turnstilePassed()).toBe(true);

    isAuthenticated.set(true);
    fixture.detectChanges();
    expect(remove).toHaveBeenCalledWith('widget-id');
    expect((fixture.nativeElement as HTMLElement).querySelector('div.d-flex')).toBeNull();
    expect(fixture.componentInstance.turnstilePassed()).toBe(false);
  });

  it('does not render a pending widget after the visitor logs in', () => {
    fixture = TestBed.createComponent(LandingPage);
    fixture.detectChanges();
    const script = document.querySelector<HTMLScriptElement>('#cloudflare-turnstile-script');

    isAuthenticated.set(true);
    fixture.detectChanges();
    const render = vi.fn().mockReturnValue('widget-id');
    window.turnstile = { render, remove: vi.fn() };
    script?.dispatchEvent(new Event('load'));

    expect(render).not.toHaveBeenCalled();
  });
});
