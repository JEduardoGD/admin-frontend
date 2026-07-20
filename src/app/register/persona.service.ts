import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../core/api.service';

export interface Persona {
  idPersona?: number;
  nombre: string;
  primerApellido: string;
  segundoApellido?: string | null;
  fecNac?: string | null;
}

export interface PersonaSearchCriteria {
  nombre?: string;
  primerApellido?: string;
  segundoApellido?: string;
  fecNac?: string;
}

@Injectable({ providedIn: 'root' })
export class PersonaService {
  private readonly api = inject(ApiService);

  create(persona: Persona): Observable<Persona> {
    return this.api.post<Persona>('persona', persona);
  }

  search(criteria: PersonaSearchCriteria): Observable<Array<Persona>> {
    const params: Record<string, string> = {};
    if (criteria.nombre) params['nombre'] = criteria.nombre;
    if (criteria.primerApellido) params['primerApellido'] = criteria.primerApellido;
    if (criteria.segundoApellido) params['segundoApellido'] = criteria.segundoApellido;
    if (criteria.fecNac) params['fecNac'] = criteria.fecNac;
    return this.api.get<Array<Persona>>('persona', params);
  }
}