import { Component, signal } from '@angular/core';
import { RegisterPerson } from './register-person/register-person';
import { RegisterDomicilio } from './register-domicilio/register-domicilio';

@Component({
  selector: 'app-register',
  imports: [RegisterPerson, RegisterDomicilio],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  readonly activeTab = signal('persona');
  readonly idPersona = signal<number | null>(null);

  selectTab(tab: string): void {
    console.log('----selectTab----')
    console.log(`activeTab: ${tab}`)
    console.log(`idPersona:  ${this.idPersona}`)
    this.activeTab.set(tab);
  }

  onPersonaSaved(id: number): void {
    this.idPersona.set(id);
    //this.activeTab.set('domicilio');
  }
}
