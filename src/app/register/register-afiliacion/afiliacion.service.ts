import { Injectable, inject } from '@angular/core';
import { Observable, catchError } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { ErrorHandlerService } from '../../core/error-handler.service';

export interface Afiliacion {
  idAfiliacion?: number;
  idPersona: number;
  fechaInicio: string;
  fechaFin: string | null;
  vitalicia: boolean;
  deleted: boolean;
}

@Injectable({ providedIn: 'root' })
export class AfiliacionService {
  private readonly api = inject(ApiService);
  private readonly errorHandler = inject(ErrorHandlerService);

  create(afiliacion: Afiliacion): Observable<Afiliacion> {
    return this.api
      .post<Afiliacion>('afiliacion', afiliacion)
      .pipe(catchError((err: unknown) => this.errorHandler.handleUnauthorized(err)));
  }

  update(afiliacion: Afiliacion): Observable<Afiliacion> {
    return this.api
      .put<Afiliacion>('afiliacion', afiliacion)
      .pipe(catchError((err: unknown) => this.errorHandler.handleUnauthorized(err)));
  }

  findByIdPersona(idPersona: number): Observable<Array<Afiliacion>> {
    return this.api
      .get<Array<Afiliacion>>(`afiliacion/find_by/id_persona/${idPersona}`)
      .pipe(catchError((err: unknown) => this.errorHandler.handleUnauthorized(err)));
  }
}
