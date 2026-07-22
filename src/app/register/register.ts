import { Component, signal } from '@angular/core';
import { RegisterPerson } from './register-person';

@Component({
  selector: 'app-register',
  imports: [RegisterPerson],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  readonly activeTab = signal('persona');

  selectTab(tab: string): void {
    this.activeTab.set(tab);
  }
}
