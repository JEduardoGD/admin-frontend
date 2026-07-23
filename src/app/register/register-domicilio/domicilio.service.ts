import { Injectable, inject } from '@angular/core';
import { catchError, Observable } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { ErrorHandlerService } from '../../core/error-handler.service';

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
  private readonly errorHandler = inject(ErrorHandlerService);

  create(domicilio: Domicilio): Observable<Domicilio> {
    return this.api.post<Domicilio>('domicilio', domicilio).pipe(
          catchError((err: unknown) => this.errorHandler.handleUnauthorized(err)),
    );
  }

  update(domicilio: Domicilio): Observable<Domicilio> {
    return this.api.post<Domicilio>('domicilio/update', domicilio).pipe(
          catchError((err: unknown) => this.errorHandler.handleUnauthorized(err)),
    );
  }

  findByIdPersona(idPersona: number): Observable<Array<Domicilio>> {
    return this.api.get<Array<Domicilio>>(`domicilio/find_by/idpersona/${idPersona}`).pipe(
          catchError((err: unknown) => this.errorHandler.handleUnauthorized(err)),
    );
  }
}
