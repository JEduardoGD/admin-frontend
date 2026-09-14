import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { ErrorHandlerService } from '../../core/error-handler.service';
import { Aficionado, AficionadoService } from './aficionado.service';

describe('AficionadoService', () => {
  let service: AficionadoService;
  let api: {
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
    put: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    api = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        AficionadoService,
        { provide: ApiService, useValue: api },
        { provide: ErrorHandlerService, useValue: { handleUnauthorized: vi.fn() } },
      ],
    });

    service = TestBed.inject(AficionadoService);
  });

  it('creates an aficionado with POST aficionado', () => {
    const aficionado: Aficionado = {
      idPersona: 7,
      indicativo: 'XE1ABC',
      fechaInicio: '2026-09-14',
      fechaFin: null,
      idImagen: null,
    };
    const saved = { ...aficionado, idAficionado: 3 };
    api.post.mockReturnValue(of(saved));

    let received: Aficionado | undefined;
    service.create(aficionado).subscribe((value) => {
      received = value;
    });

    expect(api.post).toHaveBeenCalledWith('aficionado', aficionado);
    expect(received).toEqual(saved);
  });

  it('updates an aficionado with PUT aficionado', () => {
    const aficionado: Aficionado = {
      idAficionado: 3,
      idPersona: 7,
      indicativo: 'XE1ABC',
      fechaInicio: '2026-09-14',
      fechaFin: '2027-09-14',
      idImagen: 9,
    };
    api.put.mockReturnValue(of(aficionado));

    let received: Aficionado | undefined;
    service.update(aficionado).subscribe((value) => {
      received = value;
    });

    expect(api.put).toHaveBeenCalledWith('aficionado', aficionado);
    expect(received).toEqual(aficionado);
  });

  it('deletes an aficionado with DELETE aficionado/:id', () => {
    api.delete.mockReturnValue(of({ idAficionado: 3 }));

    service.remove(3).subscribe();

    expect(api.delete).toHaveBeenCalledWith('aficionado/3');
  });

  it('finds aficionados by persona id', () => {
    const aficionados: Aficionado[] = [
      {
        idAficionado: 3,
        idPersona: 7,
        indicativo: 'XE1ABC',
        fechaInicio: '2026-09-14T00:00:00.000Z',
        fechaFin: null,
        idImagen: null,
      },
    ];
    api.get.mockReturnValue(of(aficionados));

    let received: Aficionado[] | undefined;
    service.findByIdPersona(7).subscribe((value) => {
      received = value;
    });

    expect(api.get).toHaveBeenCalledWith('aficionado/find_by/id_persona/7');
    expect(received).toEqual(aficionados);
  });

  it('finds an aficionado by its own id', () => {
    const aficionado: Aficionado = {
      idAficionado: 3,
      idPersona: 7,
      indicativo: 'XE1ABC',
      fechaInicio: '2026-09-14T00:00:00.000Z',
      fechaFin: null,
      idImagen: null,
    };
    api.get.mockReturnValue(of(aficionado));

    let received: Aficionado | undefined;
    service.findById(3).subscribe((value) => {
      received = value;
    });

    expect(api.get).toHaveBeenCalledWith('aficionado/find_by/id_aficionado/3');
    expect(received).toEqual(aficionado);
  });
});
