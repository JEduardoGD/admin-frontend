import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import Swal from 'sweetalert2';
import { Estado } from '../register-afiliacion/afiliacion.service';
import { AfiliacionService } from '../register-afiliacion/afiliacion.service';
import { todayIso } from '../register-afiliacion/register-afiliacion';
import { Aspirante, AspiranteService } from './aspirante.service';
import { RegisterAspirante } from './register-aspirante';

vi.mock('sweetalert2', () => ({
  default: {
    fire: vi.fn(() => Promise.resolve({ isConfirmed: true })),
  },
}));

describe('RegisterAspirante', () => {
  let fixture: ComponentFixture<RegisterAspirante>;
  let aspiranteService: {
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
    findByIdPersona: ReturnType<typeof vi.fn>;
  };
  let afiliacionService: {
    listEstados: ReturnType<typeof vi.fn>;
  };

  const estados: Estado[] = [
    { idEstado: 3, abreviado: 'ASPI', nombre: 'Aspirante' },
    { idEstado: 5, abreviado: 'ACTI', nombre: 'Activo' },
  ];

  const existing: Aspirante = {
    idAspirante: 5,
    idPersona: 42,
    idEstado: 3,
    contadorEstado: 2,
    fechaInicio: '2026-01-10T00:00:00.000Z',
    fechaFin: '2027-01-10T00:00:00.000Z',
  };

  async function createComponent(
    idPersona = 42,
    overrides?: {
      aspirante?: Partial<typeof aspiranteService>;
      afiliacion?: Partial<typeof afiliacionService>;
    },
  ): Promise<void> {
    aspiranteService = {
      create: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(() => of(existing)),
      findByIdPersona: vi.fn(() => of([])),
      ...overrides?.aspirante,
    };
    afiliacionService = {
      listEstados: vi.fn(() => of(estados)),
      ...overrides?.afiliacion,
    };

    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [RegisterAspirante],
      providers: [
        { provide: AspiranteService, useValue: aspiranteService },
        { provide: AfiliacionService, useValue: afiliacionService },
        { provide: Router, useValue: { navigate: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterAspirante);
    fixture.componentRef.setInput('idPersona', idPersona);
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function editButton(): HTMLButtonElement {
    return Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find(
      (el) => el.textContent?.includes('Editar'),
    ) as HTMLButtonElement;
  }

  function deleteButton(): HTMLButtonElement {
    return Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find(
      (el) => el.textContent?.includes('Eliminar'),
    ) as HTMLButtonElement;
  }

  function submitForm(): void {
    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(
      new Event('submit'),
    );
  }

  function setEstado(idEstado = 3): void {
    fixture.componentInstance.aspiranteForm.controls.idEstado.setValue(String(idEstado));
  }

  afterEach(() => {
    fixture?.destroy();
  });

  it('initializes fechaInicio with today, fechaFin empty and loads the list', async () => {
    await createComponent();

    const compiled = fixture.nativeElement as HTMLElement;
    const fechaInicio = compiled.querySelector('#fechaInicio') as HTMLInputElement;
    const fechaFin = compiled.querySelector('#fechaFin') as HTMLInputElement;

    expect(fechaInicio.value).toBe(todayIso());
    expect(fechaFin.value).toBe('');
    expect(compiled.querySelector('#idEstado')).not.toBeNull();
    expect(compiled.textContent).toContain('ASPI - Aspirante');
    expect(compiled.textContent).toContain('Esta persona aún no tiene aspirantes.');
    expect(aspiranteService.findByIdPersona).toHaveBeenCalledWith(42);
    expect(afiliacionService.listEstados).toHaveBeenCalled();
  });

  it('requires the estado before saving', async () => {
    await createComponent(42, {
      aspirante: { create: vi.fn(() => of(existing)) },
    });

    submitForm();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(aspiranteService.create).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('El estado es obligatorio.');
  });

  it('rejects a fechaFin that is not after fechaInicio', async () => {
    await createComponent();

    const component = fixture.componentInstance;
    component.aspiranteForm.patchValue({ fechaInicio: '2026-09-02', fechaFin: '2026-09-02' });
    component.aspiranteForm.markAllAsTouched();
    fixture.detectChanges();

    expect(component.aspiranteForm.errors).toEqual({ fechaOrder: true });
    expect(fixture.nativeElement.textContent).toContain(
      'La fecha de inicio debe ser anterior a la fecha de fin.',
    );
  });

  it('creates an aspirante with POST', async () => {
    const saved: Aspirante = { ...existing, idAspirante: 11 };
    await createComponent(42, {
      aspirante: {
        create: vi.fn(() => of(saved)),
        findByIdPersona: vi
          .fn()
          .mockReturnValueOnce(of([]))
          .mockReturnValueOnce(of([saved])),
      },
    });

    setEstado();
    submitForm();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(aspiranteService.create).toHaveBeenCalledWith({
      idPersona: 42,
      idEstado: 3,
      contadorEstado: null,
      fechaInicio: todayIso(),
      fechaFin: null,
    });
    expect(aspiranteService.update).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Aspirante guardado correctamente.');
  });

  it('loads an existing row for editing and updates it preserving contadorEstado', async () => {
    await createComponent(42, {
      aspirante: {
        findByIdPersona: vi.fn(() => of([existing])),
        update: vi.fn(() => of(existing)),
      },
    });

    editButton().click();
    fixture.detectChanges();

    const fechaInicio = fixture.nativeElement.querySelector('#fechaInicio') as HTMLInputElement;
    const fechaFin = fixture.nativeElement.querySelector('#fechaFin') as HTMLInputElement;
    const idEstado = fixture.nativeElement.querySelector('#idEstado') as HTMLSelectElement;
    expect(idEstado.value).toBe('3');
    expect(fechaInicio.value).toBe('2026-01-10');
    expect(fechaFin.value).toBe('2027-01-10');
    expect(fixture.nativeElement.textContent).toContain('Actualizar');

    fixture.componentInstance.aspiranteForm.controls.fechaFin.setValue('2028-01-10');
    fixture.detectChanges();
    submitForm();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(aspiranteService.update).toHaveBeenCalledWith({
      idAspirante: 5,
      idPersona: 42,
      idEstado: 3,
      contadorEstado: 2,
      fechaInicio: '2026-01-10',
      fechaFin: '2028-01-10',
    });
    expect(aspiranteService.create).not.toHaveBeenCalled();
  });

  it('renders the summary table with ID, estado, contador and dates', async () => {
    await createComponent(42, {
      aspirante: { findByIdPersona: vi.fn(() => of([existing])) },
    });

    const thead = fixture.nativeElement.querySelector('thead');
    expect(thead.textContent).toContain('ID');
    expect(thead.textContent).toContain('Estado');
    expect(thead.textContent).toContain('Contador');
    expect(thead.textContent).toContain('Inicio');
    expect(thead.textContent).toContain('Fin');
    expect(thead.textContent).toContain('Acciones');

    const cells = fixture.nativeElement.querySelectorAll('tbody td');
    expect(cells[0].textContent).toContain('5');
    expect(cells[1].textContent).toContain('ASPI');
    expect(cells[2].textContent).toContain('2');
    expect(cells[3].textContent).toContain('2026-01-10');
    expect(cells[4].textContent).toContain('2027-01-10');
  });

  it('confirms before deleting a row with the DELETE endpoint', async () => {
    await createComponent(42, {
      aspirante: {
        findByIdPersona: vi
          .fn()
          .mockReturnValueOnce(of([existing]))
          .mockReturnValueOnce(of([])),
        remove: vi.fn(() => of(existing)),
      },
    });

    deleteButton().click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(Swal.fire).toHaveBeenCalled();
    expect(aspiranteService.remove).toHaveBeenCalledWith(5);
    expect(aspiranteService.findByIdPersona).toHaveBeenCalledTimes(2);
  });

  it('does not delete when the confirmation is cancelled', async () => {
    vi.mocked(Swal.fire).mockResolvedValueOnce({
      isConfirmed: false,
      isDenied: false,
      isDismissed: true,
    } as Awaited<ReturnType<typeof Swal.fire>>);

    await createComponent(42, {
      aspirante: { findByIdPersona: vi.fn(() => of([existing])) },
    });

    deleteButton().click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(aspiranteService.remove).not.toHaveBeenCalled();
  });

  it('shows an error when aspirantes cannot be loaded', async () => {
    await createComponent(42, {
      aspirante: { findByIdPersona: vi.fn(() => throwError(() => new Error('fail'))) },
    });

    expect(fixture.nativeElement.textContent).toContain('No se pudieron cargar los aspirantes.');
  });

  it('shows an error when saving fails', async () => {
    await createComponent(42, {
      aspirante: { create: vi.fn(() => throwError(() => new Error('fail'))) },
    });

    setEstado();
    submitForm();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'No se pudo guardar el aspirante. Intenta de nuevo.',
    );
  });
});
