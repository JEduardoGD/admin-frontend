import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import Swal from 'sweetalert2';
import { DatoContacto, DatoContactoService, TipoDatoContacto } from './dato-contacto.service';
import { RegisterDatoContacto } from './register-dato-contacto';

vi.mock('sweetalert2', () => ({
  default: {
    fire: vi.fn(() => Promise.resolve({ isConfirmed: true })),
  },
}));

describe('RegisterDatoContacto', () => {
  let fixture: ComponentFixture<RegisterDatoContacto>;
  let service: {
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
    findByIdPersona: ReturnType<typeof vi.fn>;
    listTipos: ReturnType<typeof vi.fn>;
  };

  const tipos: TipoDatoContacto[] = [
    { idTipoDatoContacto: 1, tipoContacto: 'EMAIL', descripcion: 'Correo electronico' },
    { idTipoDatoContacto: 2, tipoContacto: 'MOVIL', descripcion: 'Telefono Movil' },
    { idTipoDatoContacto: 3, tipoContacto: 'FIJO', descripcion: 'Telefono Fijo' },
  ];

  const existing: DatoContacto = {
    idDatoContacto: 9,
    idPersona: 42,
    idTipoDatoContacto: 1,
    dato: 'persona@example.com',
    inicio: '2026-01-10',
    fin: null,
  };

  async function createComponent(
    overrides?: Partial<typeof service>,
    idPersona = 42,
  ): Promise<void> {
    service = {
      create: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
      findByIdPersona: vi.fn(() => of([])),
      listTipos: vi.fn(() => of(tipos)),
      ...overrides,
    };

    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [RegisterDatoContacto],
      providers: [
        { provide: DatoContactoService, useValue: service },
        { provide: Router, useValue: { navigate: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterDatoContacto);
    fixture.componentRef.setInput('idPersona', idPersona);
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function submitForm(): void {
    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(
      new Event('submit'),
    );
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

  function fillForm(idTipoDatoContacto: number, dato: string): void {
    fixture.componentInstance.datoForm.patchValue({
      idTipoDatoContacto: String(idTipoDatoContacto),
      dato,
    });
  }

  afterEach(() => {
    fixture?.destroy();
  });

  it('renders the tipo select and the dato input, and loads the catalog', async () => {
    await createComponent();

    const compiled = fixture.nativeElement as HTMLElement;
    const tipoSelect = compiled.querySelector('#idTipoDatoContacto') as HTMLSelectElement;
    expect(tipoSelect.tagName).toBe('SELECT');
    expect(tipoSelect.options.length).toBe(4);
    expect(tipoSelect.options[1].textContent).toContain('EMAIL - Correo electronico');
    expect(compiled.querySelector('#dato')).not.toBeNull();
    expect(compiled.textContent).toContain('Esta persona aún no tiene datos de contacto.');
    expect(service.listTipos).toHaveBeenCalled();
    expect(service.findByIdPersona).toHaveBeenCalledWith(42);
  });

  it('requires tipo and dato before saving', async () => {
    await createComponent({ create: vi.fn(() => of(existing)) });

    submitForm();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(service.create).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('El tipo de dato es obligatorio.');
    expect(fixture.nativeElement.textContent).toContain('El dato es obligatorio.');
  });

  it('validates EMAIL dato format', async () => {
    await createComponent({ create: vi.fn(() => of(existing)) });

    fillForm(1, 'no-es-un-correo');
    fixture.componentInstance.datoForm.markAllAsTouched();
    fixture.detectChanges();

    expect(service.create).not.toHaveBeenCalled();
    submitForm();
    expect(fixture.nativeElement.textContent).toContain('Introduce un correo electrónico válido.');
  });

  it('validates MOVIL and FIJO dato formats', async () => {
    await createComponent({ create: vi.fn(() => of(existing)) });

    fillForm(2, '12345');
    fixture.componentInstance.datoForm.markAllAsTouched();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('El teléfono móvil debe tener 10 dígitos.');

    fillForm(3, 'abc');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(
      'El teléfono fijo debe tener 7 u 10 dígitos.',
    );

    expect(service.create).not.toHaveBeenCalled();
  });

  it('creates a dato contacto with POST payload without inicio/fin', async () => {
    const saved: DatoContacto = {
      idDatoContacto: 21,
      idPersona: 42,
      idTipoDatoContacto: 2,
      dato: '5544332211',
    };
    await createComponent({
      create: vi.fn(() => of(saved)),
      findByIdPersona: vi
        .fn()
        .mockReturnValueOnce(of([]))
        .mockReturnValueOnce(of([saved])),
    });

    fillForm(2, '5544332211');
    submitForm();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(service.create).toHaveBeenCalledWith({
      idPersona: 42,
      idTipoDatoContacto: 2,
      dato: '5544332211',
    });
    expect(service.update).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Dato de contacto guardado correctamente.');
    expect(fixture.nativeElement.textContent).toContain('5544332211');
  });

  it('loads a row into the form and updates it with PUT', async () => {
    await createComponent({
      findByIdPersona: vi.fn(() => of([existing])),
      update: vi.fn(() => of({ ...existing, dato: 'nuevo@example.com' })),
    });

    editButton().click();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Actualizar');

    fixture.componentInstance.datoForm.controls.dato.setValue('nuevo@example.com');
    submitForm();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(service.update).toHaveBeenCalledWith({
      idDatoContacto: 9,
      idPersona: 42,
      idTipoDatoContacto: 1,
      dato: 'nuevo@example.com',
    });
    expect(service.create).not.toHaveBeenCalled();
  });

  it('filters out rows with a filled fin date (considered deleted)', async () => {
    await createComponent({
      findByIdPersona: vi.fn(() =>
        of([
          existing,
          {
            idDatoContacto: 10,
            idPersona: 42,
            idTipoDatoContacto: 2,
            dato: '5511223344',
            inicio: '2025-01-01',
            fin: '2026-01-01',
          },
        ]),
      ),
    });

    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(1);
    expect(rows[0].textContent).toContain('persona@example.com');
  });

  it('confirms before deleting a row via the delete endpoint', async () => {
    await createComponent({
      findByIdPersona: vi.fn(() => of([existing])),
      remove: vi.fn(() => of(null)),
    });

    deleteButton().click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(Swal.fire).toHaveBeenCalled();
    expect(service.remove).toHaveBeenCalledWith(9);
  });

  it('does not delete when the confirmation is cancelled', async () => {
    vi.mocked(Swal.fire).mockResolvedValueOnce({
      isConfirmed: false,
      isDenied: false,
      isDismissed: true,
    } as Awaited<ReturnType<typeof Swal.fire>>);

    await createComponent({ findByIdPersona: vi.fn(() => of([existing])) });

    deleteButton().click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(service.remove).not.toHaveBeenCalled();
  });

  it('shows an error when datos cannot be loaded', async () => {
    await createComponent({
      findByIdPersona: vi.fn(() => throwError(() => new Error('fail'))),
    });

    expect(fixture.nativeElement.textContent).toContain(
      'No se pudieron cargar los datos de contacto.',
    );
  });

  it('shows an error when tipos cannot be loaded', async () => {
    await createComponent({
      listTipos: vi.fn(() => throwError(() => new Error('fail'))),
    });

    expect(fixture.nativeElement.textContent).toContain(
      'No se pudieron cargar los tipos de dato de contacto.',
    );
  });

  it('shows a SweetAlert with the server message when creating fails with HTTP 500', async () => {
    const serverMessage = 'El registro no se puede modificar luego de 5 dias';
    await createComponent({
      create: vi.fn(() =>
        throwError(
          () =>
            new HttpErrorResponse({
              status: 500,
              statusText: 'Internal Server Error',
              error: serverMessage,
            }),
        ),
      ),
    });

    fillForm(1, 'persona@example.com');
    submitForm();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(Swal.fire).toHaveBeenCalledWith(
      expect.objectContaining({ icon: 'error', text: serverMessage }),
    );
  });
});
