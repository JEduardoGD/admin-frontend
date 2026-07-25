import {
  Component,
  inject,
  input,
  viewChild,
  ElementRef,
  AfterViewInit,
  OnDestroy,
} from '@angular/core';
import { Router } from '@angular/router';
import DataTable, { Api } from 'datatables.net-bs5';
import 'datatables.net-select-bs5';
import 'datatables.net-buttons-bs5';
import 'datatables.net-buttons/js/buttons.html5.mjs';
import 'datatables.net-buttons/js/buttons.print.mjs';
import JSZip from 'jszip';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import { DatatableService, DatatableObj } from './datatable.service';

pdfMake.vfs = pdfFonts.vfs;
DataTable.Buttons.jszip(JSZip);
DataTable.Buttons.pdfMake(pdfMake);

@Component({
  selector: 'app-datatable',
  imports: [],
  templateUrl: './datatable.html',
  styleUrl: './datatable.css',
})
export class Datatable implements AfterViewInit, OnDestroy {
  readonly title = input('');
  private readonly datatableService = inject(DatatableService);
  private readonly router = inject(Router);
  private dt?: Api;

  readonly tableRef = viewChild<ElementRef<HTMLTableElement>>('dataTable');

  ngAfterViewInit(): void {
    const el = this.tableRef()?.nativeElement;
    if (!el) return;

    const self = this;

    this.dt = new DataTable(el, {
      serverSide: true,
      processing: true,
      select: {
        style: 'multi',
        headerCheckbox: true,
      },
      language: {
        search: 'Buscar:',
        lengthMenu: 'Mostrar _MENU_ registros',
        info: 'Mostrando _START_ a _END_ de _TOTAL_ registros',
        infoEmpty: 'Mostrando 0 a 0 de 0 registros',
        infoFiltered: '(filtrado de _MAX_ registros totales)',
        zeroRecords: 'No se encontraron registros',
        emptyTable: 'No hay datos disponibles',
        paginate: {
          first: '«',
          previous: '‹',
          next: '›',
          last: '»',
        },
        processing: 'Procesando...',
        loadingRecords: 'Cargando...',
      },
      ajax: (request: object, callback: (resp: object) => void) => {
        self.datatableService.find(request as any).subscribe({
          next: (response) => callback(response as any),
          error: () =>
            callback({
              draw: (request as any).draw,
              recordsTotal: 0,
              recordsFiltered: 0,
              data: [],
            }),
        });
      },
      columns: [
        { data: null, defaultContent: '', orderable: false, searchable: false, width: '2%' },
        { data: 'idPersona', title: 'ID', width: '10%' },
        {
          data: 'name',
          title: 'Nombre',
          render: (data: string, _type: string, row: DatatableObj) => {
            return `<a href="#" class="dt-name-link" data-idpersona="${row.idPersona}">${data}</a>`;
          },
        },
        {
          data: null,
          title: 'Acciones',
          orderable: false,
          searchable: false,
          width: '10%',
          render: (_data: any, _type: string, row: DatatableObj) => {
            return `<a href="#" class="btn btn-sm btn-primary dt-action-view" data-idpersona="${row.idPersona}">Ver</a>`;
          },
        },
      ],
      layout: {
        topStart: {
          features: ['pageLength', 'buttons'],
        },
        topEnd: {
          features: ['search'],
        },
        bottomStart: {
          features: ['info'],
        },
        bottomEnd: {
          features: ['paging'],
        },
      },
      pageLength: 10,
      lengthMenu: [10, 25, 50, 100],
      buttons: ['copy', 'csv', 'excel', 'pdf', 'print'],
    });

    el.addEventListener('click', (event: Event) => {
      const target = event.target as HTMLElement;
      const link = target.closest('a') as HTMLAnchorElement | null;
      if (!link) return;

      const idPersona = link.getAttribute('data-idpersona');
      if (!idPersona) return;

      event.preventDefault();

      if (link.classList.contains('dt-action-view')) {
        self.router.navigate(['/admin/register'], { queryParams: { idPersona } });
      } else if (link.classList.contains('dt-name-link')) {
        self.router.navigate(['/admin/register'], { queryParams: { idPersona } });
      }
    });
  }

  ngOnDestroy(): void {
    this.dt?.destroy();
  }
}
