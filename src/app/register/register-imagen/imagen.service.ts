import { Injectable, inject } from '@angular/core';
import { Observable, catchError } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { ErrorHandlerService } from '../../core/error-handler.service';

export interface Imagen {
  idImagen?: number;
  idPersona: number;
  idAfiliacion?: number | null;
  uuid: string;
  idTipoImagenDocumento: number;
}

export interface TipoImagen {
  idTipoImagen: number;
  tipo: string;
  descripcion: string;
  fechaInicio: string;
  fechaFin: string | null;
}

export interface UploadResult {
  filename: string | null;
  uploadError: boolean;
  frontError: string | null;
}

@Injectable({ providedIn: 'root' })
export class ImagenService {
  private readonly api = inject(ApiService);
  private readonly errorHandler = inject(ErrorHandlerService);

  upload(file: File): Observable<UploadResult> {
    const formData = new FormData();
    formData.append('file', file);
    return this.api
      .postForm<UploadResult>('file', formData)
      .pipe(catchError((err: unknown) => this.errorHandler.handleUnauthorized(err)));
  }

  getThumbnail(uuid: string): Observable<Blob> {
    return this.api
      .getBlob(`imagen/thumbnail/${encodeURIComponent(thumbnailId(uuid))}`)
      .pipe(catchError((err: unknown) => this.errorHandler.handleUnauthorized(err)));
  }

  listTipos(): Observable<Array<TipoImagen>> {
    return this.api
      .get<Array<TipoImagen>>('static_catalog/tipo_imagen/for_persona')
      .pipe(catchError((err: unknown) => this.errorHandler.handleUnauthorized(err)));
  }

  listTiposForAfiliacion(): Observable<Array<TipoImagen>> {
    return this.api
      .get<Array<TipoImagen>>('static_catalog/tipo_imagen/for_afiliacion')
      .pipe(catchError((err: unknown) => this.errorHandler.handleUnauthorized(err)));
  }

  create(imagen: Imagen): Observable<Imagen> {
    return this.api
      .post<Imagen>('imagen', imagen)
      .pipe(catchError((err: unknown) => this.errorHandler.handleUnauthorized(err)));
  }

  update(imagen: Imagen): Observable<Imagen> {
    return this.api
      .post<Imagen>('imagen/update', imagen)
      .pipe(catchError((err: unknown) => this.errorHandler.handleUnauthorized(err)));
  }

  findByIdPersona(idPersona: number): Observable<Array<Imagen>> {
    return this.api
      .get<Array<Imagen>>(`imagen/find_by/idpersona/${idPersona}`)
      .pipe(catchError((err: unknown) => this.errorHandler.handleUnauthorized(err)));
  }

  findById(idImagen: number): Observable<Imagen> {
    return this.api
      .get<Imagen>(`imagen/find_by/id/${idImagen}`)
      .pipe(catchError((err: unknown) => this.errorHandler.handleUnauthorized(err)));
  }
}

function thumbnailId(uuid: string): string {
  const match = uuid.match(
    /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/,
  );
  return match?.[0] ?? uuid;
}
