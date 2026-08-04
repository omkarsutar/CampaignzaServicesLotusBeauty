import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PreFacebook } from './pre-facebook';

describe('PreFacebook', () => {
  let component: PreFacebook;
  let fixture: ComponentFixture<PreFacebook>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PreFacebook],
    }).compileComponents();

    fixture = TestBed.createComponent(PreFacebook);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
