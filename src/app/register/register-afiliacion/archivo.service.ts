import { Injectable, inject } from '@angular/core';
import { Observable, catchError } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { ErrorHandlerService } from '../../core/error-handler.service';
import { UploadResult } from '../register-imagen/imagen.service';

export interface TipoArchivo {
  idTipoArchivo: number;
  tipo: string;
}

export interface Archivo {
  idArchivo?: number;
  uuid: string;
  idTipoArchivo: number;
  idPersona: number;
  idAfiliacion: number;
}

@Injectable({ providedIn: 'root' })
export class ArchivoService {
  private readonly api = inject(ApiService);
  private readonly errorHandler = inject(ErrorHandlerService);

  listTipos(): Observable<Array<TipoArchivo>> {
    return this.api
      .get<Array<TipoArchivo>>('static_catalog/tipo_archivo')
      .pipe(catchError((err: unknown) => this.errorHandler.handleUnauthorized(err)));
  }

  upload(file: File): Observable<UploadResult> {
    const formData = new FormData();
    formData.append('file', file);
    return this.api
      .postForm<UploadResult>('file', formData)
      .pipe(catchError((err: unknown) => this.errorHandler.handleUnauthorized(err)));
  }

  getFile(uuid: string): Observable<Blob> {
    return this.api
      .getBlob(`file/files/${encodeURIComponent(uuid)}`)
      .pipe(catchError((err: unknown) => this.errorHandler.handleUnauthorized(err)));
  }

  create(archivo: Archivo): Observable<Archivo> {
    return this.api
      .post<Archivo>('archivo', archivo)
      .pipe(catchError((err: unknown) => this.errorHandler.handleUnauthorized(err)));
  }

  update(archivo: Archivo): Observable<Archivo> {
    return this.api
      .post<Archivo>('archivo/update', archivo)
      .pipe(catchError((err: unknown) => this.errorHandler.handleUnauthorized(err)));
  }

  findByAfiliacion(idPersona: number, idAfiliacion: number): Observable<Array<Archivo>> {
    return this.api
      .get<Array<Archivo>>(`archivo/find_by/idpersona/${idPersona}/idafiliacion/${idAfiliacion}`)
      .pipe(catchError((err: unknown) => this.errorHandler.handleUnauthorized(err)));
  }
}
