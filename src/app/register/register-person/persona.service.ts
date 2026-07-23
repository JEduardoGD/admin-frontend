import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import Swal from 'sweetalert2';
import { ApiService } from '../../core/api.service';

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
  private readonly router = inject(Router);

  create(persona: Persona): Observable<Persona> {
    return this.api.post<Persona>('persona', persona).pipe(
      catchError((err: unknown) => this.handleUnauthorized(err)),
    );
  }

  update(persona: Persona): Observable<Persona> {
    return this.api.post<Persona>('persona/update', persona).pipe(
      catchError((err: unknown) => this.handleUnauthorized(err)),
    );
  }

  findById(id: number): Observable<Persona> {
    return this.api.get<Persona>(`persona/${id}`).pipe(
      catchError((err: unknown) => this.handleUnauthorized(err)),
    );
  }

  search(criteria: PersonaSearchCriteria): Observable<Array<Persona>> {
    const params: Record<string, string> = {};
    if (criteria.nombre) params['nombre'] = criteria.nombre;
    if (criteria.primerApellido) params['primerApellido'] = criteria.primerApellido;
    if (criteria.segundoApellido) params['segundoApellido'] = criteria.segundoApellido;
    if (criteria.fecNac) params['fecNac'] = criteria.fecNac;
    return this.api.get<Array<Persona>>('persona', params).pipe(
      catchError((err: unknown) => this.handleUnauthorized(err)),
    );
  }

  private handleUnauthorized(err: unknown): Observable<never> {
    if (err instanceof HttpErrorResponse && err.status === 401) {
      Swal.fire({
        icon: 'error',
        title: 'Sesión expirada',
        text: 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.',
        confirmButtonText: 'Ir al inicio',
      }).then(() => {
        this.router.navigate(['/']);
      });
    }
    return throwError(() => err);
  }
}