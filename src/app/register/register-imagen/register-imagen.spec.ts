import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EMPTY, of, throwError } from 'rxjs';
import { ImagenService, TipoImagen } from './imagen.service';
import { RegisterImagen } from './register-imagen';

describe('RegisterImagen', () => {
  let fixture: ComponentFixture<RegisterImagen>;
  let imagenService: {
    listTipos: ReturnType<typeof vi.fn>;
    findByIdPersona: ReturnType<typeof vi.fn>;
    upload: ReturnType<typeof vi.fn>;
    getThumbnail: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };

  const tipos: TipoImagen[] = [
    {
      idTipoImagen: 2,
      tipo: 'INE',
      descripcion: 'Identificación',
      fechaInicio: '',
      fechaFin: null,
    },
    { idTipoImagen: 3, tipo: 'PAGO', descripcion: 'Comprobante', fechaInicio: '', fechaFin: null },
  ];

  async function createComponent(
    idPersona = 42,
    overrides?: Partial<typeof imagenService>,
  ): Promise<void> {
    imagenService = {
      listTipos: vi.fn(() => of(tipos)),
      findByIdPersona: vi.fn(() => of([])),
      upload: vi.fn(),
      getThumbnail: vi.fn(() => EMPTY),
      create: vi.fn(),
      update: vi.fn(),
      ...overrides,
    };

    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [RegisterImagen],
      providers: [{ provide: ImagenService, useValue: imagenService }],
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterImagen);
    fixture.componentRef.setInput('idPersona', idPersona);
    await fixture.whenStable();
    fixture.detectChanges();
  }

  afterEach(() => {
    fixture?.destroy();
  });

  it('shows the empty state when the persona has no images', async () => {
    await createComponent();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Esta persona aún no tiene imágenes.');
    expect(compiled.textContent).toContain('Agregar imagen');
    expect(imagenService.findByIdPersona).toHaveBeenCalledWith(42);
    expect(imagenService.listTipos).toHaveBeenCalled();
  });

  it('renders saved images with their types', async () => {
    await createComponent(42, {
      findByIdPersona: vi.fn(() =>
        of([{ idImagen: 9, idPersona: 42, uuid: 'abc.jpg', idTipoImagenDocumento: 2 }]),
      ),
    });

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).not.toContain('Esta persona aún no tiene imágenes.');
    expect(compiled.textContent).toContain('INE');
    expect(compiled.textContent).toContain('Reemplazar archivo');
    expect(compiled.textContent).not.toContain('Descartar');
    expect(imagenService.getThumbnail).toHaveBeenCalledWith('abc.jpg');
  });

  it('shows an error when images cannot be loaded', async () => {
    await createComponent(42, {
      findByIdPersona: vi.fn(() => throwError(() => new Error('fail'))),
    });

    expect(fixture.nativeElement.textContent).toContain('No se pudieron cargar las imágenes.');
  });

  it('creates an image after upload when the user selects a type', async () => {
    const file = new File(['img'], 'foto.jpg', { type: 'image/jpeg' });
    await createComponent(42, {
      upload: vi.fn(() => of({ filename: 'uuid.jpg', uploadError: false, frontError: null })),
      create: vi.fn(() =>
        of({ idImagen: 21, idPersona: 42, uuid: 'uuid.jpg', idTipoImagenDocumento: 2 }),
      ),
    });

    const fileInput = fixture.nativeElement.querySelector(
      'input[type="file"]:not([disabled])',
    ) as HTMLInputElement;
    Object.defineProperty(fileInput, 'files', { value: [file] });
    fileInput.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    fixture.detectChanges();

    const select = fixture.nativeElement.querySelector('select') as HTMLSelectElement;
    select.value = '2';
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(imagenService.create).toHaveBeenCalledWith({
      idPersona: 42,
      uuid: 'uuid.jpg',
      idTipoImagenDocumento: 2,
    });
    expect(fixture.nativeElement.textContent).toContain('Imagen guardada correctamente.');
    expect(fixture.nativeElement.textContent).not.toContain('Descartar');
  });

  it('updates immediately when replacing the file of a saved image', async () => {
    const file = new File(['img'], 'otra.jpg', { type: 'image/jpeg' });
    await createComponent(42, {
      findByIdPersona: vi.fn(() =>
        of([{ idImagen: 9, idPersona: 42, uuid: 'abc.jpg', idTipoImagenDocumento: 2 }]),
      ),
      upload: vi.fn(() => of({ filename: 'nuevo.jpg', uploadError: false, frontError: null })),
      update: vi.fn(() =>
        of({ idImagen: 9, idPersona: 42, uuid: 'nuevo.jpg', idTipoImagenDocumento: 2 }),
      ),
    });

    const replaceInput = fixture.nativeElement.querySelectorAll(
      'input[type="file"]',
    )[1] as HTMLInputElement;
    Object.defineProperty(replaceInput, 'files', { value: [file] });
    replaceInput.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(imagenService.update).toHaveBeenCalledWith({
      idImagen: 9,
      idPersona: 42,
      uuid: 'nuevo.jpg',
      idTipoImagenDocumento: 2,
    });
  });

  it('updates immediately when changing the type of a saved image', async () => {
    await createComponent(42, {
      findByIdPersona: vi.fn(() =>
        of([{ idImagen: 9, idPersona: 42, uuid: 'abc.jpg', idTipoImagenDocumento: 2 }]),
      ),
      update: vi.fn(() =>
        of({ idImagen: 9, idPersona: 42, uuid: 'abc.jpg', idTipoImagenDocumento: 3 }),
      ),
    });

    const select = fixture.nativeElement.querySelector('select') as HTMLSelectElement;
    select.value = '3';
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(imagenService.update).toHaveBeenCalledWith({
      idImagen: 9,
      idPersona: 42,
      uuid: 'abc.jpg',
      idTipoImagenDocumento: 3,
    });
    expect(imagenService.create).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Imagen guardada correctamente.');
    expect(fixture.nativeElement.textContent).not.toContain('Descartar');
  });

  it('discards an unsaved draft without calling create or update', async () => {
    const file = new File(['img'], 'foto.jpg', { type: 'image/jpeg' });
    await createComponent(42, {
      upload: vi.fn(() => of({ filename: 'uuid.jpg', uploadError: false, frontError: null })),
    });

    const fileInput = fixture.nativeElement.querySelector(
      'input[type="file"]:not([disabled])',
    ) as HTMLInputElement;
    Object.defineProperty(fileInput, 'files', { value: [file] });
    fileInput.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    fixture.detectChanges();

    const discard = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('button'),
    ).find((el) => el.textContent?.includes('Descartar')) as HTMLButtonElement;
    expect(discard).toBeTruthy();
    discard.click();
    fixture.detectChanges();

    expect(imagenService.create).not.toHaveBeenCalled();
    expect(imagenService.update).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Esta persona aún no tiene imágenes.');
    expect(fixture.nativeElement.textContent).not.toContain('Descartar');
  });

  it('shows an upload error and does not load a thumbnail or save', async () => {
    const file = new File(['img'], 'foto.jpg', { type: 'image/jpeg' });
    await createComponent(42, {
      upload: vi.fn(() =>
        of({ filename: null, uploadError: true, frontError: 'Archivo no válido' }),
      ),
    });

    const fileInput = fixture.nativeElement.querySelector(
      'input[type="file"]:not([disabled])',
    ) as HTMLInputElement;
    Object.defineProperty(fileInput, 'files', { value: [file] });
    fileInput.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Archivo no válido');
    expect(imagenService.getThumbnail).not.toHaveBeenCalled();
    expect(imagenService.create).not.toHaveBeenCalled();
    expect(imagenService.update).not.toHaveBeenCalled();
  });

  it('shows an error when image types cannot be loaded', async () => {
    await createComponent(42, {
      listTipos: vi.fn(() => throwError(() => new Error('fail'))),
    });

    expect(fixture.nativeElement.textContent).toContain(
      'No se pudieron cargar los tipos de imagen.',
    );
  });

  it('shows an error when creating an image fails', async () => {
    const file = new File(['img'], 'foto.jpg', { type: 'image/jpeg' });
    await createComponent(42, {
      upload: vi.fn(() => of({ filename: 'uuid.jpg', uploadError: false, frontError: null })),
      create: vi.fn(() => throwError(() => new Error('fail'))),
    });

    const fileInput = fixture.nativeElement.querySelector(
      'input[type="file"]:not([disabled])',
    ) as HTMLInputElement;
    Object.defineProperty(fileInput, 'files', { value: [file] });
    fileInput.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    fixture.detectChanges();

    const select = fixture.nativeElement.querySelector('select') as HTMLSelectElement;
    select.value = '2';
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(imagenService.create).toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain(
      'No se pudo guardar la imagen. Intenta de nuevo.',
    );
    expect(fixture.nativeElement.textContent).toContain('Descartar');
  });

  it('replaces a draft file without creating or updating the image', async () => {
    const first = new File(['img'], 'foto.jpg', { type: 'image/jpeg' });
    const second = new File(['img2'], 'otra.jpg', { type: 'image/jpeg' });
    await createComponent(42, {
      upload: vi
        .fn()
        .mockReturnValueOnce(of({ filename: 'uuid.jpg', uploadError: false, frontError: null }))
        .mockReturnValueOnce(of({ filename: 'otro.jpg', uploadError: false, frontError: null })),
    });

    const addInput = fixture.nativeElement.querySelector(
      'input[type="file"]:not([disabled])',
    ) as HTMLInputElement;
    Object.defineProperty(addInput, 'files', { value: [first] });
    addInput.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    fixture.detectChanges();

    const replaceInput = fixture.nativeElement.querySelectorAll(
      'input[type="file"]',
    )[1] as HTMLInputElement;
    Object.defineProperty(replaceInput, 'files', { value: [second] });
    replaceInput.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(imagenService.getThumbnail).toHaveBeenCalledWith('otro.jpg');
    expect(imagenService.create).not.toHaveBeenCalled();
    expect(imagenService.update).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Descartar');
  });
});
