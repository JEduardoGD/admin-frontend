import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { ErrorHandlerService } from '../../core/error-handler.service';
import { Aspirante, AspiranteService } from './aspirante.service';

describe('AspiranteService', () => {
  let service: AspiranteService;
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
        AspiranteService,
        { provide: ApiService, useValue: api },
        { provide: ErrorHandlerService, useValue: { handleUnauthorized: vi.fn() } },
      ],
    });

    service = TestBed.inject(AspiranteService);
  });

  it('creates an aspirante with POST aspirante', () => {
    const aspirante: Aspirante = {
      idPersona: 7,
      idEstado: 3,
      fechaInicio: '2026-09-14',
      fechaFin: null,
    };
    const saved = { ...aspirante, idAspirante: 3 };
    api.post.mockReturnValue(of(saved));

    let received: Aspirante | undefined;
    service.create(aspirante).subscribe((value) => {
      received = value;
    });

    expect(api.post).toHaveBeenCalledWith('aspirante', aspirante);
    expect(received).toEqual(saved);
  });

  it('updates an aspirante with PUT aspirante', () => {
    const aspirante: Aspirante = {
      idAspirante: 3,
      idPersona: 7,
      idEstado: 3,
      contadorEstado: 2,
      fechaInicio: '2026-09-14',
      fechaFin: '2027-09-14',
    };
    api.put.mockReturnValue(of(aspirante));

    let received: Aspirante | undefined;
    service.update(aspirante).subscribe((value) => {
      received = value;
    });

    expect(api.put).toHaveBeenCalledWith('aspirante', aspirante);
    expect(received).toEqual(aspirante);
  });

  it('deletes an aspirante with DELETE aspirante/:id', () => {
    api.delete.mockReturnValue(of({ idAspirante: 3 }));

    service.remove(3).subscribe();

    expect(api.delete).toHaveBeenCalledWith('aspirante/3');
  });

  it('finds aspirantes by persona id', () => {
    const aspirantes: Aspirante[] = [
      {
        idAspirante: 3,
        idPersona: 7,
        idEstado: 3,
        contadorEstado: 2,
        fechaInicio: '2026-09-14T00:00:00.000Z',
        fechaFin: null,
      },
    ];
    api.get.mockReturnValue(of(aspirantes));

    let received: Aspirante[] | undefined;
    service.findByIdPersona(7).subscribe((value) => {
      received = value;
    });

    expect(api.get).toHaveBeenCalledWith('aspirante/find_by/id_persona/7');
    expect(received).toEqual(aspirantes);
  });

  it('finds an aspirante by its own id', () => {
    const aspirante: Aspirante = {
      idAspirante: 3,
      idPersona: 7,
      idEstado: 3,
      contadorEstado: 2,
      fechaInicio: '2026-09-14T00:00:00.000Z',
      fechaFin: null,
    };
    api.get.mockReturnValue(of(aspirante));

    let received: Aspirante | undefined;
    service.findById(3).subscribe((value) => {
      received = value;
    });

    expect(api.get).toHaveBeenCalledWith('aspirante/find_by/id_aspirante/3');
    expect(received).toEqual(aspirante);
  });
});
