import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { ErrorHandlerService } from '../../core/error-handler.service';
import { DatoContacto, DatoContactoService, TipoDatoContacto } from './dato-contacto.service';

describe('DatoContactoService', () => {
  let service: DatoContactoService;
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
        DatoContactoService,
        { provide: ApiService, useValue: api },
        { provide: ErrorHandlerService, useValue: { handleUnauthorized: vi.fn() } },
      ],
    });

    service = TestBed.inject(DatoContactoService);
  });

  it('creates a dato contacto with POST datocontacto', () => {
    const dato: DatoContacto = {
      idPersona: 7,
      idTipoDatoContacto: 1,
      dato: 'test@example.com',
    };
    const saved = { ...dato, idDatoContacto: 15 };
    api.post.mockReturnValue(of(saved));

    let received: DatoContacto | undefined;
    service.create(dato).subscribe((value) => {
      received = value;
    });

    expect(api.post).toHaveBeenCalledWith('datocontacto', dato);
    expect(received).toEqual(saved);
  });

  it('updates a dato contacto with PUT datocontacto', () => {
    const dato: DatoContacto = {
      idDatoContacto: 15,
      idPersona: 7,
      idTipoDatoContacto: 1,
      dato: 'otro@example.com',
    };
    api.put.mockReturnValue(of(dato));

    let received: DatoContacto | undefined;
    service.update(dato).subscribe((value) => {
      received = value;
    });

    expect(api.put).toHaveBeenCalledWith('datocontacto', dato);
    expect(received).toEqual(dato);
  });

  it('removes a dato contacto with DELETE datocontacto/:id', () => {
    api.delete.mockReturnValue(of(null));

    service.remove(15).subscribe();

    expect(api.delete).toHaveBeenCalledWith('datocontacto/15');
  });

  it('finds datos contacto by persona id', () => {
    const datos: DatoContacto[] = [
      {
        idDatoContacto: 1,
        idPersona: 7,
        idTipoDatoContacto: 2,
        dato: '5544332211',
        inicio: '2026-01-01',
        fin: null,
      },
    ];
    api.get.mockReturnValue(of(datos));

    let received: DatoContacto[] | undefined;
    service.findByIdPersona(7).subscribe((value) => {
      received = value;
    });

    expect(api.get).toHaveBeenCalledWith('datocontacto/find_by/idpersona/7');
    expect(received).toEqual(datos);
  });

  it('finds a dato contacto by id', () => {
    const dato: DatoContacto = {
      idDatoContacto: 3,
      idPersona: 7,
      idTipoDatoContacto: 1,
      dato: 'test@example.com',
    };
    api.get.mockReturnValue(of(dato));

    let received: DatoContacto | undefined;
    service.findById(3).subscribe((value) => {
      received = value;
    });

    expect(api.get).toHaveBeenCalledWith('datocontacto/find_by/id/3');
    expect(received).toEqual(dato);
  });

  it('lists tipos de dato contacto from the static catalog', () => {
    const tipos: TipoDatoContacto[] = [
      { idTipoDatoContacto: 1, tipoContacto: 'EMAIL', descripcion: 'Correo electronico' },
      { idTipoDatoContacto: 2, tipoContacto: 'MOVIL', descripcion: 'Telefono Movil' },
    ];
    api.get.mockReturnValue(of(tipos));

    let received: TipoDatoContacto[] | undefined;
    service.listTipos().subscribe((value) => {
      received = value;
    });

    expect(api.get).toHaveBeenCalledWith('static_catalog/tipo_datocontacto');
    expect(received).toEqual(tipos);
  });
});
