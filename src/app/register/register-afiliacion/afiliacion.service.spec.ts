import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { ErrorHandlerService } from '../../core/error-handler.service';
import { Afiliacion, AfiliacionService, Estado } from './afiliacion.service';

describe('AfiliacionService', () => {
  let service: AfiliacionService;
  let api: {
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
    put: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    api = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
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

  it('creates an afiliacion with POST afiliacion', () => {
    const afiliacion: Afiliacion = {
      idPersona: 7,
      idEstado: 1,
      fechaInicio: '2026-09-02T00:00:00.000Z',
      fechaFin: '2027-09-02T00:00:00.000Z',
      vitalicia: false,
      deleted: false,
    };
    const saved = { ...afiliacion, idAfiliacion: 15 };
    api.post.mockReturnValue(of(saved));

    let received: Afiliacion | undefined;
    service.create(afiliacion).subscribe((value) => {
      received = value;
    });

    expect(api.post).toHaveBeenCalledWith('afiliacion', afiliacion);
    expect(received).toEqual(saved);
  });

  it('updates an afiliacion with PUT afiliacion', () => {
    const afiliacion: Afiliacion = {
      idAfiliacion: 15,
      idPersona: 7,
      idEstado: 1,
      fechaInicio: '2026-09-02T00:00:00.000Z',
      fechaFin: '2027-09-02T00:00:00.000Z',
      vitalicia: false,
      deleted: false,
    };
    api.put.mockReturnValue(of(afiliacion));

    let received: Afiliacion | undefined;
    service.update(afiliacion).subscribe((value) => {
      received = value;
    });

    expect(api.put).toHaveBeenCalledWith('afiliacion', afiliacion);
    expect(received).toEqual(afiliacion);
  });

  it('finds afiliaciones by persona id', () => {
    const afiliaciones: Afiliacion[] = [
      {
        idAfiliacion: 1,
        idPersona: 7,
        idEstado: 2,
        fechaInicio: '2026-09-02T00:00:00.000Z',
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

  it('lists estados from the static catalog', () => {
    const estados: Estado[] = [
      { idEstado: 1, abreviado: 'AGS', nombre: 'AGUASCALIENTES' },
      { idEstado: 2, abreviado: 'BC', nombre: 'BAJA CALIFORNIA' },
    ];
    api.get.mockReturnValue(of(estados));

    let received: Estado[] | undefined;
    service.listEstados().subscribe((value) => {
      received = value;
    });

    expect(api.get).toHaveBeenCalledWith('static_catalog/estado');
    expect(received).toEqual(estados);
  });
});
