import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PreInstagram } from './pre-instagram';

describe('PreInstagram', () => {
  let component: PreInstagram;
  let fixture: ComponentFixture<PreInstagram>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PreInstagram],
    }).compileComponents();

    fixture = TestBed.createComponent(PreInstagram);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
