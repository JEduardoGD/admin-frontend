import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { EMPTY, of, throwError } from 'rxjs';
import Swal from 'sweetalert2';
import { Imagen, ImagenService, TipoImagen } from '../register-imagen/imagen.service';
import { todayIso } from '../register-afiliacion/register-afiliacion';
import { Aficionado, AficionadoService } from './aficionado.service';
import { RegisterAficionado } from './register-aficionado';

vi.mock('sweetalert2', () => ({
  default: {
    fire: vi.fn(() => Promise.resolve({ isConfirmed: true })),
  },
}));

describe('RegisterAficionado', () => {
  let fixture: ComponentFixture<RegisterAficionado>;
  let aficionadoService: {
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
    findByIdPersona: ReturnType<typeof vi.fn>;
  };
  let imagenService: {
    listTipos: ReturnType<typeof vi.fn>;
    findByIdPersona: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    upload: ReturnType<typeof vi.fn>;
    getThumbnail: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };

  const tipos: TipoImagen[] = [
    {
      idTipoImagen: 3,
      tipo: 'CERTIFICADO',
      descripcion: 'Certificado de aptitud',
      fechaInicio: '',
      fechaFin: null,
    },
  ];

  const certificadoImage: Imagen = {
    idImagen: 9,
    idPersona: 42,
    uuid: 'cert.jpg',
    idTipoImagenDocumento: 3,
  };

  const existing: Aficionado = {
    idAficionado: 5,
    idPersona: 42,
    indicativo: 'XE1ABC',
    fechaInicio: '2026-01-10T00:00:00.000Z',
    fechaFin: '2027-01-10T00:00:00.000Z',
    idImagen: 9,
  };

  async function createComponent(
    idPersona = 42,
    overrides?: {
      aficionado?: Partial<typeof aficionadoService>;
      imagen?: Partial<typeof imagenService>;
    },
  ): Promise<void> {
    aficionadoService = {
      create: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(() => of(existing)),
      findByIdPersona: vi.fn(() => of([])),
      ...overrides?.aficionado,
    };
    imagenService = {
      listTipos: vi.fn(() => of(tipos)),
      findByIdPersona: vi.fn(() => of([])),
      findById: vi.fn(() => EMPTY),
      upload: vi.fn(),
      getThumbnail: vi.fn(() => EMPTY),
      create: vi.fn(),
      update: vi.fn(),
      ...overrides?.imagen,
    };

    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [RegisterAficionado],
      providers: [
        { provide: AficionadoService, useValue: aficionadoService },
        { provide: ImagenService, useValue: imagenService },
        { provide: Router, useValue: { navigate: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterAficionado);
    fixture.componentRef.setInput('idPersona', idPersona);
    await fixture.whenStable();
    fixture.detectChanges();
  }

  async function attachImage(filename = 'certificado.jpg'): Promise<void> {
    const file = new File(['img'], filename, { type: 'image/jpeg' });
    const fileInput = fixture.nativeElement.querySelector('#fileCertificado') as HTMLInputElement;
    Object.defineProperty(fileInput, 'files', { value: [file] });
    fileInput.dispatchEvent(new Event('change'));
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

  function setIndicativo(value = 'XE1ABC'): void {
    fixture.componentInstance.aficionadoForm.controls.indicativo.setValue(value);
  }

  beforeEach(() => {
    if (typeof URL.createObjectURL !== 'function') {
      URL.createObjectURL = () => 'blob:mock';
      URL.revokeObjectURL = () => {};
    }
  });

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
    expect(compiled.querySelector('#indicativo')).not.toBeNull();
    expect(compiled.querySelector('#fileCertificado')).not.toBeNull();
    expect(compiled.textContent).toContain('Esta persona aún no tiene aficionados.');
    expect(aficionadoService.findByIdPersona).toHaveBeenCalledWith(42);
    expect(imagenService.listTipos).toHaveBeenCalled();
  });

  it('requires the indicativo before saving', async () => {
    await createComponent(42, {
      aficionado: { create: vi.fn(() => of(existing)) },
    });

    submitForm();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(aficionadoService.create).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('El indicativo es obligatorio.');
  });

  it('rejects a fechaFin that is not after fechaInicio', async () => {
    await createComponent();

    const component = fixture.componentInstance;
    component.aficionadoForm.patchValue({ fechaInicio: '2026-09-02', fechaFin: '2026-09-02' });
    component.aficionadoForm.markAllAsTouched();
    fixture.detectChanges();

    expect(component.aficionadoForm.errors).toEqual({ fechaOrder: true });
    expect(fixture.nativeElement.textContent).toContain(
      'La fecha de inicio debe ser anterior a la fecha de fin.',
    );
  });

  it('creates an aficionado without any image when none is attached', async () => {
    const saved: Aficionado = { ...existing, idAficionado: 11, idImagen: null };
    await createComponent(42, {
      aficionado: {
        create: vi.fn(() => of(saved)),
        findByIdPersona: vi
          .fn()
          .mockReturnValueOnce(of([]))
          .mockReturnValueOnce(of([saved])),
      },
    });

    setIndicativo();
    submitForm();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(imagenService.create).not.toHaveBeenCalled();
    expect(aficionadoService.create).toHaveBeenCalledWith({
      idPersona: 42,
      indicativo: 'XE1ABC',
      fechaInicio: todayIso(),
      fechaFin: null,
      idImagen: null,
    });
    expect(fixture.nativeElement.textContent).toContain('Aficionado guardado correctamente.');
  });

  it('saves the CERTIFICADO image first and links its idImagen on create', async () => {
    const saved: Aficionado = { ...existing, idAficionado: 11, idImagen: 31 };
    await createComponent(42, {
      aficionado: {
        create: vi.fn(() => of(saved)),
      },
      imagen: {
        upload: vi.fn((file: File) =>
          of({ filename: file.name, uploadError: false, frontError: null }),
        ),
        create: vi.fn((imagen: Imagen) => of({ ...imagen, idImagen: 31 })),
      },
    });

    await attachImage('certificado.jpg');
    setIndicativo();
    submitForm();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(imagenService.create).toHaveBeenCalledWith({
      idPersona: 42,
      uuid: 'certificado.jpg',
      idTipoImagenDocumento: 3,
    });
    expect(aficionadoService.create).toHaveBeenCalledWith({
      idPersona: 42,
      indicativo: 'XE1ABC',
      fechaInicio: todayIso(),
      fechaFin: null,
      idImagen: 31,
    });
    expect(aficionadoService.update).not.toHaveBeenCalled();
  });

  it('loads an existing row for editing and updates it without rewriting the image', async () => {
    await createComponent(42, {
      aficionado: {
        findByIdPersona: vi.fn(() => of([existing])),
        update: vi.fn(() => of(existing)),
      },
      imagen: {
        findByIdPersona: vi.fn(() => of([certificadoImage])),
      },
    });

    editButton().click();
    fixture.detectChanges();

    const fechaInicio = fixture.nativeElement.querySelector('#fechaInicio') as HTMLInputElement;
    const fechaFin = fixture.nativeElement.querySelector('#fechaFin') as HTMLInputElement;
    const indicativo = fixture.nativeElement.querySelector('#indicativo') as HTMLInputElement;
    expect(indicativo.value).toBe('XE1ABC');
    expect(fechaInicio.value).toBe('2026-01-10');
    expect(fechaFin.value).toBe('2027-01-10');
    expect(fixture.nativeElement.textContent).toContain('Actualizar');
    expect(imagenService.getThumbnail).toHaveBeenCalledWith('cert.jpg');

    fixture.componentInstance.aficionadoForm.controls.fechaFin.setValue('2028-01-10');
    fixture.detectChanges();
    submitForm();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(imagenService.create).not.toHaveBeenCalled();
    expect(imagenService.update).not.toHaveBeenCalled();
    expect(aficionadoService.update).toHaveBeenCalledWith({
      idAficionado: 5,
      idPersona: 42,
      indicativo: 'XE1ABC',
      fechaInicio: '2026-01-10',
      fechaFin: '2028-01-10',
      idImagen: 9,
    });
    expect(aficionadoService.create).not.toHaveBeenCalled();
  });

  it('updates the existing image when replacing its file on an edited row', async () => {
    await createComponent(42, {
      aficionado: {
        findByIdPersona: vi.fn(() => of([existing])),
        update: vi.fn(() => of(existing)),
      },
      imagen: {
        findByIdPersona: vi.fn(() => of([certificadoImage])),
        upload: vi.fn((file: File) =>
          of({ filename: file.name, uploadError: false, frontError: null }),
        ),
        update: vi.fn((imagen: Imagen) => of(imagen)),
      },
    });

    editButton().click();
    fixture.detectChanges();

    await attachImage('nuevo.jpg');
    submitForm();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(imagenService.update).toHaveBeenCalledWith({
      idImagen: 9,
      idPersona: 42,
      uuid: 'nuevo.jpg',
      idTipoImagenDocumento: 3,
    });
    expect(imagenService.create).not.toHaveBeenCalled();
    expect(aficionadoService.update).toHaveBeenCalledWith({
      idAficionado: 5,
      idPersona: 42,
      indicativo: 'XE1ABC',
      fechaInicio: '2026-01-10',
      fechaFin: '2027-01-10',
      idImagen: 9,
    });
  });

  it('renders the summary table with ID, indicativo and dates', async () => {
    await createComponent(42, {
      aficionado: { findByIdPersona: vi.fn(() => of([existing])) },
    });

    const thead = fixture.nativeElement.querySelector('thead');
    expect(thead.textContent).toContain('ID');
    expect(thead.textContent).toContain('Indicativo');
    expect(thead.textContent).toContain('Inicio');
    expect(thead.textContent).toContain('Fin');
    expect(thead.textContent).toContain('Acciones');

    const cells = fixture.nativeElement.querySelectorAll('tbody td');
    expect(cells[0].textContent).toContain('5');
    expect(cells[1].textContent).toContain('XE1ABC');
    expect(cells[2].textContent).toContain('2026-01-10');
    expect(cells[3].textContent).toContain('2027-01-10');
  });

  it('confirms before deleting a row with the DELETE endpoint', async () => {
    await createComponent(42, {
      aficionado: {
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
    expect(aficionadoService.remove).toHaveBeenCalledWith(5);
    expect(aficionadoService.findByIdPersona).toHaveBeenCalledTimes(2);
  });

  it('does not delete when the confirmation is cancelled', async () => {
    vi.mocked(Swal.fire).mockResolvedValueOnce({
      isConfirmed: false,
      isDenied: false,
      isDismissed: true,
    } as Awaited<ReturnType<typeof Swal.fire>>);

    await createComponent(42, {
      aficionado: { findByIdPersona: vi.fn(() => of([existing])) },
    });

    deleteButton().click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(aficionadoService.remove).not.toHaveBeenCalled();
  });

  it('shows an error when aficionados cannot be loaded', async () => {
    await createComponent(42, {
      aficionado: { findByIdPersona: vi.fn(() => throwError(() => new Error('fail'))) },
    });

    expect(fixture.nativeElement.textContent).toContain('No se pudieron cargar los aficionados.');
  });

  it('shows an error when saving fails', async () => {
    await createComponent(42, {
      aficionado: { create: vi.fn(() => throwError(() => new Error('fail'))) },
    });

    setIndicativo();
    submitForm();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'No se pudo guardar el aficionado. Intenta de nuevo.',
    );
  });

  it('shows an error when the catalog lacks the CERTIFICADO type and an upload is attempted', async () => {
    await createComponent(42, {
      imagen: {
        listTipos: vi.fn(() =>
          of([{ idTipoImagen: 7, tipo: 'OTRO', descripcion: '', fechaInicio: '', fechaFin: null }]),
        ),
        upload: vi.fn((file: File) =>
          of({ filename: file.name, uploadError: false, frontError: null }),
        ),
      },
    });

    expect(fixture.nativeElement.textContent).toContain(
      'No se encontró el tipo de imagen CERTIFICADO en el catálogo.',
    );

    await attachImage('certificado.jpg');
    setIndicativo();
    submitForm();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(aficionadoService.create).not.toHaveBeenCalled();
  });
});
