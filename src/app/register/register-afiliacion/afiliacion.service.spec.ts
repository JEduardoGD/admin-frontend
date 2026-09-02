import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { ErrorHandlerService } from '../../core/error-handler.service';
import { Afiliacion, AfiliacionService } from './afiliacion.service';

describe('AfiliacionService', () => {
  let service: AfiliacionService;
  let api: {
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    api = {
      get: vi.fn(),
      post: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        AfiliacionService,
        { provide: ApiService, useValue: api },
        { provide: ErrorHandlerService, useValue: { handleUnauthorized: vi.fn() } },
      ],
    });

    service = TestBed.inject(AfiliacionService);
  });

  it('creates or updates an afiliacion with POST afiliacion', () => {
    const afiliacion: Afiliacion = {
      idPersona: 7,
      fechaInicio: '2026-09-02',
      fechaFin: '2027-09-02',
      vitalicia: false,
      deleted: false,
    };
    const saved = { ...afiliacion, idAfiliacion: 15 };
    api.post.mockReturnValue(of(saved));

    let received: Afiliacion | undefined;
    service.save(afiliacion).subscribe((value) => {
      received = value;
    });

    expect(api.post).toHaveBeenCalledWith('afiliacion', afiliacion);
    expect(received).toEqual(saved);
  });

  it('finds afiliaciones by persona id', () => {
    const afiliaciones: Afiliacion[] = [
      {
        idAfiliacion: 1,
        idPersona: 7,
        fechaInicio: '2026-09-02',
        fechaFin: null,
        vitalicia: true,
        deleted: false,
      },
    ];
    api.get.mockReturnValue(of(afiliaciones));

    let received: Afiliacion[] | undefined;
    service.findByIdPersona(7).subscribe((value) => {
      received = value;
    });

    expect(api.get).toHaveBeenCalledWith('afiliacion/find_by/id_persona/7');
    expect(received).toEqual(afiliaciones);
  });
});
