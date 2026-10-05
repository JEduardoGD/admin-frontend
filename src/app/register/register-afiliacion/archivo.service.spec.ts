import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { ErrorHandlerService } from '../../core/error-handler.service';
import { Archivo, ArchivoService } from './archivo.service';

describe('ArchivoService', () => {
  let service: ArchivoService;
  let api: {
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
    postForm: ReturnType<typeof vi.fn>;
    getBlob: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    api = { get: vi.fn(), post: vi.fn(), postForm: vi.fn(), getBlob: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        ArchivoService,
        { provide: ApiService, useValue: api },
        { provide: ErrorHandlerService, useValue: { handleUnauthorized: vi.fn() } },
      ],
    });
    service = TestBed.inject(ArchivoService);
  });

  it('loads catalog types and the files for one afiliacion', () => {
    api.get.mockReturnValue(of([]));

    service.listTipos().subscribe();
    service.findByAfiliacion(42, 9).subscribe();

    expect(api.get).toHaveBeenCalledWith('static_catalog/tipo_archivo');
    expect(api.get).toHaveBeenCalledWith('archivo/find_by/idpersona/42/idafiliacion/9');
  });

  it('uploads documents using the file-upload controller', () => {
    const file = new File(['documento'], 'pago.pdf', { type: 'application/pdf' });
    api.postForm.mockReturnValue(
      of({ filename: 'stored.pdf', uploadError: false, frontError: null }),
    );

    service.upload(file).subscribe();

    expect(api.postForm).toHaveBeenCalledWith('file', expect.any(FormData));
    expect((api.postForm.mock.calls[0][1] as FormData).get('file')).toBe(file);
  });

  it('downloads a stored archivo through the authenticated API', () => {
    const blob = new Blob(['archivo'], { type: 'application/pdf' });
    api.getBlob.mockReturnValue(of(blob));

    service.getFile('solicitud 1.pdf').subscribe((result) => expect(result).toBe(blob));

    expect(api.getBlob).toHaveBeenCalledWith('file/files/solicitud%201.pdf');
  });

  it('creates and updates archivo metadata via the archivo controller', () => {
    const archivo: Archivo = {
      uuid: 'stored.pdf',
      idTipoArchivo: 3,
      idPersona: 42,
      idAfiliacion: 9,
    };
    api.post.mockReturnValue(of({ ...archivo, idArchivo: 20 }));

    service.create(archivo).subscribe();
    service.update({ ...archivo, idArchivo: 20 }).subscribe();

    expect(api.post).toHaveBeenCalledWith('archivo', archivo);
    expect(api.post).toHaveBeenCalledWith('archivo/update', { ...archivo, idArchivo: 20 });
  });
});
