import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { ErrorHandlerService } from '../../core/error-handler.service';
import { Imagen, ImagenService, TipoImagen, UploadResult } from './imagen.service';

describe('ImagenService', () => {
  let service: ImagenService;
  let api: {
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
    postForm: ReturnType<typeof vi.fn>;
    getBlob: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    api = {
      get: vi.fn(),
      post: vi.fn(),
      postForm: vi.fn(),
      getBlob: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        ImagenService,
        { provide: ApiService, useValue: api },
        { provide: ErrorHandlerService, useValue: { handleUnauthorized: vi.fn() } },
      ],
    });

    service = TestBed.inject(ImagenService);
  });

  it('uploads a file as multipart field file', () => {
    const file = new File(['img'], 'foto.jpg', { type: 'image/jpeg' });
    const result: UploadResult = { filename: 'abc.jpg', uploadError: false, frontError: null };
    api.postForm.mockReturnValue(of(result));

    let received: UploadResult | undefined;
    service.upload(file).subscribe((value) => {
      received = value;
    });

    expect(api.postForm).toHaveBeenCalledTimes(1);
    const [path, formData] = api.postForm.mock.calls[0] as [string, FormData];
    expect(path).toBe('file');
    expect(formData.get('file')).toBe(file);
    expect(received).toEqual(result);
  });

  it('loads a thumbnail by the uuid part of the stored filename', () => {
    const blob = new Blob(['thumb'], { type: 'image/jpeg' });
    api.getBlob.mockReturnValue(of(blob));

    let received: Blob | undefined;
    service.getThumbnail('eeecc3cc-9358-4328-91d5-aab2853d9536.jpeg,.jpg').subscribe((value) => {
      received = value;
    });

    expect(api.getBlob).toHaveBeenCalledWith(
      'imagen/thumbnail/eeecc3cc-9358-4328-91d5-aab2853d9536',
    );
    expect(received).toBe(blob);
  });

  it('loads a thumbnail when the stored uuid has no extra extension', () => {
    const blob = new Blob(['thumb'], { type: 'image/jpeg' });
    api.getBlob.mockReturnValue(of(blob));

    service.getThumbnail('eeecc3cc-9358-4328-91d5-aab2853d9536').subscribe();

    expect(api.getBlob).toHaveBeenCalledWith(
      'imagen/thumbnail/eeecc3cc-9358-4328-91d5-aab2853d9536',
    );
  });

  it('lists persona image types from the static catalog', () => {
    const tipos: TipoImagen[] = [
      {
        idTipoImagen: 1,
        tipo: 'INE',
        descripcion: 'Identificación',
        fechaInicio: '2026-08-23',
        fechaFin: null,
      },
    ];
    api.get.mockReturnValue(of(tipos));

    let received: TipoImagen[] | undefined;
    service.listTipos().subscribe((value) => {
      received = value;
    });

    expect(api.get).toHaveBeenCalledWith('static_catalog/tipo_imagen/for_persona');
    expect(received).toEqual(tipos);
  });

  it('lists afiliacion image types from the static catalog', () => {
    const tipos: TipoImagen[] = [
      {
        idTipoImagen: 5,
        tipo: 'PAGO',
        descripcion: 'Comprobante',
        fechaInicio: '2026-08-23',
        fechaFin: null,
      },
    ];
    api.get.mockReturnValue(of(tipos));

    let received: TipoImagen[] | undefined;
    service.listTiposForAfiliacion().subscribe((value) => {
      received = value;
    });

    expect(api.get).toHaveBeenCalledWith('static_catalog/tipo_imagen/for_afiliacion');
    expect(received).toEqual(tipos);
  });

  it('creates an image with POST imagen', () => {
    const imagen: Imagen = { idPersona: 7, uuid: 'abc.jpg', idTipoImagenDocumento: 2 };
    const saved = { ...imagen, idImagen: 15 };
    api.post.mockReturnValue(of(saved));

    let received: Imagen | undefined;
    service.create(imagen).subscribe((value) => {
      received = value;
    });

    expect(api.post).toHaveBeenCalledWith('imagen', imagen);
    expect(received).toEqual(saved);
  });

  it('updates an image with POST imagen/update', () => {
    const imagen: Imagen = {
      idImagen: 15,
      idPersona: 7,
      uuid: 'abc.jpg',
      idTipoImagenDocumento: 3,
    };
    api.post.mockReturnValue(of(imagen));

    let received: Imagen | undefined;
    service.update(imagen).subscribe((value) => {
      received = value;
    });

    expect(api.post).toHaveBeenCalledWith('imagen/update', imagen);
    expect(received).toEqual(imagen);
  });

  it('finds images by persona id', () => {
    const imagenes: Imagen[] = [
      { idImagen: 1, idPersona: 7, uuid: 'abc.jpg', idTipoImagenDocumento: 2 },
    ];
    api.get.mockReturnValue(of(imagenes));

    let received: Imagen[] | undefined;
    service.findByIdPersona(7).subscribe((value) => {
      received = value;
    });

    expect(api.get).toHaveBeenCalledWith('imagen/find_by/idpersona/7');
    expect(received).toEqual(imagenes);
  });

  it('finds a single image by id', () => {
    const imagen: Imagen = {
      idImagen: 3,
      idPersona: 7,
      idAfiliacion: 11,
      uuid: 'abc.jpg',
      idTipoImagenDocumento: 5,
    };
    api.get.mockReturnValue(of(imagen));

    let received: Imagen | undefined;
    service.findById(3).subscribe((value) => {
      received = value;
    });

    expect(api.get).toHaveBeenCalledWith('imagen/find_by/id/3');
    expect(received).toEqual(imagen);
  });
});
