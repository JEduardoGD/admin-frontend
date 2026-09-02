import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import Swal from 'sweetalert2';
import { Afiliacion, AfiliacionService } from './afiliacion.service';
import { plusYearsIso, RegisterAfiliacion, todayIso } from './register-afiliacion';

vi.mock('sweetalert2', () => ({
  default: {
    fire: vi.fn(() => Promise.resolve({ isConfirmed: true })),
  },
}));

describe('RegisterAfiliacion', () => {
  let fixture: ComponentFixture<RegisterAfiliacion>;
  let afiliacionService: {
    save: ReturnType<typeof vi.fn>;
    findByIdPersona: ReturnType<typeof vi.fn>;
  };

  const existing: Afiliacion = {
    idAfiliacion: 9,
    idPersona: 42,
    fechaInicio: '2026-01-10',
    fechaFin: '2027-01-10',
    vitalicia: false,
    deleted: false,
  };

  async function createComponent(
    idPersona = 42,
    overrides?: Partial<typeof afiliacionService>,
  ): Promise<void> {
    afiliacionService = {
      save: vi.fn(),
      findByIdPersona: vi.fn(() => of([])),
      ...overrides,
    };

    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [RegisterAfiliacion],
      providers: [{ provide: AfiliacionService, useValue: afiliacionService }],
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterAfiliacion);
    fixture.componentRef.setInput('idPersona', idPersona);
    await fixture.whenStable();
    fixture.detectChanges();
  }

  afterEach(() => {
    fixture?.destroy();
  });

  it('initializes fechaInicio with today, fechaFin with today plus one year, and vitalicia unchecked', async () => {
    await createComponent();

    const compiled = fixture.nativeElement as HTMLElement;
    const fechaInicio = compiled.querySelector('#fechaInicio') as HTMLInputElement;
    const fechaFin = compiled.querySelector('#fechaFin') as HTMLInputElement;
    const vitalicia = compiled.querySelector('#vitalicia') as HTMLInputElement;

    expect(fechaInicio.value).toBe(todayIso());
    expect(fechaFin.value).toBe(plusYearsIso(1));
    expect(fechaFin.disabled).toBe(false);
    expect(vitalicia.checked).toBe(false);
    expect(compiled.textContent).toContain('Esta persona aún no tiene afiliaciones.');
    expect(afiliacionService.findByIdPersona).toHaveBeenCalledWith(42);
  });

  it('clears and disables fechaFin when vitalicia is checked, and restores today plus one year when unchecked', async () => {
    await createComponent();

    const vitalicia = fixture.nativeElement.querySelector('#vitalicia') as HTMLInputElement;
    vitalicia.click();
    fixture.detectChanges();

    let fechaFin = fixture.nativeElement.querySelector('#fechaFin') as HTMLInputElement;
    expect(vitalicia.checked).toBe(true);
    expect(fechaFin.value).toBe('');
    expect(fechaFin.disabled).toBe(true);

    vitalicia.click();
    fixture.detectChanges();

    fechaFin = fixture.nativeElement.querySelector('#fechaFin') as HTMLInputElement;
    expect(vitalicia.checked).toBe(false);
    expect(fechaFin.value).toBe(plusYearsIso(1));
    expect(fechaFin.disabled).toBe(false);
  });

  it('checks vitalicia and disables fechaFin when the user clears fechaFin', async () => {
    await createComponent();

    const component = fixture.componentInstance;
    component.afiliacionForm.controls.fechaFin.setValue('');
    fixture.detectChanges();

    const fechaFin = fixture.nativeElement.querySelector('#fechaFin') as HTMLInputElement;
    const vitalicia = fixture.nativeElement.querySelector('#vitalicia') as HTMLInputElement;
    expect(vitalicia.checked).toBe(true);
    expect(fechaFin.value).toBe('');
    expect(fechaFin.disabled).toBe(true);
  });

  it('rejects a fechaFin that is not after fechaInicio', async () => {
    await createComponent();

    const component = fixture.componentInstance;
    component.afiliacionForm.patchValue({
      fechaInicio: '2026-09-02',
      fechaFin: '2026-09-02',
      vitalicia: false,
    });
    component.afiliacionForm.markAllAsTouched();
    fixture.detectChanges();

    expect(component.afiliacionForm.errors).toEqual({ fechaOrder: true });
    expect(fixture.nativeElement.textContent).toContain(
      'La fecha de inicio debe ser anterior a la fecha de fin.',
    );
  });

  it('creates an afiliacion and reloads the table', async () => {
    const saved: Afiliacion = {
      idAfiliacion: 21,
      idPersona: 42,
      fechaInicio: todayIso(),
      fechaFin: plusYearsIso(1),
      vitalicia: false,
      deleted: false,
    };
    await createComponent(42, {
      save: vi.fn(() => of(saved)),
      findByIdPersona: vi
        .fn()
        .mockReturnValueOnce(of([]))
        .mockReturnValueOnce(of([saved])),
    });

    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(afiliacionService.save).toHaveBeenCalledWith({
      idPersona: 42,
      fechaInicio: todayIso(),
      fechaFin: plusYearsIso(1),
      vitalicia: false,
      deleted: false,
    });
    expect(fixture.nativeElement.textContent).toContain('Afiliación guardada correctamente.');
    expect(fixture.nativeElement.textContent).toContain(todayIso());
    expect(fixture.nativeElement.textContent).toContain(plusYearsIso(1));
    expect(fixture.nativeElement.textContent).toContain('Editar');
  });

  it('sends null fechaFin when saving a vitalicia afiliacion', async () => {
    await createComponent(42, {
      save: vi.fn(() =>
        of({
          idAfiliacion: 3,
          idPersona: 42,
          fechaInicio: todayIso(),
          fechaFin: null,
          vitalicia: true,
          deleted: false,
        }),
      ),
    });

    (fixture.nativeElement.querySelector('#vitalicia') as HTMLInputElement).click();
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(
      new Event('submit'),
    );
    await fixture.whenStable();
    fixture.detectChanges();

    expect(afiliacionService.save).toHaveBeenCalledWith({
      idPersona: 42,
      fechaInicio: todayIso(),
      fechaFin: null,
      vitalicia: true,
      deleted: false,
    });
  });

  it('loads a row into the form and updates it with idAfiliacion', async () => {
    await createComponent(42, {
      findByIdPersona: vi.fn(() => of([existing])),
      save: vi.fn(() => of({ ...existing, fechaFin: '2028-01-10' })),
    });

    const edit = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find(
      (el) => el.textContent?.includes('Editar'),
    ) as HTMLButtonElement;
    edit.click();
    fixture.detectChanges();

    const fechaInicio = fixture.nativeElement.querySelector('#fechaInicio') as HTMLInputElement;
    const fechaFin = fixture.nativeElement.querySelector('#fechaFin') as HTMLInputElement;
    expect(fechaInicio.value).toBe('2026-01-10');
    expect(fechaFin.value).toBe('2027-01-10');
    expect(fixture.nativeElement.textContent).toContain('Actualizar');

    fixture.componentInstance.afiliacionForm.controls.fechaFin.setValue('2028-01-10');
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(
      new Event('submit'),
    );
    await fixture.whenStable();
    fixture.detectChanges();

    expect(afiliacionService.save).toHaveBeenCalledWith({
      idAfiliacion: 9,
      idPersona: 42,
      fechaInicio: '2026-01-10',
      fechaFin: '2028-01-10',
      vitalicia: false,
      deleted: false,
    });
  });

  it('renders deleted rows with a distinct background and without edit or delete actions', async () => {
    await createComponent(42, {
      findByIdPersona: vi.fn(() =>
        of([
          existing,
          {
            idAfiliacion: 10,
            idPersona: 42,
            fechaInicio: '2024-01-01',
            fechaFin: null,
            vitalicia: true,
            deleted: true,
          },
        ]),
      ),
    });

    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(2);
    expect(rows[1].classList.contains('afiliacion-row-deleted')).toBe(true);
    expect(rows[0].textContent).toContain('Editar');
    expect(rows[0].textContent).toContain('Eliminar');
    expect(rows[1].textContent).not.toContain('Editar');
    expect(rows[1].textContent).not.toContain('Eliminar');
  });

  it('confirms before logically deleting a row', async () => {
    await createComponent(42, {
      findByIdPersona: vi.fn(() => of([existing])),
      save: vi.fn(() => of({ ...existing, deleted: true })),
    });

    const remove = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('button'),
    ).find((el) => el.textContent?.includes('Eliminar')) as HTMLButtonElement;
    remove.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(Swal.fire).toHaveBeenCalled();
    expect(afiliacionService.save).toHaveBeenCalledWith({
      idAfiliacion: 9,
      idPersona: 42,
      fechaInicio: '2026-01-10',
      fechaFin: '2027-01-10',
      vitalicia: false,
      deleted: true,
    });
  });

  it('does not delete when the confirmation is cancelled', async () => {
    vi.mocked(Swal.fire).mockResolvedValueOnce({
      isConfirmed: false,
      isDenied: false,
      isDismissed: true,
    } as Awaited<ReturnType<typeof Swal.fire>>);

    await createComponent(42, {
      findByIdPersona: vi.fn(() => of([existing])),
    });

    const remove = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('button'),
    ).find((el) => el.textContent?.includes('Eliminar')) as HTMLButtonElement;
    remove.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(afiliacionService.save).not.toHaveBeenCalled();
  });

  it('shows an error when afiliaciones cannot be loaded', async () => {
    await createComponent(42, {
      findByIdPersona: vi.fn(() => throwError(() => new Error('fail'))),
    });

    expect(fixture.nativeElement.textContent).toContain('No se pudieron cargar las afiliaciones.');
  });

  it('shows an error when saving fails', async () => {
    await createComponent(42, {
      save: vi.fn(() => throwError(() => new Error('fail'))),
    });

    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(
      new Event('submit'),
    );
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'No se pudo guardar la afiliación. Intenta de nuevo.',
    );
  });
});
