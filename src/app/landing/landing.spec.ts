import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { environment } from '../../environments/environment';
import { LandingPage } from './landing';

describe('LandingPage Turnstile', () => {
  let fixture: ComponentFixture<LandingPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LandingPage],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { isAuthenticated: () => false, login: vi.fn() } },
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
      { sitekey: environment.turnstile.siteKey },
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
});
