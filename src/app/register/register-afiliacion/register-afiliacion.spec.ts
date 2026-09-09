import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EMPTY, of, throwError } from 'rxjs';
import Swal from 'sweetalert2';
import { Imagen, ImagenService, TipoImagen } from '../register-imagen/imagen.service';
import { Afiliacion, AfiliacionService, Estado } from './afiliacion.service';
import { ImageSlot, plusYearsIso, RegisterAfiliacion, todayIso } from './register-afiliacion';

vi.mock('sweetalert2', () => ({
  default: {
    fire: vi.fn(() => Promise.resolve({ isConfirmed: true })),
  },
}));

describe('RegisterAfiliacion', () => {
  let fixture: ComponentFixture<RegisterAfiliacion>;
  let afiliacionService: {
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    findByIdPersona: ReturnType<typeof vi.fn>;
    listEstados: ReturnType<typeof vi.fn>;
  };
  let imagenService: {
    listTiposForAfiliacion: ReturnType<typeof vi.fn>;
    findByIdPersona: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    upload: ReturnType<typeof vi.fn>;
    getThumbnail: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };

  const tipos: TipoImagen[] = [
    { idTipoImagen: 5, tipo: 'PAGO', descripcion: 'Comprobante', fechaInicio: '', fechaFin: null },
    {
      idTipoImagen: 6,
      tipo: 'SOLICITUD',
      descripcion: 'Solicitud',
      fechaInicio: '',
      fechaFin: null,
    },
  ];

  const pagoImage: Imagen = {
    idImagen: 9,
    idPersona: 42,
    idAfiliacion: 9,
    uuid: 'abc.jpg',
    idTipoImagenDocumento: 5,
  };

  const solicitudImage: Imagen = {
    idImagen: 10,
    idPersona: 42,
    idAfiliacion: 9,
    uuid: 'def.jpg',
    idTipoImagenDocumento: 6,
  };

  const estados: Estado[] = [
    { idEstado: 1, abreviado: 'AGS', nombre: 'AGUASCALIENTES' },
    { idEstado: 3, abreviado: 'BCS', nombre: 'BAJA CALIFORNIA SUR' },
  ];

  const existing: Afiliacion = {
    idAfiliacion: 9,
    idPersona: 42,
    idEstado: 3,
    fechaInicio: '2026-01-10T00:00:00.000Z',
    fechaFin: '2027-01-10T00:00:00.000Z',
    vitalicia: false,
    deleted: false,
  };

  async function createComponent(
    idPersona = 42,
    overrides?: {
      afiliacion?: Partial<typeof afiliacionService>;
      imagen?: Partial<typeof imagenService>;
    },
  ): Promise<void> {
    afiliacionService = {
      create: vi.fn(),
      update: vi.fn(),
      findByIdPersona: vi.fn(() => of([])),
      listEstados: vi.fn(() => of(estados)),
      ...overrides?.afiliacion,
    };
    imagenService = {
      listTiposForAfiliacion: vi.fn(() => of(tipos)),
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
      imports: [RegisterAfiliacion],
      providers: [
        { provide: AfiliacionService, useValue: afiliacionService },
        { provide: ImagenService, useValue: imagenService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterAfiliacion);
    fixture.componentRef.setInput('idPersona', idPersona);
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function fileInputFor(slot: ImageSlot): HTMLInputElement {
    const id = slot === 'pago' ? 'filePago' : 'fileSolicitud';
    return fixture.nativeElement.querySelector(`#${id}`) as HTMLInputElement;
  }

  async function attachImage(slot: ImageSlot, filename = 'imagen.jpg'): Promise<void> {
    const file = new File(['img'], filename, { type: 'image/jpeg' });
    const fileInput = fileInputFor(slot);
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

  function submitForm(): void {
    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(
      new Event('submit'),
    );
  }

  function selectEstado(idEstado = 1): void {
    fixture.componentInstance.afiliacionForm.controls.idEstado.setValue(String(idEstado));
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
    const estadoSelect = compiled.querySelector('#idEstado') as HTMLSelectElement;
    expect(estadoSelect).not.toBeNull();
    expect(estadoSelect.tagName).toBe('SELECT');
    expect(estadoSelect.options.length).toBe(3);
    expect(estadoSelect.options[1].textContent).toContain('AGS - AGUASCALIENTES');
    expect(compiled.querySelector('#filePago')).not.toBeNull();
    expect(compiled.querySelector('#fileSolicitud')).not.toBeNull();
    expect(compiled.textContent).toContain('Imagen de pago');
    expect(compiled.textContent).toContain('Imagen de solicitud');
    expect(afiliacionService.findByIdPersona).toHaveBeenCalledWith(42);
    expect(imagenService.listTiposForAfiliacion).toHaveBeenCalled();
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

  it('formats epoch-millisecond dates returned by the API', async () => {
    await createComponent(42, {
      afiliacion: {
        findByIdPersona: vi.fn(() =>
          of([
            {
              idAfiliacion: 9,
              idPersona: 42,
              idEstado: 3,
              fechaInicio: Date.UTC(2026, 0, 10),
              fechaFin: Date.UTC(2027, 0, 10),
              vitalicia: false,
              deleted: false,
            },
          ]),
        ),
      },
    });

    const cells = fixture.nativeElement.querySelectorAll('tbody td');
    expect(cells[0].textContent).toContain('2026-01-10');
    expect(cells[1].textContent).toContain('2027-01-10');
    expect(cells[3].textContent).toContain('BCS');
  });

  it('does not save without both the pago and solicitud images', async () => {
    await createComponent(42, {
      afiliacion: { create: vi.fn(() => of(existing)) },
    });

    selectEstado();
    submitForm();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(imagenService.create).not.toHaveBeenCalled();
    expect(afiliacionService.create).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain(
      'Las imágenes de pago y de solicitud son obligatorias.',
    );
  });

  it('requires the solicitud image when only the pago image is attached', async () => {
    await createComponent(42, {
      imagen: {
        upload: vi.fn((file: File) =>
          of({ filename: file.name, uploadError: false, frontError: null }),
        ),
      },
    });

    await attachImage('pago', 'pago.jpg');
    selectEstado();
    submitForm();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(imagenService.create).not.toHaveBeenCalled();
    expect(afiliacionService.create).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('La imagen de solicitud es obligatoria.');
  });

  it('requires an estado before saving', async () => {
    await createComponent(42, {
      afiliacion: { create: vi.fn(() => of(existing)) },
      imagen: {
        upload: vi.fn((file: File) =>
          of({ filename: file.name, uploadError: false, frontError: null }),
        ),
      },
    });

    await attachImage('pago', 'pago.jpg');
    await attachImage('solicitud', 'solicitud.jpg');
    submitForm();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(afiliacionService.create).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('El estado es obligatorio.');
  });

  it('creates the afiliacion first and then both images carrying idAfiliacion', async () => {
    const saved: Afiliacion = {
      idAfiliacion: 21,
      idPersona: 42,
      idEstado: 1,
      fechaInicio: todayIso(),
      fechaFin: plusYearsIso(1),
      vitalicia: false,
      deleted: false,
    };
    await createComponent(42, {
      afiliacion: {
        create: vi.fn(() => of(saved)),
        findByIdPersona: vi
          .fn()
          .mockReturnValueOnce(of([]))
          .mockReturnValueOnce(of([saved])),
      },
      imagen: {
        upload: vi.fn((file: File) =>
          of({ filename: file.name, uploadError: false, frontError: null }),
        ),
        create: vi.fn((imagen: Imagen) =>
          of({ ...imagen, idImagen: imagen.idTipoImagenDocumento === 5 ? 31 : 32 }),
        ),
      },
    });

    await attachImage('pago', 'pago.jpg');
    await attachImage('solicitud', 'solicitud.jpg');
    selectEstado();
    submitForm();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(afiliacionService.create).toHaveBeenCalledWith({
      idPersona: 42,
      idEstado: 1,
      fechaInicio: todayIso(),
      fechaFin: plusYearsIso(1),
      vitalicia: false,
      deleted: false,
    });
    expect(imagenService.create).toHaveBeenCalledWith({
      idPersona: 42,
      idAfiliacion: 21,
      uuid: 'pago.jpg',
      idTipoImagenDocumento: 5,
    });
    expect(imagenService.create).toHaveBeenCalledWith({
      idPersona: 42,
      idAfiliacion: 21,
      uuid: 'solicitud.jpg',
      idTipoImagenDocumento: 6,
    });
    expect(afiliacionService.update).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Afiliación guardada correctamente.');
    expect(fixture.nativeElement.textContent).toContain('Editar');
  });

  it('sends null fechaFin when saving a vitalicia afiliacion', async () => {
    const saved: Afiliacion = {
      idAfiliacion: 3,
      idPersona: 42,
      idEstado: 1,
      fechaInicio: todayIso(),
      fechaFin: null,
      vitalicia: true,
      deleted: false,
    };
    await createComponent(42, {
      afiliacion: { create: vi.fn(() => of(saved)) },
      imagen: {
        upload: vi.fn((file: File) =>
          of({ filename: file.name, uploadError: false, frontError: null }),
        ),
        create: vi.fn((imagen: Imagen) =>
          of({ ...imagen, idImagen: imagen.idTipoImagenDocumento === 5 ? 31 : 32 }),
        ),
      },
    });

    (fixture.nativeElement.querySelector('#vitalicia') as HTMLInputElement).click();
    fixture.detectChanges();
    await attachImage('pago', 'pago.jpg');
    await attachImage('solicitud', 'solicitud.jpg');
    selectEstado();

    submitForm();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(afiliacionService.create).toHaveBeenCalledWith({
      idPersona: 42,
      idEstado: 1,
      fechaInicio: todayIso(),
      fechaFin: null,
      vitalicia: true,
      deleted: false,
    });
    expect(afiliacionService.update).not.toHaveBeenCalled();
  });

  it('loads both slot images from a row and updates it without rewriting the images', async () => {
    await createComponent(42, {
      afiliacion: {
        findByIdPersona: vi.fn(() => of([existing])),
        update: vi.fn(() => of({ ...existing, fechaFin: '2028-01-10T00:00:00.000Z' })),
      },
      imagen: {
        findByIdPersona: vi.fn(() => of([pagoImage, solicitudImage])),
      },
    });

    editButton().click();
    fixture.detectChanges();

    const fechaInicio = fixture.nativeElement.querySelector('#fechaInicio') as HTMLInputElement;
    const fechaFin = fixture.nativeElement.querySelector('#fechaFin') as HTMLInputElement;
    expect(fechaInicio.value).toBe('2026-01-10');
    expect(fechaFin.value).toBe('2027-01-10');
    expect(fixture.nativeElement.textContent).toContain('Actualizar');
    expect(imagenService.getThumbnail).toHaveBeenCalledWith('abc.jpg');
    expect(imagenService.getThumbnail).toHaveBeenCalledWith('def.jpg');

    fixture.componentInstance.afiliacionForm.controls.fechaFin.setValue('2028-01-10');
    fixture.detectChanges();

    submitForm();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(imagenService.create).not.toHaveBeenCalled();
    expect(imagenService.update).not.toHaveBeenCalled();
    expect(afiliacionService.update).toHaveBeenCalledWith({
      idAfiliacion: 9,
      idPersona: 42,
      idEstado: 3,
      fechaInicio: '2026-01-10',
      fechaFin: '2028-01-10',
      vitalicia: false,
      deleted: false,
    });
    expect(afiliacionService.create).not.toHaveBeenCalled();
  });

  it('updates only the existing pago image when replacing its file on an edited afiliacion', async () => {
    await createComponent(42, {
      afiliacion: {
        findByIdPersona: vi.fn(() => of([existing])),
        update: vi.fn(() => of(existing)),
      },
      imagen: {
        findByIdPersona: vi.fn(() => of([pagoImage, solicitudImage])),
        upload: vi.fn((file: File) =>
          of({ filename: file.name, uploadError: false, frontError: null }),
        ),
        update: vi.fn((imagen: Imagen) => of(imagen)),
      },
    });

    editButton().click();
    fixture.detectChanges();

    await attachImage('pago', 'nuevo.jpg');
    submitForm();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(imagenService.update).toHaveBeenCalledWith({
      idImagen: 9,
      idPersona: 42,
      idAfiliacion: 9,
      uuid: 'nuevo.jpg',
      idTipoImagenDocumento: 5,
    });
    expect(imagenService.create).not.toHaveBeenCalled();
    expect(afiliacionService.update).toHaveBeenCalledWith({
      idAfiliacion: 9,
      idPersona: 42,
      idEstado: 3,
      fechaInicio: '2026-01-10',
      fechaFin: '2027-01-10',
      vitalicia: false,
      deleted: false,
    });
  });

  it('loads the existing pago image and requires the missing solicitud image on edit', async () => {
    await createComponent(42, {
      afiliacion: {
        findByIdPersona: vi.fn(() => of([existing])),
        update: vi.fn(() => of(existing)),
      },
      imagen: {
        findByIdPersona: vi.fn(() => of([pagoImage])),
      },
    });

    editButton().click();
    fixture.detectChanges();

    const component = fixture.componentInstance;
    expect(component.images().pago.idImagen).toBe(9);
    expect(component.images().pago.uuid).toBe('abc.jpg');
    expect(component.images().solicitud.idImagen).toBeUndefined();
    expect(imagenService.getThumbnail).toHaveBeenCalledWith('abc.jpg');

    submitForm();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(afiliacionService.update).not.toHaveBeenCalled();
    expect(afiliacionService.create).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('La imagen de solicitud es obligatoria.');
  });

  it('renders a miniature for both slots in the table', async () => {
    await createComponent(42, {
      afiliacion: { findByIdPersona: vi.fn(() => of([existing])) },
      imagen: {
        findByIdPersona: vi.fn(() => of([pagoImage, solicitudImage])),
        getThumbnail: vi.fn(() => of(new Blob(['x'], { type: 'image/jpeg' }))),
      },
    });
    await fixture.whenStable();
    fixture.detectChanges();

    const thumbs = fixture.nativeElement.querySelectorAll('tbody img.imagen-thumb-sm');
    expect(thumbs).toHaveLength(2);
    expect(thumbs[0].getAttribute('alt')).toContain('pago');
    expect(thumbs[1].getAttribute('alt')).toContain('solicitud');
    expect(imagenService.getThumbnail).toHaveBeenCalledWith('abc.jpg');
    expect(imagenService.getThumbnail).toHaveBeenCalledWith('def.jpg');
  });

  it('falls back to findById to resolve a table thumbnail when the image has no uuid', async () => {
    const pagoSinUuid: Imagen = {
      idImagen: 9,
      idPersona: 42,
      idAfiliacion: 9,
      uuid: '',
      idTipoImagenDocumento: 5,
    };
    await createComponent(42, {
      afiliacion: { findByIdPersona: vi.fn(() => of([existing])) },
      imagen: {
        findByIdPersona: vi.fn(() => of([pagoSinUuid])),
        findById: vi.fn(() => of({ ...pagoSinUuid, uuid: 'abc.jpg' })),
        getThumbnail: vi.fn(() => of(new Blob(['x'], { type: 'image/jpeg' }))),
      },
    });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(imagenService.findById).toHaveBeenCalledWith(9);
    expect(imagenService.getThumbnail).toHaveBeenCalledWith('abc.jpg');
    const thumbs = fixture.nativeElement.querySelectorAll('tbody img.imagen-thumb-sm');
    expect(thumbs).toHaveLength(1);
  });

  it('renders deleted rows with a distinct background and without edit or delete actions', async () => {
    await createComponent(42, {
      afiliacion: {
        findByIdPersona: vi.fn(() =>
          of([
            existing,
            {
              idAfiliacion: 10,
              idPersona: 42,
              idEstado: 1,
              fechaInicio: '2024-01-01T00:00:00.000Z',
              fechaFin: null,
              vitalicia: true,
              deleted: true,
            },
          ]),
        ),
      },
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
      afiliacion: {
        findByIdPersona: vi.fn(() => of([existing])),
        update: vi.fn(() => of({ ...existing, deleted: true })),
      },
    });

    const remove = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('button'),
    ).find((el) => el.textContent?.includes('Eliminar')) as HTMLButtonElement;
    remove.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(Swal.fire).toHaveBeenCalled();
    expect(afiliacionService.update).toHaveBeenCalledWith({
      idAfiliacion: 9,
      idPersona: 42,
      idEstado: 3,
      fechaInicio: '2026-01-10',
      fechaFin: '2027-01-10',
      vitalicia: false,
      deleted: true,
    });
    expect(afiliacionService.create).not.toHaveBeenCalled();
  });

  it('does not delete when the confirmation is cancelled', async () => {
    vi.mocked(Swal.fire).mockResolvedValueOnce({
      isConfirmed: false,
      isDenied: false,
      isDismissed: true,
    } as Awaited<ReturnType<typeof Swal.fire>>);

    await createComponent(42, {
      afiliacion: { findByIdPersona: vi.fn(() => of([existing])) },
    });

    const remove = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('button'),
    ).find((el) => el.textContent?.includes('Eliminar')) as HTMLButtonElement;
    remove.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(afiliacionService.update).not.toHaveBeenCalled();
    expect(afiliacionService.create).not.toHaveBeenCalled();
  });

  it('shows an error when afiliaciones cannot be loaded', async () => {
    await createComponent(42, {
      afiliacion: { findByIdPersona: vi.fn(() => throwError(() => new Error('fail'))) },
    });

    expect(fixture.nativeElement.textContent).toContain('No se pudieron cargar las afiliaciones.');
  });

  it('shows an error when image types cannot be loaded', async () => {
    await createComponent(42, {
      imagen: { listTiposForAfiliacion: vi.fn(() => throwError(() => new Error('fail'))) },
    });

    expect(fixture.nativeElement.textContent).toContain(
      'No se pudieron cargar los tipos de imagen.',
    );
  });

  it('shows an error when the catalog lacks PAGO and SOLICITUD types', async () => {
    await createComponent(42, {
      imagen: {
        listTiposForAfiliacion: vi.fn(() =>
          of([{ idTipoImagen: 7, tipo: 'OTRO', descripcion: '', fechaInicio: '', fechaFin: null }]),
        ),
      },
    });

    expect(fixture.nativeElement.textContent).toContain(
      'No se encontraron los tipos de imagen PAGO y SOLICITUD en el catálogo.',
    );
  });

  it('shows an error when saving fails', async () => {
    await createComponent(42, {
      afiliacion: { create: vi.fn(() => throwError(() => new Error('fail'))) },
      imagen: {
        upload: vi.fn((file: File) =>
          of({ filename: file.name, uploadError: false, frontError: null }),
        ),
      },
    });

    await attachImage('pago', 'pago.jpg');
    await attachImage('solicitud', 'solicitud.jpg');
    selectEstado();
    submitForm();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'No se pudo guardar la afiliación. Intenta de nuevo.',
    );
  });
});
