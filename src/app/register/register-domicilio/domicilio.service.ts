import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/api.service';

export interface Domicilio {
  idDomicilio?: number;
  idPersona: number;
  cp: string;
  domicilio: string;
  entidadFederativa: string;
  municipio: string;
  localidad: string;
  pais: string;
}

@Injectable({ providedIn: 'root' })
export class DomicilioService {
  private readonly api = inject(ApiService);

  create(domicilio: Domicilio): Observable<Domicilio> {
    return this.api.post<Domicilio>('domicilio', domicilio);
  }

  update(domicilio: Domicilio): Observable<Domicilio> {
    return this.api.post<Domicilio>('domicilio/update', domicilio);
  }

  findByIdPersona(idPersona: number): Observable<Array<Domicilio>> {
    return this.api.get<Array<Domicilio>>(`domicilio/find_by/idpersona/${idPersona}`);
  }
}
