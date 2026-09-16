import { Injectable, inject } from '@angular/core';
import { Observable, catchError } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { ErrorHandlerService } from '../../core/error-handler.service';

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
  private readonly errorHandler = inject(ErrorHandlerService);

  create(persona: Persona): Observable<Persona> {
    return this.api
      .post<Persona>('persona', persona)
      .pipe(catchError((err: unknown) => this.errorHandler.handleUnauthorized(err)));
  }

  update(persona: Persona): Observable<Persona> {
    return this.api
      .post<Persona>('persona/update', persona)
      .pipe(catchError((err: unknown) => this.errorHandler.handleUnauthorized(err)));
  }

  findById(id: number): Observable<Persona> {
    return this.api
      .get<Persona>(`persona/${id}`)
      .pipe(catchError((err: unknown) => this.errorHandler.handleUnauthorized(err)));
  }

  search(criteria: PersonaSearchCriteria): Observable<Array<Persona>> {
    const params: Record<string, string> = {};
    if (criteria.nombre) params['nombre'] = criteria.nombre;
    if (criteria.primerApellido) params['primerApellido'] = criteria.primerApellido;
    if (criteria.segundoApellido) params['segundoApellido'] = criteria.segundoApellido;
    if (criteria.fecNac) params['fecNac'] = criteria.fecNac;
    return this.api
      .get<Array<Persona>>('persona', params)
      .pipe(catchError((err: unknown) => this.errorHandler.handleUnauthorized(err)));
  }
}
