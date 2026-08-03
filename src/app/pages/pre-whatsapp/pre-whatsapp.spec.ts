import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PreWhatsapp } from './pre-whatsapp';

describe('PreWhatsapp', () => {
  let component: PreWhatsapp;
  let fixture: ComponentFixture<PreWhatsapp>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PreWhatsapp],
    }).compileComponents();

    fixture = TestBed.createComponent(PreWhatsapp);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
