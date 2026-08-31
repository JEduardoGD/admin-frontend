import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { Register } from './register';

describe('Register', () => {
  let fixture: ComponentFixture<Register>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Register],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { queryParams: of({}) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Register);
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('renders the Imágenes tab and blocks it until a persona is saved', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Imágenes');

    const imagenTab = Array.from(compiled.querySelectorAll('.nav-link')).find((el) =>
      el.textContent?.includes('Imágenes'),
    ) as HTMLAnchorElement;
    imagenTab.click();
    fixture.detectChanges();

    expect(compiled.textContent).toContain('Primero debes guardar los datos de la persona.');
    expect(compiled.querySelector('app-register-imagen')).toBeNull();
  });

  it('shows the images child once a persona id exists', async () => {
    fixture.componentInstance.idPersona.set(12);
    fixture.componentInstance.selectTab('imagen');
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-register-imagen')).not.toBeNull();
    expect(compiled.textContent).not.toContain('Primero debes guardar los datos de la persona.');
  });
});
