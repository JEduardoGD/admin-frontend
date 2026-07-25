import { Component } from '@angular/core';
import { Datatable } from './datatable/datatable';

@Component({
  selector: 'app-control-panel',
  imports: [Datatable],
  templateUrl: './control-panel.html',
  styleUrl: './control-panel.css',
})
export class ControlPanel {}
